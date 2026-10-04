const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const extract = (name,next) => html.slice(html.indexOf('  function '+name+'('),html.indexOf(next,html.indexOf('  function '+name+'(')));
const source = extract('activeProfile','  // Login allein') + extract('navLocked','  function calcEngine') + extract('renderChatOverviewCard','  // Stellt sicher');
function setup(profile, online, floating = false) {
  let builds = 0, disconnected = 0;
  const cards = {
    chatOverviewCard:{hidden:false,innerHTML:'old profile content',_pagerObserver:{disconnect(){disconnected++;}}},
    chatOverviewCardHome:{hidden:false,innerHTML:'old profile content'},
    'tab-chat':{hidden:false,classList:{contains(){return floating;}}}
  };
  const context = vm.createContext({
    state:{profiles:profile ? {p:profile} : {},activeProfileId:'p',onboarded:true},
    fbUser:online ? {uid:'synthetic'} : null,
    document:{getElementById:id=>cards[id]},
    computeCookSummary:()=>({kcalRest:100}),computeGymSummary:()=>({count:0}),
    buildOverviewCardDOM:()=>{builds++;cards.chatOverviewCard.hidden=false;}
  });
  vm.runInContext(source,context);
  context.renderChatOverviewCard();
  return {context,cards,builds,disconnected};
}
for (const online of [false,true]) {
  test((online?'online account':'offline guest')+' without profile hides and clears all cards',()=>{
    const r=setup(null,online);
    assert.equal(r.context.navLocked(),true);
    for(const id of ['chatOverviewCard','chatOverviewCardHome']){
      assert.equal(r.cards[id].hidden,true);
      assert.equal(r.cards[id].innerHTML,'');
    }
    assert.equal(r.builds,0);assert.equal(r.disconnected,1);
  });
  test((online?'online':'offline')+' profile unlocks overview and navigation',()=>{
    const r=setup({name:'Test'},online);
    assert.equal(r.context.navLocked(),false);
    assert.equal(r.cards.chatOverviewCard.hidden,false);
    assert.equal(r.cards.chatOverviewCardHome.hidden,true);
    assert.equal(r.builds,1);
  });
}
test('removing a profile hides stale content even if still signed in',()=>{
  const r=setup({name:'Test'},true);
  r.context.state.profiles={};r.context.renderChatOverviewCard();
  assert.equal(r.context.navLocked(),true);
  assert.equal(r.cards.chatOverviewCard.hidden,true);
  assert.equal(r.cards.chatOverviewCard.innerHTML,'');
});
test('floating chat does not show profile overview',()=>{
  const r=setup({name:'Test'},false,true);
  assert.equal(r.cards.chatOverviewCard.hidden,true);assert.equal(r.builds,0);
});
test('all inline classic scripts parse',()=>{
  let count=0;
  for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
    if(/\bsrc\s*=|type\s*=\s*["'](?:module|application\/)/i.test(match[1]))continue;
    new vm.Script(match[2]);count++;
  }
  assert.ok(count>0);
});
