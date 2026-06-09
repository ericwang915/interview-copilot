# Changelog

All notable changes to this project are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- **Windows & Linux support for running**: npm scripts are now cross-platform (`cross-env`), so `npm start` works on Windows (previously the `VAR=` prefix broke cmd). `make run` adapts to the OS — macOS builds & opens the signed app; Windows/Linux launch via `npm start`. Prebuilt `.exe` (Windows) and `.AppImage` (Linux) ship in Releases.

### Fixed
- System-audio capture without Screen Recording permission now fails quietly with a clear prompt instead of throwing `Failed to get sources` / `Video was requested…` unhandled rejections. When the permission is already denied, the app skips the capture attempt and guides you to grant it (continuing mic-only).

### Changed
- Renamed the app (display name) to **Real Time Interview Copilot**. The npm package, bundle id (`com.interview.copilot`), repo slug, and local data directory are unchanged, so existing settings/keys/JD/Knowledge Base are preserved.

### Added
- **App icon**: a native-style macOS icon (rust squircle + microphone), generated from `build/icon.svg` via `npm run icon` and applied to packaged builds and the dev dock.
- **Auto-answer mode**: an optional toggle that detects when the interviewer finishes a question (pause debounce + question heuristic) and generates the answer automatically — no hotkey needed.
- **Persistent Knowledge Base**: uploaded/pasted documents are now saved to `userData/knowledge.json` and reloaded on launch; add / remove / update / clear all persist. (Previously in-memory only.)
- **Job-description customization**: paste or upload a JD (txt/md/pdf/docx) in Settings; it's persisted and injected into every answer so responses are tailored to the target role.
- Open-source hardening: LICENSE (MIT), bilingual README with disclaimer & privacy notes, CONTRIBUTING, SECURITY, issue/PR templates.
- Multi-provider answer generation: **OpenAI** and **Ollama** (local) in addition to DeepSeek and Gemini, via a shared OpenAI-compatible client and a provider registry (`config.js`).
- Unit tests (`node:test`) for prompt building, provider fallback/retry, document chunking, knowledge store, and SSE parsing.
- ESLint (flat config) + Prettier.
- `electron-builder` packaging (dmg / nsis / AppImage, x64 + arm64) and GitHub Actions (CI + release).
- Content-Security-Policy in the renderer.
- `.nvmrc`, `engines`, `.env.example`.

### Changed
- Answers are now grounded in the last ~15 turns of dialogue, while question detection uses only the latest turns.
- Extracted prompt building into `prompt.js` and the OpenAI-compatible client into `openaiCompat.js` for testability and reuse.

## [1.0.0]
- Initial app: Deepgram dual-channel transcription, Ctrl+A question detection + answer generation, knowledge base, switchable DeepSeek/Gemini providers, outline-style answers, packaged macOS app.
