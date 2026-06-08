'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { chunkText } = require('../src/main/documents');

test('chunkText: empty/whitespace returns no chunks', () => {
  assert.deepEqual(chunkText(''), []);
  assert.deepEqual(chunkText('   \n\n  '), []);
});

test('chunkText: short text is a single chunk', () => {
  const chunks = chunkText('hello world');
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0], 'hello world');
});

test('chunkText: long text is split into multiple chunks within maxLen', () => {
  const para = 'A'.repeat(500);
  const text = Array(10).fill(para).join('\n\n');
  const chunks = chunkText(text, 900, 150);
  assert.ok(chunks.length > 1);
  for (const c of chunks) assert.ok(c.length <= 900 + 1, `chunk too long: ${c.length}`);
});

test('chunkText: an oversized single paragraph is hard-split', () => {
  const chunks = chunkText('B'.repeat(2500), 900, 150);
  assert.ok(chunks.length >= 3);
});
