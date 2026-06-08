# Interview Copilot

> Real-time interview assistant — live dual-channel transcription (Deepgram) + LLM answers (DeepSeek / Gemini / OpenAI / Ollama), grounded in your own documents.

A single-window Electron desktop app. It listens to a conversation, separates **you (microphone)** from the **interviewer (system audio)**, and on a hotkey detects the interviewer's current question and drafts a concise, first-person answer — using the last ~15 turns of dialogue plus any documents you upload as context.

> 中文说明见下方 [中文](#中文)。

---

## ⚠️ Disclaimer — read this first

This tool is built for **interview preparation, practice, self-review, mock interviews, and accessibility assistance**.

Using real-time answer generation during a **live** interview without the other party's knowledge may violate the policies of the company you're interviewing with, employment agreements, academic-integrity rules, or local law, and many people consider it dishonest. **You are solely responsible for how you use this software and for complying with all applicable rules and laws.** The authors provide it "as is" with no warranty (see [LICENSE](LICENSE)) and do not endorse deceptive use.

## 🔐 Privacy — what leaves your machine

This app sends data to third-party APIs **only for the providers you configure**:

- **Audio** (microphone + captured system audio) is streamed to **Deepgram** for transcription.
- **Transcripts, your question, and uploaded document text** are sent to your chosen **answer provider** (DeepSeek / Gemini / OpenAI) to generate answers.
- API keys are stored **locally only**, in `app.getPath('userData')/settings.json` (e.g. `~/Library/Application Support/interview-copilot/settings.json` on macOS). They are never committed to the repo or sent anywhere except the provider's own API.

Want **zero cloud**? Use **Ollama** as the answer provider (runs locally). A fully local STT option (Whisper) is on the [roadmap](#roadmap).

---

## Features

- 🎙️ **Dual-channel transcription** — mic = candidate, system loopback = interviewer, transcribed separately and color-coded.
- ⌨️ **One-key answering** — press `Ctrl+A` (configurable): detects the interviewer's *current* question from the latest turns and streams an answer.
- 🧠 **Context-aware** — answers are grounded in the last ~15 turns of dialogue + your uploaded résumé / JD / notes (Knowledge Base).
- 🔌 **Switchable providers** — DeepSeek, Gemini, OpenAI, or local Ollama, with automatic retry + model fallback.
- ✍️ **Concise, outline-style** answers (default ≤ 500 chars), shown alongside the detected question so you can edit and regenerate.
- 🖥️ **Single, clean UI** — live transcript on the left; question / answer / knowledge base on the right.

## Requirements

- **macOS 13+** (Ventura or later) — current target. Windows/Linux: see [Platform support](#platform-support).
- **Node.js ≥ 18** (Node 20 LTS recommended; see `.nvmrc`).
- API keys: [Deepgram](https://console.deepgram.com/) (STT, required) and at least one answer provider — [DeepSeek](https://platform.deepseek.com/) / [Gemini](https://aistudio.google.com/apikey) / [OpenAI](https://platform.openai.com/api-keys), or a local [Ollama](https://ollama.com/) install.

## Quick start (dev)

```bash
git clone https://github.com/ericwang915/interview-copilot
cd interview-copilot
npm install
npm start
```

On first launch, open **Settings** (gear icon) and enter your Deepgram key + one answer provider's key. Then:

1. **Upload** a résumé / job description / notes (optional but recommended) into the Knowledge Base.
2. Click **Start Listening** and grant microphone (and, for interviewer audio, Screen Recording) permission.
3. When the interviewer asks something, press **`Ctrl+A`** (or click **Generate Answer**).

## Build a standalone app

```bash
# Quick local .app (Electron Packager) — macOS
npm run package && npm run sign

# Installers (electron-builder): dmg / nsis / AppImage
npm run dist          # current platform
npm run dist:mac      # mac (x64 + arm64)
```

The built app lives in `dist/`. For everyday use, launch the **packaged app** (double-click), not `npm start` from a terminal — on macOS the Screen-Recording permission attaches to the launching process, so a terminal-launched dev build can't reliably capture system audio.

## Platform support

| Platform | Mic (candidate) | System audio (interviewer) |
|---|---|---|
| macOS 13+ | ✅ | ✅ via Screen-Capture loopback (grant Screen Recording) |
| Windows | ✅ | ⚠️ untested — `getDisplayMedia` system audio differs; PRs welcome |
| Linux | ✅ | ⚠️ untested; PRs welcome |

**No-permission alternative (any OS):** install a virtual audio device ([BlackHole](https://github.com/ExistentialAudio/BlackHole) on macOS, [VB-Cable](https://vb-audio.com/Cable/) on Windows), route the meeting app's output to it, and pick it under **Interviewer audio**.

## Architecture

```
src/
  main/                 Electron main process (Node)
    main.js             window, global hotkey, IPC, generation orchestration
    preload.js          contextBridge — safe renderer API
    settings.js         persisted settings (userData/settings.json)
    config.js           provider registry (models, base URLs, fallbacks)
    prompt.js           prompt builders (answer + question extraction) — pure, tested
    llm.js              provider-agnostic retry + fallback
    gemini.js           Gemini REST (SSE)
    openaiCompat.js     OpenAI-compatible client (DeepSeek / OpenAI / Ollama)
    store.js            knowledge base (context stuffing)
    documents.js        txt/md/pdf/docx parsing + chunking
  renderer/             UI (no Node access)
    index.html / styles.css / app.js
    deepgram.js         Deepgram live WebSocket client
    pcm-worklet.js      Float32 → 16-bit PCM AudioWorklet
test/                   node:test unit tests
```

Key design notes:
- **Deepgram** runs in the renderer via a browser WebSocket using subprotocol token auth (`['token', key]`) — no SDK/bundler. See [SECURITY.md](SECURITY.md) for the trade-off.
- **Answer providers** run in the main process via REST/SSE — no third-party AI SDKs.
- Question detection uses only the latest turns; the answer is grounded in the broader recent history.

## Roadmap

- [ ] Local STT (Whisper) for a fully offline pipeline
- [ ] Windows/Linux system-audio capture
- [ ] Optional vector RAG for large knowledge bases
- [ ] Auto-trigger on detected question end
- [ ] Answer history & export, i18n UI, custom icon

## Contributing

PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Security issues: see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)

---

## 中文

基于 **Deepgram**（实时转写）+ **DeepSeek / Gemini / OpenAI / Ollama**（答案生成）的桌面应用：双声道识别（麦克风=面试者、系统声音=面试官），按 `Ctrl+A` 自动识别面试官当前的问题，并结合最近约 15 轮对话 + 你上传的资料，生成简洁的第一人称大纲式答案（默认 ≤500 字）。

**⚠️ 免责声明**：本工具用于**面试练习、复盘、模拟面试与无障碍辅助**。在**真实面试**中未经对方知情使用实时答题，可能违反对方公司政策、协议、学术诚信规则或当地法律，且通常被视为不诚信行为。**如何使用、是否合规由你自行负责**，作者不为此背书，软件按「现状」提供、不附带任何担保。

**🔐 隐私**：音频会发送到 Deepgram 转写；转写文本、问题与资料会发送到你选择的答案 Provider；API Key 仅保存在本机 `userData/settings.json`，不入库、不上传。想完全本地：把 Provider 选成 **Ollama**。

运行：`npm install && npm start`，首次在「设置」里填 Deepgram Key + 任一答案 Provider Key。打包：`npm run dist`。日常使用请用打包后的 App（双击），不要从终端 `npm start`（否则 macOS 屏幕录制权限会算到终端头上）。
