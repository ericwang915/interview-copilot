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
const openaiCompat = require('./openaiCompat');
const prompt = require('./prompt');
const { PROVIDERS } = require('./config');

// 按当前 Provider（config.js 注册表）解析出：流式实现 / Key / baseURL / 模型链
function resolveProvider(s) {
  const id = s.provider && PROVIDERS[s.provider] ? s.provider : 'gemini';
  const p = PROVIDERS[id];
  const model = ((s[p.modelField] || '') + '').trim() || p.defaultModel;
  const models = [model, ...(p.fallbacks || [])].filter((m, i, a) => a.indexOf(m) === i);
  return {
    id,
    label: p.label,
    type: p.type,
    needsKey: !!p.keyField,
    apiKey: p.keyField ? s[p.keyField] || '' : '',
    baseURL: p.baseURLField ? s[p.baseURLField] || p.baseURL : p.baseURL,
    models,
    streamFn: p.type === 'gemini' ? gemini.generateAnswerStream : openaiCompat.generateAnswerStream,
  };
}

// 固定 app 名，保证 dev 运行与打包后的 .app 使用同一份 userData/settings.json
app.setName('interview-copilot');

let mainWindow = null;
let currentSettings = settingsStore.load();
let activeGen = null; // { id, controller }

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

  // 截图模式：注入一段演示对话，截取窗口写到 assets/screenshot.png 后退出（仅用于生成 README 图）。
  if (process.env.INTERVIEW_SCREENSHOT) {
    mainWindow.webContents.on('did-finish-load', () => {
      // 等 init() 跑完再注入演示内容，避免被 showEmptyState 覆盖。
      setTimeout(async () => {
        try {
          const fs = require('fs');
          await mainWindow.webContents.executeJavaScript(require('./_screenshotDemo').demoJs());
          await new Promise((r) => setTimeout(r, 350));
          const img = await mainWindow.webContents.capturePage();
          const out = path.join(__dirname, '..', '..', 'assets', 'screenshot.png');
          fs.mkdirSync(path.dirname(out), { recursive: true });
          fs.writeFileSync(out, img.toPNG());
          console.log('[screenshot] wrote', out);
        } catch (e) {
          console.error('[screenshot] failed', e);
        }
        app.quit();
      }, 1000);
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
    try {
      activeGen.controller.abort();
    } catch (_e) {
      /* ignore */
    }
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
  if (prov.needsKey && !prov.apiKey) {
    send('answer-error', { message: `未配置 ${prov.label} API Key，请在「设置」中填写。` });
    return;
  }

  // 取消上一个
  if (activeGen) {
    try {
      activeGen.controller.abort();
    } catch (_e) {
      /* ignore */
    }
  }
  const controller = new AbortController();
  activeGen = { id: reqId, controller };

  const context = store.buildContext(currentSettings.maxContextChars || 60000);
  const { systemInstruction, userText } = prompt.buildPrompt({
    question: q,
    transcript: tr,
    context,
    answerLanguage: currentSettings.answerLanguage || 'auto',
    maxChars: currentSettings.maxChars || 500,
    profile: currentSettings.interviewProfile || '',
  });

  // 输出 token 上限。
  // - OpenAI 兼容类（含 DeepSeek/Ollama）可能是“推理模型”：max_tokens 需同时覆盖隐藏思考链，
  //   预算太小会导致答案为空，因此放宽，答案长度交给提示词控制（思考链不展示给用户）。
  // - Gemini 已关闭思考(thinkingBudget=0)，可按字数上限收紧做长度兜底。
  const maxChars = currentSettings.maxChars || 500;
  const lang = currentSettings.answerLanguage || 'auto';
  const perChar = lang === 'en' ? 0.5 : 1.1;
  const maxOutputTokens =
    prov.type === 'openai'
      ? 4096
      : Math.min(4096, Math.max(160, Math.ceil(maxChars * perChar * 1.15)));
  const extractTokens = prov.type === 'openai' ? 1024 : 80;

  const common = {
    streamFn: prov.streamFn,
    apiKey: prov.apiKey,
    baseURL: prov.baseURL,
    models: prov.models,
    thinkingBudget: 0,
    signal: controller.signal,
  };

  // 提取模式（问题框留空）：并行跑一个轻量调用，把识别到的问题回填到「Current Question」框。
  // 问题只看最近几轮（末尾 6 行），与作答并行、不阻塞。
  if (!q && tr) {
    const recentTr = tr.split('\n').slice(-6).join('\n');
    llm
      .generateWithFallback({
        ...common,
        systemInstruction: prompt.EXTRACTION_SYSTEM,
        userText: prompt.buildExtractionUser(recentTr),
        maxOutputTokens: extractTokens,
        onChunk: () => {},
      })
      .then((r) => send('answer-question', { question: (r.text || '').trim() }))
      .catch(() => {});
  }

  try {
    await llm.generateWithFallback({
      ...common,
      systemInstruction,
      userText,
      maxOutputTokens,
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
    shell.openExternal(
      'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
    );
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
