'use strict';

// 仅用于生成 README 演示 GIF：返回一串“帧步骤”，每步注入一份完整的 DOM 快照 + 停留帧数。
// 时间线：面试官提问(interim→final) → 你回答 → 面试官追问(带 Question detected) →
//        Ctrl+A 回填问题 → 答案逐段流式 → 停在完整答案。

const sparkle =
  '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"/></svg>';
const badge = `<div class="badge">${sparkle} Question detected</div>`;
const square =
  '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>';

const iv = (ts, text, extra = '') =>
  `<div class="msg interviewer"><div class="avatar">IV</div><div class="msg-main"><div class="msg-meta"><span class="who">Interviewer</span> <span class="ts">${ts}</span></div><div class="bubble">${text}</div>${extra}</div></div>`;
const ivInterim = (text) =>
  `<div class="msg interviewer interim"><div class="avatar">IV</div><div class="msg-main"><div class="msg-meta"><span class="who">Interviewer</span> <span class="ts">live</span></div><div class="bubble">${text}</div></div></div>`;
const you = (ts, text) =>
  `<div class="msg you"><div class="msg-main"><div class="msg-meta"><span class="ts">${ts}</span> <span class="who">You</span></div><div class="bubble">${text}</div></div><div class="avatar you-av">YOU</div></div>`;
const youInterim = (text) =>
  `<div class="msg you interim"><div class="msg-main"><div class="msg-meta"><span class="ts">live</span> <span class="who">You</span></div><div class="bubble">${text}</div></div><div class="avatar you-av">YOU</div></div>`;

const DSEP = '<div class="day-sep">Today · 10:24 AM</div>';
const Q1 =
  "Thanks for joining. To start — can you walk me through your background and what you're working on right now?";
const A1 =
  "Of course. I'm a backend engineer with about five years on distributed systems — most recently leading the payments platform team at a fintech scale-up.";
const Q2 =
  'Great. Tell me about a time you improved the performance of a slow system. What was the impact?';
const DETECTED =
  'Tell me about a time you improved the performance of a slow system, and the impact.';
const ANSWER = [
  'Reduced payment confirmation latency 40% by fixing a settlement-pipeline bottleneck.',
  '- Profiled it: a synchronous DB write in the hot path caused backpressure; moved it to an async Kafka consumer.',
  '- Team was wary of eventual consistency for payments — ran a 5% canary with zero reconciliation errors.',
  '- Result: P99 latency 2.3s → 1.4s, and checkout conversion went up.',
].join('\n');

function snap({ transcript, question = '', answer = '', live = false, generating = false }) {
  const counter = `${[...answer].length} / 500 chars`;
  return `(function () {
    var $ = function (i) { return document.getElementById(i); };
    $('statusText').textContent = 'Listening';
    $('statusDot').classList.add('live');
    var m = $('micSelect'); if (m && !m.options.length) m.innerHTML = '<option>Default — Internal Microphone</option>';
    var b = $('toggleBtn'); b.classList.remove('primary'); b.classList.add('danger');
    var sv = b.querySelector('svg'); if (sv) sv.outerHTML = ${JSON.stringify(square)};
    var l = b.querySelector('.label'); if (l) l.textContent = 'Stop Listening';
    $('transcript').innerHTML = ${JSON.stringify(transcript)};
    $('liveIndicator').classList.toggle('hidden', ${!live});
    $('questionBox').value = ${JSON.stringify(question)};
    $('answer').textContent = ${JSON.stringify(answer)};
    $('answer').classList.toggle('generating', ${generating});
    $('charCounter').textContent = ${JSON.stringify(counter)};
    $('transcript').scrollTop = $('transcript').scrollHeight;
    $('answer').scrollTop = $('answer').scrollHeight;
  })();`;
}

function steps() {
  const out = [];
  const T0 = DSEP;
  out.push({ js: snap({ transcript: T0 + ivInterim(Q1), live: true }), hold: 3 });
  out.push({ js: snap({ transcript: T0 + iv('00:08', Q1) }), hold: 3 });

  const T1 = T0 + iv('00:08', Q1);
  out.push({ js: snap({ transcript: T1 + youInterim(A1), live: true }), hold: 2 });
  out.push({ js: snap({ transcript: T1 + you('00:21', A1) }), hold: 3 });

  const T2 = T1 + you('00:21', A1);
  out.push({ js: snap({ transcript: T2 + ivInterim(Q2), live: true }), hold: 3 });
  out.push({ js: snap({ transcript: T2 + iv('00:39', Q2, badge) }), hold: 4 });

  const T3 = T2 + iv('00:39', Q2, badge);
  // Ctrl+A → detected question appears in the box
  out.push({ js: snap({ transcript: T3, question: DETECTED }), hold: 5 });

  // answer streams in
  const words = ANSWER.split(' ');
  const chunks = 9;
  for (let k = 1; k <= chunks; k++) {
    const upto = Math.ceil((words.length * k) / chunks);
    const partial = words.slice(0, upto).join(' ');
    out.push({
      js: snap({ transcript: T3, question: DETECTED, answer: partial, generating: k < chunks }),
      hold: k === chunks ? 12 : 1,
    });
  }
  return out;
}

module.exports = { steps };
