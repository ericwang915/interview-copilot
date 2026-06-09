# Launch copy

Ready-to-post drafts for sharing Real Time Interview Copilot. **You** post these from your
own accounts — they're framed honestly around interview **practice, mock
interviews, and accessibility**, which is both the right framing and the one
least likely to attract "this is cheating" pile-ons.

Repo: https://github.com/ericwang915/interview-copilot

---

## Hacker News (Show HN)

**Title**

```
Show HN: Real Time Interview Copilot – local desktop app that transcribes and drafts interview answers
```

**Body**

```
I built an Electron app to practice for technical interviews. It listens to a
conversation, separates my mic (me) from system audio (the interviewer) via
Deepgram, and on a hotkey (or automatically) detects the current question and
drafts a concise, first-person answer with an LLM — grounded in the last ~15
turns plus a résumé/JD I upload.

Some details that might interest folks here:
- Dual-channel STT: two Deepgram live WebSockets, browser-native (subprotocol
  token auth, no SDK/bundler).
- Provider-agnostic answering: DeepSeek / Gemini / OpenAI, or fully local via
  Ollama. One OpenAI-compatible client + a tiny provider registry; retry +
  fallback in a shared layer.
- Question detection uses only the latest turns; the answer is grounded in the
  broader recent history + your documents.
- Keys live only in userData; renderer has a CSP and talks to nobody but
  Deepgram. Choosing Ollama keeps everything on-device.

It's MIT-licensed. I use it for mock interviews and to review my own answers
afterward. Honest note in the README about not using real-time generation in a
live interview without disclosure — that's on you and your local rules.

Tech: Electron, Node, Deepgram, DeepSeek/Gemini/OpenAI/Ollama. macOS today;
Windows/Linux PRs welcome (system-audio capture differs).

Repo (demo GIF in the README): https://github.com/ericwang915/interview-copilot
Feedback very welcome — especially on the question-detection heuristics.
```

---

## Reddit — r/SideProject, r/macapps, r/LocalLLaMA (tweak per sub)

**Title**

```
I built a local interview-practice copilot: live transcription + LLM answers (DeepSeek/Gemini/OpenAI/Ollama), open source
```

**Body**

```
Open-sourced a side project I've been using to prep for interviews.

What it does: a single-window macOS app listens to a mock interview, transcribes
both sides (you on the mic, interviewer on system audio) with Deepgram, and on a
hotkey detects the question and drafts a tight, outline-style answer — using the
recent conversation + a résumé/JD you upload as context.

Why it might be interesting:
- Switchable LLM provider, including **local Ollama** (no cloud, no keys).
- Auto-answer mode (debounce + question heuristic), or press Ctrl+A.
- Persistent Knowledge Base + Job Description so answers fit the target role.
- Clean Electron architecture, 23 unit tests, CI, MIT.

Demo GIF + downloads in the repo: https://github.com/ericwang915/interview-copilot

Built for practice / mock interviews / reviewing your own answers — the README
is upfront about responsible use. Would love feedback on the UX and the
question-detection logic.
```

> r/LocalLLaMA angle: lead with **Ollama / fully-local** and the provider
> abstraction. r/macapps angle: lead with the **native UI + one dmg download**.

---

## Product Hunt

**Tagline (60 chars)**

```
Practice interviews with a local AI that hears and answers
```

**Description**

```
Real Time Interview Copilot is an open-source desktop app for interview practice. It
transcribes both sides of a mock interview in real time (Deepgram), detects the
current question, and drafts a concise, first-person answer with the LLM of your
choice — DeepSeek, Gemini, OpenAI, or fully local Ollama — grounded in the recent
conversation plus your résumé and the job description. Press a hotkey or let it
auto-answer. Your keys and documents stay on your machine. MIT-licensed.
```

**First comment**

```
Maker here 👋 I built this to run mock interviews and review my own answers
afterward. A few things I'm proud of: dual-channel transcription, a provider
abstraction that includes local Ollama (zero cloud), and a persistent JD so
answers are tailored to the role. It's MIT and the README is honest about
responsible use. Happy to answer anything about the architecture!
```

---

## X / Twitter (thread)

```
1/ Open-sourced Real Time Interview Copilot — a local desktop app for interview practice.

It hears the question (your mic + system audio, via Deepgram) and drafts your
answer with the LLM you pick. Demo 👇  [attach demo.gif]
https://github.com/ericwang915/interview-copilot

2/ Pick your brain:
DeepSeek · Gemini · OpenAI · or fully-local Ollama.
One OpenAI-compatible client + a provider registry, with retry + fallback.

3/ It detects the *current* question from the latest turns, then grounds the
answer in the last ~15 turns + a résumé/JD you upload. Auto-answer mode or a
hotkey. Keys never leave your machine.

4/ Electron + Node, 23 tests, CI, MIT. macOS today; Win/Linux PRs welcome.
If it's useful, a ⭐ helps a lot 🙏
```

---

## Tips

- Lead with the **demo GIF** everywhere — it converts far better than text.
- Post HN/PH **Tue–Thu, ~8–10am ET**; reply to every early comment fast.
- Keep the ethical framing visible; it builds trust and pre-empts the obvious
  objection.
- Pin a "Roadmap / help wanted" issue so drive-by visitors have a way to engage.
