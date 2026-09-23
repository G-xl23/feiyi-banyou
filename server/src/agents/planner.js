'use strict';
/**
 * Agent 1 —— 旅行规划 Agent
 * 职责：输入目的地/天数/人群/偏好/线路模式，调用本地景点-非遗-乡村点位库，
 * 规划每日行程并把非遗体验点自动穿插进行程（原创匹配调度逻辑）。
 * 三种线路模式（原创）：
 *   city  城市经典 —— 以古城/市区景点为主
 *   blend 城乡融合 —— 每日城市景点与乡村点位混排，白天进村、傍晚回城
 *   rural 乡村深度 —— 以乡村振兴示范村、非遗工坊、农事体验为主，附村宿建议
 * LLM 仅用于生成每日导语，行程结构完全由本地算法产出（可控、无幻觉）。
 */
const db = require('../data/heritage');
const ruralDb = require('../data/rural');
const llm = require('./llm');

const CROWD_RULES = {
  family: { label: '亲子', durationFactor: 1.3, preferTypes: ['非遗体验馆', '非遗展演', '非遗体验区', '历史古迹'], dailySpots: 3, tip: '亲子出行节奏放缓，优先选择可动手参与的非遗体验项目；博物馆、手作工坊类点位建议提前预约。' },
  youth: { label: '青年', durationFactor: 1.0, preferTypes: ['历史街区', '非遗体验村', '历史+滨海', '自然+历史'], dailySpots: 4, tip: '青年出行可安排高密度打卡路线，傍晚留出时间体验夜市与古城夜景。' },
  elder: { label: '老年', durationFactor: 1.5, preferTypes: ['历史古迹', '非遗展演', '历史街区'], dailySpots: 2, tip: '老年出行节奏舒缓，每日点位不超过3个，行前关注场馆台阶与休息区情况，午后宜安排茶馆歇脚。' }
};

const MODES = {
  city: { label: '城市经典', tip: '聚焦古城与市区核心景点，适合首次到访。' },
  blend: { label: '城乡融合', tip: '白天进村看工坊、品好物，傍晚回城逛街区——一条线同时感受城市烟火与乡村手艺。' },
  rural: { label: '乡村深度', tip: '以乡村振兴示范村、非遗工坊与农事体验为主，节奏放慢，建议自驾或包车并提前预约工坊体验。' }
};

function findCity(cityId) {
  const city = db.cities[cityId];
  if (!city) throw Object.assign(new Error('暂不支持该目的地，请选择已收录城市'), { statusCode: 400, code: 'BAD_REQUEST' });
  return city;
}

function heritageById(city, id) {
  return city.heritages.find((h) => h.id === id) || null;
}

// 乡村点位 → 与城市景点同构，便于统一调度
function normalizeRuralSpot(s) {
  return {
    id: s.id,
    name: s.name,
    type: s.type,
    area: s.county + ' · ' + s.village,
    durationMin: s.durationMin,
    desc: s.desc,
    heritageRefs: s.heritageRefs || [],
    rural: true,
    highlights: s.highlights || [],
    bestSeason: s.bestSeason || ''
  };
}

// 原创匹配算法：给候选点位打分（偏好非遗加权 + 人群类型加权 + 模式加权）
function scoreAttraction(a, preferHeritage, crowd, mode) {
  let score = 0;
  if (preferHeritage) score += a.heritageRefs.length * 10;
  if (CROWD_RULES[crowd].preferTypes.includes(a.type)) score += 5;
  if (['非遗展演', '非遗体验馆', '非遗体验区', '非遗工坊', '茶旅融合', '传统文化村落', '农事体验'].includes(a.type)) score += 3;
  if (mode === 'rural' && a.rural) score += 20;
  if (mode === 'blend') score += a.rural ? 8 : 4; // 城乡融合：两边都保留存在感
  return score;
}

function formatDuration(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return h + '小时' + m + '分钟';
  if (h) return h + '小时';
  return m + '分钟';
}

function buildDay(city, cityId, dayIndex, spots, crowdRule, mode) {
  const rural = ruralDb[cityId];
  const slotLabels = ['上午', '下午', '傍晚/夜游'];
  const schedule = spots.map((a, i) => ({
    slot: slotLabels[i] || '自由安排',
    kind: a.rural ? '乡村文旅点位' : (a.heritageRefs.length ? '非遗联动景点' : '常规景点'),
    name: a.name,
    type: a.type,
    address: a.area,
    duration: formatDuration(Math.round(a.durationMin * crowdRule.durationFactor)),
    desc: a.desc,
    highlights: a.highlights || undefined,
    bestSeason: a.bestSeason || undefined,
    heritageLinks: a.heritageRefs.map((id) => {
      const h = heritageById(city, id);
      return h ? { name: h.name, level: h.level, summary: h.summary } : null;
    }).filter(Boolean)
  }));

  const foods = city.foods;
  const lunch = foods[(dayIndex * 2) % foods.length];
  const dinner = foods[(dayIndex * 2 + 1) % foods.length];
  const day = {
    day: dayIndex + 1,
    theme: spots.map((s) => s.name).join(' → '),
    schedule,
    meals: [
      { meal: '午餐', name: lunch.name, desc: lunch.desc, heritageNote: lunch.heritageNote },
      { meal: '晚餐', name: dinner.name, desc: dinner.desc, heritageNote: dinner.heritageNote }
    ]
  };

  if (mode !== 'city' && rural) {
    // 城乡融合/乡村深度：附村宿建议与当日乡村好物
    const stays = rural.stays || [];
    if (stays.length) {
      const s = stays[dayIndex % stays.length];
      day.stay = { name: s.name, area: s.county + ' · ' + s.village, priceRange: s.priceRange, desc: s.desc };
    }
    const products = rural.products || [];
    if (products.length) {
      day.ruralPicks = products.slice((dayIndex * 2) % Math.max(1, products.length - 1), (dayIndex * 2) % Math.max(1, products.length - 1) + 2)
        .map((p) => ({ name: p.name, priceRange: p.priceRange, heritageNote: p.heritageNote }));
    }
  }
  return day;
}

function plan(params) {
  const { cityId, days, crowd, preferHeritage } = params;
  const mode = MODES[params.mode] ? params.mode : 'city';
  const city = findCity(cityId);
  const rule = CROWD_RULES[crowd] || CROWD_RULES.youth;
  const nDays = Math.min(Math.max(Number(days) || 2, 1), 7);

  // 组装候选池
  let candidates;
  const rural = ruralDb[cityId];
  if (mode === 'rural') {
    candidates = ((rural && rural.spots) || []).map(normalizeRuralSpot);
    if (!candidates.length) throw Object.assign(new Error('该城市乡村点位库建设中'), { statusCode: 400, code: 'BAD_REQUEST' });
  } else if (mode === 'blend') {
    candidates = city.attractions.map((a) => Object.assign({ rural: false }, a))
      .concat(((rural && rural.spots) || []).map(normalizeRuralSpot));
  } else {
    candidates = city.attractions.map((a) => Object.assign({ rural: false }, a));
  }

  const pool = candidates
    .map((a) => ({ a, s: scoreAttraction(a, !!preferHeritage, crowd, mode) }))
    .sort((x, y) => y.s - x.s)
    .map((x) => x.a);

  const dayPlans = [];
  for (let d = 0; d < nDays; d++) {
    const perDay = Math.min(mode === 'rural' ? Math.min(3, rule.dailySpots) : rule.dailySpots, pool.length);
    const spots = [];
    for (let i = 0; i < perDay; i++) {
      const idx = (d * perDay + i) % pool.length;
      if (!spots.includes(pool[idx])) spots.push(pool[idx]);
    }
    dayPlans.push(buildDay(city, cityId, d, spots, rule, mode));
  }

  const result = {
    city: { id: city.id, name: city.name, tagline: city.tagline },
    mode,
    modeLabel: MODES[mode].label,
    modeTip: MODES[mode].tip,
    crowd: rule.label,
    preferHeritage: !!preferHeritage,
    crowdTip: rule.tip,
    days: dayPlans
  };

  return llm.chat([
    { role: 'system', content: '你是地方文旅导览专家，输出50字以内的行程总导语，突出非遗与乡村体验亮点，不要列清单，不要使用markdown。' },
    { role: 'user', content: '目的地' + city.name + '，' + nDays + '天' + rule.label + '出行，' + MODES[mode].label + '线路，' + (preferHeritage ? '优先非遗体验。' : '常规观光。') + '涉及点位：' + dayPlans.map((d) => d.theme).join('；') }
  ], { temperature: 0.7, maxTokens: 120 })
    .then((intro) => {
      result.intro = intro || ('本次为' + rule.label + '游客规划' + city.name + ' ' + nDays + '日' + MODES[mode].label + '行程，' + (mode !== 'city' ? '已将乡村振兴示范村、非遗工坊与' : '已将非遗展馆、非遗展演与') + '手作体验点嵌入每日安排，愿你在旅途中读懂这座城市的手艺与烟火。');
      return result;
    });
}

module.exports = { plan };
