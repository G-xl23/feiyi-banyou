'use strict';
/**
 * Agent 5 —— AIGC 文创生成 Agent
 * 职责：基于选中的非遗项目生成①非遗趣味小故事 ②文旅宣传文案 ③文创产品构思。
 * 有 LLM 时用提示词工程生成；无 LLM 时用原创模板引擎从知识库事实生成，
 * 保证输出始终"有据可依"。
 */
const db = require('../data/heritage');
const llm = require('./llm');

const TASK_META = {
  story: { label: '非遗小故事', sys: '你是非遗科普作家，写一篇300字左右、面向大众的趣味小故事，语言生动，开头设悬念；只允许使用给定事实，不得虚构史实细节。' },
  copy: { label: '朋友圈宣传文案', sys: '你是文旅新媒体小编，写一条180字左右的种草文案，含2-3个emoji、1个话题标签；基于给定事实，不得编造。' },
  product: { label: '文创产品构思', sys: '你是文创产品设计师，基于给定非遗项目的核心视觉与工艺元素，给出3个文创产品构思（如书签、帆布包、摆件），每个含名称+设计说明+文化寓意，共400字内。' }
};

function findHeritage(city, name) {
  if (!name) return null;
  const q = String(name).trim();
  return (
    city.heritages.find((h) => h.name === q) ||
    city.heritages.find((h) => h.aliases.some((a) => q.includes(a) || a.includes(q))) ||
    city.heritages.find((h) => q.includes(h.name)) ||
    null
  );
}

// —— 原创离线模板引擎：把知识库事实"故事化/文案化" ——
function templateStory(h, city) {
  const spot = h.experienceSpots[0];
  return '如果一件手艺能穿越千年来到你面前，' + h.name + '一定排在队伍最前面。\n\n' +
    h.summary.replace(/。$/, '') + '。在' + city.name + '，它不是博物馆玻璃柜里的标本，而是仍在街头巷尾上演的日常。\n\n' +
    (spot ? '想亲手触摸这份传承？去「' + spot.name + '」看看（' + spot.address + '），' + spot.openTime + '。当你亲眼见到的那一刻，就会明白为什么一代代人愿意把这门' + h.category + '守到今天。\n\n' : '') +
    '——本文由系统基于知识库事实模板生成，可配合大模型生成更生动的版本。';
}

function templateCopy(h, city) {
  const spot = h.experienceSpots[0];
  return '✨来' + city.name + '，别错过「' + h.name + '」！\n' +
    h.level + '，' + h.summary.slice(0, Math.min(60, h.summary.length)).replace(/。$/, '') + '……\n' +
    (spot ? '📍打卡点：' + spot.name + '\n' : '') +
    '亲手体验过才知道，非遗离我们一点都不远。\n' +
    '#' + city.name + '非遗之旅 #' + h.name;
}

function templateProduct(h) {
  const visual = (h.aliases && h.aliases[0]) || h.name;
  return '基于「' + h.name + '」的3个文创构思：\n\n' +
    '1.【' + visual + '主题金属书签】\n设计说明：提炼' + h.name + '最具辨识度的纹样元素做镂空金属书签，配流苏。文化寓意：让"翻书"成为与非遗对话的仪式。\n\n' +
    '2.【' + visual + '帆布包】\n设计说明：以单色线描呈现' + h.name + '的经典造型，留白式构图，附一句' + h.level + '小字注解。文化寓意：行走的非遗科普展板。\n\n' +
    '3.【' + visual + '迷你摆件/冰箱贴】\n设计说明：将' + h.name + '代表形象Q版化，用树脂或陶瓷材质还原工艺质感。文化寓意：把体验带回家，让记忆有个实物落点。';
}

function generate(cityId, type, heritageName) {
  const city = db.cities[cityId];
  if (!city) return Promise.reject(Object.assign(new Error('暂不支持该目的地'), { statusCode: 400, code: 'BAD_REQUEST' }));
  const task = TASK_META[type];
  if (!task) return Promise.reject(Object.assign(new Error('生成类型必须是 story / copy / product'), { statusCode: 400, code: 'BAD_REQUEST' }));

  const h = findHeritage(city, heritageName);
  if (!h) {
    return Promise.reject(Object.assign(new Error('请从知识库中选择一个非遗项目（如：' + city.heritages.slice(0, 3).map((x) => x.name).join('、') + '）'), { statusCode: 400, code: 'BAD_REQUEST' }));
  }

  const fallback = {
    story: templateStory(h, city),
    copy: templateCopy(h, city),
    product: templateProduct(h)
  }[type];

  return llm.chat([
    { role: 'system', content: task.sys },
    { role: 'user', content: '非遗项目：' + h.name + '（' + h.category + ' · ' + h.level + '）\n事实材料：' + h.summary + '\n体验地点：' + h.experienceSpots.map((s) => s.name).join('、') }
  ], { temperature: 0.9, maxTokens: 800 }).then((text) => ({
    city: city.name,
    heritage: h.name,
    type,
    typeLabel: task.label,
    content: text || fallback,
    generator: text ? '大模型AIGC生成（基于知识库事实约束）' : '本地模板引擎生成（离线模式，基于知识库事实）'
  }));
}

module.exports = { generate };
