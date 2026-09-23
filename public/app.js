'use strict';
/**
 * 前端交互层：调用后端 Agent 接口并渲染结果。
 * API base 通过 window.__API_BASE__ 可覆盖（便于分离部署）。
 */
const API = (window.__API_BASE__ || '/api').replace(/\/$/, '');

const state = { cities: [], activeCity: 'quanzhou' };

/* ---------------- 基础工具 ---------------- */
async function api(path, options) {
  const res = await fetch(API + path, Object.assign({
    headers: { 'Content-Type': 'application/json' }
  }, options || {}));
  const data = await res.json().catch(() => ({ ok: false, message: '响应解析失败' }));
  if (!res.ok || data.ok === false) {
    throw new Error(data.message || ('请求失败(' + res.status + ')'));
  }
  return data;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function loading(el, text) {
  el.innerHTML = '<div class="loading">' + esc(text || '智能体正在协同处理…') + '</div>';
}

function setBusy(btn, busy) {
  if (!btn) return;
  btn.disabled = busy;
}

/* ---------------- 城市与联动 ---------------- */
const CITY_SELECT_IDS = ['planCity', 'guideCity', 'foodCity', 'kbCity', 'aigcCity', 'industryCity', 'insightCity', 'staffChatCity'];

function fillCitySelects() {
  CITY_SELECT_IDS.forEach((id) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = state.cities
      .map((c) => '<option value="' + c.id + '">' + esc(c.name) + (c.province ? '（' + esc(c.province) + '）' : '') + '</option>')
      .join('');
  });
  const profCity = document.getElementById('profCity');
  profCity.innerHTML = '<option value="">不限（全部目的地）</option>' +
    state.cities.map((c) => '<option value="' + c.id + '">' + esc(c.name) + '</option>').join('');
  profCity.value = profStore.tourist.city || '';
  const staffCity = document.getElementById('profStaffCity');
  staffCity.innerHTML = '<option value="">全部区县</option>' +
    state.cities.map((c) => '<option value="' + c.id + '">' + esc(c.name) + '</option>').join('');
  staffCity.value = profStore.staff.city || '';
  syncScopeCounties('insightCity', 'insightCounty');
  syncScopeCounties('staffChatCity', 'staffChatCounty');
  syncGuideDatalist();
  syncAigcHeritage();
  syncIndustryWorkshops();
  renderChips();
  renderStaffPrompts();
}

function cityById(id) {
  return state.cities.find((c) => c.id === id) || state.cities[0];
}

/* ---------------- 地区范围（看板 / 政务对话） ---------------- */
// 区县列表来自 /api/cities 的 counties 字段（后端 regions.js），新增城市自动跟随
function scopeLabelOf(citySelId, countySelId) {
  const city = cityById(document.getElementById(citySelId).value);
  const county = document.getElementById(countySelId).value;
  return county ? city.name + ' · ' + county : city.name + ' · 全部地区';
}

function syncScopeCounties(citySelId, countySelId) {
  const city = cityById(document.getElementById(citySelId).value);
  const sel = document.getElementById(countySelId);
  const prev = sel.value;
  const counties = city.counties || [];
  sel.innerHTML = '<option value="">全部地区</option>' +
    counties.map((c) => '<option value="' + esc(c) + '">' + esc(c) + '</option>').join('');
  sel.value = prev && counties.indexOf(prev) >= 0 ? prev : '';
  updateScopeHint(citySelId, countySelId);
}

function updateScopeHint(citySelId, countySelId) {
  const label = scopeLabelOf(citySelId, countySelId);
  const el = document.getElementById(citySelId === 'insightCity' ? 'insightScopeHint' : 'staffChatScopeHint');
  if (!el) return;
  el.textContent = (citySelId === 'insightCity' ? '当前口径：' : '当前范围：') + label;
}

function syncGuideDatalist() {
  const city = cityById(document.getElementById('guideCity').value);
  document.getElementById('attractionList').innerHTML =
    city.attractions.map((a) => '<option value="' + esc(a.name.split('（')[0]) + '"></option>').join('');
}

function syncAigcHeritage() {
  const city = cityById(document.getElementById('aigcCity').value);
  document.getElementById('aigcHeritage').innerHTML =
    city.heritages.map((h) => '<option value="' + esc(h.name) + '">' + esc(h.name) + '（' + esc(h.category) + '）</option>').join('');
}

async function syncIndustryWorkshops() {
  const cityId = document.getElementById('industryCity').value;
  try {
    const res = await api('/rural/workshops?cityId=' + encodeURIComponent(cityId));
    document.getElementById('industryWorkshop').innerHTML =
      (res.workshops || []).map((w) => '<option value="' + esc(w.id) + '">' + esc(w.name) + '（' + esc(w.heritageName) + '）</option>').join('');
  } catch (err) {
    document.getElementById('industryWorkshop').innerHTML = '<option value="">工坊数据加载失败</option>';
  }
}

function renderChips() {
  const city = cityById(document.getElementById('kbCity').value);
  document.getElementById('kbChips').innerHTML = city.heritages
    .map((h) => '<span class="chip" data-h="' + esc(h.name) + '">' + esc(h.name) + '</span>')
    .join('');
}

/* ---------------- 智能对话（游客侧 / 工作人员侧共用同一套渲染） ---------------- */
const chatBox = document.getElementById('chatBox');
const staffChatBox = document.getElementById('staffChatBox');

function pushMsgInto(box, role, text, agent) {
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  div.innerHTML = (agent ? '<span class="agent-tag">🤖 ' + esc(agent) + '</span>' : '') + esc(text);
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  return div;
}

function pushMsg(role, text, agent) {
  return pushMsgInto(chatBox, role, text, agent);
}

function renderChatResult(d) {
  const agent = d.agent;
  const data = d.data;
  if (data && data.hint) return data.hint;
  if (data && data.answer) return data.answer + (data.related && data.related.length ? '\n\n相关项目：' + data.related.join('、') : '');
  if (data && data.intro && data.foods) {
    return data.intro + '\n\n' + data.foods.map((f) => '· ' + f.name + '：' + f.desc).join('\n');
  }
  if (data && data.found) {
    const lines = [data.attraction.name + '｜' + data.attraction.type + '｜' + data.attraction.area, data.history];
    (data.heritage || []).forEach((h) => lines.push('【关联非遗】' + h.name + '（' + h.level + '）\n' + h.story));
    if (data.followUp) lines.push(data.followUp);
    return lines.join('\n\n');
  }
  return JSON.stringify(data);
}

/* ---------------- 多智能体协作链路可视化（SSE，两种身份共用） ---------------- */
const orchTrace = document.getElementById('orchTrace');
const staffTrace = document.getElementById('staffTrace');

const STEP_LABEL = {
  'dispatch-start': '📥 调度器接收输入',
  'intent': '🧭 意图识别（城市 / 景点 / 规则匹配）',
  'agent-start': '⚙️ Agent 开始处理',
  'agent-done': '✅ Agent 处理完成'
};

function cityName(id) {
  const c = state.cities.find((x) => x.id === id);
  return c ? c.name : (id || '默认城市');
}

function renderTraceEvent(ev, target) {
  let line = '';
  if (ev.step === 'intent') {
    // 城市名由后端回传 / 前端城市表解析，新增城市无需改动这里
    const bits = ['城市：' + (ev.cityName || cityName(ev.cityId))];
    if (ev.attraction) bits.push('景点命中：' + ev.attraction);
    bits.push('规则命中：' + (ev.matchedRule || '默认知识库'));
    line = STEP_LABEL.intent + ' → 分派「' + ev.agent + '」<br><span class="muted">' + bits.map(esc).join(' · ') + '</span>';
  } else if (ev.step === 'agent-done') {
    line = STEP_LABEL['agent-done'] + '（' + esc(ev.agent) + '，耗时 ' + ev.ms + 'ms）';
  } else if (STEP_LABEL[ev.step]) {
    line = STEP_LABEL[ev.step] + (ev.agent ? '：' + esc(ev.agent) : '');
  } else {
    line = esc(ev.step);
  }
  const item = document.createElement('div');
  item.className = 'trace-item';
  item.innerHTML = '<span class="trace-dot"></span>' + line;
  target.appendChild(item);
}

function resetTrace(target) {
  target.hidden = false;
  target.innerHTML = '<div class="trace-title">多智能体协作链路（实时）</div>';
}

/**
 * 统一的"提问 → SSE 实时链路 → 结果"流程；SSE 不可用时降级为 POST /chat。
 * cfg: { message, audience, cityId, county, focus, traceEl, fallbackBody, onFinal, onError }
 */
function askViaStream(cfg) {
  const params = new URLSearchParams({ message: cfg.message });
  if (cfg.audience) params.set('audience', cfg.audience);
  if (cfg.cityId) params.set('cityId', cfg.cityId);
  if (cfg.county) params.set('county', cfg.county);
  if (cfg.focus) params.set('focus', cfg.focus);

  resetTrace(cfg.traceEl);
  const es = new EventSource(API + '/orchestrate/stream?' + params.toString());
  let failed = false;
  es.addEventListener('step', (e) => {
    try { renderTraceEvent(JSON.parse(e.data), cfg.traceEl); } catch (_) {}
  });
  es.addEventListener('final', (e) => {
    es.close();
    try { cfg.onFinal(JSON.parse(e.data)); } catch (err) { cfg.onError(err); }
  });
  es.addEventListener('error', (e) => {
    if (e.data) {
      es.close();
      try { cfg.onError(JSON.parse(e.data)); } catch (_) { cfg.onError({ message: '服务异常' }); }
    } else if (!failed && es.readyState === EventSource.CLOSED) {
      failed = true;
      es.close();
      // SSE 不可用（如代理缓冲）→ 降级为普通对话
      api('/chat', { method: 'POST', body: JSON.stringify(cfg.fallbackBody) })
        .then((res) => cfg.onFinal(res.data))
        .catch((err) => cfg.onError({ message: err.message }));
    }
  });
}

document.getElementById('chatForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('chatInput');
  const q = input.value.trim();
  if (!q) return;
  pushMsg('user', q);
  input.value = '';
  const wait = pushMsg('bot', '调度智能体中…');
  askViaStream({
    message: q,
    traceEl: orchTrace,
    fallbackBody: { message: q },
    onFinal: (res) => {
      wait.innerHTML = '<span class="agent-tag">🤖 ' + esc(res.agent) + '</span>' + esc(renderChatResult(res));
      chatBox.scrollTop = chatBox.scrollHeight;
    },
    onError: (err) => { wait.textContent = '⚠️ ' + (err.message || '请求失败'); }
  });
});

/* ---------------- Agent 1 行程规划 ---------------- */
function renderPlan(d) {
  const html = [];
  html.push('<div class="block"><h3>' + esc(d.city.name) + ' · ' + esc(d.modeLabel) + ' · ' + esc(d.crowd) + '出行 ' + d.days.length + ' 天 <span class="tag">' + (d.preferHeritage ? '已优先嵌入非遗体验' : '常规观光') + '</span></h3>' +
    '<p>' + esc(d.intro) + '</p>' +
    '<p class="muted" style="margin-top:8px">线路提示：' + esc(d.modeTip) + '</p>' +
    '<p class="muted">出行提示：' + esc(d.crowdTip) + '</p></div>');

  d.days.forEach((day) => {
    const slots = day.schedule.map((s) => {
      const links = (s.heritageLinks || []).map((h) =>
        '<div class="heritage-note"><b>关联非遗 · ' + esc(h.name) + '</b><br>' + esc(h.level) + '<br>' + esc(h.summary) + '</div>').join('');
      const highlights = (s.highlights && s.highlights.length)
        ? '<div class="meta">亮点：' + esc(s.highlights.join(' · ')) + (s.bestSeason ? '｜最佳季节：' + esc(s.bestSeason) : '') + '</div>' : '';
      return '<div class="slot"><b>' + esc(s.slot) + '｜' + esc(s.name) + '</b> <span class="tag ' + (s.heritageLinks && s.heritageLinks.length ? 'red' : '') + '">' + esc(s.kind) + '</span>' +
        '<div class="meta">类型：' + esc(s.type) + '｜区域：' + esc(s.address) + '｜建议时长：' + esc(s.duration) + '</div>' +
        '<p>' + esc(s.desc) + '</p>' + highlights + links + '</div>';
    }).join('');
    const meals = day.meals.map((m) =>
      '<div class="slot"><b>' + esc(m.meal) + '｜' + esc(m.name) + '</b><p>' + esc(m.desc) + '</p><p class="muted">' + esc(m.heritageNote) + '</p></div>').join('');
    const stay = day.stay
      ? '<div class="slot"><b>🏠 住宿建议｜' + esc(day.stay.name) + '</b> <span class="tag">' + esc(day.stay.priceRange) + '</span><div class="meta">' + esc(day.stay.area) + '</div><p>' + esc(day.stay.desc) + '</p></div>'
      : '';
    const picks = (day.ruralPicks && day.ruralPicks.length)
      ? '<div class="slot"><b>🛍 今日乡村好物</b>' + day.ruralPicks.map((p) =>
          '<div class="heritage-note"><b>' + esc(p.name) + '</b>（' + esc(p.priceRange) + '）<br>' + esc(p.heritageNote) + '</div>').join('') + '</div>'
      : '';
    html.push('<div><div class="day-head">第 ' + day.day + ' 天 · ' + esc(day.theme) + '</div><div class="day-body">' + slots +
      '<div class="slot"><b>🍽 餐饮安排</b></div>' + meals + stay + picks + '</div></div>');
  });
  return html.join('');
}

const planForm = document.getElementById('planForm');
planForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = planForm.querySelector('button[type="submit"]');
  const box = document.getElementById('planResult');
  loading(box, '旅行规划Agent 正在匹配景点与非遗点位…');
  setBusy(btn, true);
  try {
    const res = await api('/plan', {
      method: 'POST',
      body: JSON.stringify({
        cityId: document.getElementById('planCity').value,
        days: Number(document.getElementById('planDays').value),
        crowd: document.getElementById('planCrowd').value,
        mode: document.getElementById('planMode').value,
        preferHeritage: document.getElementById('planHeritage').checked
      })
    });
    const line = '<div class="block profile-line">🎯 本方案已按你的画像定制：<b>' + esc(profStore.tourist.name) + '</b> · ' + esc(profStore.tourist.role) +
      (profStore.tourist.city ? ' · 关注 ' + esc((cityById(profStore.tourist.city) || {}).name || '') : '') +
      (profStore.tourist.pref ? ' · 偏好：' + esc(profStore.tourist.pref) : '') + '</div>';
    box.innerHTML = line + renderPlan(res.data);
  } catch (err) {
    box.innerHTML = '<div class="block"><p>⚠️ ' + esc(err.message) + '</p></div>';
  } finally {
    setBusy(btn, false);
  }
});

document.getElementById('planRegen').addEventListener('click', () => {
  const days = document.getElementById('planDays');
  days.value = (Number(days.value) % 7) + 1; // 变更天数触发新的组合，体现"一键重新生成"
  planForm.dispatchEvent(new Event('submit', { cancelable: true }));
});

/* ---------------- Agent 2 景点讲解 ---------------- */
document.getElementById('guideForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const box = document.getElementById('guideResult');
  const btn = e.target.querySelector('button[type="submit"]');
  loading(box, '讲解Agent 正在检索景点与关联非遗资料…');
  setBusy(btn, true);
  try {
    const res = await api('/guide', {
      method: 'POST',
      body: JSON.stringify({
        cityId: document.getElementById('guideCity').value,
        attraction: document.getElementById('guideAttraction').value
      })
    });
    const d = res.data;
    if (!d.found) {
      box.innerHTML = '<div class="block"><h3>未收录提示</h3><p>' + esc(d.message) + '</p>' +
        (d.llmNote ? '<p class="muted" style="margin-top:8px">' + esc(d.llmNote) + '</p>' : '') + '</div>';
      return;
    }
    const heritage = (d.heritage || []).map((h) =>
      '<div class="heritage-note"><b>' + esc(h.name) + '</b> <span class="tag">' + esc(h.category) + '</span><br>' + esc(h.level) + '<br>' + esc(h.story) +
      (h.experienceSpots && h.experienceSpots.length ? '<br>📍 ' + h.experienceSpots.map((s) => esc(s.name) + '（' + esc(s.address) + '）｜' + esc(s.openTime)).join('<br>📍 ') : '') +
      '</div>').join('');
    box.innerHTML =
      '<div class="block"><h3>' + esc(d.attraction.name) + ' <span class="tag red">' + esc(d.attraction.type) + '</span></h3>' +
      '<p class="muted">区域：' + esc(d.attraction.area) + '｜建议游玩：' + esc(d.attraction.suggestedDuration) + ' 分钟</p>' +
      '<p style="margin-top:8px"><b>① 景点历史</b><br>' + esc(d.history) + '</p></div>' +
      '<div class="block"><h3>② 关联非遗与民俗解读</h3>' + (heritage || '<p class="muted">该景点暂无直接关联的非遗项目，可前往知识库查询全城非遗清单。</p>') +
      (d.narration ? '<p style="margin-top:10px"><b>🎙 现场口语讲解</b><br>' + esc(d.narration) + '</p>' : '') + '</div>';
  } catch (err) {
    box.innerHTML = '<div class="block"><p>⚠️ ' + esc(err.message) + '</p></div>';
  } finally {
    setBusy(btn, false);
  }
});

/* ---------------- Agent 3 美食民俗 ---------------- */
document.getElementById('foodForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const box = document.getElementById('foodResult');
  const btn = e.target.querySelector('button[type="submit"]');
  loading(box, '美食民俗Agent 正在整理地道味道与饮食非遗…');
  setBusy(btn, true);
  try {
    const res = await api('/food', { method: 'POST', body: JSON.stringify({ cityId: document.getElementById('foodCity').value }) });
    const d = res.data;
    box.innerHTML = '<div class="block"><h3>' + esc(d.city.name) + '美食地图</h3><p>' + esc(d.intro) + '</p></div>' +
      '<div class="block"><h3>必吃清单</h3>' + d.foods.map((f) =>
        '<div class="slot"><b>' + esc(f.name) + '</b> ' + (f.isMustTry ? '<span class="tag red">必吃</span>' : '') +
        '<p>' + esc(f.desc) + '</p><div class="heritage-note">非遗/民俗背景：' + esc(f.heritageNote) + '</div></div>').join('') + '</div>' +
      '<div class="block"><h3>民俗活动</h3><ul>' + d.customs.map((c) => '<li><b>' + esc(c.name) + '</b>：' + esc(c.desc) + '</li>').join('') + '</ul></div>';
  } catch (err) {
    box.innerHTML = '<div class="block"><p>⚠️ ' + esc(err.message) + '</p></div>';
  } finally {
    setBusy(btn, false);
  }
});

/* ---------------- Agent 4 非遗知识库 ---------------- */
document.getElementById('kbChips').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  document.getElementById('kbQuestion').value = chip.dataset.h + '在哪里可以体验？是什么级别？';
  document.getElementById('kbForm').dispatchEvent(new Event('submit', { cancelable: true }));
});

document.getElementById('kbForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const box = document.getElementById('kbResult');
  const btn = e.target.querySelector('button[type="submit"]');
  loading(box, '非遗知识库Agent 正在检索本地知识库…');
  setBusy(btn, true);
  try {
    const res = await api('/heritage/query', {
      method: 'POST',
      body: JSON.stringify({ cityId: document.getElementById('kbCity').value, question: document.getElementById('kbQuestion').value })
    });
    const d = res.data;
    const srcLabel = d.source === 'knowledge-base' ? '本地知识库直答' : (d.source === 'llm-with-kb-context' ? '大模型 + 知识库上下文' : '未命中知识库');
    box.innerHTML = '<div class="block"><h3>答案 <span class="tag ' + (d.source === 'knowledge-base' ? 'red' : '') + '">' + esc(srcLabel) + '</span></h3>' +
      '<p>' + esc(d.answer).replace(/\n/g, '<br>') + '</p>' +
      (d.related && d.related.length ? '<p class="muted" style="margin-top:8px">相关项目：' + esc(d.related.join('、')) + '</p>' : '') + '</div>';
  } catch (err) {
    box.innerHTML = '<div class="block"><p>⚠️ ' + esc(err.message) + '</p></div>';
  } finally {
    setBusy(btn, false);
  }
});

/* ---------------- Agent 5 AIGC ---------------- */
document.getElementById('aigcForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const box = document.getElementById('aigcResult');
  const btn = e.target.querySelector('button[type="submit"]');
  loading(box, 'AIGC文创Agent 正在创作…');
  setBusy(btn, true);
  try {
    const res = await api('/aigc', {
      method: 'POST',
      body: JSON.stringify({
        cityId: document.getElementById('aigcCity').value,
        type: document.getElementById('aigcType').value,
        heritage: document.getElementById('aigcHeritage').value
      })
    });
    const d = res.data;
    box.innerHTML = '<div class="block"><h3>' + esc(d.typeLabel) + ' · ' + esc(d.heritage) + '</h3>' +
      '<p class="muted">生成方式：' + esc(d.generator) + '</p>' +
      '<p style="margin-top:10px">' + esc(d.content).replace(/\n/g, '<br>') + '</p></div>';
  } catch (err) {
    box.innerHTML = '<div class="block"><p>⚠️ ' + esc(err.message) + '</p></div>';
  } finally {
    setBusy(btn, false);
  }
});

/* ---------------- Agent 6 乡村产业赋能 ---------------- */
document.getElementById('industryForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const box = document.getElementById('industryResult');
  const btn = e.target.querySelector('button[type="submit"]');
  loading(box, '乡村产业赋能Agent 正在分析工坊经营数据…');
  setBusy(btn, true);
  try {
    const res = await api('/rural/empower', {
      method: 'POST',
      body: JSON.stringify({
        cityId: document.getElementById('industryCity').value,
        workshopId: document.getElementById('industryWorkshop').value
      })
    });
    const line = '<div class="block profile-line">🏛 赋能方案按你的工作重点生成：<b>' + esc(profStore.staff.name) + '</b> · ' + esc(profStore.staff.dept) +
      ' · 关注重点：' + esc(profStore.staff.focus) + '</div>';
    box.innerHTML = line + renderIndustry(res.data);
  } catch (err) {
    box.innerHTML = '<div class="block"><p>⚠️ ' + esc(err.message) + '</p></div>';
  } finally {
    setBusy(btn, false);
  }
});

function renderIndustry(d) {
  const p = d.pricing || {};
  const ws = d.workshop || {};
  const tiers = (p.tiers || []).map((t) =>
    '<div class="slot"><b>' + esc(t.tier) + '｜建议 ' + esc(String(t.price)) + ' 元</b><p>' + esc(t.logic) + '</p><p class="muted">' + esc(t.grossCheck) + '</p></div>').join('');
  const remedies = (d.channelAdvice || []).map((r) =>
    '<div class="slot"><span class="tag red">痛点</span> <b>' + esc(r.pain) + '</b><p>→ ' + esc(r.fix) + '</p></div>').join('');
  const spots = ((d.linkage && d.linkage.spots) || []).map((s) => '· ' + esc(s.name) + '（' + esc(s.village) + '｜最佳：' + esc(s.bestSeason) + '）').join('<br>');
  const pos = d.positioning || {};
  return (
    '<div class="block"><h3>' + esc(ws.name) + ' <span class="tag red">赋能方案</span></h3>' +
    '<p class="muted">' + esc(ws.village) + '｜技艺：' + esc(ws.craft) + (ws.heritage ? '｜背书：' + esc(ws.heritage.name) + '（' + esc(ws.heritage.level) + '）' : '') + '</p>' +
    '<p style="margin-top:8px">' + esc(pos.statement || '') + '</p>' +
    '<p class="muted" style="margin-top:6px">' + esc(pos.crowd || '') + '</p></div>' +

    '<div class="block"><h3>① 定价建议（可解释）</h3><p class="muted">' + esc(p.formula || '') + '</p>' + tiers +
    (p.note ? '<p class="muted">' + esc(p.note) + '</p>' : '') + '</div>' +

    '<div class="block"><h3>② 电商详情页文案 <span class="tag">' + esc((d.ecommerceCopy || {}).generator || '') + '</span></h3>' +
    '<p style="white-space:pre-wrap">' + esc((d.ecommerceCopy || {}).content || '') + '</p></div>' +

    '<div class="block"><h3>③ 短视频口播脚本（30秒） <span class="tag">' + esc((d.videoScript || {}).generator || '') + '</span></h3>' +
    '<p style="white-space:pre-wrap">' + esc((d.videoScript || {}).content || '') + '</p></div>' +

    '<div class="block"><h3>④ 包装升级建议</h3><p style="white-space:pre-wrap">' + esc(d.packaging || '') + '</p></div>' +

    '<div class="block"><h3>⑤ 渠道痛点 → 对策</h3>' + (remedies || '<p class="muted">暂无</p>') + '</div>' +

    '<div class="block"><h3>⑥ 产销对接（体验引流 → 产地直邮）</h3><p>' + esc((d.linkage || {}).idea || '') + '</p>' +
    (spots ? '<p class="muted" style="margin-top:6px">可联动的乡村点位：</p><p>' + spots + '</p>' : '') +
    ((d.linkage || {}).experience ? '<p class="muted">体验项目：' + esc(d.linkage.experience.desc) + '｜' + esc(d.linkage.experience.price) + '｜约 ' + esc(String(d.linkage.experience.durationMin)) + ' 分钟</p>' : '') +
    '</div>'
  );
}

/* ---------------- Agent 7 乡村振兴看板 ---------------- */
let insightLoaded = false;

async function loadInsight(params) {
  const box = document.getElementById('insightResult');
  const cityId = document.getElementById('insightCity').value;
  const county = document.getElementById('insightCounty').value;
  box.innerHTML = '<div class="loading">乡村振兴运营洞察Agent 正在计算「' + esc(scopeLabelOf('insightCity', 'insightCounty')) + '」的指标…</div>';
  try {
    const body = { cityId, county: county || '' };
    if (params) body.params = params;
    const res = await api('/insight', { method: 'POST', body: JSON.stringify(body) });
    insightLoaded = true;
    const s = profStore.staff;
    const line = '<div class="block profile-line">🏛 本看板按你的工作重点呈现：<b>' + esc(s.name) + '</b> · ' + esc(s.dept) +
      ' · 关注重点：' + esc(s.focus) +
      (s.city ? ' · 关注区县：' + esc((cityById(s.city) || {}).name || '') : '') + '</div>';
    box.innerHTML = line + renderInsight(res.data);
    updateScopeHint('insightCity', 'insightCounty');
  } catch (err) {
    box.innerHTML = '<div class="block"><p>⚠️ ' + esc(err.message) + '</p><p class="muted">可切换其他区县，或把区县选为"全部地区"查看全市口径。</p></div>';
  }
}

function barRow(label, value, max, suffix, tag) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return '<div class="bar-row"><div class="bar-label">' + esc(label) + (tag ? ' <span class="tag">' + esc(tag) + '</span>' : '') + '</div>' +
    '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%"></div></div>' +
    '<div class="bar-val">' + esc(String(value)) + (suffix || '') + '</div></div>';
}

function moneyWan(n) { return (Math.round(n / 10000 * 10) / 10).toLocaleString('zh-CN'); }

function renderInsight(d) {
  const html = [];
  // ⓪ 数据口径（地区下钻说明）
  html.push('<div class="block"><h3>' + esc(d.scopeLabel || '') + ' <span class="tag red">数据口径</span></h3>' +
    '<p>' + esc(d.summary || '') + '</p>' +
    '<p class="muted" style="margin-top:6px">可下钻区县：' + ((d.counties || []).map(esc).join('、') || '暂无') +
    (d.county ? '；当前已按区县筛选，非遗、工坊、乡村点位均只统计归属该区县的条目。' : '；当前为全市口径。') +
    (d.revenue && d.revenue.scopeLabel ? ' 增收测算口径：' + esc(d.revenue.scopeLabel) + '。' : '') + '</p></div>');

  // ① 真实公开统计
  html.push('<div class="block"><h3>① 公开统计数据（附来源）</h3>' +
    '<div class="stat-grid">' + (d.stats || []).map((s) =>
      '<div class="stat-card"><b>' + esc(String(s.value)) + '<i>' + esc(s.unit || '') + '</i></b><span>' + esc(s.label) + '</span><p class="muted">' + esc(s.note || '') + '</p><p class="muted src">来源：' + esc(s.source) + '</p></div>').join('') +
    '</div></div>');

  // ② HLI 指数排行
  const rows = (d.hli && d.hli.rows) || [];
  const maxScore = Math.max(1, ...rows.map((r) => r.total));
  html.push('<div class="block"><h3>② 非遗活态传承指数（HLI）</h3><p class="muted">' + esc(d.hli.algorithm) + '</p>' +
    rows.map((r) => barRow(r.name, r.total, maxScore, ' 分', r.grade)).join('') + '</div>');

  // ③ 濒危预警
  html.push('<div class="block"><h3>③ 濒危预警清单</h3>' +
    ((d.alerts && d.alerts.length) ? d.alerts.map((a) =>
      '<div class="slot"><b>' + esc(a.name) + '</b> <span class="tag red">' + esc(a.grade) + ' · ' + a.score + '分</span>' +
      '<p>预警依据：' + esc(a.reasons.join('；')) + '</p></div>').join('')
      : '<p class="muted">当前全部项目指数不低于观察线，暂无预警项。</p>') + '</div>');

  // ④ 增收测算
  const r = d.revenue || {};
  html.push('<div class="block"><h3>④ 乡村文旅增收测算（三档情景）</h3><p class="muted">' + esc(r.formula || '') + '</p>' +
    '<div class="stat-grid">' + (r.scenarios || []).map((s) =>
      '<div class="stat-card"><b>' + esc(s.name) + '</b><span>年总收入约 ' + esc(s.totalWan.toLocaleString('zh-CN')) + ' 万元</span>' +
      '<p>体验收入 ' + moneyWan(s.expRevenue) + ' 万｜好物收入 ' + moneyWan(s.goodsRevenue) + ' 万</p>' +
      '<p class="muted">游客 ' + s.visitors.toLocaleString('zh-CN') + ' 人次｜带动就业约 ' + s.jobs + ' 人·天/口径</p>' +
      '<p class="muted src">' + esc(s.note) + '</p></div>').join('') + '</div>' +
    '<p class="muted" style="margin-top:8px">参数说明：' + esc((r.params || {}).ticketSource || '') + '；' + esc((r.params || {}).goodsPriceSource || '') + '；' + esc((r.params || {}).visitorsNote || '') + '</p>' +
    '<p class="muted">' + esc(r.disclaimer || '') + '</p></div>');

  // ⑤ 结构图表
  const c = d.charts || {};
  const maxLevel = Math.max(1, ...Object.values(c.levelDist || {}));
  const maxCat = Math.max(1, ...(c.categoryDist || []).map((x) => x.count));
  const maxCounty = Math.max(1, ...(c.workshopByCounty || []).map((x) => x.count));
  html.push('<div class="block"><h3>⑤ 非遗与工坊结构（可视化）</h3>' +
    '<p class="muted">非遗级别分布</p>' +
    Object.entries(c.levelDist || {}).map(([k, v]) => barRow(k, v, maxLevel, ' 项')).join('') +
    '<p class="muted" style="margin-top:10px">非遗类别分布</p>' +
    (c.categoryDist || []).map((x) => barRow(x.name, x.count, maxCat, ' 项')).join('') +
    '<p class="muted" style="margin-top:10px">非遗工坊区县分布（乡村点位 ' + (c.ruralSpots || 0) + ' 个 / 乡村好物 ' + (c.products || 0) + ' 种）</p>' +
    (c.workshopByCounty || []).map((x) => barRow(x.name, x.count, maxCounty, ' 家')).join('') + '</div>');

  // ⑥ 对策汇总
  html.push('<div class="block"><h3>⑥ 工坊共性问题与对策</h3>' +
    (d.remedies || []).map((x) =>
      '<div class="slot"><b>' + esc(x.pain) + '</b> <span class="tag">' + x.affected.length + ' 家工坊涉及</span><p>' + esc(x.advice) + '</p></div>').join('') + '</div>');

  return html.join('');
}

document.getElementById('revenueForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const params = {};
  const v = document.getElementById('revVisitors').value;
  const er = document.getElementById('revExpRate').value;
  const t = document.getElementById('revTicket').value;
  const gr = document.getElementById('revGoodsRate').value;
  const gp = document.getElementById('revGoodsPrice').value;
  if (v) params.visitors = Number(v);
  if (er) params.expRate = Number(er);
  if (t) params.ticket = Number(t);
  if (gr) params.goodsRate = Number(gr);
  if (gp) params.goodsPrice = Number(gp);
  loadInsight(params);
});

// 地区范围切换：换城市要重算区县列表，换区县后点"切换并刷新看板"生效
['insightCity', 'staffChatCity'].forEach((citySelId) => {
  const countySelId = citySelId === 'insightCity' ? 'insightCounty' : 'staffChatCounty';
  document.getElementById(citySelId).addEventListener('change', () => syncScopeCounties(citySelId, countySelId));
  document.getElementById(countySelId).addEventListener('change', () => updateScopeHint(citySelId, countySelId));
});
document.getElementById('insightReload').addEventListener('click', () => loadInsight());

/* ================= Agent 8 政务产业助手（工作人员侧智能对话体） ================= */
const STAFF_PROMPTS = [
  '帮我总结一下当前地区的非遗与产业情况',
  '哪些非遗项目最需要抢救？',
  '乡村文旅一年能增收多少？带动多少人就业？',
  'HLI 指数排行与偏弱指标',
  '本地工坊的经营痛点与对策有哪些？',
  '和其他城市比怎么样？'
];

function renderStaffPrompts() {
  const box = document.getElementById('staffPrompts');
  if (!box) return;
  box.innerHTML = STAFF_PROMPTS.map((q) => '<span class="chip" data-q="' + esc(q) + '">' + esc(q) + '</span>').join('');
}

document.getElementById('staffPrompts').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  document.getElementById('staffChatInput').value = chip.dataset.q;
  document.getElementById('staffChatForm').dispatchEvent(new Event('submit', { cancelable: true }));
});

// 归纳材料渲染：分层小节 + 可直接复制进汇报文档
function renderMaterial(d) {
  const box = document.getElementById('staffSummaryOut');
  const secs = (d.sections || []).map((s) =>
    '<div class="material-sec"><h4>' + esc(s.title) + '</h4><ul>' +
    (s.items || []).map((i) => '<li>' + esc(i) + '</li>').join('') + '</ul></div>').join('');
  box.innerHTML = '<div class="block" style="padding:0">' +
    '<div class="material-head"><h3>' + esc(d.title || '归纳材料') + '</h3>' +
    '<p class="muted">数据范围：' + esc(d.scopeLabel || '') + '｜生成时间：' +
    esc(new Date().toLocaleString('zh-CN', { hour12: false })) + '</p></div>' +
    '<div class="material-body">' + (secs || '<p class="muted">暂无可归纳内容</p>') +
    '<p class="material-foot">数据来源：本地知识库 + 已标注来源的公开统计；收入为情景推演，不构成统计数据。点击上方「复制材料」可直接粘贴进汇报文档。</p>' +
    '</div></div>';
}

function renderAdvisorInto(el, res) {
  const d = res.data || {};
  if (d.kind === 'summary') {
    el.innerHTML = '<span class="agent-tag">🤖 ' + esc(res.agent) + '</span>' +
      esc('已生成归纳材料：《' + (d.title || '') + '》，共 ' + (d.sections || []).length + ' 个部分。完整文本已输出到下方「归纳材料」区，可一键复制或收藏。');
    renderMaterial(d);
    document.getElementById('staffSummaryOut').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }
  el.innerHTML = '<span class="agent-tag">🤖 ' + esc(res.agent) + '</span>' + esc(d.answer || JSON.stringify(d));
  staffChatBox.scrollTop = staffChatBox.scrollHeight;
}

document.getElementById('staffChatForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('staffChatInput');
  const q = input.value.trim();
  if (!q) return;
  pushMsgInto(staffChatBox, 'user', q);
  input.value = '';
  const wait = pushMsgInto(staffChatBox, 'bot', '政务产业助手正在检索知识库与指标…');
  const body = {
    message: q,
    audience: 'staff',
    cityId: document.getElementById('staffChatCity').value,
    county: document.getElementById('staffChatCounty').value,
    focus: profStore.staff.focus
  };
  askViaStream({
    message: q,
    audience: 'staff',
    cityId: body.cityId,
    county: body.county,
    focus: body.focus,
    traceEl: staffTrace,
    fallbackBody: body,
    onFinal: (res) => renderAdvisorInto(wait, res),
    onError: (err) => { wait.textContent = '⚠️ ' + (err.message || '请求失败'); }
  });
});

document.getElementById('staffSummaryBtn').addEventListener('click', async () => {
  const btn = document.getElementById('staffSummaryBtn');
  const box = document.getElementById('staffSummaryOut');
  const scope = scopeLabelOf('staffChatCity', 'staffChatCounty');
  loading(box, '政务产业助手正在归纳「' + scope + '」的知识库与指标数据…');
  setBusy(btn, true);
  try {
    const res = await api('/advisor/summary', {
      method: 'POST',
      body: JSON.stringify({
        cityId: document.getElementById('staffChatCity').value,
        county: document.getElementById('staffChatCounty').value,
        focus: profStore.staff.focus
      })
    });
    renderMaterial(res.data);
    pushMsgInto(staffChatBox, 'bot',
      '已按「' + scope + '」生成归纳材料：《' + res.data.title + '》（' + (res.data.sections || []).length + ' 个部分）。详见下方「归纳材料」区。',
      '政务产业助手Agent');
  } catch (err) {
    box.innerHTML = '<div class="block"><p>⚠️ ' + esc(err.message) + '</p></div>';
  } finally {
    setBusy(btn, false);
  }
});

/* ================= 身份切换：旅行者 / 地方工作人员 ================= */
const MODE_KEY = 'ht_mode_v1';
const MODES = {
  tourist: {
    label: '旅行者',
    chip: '🧳 旅行者视角',
    defaultTab: 'chat',
    slogans: ['游地方 · 知非遗', '行程自动嵌入非遗', '非遗好物带回家'],
    scopeHint: '当前身份：旅行者'
  },
  staff: {
    label: '地方工作人员',
    chip: '🏛 地方工作人员视角',
    defaultTab: 'staffchat',
    slogans: ['非遗活态传承', '工坊增收入', '对话式辅助决策'],
    scopeHint: '当前身份：地方工作人员'
  }
};
let mode = localStorage.getItem(MODE_KEY) === 'staff' ? 'staff' : 'tourist';

/* ---------- 个人资料：两种身份各一套（localStorage，本机保存） ---------- */
const PROF_KEY = 'ht_profile_v2';
const PROF_KEY_V1 = 'ht_profile_v1';
const DEFAULT_TOURIST = { name: '旅行者', role: '普通游客', city: '', pref: '' };
const DEFAULT_STAFF = { name: '工作人员', dept: '县文化和旅游局', city: '', focus: '非遗工坊增收' };
const TOURIST_ROLES = ['普通游客', '非遗爱好者', '研学团队', '亲子家庭'];

function safeParse(raw, fallback) {
  try { return raw ? JSON.parse(raw) : fallback; } catch (_) { return fallback; }
}

let profStore = (function () {
  const v2 = safeParse(localStorage.getItem(PROF_KEY), null);
  if (v2 && v2.tourist && v2.staff) return v2;
  // 兼容旧版单一画像：并入旅行者资料
  const v1 = safeParse(localStorage.getItem(PROF_KEY_V1), null) || {};
  return {
    tourist: Object.assign({}, DEFAULT_TOURIST, {
      name: v1.name || DEFAULT_TOURIST.name,
      role: TOURIST_ROLES.indexOf(v1.role) >= 0 ? v1.role : DEFAULT_TOURIST.role,
      city: v1.city || '',
      pref: v1.pref || ''
    }),
    staff: Object.assign({}, DEFAULT_STAFF)
  };
})();

function saveProfStore() { localStorage.setItem(PROF_KEY, JSON.stringify(profStore)); }
function curProfile() { return profStore[mode === 'staff' ? 'staff' : 'tourist']; }

function renderProfile() {
  const t = profStore.tourist;
  const s = profStore.staff;
  // 旅行者资料
  document.getElementById('profName').value = t.name;
  document.getElementById('profRole').value = t.role;
  document.getElementById('profPref').value = t.pref;
  const pc = document.getElementById('profCity');
  if (pc.options.length) pc.value = t.city || '';
  document.getElementById('profAvatar').textContent = (t.name || '客').charAt(0);
  // 工作人员资料
  document.getElementById('profStaffName').value = s.name;
  document.getElementById('profStaffDept').value = s.dept;
  document.getElementById('profStaffFocus').value = s.focus;
  const sc = document.getElementById('profStaffCity');
  if (sc.options.length) sc.value = s.city || '';
  document.getElementById('profStaffAvatar').textContent = (s.name || '政').charAt(0);
  // 当前身份的资料卡
  document.getElementById('profCardTourist').classList.toggle('hidden', mode === 'staff');
  document.getElementById('profCardStaff').classList.toggle('hidden', mode !== 'staff');
  // 侧栏速览卡
  const cp = curProfile();
  document.getElementById('sideName').textContent = cp.name || MODES[mode].label;
  document.getElementById('sideRole').textContent = mode === 'staff'
    ? (s.dept ? s.dept.slice(0, 12) + (s.dept.length > 12 ? '…' : '') : '地方工作人员')
    : (t.role || '普通游客');
  document.getElementById('sideAvatar').textContent = (cp.name || '客').charAt(0);
  document.getElementById('favScopeHint').textContent = '（当前身份：' + MODES[mode].label + '）';
}

document.getElementById('profSave').addEventListener('click', () => {
  profStore.tourist = {
    name: document.getElementById('profName').value.trim() || DEFAULT_TOURIST.name,
    role: document.getElementById('profRole').value,
    city: document.getElementById('profCity').value,
    pref: document.getElementById('profPref').value.trim()
  };
  saveProfStore();
  renderProfile();
  flashBtn(document.getElementById('profSave'), '已保存 ✓');
});
document.getElementById('profReset').addEventListener('click', () => {
  profStore.tourist = Object.assign({}, DEFAULT_TOURIST);
  saveProfStore();
  renderProfile();
});

document.getElementById('profStaffSave').addEventListener('click', () => {
  profStore.staff = {
    name: document.getElementById('profStaffName').value.trim() || DEFAULT_STAFF.name,
    dept: document.getElementById('profStaffDept').value.trim() || DEFAULT_STAFF.dept,
    city: document.getElementById('profStaffCity').value,
    focus: document.getElementById('profStaffFocus').value
  };
  saveProfStore();
  renderProfile();
  flashBtn(document.getElementById('profStaffSave'), '已保存 ✓');
});
document.getElementById('profStaffReset').addEventListener('click', () => {
  profStore.staff = Object.assign({}, DEFAULT_STAFF);
  saveProfStore();
  renderProfile();
});

// 侧栏个人信息速览卡 → 跳转个人中心
document.getElementById('sideProfile').addEventListener('click', () => {
  const tab = document.querySelector('.tab[data-tab="profile"]');
  if (tab) tab.click();
});

function flashBtn(btn, text) {
  const old = btn.textContent;
  btn.textContent = text;
  setTimeout(() => { btn.textContent = old; }, 1500);
}

/* ---------- 收藏夹（按身份隔离） ---------- */
let favs = (safeParse(localStorage.getItem('ht_favs_v1'), []) || []).map((f) =>
  Object.assign({ mode: 'tourist' }, f));
const FAV_KEY = 'ht_favs_v1';

function favsOfMode() { return favs.filter((f) => (f.mode || 'tourist') === mode); }

function persistFavs() {
  localStorage.setItem(FAV_KEY, JSON.stringify(favs));
  document.getElementById('favCount').textContent = String(favsOfMode().length);
}

function renderFavs() {
  const list = document.getElementById('favList');
  const mine = favsOfMode();
  document.getElementById('favCount').textContent = String(mine.length);
  document.getElementById('favScopeHint').textContent = '（当前身份：' + MODES[mode].label + '）';
  if (!mine.length) {
    list.innerHTML = '<div class="fav-empty">当前身份还没有收藏内容。' +
      (mode === 'staff'
        ? '去「乡村产业赋能」「乡村振兴看板」点击"☆ 收藏"。'
        : '去「行程规划」「AIGC文创」等页面点击"☆ 收藏"。') +
      '切换到另一身份可查看对应的收藏夹。</div>';
    return;
  }
  list.innerHTML = mine.map((f) =>
    '<div class="fav-item" data-id="' + f.id + '">' +
      '<div class="fav-item-head"><b>' + esc(f.title) + '</b><span class="muted">' + esc(f.time) + '</span></div>' +
      '<div class="fav-item-text">' + esc(f.text) + '</div>' +
      '<div class="fav-item-actions">' +
        '<button type="button" data-fav="expand">展开 / 收起</button>' +
        '<button type="button" data-fav="copy">复制</button>' +
        '<button type="button" data-fav="del">删除</button>' +
      '</div>' +
    '</div>').join('');
}

document.getElementById('favList').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-fav]');
  if (!btn) return;
  const itemEl = btn.closest('.fav-item');
  const id = Number(itemEl.dataset.id);
  const idx = favs.findIndex((f) => f.id === id);
  if (idx < 0) return;
  if (btn.dataset.fav === 'expand') {
    itemEl.classList.toggle('expanded');
  } else if (btn.dataset.fav === 'copy') {
    navigator.clipboard.writeText(favs[idx].text).then(() => flashBtn(btn, '已复制 ✓'))
      .catch(() => alert('复制失败，请手动选择文本复制'));
  } else if (btn.dataset.fav === 'del') {
    favs.splice(idx, 1);
    persistFavs();
    renderFavs();
  }
});

document.getElementById('favClear').addEventListener('click', () => {
  const mine = favsOfMode();
  if (!mine.length) return;
  if (!confirm('确定清空「' + MODES[mode].label + '」身份的 ' + mine.length + ' 条收藏吗？（另一身份收藏不受影响）')) return;
  favs = favs.filter((f) => (f.mode || 'tourist') !== mode);
  persistFavs();
  renderFavs();
});

// 各功能页"☆ 收藏"按钮：把对应结果区文本存入当前（或按钮指定）身份的收藏夹
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-collect-target]');
  if (!btn) return;
  const el = document.getElementById(btn.dataset.collectTarget);
  const text = el ? el.innerText.trim() : '';
  if (!text) { alert('还没有可收藏的内容，先生成一次吧'); return; }
  favs.unshift({
    id: Date.now(),
    mode: btn.dataset.collectMode || mode,
    title: btn.dataset.collectTitle || '收藏内容',
    time: new Date().toLocaleString('zh-CN', { hour12: false }),
    text: text.slice(0, 8000)
  });
  if (favs.length > 50) favs.length = 50; // 上限保护
  persistFavs();
  renderFavs();
  flashBtn(btn, '已收藏 ✓');
});

/* ---------- 身份应用与切换 ---------- */
function applyMode() {
  document.body.classList.toggle('mode-staff', mode === 'staff');
  // 切换器高亮
  document.querySelectorAll('.mode-btn').forEach((b) =>
    b.classList.toggle('active', b.dataset.mode === mode));
  // 导航按身份显隐
  document.querySelectorAll('.tab[data-mode]').forEach((t) => {
    const m = t.dataset.mode;
    t.classList.toggle('hidden', m !== 'common' && m !== mode);
  });
  document.querySelectorAll('.nav-group-title[data-group]').forEach((g) => {
    const k = g.dataset.group;
    g.classList.toggle('hidden', k !== 'common' && k !== mode);
  });
  // 顶部身份标识与口号
  document.getElementById('identityChip').textContent = MODES[mode].chip;
  document.getElementById('sloganChips').innerHTML = MODES[mode].slogans
    .map((s) => '<span class="slogan-chip">' + esc(s) + '</span>')
    .join('<span class="slogan-dot"></span>');
  renderProfile();
  renderFavs();
}

function activePanelAllowed() {
  const active = document.querySelector('.panel.active');
  if (!active) return false;
  const m = active.dataset.mode || 'common';
  return m === 'common' || m === mode;
}

function switchMode(next, silent) {
  if (next !== 'tourist' && next !== 'staff') return;
  mode = next;
  localStorage.setItem(MODE_KEY, mode);
  applyMode();
  if (!silent && !activePanelAllowed()) {
    const tab = document.querySelector('.tab[data-tab="' + MODES[mode].defaultTab + '"]');
    if (tab) tab.click();
  }
}

document.getElementById('modeSwitch').addEventListener('click', (e) => {
  const btn = e.target.closest('.mode-btn');
  if (!btn) return;
  switchMode(btn.dataset.mode);
});

/* ---------------- 复制导出 ---------------- */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-copy-target]');
  if (!btn) return;
  const el = document.getElementById(btn.dataset.copyTarget);
  const text = el.innerText.trim();
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    const old = btn.textContent;
    btn.textContent = '已复制 ✓';
    setTimeout(() => { btn.textContent = old; }, 1500);
  }).catch(() => alert('复制失败，请手动选择文本复制'));
});

/* ---------------- 标签页 ---------------- */
document.getElementById('tabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  const m = tab.dataset.mode;
  if (m && m !== 'common' && m !== mode) return; // 身份不匹配的导航不响应
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
  document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.id === 'panel-' + tab.dataset.tab));
  if (tab.dataset.tab === 'insight' && !insightLoaded) loadInsight();
});

/* ---------------- 启动 ---------------- */
(async function init() {
  const status = document.getElementById('sysStatus');
  try {
    const [cities, ready] = await Promise.all([api('/cities'), api('/ready')]);
    state.cities = cities.cities;
    fillCitySelects();
    // 工作人员身份默认落在其"关注区县"所在城市（仅初始化时生效，不干扰后续手动切换）
    if (profStore.staff.city && state.cities.some((c) => c.id === profStore.staff.city)) {
      ['insightCity', 'staffChatCity'].forEach((id) => { document.getElementById(id).value = profStore.staff.city; });
      syncScopeCounties('insightCity', 'insightCounty');
      syncScopeCounties('staffChatCity', 'staffChatCounty');
    }
    const totalHeritage = state.cities.reduce((s, c) => s + c.counts.heritages, 0);
    const totalCounty = state.cities.reduce((s, c) => s + (c.counties || []).length, 0);
    status.className = 'sys-status ok';
    status.textContent = '系统就绪 · 知识库 ' + state.cities.length + ' 城 / ' + totalCounty + ' 区县 · 非遗 ' + totalHeritage +
      ' 项 · ' + ready.agents.length + ' 个智能体 · ' + (ready.llmMode === 'remote-llm' ? '大模型在线' : '离线模板模式');
  } catch (err) {
    status.className = 'sys-status off';
    status.textContent = '系统异常：' + err.message;
  }
  applyMode();
  runDemoMode();
  pushMsg('bot', '你好，我是「非遗伴游」多智能体助手。你可以直接问我，例如：\n· 介绍一下广济桥\n· 泉州有哪些非遗？\n· 潮州工夫茶怎么体验？\n· 洞庭山碧螺春是什么级别？\n· 苏州有什么好吃的？', '调度器');
  pushMsgInto(staffChatBox, 'bot',
    '你好，我是「政务产业助手」。可以直接问我，也可以点下方提示词或「一键生成总结材料」：\n' +
    '· 帮我总结一下苏州的非遗与产业情况（可产出汇报材料）\n' +
    '· 哪些非遗项目最需要抢救？\n' +
    '· 乡村文旅一年能增收多少？带动多少人就业？\n' +
    '· 泉州和苏州比怎么样？',
    '政务产业助手Agent');
})();

/* ---------------- 演示模式（?demo=plan|kb|aigc|guide|food|industry|insight|profile|rural|chat|staffchat|summary，可叠加 &mode=staff&city=suzhou&county=吴中区） ---------------- */
function applyScopeParams(cityParam, countyParam) {
  if (cityParam && state.cities.some((c) => c.id === cityParam)) {
    ['insightCity', 'staffChatCity'].forEach((id) => { document.getElementById(id).value = cityParam; });
  }
  syncScopeCounties('insightCity', 'insightCounty');
  syncScopeCounties('staffChatCity', 'staffChatCounty');
  if (countyParam) {
    if (document.getElementById('insightCounty').value !== undefined) document.getElementById('insightCounty').value = countyParam;
    if (document.getElementById('staffChatCounty').value !== undefined) document.getElementById('staffChatCounty').value = countyParam;
    updateScopeHint('insightCity', 'insightCounty');
    updateScopeHint('staffChatCity', 'staffChatCounty');
  }
}

function runDemoMode() {
  const params = new URLSearchParams(location.search);
  const demo = params.get('demo');
  const roleParam = params.get('mode') || params.get('role');
  if (roleParam === 'tourist' || roleParam === 'staff') switchMode(roleParam, true);
  applyScopeParams(params.get('city'), params.get('county'));
  if (!demo) return;
  const tabMap = {
    plan: 'plan', kb: 'kb', aigc: 'aigc', guide: 'guide', food: 'food',
    industry: 'industry', insight: 'insight', profile: 'profile', rural: 'plan',
    staffchat: 'staffchat', staff: 'staffchat', summary: 'staffchat', advisor: 'staffchat'
  };
  const targetTab = tabMap[demo] || demo;
  const tab = document.querySelector('.tab[data-tab="' + targetTab + '"]');
  // 目标页属于另一身份时，自动切到该身份
  if (tab && tab.dataset.mode && tab.dataset.mode !== 'common' && tab.dataset.mode !== mode) {
    switchMode(tab.dataset.mode, true);
  }
  if (tab) tab.click();
  setTimeout(async () => {
    if (demo === 'plan') {
      document.getElementById('planCity').value = params.get('city') || 'quanzhou';
      document.getElementById('planDays').value = '2';
      document.getElementById('planCrowd').value = 'family';
      document.getElementById('planHeritage').checked = true;
      document.getElementById('planForm').dispatchEvent(new Event('submit', { cancelable: true }));
    } else if (demo === 'kb') {
      document.getElementById('kbCity').value = params.get('city') || 'chaozhou';
      renderChips();
      document.getElementById('kbQuestion').value = '工夫茶在哪里可以体验？是什么级别？';
      document.getElementById('kbForm').dispatchEvent(new Event('submit', { cancelable: true }));
    } else if (demo === 'aigc') {
      document.getElementById('aigcCity').value = params.get('city') || 'chaozhou';
      syncAigcHeritage();
      document.getElementById('aigcHeritage').value = document.getElementById('aigcHeritage').options[0].value;
      document.getElementById('aigcType').value = 'product';
      document.getElementById('aigcForm').dispatchEvent(new Event('submit', { cancelable: true }));
    } else if (demo === 'guide') {
      document.getElementById('guideCity').value = params.get('city') || 'chaozhou';
      syncGuideDatalist();
      document.getElementById('guideAttraction').value = document.getElementById('attractionList').options[0].value;
      document.getElementById('guideForm').dispatchEvent(new Event('submit', { cancelable: true }));
    } else if (demo === 'food') {
      document.getElementById('foodCity').value = params.get('city') || 'quanzhou';
      document.getElementById('foodForm').dispatchEvent(new Event('submit', { cancelable: true }));
    } else if (demo === 'industry') {
      document.getElementById('industryCity').value = params.get('city') || 'chaozhou';
      await syncIndustryWorkshops();
      document.getElementById('industryWorkshop').value = document.getElementById('industryWorkshop').options[0].value;
      document.getElementById('industryForm').dispatchEvent(new Event('submit', { cancelable: true }));
    } else if (demo === 'insight') {
      await loadInsight();
    } else if (demo === 'staffchat') {
      document.getElementById('staffChatInput').value = '帮我总结一下当前地区的非遗与产业情况';
      document.getElementById('staffChatForm').dispatchEvent(new Event('submit', { cancelable: true }));
    } else if (demo === 'summary') {
      document.getElementById('staffSummaryBtn').click();
    } else if (demo === 'rural') {
      document.getElementById('planCity').value = params.get('city') || 'chaozhou';
      document.getElementById('planDays').value = '2';
      document.getElementById('planCrowd').value = 'youth';
      document.getElementById('planMode').value = 'rural';
      document.getElementById('planHeritage').checked = true;
      document.getElementById('planForm').dispatchEvent(new Event('submit', { cancelable: true }));
    } else if (demo === 'chat') {
      document.getElementById('chatInput').value = '介绍一下广济桥';
      document.getElementById('chatForm').dispatchEvent(new Event('submit', { cancelable: true }));
    }
  }, 400);
}

// 城市切换联动
['guideCity', 'kbCity', 'aigcCity', 'industryCity'].forEach((id) => {
  document.getElementById(id).addEventListener('change', () => {
    if (id === 'guideCity') syncGuideDatalist();
    if (id === 'kbCity') renderChips();
    if (id === 'aigcCity') syncAigcHeritage();
    if (id === 'industryCity') syncIndustryWorkshops();
  });
});
