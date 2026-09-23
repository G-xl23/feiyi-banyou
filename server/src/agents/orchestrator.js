'use strict';
/**
 * Agent 调度器（Orchestrator）——原创调度逻辑
 * 职责：把用户自然语言输入路由到合适的 Agent，并按需串联多个 Agent
 * （例如讲解 Agent 命中景点后自动补充美食建议），体现多智能体协同。
 *
 * 两种受众（audience）：
 *   tourist（默认）游客侧：行程 / 讲解 / 美食 / 知识库 / 文创 / 看板
 *   staff          工作人员侧：交由政务产业助手 Agent 处理（总结归纳 / 指标 / 对策 / 地区对比）
 *
 * 城市识别完全数据驱动：调用 data/registry.detectCity，新增城市无需改动本文件。
 * analyze() 把"意图识别"拆为纯函数，供 SSE 端点实时推送调度链路。
 */
const planner = require('./planner');
const guide = require('./guide');
const foodAgent = require('./food');
const knowledge = require('./knowledge');
const aigc = require('./aigc');
const industry = require('./industry');
const insight = require('./insight');
const advisor = require('./advisor');
const registry = require('../data/registry');
const db = require('../data/heritage');

const ROUTE_RULES = [
  // 行业特定词优先于宽泛口语词（如"怎么样"），避免"运营数据怎么样"被误路由
  { agent: 'industry', words: ['工坊', '定价', '卖点', '电商', '带货', '经营', '卖货', '赋能'] },
  { agent: 'insight', words: ['看板', '指数', '增收', '测算', '濒危', '预警', '运营数据', '振兴'] },
  { agent: 'guide', words: ['讲解', '介绍', '历史', '怎么玩', '怎么样', '好玩吗'] },
  { agent: 'food', words: ['美食', '小吃', '吃什么', '好吃的', '餐厅', '吃的'] },
  { agent: 'aigc', words: ['故事', '文案', '文创', '朋友圈', '宣传'] },
  { agent: 'plan', words: ['行程', '路线', '规划', '几天', '攻略'] },
  { agent: 'knowledge', words: ['非遗', '技艺', '传承人', '体验'] } // 兜底知识问答放最后
];

const AGENT_NAMES = {
  guide: '景点-非遗讲解Agent',
  food: '美食民俗Agent',
  aigc: 'AIGC文创Agent',
  industry: '乡村产业赋能Agent',
  insight: '乡村振兴运营洞察Agent',
  plan: '旅行规划Agent',
  knowledge: '非遗知识库Agent',
  advisor: advisor.AGENT_NAME
};

// 从问题中抽景点名：遍历全部已收录城市的景点名做包含匹配（数据驱动，新增城市自动生效）
function detectAttraction(q) {
  for (const city of Object.values(db.cities)) {
    for (const a of city.attractions) {
      const short = a.name.split('（')[0];
      if (q.includes(short) || (a.name.includes('（') && q.includes(a.name))) {
        return { cityId: city.id, name: a.name };
      }
    }
  }
  return null;
}

/**
 * 意图分析（纯函数，可独立用于 SSE 链路可视化）
 * @param {string} question
 * @param {string} [audience] 'tourist' | 'staff'
 */
function analyze(question, audience) {
  const q = String(question || '').trim();
  const mode = audience === 'staff' ? 'staff' : 'tourist';
  const attr = detectAttraction(q);
  const mentioned = registry.detectCities(q);
  // 城市优先级：问题里明确提到的 > 景点所属城市 > 默认城市
  const cityId = mentioned[0] || (attr && attr.cityId) || registry.defaultCityId();

  if (mode === 'staff') {
    const intent = advisor.detectIntent(q);
    return {
      question: q,
      audience: mode,
      cityId,
      attraction: attr,
      matchedRule: 'advisor:' + intent,
      agent: 'advisor',
      agentName: AGENT_NAMES.advisor
    };
  }

  let matchedRule = null;
  for (const rule of ROUTE_RULES) {
    if (rule.words.some((w) => q.includes(w))) { matchedRule = rule.agent; break; }
  }
  let agent = matchedRule || 'knowledge';
  if (attr && /介绍|讲解|历史|是什么|怎么|好玩|看看/.test(q)) agent = 'guide';
  return { question: q, audience: mode, cityId, attraction: attr, matchedRule, agent, agentName: AGENT_NAMES[agent] };
}

/**
 * 路由并执行
 * @param {string} question
 * @param {object} [opts] { audience, cityId, county, focus }
 */
function route(question, opts) {
  const options = opts || {};
  const q = String(question || '').trim();
  if (!q) return Promise.reject(Object.assign(new Error('请输入内容'), { statusCode: 400, code: 'BAD_REQUEST' }));

  // 工作人员侧：统一交给政务产业助手（内部再按意图细分）
  if (options.audience === 'staff') {
    return advisor.ask(q, {
      cityId: registry.detectCity(q) || options.cityId,
      county: options.county,
      focus: options.focus
    });
  }

  const info = analyze(q, 'tourist');
  const cityId = info.cityId;

  // 1) 景点名优先：命中即走讲解 Agent（并在答复后附带美食建议 → 多Agent协同）
  if (info.agent === 'guide' && info.attraction) {
    return guide.guide(info.attraction.cityId, info.attraction.name).then((g) => {
      g.followUp = '想尝尝' + g.city + '的味道？可以直接问我"美食推荐"。';
      return { agent: AGENT_NAMES.guide, data: g };
    });
  }

  // 2) 规则路由
  switch (info.matchedRule) {
    case 'plan':
      return Promise.resolve({
        agent: AGENT_NAMES.plan,
        data: { hint: '行程规划建议使用「行程规划」页的结构化表单（目的地/天数/人群/偏好/线路模式，支持城市经典、城乡融合、乡村深度三种模式），或直接告诉我，如："帮泉州两天亲子行程，城乡融合模式，优先非遗体验"。' },
        structuredForm: true
      });
    case 'food':
      return foodAgent.recommend(cityId).then((data) => ({ agent: AGENT_NAMES.food, data }));
    case 'aigc':
      return Promise.resolve({
        agent: AGENT_NAMES.aigc,
        data: { hint: '文创生成请到「AIGC文创」页选择非遗项目与类型（小故事/宣传文案/文创构思）。' },
        structuredForm: true
      });
    case 'industry':
      return Promise.resolve({
        agent: AGENT_NAMES.industry,
        data: { hint: '工坊赋能请到「🌾 乡村产业赋能」页选择具体工坊（如镇湖苏绣工坊集群、凤凰镇单丛茶非遗工坊），一键生成定位、定价、电商文案与短视频脚本。' },
        structuredForm: true
      });
    case 'insight':
      return insight.insight(cityId).then((data) => ({ agent: AGENT_NAMES.insight, data }));
    case 'guide':
      break; // 已在上面处理
    default:
      return knowledge.query(cityId, q).then((data) => ({ agent: AGENT_NAMES.knowledge, data }));
  }

  // 3) 默认走知识库 Agent
  return knowledge.query(cityId, q).then((data) => ({ agent: AGENT_NAMES.knowledge, data }));
}

module.exports = { route, analyze, AGENT_NAMES, detectAttraction };
