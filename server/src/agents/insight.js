'use strict';
/**
 * Agent 7 —— 乡村振兴运营洞察 Agent（面向文旅局 / 乡镇政府）
 * 职责：基于知识库客观字段与真实公开统计，输出可解释的决策参考：
 *   ① 非遗活态传承指数（HLI，逐项打分排行）
 *   ② 乡村文旅增收测算（三档情景 + 公式与参数透明）
 *   ③ 濒危预警清单（低分项 + 预警理由）
 *   ④ 工坊赋能对策汇总（痛点聚类 → 处方）
 *   ⑤ 看板图表数据（供前端零依赖渲染）
 * 支持地区下钻：传入 county 后，非遗、工坊、乡村点位均按区县筛选后重算全部指标，
 *   使同一套算法可以出"全市看板"与"区县看板"两个口径。
 * 原则：所有指标都是知识库字段的可解释函数，杜绝黑盒随机数；
 *      知识库未收录的宏观统计一律提示"以官方统计为准"，不做估算冒充。
 */
const db = require('../data/heritage');
const ruralDb = require('../data/rural');
const regions = require('../data/regions');

// —— 地区筛选 ——
function countiesOf(cityId) {
  return regions.countiesOf(cityId);
}

// 校验区县归属：不存在即 400，避免静默返回全量数据造成误读
function normalizeCounty(cityId, county) {
  const c = String(county || '').trim();
  if (!c) return '';
  if (!regions.isValidCounty(cityId, c)) {
    const list = countiesOf(cityId);
    throw Object.assign(
      new Error('该地区暂无收录（' + db.cities[cityId].name + '已收录：' + (list.join('、') || '暂无') + '）'),
      { statusCode: 400, code: 'BAD_REQUEST' }
    );
  }
  return c;
}

// 区县口径下的非遗项目集合
function heritagesOf(cityId, county) {
  const city = db.cities[cityId];
  if (!county) return city.heritages.slice();
  return city.heritages.filter((h) => regions.countiesOfHeritage(cityId, h.id).indexOf(county) >= 0);
}

function ruralOf(cityId, county) {
  const rural = ruralDb[cityId] || {};
  const pick = (arr, key) => (county ? (arr || []).filter((x) => x[key] === county) : (arr || []));
  return {
    spots: pick(rural.spots, 'county'),
    workshops: pick(rural.workshops, 'county'),
    products: pick(rural.products, 'origin'),
    farm: pick(rural.farm, 'county'),
    stays: pick(rural.stays, 'county'),
    stats: rural.stats || [],
    intro: rural.intro || ''
  };
}

// —— HLI 非遗活态传承指数（满分100，原创可解释算法） ——
function levelScore(level) {
  const s = String(level || '');
  if (s.includes('人类非遗') || s.includes('人类非物质文化遗产')) return 50;
  if (s.includes('国家级')) return 40;
  if (s.includes('省级')) return 30;
  return 20;
}
function masterScore(h) {
  const m = (h.masters || [])[0];
  if (!m) return 0;
  return /以官方名录为准|以中国非遗网/.test(m.name) ? 6 : 15; // 有实名传承人记录得高分
}
// 说明文案独立成函数：名录未登记实名时用职位描述代替，避免出现"（（以官方名录为准））"这类嵌套括号
function masterWhy(h) {
  const m = (h.masters || [])[0];
  if (!m) return '暂无传承人记录';
  if (/^[（(]/.test(String(m.name || ''))) return m.title || '暂无实名传承人记录';
  return m.name;
}
function spotScore(h) { return Math.min(20, (h.experienceSpots || []).length * 10); }
function ruralScore(cityId, h) {
  const rural = ruralDb[cityId];
  if (!rural) return 0;
  const linked = (rural.workshops || []).some((w) => w.heritageId === h.id) || (rural.spots || []).some((s) => (s.heritageRefs || []).includes(h.id));
  return linked ? 15 : 0;
}
function hli(cityId, h) {
  const detail = [
    { key: '级别权重', value: levelScore(h.level), max: 50, why: h.level },
    { key: '传承人收录', value: masterScore(h), max: 15, why: masterWhy(h) },
    { key: '体验点位', value: spotScore(h), max: 20, why: (h.experienceSpots || []).length + ' 处公开体验点' },
    { key: '乡村产业联动', value: ruralScore(cityId, h), max: 15, why: ruralScore(cityId, h) ? '已接入乡村工坊/乡村点位' : '暂无乡村产业联动记录' }
  ];
  const total = detail.reduce((s, d) => s + d.value, 0);
  const grade = total >= 80 ? '活力型' : total >= 60 ? '稳健型' : total >= 40 ? '观察型' : '预警型';
  return { name: h.name, id: h.id, total, grade, detail };
}

// —— 增收测算（参数透明、三档情景） ——
function priceMedian(str) {
  const m = /(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/.exec(String(str || ''));
  return m ? (Number(m[1]) + Number(m[2])) / 2 : null;
}
function revenueModel(cityId, params, county) {
  const city = db.cities[cityId];
  if (!city) throw Object.assign(new Error('暂不支持该目的地'), { statusCode: 400, code: 'BAD_REQUEST' });
  const scope = normalizeCounty(cityId, county) || '';
  const rural = ruralOf(cityId, scope);
  // 部分区县有非遗项目但没有收录工坊（如泉州鲤城区），此时测算参数回落全市口径并明确标注
  const fallback = !rural.workshops.length && !rural.products.length;
  const basis = fallback ? ruralOf(cityId, '') : rural;

  // 从知识库推导默认体验客单价（当前地区工坊体验价格中位的平均）
  const expPrices = basis.workshops.map((w) => priceMedian(w.experience && w.experience.price)).filter(Boolean);
  const defaultTicket = expPrices.length ? Math.round(expPrices.reduce((s, v) => s + v, 0) / expPrices.length) : 100;

  // 好物客单价取"当前地区全部乡村好物价格中位"的中位数：
  // 只取第一条会因收录顺序产生偏差（例如首条恰好是高价茶礼），取全体中位更稳健
  const goodsMids = basis.products.map((p) => priceMedian(p.priceRange)).filter(Boolean).sort((a, b) => a - b);
  const defaultGoods = goodsMids.length
    ? Math.round(goodsMids.length % 2
      ? goodsMids[(goodsMids.length - 1) / 2]
      : (goodsMids[goodsMids.length / 2 - 1] + goodsMids[goodsMids.length / 2]) / 2)
    : 120;
  const goodsRange = goodsMids.length ? (goodsMids[0] + ' - ' + goodsMids[goodsMids.length - 1]) : '';

  const scopeNote = fallback && scope
    ? '（「' + scope + '」暂无收录的工坊与好物，体验客单价与好物客单价回落至' + city.name + '全市口径）'
    : '';

  const p = {
    visitors: Math.max(0, Number(params && params.visitors) || 500000),   // 年游客量（默认50万，请以当地统计为准）
    expRate: Math.min(1, Math.max(0, Number(params && params.expRate) || 0.12)),  // 体验项目参与率
    ticket: Number(params && params.ticket) || defaultTicket,              // 体验客单价
    goodsRate: Math.min(1, Math.max(0, Number(params && params.goodsRate) || 0.25)), // 好物购买转化率（按到访游客计）
    goodsPrice: Number(params && params.goodsPrice) || defaultGoods,       // 好物客单价
    jobsPer10k: Number(params && params.jobsPer10k) || 12                  // 每万元乡村文旅收入带动就业（人·天/万元，参考值）
  };
  const scenarios = [
    { name: '保守', factor: 0.7, note: '淡季为主、体验供给不足' },
    { name: '基准', factor: 1.0, note: '按现有工坊与体验容量平稳运营' },
    { name: '乐观', factor: 1.6, note: '新增研学与节庆场景后的上限估计' }
  ].map((s) => {
    const visitors = Math.round(p.visitors * s.factor);
    const expRevenue = Math.round(visitors * p.expRate * p.ticket);
    const goodsRevenue = Math.round(visitors * p.goodsRate * p.goodsPrice);
    const total = expRevenue + goodsRevenue;
    return {
      name: s.name,
      note: s.note,
      visitors,
      expRevenue,
      goodsRevenue,
      total,
      totalWan: Math.round(total / 10000 * 10) / 10,
      jobs: Math.round(total / 10000 * p.jobsPer10k)
    };
  });
  return {
    formula: '年乡村文旅收入 ≈ 游客量 × 体验参与率 × 体验客单价（体验收入） + 游客量 × 好物转化率 × 好物客单价（商品收入）',
    scopeLabel: scope ? (city.name + ' · ' + scope + scopeNote) : (city.name + ' · 全部地区'),
    params: Object.assign({}, p, {
      ticketSource: expPrices.length ? '由知识库收录的 ' + expPrices.length + ' 个工坊体验价格中位数平均得出（默认 ' + defaultTicket + ' 元）' : '默认值',
      goodsPriceSource: goodsMids.length
        ? '由知识库 ' + goodsMids.length + ' 种乡村好物的价格中位得出（各好物中位区间 ' + goodsRange + ' 元，默认取中位数 ' + defaultGoods + ' 元）'
        : '默认值',
      visitorsNote: '默认 50 万人次仅为占位参数，测算前请以当地文旅统计为准'
    }),
    scenarios,
    disclaimer: '本测算为基于知识库参数的情景推演工具，用于辅助决策讨论，不构成统计数据。'
  };
}

// —— 濒危预警 ——
function alerts(cityId, county) {
  const rows = heritagesOf(cityId, county).map((h) => hli(cityId, h)).sort((a, b) => a.total - b.total);
  return rows.filter((r) => r.total < 60).slice(0, 5).map((r) => {
    const reasons = r.detail.filter((d) => d.value < d.max * 0.6).map((d) => d.key + '偏弱（' + d.why + '）');
    return { name: r.name, score: r.total, grade: r.grade, reasons };
  });
}

// —— 工坊痛点聚类与对策汇总 ——
function remedies(cityId, county) {
  const rural = ruralOf(cityId, county);
  const bucket = {};
  rural.workshops.forEach((w) => (w.painPoints || []).forEach((p) => {
    const key = p.length > 6 ? p.slice(0, 6) : p;
    (bucket[key] = bucket[key] || { pain: p, workshops: [] }).workshops.push(w.name);
  }));
  return Object.values(bucket).slice(0, 6).map((b) => ({
    pain: b.pain,
    affected: b.workshops,
    advice: '建议由镇域层面统一组织：' + b.workshops.length + ' 家工坊共担成本，试点后按效果推广。'
  }));
}

// —— 看板图表数据 ——
function charts(cityId, county) {
  const scope = normalizeCounty(cityId, county) || '';
  const rural = ruralOf(cityId, scope);
  const list = heritagesOf(cityId, scope);
  const levelDist = { '人类非遗': 0, '国家级': 0, '省市级': 0 };
  list.forEach((h) => {
    const s = h.level;
    if (s.includes('人类')) levelDist['人类非遗']++;
    else if (s.includes('国家级')) levelDist['国家级']++;
    else levelDist['省市级']++;
  });
  const catDist = {};
  list.forEach((h) => { catDist[h.category] = (catDist[h.category] || 0) + 1; });
  const hliRows = list.map((h) => hli(cityId, h)).sort((a, b) => b.total - a.total);
  return {
    levelDist,
    categoryDist: Object.entries(catDist).map(([name, count]) => ({ name, count })),
    hliTop: hliRows.slice(0, 8).map((r) => ({ name: r.name, score: r.total, grade: r.grade })),
    workshopByCounty: Object.entries(rural.workshops.reduce((m, w) => { const k = w.county; m[k] = (m[k] || 0) + 1; return m; }, {})).map(([name, count]) => ({ name, count })),
    ruralSpots: rural.spots.length,
    workshops: rural.workshops.length,
    products: rural.products.length
  };
}

function insight(cityId, opts) {
  const options = opts || {};
  const city = db.cities[cityId];
  if (!city) return Promise.reject(Object.assign(new Error('暂不支持该目的地'), { statusCode: 400, code: 'BAD_REQUEST' }));
  const county = normalizeCounty(cityId, options.county) || '';
  const rural = ruralOf(cityId, county);
  const list = heritagesOf(cityId, county);
  const hliRows = list.map((h) => hli(cityId, h)).sort((a, b) => b.total - a.total);

  if (!list.length) {
    return Promise.reject(Object.assign(
      new Error('「' + county + '」暂无非遗项目收录，无法生成看板；可切换其他地区或选择全部地区'),
      { statusCode: 400, code: 'BAD_REQUEST' }
    ));
  }

  return Promise.resolve({
    city: city.name,
    county: county || null,
    scopeLabel: county ? (city.name + ' · ' + county) : (city.name + ' · 全部地区'),
    counties: countiesOf(cityId),
    summary: '基于' + (county ? '「' + county + '」' : city.name + '全域') + '知识库 ' + list.length + ' 项非遗、' + rural.spots.length + ' 个乡村点位与 ' + rural.workshops.length + ' 个非遗工坊的结构化分析（指标算法可解释、可复现，数据来源见《非遗数据来源说明》）：',
    hli: {
      title: '非遗活态传承指数（HLI，满分100）',
      algorithm: '总分 = 级别权重（人类非遗50/国家级40/省级30/其他20） + 传承人收录（实名15/待核6/无0） + 体验点位（每处10，封顶20） + 乡村产业联动（有15/无0）',
      rows: hliRows
    },
    revenue: revenueModel(cityId, null, county),
    alerts: alerts(cityId, county),
    remedies: remedies(cityId, county),
    charts: charts(cityId, county),
    stats: rural.stats || []
  });
}

module.exports = { insight, revenueModel, heritagesOf, countiesOf };
