'use strict';

// Render a 1280x640 GitHub "social preview" (Open Graph) image to
// assets/social-preview.png via Electron. Upload it under
// repo Settings → Social preview. Run with: npm run social
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const W = 1280;
const H = 640;
const ROOT = path.join(__dirname, '..');

app.whenReady().then(async () => {
  const icon = fs.readFileSync(path.join(ROOT, 'build', 'icon.svg'), 'utf8');
  let shot = '';
  try {
    const b64 = fs.readFileSync(path.join(ROOT, 'assets', 'screenshot.png')).toString('base64');
    shot = `<img class="shot" src="data:image/png;base64,${b64}" />`;
  } catch (_e) {
    /* no screenshot yet */
  }

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;
      font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif;background:#f4f0ea;color:#2c2722}
    .wrap{position:relative;width:100%;height:100%}
    .left{position:absolute;left:64px;top:0;height:100%;width:600px;display:flex;flex-direction:column;justify-content:center;gap:18px;z-index:2}
    .brand{display:flex;align-items:center;gap:18px}
    .brand .ic{width:84px;height:84px}
    h1{margin:0;font-size:54px;font-weight:700;letter-spacing:-0.02em}
    .tag{margin:0;font-size:23px;line-height:1.45;color:#5c554d;max-width:540px}
    .chips{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px}
    .chip{font-size:15px;font-weight:600;color:#b34d2b;background:#f7e7dd;border:1px solid #f0dccd;border-radius:999px;padding:7px 14px}
    .url{font-size:16px;color:#a39a8e;margin-top:8px}
    .right{position:absolute;right:-70px;top:54px;width:760px;border-radius:18px;overflow:hidden;
      box-shadow:0 30px 80px rgba(60,45,30,.22);border:1px solid #ece6dd;transform:rotate(-3deg)}
    .right .shot{display:block;width:100%}
    .fade{position:absolute;right:0;top:0;width:200px;height:100%;
      background:linear-gradient(90deg,rgba(244,240,234,0),#f4f0ea);z-index:1}
  </style></head><body><div class="wrap">
    <div class="left">
      <div class="brand"><span class="ic">${icon.replace('width="1024" height="1024"', 'width="84" height="84"')}</span>
        <h1>Interview Copilot</h1></div>
      <p class="tag">Hear the interviewer's question and draft your answer — live, and entirely on your machine.</p>
      <div class="chips"><span class="chip">Deepgram STT</span><span class="chip">DeepSeek · Gemini · OpenAI · Ollama</span><span class="chip">Local-first</span><span class="chip">MIT</span></div>
      <div class="url">github.com/ericwang915/interview-copilot</div>
    </div>
    <div class="right">${shot}</div>
    <div class="fade"></div>
  </div></body></html>`;

  const win = new BrowserWindow({
    width: W,
    height: H,
    show: true,
    frame: false,
    backgroundColor: '#f4f0ea',
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  await new Promise((r) => setTimeout(r, 500));
  const img = await win.webContents.capturePage();
  const out = path.join(ROOT, 'assets', 'social-preview.png');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, img.toPNG());
  console.log('[social] wrote', out);
  app.quit();
});
