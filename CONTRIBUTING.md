# Contributing

Thanks for your interest in improving Real Time Interview Copilot!

## Development setup

```bash
npm install
npm start          # run the app (dev)
npm test           # run unit tests (node:test)
npm run lint       # ESLint
npm run format     # Prettier (write)
```

Use the Node version in [`.nvmrc`](.nvmrc) (`nvm use`). Node ≥ 18 is required.

## Project layout

See the [Architecture](README.md#architecture) section. In short:

- `src/main/` — Electron main process (Node). Pure logic that's worth testing lives in `prompt.js`, `llm.js`, `documents.js`, `store.js`, `config.js`.
- `src/renderer/` — UI (browser context, no Node).
- `test/` — `node:test` unit tests for the pure modules.

## Guidelines

- Keep secrets out of the repo. API keys live in `userData/settings.json` only.
- Prefer the existing provider abstraction: new LLM providers should plug into `config.js` + `openaiCompat.js` (for OpenAI-compatible APIs) or a small dedicated client like `gemini.js`.
- Match the surrounding style; run `npm run lint && npm run format` before committing.
- Add/extend tests for any pure logic you change.
- Conventional, descriptive commit messages are appreciated.

## Adding an OpenAI-compatible provider

Most providers (DeepSeek, OpenAI, Ollama, Together, Groq, …) speak the OpenAI Chat Completions format. To add one, add an entry to `PROVIDERS` in `src/main/config.js` with its `baseURL`, `defaultModel`, and `fallbacks` — the shared `openaiCompat.js` client handles the rest. Then surface its key/model fields in the settings UI.

## Reporting bugs / requesting features

Open an issue using the templates. For security reports, see [SECURITY.md](SECURITY.md).
