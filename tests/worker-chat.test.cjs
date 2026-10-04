const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../worker/worker.js'), 'utf8');
const answer = (text, reason = 'STOP', extra = []) => ({candidates: [{finishReason: reason, content: {parts: [{text}, ...extra]}}]});

async function run(responses, body = {}) {
  const requests = [];
  const context = vm.createContext({Response, AbortSignal, fetch: async (url, options) => {
    requests.push(JSON.parse(options.body));
    assert.ok(responses.length, 'unexpected retry');
    const next = responses.shift();
    return new Response(JSON.stringify(next.data || next), {status: next.status || 200});
  }});
  vm.runInContext(source.replace('export default', 'globalThis.worker ='), context);
  const response = await context.worker.fetch(new Request('https://example.test', {
    method: 'POST', body: JSON.stringify({v: 2, userText: 'Erkläre meinen Tagesbedarf.', ...body})
  }), {GEMINI_API_KEY: 'test-only'});
  return {data: await response.json(), requests, status: response.status};
}

test('complete response preserves all visible parts and omits thoughts', async () => {
  const result = await run([answer('Ein vollständiger ', 'STOP', [{text: 'Gedanke', thought: true}, {text: 'Satz.'}])]);
  assert.equal(result.data.text, 'Ein vollständiger Satz.');
  assert.equal(result.requests.length, 1);
  assert.equal(result.requests[0].generationConfig.maxOutputTokens, 4096);
});
test('token limit retries the original request once with more room', async () => {
  const result = await run([answer('Um auf 15.000 kcal zu kommen, müsst', 'MAX_TOKENS'), answer('Hier ist die vollständige Antwort.')]);
  assert.equal(result.data.text, 'Hier ist die vollständige Antwort.');
  assert.equal(result.requests[1].generationConfig.maxOutputTokens, 8192);
  assert.deepEqual(result.requests[0].contents, result.requests[1].contents);
});
test('persistent truncation is marked and partial tool calls are never executed', async () => {
  const partial = answer('Unfertig', 'MAX_TOKENS', [{functionCall: {name: 'add_food_to_day', args: {}}}]);
  const result = await run([partial, partial]);
  assert.equal(result.requests.length, 2);
  assert.equal(result.data.truncated, true);
  assert.match(result.data.text, /Ausgabelimits/);
  assert.equal(result.data.functionCalls, undefined);
});
test('failed retry retains the partial text with an explicit warning', async () => {
  const result = await run([answer('Anfang', 'MAX_TOKENS'), {status: 503, data: {error: {message: 'unavailable'}}}]);
  assert.match(result.data.text, /^Anfang\n\n/);
  assert.equal(result.data.truncated, true);
});
test('complete tool calls still use the existing protocol', async () => {
  const result = await run([answer('', 'STOP', [{functionCall: {name: 'add_food_to_day', args: {foodName: 'Reis'}}}])]);
  assert.equal(result.data.functionCalls[0].name, 'add_food_to_day');
});
test('older model fallback also has enough output budget', async () => {
  const unavailable = {status: 404, data: {error: {message: 'model unavailable'}}};
  const result = await run([unavailable, unavailable, answer('Fertig.')]);
  assert.equal(result.requests[2].generationConfig.maxOutputTokens, 4096);
  assert.equal(result.requests[2].generationConfig.thinkingConfig.thinkingBudget, 0);
});
