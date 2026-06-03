'use strict';

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DEFAULTS = {
  deepgramApiKey: process.env.DEEPGRAM_API_KEY || '',
  // 答案 Provider： gemini / deepseek
  provider: 'gemini',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
  deepseekModel: 'deepseek-v4-pro',
  // 转写语言： zh / en-US / multi
  sttLanguage: 'en-US',
  // 生成模型（可编辑，填你账号能用的任意 Flash 模型 ID）
  genModel: 'gemini-2.5-flash',
  // 注入到上下文的资料最大字符数
  maxContextChars: 60000,
  // 全局热键：按下后自动识别问题并生成答案
  hotkey: 'Control+A',
  // 答案字数上限
  maxChars: 500,
  // 答案语言： auto（跟随问题） / zh / en
  answerLanguage: 'auto',
  // 面试背景与作答风格（注入到系统提示，最高优先级）
  interviewProfile: '',
};

function settingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function load() {
  try {
    const raw = fs.readFileSync(settingsPath(), 'utf8');
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch (_e) {
    return { ...DEFAULTS };
  }
}

function save(partial) {
  const merged = { ...load(), ...partial };
  try {
    fs.writeFileSync(settingsPath(), JSON.stringify(merged, null, 2), 'utf8');
  } catch (e) {
    console.error('保存设置失败:', e);
  }
  return merged;
}

module.exports = { load, save, DEFAULTS, settingsPath };
