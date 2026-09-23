'use strict';
/**
 * Agent 8 —— 政务产业助手 Agent（面向地方工作人员的智能对话体）
 *
 * 与游客侧调度器的区别：
 *   游客对话体回答"怎么玩"，本 Agent 回答"怎么管、怎么算、怎么推"，
 *   输出面向汇报材料与决策讨论，并按工作人员的"关注区县 / 关注重点"裁剪内容。
 *
 * 两类能力：
 *   ① 归纳总结：把分散在各数据表里的信息（非遗结构、HLI、预警、工坊痛点、增收测算）
 *      压缩成一份分层摘要，并给出可直接粘进材料的文本；
 *   ② 定向问答：濒危清单、增收口径、工坊对策、地区对比、非遗项目咨询等高频问题。
 *
 * 反幻觉约定（与知识库 Agent 一致）：
 *   - 所有数字都能在知识库或已标注来源的公开统计中找到出处；
 *   - 未收录的信息直接说明"暂未收录"，不做推测；
 *   - 指标一律复用 insight 的同一套实现，不再写第二份，避免口径漂移。
 */
const registry = require('../data/registry');
const insight = require('./insight');
const industry = require('./industry');
const knowledge = require('./knowledge');

const AGENT_NAME = '政务产业助手Agent';

const FOCUS_OPTIONS = ['非遗工坊增收', '濒危项目抢救', '乡村文旅引流', '好物产销对接', '传承人培育'];

// 意图规则（顺序即优先级：越靠前越具体）
const STAFF_RULES = [
  { intent: 'summary', words: ['总结', '归纳', '汇报', '简报', '材料', '梳理', '概况', '整体情况', '盘点', '汇总', '近况', '工作要点', '写一份', '产出一份', '情况说明'] },
  { intent: 'compare', words: ['对比', '比较', '相比', '差距', '横向', '哪个城市', '谁更强'] },
  { intent: 'risk', words: ['濒危', '预警', '抢救', '失传', '最危险', '最需要', '断层'] },
  { intent: 'workshop', words: ['工坊', '定价', '经营', '赋能', '电商', '带货', '渠道', '痛点', '卖不动', '内卷'] },
  { intent: 'revenue', words: ['增收', '测算', '收入', '产值', '带动就业', '收益', '客单价', '转化率'] },
  { intent: 'metric', words: ['指数', 'hli', '指标', '看板', '排名', '评分'] },
  { intent: 'heritage', words: ['非遗项目', '级别', '传承人', '名录', '有哪些非遗', '非遗有', '非遗是'] }
];

// 规则化建议（按"关注重点"匹配排序，保证与工作人员画像联动）
const ADVICE_RULES = [
  { tags: ['濒危项目抢救', '传承人培育'], text: '建立"一项目一台账"的 HLI 季度复查机制：把级别权重、传承人收录、体验点位、乡村联动四个维度落到具体责任人，预警项单列跟进。' },
  { tags: ['濒危项目抢救'], text: '优先补"体验点位"这一短板：体验点位每处计 10 分、封顶 20 分，是权重高又最不易被客观条件卡住的维度——推动预警项目挂靠现有工坊、景区动线或村文化礼堂，落地常态化体验。' },
  { tags: ['濒危项目抢救', '传承人培育'], text: '把"传承人收录"从名录问题变成运营问题：为尚无实名记录的技艺建立传习人档案，用体验课分成、作品署名等方式让带徒可计量、可兑现。' },
  { tags: ['非遗工坊增收'], text: '以"合作社 / 强村公司统一对外报价 + 产地直供 + 溯源码"缩短链路，把中间加价环节的部分利润留在工坊与农户。' },
  { tags: ['非遗工坊增收', '好物产销对接'], text: '打通"体验引流 → 产地直邮"闭环：体验结束时当场发放同款手作专属券，线上商城与体验点同价，扫码即可下单邮寄。' },
  { tags: ['非遗工坊增收'], text: '用"引流款—利润款—形象款"三档定价替代单一低价竞争，主打款强调产地与工时稀缺性，避免整店陷入比价。' },
  { tags: ['非遗工坊增收'], text: '应对季节错配：天气敏感型产品建立预售+排产表，把产能波动讲成"限量手作"的稀缺叙事，淡季转做线上销售与渠道团建。' },
  { tags: ['乡村文旅引流'], text: '把关键工序拍成"一分钟看懂"系列短视频沉淀为品牌内容库，详情页、包装与导览牌引用同一套产地故事，降低重复创作成本。' },
  { tags: ['乡村文旅引流'], text: '按季度做主题线路：春采茶、夏摘果、秋庆收、冬做手作，把单点体验串成"可复购的乡村日历"，缓解旺季挤兑与淡季空置。' },
  { tags: ['好物产销对接'], text: '推动镇域联营统一品牌与品控：多家小工坊共担包装、检测与物流成本，先做 3 家试点再按效果推广。' },
  { tags: ['传承人培育'], text: '设置"学徒工时银行"，学时可兑换体验课分成与作品署名；对重体力工序引入半机械化设备分担，提升青年从业意愿。' }
];

function detectIntent(q) {
  const low = q.toLowerCase();
  for (const rule of STAFF_RULES) {
    if (rule.words.some((w) => low.includes(w.toLowerCase()))) return rule.intent;
  }
  return 'overview';
}

function avg(nums) {
  if (!nums.length) return 0;
  return Math.round((nums.reduce((s, v) => s + v, 0) / nums.length) * 10) / 10;
}

function gradeCount(rows) {
  const g = { 活力型: 0, 稳健型: 0, 观察型: 0, 预警型: 0 };
  rows.forEach((r) => { g[r.grade] = (g[r.grade] || 0) + 1; });
  return g;
}

// 统计偏弱维度（低于该维度满分的 60%）
function weakDimensions(rows) {
  const weak = {};
  rows.forEach((r) => (r.detail || []).forEach((d) => {
    if (d.value < d.max * 0.6) weak[d.key] = (weak[d.key] || 0) + 1;
  }));
  return Object.entries(weak).sort((a, b) => b[1] - a[1]);
}

function sortedAdvice(focus, limit) {
  const items = ADVICE_RULES.map((a) => Object.assign({}, a, { hit: !!focus && a.tags.indexOf(focus) >= 0 }));
  items.sort((a, b) => (b.hit ? 1 : 0) - (a.hit ? 1 : 0));
  return items.slice(0, limit || 6);
}

/**
 * 归纳总结：输出分层摘要 + 可直接使用的文本
 * @param {object} opts { cityId, county, focus }
 * @returns {Promise<object>}
 */
function summarize(opts) {
  const options = opts || {};
  let cityId;
  let city;
  try {
    cityId = options.cityId || registry.defaultCityId();
    city = registry.assertCity(cityId);
  } catch (err) {
    return Promise.reject(err);
  }
  const county = options.county || '';
  const focus = FOCUS_OPTIONS.indexOf(options.focus) >= 0 ? options.focus : '';

  return insight.insight(cityId, { county }).then((d) => {
    const rows = d.hli.rows;
    const g = gradeCount(rows);
    const avgScore = avg(rows.map((r) => r.total));
    const base = (d.revenue.scenarios || []).find((s) => s.name === '基准') || (d.revenue.scenarios || [])[0] || {};
    const weak = weakDimensions(rows);
    const advice = sortedAdvice(focus);
    const levelDist = d.charts.levelDist || {};
    const top = rows.slice(0, 3);

    const sections = [];

    sections.push({
      key: 'base',
      title: '一、总体情况',
      items: [
        '数据范围：' + d.scopeLabel + '（知识库收录口径，非全量普查数据）',
        '非遗项目：共 ' + rows.length + ' 项 —— 人类非遗 ' + (levelDist['人类非遗'] || 0) + ' 项、国家级 ' + (levelDist['国家级'] || 0) + ' 项、省市级 ' + (levelDist['省市级'] || 0) + ' 项',
        '乡村产业载体：乡村文旅点位 ' + (d.charts.ruralSpots || 0) + ' 个、非遗工坊 ' + (d.charts.workshops || 0) + ' 家、乡村好物 ' + (d.charts.products || 0) + ' 种',
        '归属区县：' + (d.counties || []).length + ' 个（' + (d.counties || []).slice(0, 6).join('、') + ((d.counties || []).length > 6 ? ' 等' : '') + '）'
      ]
    });

    sections.push({
      key: 'hli',
      title: '二、活态传承水平（HLI 非遗活态传承指数）',
      items: [
        '平均得分：' + avgScore + ' 分（满分 100）',
        '分型结构：活力型 ' + g['活力型'] + ' 项、稳健型 ' + g['稳健型'] + ' 项、观察型 ' + g['观察型'] + ' 项、预警型 ' + g['预警型'] + ' 项',
        '领先项目：' + top.map((r) => r.name + '（' + r.total + ' 分，' + r.grade + '）').join('、'),
        weak.length
          ? '共性短板：' + weak.slice(0, 3).map(([k, n]) => k + '偏弱（' + n + ' 项）').join('；')
          : '共性短板：各维度得分均高于观察线'
      ].concat(['评分口径：' + d.hli.algorithm])
    });

    sections.push({
      key: 'risk',
      title: '三、濒危预警',
      items: d.alerts.length
        ? d.alerts.map((a) => a.name + '（' + a.score + ' 分，' + a.grade + '）：' + (a.reasons[0] || '综合得分偏低'))
        : ['当前全部项目 HLI 均不低于 60 分观察线，暂无预警项']
    });

    sections.push({
      key: 'industry',
      title: '四、产业赋能进展',
      items: ['已收录非遗工坊 ' + (d.charts.workshops || 0) + ' 家，覆盖区县 ' + (d.charts.workshopByCounty || []).length + ' 个']
        .concat((d.remedies || []).slice(0, 3).map((r) => '共性问题：' + r.pain + '（' + r.affected.length + ' 家工坊涉及）'))
        .concat(['已形成对策条目 ' + (d.remedies || []).length + ' 组，可逐条对应到具体工坊'])
    });

    sections.push({
      key: 'revenue',
      title: '五、乡村文旅增收测算（基准情景）',
      items: [
        '年收入测算：约 ' + base.totalWan + ' 万元（体验收入 ' + Math.round((base.expRevenue || 0) / 10000 * 10) / 10 + ' 万元 + 好物收入 ' + Math.round((base.goodsRevenue || 0) / 10000 * 10) / 10 + ' 万元）',
        '客流口径：' + (base.visitors || 0).toLocaleString('zh-CN') + ' 人次；带动就业约 ' + (base.jobs || 0) + ' 人·天（按每万元收入 12 人·天参考值）',
        '测算公式：' + d.revenue.formula,
        '参数来源：' + d.revenue.params.ticketSource + '；' + d.revenue.params.goodsPriceSource,
        '口径提醒：' + d.revenue.params.visitorsNote + '。' + d.revenue.disclaimer
      ]
    });

    sections.push({
      key: 'next',
      title: '六、下一步建议' + (focus ? '（按关注重点「' + focus + '」优先排序）' : ''),
      items: advice.map((a) => a.text + '〔' + a.tags.join(' / ') + '〕')
    });

    // 可直接粘进材料的纯文本
    const title = city.name + (county ? ' · ' + county : '') + ' 非遗活态传承与乡村产业赋能情况梳理';
    const markdown = ['# ' + title, '']
      .concat(['生成时间：' + new Date().toLocaleString('zh-CN', { hour12: false }), '数据来源：本地知识库 + 已标注来源的公开统计', ''])
      .concat(sections.reduce((acc, s) => acc.concat(['## ' + s.title], s.items.map((i) => '- ' + i), ['']), []))
      .join('\n');

    return {
      kind: 'summary',
      title,
      scopeLabel: d.scopeLabel,
      focus,
      sections,
      markdown,
      answer: markdown
    };
  });
}

// —— 地区横向对比 ——
function compareText(ids) {
  return Promise.all(ids.map((id) => insight.insight(id, {}))).then((list) => {
    const rowsOf = list.map((d) => d.hli.rows);
    const lines = ['【' + list.map((d) => d.city).join(' vs ') + ' 横向对比】'];
    lines.push('· 非遗项目：' + list.map((d) => d.hli.rows.length + ' 项').join(' vs '));
    lines.push('· 人类/国家级项目：' + list.map((d) => ((d.charts.levelDist['人类非遗'] || 0) + (d.charts.levelDist['国家级'] || 0)) + ' 项').join(' vs '));
    lines.push('· 乡村文旅点位：' + list.map((d) => d.charts.ruralSpots + ' 个').join(' vs '));
    lines.push('· 非遗工坊：' + list.map((d) => d.charts.workshops + ' 家').join(' vs '));
    lines.push('· 平均 HLI：' + rowsOf.map((r) => avg(r.map((x) => x.total)) + ' 分').join(' vs '));
    lines.push('· 濒危预警项：' + list.map((d) => d.alerts.length + ' 项').join(' vs '));
    lines.push('· 基准年收入测算：' + list.map((d) => {
      const b = (d.revenue.scenarios || []).find((s) => s.name === '基准') || {};
      return (b.totalWan || 0) + ' 万元';
    }).join(' vs '));
    lines.push('');
    const best = rowsOf.map((r, i) => ({ i, a: avg(r.map((x) => x.total)) })).sort((x, y) => y.a - x.a)[0];
    lines.push('参考结论：平均 HLI 最高的是' + list[best.i].city + '（' + best.a + ' 分）。' +
      '工坊与乡村点位的数量决定了体验供给能力，年收入测算的差异主要来自这两项规模，而非单一项目的级别高低。' +
      '对比全部按同一套算法与同一批默认参数计算，可直接引用；如需区县级对比，请在看板中切换地区后提问。');
    lines.push('');
    lines.push('（数据来源：本地知识库 + 已标注来源的公开统计；收入为情景推演，不构成统计数据。）');
    return lines.join('\n');
  });
}

// —— 工坊问答 ——
function workshopAnswer(cityId, q) {
  const list = industry.listWorkshops(cityId);
  if (!list.length) return Promise.resolve('该地区知识库中暂未收录非遗工坊。');
  const hit = list.find((w) => q.includes(w.name) || q.includes(w.craft));
  if (hit) {
    return industry.empower(cityId, hit.id).then((d) => {
      const p = d.pricing || {};
      const lines = ['【' + d.workshop.name + '｜赋能要点摘要】（完整方案见「乡村产业赋能」页）'];
      lines.push('');
      lines.push('① 定位：' + (d.positioning.statement || ''));
      lines.push('② 定价：' + (p.formula || ''));
      (p.tiers || []).forEach((t) => lines.push('   · ' + t.tier + '：' + t.price + ' 元 —— ' + t.logic));
      lines.push('③ 渠道痛点对策：');
      (d.channelAdvice || []).slice(0, 3).forEach((r, i) => lines.push('   ' + (i + 1) + '. ' + r.pain + ' → ' + r.fix));
      lines.push('④ 产销对接：' + ((d.linkage || {}).idea || ''));
      return lines.join('\n');
    });
  }
  const lines = ['本地区已收录 ' + list.length + ' 家非遗工坊：'];
  list.forEach((w, i) => lines.push((i + 1) + '. ' + w.name + '｜' + w.craft + '｜' + w.village));
  lines.push('');
  lines.push('可以直接问我某一家工坊的经营问题（如"' + list[0].name + '怎么定价"），我会给出定位、三档定价、渠道对策与产销对接要点。完整六件套方案请到「乡村产业赋能」页生成。');
  return Promise.resolve(lines.join('\n'));
}

/**
 * 定向问答：面向工作人员的自然语言入口
 * @param {string} question
 * @param {object} opts { cityId, county, focus }
 * @returns {Promise<{agent:string, data:object}>}
 */
function ask(question, opts) {
  const q = String(question || '').trim();
  if (!q) return Promise.reject(Object.assign(new Error('请输入内容'), { statusCode: 400, code: 'BAD_REQUEST' }));
  const options = opts || {};
  let intent = detectIntent(q);
  // 同时提到两座及以上城市时一律按"横向对比"处理——
  // 只靠关键词表识别不到"A 和 B 比怎么样"这类自然说法，而地名数量是最可靠的信号
  const mentioned = registry.detectCities(q);
  if (mentioned.length >= 2) intent = 'compare';
  let cityId;
  try {
    // 问题里点名的城市优先于当前选择，符合"临时换个地方问问"的使用习惯
    cityId = registry.detectCity(q) || options.cityId || registry.defaultCityId();
    registry.assertCity(cityId);
  } catch (err) {
    return Promise.reject(err);
  }
  const county = options.county && registry.counties(cityId).indexOf(options.county) >= 0 ? options.county : '';
  const focus = options.focus || '';
  const scope = { county };

  if (intent === 'compare') {
    const targets = mentioned.length >= 2 ? mentioned : registry.cityIds();
    if (targets.length < 2) {
      return Promise.resolve({ agent: AGENT_NAME, data: { hint: '目前知识库只收录了一座城市，暂无法横向对比。' } });
    }
    return compareText(targets.slice(0, 3)).then((text) => ({
      agent: AGENT_NAME,
      data: { answer: text, intent }
    }));
  }

  if (intent === 'summary') {
    return summarize({ cityId, county, focus }).then((s) => ({
      agent: AGENT_NAME,
      data: { answer: s.answer, summary: s, intent, scopeLabel: s.scopeLabel }
    }));
  }

  if (intent === 'risk') {
    return insight.insight(cityId, scope).then((d) => {
      const lines = ['【' + d.scopeLabel + ' 濒危预警清单】（HLI 低于 60 分观察线）'];
      lines.push('');
      if (!d.alerts.length) {
        lines.push('当前全部 ' + d.hli.rows.length + ' 个项目 HLI 均不低于 60 分，暂无预警项。');
        lines.push('可继续关注观察型项目（40-60 分区间），它们的体验点位与乡村联动维度往往仍有提升空间。');
      } else {
        d.alerts.forEach((a, i) => {
          lines.push((i + 1) + '. ' + a.name + '（' + a.score + ' 分，' + a.grade + '）');
          (a.reasons || []).forEach((r) => lines.push('   · 预警依据：' + r));
        });
        lines.push('');
        lines.push('处置建议：优先补齐"体验点位"维度（每处 +10 分，封顶 20 分），把项目挂靠到现有工坊、景区动线或村文化礼堂，是最快见效的路径。');
      }
      return { agent: AGENT_NAME, data: { answer: lines.join('\n'), alerts: d.alerts, intent, scopeLabel: d.scopeLabel } };
    });
  }

  if (intent === 'revenue') {
    return insight.insight(cityId, scope).then((d) => {
      const r = d.revenue;
      const lines = ['【' + d.scopeLabel + ' 乡村文旅增收测算】'];
      lines.push('');
      lines.push('测算公式：' + r.formula);
      lines.push('');
      (r.scenarios || []).forEach((s) => {
        lines.push('· ' + s.name + '情景：年收入约 ' + s.totalWan + ' 万元 —— 体验 ' + Math.round(s.expRevenue / 10000 * 10) / 10 + ' 万 + 好物 ' + Math.round(s.goodsRevenue / 10000 * 10) / 10 + ' 万；游客 ' + s.visitors.toLocaleString('zh-CN') + ' 人次，带动就业约 ' + s.jobs + ' 人·天');
        lines.push('　　前提：' + s.note);
      });
      lines.push('');
      lines.push('参数来源：' + r.params.ticketSource + '；' + r.params.goodsPriceSource);
      lines.push('口径提醒：' + r.params.visitorsNote + '。可在「乡村振兴看板」页填入本地真实客流与转化率后重新测算。');
      lines.push(r.disclaimer);
      return { agent: AGENT_NAME, data: { answer: lines.join('\n'), revenue: r, intent, scopeLabel: d.scopeLabel } };
    });
  }

  if (intent === 'metric') {
    return insight.insight(cityId, scope).then((d) => {
      const rows = d.hli.rows;
      const lines = ['【' + d.scopeLabel + ' 非遗活态传承指数（HLI）排行】'];
      lines.push('');
      lines.push('评分口径：' + d.hli.algorithm);
      lines.push('');
      rows.slice(0, 10).forEach((r, i) => {
        lines.push((i + 1) + '. ' + r.name + '：' + r.total + ' 分（' + r.grade + '）');
      });
      if (rows.length > 10) lines.push('…… 其余 ' + (rows.length - 10) + ' 项详见看板');
      lines.push('');
      const g = gradeCount(rows);
      lines.push('分型结构：活力型 ' + g['活力型'] + ' 项、稳健型 ' + g['稳健型'] + ' 项、观察型 ' + g['观察型'] + ' 项、预警型 ' + g['预警型'] + ' 项；平均 ' + avg(rows.map((x) => x.total)) + ' 分。');
      return { agent: AGENT_NAME, data: { answer: lines.join('\n'), hli: d.hli, intent, scopeLabel: d.scopeLabel } };
    });
  }

  if (intent === 'workshop') {
    return workshopAnswer(cityId, q).then((text) => ({ agent: AGENT_NAME, data: { answer: text, intent } }));
  }

  if (intent === 'heritage') {
    return knowledge.query(cityId, q).then((data) => ({ agent: '非遗知识库Agent', data: Object.assign({ intent }, data) }));
  }

  // 兜底：给出该地区概况 + 可问清单，避免"答不上来"的空转
  return insight.insight(cityId, scope).then((d) => {
    const rows = d.hli.rows;
    const lines = [];
    lines.push('【' + d.scopeLabel + ' 政务问答助手】');
    lines.push('');
    lines.push('我能基于本地知识库与可解释指标回答以下几类问题：');
    lines.push('· 归纳总结：「帮我总结一下' + (county || d.city) + '的非遗与产业情况」「写一份汇报材料」');
    lines.push('· 风险研判：「哪些项目最需要抢救」「濒危预警有哪些」');
    lines.push('· 增收测算：「' + (county || d.city) + '乡村文旅一年能增收多少」「带动就业多少人」');
    lines.push('· 指标解读：「HLI 指数排行」「哪些指标偏弱」');
    lines.push('· 工坊经营：「某工坊怎么定价」「渠道痛点怎么破」');
    lines.push('· 地区对比：「' + d.city + '和其他城市比怎么样」');
    lines.push('');
    lines.push('当前范围概况：非遗 ' + rows.length + ' 项、乡村点位 ' + d.charts.ruralSpots + ' 个、非遗工坊 ' + d.charts.workshops + ' 家；平均 HLI ' + avg(rows.map((x) => x.total)) + ' 分，预警 ' + d.alerts.length + ' 项。');
    return { agent: AGENT_NAME, data: { answer: lines.join('\n'), intent: 'overview', scopeLabel: d.scopeLabel } };
  });
}

module.exports = { ask, summarize, AGENT_NAME, FOCUS_OPTIONS, detectIntent };
