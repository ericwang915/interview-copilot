'use strict';

// 纯函数：构造作答 / 问题提取的提示词。无 Electron 依赖，便于单测。

function buildPrompt({ question, transcript, context, answerLanguage, maxChars, profile }) {
  const langRule =
    answerLanguage === 'zh'
      ? '请用中文作答。'
      : answerLanguage === 'en'
        ? 'Answer in English.'
        : '使用与问题相同的语言作答。';

  const lines = [
    '你是正在参加面试的候选人本人。下面会给出面试现场的对话片段 / 问题，以及可能相关的个人资料/知识库内容。',
    '请用第一人称、专业且自然的口吻，像在面试现场【口头作答】一样直接回答问题。',
    '要求：',
    `1) 严格控制在 ${maxChars} 字符以内（硬性上限），目标约 300 字、宁可更短。【大纲式，不要整段散文】：第一行一句话给结论/判断；随后 2-3 个以“- ”开头的精炼要点（关键词、工具、数字、取舍），能用词组就别用整句。`,
    '2) 纯文本输出，禁止使用 Markdown 加粗/星号(**)、井号(#)、表格等标记（界面不渲染 Markdown，会显示成乱码）；删掉所有铺垫和客套；',
    '3) 直接开口作答，不要复述问题、不要写“我的回答”之类的标题、不要出现“根据资料/上文”之类措辞；',
    '4) 若资料中有相关信息务必优先采用并保持事实准确，资料无关则用你的专业知识作答；',
    '5) 给到的对话是实时语音识别结果，可能有重复、串音、口误、错别字——请自行容错，判断面试官【当前最可能在问的核心问题】，只回答这个问题；',
    `6) ${langRule}`,
  ];
  if (profile && profile.trim()) {
    lines.push(
      '',
      '================ 本次面试背景与作答风格（最高优先级，务必遵循） ================',
      profile.trim(),
    );
  }
  const systemInstruction = lines.join('\n');

  const parts = [];
  if (context) parts.push(`【可参考的个人资料 / 知识库】\n${context}\n`);

  const q = (question || '').trim();
  if (q) {
    if (transcript) {
      parts.push(
        `【最近约15轮面试对话历史（语音识别，可能有重复/错误，仅供你理解上下文、保持连贯）】\n${transcript}\n`,
      );
    }
    parts.push(`【需要回答的问题】\n${q}`);
    parts.push('请结合上面的对话上下文直接作答。');
    parts.push('\n请直接给出你的回答：');
  } else {
    parts.push(
      `【最近约15轮面试对话历史（语音识别，可能有重复/串音/口误）】\n${transcript || '(暂无对话)'}\n`,
    );
    parts.push(
      '请在心里判断面试官【最新/当前】正在问的核心问题，然后【直接作答】；较早的轮次只作为背景上下文，用来让回答更贴合、连贯，不要去回答更早的旧问题。',
    );
    parts.push(
      '严禁任何前缀或复述，例如不得出现“The core question is…”“面试官在问…”“你的问题是…”，第一句话就是你的回答本身。',
    );
    parts.push('\n你的回答：');
  }

  return { systemInstruction, userText: parts.join('\n') };
}

// 问题提取（只看最近几轮）
const EXTRACTION_SYSTEM =
  "You clean up noisy live interview transcripts. The transcript may contain repeats, cross-talk, ASR errors and half-sentences. Identify the interviewer's CURRENT core question and rewrite it as ONE clean, complete question. Output ONLY that question — no prefix, no quotes, no explanation. Write it in the SAME language the interviewer is speaking.";

function buildExtractionUser(recentTranscript) {
  return `Recent turns:\n${recentTranscript}\n\nThe interviewer's current core question is:`;
}

module.exports = { buildPrompt, EXTRACTION_SYSTEM, buildExtractionUser };
