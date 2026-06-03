'use strict';

// 简单的资料知识库：保存上传文档的纯文本，作答时整体拼进 Gemini 上下文。
// 不做向量检索 —— Flash 上下文很大，面试资料（简历/JD/笔记）直接喂即可。

let docs = []; // { id, name, text, chars }
let seq = 0;

function add(name, text) {
  const clean = (text || '').trim();
  const id = `doc_${++seq}`;
  docs.push({ id, name, text: clean, chars: clean.length });
  return summary();
}

function remove(id) {
  docs = docs.filter((d) => d.id !== id);
  return summary();
}

function clear() {
  docs = [];
  return summary();
}

function summary() {
  return docs.map((d) => ({ id: d.id, name: d.name, chars: d.chars }));
}

/**
 * 拼出注入上下文的资料文本，超过上限则按比例截断。
 */
function buildContext(maxChars = 60000) {
  if (docs.length === 0) return '';
  const blocks = docs.map((d) => `### 资料：${d.name}\n${d.text}`);
  let joined = blocks.join('\n\n---\n\n');
  if (joined.length > maxChars) {
    joined = joined.slice(0, maxChars) + '\n\n[资料过长，已截断]';
  }
  return joined;
}

module.exports = { add, remove, clear, summary, buildContext };
