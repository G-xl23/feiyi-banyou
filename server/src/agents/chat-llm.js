'use strict';
/**
 * LLM 对话接管层 —— 让"智能对话"模块由大模型（OpenAI 兼容接口）接管应答。
 *
 * 接管原则（与全系统反幻觉约定一致）：
 *   1) 事实锚定：大模型只能基于"本地知识库 + 带来源的确定性结果"作答；
 *      工作人员侧把规则 Agent 的确定性答案作为事实底稿传入，大模型负责组织成对话；
 *      游客侧把知识库命中条目的全字段（级别/传承人/体验点位）作为事实上下文传入。
 *   2) 显式标注：每条大模型回答附带"生成方式"标注（模型名称+网关），满足大赛对
 *      AI 生成内容标注的要求；`facts` 字段保留确定性原稿，便于核查。
 *   3) 静默降级：任何失败（无配置/超时/网关异常）返回 null，由调度器回落到
 *      原有规则化应答，保证离线模板模式下功能完整。
 */
const llm = require('./llm');
const db = require('../data/heritage');

// 与 knowledge.js 相同的打分逻辑（此处只读复用数据，不改知识库 Agent 行为）
function matchHeritage(city, q) {
  const best = { h: null, score: 0 };
  for (const h of city.heritages) {
    let s = 0;
    if (q.includes(h.name)) s += 10;
    for (const alias of h.aliases || []) {
      if (q.includes(alias)) s += 8;
    }
    if (q.includes(h.category)) s += 3;
    if (best.score < s) { best.h = h; best.score = s; }
  }
  return best;
}

// 游客侧事实上下文：城市概况 + 命中非遗全字段 + 全量清单
function touristContext(cityId, q) {
  const city = db.cities[cityId];
  if (!city) return '';
  const lines = [];
  lines.push('城市：' + city.name + '｜' + (city.tagline || ''));
  if (city.intro) lines.push('城市简介：' + city.intro);

  const hit = matchHeritage(city, q);
  if (hit.h && hit.score >= 5) {
    const h = hit.h;
    lines.push('\n【与问题最相关的非遗条目（可放心引用）】');
    lines.push(h.name + '｜类别：' + h.category + '｜级别：' + h.level);
    lines.push('简介：' + h.summary);
    if (h.masters && h.masters.length) {
      lines.push('代表性传承人：' + h.masters.map((m) => m.name + (m.title ? '（' + m.title + '）' : '')).join('、')
        + '（名录以中国非物质文化遗产网官方公布为准）');
    }
    if (h.experienceSpots && h.experienceSpots.length) {
      lines.push('体验点位：');
      h.experienceSpots.forEach((s) => lines.push('· ' + s.name + '｜' + s.address + '｜开放情况：' + s.openTime));
    }
  }

  lines.push('\n【本地知识库全部非遗清单】');
  lines.push(city.heritages.map((x) => x.name + '（' + x.level + '）').join('、'));
  if (city.attractions && city.attractions.length) {
    lines.push('\n【城市景点】' + city.attractions.map((a) => a.name).join('、'));
  }
  if (city.foods && city.foods.length) {
    lines.push('\n【特色美食】' + city.foods.map((f) => f.name).join('、'));
  }
  if (city.customs && city.customs.length) {
    lines.push('\n【民俗活动】' + city.customs.map((c) => c.name).join('、'));
  }
  lines.push('\n以上为本地知识库参考信息：涉及非遗名录、体验点位与统计数据时以其为准；其余内容可结合你的知识直接回答。');
  return lines.join('\n');
}

/**
 * 大模型对话生成
 * @param {string} q 用户问题
 * @param {object} opts { audience, cityId, county, facts, agentName, baseData }
 *   - facts：工作人员侧的确定性答案原稿（作为事实底稿改写）；游客侧可空（用知识库上下文）
 *   - baseData：需要原样保留的确定性字段（如 revenue/intent/matched），透传给前端
 * @returns {Promise<null|{agent, data}>} 失败返回 null（由调度器降级）
 */
async function compose(q, opts) {
  if (!llm.isAvailable()) return null;
  const options = opts || {};
  try {
    const staff = options.audience === 'staff';
    const grounding = staff && options.facts
      ? '【事实底稿（由本地知识库与可解释指标计算得出，必须严格依据，不得新增任何数字或名录）】\n' + options.facts
      : touristContext(options.cityId, q);
    if (!grounding) return null;

    const system = [
      '你是"非遗伴游"平台的智能对话助手，用简体中文回答文旅与非遗相关问题。',
      staff
        ? '当前服务对象是地方工作人员：回答应面向汇报与决策，结构清晰、数字准确、可直接引用。'
        : '当前服务对象是游客：回答应生动自然，像金牌导游一样口语化、有吸引力。',
      '回答策略（双轨）：',
      '1) 通用问题（地理、历史、交通、玩法建议、行业常识等）直接用你自己的知识回答，不要拿"知识库未收录"当挡箭牌；',
      '2) 涉及【事实】部分已给出的非遗级别、传承人、体验点位、统计数字时，以【事实】为准并原样引用其中的数字，不得改写或自行推算新的统计结论；',
      '3) 【事实】与你的常识冲突时，优先采用【事实】；确实不确定的细节坦承"建议以官方公布为准"，但不要因此拒绝回答整个问题。',
      '回答控制在 400 字以内，可用短段落或要点分条，不要输出 markdown 标题符号。'
    ].join('\n');

    const text = await llm.chat([
      { role: 'system', content: system },
      { role: 'user', content: grounding + '\n\n【用户问题】' + q }
    ], { temperature: 0.6, maxTokens: 800 });
    if (!text) return null;

    const label = llm.modelLabel();
    const base = options.baseData || {};
    return {
      agent: options.agentName || '非遗知识库Agent',
      data: Object.assign({}, base, {
        source: 'llm-takeover',
        answer: text + '\n\n—— 本回答由 ' + label + ' 生成；涉及非遗名录与统计数据时以本地知识库及官方公布为准。',
        generatedBy: label,
        facts: staff ? options.facts || '' : undefined
      })
    };
  } catch (_) {
    return null;
  }
}

module.exports = { compose };
