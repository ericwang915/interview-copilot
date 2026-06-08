'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { generateWithFallback, GenError } = require('../src/main/llm');

// 用一个假的 streamFn 来测试重试/兜底逻辑，不触网。
function makeStreamFn(plan) {
  // plan: { [model]: 'ok' | statusCode } ; 'ok' 会调用 onStart 并返回文本
  const calls = [];
  const fn = async ({ model, onStart, onChunk }) => {
    calls.push(model);
    const outcome = plan[model];
    if (outcome === 'ok') {
      if (onStart) onStart();
      if (onChunk) onChunk('hello from ' + model);
      return 'hello from ' + model;
    }
    throw new GenError(outcome, `fake ${outcome}`);
  };
  fn.calls = calls;
  return fn;
}

test('returns first model when it succeeds', async () => {
  const fn = makeStreamFn({ a: 'ok', b: 'ok' });
  const r = await generateWithFallback({ streamFn: fn, models: ['a', 'b'], retries: 0 });
  assert.equal(r.model, 'a');
  assert.equal(r.text, 'hello from a');
  assert.deepEqual(fn.calls, ['a']);
});

test('falls back to next model on transient 503', async () => {
  const fn = makeStreamFn({ a: 503, b: 'ok' });
  const r = await generateWithFallback({ streamFn: fn, models: ['a', 'b'], retries: 0 });
  assert.equal(r.model, 'b');
  assert.deepEqual(fn.calls, ['a', 'b']);
});

test('retries the same model on transient error before falling back', async () => {
  const fn = makeStreamFn({ a: 429, b: 'ok' });
  const r = await generateWithFallback({ streamFn: fn, models: ['a', 'b'], retries: 1 });
  assert.equal(r.model, 'b');
  // a tried twice (1 retry), then b
  assert.deepEqual(fn.calls, ['a', 'a', 'b']);
});

test('does not fall back on non-transient (400) — moves on but reports last error', async () => {
  const fn = makeStreamFn({ a: 400, b: 400 });
  await assert.rejects(
    () => generateWithFallback({ streamFn: fn, models: ['a', 'b'], retries: 0 }),
    /fake 400/,
  );
  assert.deepEqual(fn.calls, ['a', 'b']);
});

test('AbortError is not retried and propagates', async () => {
  const fn = async ({ onStart }) => {
    void onStart;
    const e = new Error('aborted');
    e.name = 'AbortError';
    throw e;
  };
  await assert.rejects(() => generateWithFallback({ streamFn: fn, models: ['a', 'b'] }), /aborted/);
});

test('once streaming started, an error is not swallowed by fallback', async () => {
  const calls = [];
  const fn = async ({ model, onStart }) => {
    calls.push(model);
    onStart(); // started
    throw new GenError(503, 'mid-stream'); // should NOT fall back after start
  };
  await assert.rejects(
    () => generateWithFallback({ streamFn: fn, models: ['a', 'b'], retries: 1 }),
    /mid-stream/,
  );
  assert.deepEqual(calls, ['a']);
});
