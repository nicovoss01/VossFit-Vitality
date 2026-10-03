// Synthetic profiles only; external calls blocked. Run with playwright in NODE_PATH.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..');
(async()=>{
const server=http.createServer((req,res)=>{let filename=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(req.url==='/'||req.url.startsWith('/?'))filename=path.join(root,'index.html');if(!filename.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(filename,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',filename.endsWith('.js')?'application/javascript':filename.endsWith('.css')?'text/css':filename.endsWith('.webp')?'image/webp':filename.endsWith('.png')?'image/png':'text/html');res.end(data);});});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.VF_TEST_BROWSER||undefined,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 await context.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const day=new Date().toISOString().slice(0,10),old={name:'Bankdrücken',group:'Brust · Langhantel',rows:[{weight:88,reps:5,rest:120,done:false},{weight:90,reps:4,rest:150,done:false}]};
 const fixture={onboarded:true,activeProfileId:'test',profiles:{test:{name:'Testprofil',gender:'mann',age:25,height:185,weight:95,kfaIdx:4,zielgewicht:85,pal:1.65,ziel:1.6,mealSettings:{count:4,mode:'plan',times:['07:00','12:00','16:00','20:00']},days:{},trainingDays:{},exerciseHistory:{bankdrücken:{displayName:'Bankdrücken',lastWeight:88,lastSets:2,lastReps:5,lastSuccess:true,suggestedWeight:90}},gymPlanner:{version:1,active:0,day:0,plans:[{name:'Bestandsplan',goal:'Muskelaufbau',weekdays:[1,3,5],step:2.5,days:[{name:'Push',exercises:[old]}]}]}}},foodDb:[],selectedDate:day,activeTab:'fitness',view:'home',settingsTab:'profile',chats:{},activeChatId:null,knownCloudIds:{}};
 await page.addInitScript(data=>{if(!localStorage.getItem('vossfit_prototype_v6'))localStorage.setItem('vossfit_prototype_v6',JSON.stringify(data));},fixture);
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.locator('nav [data-tab="fitness"]').click();
 const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('vossfit_prototype_v6'))),exercises=async()=>(await state()).profiles.test.gymPlanner.plans[0].days[0].exercises;
 assert.equal((await exercises())[0].exerciseId,undefined);assert.equal((await exercises())[0].rows[0].weight,88);
 const id='vf-chest_bench_barbell_press_lying_medium_grip',swapId='vf-chest_bench_dumbbell_press_incline';
 await page.locator('[data-gx="library"]').click();assert.match(await page.locator('#gxCount').textContent(),/318/);
 await page.locator('#gxSearch').fill('Bankdrücken Langhantel liegend mittlerer Griff');
 await page.locator(`[data-gx="favorite"][data-id="${id}"]`).click();await page.locator(`[data-gx="detail"][data-id="${id}"]`).first().click();
 await page.locator('[data-gx="phase"][data-phase="1"]').click();assert.equal(await page.locator('[data-gx="phase"][data-phase="1"]').getAttribute('aria-pressed'),'true');
 await page.screenshot({path:'/tmp/gym-library-detail.png'});await page.locator(`[data-gx="choose"][data-id="${id}"]`).click();
 assert.equal((await exercises())[1].exerciseId,id);assert.equal((await exercises())[1].rows[0].weight,0);assert.deepEqual((await exercises())[0].rows,old.rows);
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('nav [data-tab="fitness"]').click();
 await page.locator('[data-gx="library"]').click();await page.locator('[data-gx="scope"][data-value="favorites"]').click();assert.match(await page.locator('#gxCount').textContent(),/^1 /);await page.screenshot({path:'/tmp/gym-library-favorites.png'});await page.locator('[data-gx="close"]').click();
 // Detail -> alternatives must keep a usable dialog (no queued close-state reset).
 await page.locator('[data-gx="entry"][data-index="1"]').first().click();await page.locator('[data-gx="alternatives"]').click();
 await page.locator('[data-gx-filter="equipment"]').selectOption('Kurzhanteln');await page.locator('#gxSearch').fill('Bankdrücken schräg');
 await page.locator(`[data-gx="choose"][data-id="${swapId}"]`).click();assert.equal((await exercises())[1].exerciseId,swapId);assert((await exercises())[1].rows.every(r=>r.weight===0&&!r.done));
 await page.locator('[data-gx="link"][data-index="0"]').first().click();await page.locator('#gxSearch').fill('Bankdrücken Langhantel liegend mittlerer Griff');await page.locator(`[data-gx="choose"][data-id="${id}"]`).click();assert.deepEqual((await exercises())[0].rows,old.rows);
 await page.locator('[data-gp="addexercise"]').click();await page.locator('#gxSearch').fill('Joggen');await page.locator('[data-gx="choose"]').click();assert.equal((await exercises())[2].kind,'cardio');
 await page.locator('[data-cardio="durationMin"]').fill('35');await page.locator('[data-cardio="durationMin"]').press('Tab');assert.equal((await exercises())[2].durationMin,35);
 await page.locator('[data-gp="start"]').click();await page.locator('[data-gp="expand"][data-index="2"]').click();await page.locator('[data-gp="cardiodone"]').click();
 await page.locator('[data-gp="done"][data-index="0"][data-row="0"]').click();await page.locator('[data-gp="done"][data-index="0"][data-row="1"]').click();
 await page.locator('[data-gp="finish"]').click();await page.locator('#gpForm button[type="submit"]').click();
 const saved=(await state()).profiles.test;assert(saved.trainingDays[day].exercises[2].success);assert.equal(saved.trainingDays[day].exercises[2].durationMin,35);assert(saved.exerciseHistory['catalog:'+id]);assert.equal(saved.exerciseHistory.bankdrücken.lastWeight,88);assert(!saved.exerciseHistory['catalog:vf-cardio_sport_jogging']);
 await page.screenshot({path:'/tmp/gym-library-planner.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 await page.locator('[data-gp="resume"]').click();await page.locator('[data-gp="addexercise"]').click();await page.locator('[data-gx="custom"]').click();await page.locator('#gpForm input[name="name"]').fill('Meine eigene Übung');await page.locator('#gpForm button[type="submit"]').click();assert.equal((await state()).profiles.test.trainingDays[day].exercises.at(-1).name,'Meine eigene Übung');
 const catalog=await page.evaluate(()=>window.VF_EXERCISE_CATALOG);assert.equal(new Set(catalog.map(e=>e.id)).size,318);assert.equal(new Set(catalog.flatMap(e=>e.frames)).size,598);

 const face=catalog.find(e=>e.name==='Face Pulls');assert(face);assert.equal(face.frames.length,2);for(const asset of face.frames){assert(fs.existsSync(path.join(root,asset)));assert.equal((await page.request.get(origin+'/'+asset)).status(),200);}
 await page.locator('[data-gx="library"]').click();await page.locator('#gxSearch').fill('Face Pulls');await page.locator('[data-gx="detail"]').first().click();assert.match(await page.locator('#gxDetailArt .gx-art').getAttribute('style'),/face-pull-start/);await page.locator('[data-gx="phase"][data-phase="1"]').click();assert.match(await page.locator('#gxDetailArt .gx-art').getAttribute('style'),/face-pull-pull/);await page.evaluate(async()=>{await Promise.all(window.VF_EXERCISE_CATALOG.find(e=>e.name==='Face Pulls').frames.map(src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=resolve;im.onerror=reject;im.src=src;})));});await page.screenshot({path:'/tmp/face-pull-detail.png'});
 for(let i=1;i<=24;i++)assert(fs.existsSync(path.join(root,'assets/exercises/atlas-'+String(i).padStart(2,'0')+'.webp')));
 const migrated=await page.evaluate(()=>{const e={name:'Face Pulls',group:'Schulter · Kabelzug',rows:[{weight:15,reps:15,done:false}]},p={trainingDays:{test:{exercises:[e]}}};window.VossFitExercises.create({},window.VF_EXERCISE_CATALOG).ensure(p);return e;});assert.equal(migrated.exerciseId,'vf-shoulders_cable_face_pull_standing_rope');assert.equal(migrated.rows[0].weight,15);
 assert.deepEqual(errors,[]);console.log('PASS: 318 variants/598 frames; filters, favorites/reload, phases, detail alternatives, safe mapping/swapping, cardio, history, custom exercises, mobile layout; no page errors.');
}finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
