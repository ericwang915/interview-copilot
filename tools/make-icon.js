'use strict';

// Render build/icon.svg → build/icon.png (1024) via Electron, then build/icon.icns
// via macOS sips + iconutil. Run with: npm run icon
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SIZE = 1024;
const ROOT = path.join(__dirname, '..');
const BUILD = path.join(ROOT, 'build');

app.whenReady().then(async () => {
  const svg = fs.readFileSync(path.join(BUILD, 'icon.svg'), 'utf8');
  const html =
    `<!doctype html><html><head><meta charset="utf-8">` +
    `<style>html,body{margin:0;width:${SIZE}px;height:${SIZE}px;background:transparent;overflow:hidden}` +
    `svg{display:block}</style></head><body>${svg}</body></html>`;

  const win = new BrowserWindow({
    width: SIZE,
    height: SIZE,
    show: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  await new Promise((r) => setTimeout(r, 400));

  const img = await win.webContents.capturePage();
  const pngPath = path.join(BUILD, 'icon.png');
  fs.writeFileSync(pngPath, img.toPNG());
  console.log('[icon] wrote', pngPath);

  if (process.platform === 'darwin') {
    const iconset = path.join(BUILD, 'Icon.iconset');
    fs.rmSync(iconset, { recursive: true, force: true });
    fs.mkdirSync(iconset, { recursive: true });
    const sizes = [
      [16, '16x16'],
      [32, '16x16@2x'],
      [32, '32x32'],
      [64, '32x32@2x'],
      [128, '128x128'],
      [256, '128x128@2x'],
      [256, '256x256'],
      [512, '256x256@2x'],
      [512, '512x512'],
      [1024, '512x512@2x'],
    ];
    for (const [px, name] of sizes) {
      spawnSync('sips', [
        '-z',
        String(px),
        String(px),
        pngPath,
        '--out',
        path.join(iconset, `icon_${name}.png`),
      ]);
    }
    const r = spawnSync('iconutil', ['-c', 'icns', iconset, '-o', path.join(BUILD, 'icon.icns')]);
    if (r.status === 0) console.log('[icon] wrote', path.join(BUILD, 'icon.icns'));
    else console.error('[icon] iconutil failed', (r.stderr || r.error || '').toString());
    fs.rmSync(iconset, { recursive: true, force: true });
  }

  app.quit();
});
