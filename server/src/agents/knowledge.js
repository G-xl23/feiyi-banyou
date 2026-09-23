'use strict';
/**
 * Agent 4 —— 非遗知识库 Agent（核心）
 * 职责：管理本地非遗项目数据，回答自然语言咨询。
 * 抑制幻觉机制（原创）：
 *   1) 检索优先：先对问题做关键词/别名匹配打分，命中知识库则严格取用库内字段作答；
 *   2) 答非所问控制：按问题意图（地点/时间/传承人/简介）选择性组卷；
 *   3) 未命中时不臆造：无 LLM 时明确告知未收录；有 LLM 时仅允许基于库内上下文作答。
 */
const db = require('../data/heritage');
const llm = require('./llm');

// 意图识别词表（原创规则）
const INTENT_WORDS = {
  location: ['哪里', '在哪', '地址', '地点', '体验', '工坊', '参观', '看', '玩', '预约'],
  time: ['时间', '开放', '几点', '关门', '营业', '排期', '场次'],
  master: ['传承人', '大师', '谁'],
  category: ['类别', '分类', '属于什么'],
  level: ['级别', '等级', '名录', '国家级', '省级', '人类非遗']
};

function listHeritages(cityId) {
  const city = db.cities[cityId];
  if (!city) return [];
  return city.heritages.map((h) => ({
    id: h.id, name: h.name, category: h.category, level: h.level,
    brief: h.summary.slice(0, 60) + '……'
  }));
}

function scoreHeritage(city, q) {
  const best = { h: null, score: 0 };
  for (const h of city.heritages) {
    let s = 0;
    if (q.includes(h.name)) s += 10;
    for (const alias of h.aliases || []) {
      if (q.includes(alias)) s += 8;
    }
    if (q.includes(h.category)) s += 3;
    best.score < s && (best.h = h, best.score = s);
  }
  return best;
}

function detectIntents(q) {
  const intents = [];
  for (const [intent, words] of Object.entries(INTENT_WORDS)) {
    if (words.some((w) => q.includes(w))) intents.push(intent);
  }
  return intents.length ? intents : ['summary'];
}

function composeFromKB(city, h, intents, question) {
  const parts = [];
  parts.push('【' + h.name + '】（' + h.category + ' · ' + h.level + '）');
  if (intents.includes('summary') || intents.includes('category') || intents.includes('level')) {
    parts.push(h.summary);
  }
  if (intents.includes('master')) {
    parts.push('代表性传承人：' + h.masters.map((m) => m.name + (m.title ? '（' + m.title + '）' : '')).join('、') + '。注：传承人名录以中国非物质文化遗产网官方公布为准。');
  }
  if (intents.includes('location') || intents.includes('time')) {
    if (h.experienceSpots && h.experienceSpots.length) {
      parts.push('体验点位：');
      h.experienceSpots.forEach((s) => {
        parts.push('· ' + s.name + '｜' + s.address + '｜开放情况：' + s.openTime);
      });
    } else {
      parts.push('该项目的固定开放体验点位暂未收录，建议咨询当地文旅部门。');
    }
  }
  parts.push('（以上内容整理自中国非物质文化遗产网及地方文旅部门公开资料，见项目《非遗数据来源说明》。）');
  return parts.join('\n');
}

function query(cityId, question) {
  const city = db.cities[cityId];
  if (!city) return Promise.reject(Object.assign(new Error('暂不支持该目的地'), { statusCode: 400, code: 'BAD_REQUEST' }));
  const q = String(question || '').trim();
  if (!q) return Promise.reject(Object.assign(new Error('问题不能为空'), { statusCode: 400, code: 'BAD_REQUEST' }));

  const { h, score } = scoreHeritage(city, q);

  if (h && score >= 8) {
    const intents = detectIntents(q);
    const answer = composeFromKB(city, h, intents, q);
    return Promise.resolve({
      source: 'knowledge-base',
      city: city.name,
      matched: { id: h.id, name: h.name },
      answer,
      related: city.heritages.filter((x) => x.id !== h.id && x.category === h.category).slice(0, 3).map((x) => x.name)
    });
  }

  // 未命中知识库 → LLM 受限作答（仅基于全部库内上下文）或明确拒答
  const kbContext = city.heritages.map((x) => x.name + '：' + x.summary).join('\n');
  return llm.chat([
    { role: 'system', content: '你是非遗咨询助手。只能依据下面提供的本地知识库内容回答；知识库没有的信息一律回答"本地知识库暂未收录，建议查询中国非物质文化遗产网(www.ihchina.cn)"。不要编造。' },
    { role: 'user', content: '本地知识库：\n' + kbContext + '\n\n用户问题：' + q }
  ], { temperature: 0.4, maxTokens: 400 }).then((text) => ({
    source: text ? 'llm-with-kb-context' : 'none',
    city: city.name,
    matched: null,
    answer: text || ('本地知识库暂未收录与「' + q + '」直接对应的资料。目前知识库覆盖：' + city.heritages.map((x) => x.name).join('、') + '。你可以任选一项继续提问。'),
    related: city.heritages.slice(0, 4).map((x) => x.name)
  }));
}

module.exports = { query, listHeritages };
