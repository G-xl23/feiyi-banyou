'use strict';
/**
 * 城市注册表（数据层统一入口）
 *
 * 目标：把"系统支持哪些城市"这件事收敛到一处，任何模块都不再硬编码城市名或城市数量。
 * 这样一来，新增一座城市只需要：
 *   ① 在 data/heritage.js 增加城市条目（非遗 / 景点 / 美食 / 民俗）
 *   ② 在 data/rural.js  增加对应条目（乡村点位 / 非遗工坊 / 乡村好物 / 农事体验 / 村宿 / 公开统计）
 *   ③ 在 data/regions.js 增加区县归属表
 *   ④ 在 data/cities.meta.js 登记城市别名与省份（用于自然语言识别）
 *   ⑤ 运行 node scripts/validate-data.js 校验数据完整性
 * 前端下拉、看板地区选项、调度器城市识别、就绪接口全部自动跟随，无需改代码。
 */
const heritageDb = require('./heritage');
const ruralDb = require('./rural');
const regions = require('./regions');
const cityMeta = require('./cities.meta');

/** 全部已收录城市 id（顺序即前端下拉顺序） */
function cityIds() {
  return Object.keys(heritageDb.cities);
}

/** 默认城市（未在问题中识别到城市时的兜底） */
function defaultCityId() {
  return cityIds()[0];
}

/** 取城市数据对象；不存在返回 null */
function city(cityId) {
  return heritageDb.cities[cityId] || null;
}

/** 取城市数据对象；不存在抛出 400（供路由/Agent 使用，绝不 500） */
function assertCity(cityId) {
  const c = city(cityId);
  if (!c) {
    throw Object.assign(new Error('暂不支持该目的地，请选择已收录城市（当前支持：' + displayNames().join('、') + '）'), {
      statusCode: 400,
      code: 'BAD_REQUEST'
    });
  }
  return c;
}

/** 取乡村数据对象；不存在返回 null */
function rural(cityId) {
  return ruralDb[cityId] || null;
}

/** 城市中文名列表 */
function displayNames() {
  return cityIds().map((id) => heritageDb.cities[id].name);
}

/**
 * 城市别名（含古称与下辖区县市），用于自然语言中的地名识别。
 * 区县名会同时登记"带行政后缀"与"去掉后缀"两种形式，
 * 这样「常熟有什么非遗」「德化白瓷工坊」这类只说地名的问法也能命中。
 */
const ADMIN_SUFFIX = /[市区县]$/;
function aliasesOf(cityId) {
  const meta = cityMeta[cityId];
  const list = [cityId];
  if (meta && Array.isArray(meta.aliases)) list.push.apply(list, meta.aliases);
  regions.countiesOf(cityId).forEach((county) => {
    list.push(county);
    const stem = county.replace(ADMIN_SUFFIX, '');
    if (stem.length >= 2 && stem !== county) list.push(stem);
  });
  return list;
}

/**
 * 从文本中识别城市：遍历全部城市的全部别名做包含匹配，取"最长命中别名"所属城市。
 * 取最长而非首个，是为了避免短别名误伤（如"潮汕"与"潮州"并存时以更具体的为准）。
 * 未命中返回 null，由调用方决定兜底策略。
 */
function detectCity(text) {
  const q = String(text || '');
  if (!q) return null;
  let best = null;
  let bestLen = 0;
  cityIds().forEach((id) => {
    aliasesOf(id).forEach((alias) => {
      if (alias && alias.length > bestLen && q.indexOf(alias) >= 0) {
        best = id;
        bestLen = alias.length;
      }
    });
  });
  return best;
}

/** 是否已收录该城市 */
function hasCity(cityId) {
  return !!heritageDb.cities[cityId];
}

/** 从文本中识别出全部被提及的城市（按出现顺序，去重），用于横向对比场景 */
function detectCities(text) {
  const q = String(text || '');
  const hits = [];
  cityIds().forEach((id) => {
    const matched = aliasesOf(id).some((alias) => alias && q.indexOf(alias) >= 0);
    if (matched) hits.push(id);
  });
  return hits;
}

/** 某市已收录的区县列表（供看板地区选项） */
function counties(cityId) {
  return regions.countiesOf(cityId);
}

/** 元信息：供前端与就绪接口使用 */
function listCities() {
  return cityIds().map((id) => {
    const c = heritageDb.cities[id];
    const r = ruralDb[id] || {};
    const meta = cityMeta[id] || {};
    return {
      id,
      name: c.name,
      province: meta.province || '',
      tagline: c.tagline,
      intro: c.intro,
      counts: {
        heritages: c.heritages.length,
        attractions: c.attractions.length,
        foods: c.foods.length,
        ruralSpots: (r.spots || []).length,
        workshops: (r.workshops || []).length
      },
      counties: regions.countiesOf(id),
      attractions: c.attractions.map((a) => ({ name: a.name, type: a.type })),
      heritages: c.heritages.map((h) => ({ id: h.id, name: h.name, category: h.category, level: h.level }))
    };
  });
}

/**
 * 数据完整性审计：新增城市后跑一遍，把"漏字段 / 错误引用 / 名称不一致"一次性找出来。
 * 返回 { ok, errors[], warnings[], stats }，不抛异常（由脚本决定退出码）。
 */
function auditData() {
  const errors = [];
  const warnings = [];

  cityIds().forEach((id) => {
    const c = heritageDb.cities[id];
    const r = ruralDb[id];
    const prefix = '[' + id + '] ';

    ['name', 'tagline', 'intro'].forEach((f) => {
      if (!c[f]) errors.push(prefix + 'heritage.js 缺少字段 ' + f);
    });
    if (!Array.isArray(c.heritages) || !c.heritages.length) errors.push(prefix + 'heritage.js 未提供 heritages');
    if (!Array.isArray(c.attractions) || !c.attractions.length) errors.push(prefix + 'heritage.js 未提供 attractions');
    if (!Array.isArray(c.foods) || !c.foods.length) errors.push(prefix + 'heritage.js 未提供 foods（行程规划与美食 Agent 依赖）');
    if (!Array.isArray(c.customs) || !c.customs.length) errors.push(prefix + 'heritage.js 未提供 customs');

    if (!r) {
      errors.push(prefix + 'rural.js 缺少该城市（乡村产业赋能与振兴看板依赖）');
      return;
    }
    ['spots', 'workshops', 'products', 'farm', 'stays'].forEach((f) => {
      if (!Array.isArray(r[f]) || !r[f].length) errors.push(prefix + 'rural.js 未提供 ' + f);
    });
    if (!Array.isArray(r.stats) || !r.stats.length) warnings.push(prefix + 'rural.js 未提供 stats（看板将缺少公开统计数据卡）');
    (r.stats || []).forEach((s, i) => {
      if (!s.source) errors.push(prefix + 'rural.js stats[' + i + '] 缺少 source（宏观数据必须标注来源）');
    });

    // 非遗项目完整性 + id 唯一性
    const seen = {};
    c.heritages.forEach((h) => {
      if (!h.id || !h.name) errors.push(prefix + '非遗项目缺少 id/name');
      if (seen[h.id]) errors.push(prefix + '非遗 id 重复：' + h.id);
      seen[h.id] = true;
      ['category', 'level', 'summary'].forEach((f) => {
        if (!h[f]) errors.push(prefix + h.id + ' 缺少字段 ' + f);
      });
      if (!Array.isArray(h.masters) || !h.masters.length) warnings.push(prefix + h.id + ' 未登记传承人（HLI 的传承人维度将记 0 分）');
      if (!Array.isArray(h.experienceSpots) || !h.experienceSpots.length) warnings.push(prefix + h.id + ' 未登记体验点位（HLI 的体验维度将记 0 分）');
    });

    // 引用完整性：景点 → 非遗
    c.attractions.forEach((a) => {
      (a.heritageRefs || []).forEach((ref) => {
        if (!seen[ref]) errors.push(prefix + '景点「' + a.name + '」引用了不存在的非遗 id：' + ref);
      });
      if (!a.type || !a.area) errors.push(prefix + '景点「' + a.name + '」缺少 type/area');
    });

    // 乡村点位 → 非遗、区县
    const countyList = regions.countiesOf(id);
    (r.spots || []).forEach((s) => {
      (s.heritageRefs || []).forEach((ref) => {
        if (!seen[ref]) errors.push(prefix + '乡村点位「' + s.name + '」引用了不存在的非遗 id：' + ref);
      });
      if (countyList.length && countyList.indexOf(s.county) < 0) {
        errors.push(prefix + '乡村点位「' + s.name + '」的 county「' + s.county + '」未登记在 regions.js');
      }
      if (!s.durationMin) warnings.push(prefix + '乡村点位「' + s.name + '」缺少 durationMin');
    });

    // 工坊 → 非遗、区县、products/experience
    (r.workshops || []).forEach((w) => {
      if (!seen[w.heritageId]) errors.push(prefix + '工坊「' + w.name + '」的 heritageId 不存在：' + w.heritageId);
      if (countyList.length && countyList.indexOf(w.county) < 0) {
        errors.push(prefix + '工坊「' + w.name + '」的 county「' + w.county + '」未登记在 regions.js');
      }
      if (!Array.isArray(w.products) || !w.products.length) errors.push(prefix + '工坊「' + w.name + '」缺少 products');
      if (!Array.isArray(w.painPoints) || !w.painPoints.length) warnings.push(prefix + '工坊「' + w.name + '」缺少 painPoints（渠道对策将为空）');
      (w.products || []).forEach((p, i) => {
        if (!p.name || !p.priceRange) errors.push(prefix + '工坊「' + w.name + '」products[' + i + '] 缺少 name/priceRange');
      });
    });

    // 乡村好物：定价模型依赖 costRef
    (r.products || []).forEach((p) => {
      const sum = p.costRef ? Object.keys(p.costRef).reduce((s, k) => s + p.costRef[k], 0) : 0;
      if (!p.costRef) warnings.push(prefix + '乡村好物「' + p.name + '」缺少 costRef（毛利体检将用 70% 默认值）');
      else if (Math.abs(sum - 1) > 0.02) errors.push(prefix + '乡村好物「' + p.name + '」costRef 合计应为 1（当前 ' + Math.round(sum * 100) / 100 + '）');
      if (!p.heritageNote) warnings.push(prefix + '乡村好物「' + p.name + '」缺少 heritageNote');
    });

    // regions.js 中登记的每一个非遗 id 必须真实存在
    Object.keys((regions.regions[id] || {}).heritage || {}).forEach((hid) => {
      if (!seen[hid]) errors.push(prefix + 'regions.js 登记了不存在的非遗 id：' + hid);
    });

    // 城市别名
    const aliases = aliasesOf(id);
    if (aliases.length <= 1) warnings.push(prefix + 'cities.meta.js 未登记别名，该城市在自然语言中将难以被识别');
  });

  // rural.js / regions.js 中存在但 heritage.js 未登记的城市
  Object.keys(ruralDb).forEach((id) => {
    if (!heritageDb.cities[id]) errors.push('rural.js 中的城市「' + id + '」未在 heritage.js 登记');
  });

  // 跨城市别名冲突：同一别名命中多个城市时，detectCity 结果取决于注册顺序（最长别名优先可部分缓解，仍应去重）
  const aliasOwner = {};
  cityIds().forEach((id) => {
    aliasesOf(id).forEach((a) => {
      const key = String(a);
      if (aliasOwner[key] && aliasOwner[key] !== id) {
        warnings.push('别名「' + key + '」同时属于 ' + aliasOwner[key] + ' 与 ' + id + '，城市识别存在歧义，建议为其中一方更换更具体的别名');
      } else if (!aliasOwner[key]) {
        aliasOwner[key] = id;
      }
    });
  });

  const stats = cityIds().map((id) => {
    const c = heritageDb.cities[id];
    const r = ruralDb[id] || {};
    return {
      city: c.name,
      heritages: c.heritages.length,
      attractions: c.attractions.length,
      foods: c.foods.length,
      customs: c.customs.length,
      ruralSpots: (r.spots || []).length,
      workshops: (r.workshops || []).length,
      products: (r.products || []).length,
      farm: (r.farm || []).length,
      stays: (r.stays || []).length,
      stats: (r.stats || []).length,
      counties: regions.countiesOf(id).length
    };
  });

  return { ok: errors.length === 0, errors, warnings, stats };
}

module.exports = {
  cityIds,
  defaultCityId,
  city,
  assertCity,
  rural,
  hasCity,
  displayNames,
  aliasesOf,
  detectCity,
  detectCities,
  counties,
  listCities,
  auditData
};
