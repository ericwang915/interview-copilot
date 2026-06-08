'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { buildPrompt, EXTRACTION_SYSTEM, buildExtractionUser } = require('../src/main/prompt');

test('buildPrompt: explicit question mode includes the question and history', () => {
  const { systemInstruction, userText } = buildPrompt({
    question: 'Why vLLM?',
    transcript: 'Interviewer: tell me about inference\nCandidate: sure',
    context: '',
    answerLanguage: 'en',
    maxChars: 500,
    profile: '',
  });
  assert.match(systemInstruction, /500/);
  assert.match(systemInstruction, /Answer in English\./);
  assert.match(userText, /Why vLLM\?/);
  assert.match(userText, /对话历史/);
});

test('buildPrompt: extract mode (no question) instructs to find the latest question', () => {
  const { userText } = buildPrompt({
    question: '',
    transcript: 'Interviewer: what is a KV cache?',
    context: '',
    answerLanguage: 'auto',
    maxChars: 500,
  });
  assert.match(userText, /最新\/当前/);
  assert.doesNotMatch(userText, /需要回答的问题/); // no explicit-question block
});

test('buildPrompt: maxChars and profile are injected', () => {
  const { systemInstruction } = buildPrompt({
    question: 'q',
    transcript: '',
    context: '',
    answerLanguage: 'zh',
    maxChars: 250,
    profile: 'You are interviewing at Google.',
  });
  assert.match(systemInstruction, /250 字符以内/);
  assert.match(systemInstruction, /You are interviewing at Google\./);
  assert.match(systemInstruction, /请用中文作答/);
});

test('buildPrompt: knowledge-base context is included when provided', () => {
  const { userText } = buildPrompt({
    question: 'q',
    transcript: '',
    context: 'RESUME: senior engineer',
    answerLanguage: 'en',
    maxChars: 500,
  });
  assert.match(userText, /RESUME: senior engineer/);
});

test('extraction prompt helpers', () => {
  assert.match(EXTRACTION_SYSTEM, /ONLY that question/);
  assert.match(buildExtractionUser('Interviewer: hi'), /Interviewer: hi/);
  assert.match(buildExtractionUser('x'), /current core question is:/);
});
