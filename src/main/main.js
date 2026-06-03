'use strict';

const path = require('path');
const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  globalShortcut,
  session,
  desktopCapturer,
  systemPreferences,
  shell,
} = require('electron');

const settingsStore = require('./settings');
const store = require('./store');
const docs = require('./documents');
const llm = require('./llm');
const gemini = require('./gemini');
const deepseek = require('./deepseek');

// 按当前 Provider 选择流式实现 / Key / 模型链
function resolveProvider(s) {
  if ((s.provider || 'gemini') === 'deepseek') {
    const primary = s.deepseekModel || 'deepseek-v4-pro';
    const fallbacks = ['deepseek-v4-flash', 'deepseek-chat'];
    return {
      name: 'deepseek',
      streamFn: deepseek.generateAnswerStream,
      apiKey: s.deepseekApiKey,
      keyLabel: 'DeepSeek',
      models: [primary, ...fallbacks].filter((m, i, a) => a.indexOf(m) === i),
    };
  }
  const primary = s.genModel || 'gemini-2.5-flash';
  const fallbacks = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  return {
    name: 'gemini',
    streamFn: gemini.generateAnswerStream,
    apiKey: s.geminiApiKey,
    keyLabel: 'Gemini',
    models: [primary, ...fallbacks].filter((m, i, a) => a.indexOf(m) === i),
  };
}

// 固定 app 名，保证 dev 运行与打包后的 .app 使用同一份 userData/settings.json
app.setName('interview-copilot');

let mainWindow = null;
let currentSettings = settingsStore.load();
let activeGen = null; // { id, controller }

function buildPrompt({ question, transcript, context, answerLanguage, maxChars, profile }) {
  const langRule =
    answerLanguage === 'zh'
      ? '请用中文作答。'
      : answerLanguage === 'en'
        ? 'Answer in English.'
        : '使用与问题相同的语言作答。';

  const lines = [
    '你是正在参加面试的候选人本人。下面会给出面试现场的对话片段 / 问题，以及可能相关的个人资料/知识库内容。',
    '请用第一人称、专业且自然的口吻，像在面试现场【口头作答】一样直接回答问题。',
    '要求：',
    `1) 严格控制在 ${maxChars} 字符以内（硬性上限），目标约 300 字、宁可更短。【大纲式，不要整段散文】：第一行一句话给结论/判断；随后 2-3 个以“- ”开头的精炼要点（关键词、工具、数字、取舍），能用词组就别用整句。`,
    '2) 纯文本输出，禁止使用 Markdown 加粗/星号(**)、井号(#)、表格等标记（界面不渲染 Markdown，会显示成乱码）；删掉所有铺垫和客套；',
    '3) 直接开口作答，不要复述问题、不要写“我的回答”之类的标题、不要出现“根据资料/上文”之类措辞；',
    '4) 若资料中有相关信息务必优先采用并保持事实准确，资料无关则用你的专业知识作答；',
    '5) 给到的对话是实时语音识别结果，可能有重复、串音、口误、错别字——请自行容错，判断面试官【当前最可能在问的核心问题】，只回答这个问题；',
    `6) ${langRule}`,
  ];
  if (profile && profile.trim()) {
    lines.push('', '================ 本次面试背景与作答风格（最高优先级，务必遵循） ================', profile.trim());
  }
  const systemInstruction = lines.join('\n');

  const parts = [];
  if (context) parts.push(`【可参考的个人资料 / 知识库】\n${context}\n`);

  const q = (question || '').trim();
  if (q) {
    if (transcript) parts.push(`【最近约15轮面试对话历史（语音识别，可能有重复/错误，仅供你理解上下文、保持连贯）】\n${transcript}\n`);
    parts.push(`【需要回答的问题】\n${q}`);
    parts.push('请结合上面的对话上下文直接作答。');
    parts.push('\n请直接给出你的回答：');
  } else {
    parts.push(`【最近约15轮面试对话历史（语音识别，可能有重复/串音/口误）】\n${transcript || '(暂无对话)'}\n`);
    parts.push('请在心里判断面试官【最新/当前】正在问的核心问题，然后【直接作答】；较早的轮次只作为背景上下文，用来让回答更贴合、连贯，不要去回答更早的旧问题。');
    parts.push('严禁任何前缀或复述，例如不得出现“The core question is…”“面试官在问…”“你的问题是…”，第一句话就是你的回答本身。');
    parts.push('\n你的回答：');
  }

  return { systemInstruction, userText: parts.join('\n') };
}

function createWindow() {
  const smoke = !!process.env.INTERVIEW_SMOKE;
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    show: !smoke,
    backgroundColor: '#0f1117',
    title: 'Interview Copilot',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  if (smoke) {
    mainWindow.webContents.on('did-finish-load', () => {
      console.log('[smoke] window loaded OK');
      app.quit();
    });
    mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
      console.error('[smoke] load failed', code, desc);
      process.exit(1);
    });
    mainWindow.webContents.on('console-message', (_e, level, message) => {
      console.log('[renderer]', message);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 允许渲染进程通过 getDisplayMedia 采集系统声音（面试官）。
function setupDisplayMediaLoopback() {
  session.defaultSession.setDisplayMediaRequestHandler(
    (request, callback) => {
      desktopCapturer
        .getSources({ types: ['screen'] })
        .then((sources) => {
          // macOS 13+ : audio: 'loopback' 直接抓系统声音
          callback({ video: sources[0], audio: 'loopback' });
        })
        .catch((e) => {
          console.error('getSources 失败:', e);
          callback({});
        });
    },
    { useSystemPicker: false },
  );
}

function registerHotkey() {
  globalShortcut.unregisterAll();
  const key = currentSettings.hotkey || 'Control+A';
  try {
    const ok = globalShortcut.register(key, () => {
      if (mainWindow) mainWindow.webContents.send('hotkey-generate');
    });
    if (!ok) console.warn(`热键 ${key} 注册失败（可能被占用）`);
    return ok;
  } catch (e) {
    console.error('注册热键出错:', e);
    return false;
  }
}

// ---------- IPC ----------

ipcMain.handle('get-settings', () => currentSettings);

ipcMain.handle('save-settings', (_e, partial) => {
  currentSettings = settingsStore.save(partial || {});
  registerHotkey();
  return currentSettings;
});

ipcMain.handle('list-documents', () => store.summary());

ipcMain.handle('remove-document', (_e, id) => store.remove(id));

ipcMain.handle('clear-documents', () => store.clear());

ipcMain.handle('pick-documents', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择面试资料（简历 / JD / 笔记等）',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: '文档', extensions: ['txt', 'md', 'markdown', 'pdf', 'docx', 'json', 'csv', 'log'] },
      { name: '全部文件', extensions: ['*'] },
    ],
  });
  if (result.canceled) return { canceled: true, docs: store.summary() };

  const errors = [];
  for (const filePath of result.filePaths) {
    try {
      const text = await docs.parseFile(filePath);
      store.add(path.basename(filePath), text);
    } catch (e) {
      errors.push(`${path.basename(filePath)}: ${e.message}`);
    }
  }
  return { canceled: false, docs: store.summary(), errors };
});

// 添加手动粘贴的资料文本
ipcMain.handle('add-text-document', (_e, { name, text }) => {
  store.add(name || '手动输入', text || '');
  return store.summary();
});

// 取消正在进行的生成
ipcMain.on('cancel-generate', () => {
  if (activeGen) {
    try { activeGen.controller.abort(); } catch (_e) { /* ignore */ }
    activeGen = null;
  }
});

// 生成答案（流式）
ipcMain.on('generate-answer', async (_e, { reqId, question, transcript }) => {
  const send = (channel, payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, { reqId, ...payload });
    }
  };

  const q = (question || '').trim();
  const tr = (transcript || '').trim();
  if (!q && !tr) {
    send('answer-error', { message: '没有识别到对话内容，请先开始监听，或在问题框手动输入。' });
    return;
  }

  const prov = resolveProvider(currentSettings);
  if (!prov.apiKey) {
    send('answer-error', { message: `未配置 ${prov.keyLabel} API Key，请在「设置」中填写。` });
    return;
  }

  // 取消上一个
  if (activeGen) {
    try { activeGen.controller.abort(); } catch (_e) { /* ignore */ }
  }
  const controller = new AbortController();
  activeGen = { id: reqId, controller };

  const context = store.buildContext(currentSettings.maxContextChars || 60000);
  const { systemInstruction, userText } = buildPrompt({
    question: q,
    transcript: tr,
    context,
    answerLanguage: currentSettings.answerLanguage || 'auto',
    maxChars: currentSettings.maxChars || 500,
    profile: currentSettings.interviewProfile || '',
  });

  // 输出 token 上限。
  // - DeepSeek v4 是“推理模型”：max_tokens 需同时覆盖隐藏的思考链，预算太小会导致答案为空，
  //   因此放宽预算，答案长度交给提示词控制（思考链不显示给用户）。
  // - Gemini 已关闭思考(thinkingBudget=0)，可按字数上限收紧做长度兜底。
  const maxChars = currentSettings.maxChars || 500;
  const lang = currentSettings.answerLanguage || 'auto';
  const perChar = lang === 'en' ? 0.5 : 1.1;
  const maxOutputTokens =
    prov.name === 'deepseek'
      ? 4096
      : Math.min(4096, Math.max(160, Math.ceil(maxChars * perChar * 1.15)));
  const extractTokens = prov.name === 'deepseek' ? 1024 : 80;

  // 提取模式（问题框留空）：并行跑一个轻量调用，把识别到的问题回填到「Current Question」框。
  // 问题只看最近几轮（末尾 6 行），与作答并行、不阻塞。
  if (!q && tr) {
    const recentTr = tr.split('\n').slice(-6).join('\n');
    llm
      .generateWithFallback({
        streamFn: prov.streamFn,
        apiKey: prov.apiKey,
        models: prov.models,
        systemInstruction:
          "You clean up noisy live interview transcripts. The transcript may contain repeats, cross-talk, ASR errors and half-sentences. Identify the interviewer's CURRENT core question and rewrite it as ONE clean, complete question. Output ONLY that question — no prefix, no quotes, no explanation. Write it in the SAME language the interviewer is speaking.",
        userText: `Recent turns:\n${recentTr}\n\nThe interviewer's current core question is:`,
        maxOutputTokens: extractTokens,
        thinkingBudget: 0,
        signal: controller.signal,
        onChunk: () => {},
      })
      .then((r) => send('answer-question', { question: (r.text || '').trim() }))
      .catch(() => {});
  }

  try {
    await llm.generateWithFallback({
      streamFn: prov.streamFn,
      apiKey: prov.apiKey,
      models: prov.models,
      systemInstruction,
      userText,
      maxOutputTokens,
      thinkingBudget: 0,
      signal: controller.signal,
      onStart: (model) => send('answer-start', { question: q, model, primary: prov.models[0] }),
      onChunk: (delta) => send('answer-chunk', { delta }),
    });
    send('answer-done', {});
  } catch (e) {
    if (e.name === 'AbortError') {
      send('answer-done', { aborted: true });
    } else {
      send('answer-error', { message: e.message });
    }
  } finally {
    if (activeGen && activeGen.id === reqId) activeGen = null;
  }
});

// 屏幕录制权限（macOS）—— 抓系统声音(Loopback) 需要它
ipcMain.handle('get-screen-permission', () => {
  if (process.platform !== 'darwin') return 'granted';
  return systemPreferences.getMediaAccessStatus('screen');
});

ipcMain.handle('open-screen-settings', () => {
  if (process.platform === 'darwin') {
    shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
  }
  return true;
});

// 麦克风权限（macOS）
ipcMain.handle('ensure-mic-permission', async () => {
  if (process.platform !== 'darwin') return true;
  const status = systemPreferences.getMediaAccessStatus('microphone');
  if (status === 'granted') return true;
  try {
    return await systemPreferences.askForMediaAccess('microphone');
  } catch (_e) {
    return false;
  }
});

// ---------- app lifecycle ----------

app.whenReady().then(() => {
  setupDisplayMediaLoopback();
  createWindow();
  registerHotkey();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
