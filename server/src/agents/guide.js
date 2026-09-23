'use strict';
/**
 * Agent 2 —— 景点-非遗历史讲解 Agent
 * 职责：输入景点名称，检索本地知识库，输出"景点本身历史 + 关联非遗项目/民俗"
 * 两层内容，口语化、适合现场阅读。知识库未收录时才求助 LLM 并明示来源局限。
 */
const db = require('../data/heritage');
const llm = require('./llm');

function normName(s) {
  return String(s || '').trim().replace(/景区|风景区|古城|旅游区/g, '');
}

function searchAttraction(city, name) {
  const q = normName(name);
  if (!q) return null;
  return (
    city.attractions.find((a) => a.name === q) ||
    city.attractions.find((a) => a.name.includes(q) || q.includes(a.name.split('（')[0])) ||
    null
  );
}

function guide(cityId, attractionName) {
  const city = db.cities[cityId];
  if (!city) return Promise.reject(Object.assign(new Error('暂不支持该目的地'), { statusCode: 400, code: 'BAD_REQUEST' }));

  const a = searchAttraction(city, attractionName);
  if (!a) {
    // 本地未收录：LLM 兜底（若有），并明示"非本地知识库内容"
    return llm.chat([
      { role: 'system', content: '你是文旅讲解员。注意：本地知识库未收录该景点，回答需保持通用准确，100字内说明你无法提供该景点与非遗的权威关联讲解，建议用户参考景区官方介绍。不要编造具体年代与史实。' },
      { role: 'user', content: '游客在' + city.name + '询问景点：' + attractionName }
    ], { temperature: 0.5, maxTokens: 200 }).then((text) => ({
      found: false,
      city: city.name,
      attraction: attractionName,
      message: '本地知识库暂未收录「' + attractionName + '」的权威资料，为避免误导不作详细介绍。',
      llmNote: text || null
    }));
  }

  const linked = (a.heritageRefs || [])
    .map((id) => city.heritages.find((h) => h.id === id))
    .filter(Boolean);

  const localAnswer = {
    found: true,
    city: city.name,
    attraction: { name: a.name, type: a.type, area: a.area, suggestedDuration: a.durationMin },
    history: a.desc,
    heritage: linked.map((h) => ({
      name: h.name,
      category: h.category,
      level: h.level,
      story: h.summary,
      experienceSpots: h.experienceSpots
    })),
    customs: city.customs.map((c) => c.name)
  };

  if (!linked.length) {
    return Promise.resolve(localAnswer);
  }

  // LLM 润色口语化串联（基于知识库事实，不引入新事实）
  return llm.chat([
    { role: 'system', content: '你是景点现场讲解员。请基于我提供的事实材料，用口语化的中文写一段150-250字的现场讲解，串联景点历史与关联非遗。只能使用材料中的事实，不得添加新材料中的年代、人物、数字。' },
    { role: 'user', content: '景点：' + a.name + '\n历史材料：' + a.desc + '\n关联非遗：' + linked.map((h) => h.name + '（' + h.level + '）——' + h.summary).join('\n') }
  ], { temperature: 0.7, maxTokens: 500 }).then((polished) => {
    if (polished) localAnswer.narration = polished;
    return localAnswer;
  });
}

module.exports = { guide };
