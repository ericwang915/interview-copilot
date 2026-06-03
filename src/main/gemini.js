'use strict';

// 直接使用 Gemini REST API（无需第三方 SDK），主进程 Node 自带 fetch。
const { GenError } = require('./llm');
const BASE = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * 流式生成答案（单模型、单次）。
 * @param {function} [opts.onStart]  在确认服务端 200、即将开始输出前调用一次
 * @param {function} opts.onChunk    每收到一段文本调用 onChunk(textDelta)
 * @returns {Promise<string>} 完整文本
 */
async function generateAnswerStream({
  apiKey,
  model,
  systemInstruction,
  userText,
  maxOutputTokens = 2048,
  temperature = 0.6,
  // 思考预算：0 = 关闭思考（更快、且思考不再吃掉输出 token 导致截断）
  thinkingBudget = 0,
  signal,
  onStart,
  onChunk,
}) {
  if (!apiKey) throw new Error('缺少 Gemini API Key');

  const url = `${BASE}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
  const buildBody = (withThinking) => ({
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: 'user', parts: [{ text: userText }] }],
    generationConfig: {
      maxOutputTokens,
      temperature,
      ...(withThinking && thinkingBudget != null ? { thinkingConfig: { thinkingBudget } } : {}),
    },
  });

  const post = (withThinking) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildBody(withThinking)),
      signal,
    });

  let res = await post(thinkingBudget != null);
  // 个别模型不接受 thinkingConfig（400）：去掉该字段重试一次
  if (!res.ok && res.status === 400 && thinkingBudget != null) {
    res = await post(false);
  }

  if (!res.ok || !res.body) {
    let txt = '';
    try { txt = await res.text(); } catch (_e) { /* ignore */ }
    throw new GenError(res.status, `生成失败 (${res.status}): ${txt.slice(0, 400)}`);
  }

  if (onStart) onStart();

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  const flushLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === '[DONE]') return;
    try {
      const obj = JSON.parse(payload);
      const parts = obj?.candidates?.[0]?.content?.parts || [];
      for (const p of parts) {
        if (typeof p.text === 'string' && p.text) {
          full += p.text;
          if (onChunk) onChunk(p.text);
        }
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
