'use strict';

// 资料知识库：保存上传/粘贴文档的纯文本，作答时整体拼进上下文。
// 持久化到 userData/knowledge.json —— 增/删/改/清空都会落盘，重启后仍在。
// 不做向量检索；Flash/大模型上下文很大，面试资料直接喂即可。

const fs = require('fs');
const path = require('path');

// 在 Electron 主进程里能拿到 app；在纯 Node 单测里拿不到 → 自动退回内存模式（不落盘）。
let app = null;
try {
  app = require('electron').app;
} catch (_e) {
  /* not in electron */
}
const canPersist = () => !!(app && typeof app.getPath === 'function');
const filePath = () => path.join(app.getPath('userData'), 'knowledge.json');

let docs = null; // 懒加载： { id, name, text, chars }[]
let seq = 0;

function ensureLoaded() {
  if (docs !== null) return;
  docs = [];
  seq = 0;
  if (!canPersist()) return;
  try {
    const data = JSON.parse(fs.readFileSync(filePath(), 'utf8'));
    if (Array.isArray(data.docs)) {
      docs = data.docs;
      seq = docs.reduce((m, d) => {
        const n = parseInt(String(d.id).replace(/\D/g, ''), 10) || 0;
        return Math.max(m, n);
      }, 0);
    }
  } catch (_e) {
    // 文件不存在 / 损坏 → 视为空库
  }
}

function persist() {
  if (!canPersist()) return;
  try {
    fs.writeFileSync(filePath(), JSON.stringify({ docs }, null, 2), 'utf8');
  } catch (e) {
    console.error('保存知识库失败:', e);
  }
}

function add(name, text) {
  ensureLoaded();
  const clean = (text || '').trim();
  const id = `doc_${++seq}`;
  docs.push({ id, name, text: clean, chars: clean.length });
  persist();
  return summary();
}

// 更新某条资料的名称/内容（删了重加也行，这个用于原地更新）
function update(id, { name, text } = {}) {
  ensureLoaded();
  const d = docs.find((x) => x.id === id);
  if (d) {
    if (typeof name === 'string') d.name = name;
    if (typeof text === 'string') {
      d.text = text.trim();
      d.chars = d.text.length;
    }
    persist();
  }
  return summary();
}

function remove(id) {
  ensureLoaded();
  docs = docs.filter((d) => d.id !== id);
  persist();
  return summary();
}

function clear() {
  ensureLoaded();
  docs = [];
  persist();
  return summary();
}

function summary() {
  ensureLoaded();
  return docs.map((d) => ({ id: d.id, name: d.name, chars: d.chars }));
}

/**
 * 拼出注入上下文的资料文本，超过上限则按比例截断。
 */
function buildContext(maxChars = 60000) {
  ensureLoaded();
  if (docs.length === 0) return '';
  const blocks = docs.map((d) => `### 资料：${d.name}\n${d.text}`);
  let joined = blocks.join('\n\n---\n\n');
  if (joined.length > maxChars) {
    joined = joined.slice(0, maxChars) + '\n\n[资料过长，已截断]';
  }
  return joined;
}

// 仅供单测：重置内存状态
function _reset() {
  docs = [];
  seq = 0;
}

module.exports = { add, update, remove, clear, summary, buildContext, _reset };
