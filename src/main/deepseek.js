'use strict';

// DeepSeek（OpenAI 兼容 Chat Completions，SSE 流式）。
const { GenError } = require('./llm');
const ENDPOINT = 'https://api.deepseek.com/chat/completions';

/**
 * 流式生成（单模型、单次）。接口与 gemini.generateAnswerStream 对齐。
 * 额外的 thinkingBudget 等参数会被忽略。
 */
async function generateAnswerStream({
  apiKey,
  model,
  systemInstruction,
  userText,
  maxOutputTokens = 2048,
  temperature = 0.6,
  signal,
  onStart,
  onChunk,
}) {
  if (!apiKey) throw new Error('缺少 DeepSeek API Key');

  const body = {
    model,
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: userText },
    ],
    stream: true,
    max_tokens: maxOutputTokens,
    temperature,
  };

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    let txt = '';
    try { txt = await res.text(); } catch (_e) { /* ignore */ }
    throw new GenError(res.status, `DeepSeek 生成失败 (${res.status}): ${txt.slice(0, 400)}`);
  }

  if (onStart) onStart();

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  const flushLine = (line) => {
    const t = line.trim();
    if (!t.startsWith('data:')) return;
    const payload = t.slice(5).trim();
    if (!payload || payload === '[DONE]') return;
    try {
      const obj = JSON.parse(payload);
      const delta = obj?.choices?.[0]?.delta?.content;
      if (typeof delta === 'string' && delta) {
        full += delta;
        if (onChunk) onChunk(delta);
      }
    } catch (_e) {
      // 不完整的 JSON 行：忽略
    }
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      flushLine(line);
    }
  }
  if (buffer) flushLine(buffer);

  return full;
}

module.exports = { generateAnswerStream };
