# Security Policy

## Reporting a vulnerability

Please report security issues privately via GitHub's **"Report a vulnerability"** (Security advisories) on this repository, rather than opening a public issue. We'll acknowledge and respond as soon as we can.

## Where secrets live

- API keys (Deepgram, DeepSeek, Gemini, OpenAI) are stored **only** in the local Electron `userData` directory (`settings.json`). They are never written to the repository and are sent only to their respective provider APIs.
- There are no secrets committed to this repo; CI does not require provider keys.

## Known trade-offs

- **Deepgram key in the renderer.** Live transcription uses a browser `WebSocket` with subprotocol token auth (`['token', <key>]`) directly from the renderer process. This avoids shipping the Deepgram SDK/bundler, but means the key is present in the renderer. For a local single-user desktop app this is an accepted trade-off. A hardening option (proxying the Deepgram stream through the main process) is welcome as a contribution.
- **Renderer hardening.** `contextIsolation` is enabled and `nodeIntegration` is disabled; the renderer talks to the main process only through the `preload.js` `contextBridge`. A `Content-Security-Policy` restricts network egress to the providers the app uses.

## Data handling

See the [Privacy](README.md#-privacy--what-leaves-your-machine) section of the README for exactly what data is sent to which third party. Choosing **Ollama** as the answer provider keeps answer generation fully local.
