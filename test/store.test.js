'use strict';

const test = require('node:test');
const assert = require('node:assert');
const store = require('../src/main/store');

test('store: add / summary / buildContext / remove / clear', () => {
  store.clear();
  assert.deepEqual(store.summary(), []);

  const s1 = store.add('resume.txt', 'I am a backend engineer.');
  assert.equal(s1.length, 1);
  assert.equal(s1[0].name, 'resume.txt');
  assert.equal(s1[0].chars, 'I am a backend engineer.'.length);

  store.add('jd.txt', 'We need a forward deployed engineer.');
  const ctx = store.buildContext(60000);
  assert.match(ctx, /resume\.txt/);
  assert.match(ctx, /forward deployed engineer/);

  const id = store.summary()[0].id;
  const after = store.remove(id);
  assert.equal(after.length, 1);
  assert.equal(after[0].name, 'jd.txt');

  store.clear();
  assert.equal(store.buildContext(60000), '');
});

test('store: buildContext truncates when over the limit', () => {
  store.clear();
  store.add('big.txt', 'x'.repeat(1000));
  const ctx = store.buildContext(200);
  assert.ok(ctx.length <= 200 + 40);
  assert.match(ctx, /已截断/);
  store.clear();
});
