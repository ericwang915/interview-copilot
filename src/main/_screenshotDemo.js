'use strict';

// 仅用于生成 README 截图：返回一段注入渲染进程的 JS，填充演示对话/问题/答案。
function demoJs() {
  const sparkle =
    '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"/></svg>';
  const badge = `<div class="badge">${sparkle} Question detected</div>`;
  const square =
    '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>';

  const iv = (ts, text, extra = '') =>
    `<div class="msg interviewer"><div class="avatar">IV</div><div class="msg-main"><div class="msg-meta"><span class="who">Interviewer</span> <span class="ts">${ts}</span></div><div class="bubble">${text}</div>${extra}</div></div>`;
  const you = (ts, text) =>
    `<div class="msg you"><div class="msg-main"><div class="msg-meta"><span class="ts">${ts}</span> <span class="who">You</span></div><div class="bubble">${text}</div></div><div class="avatar you-av">YOU</div></div>`;

  const transcript = [
    '<div class="day-sep">Today · 10:24 AM</div>',
    iv(
      '00:08',
      "Thanks for joining. To start — can you walk me through your background and what you're working on right now?",
    ),
    you(
      '00:21',
      "Of course. I'm a backend engineer with about five years on distributed systems — most recently leading the payments platform team at a fintech scale-up.",
    ),
    iv(
      '00:39',
      'Great. Tell me about a time you improved the performance of a slow system. What was the impact?',
      badge,
    ),
  ].join('');

  const question =
    'Tell me about a time you improved the performance of a slow system, and the impact.';

  const answer = [
    'Reduced payment confirmation latency 40% by fixing a settlement-pipeline bottleneck.',
    '- Profiled it: a synchronous DB write in the hot path caused backpressure; moved it to an async Kafka consumer.',
    '- Team was wary of eventual consistency for payments — ran a 5% canary with zero reconciliation errors.',
    '- Result: P99 latency 2.3s → 1.4s, and checkout conversion went up.',
  ].join('\n');

  const counter = `${[...answer].length} / 500 chars`;

  return `(function () {
    var $ = function (id) { return document.getElementById(id); };
    $('statusText').textContent = 'Listening';
    $('statusDot').classList.add('live');
    $('transcript').innerHTML = ${JSON.stringify(transcript)};
    $('liveIndicator').classList.add('hidden');
    $('questionBox').value = ${JSON.stringify(question)};
    $('answer').textContent = ${JSON.stringify(answer)};
    $('charCounter').textContent = ${JSON.stringify(counter)};
    var m = $('micSelect'); if (m) m.innerHTML = '<option>Default — Internal Microphone</option>';
    var b = $('toggleBtn');
    b.classList.remove('primary');
    b.classList.add('danger');
    var sv = b.querySelector('svg'); if (sv) sv.outerHTML = ${JSON.stringify(square)};
    var l = b.querySelector('.label'); if (l) l.textContent = 'Stop Listening';
  })();`;
}

module.exports = { demoJs };
