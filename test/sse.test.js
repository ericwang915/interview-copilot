'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { deltaFromSSEData } = require('../src/main/openaiCompat');

test('deltaFromSSEData: extracts content delta', () => {
  const payload = JSON.stringify({ choices: [{ delta: { content: 'Hello' } }] });
  assert.equal(deltaFromSSEData(payload), 'Hello');
});

test('deltaFromSSEData: ignores reasoning_content (thinking is not shown)', () => {
  const payload = JSON.stringify({ choices: [{ delta: { reasoning_content: 'thinking...' } }] });
  assert.equal(deltaFromSSEData(payload), '');
});

test('deltaFromSSEData: null content and [DONE] yield empty string', () => {
  assert.equal(deltaFromSSEData(JSON.stringify({ choices: [{ delta: { content: null } }] })), '');
  assert.equal(deltaFromSSEData('[DONE]'), '');
  assert.equal(deltaFromSSEData(''), '');
});

test('deltaFromSSEData: malformed JSON does not throw', () => {
  assert.equal(deltaFromSSEData('{not json'), '');
});
