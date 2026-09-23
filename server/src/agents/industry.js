'use strict';
/**
 * Agent 6 —— 乡村产业赋能 Agent（面向非遗传承人与乡村工坊）
 * 职责：面向工坊经营场景输出六件套赋能方案：
 *   ① 产品定位  ② 定价建议（可解释公式）  ③ 电商详情页文案
 *   ④ 短视频口播脚本  ⑤ 包装升级建议  ⑥ 渠道对策与产销对接
 * 设计原则：
 *   - 结构化建议（定位/定价/渠道对策）全部由知识库字段 + 可解释规则计算，不依赖大模型；
 *   - 文案类内容（详情页/口播脚本）有 LLM 时生成、无 LLM 时用原创模板从知识库事实产出；
 *   - 定价使用市场对标区间 + 成本结构参考，成本比例明确标注"行业通用参考，以工坊实际核算为准"。
 */
const db = require('../data/heritage');
const ruralDb = require('../data/rural');
const llm = require('./llm');

// 渠道痛点 → 对策（原创规则表）
const CHANNEL_REMEDIES = [
  { kw: /同质化|代工|设计能力/, fix: '联名与在地设计：与高校设计院系或在地插画师共创"产地限定款"，把非遗纹样库做成可授权资产，摆脱来样代工。' },
  { kw: /品牌|故事|表达不足|感知/, fix: '内容资产化：把工序拍成"一分钟看懂"系列短视频沉淀为品牌内容库，详情页与包装均引用同一套产地故事，降低重复创作成本。' },
  { kw: /议价|收购价|加价/, fix: '缩短链路：以"合作社/强村公司"统一对外报价，产地直供+溯源码，把中间加价环节的部分利润留在工坊与农户。' },
  { kw: /真假|辨别|难辨|背书/, fix: '建立身份背书：申请地理标志/团体标准标识，重要原料（如古树茶）用官方建档编号，包装附防伪查询入口。' },
  { kw: /直播|话术/, fix: '直播脚本结构化：固定"钩子—工序—手艺人—品鉴—引导"五段式脚本，突出工艺价值而非低价促销。' },
  { kw: /场景|家居|现代/, fix: '场景化开发：围绕"茶席、书房、玄关"三大现代生活场景开发组合装，用使用场景替代工艺术语做卖点表达。' },
  { kw: /物流|损耗|易碎|保鲜|天气|产能/, fix: '履约与产能管理：易碎品定制防震包装与破损包赔；天气敏感型产品（晾晒类）建立预售+排产表，把产能波动转化为"限量手作"的稀缺叙事。' },
  { kw: /认知|门槛|年轻/, fix: '降低认知门槛：用"一图一视频一体验"组合（图解工艺、短视频、到店体验券）把专业术语翻译成大众语言。' },
  { kw: /转化|断层|零售/, fix: '体验-销售闭环：体验结束时当场发放"手作款专属优惠券"，线上商城与体验点同价，扫码直接下单邮寄到家。' },
  { kw: /断层|学徒|周期|从业意愿/, fix: '传承激励：设"学徒工时银行"，学时可兑换体验课分成与作品署名，吸引青年回流；用半机械化工序分担重体力环节。' },
  { kw: /价格|内卷|竞争|替代/, fix: '差异化定价：用"引流款—利润款—形象款"三档组合避开单一低价竞争，主打款强调产地与工时稀缺性。' },
  { kw: /旺季|接待|重叠/, fix: '错峰运营：旺季做体验与品牌曝光，淡季做线上销售与渠道团建，用"云认养/云茶园"平滑季节波动。' }
];

function findCity(cityId) {
  const city = ruralDb[cityId];
  if (!city) throw Object.assign(new Error('暂不支持该目的地'), { statusCode: 400, code: 'BAD_REQUEST' });
  return city;
}

function findWorkshop(city, workshopId) {
  const ws = city.workshops.find((w) => w.id === workshopId);
  if (!ws) {
    throw Object.assign(new Error('请从工坊列表中选择（如：' + city.workshops.slice(0, 2).map((w) => w.name).join('、') + '）'), { statusCode: 400, code: 'BAD_REQUEST' });
  }
  return ws;
}

function heritageOf(cityId, heritageId) {
  const city = db.cities[cityId];
  if (!city) return null;
  return city.heritages.find((h) => h.id === heritageId) || null;
}

// 解析 "120-480元" → [120, 480]
function parseRange(rangeStr) {
  const m = /(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/.exec(String(rangeStr || ''));
  return m ? [Number(m[1]), Number(m[2])] : [null, null];
}

function median(a, b) { return Math.round(((a + b) / 2) * 100) / 100; }

// 可解释定价：市场对标区间 × 三档策略，并用成本比例做毛利体检
function pricing(ws) {
  const main = ws.products[0];
  const [lo, hi] = parseRange(main.priceRange);
  if (lo == null) {
    return { formula: '建议以成本加成为主：零售价 = 单位总成本 ÷ (1 − 目标毛利率)', tiers: [], note: '该品类为按件/按项目计价，建议按上式以实际成本核算。' };
  }
  const costRatio = main.costRef
    ? Object.values(main.costRef).reduce((s, v) => s + v, 0)
    : 0.70;
  const costAt = (price) => Math.round(price * costRatio);
  const tiers = [
    { tier: '引流款', price: Math.round(lo), logic: '取市场区间下限（' + lo + '元），用于拉新与体验转化', grossCheck: '毛利率约 ' + Math.round((1 - costRatio) * 100) + '%，用于走量，不宜作为利润主力' },
    { tier: '利润款', price: median(lo, hi), logic: '取区间中位（约' + median(lo, hi) + '元），主打款，配置最完整的产地故事与规格说明', grossCheck: '毛利率约 ' + Math.round((1 - costRatio) * 100) + '%，建议将成本中人工占比的增量用于品质提升而非降价' },
    { tier: '形象款', price: Math.round(hi * 1.1), logic: '取区间上限上浮10%（约' + Math.round(hi * 1.1) + '元），大师联名/限量款，用于拉高品牌锚点', grossCheck: '以稀缺性支撑溢价，需配套编号证书或大师签名' }
  ];
  return {
    formula: '市场对标定价法：以知识库收录的同类产品公开价格区间为锚，三档定价；毛利体检：毛利率 ≈ 1 − 成本占比（当前参考成本占比 ' + Math.round(costRatio * 100) + '%，即售价 ' + lo + ' 元时单位成本约 ' + costAt(lo) + ' 元）',
    tiers,
    costRef: ws.products[0].costRef || null,
    note: '成本比例为行业通用参考结构（原料/人工/包装/物流/其他），实际请以工坊核算为准；定价还应结合季节与渠道加价率复核。'
  };
}

function positioning(ws, heritage) {
  const main = ws.products[0];
  return {
    mainProduct: main.name,
    priceRange: main.priceRange,
    sellingPoints: main.sellingPoints || [],
    crowd: '核心客群：在地游客与研学团（体验即转化）；次级客群：茶器/家居/礼赠场景的线上用户；潜力客群：海外侨胞与乡缘社群。',
    heritageEndorsement: heritage ? (heritage.name + '（' + heritage.level + '）') : ws.craft,
    statement: '把「' + ws.name + '」定位为"产地非遗手作"而非普通' + (main.category || '产品') + '：以' + (heritage ? heritage.level : '非遗技艺') + '为信任背书，以' + ((main.sellingPoints && main.sellingPoints[0]) || '产地直供') + '为第一卖点。'
  };
}

function relatedSpots(city, ws) {
  return (city.spots || []).filter((s) => (s.heritageRefs || []).includes(ws.heritageId));
}

// —— 离线模板：电商详情页 ——
function templateEcommerce(ws, heritage, city) {
  const main = ws.products[0];
  const lines = [];
  lines.push('【' + main.name + '｜' + (heritage ? heritage.name + '出品' : ws.craft) + '】');
  lines.push('');
  lines.push('▣ 为什么值得买');
  (main.sellingPoints || []).forEach((p, i) => lines.push((i + 1) + '. ' + p));
  lines.push('');
  lines.push('▣ 产地故事');
  lines.push((heritage ? heritage.summary : ws.craft + '，' + city.intro.replace(/^.{0,20}/, '')));
  lines.push('');
  lines.push('▣ 规格与价格');
  ws.products.forEach((p) => lines.push('· ' + p.name + '：' + p.priceRange + (p.note ? '（' + p.note + '）' : '')));
  lines.push('');
  const spot = relatedSpots(city, ws)[0];
  if (spot) {
    lines.push('▣ 想亲手做一件？');
    lines.push('到' + spot.name + '（' + spot.village + '）参与' + (ws.experience ? ws.experience.desc : '手作体验') + '，体验后下单同款可享产地直邮。');
  }
  lines.push('');
  lines.push('#' + city.name + '非遗好物 #' + (heritage ? heritage.name : ws.craft) + ' #乡村振兴');
  return lines.join('\n');
}

// —— 离线模板：短视频口播脚本 ——
function templateVideo(ws, heritage) {
  const main = ws.products[0];
  return [
    '【0-3s 钩子】',
    '"这门手艺，' + cityLine(ws) + '已经做了上百年——但90%的人没见过它怎么诞生。"',
    '',
    '【3-12s 工序展示】',
    '镜头对准' + (heritage ? heritage.name : ws.craft) + '的关键工序（如：' + (ws.experience ? ws.experience.desc : '手作现场') + '），配一句："每一件' + main.name + '，都要经过这些不省略的步骤。"',
    '',
    '【12-22s 手艺人故事】',
    '"在' + ws.village + '，像老师傅这样的手艺人，把' + (heritage ? '「' + heritage.name + '」' : '这门技艺') + '从谋生手艺做成了带动乡亲的共富产业。"',
    '',
    '【22-30s 产品引导】',
    '"' + main.name + '，产地直发，' + main.priceRange + '。想亲手试试，评论区留下「体验」，我们' + (ws.experience ? '体验课' : '工坊') + '见。"',
    '',
    '#非遗 #' + cityLine(ws) + ' #乡村振兴 #手艺人'
  ].join('\n');
}

function cityLine(ws) { return '在' + ws.county; }

// —— 离线模板：包装升级 ——
function templatePackaging(ws, heritage) {
  return [
    '1. 信息层：包装正面固定三要素——非遗标识（' + (heritage ? heritage.level : ws.craft) + '）、产地（' + ws.county + ws.village + '）、一句工序白话（如"十几道工序，只为一碗好味道"）。',
    '2. 结构层：按三档定价匹配三种包装——引流款轻量环保装、利润款礼盒+溯源卡、形象款木匣/瓷罐+编号证书。',
    '3. 体验层：盒内附"工序明信片"或体验券，把包装变成二次到访的入口。',
    '4. 合规层：养生/健康类表述以国家允许范围为准，用"工艺传统"替代"功效承诺"。'
  ].join('\n');
}

function channelAdvice(ws) {
  return (ws.painPoints || []).map((p) => {
    const rule = CHANNEL_REMEDIES.find((r) => r.kw.test(p));
    return { pain: p, fix: rule ? rule.fix : '建议引入专业运营伙伴，围绕该痛点做小步试点，用数据决定是否放大投入。' };
  });
}

function linkage(ws, city) {
  const spots = relatedSpots(city, ws);
  return {
    idea: '产销对接闭环：让「游」与「购」互相导流——行程里安排' + (spots[0] ? '「' + spots[0].name + '」' : '相关非遗体验点') + '，体验结束时引导下单产地直邮；线上商品详情页反向挂出体验预约入口。',
    spots: spots.map((s) => ({ name: s.name, village: s.village, bestSeason: s.bestSeason })),
    experience: ws.experience
  };
}

function empower(cityId, workshopId) {
  const city = findCity(cityId);
  const ws = findWorkshop(city, workshopId);
  const heritage = heritageOf(cityId, ws.heritageId);

  // 文案类：LLM 优先，模板兜底（两段并行）
  const copyPromise = llm.chat([
    { role: 'system', content: '你是乡村电商运营专家。基于给定事实撰写电商详情页文案：含"为什么值得买(3条卖点)+产地故事+规格价格+行动号召"，300字内，只允许使用给定事实，不得编造参数。' },
    { role: 'user', content: '工坊：' + ws.name + '（' + ws.county + ws.village + '）\n技艺：' + (heritage ? heritage.name + '（' + heritage.level + '）' : ws.craft) + '\n产品与价格：' + ws.products.map((p) => p.name + ' ' + p.priceRange).join('；') + '\n卖点：' + (ws.products[0].sellingPoints || []).join('；') + '\n背景：' + (heritage ? heritage.summary : '') }
  ], { temperature: 0.8, maxTokens: 600 });

  const videoPromise = llm.chat([
    { role: 'system', content: '你是短视频编导。基于给定事实写30秒口播脚本，分镜格式"【0-3s钩子】【3-12s工序】【12-22s人物】【22-30s引导】"，只允许使用给定事实。' },
    { role: 'user', content: '工坊：' + ws.name + '\n技艺：' + (heritage ? heritage.name + '：' + heritage.summary : ws.craft) + '\n主推产品：' + ws.products[0].name + '（' + ws.products[0].priceRange + '）\n体验：' + (ws.experience ? ws.experience.desc : '工坊参观') }
  ], { temperature: 0.8, maxTokens: 500 });

  return Promise.all([copyPromise, videoPromise]).then(([copy, video]) => ({
    city: city.name,
    workshop: {
      id: ws.id,
      name: ws.name,
      village: ws.village + '（' + ws.county + '）',
      craft: ws.craft,
      heritage: heritage ? { name: heritage.name, level: heritage.level } : null,
      scale: ws.scale
    },
    positioning: positioning(ws, heritage),
    pricing: pricing(ws),
    ecommerceCopy: {
      content: copy || templateEcommerce(ws, heritage, city),
      generator: copy ? '大模型AIGC生成（基于知识库事实约束）' : '本地模板引擎生成（离线模式，基于知识库事实）'
    },
    videoScript: {
      content: video || templateVideo(ws, heritage),
      generator: video ? '大模型AIGC生成（基于知识库事实约束）' : '本地模板引擎生成（离线模式，基于知识库事实）'
    },
    packaging: templatePackaging(ws, heritage),
    channelAdvice: channelAdvice(ws),
    linkage: linkage(ws, city)
  }));
}

// 工坊清单（供前端下拉）
function listWorkshops(cityId) {
  const city = ruralDb[cityId];
  if (!city) return [];
  return city.workshops.map((w) => {
    const heritage = heritageOf(cityId, w.heritageId);
    return { id: w.id, name: w.name, craft: w.craft, village: w.village + '（' + w.county + '）', heritageName: heritage ? heritage.name : w.craft };
  });
}

module.exports = { empower, listWorkshops };
