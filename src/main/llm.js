'use strict';

// 跨 Provider 的通用层：错误类型 + 重试/兜底逻辑。
// 具体的流式实现由各 Provider 的 generateAnswerStream 提供（gemini.js / openaiCompat.js）。

const TRANSIENT = new Set([429, 500, 502, 503, 504]);

class GenError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'GenError';
    this.status = status;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 按 models 顺序尝试；临时性错误(429/5xx)先重试，仍失败切下一个；
 * 一旦开始输出(onStart 已触发)就不再切换。
 * @param {function} opts.streamFn  provider 的 generateAnswerStream
 * @returns {Promise<{model:string, text:string}>}
 */
async function generateWithFallback({ streamFn, models, retries = 1, onStart, ...rest }) {
  let started = false;
  let lastErr = null;

  for (const model of models) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const text = await streamFn({
          ...rest,
          model,
          onStart: () => {
            started = true;
            if (onStart) onStart(model);
          },
        });
        return { model, text };
      } catch (e) {
        lastErr = e;
        if (started) throw e;
        if (e.name === 'AbortError') throw e;
        const transient = e.status && TRANSIENT.has(e.status);
        if (transient && attempt < retries) {
          await sleep(400 * (attempt + 1));
          continue;
        }
        break;
      }
    }
  }
  throw lastErr || new Error('生成失败：所有模型均不可用');
}

module.exports = { GenError, TRANSIENT, generateWithFallback };
