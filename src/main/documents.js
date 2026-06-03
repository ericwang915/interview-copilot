'use strict';

const fs = require('fs');
const path = require('path');

/**
 * 解析单个文件为纯文本。支持 txt/md/json/csv（原生）、pdf、docx。
 */
async function parseFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (['.txt', '.md', '.markdown', '.json', '.csv', '.log'].includes(ext)) {
    return fs.readFileSync(filePath, 'utf8');
  }

  if (ext === '.pdf') {
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(fs.readFileSync(filePath));
      return data.text || '';
    } catch (e) {
      throw new Error(`解析 PDF 失败：${e.message}`);
    }
  }

  if (ext === '.docx') {
    try {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value || '';
    } catch (e) {
      throw new Error(`解析 DOCX 失败：${e.message}`);
    }
  }

  // 兜底：当作纯文本读取
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * 将长文本切块。按段落聚合到 ~maxLen 字符，块间保留 overlap 重叠。
 */
function chunkText(text, maxLen = 900, overlap = 150) {
  const clean = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!clean) return [];

  const paragraphs = clean.split(/\n\n+/);
  const chunks = [];
  let cur = '';

  const push = () => {
    const t = cur.trim();
    if (t) chunks.push(t);
  };

  for (const para of paragraphs) {
    const p = para.trim();
    if (!p) continue;

    if (p.length > maxLen) {
      // 段落过长：按句子/字符硬切
      push();
      cur = '';
      for (let i = 0; i < p.length; i += maxLen - overlap) {
        chunks.push(p.slice(i, i + maxLen).trim());
      }
      continue;
    }

    if ((cur + '\n\n' + p).length > maxLen) {
      push();
      // 用上一块的尾部作为重叠，保留上下文
      const tail = cur.slice(Math.max(0, cur.length - overlap));
      cur = (tail ? tail + '\n\n' : '') + p;
    } else {
      cur = cur ? cur + '\n\n' + p : p;
    }
  }
  push();
  return chunks.filter(Boolean);
}

module.exports = { parseFile, chunkText };
