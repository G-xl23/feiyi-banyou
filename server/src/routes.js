'use strict';
/**
 * API 路由层：只做请求解析 → 调用服务 → 格式化响应，不写业务逻辑。
 * 城市与地区一律经 data/registry 校验，非法入参统一返回 400（绝不放行到 500）。
 */
const express = require('express');
const db = require('./data/heritage');
const registry = require('./data/registry');
const planner = require('./agents/planner');
const guide = require('./agents/guide');
const foodAgent = require('./agents/food');
const knowledge = require('./agents/knowledge');
const aigc = require('./agents/aigc');
const industry = require('./agents/industry');
const insight = require('./agents/insight');
const advisor = require('./agents/advisor');
const orchestrator = require('./agents/orchestrator');
const llm = require('./agents/llm');

const router = express.Router();

const badRequest = (message) => Object.assign(new Error(message), { statusCode: 400, code: 'BAD_REQUEST' });

// 统一解析城市：缺省用默认城市，非法城市直接 400
function resolveCity(cityId) {
  if (cityId === undefined || cityId === null || cityId === '') return registry.defaultCityId();
  registry.assertCity(cityId);
  return cityId;
}

// 统一解析受众：tourist（默认） | staff
function resolveAudience(v) {
  return v === 'staff' ? 'staff' : 'tourist';
}

router.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'heritage-travel-agents', time: new Date().toISOString() });
});

router.get('/ready', (_req, res) => {
  res.json({
    ok: true,
    knowledgeCities: registry.cityIds(),
    knowledgeCounties: registry.cityIds().reduce((s, id) => s + registry.counties(id).length, 0),
    llmMode: llm.isAvailable() ? 'remote-llm' : 'offline-template',
    agents: ['planner', 'guide', 'food', 'knowledge', 'aigc', 'industry', 'insight', 'advisor'],
    audiences: ['tourist', 'staff']
  });
});

// 目的地元信息（供前端下拉/联动/看板地区选项）
router.get('/cities', (_req, res) => {
  res.json({ ok: true, cities: registry.listCities() });
});

// 地区与数据规模自检（供前端展示与运维排查）
router.get('/regions', (_req, res) => {
  res.json({
    ok: true,
    regions: registry.cityIds().map((id) => ({
      cityId: id,
      cityName: registry.city(id).name,
      counties: registry.counties(id)
    }))
  });
});

// Agent 1：行程规划（mode: city 城市经典 / blend 城乡融合 / rural 乡村深度）
router.post('/plan', (req, res, next) => {
  const { cityId, days, crowd, preferHeritage, mode } = req.body || {};
  if (!cityId) return next(badRequest('cityId 必填'));
  planner.plan({ cityId, days, crowd, preferHeritage, mode })
    .then((data) => res.json({ ok: true, data }))
    .catch(next);
});

// Agent 2：景点-非遗讲解
router.post('/guide', (req, res, next) => {
  const { cityId, attraction } = req.body || {};
  if (!attraction) return next(badRequest('attraction 必填'));
  Promise.resolve()
    .then(() => resolveCity(cityId))
    .then((id) => guide.guide(id, attraction))
    .then((data) => res.json({ ok: true, data }))
    .catch(next);
});

// Agent 3：美食民俗
router.post('/food', (req, res, next) => {
  Promise.resolve()
    .then(() => resolveCity((req.body || {}).cityId))
    .then((id) => foodAgent.recommend(id))
    .then((data) => res.json({ ok: true, data }))
    .catch(next);
});

// 非遗知识库列表
router.get('/heritage/list', (req, res, next) => {
  Promise.resolve()
    .then(() => resolveCity(req.query.cityId))
    .then((id) => res.json({ ok: true, items: knowledge.listHeritages(id) }))
    .catch(next);
});

// Agent 4：非遗知识问答
router.post('/heritage/query', (req, res, next) => {
  const { cityId, question } = req.body || {};
  Promise.resolve()
    .then(() => resolveCity(cityId))
    .then((id) => knowledge.query(id, question))
    .then((data) => res.json({ ok: true, data }))
    .catch(next);
});

// Agent 5：AIGC 文创生成
router.post('/aigc', (req, res, next) => {
  const { cityId, type, heritage } = req.body || {};
  Promise.resolve()
    .then(() => resolveCity(cityId))
    .then((id) => aigc.generate(id, type, heritage))
    .then((data) => res.json({ ok: true, data }))
    .catch(next);
});

// Agent 6：乡村产业赋能
router.get('/rural/workshops', (req, res, next) => {
  Promise.resolve()
    .then(() => resolveCity(req.query.cityId))
    .then((id) => res.json({ ok: true, workshops: industry.listWorkshops(id) }))
    .catch(next);
});

router.post('/rural/empower', (req, res, next) => {
  const { cityId, workshopId } = req.body || {};
  if (!workshopId) return next(badRequest('workshopId 必填'));
  Promise.resolve()
    .then(() => resolveCity(cityId))
    .then((id) => industry.empower(id, workshopId))
    .then((data) => res.json({ ok: true, data }))
    .catch(next);
});

// Agent 7：乡村振兴运营洞察（county 可选，用于区县级下钻；params 为增收测算可选参数）
function handleInsight(req, res, next) {
  const src = req.method === 'GET' ? req.query : (req.body || {});
  const cityId = src.cityId;
  const county = src.county || '';
  const params = src.params;
  Promise.resolve()
    .then(() => resolveCity(cityId))
    .then((id) => {
      if (params && params.visitors != null) {
        const revenue = insight.revenueModel(id, params, county);
        return insight.insight(id, { county }).then((full) => {
          full.revenue = revenue;
          return full;
        });
      }
      return insight.insight(id, { county });
    })
    .then((data) => res.json({ ok: true, data }))
    .catch(next);
}
router.post('/insight', handleInsight);
router.get('/insight', handleInsight);

// 自然语言对话（调度器路由）：tourist 走调度器，staff 走政务产业助手
router.post('/chat', (req, res, next) => {
  const body = req.body || {};
  orchestrator.route(body.message, {
    audience: resolveAudience(body.audience),
    cityId: body.cityId,
    county: body.county,
    focus: body.focus
  })
    .then((data) => res.json({ ok: true, data }))
    .catch(next);
});

// Agent 8：政务产业助手（工作人员侧对话体）——定向问答
router.post('/advisor/ask', (req, res, next) => {
  const body = req.body || {};
  orchestrator.route(body.message, {
    audience: 'staff',
    cityId: body.cityId,
    county: body.county,
    focus: body.focus
  })
    .then((data) => res.json({ ok: true, data }))
    .catch(next);
});

// Agent 8：归纳总结（可直接产出汇报材料文本）
router.post('/advisor/summary', (req, res, next) => {
  const body = req.body || {};
  Promise.resolve()
    .then(() => {
      const cityId = resolveCity(body.cityId);
      return advisor.summarize({ cityId, county: body.county || '', focus: body.focus || '' });
    })
    .then((data) => res.json({ ok: true, data }))
    .catch(next);
});

/**
 * SSE：多智能体协作链路实时推送（前端可视化"调度 → 意图识别 → Agent处理 → 结果"）
 * 同一套实现同时服务游客侧与工作人员侧，通过 audience 区分。
 */
function streamHandler(req, res) {
  const message = String(req.query.message || '').trim();
  if (!message) {
    res.status(400).json({ ok: false, code: 'BAD_REQUEST', message: 'message 必填' });
    return;
  }
  const audience = resolveAudience(req.query.audience);
  const opts = {
    audience,
    cityId: req.query.cityId,
    county: req.query.county || '',
    focus: req.query.focus || ''
  };

  let info;
  try {
    info = orchestrator.analyze(message, audience);
  } catch (err) {
    res.status(400).json({ ok: false, code: 'BAD_REQUEST', message: err.message });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  const send = (event, data) => {
    if (!res.writableEnded) res.write('event: ' + event + '\ndata: ' + JSON.stringify(data) + '\n\n');
  };

  send('step', { step: 'dispatch-start', detail: '调度器接收输入', question: message, audience });
  send('step', {
    step: 'intent',
    cityId: info.cityId,
    cityName: registry.city(info.cityId) ? registry.city(info.cityId).name : info.cityId,
    attraction: info.attraction ? info.attraction.name : null,
    matchedRule: info.matchedRule,
    agent: info.agentName
  });
  const t0 = Date.now();
  send('step', { step: 'agent-start', agent: info.agentName });

  const heartbeat = setInterval(() => {
    if (!res.writableEnded) res.write(': ping\n\n');
  }, 15000);

  orchestrator.route(message, opts)
    .then((result) => {
      clearInterval(heartbeat);
      send('step', { step: 'agent-done', agent: result.agent, ms: Date.now() - t0 });
      send('final', result);
      res.end();
    })
    .catch((err) => {
      clearInterval(heartbeat);
      send('error', { message: err && err.statusCode ? err.message : '服务器内部错误，请稍后重试' });
      res.end();
    });

  req.on('close', () => clearInterval(heartbeat));
}

router.get('/orchestrate/stream', streamHandler);
router.get('/advisor/stream', streamHandler);

module.exports = router;
