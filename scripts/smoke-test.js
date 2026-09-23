'use strict';
/**
 * 冒烟测试脚本：逐个验证核心 API 端点（便于交付验收与回归）。
 * 用法：node scripts/smoke-test.js [baseUrl]
 */
const BASE = process.argv[2] || 'http://127.0.0.1:3000';

async function call(name, path, options, expectFail) {
  try {
    const res = await fetch(BASE + path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, options || {}));
    const body = await res.json();
    const okExpected = expectFail ? !res.ok : (res.ok && body.ok !== false);
    const brief = JSON.stringify(body).slice(0, 260);
    console.log((okExpected ? 'PASS' : 'FAIL') + ' | ' + name + ' | HTTP ' + res.status + ' | ' + brief);
    return okExpected;
  } catch (err) {
    console.log('ERROR | ' + name + ' | ' + err.message);
    return false;
  }
}

// 断言式调用：既检查 HTTP 成功，也检查响应体满足自定义条件
async function callWith(name, path, options, assert) {
  try {
    const res = await fetch(BASE + path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, options || {}));
    const body = await res.json();
    const detail = assert ? assert(body, res) : '';
    const okExpected = res.ok && body.ok !== false && !detail;
    console.log((okExpected ? 'PASS' : 'FAIL') + ' | ' + name + ' | HTTP ' + res.status + ' | ' + (detail || JSON.stringify(body).slice(0, 260)));
    return okExpected;
  } catch (err) {
    console.log('ERROR | ' + name + ' | ' + err.message);
    return false;
  }
}

// SSE：读取完整事件流，验证 step 链路与 final 结果
async function callSSE(name, message, extraQuery) {
  try {
    const url = BASE + '/api/orchestrate/stream?message=' + encodeURIComponent(message) + (extraQuery || '');
    const res = await fetch(url);
    const text = await res.text();
    const okExpected = res.ok && text.includes('event: step') && text.includes('event: final');
    console.log((okExpected ? 'PASS' : 'FAIL') + ' | ' + name + ' | HTTP ' + res.status + ' | ' + text.replace(/\n/g, ' ').slice(0, 240));
    return okExpected;
  } catch (err) {
    console.log('ERROR | ' + name + ' | ' + err.message);
    return false;
  }
}

(async function main() {
  const results = [];
  results.push(await call('健康检查', '/healthz', {}));
  results.push(await callWith('就绪检查（含8个Agent / 3城）', '/api/ready', {}, (b) => {
    if (!b.agents || b.agents.length !== 8) return 'agents 数量应为 8，实际 ' + (b.agents || []).length;
    if (!b.knowledgeCities || b.knowledgeCities.length !== 3) return '城市数应为 3';
    if (!b.knowledgeCounties || b.knowledgeCounties !== 23) return '区县总数应为 23，实际 ' + b.knowledgeCounties;
    return '';
  }));
  results.push(await callWith('目的地清单（含区县与规模）', '/api/cities', {}, (b) => {
    if (!b.cities || b.cities.length !== 3) return '应返回 3 座城市';
    const sz = b.cities.find((c) => c.id === 'suzhou');
    if (!sz) return '缺少苏州';
    if (!sz.counties || sz.counties.length !== 9) return '苏州区县应为 9 个';
    if (sz.counts.heritages !== 16) return '苏州非遗应为 16 项，实际 ' + sz.counts.heritages;
    return '';
  }));
  results.push(await call('地区清单接口', '/api/regions', {}));

  // —— 游客侧：行程规划三种模式 ——
  results.push(await call('Agent1 行程规划·城市经典（泉州2天亲子）', '/api/plan', {
    method: 'POST', body: JSON.stringify({ cityId: 'quanzhou', days: 2, crowd: 'family', preferHeritage: true, mode: 'city' })
  }));
  results.push(await call('Agent1 行程规划·乡村深度（潮州2天）', '/api/plan', {
    method: 'POST', body: JSON.stringify({ cityId: 'chaozhou', days: 2, crowd: 'youth', preferHeritage: true, mode: 'rural' })
  }));
  results.push(await call('Agent1 行程规划·城乡融合（泉州3天）', '/api/plan', {
    method: 'POST', body: JSON.stringify({ cityId: 'quanzhou', days: 3, crowd: 'youth', preferHeritage: false, mode: 'blend' })
  }));
  results.push(await call('Agent1 行程规划·苏州乡村深度2天', '/api/plan', {
    method: 'POST', body: JSON.stringify({ cityId: 'suzhou', days: 2, crowd: 'family', preferHeritage: true, mode: 'rural' })
  }));

  // —— 游客侧：其余 Agent ——
  results.push(await call('Agent2 景点非遗讲解（潮州广济桥）', '/api/guide', {
    method: 'POST', body: JSON.stringify({ cityId: 'chaozhou', attraction: '广济桥' })
  }));
  results.push(await call('Agent2 景点非遗讲解（苏州网师园）', '/api/guide', {
    method: 'POST', body: JSON.stringify({ cityId: 'suzhou', attraction: '网师园' })
  }));
  results.push(await call('Agent3 美食民俗（泉州）', '/api/food', {
    method: 'POST', body: JSON.stringify({ cityId: 'quanzhou' })
  }));
  results.push(await call('Agent4 非遗知识问答（命中知识库）', '/api/heritage/query', {
    method: 'POST', body: JSON.stringify({ cityId: 'chaozhou', question: '潮州工夫茶在哪里可以体验？是什么级别？' })
  }));
  results.push(await call('Agent4 反幻觉验证（未收录内容）', '/api/heritage/query', {
    method: 'POST', body: JSON.stringify({ cityId: 'chaozhou', question: '潮州有没有皮影戏？' })
  }));
  results.push(await callWith('Agent4 苏州碧螺春问答（人类非遗）', '/api/heritage/query', {
    method: 'POST', body: JSON.stringify({ cityId: 'suzhou', question: '洞庭山碧螺春是什么级别？在哪里可以体验？' })
  }, (b) => (b.data && b.data.source === 'knowledge-base' ? '' : '未命中知识库')));
  results.push(await call('Agent5 AIGC文创生成（潮绣产品构思）', '/api/aigc', {
    method: 'POST', body: JSON.stringify({ cityId: 'chaozhou', type: 'product', heritage: '潮绣' })
  }));

  // —— 工作人员侧：产业赋能与看板 ——
  results.push(await call('Agent6 工坊清单（潮州）', '/api/rural/workshops?cityId=chaozhou', {}));
  results.push(await call('Agent6 工坊赋能方案（凤凰单丛茶工坊）', '/api/rural/empower', {
    method: 'POST', body: JSON.stringify({ cityId: 'chaozhou', workshopId: 'cz-ws-dancong' })
  }));
  results.push(await call('Agent6 工坊赋能方案（苏州镇湖苏绣）', '/api/rural/empower', {
    method: 'POST', body: JSON.stringify({ cityId: 'suzhou', workshopId: 'sz-ws-suxiu' })
  }));
  results.push(await call('Agent7 运营洞察（泉州，含增收测算）', '/api/insight', {
    method: 'POST', body: JSON.stringify({ cityId: 'quanzhou', params: { visitors: 800000, expRate: 0.15 } })
  }));
  results.push(await callWith('Agent7 看板·地区下钻（苏州吴中区）', '/api/insight', {
    method: 'POST', body: JSON.stringify({ cityId: 'suzhou', county: '吴中区' })
  }, (b) => {
    const d = b.data || {};
    if (d.county !== '吴中区') return 'county 字段未回传';
    if (!d.hli || d.hli.rows.length !== 6) return '吴中区非遗应为 6 项，实际 ' + (d.hli ? d.hli.rows.length : 0);
    if (d.charts.workshops !== 2) return '吴中区工坊应为 2 家，实际 ' + d.charts.workshops;
    if (d.charts.ruralSpots !== 5) return '吴中区乡村点位应为 5 个，实际 ' + d.charts.ruralSpots;
    return '';
  }));
  results.push(await callWith('Agent7 看板·全市口径（苏州）', '/api/insight', {
    method: 'POST', body: JSON.stringify({ cityId: 'suzhou' })
  }, (b) => {
    const d = b.data || {};
    if (d.hli.rows.length !== 16) return '苏州全域非遗应为 16 项';
    if (!d.stats || d.stats.length !== 8) return '苏州公开统计应为 8 条';
    return '';
  }));
  results.push(await callWith('Agent7 看板·泉州鲤城区（非遗有、工坊无的回落口径）', '/api/insight', {
    method: 'POST', body: JSON.stringify({ cityId: 'quanzhou', county: '鲤城区' })
  }, (b) => {
    const d = b.data || {};
    if (!d.revenue) return '缺少增收测算';
    if (!d.revenue.scopeLabel || d.revenue.scopeLabel.indexOf('回落') < 0) return '未标注回落口径：' + d.revenue.scopeLabel;
    return '';
  }));

  // —— Agent 8：工作人员智能对话体 ——
  // 注意：/api/advisor/ask 与 /api/chat 同构，响应为 { ok, data: { agent, data } }（外层是传输封装，内层是调度结果）
  results.push(await callWith('Agent8 总结归纳（苏州全域）', '/api/advisor/summary', {
    method: 'POST', body: JSON.stringify({ cityId: 'suzhou', focus: '濒危项目抢救' })
  }, (b) => {
    const d = b.data || {};
    if (d.kind !== 'summary') return 'kind 应为 summary';
    if (!d.sections || d.sections.length !== 6) return '应为 6 个分层小节';
    if (!d.markdown || d.markdown.length < 200) return 'markdown 文本过短';
    return '';
  }));
  results.push(await callWith('Agent8 总结归纳（苏州吴中区·按关注重点排序）', '/api/advisor/summary', {
    method: 'POST', body: JSON.stringify({ cityId: 'suzhou', county: '吴中区', focus: '乡村文旅引流' })
  }, (b) => {
    const d = b.data || {};
    if (d.scopeLabel.indexOf('吴中区') < 0) return 'scopeLabel 未包含区县';
    if (d.sections[5].title.indexOf('乡村文旅引流') < 0) return '未按关注重点标注';
    return '';
  }));
  results.push(await callWith('Agent8 问答·濒危预警', '/api/advisor/ask', {
    method: 'POST', body: JSON.stringify({ message: '哪些非遗项目最需要抢救？', cityId: 'suzhou' })
  }, (b) => {
    const d = (b.data || {}).data || {};
    return d.answer && d.answer.indexOf('濒危预警') >= 0 ? '' : '答复未包含预警清单';
  }));
  results.push(await callWith('Agent8 问答·增收测算口径', '/api/advisor/ask', {
    method: 'POST', body: JSON.stringify({ message: '苏州乡村文旅一年能增收多少？', cityId: 'suzhou' })
  }, (b) => {
    const d = (b.data || {}).data || {};
    return d.revenue ? '' : '未返回测算数据';
  }));
  results.push(await callWith('Agent8 问答·地区横向对比（提及两城自动识别）', '/api/advisor/ask', {
    method: 'POST', body: JSON.stringify({ message: '泉州和苏州比怎么样？' })
  }, (b) => {
    const d = (b.data || {}).data || {};
    return d.answer && d.answer.indexOf('横向对比') >= 0 ? '' : '未返回对比结论';
  }));
  results.push(await callWith('Agent8 问答·工坊经营', '/api/advisor/ask', {
    method: 'POST', body: JSON.stringify({ message: '镇湖苏绣工坊怎么定价？' })
  }, (b) => {
    const d = (b.data || {}).data || {};
    return d.answer && d.answer.indexOf('镇湖') >= 0 ? '' : '未命中该工坊';
  }));
  results.push(await callWith('Agent8 兜底引导（无明确意图）', '/api/advisor/ask', {
    method: 'POST', body: JSON.stringify({ message: '你好', cityId: 'suzhou' })
  }, (b) => {
    const d = (b.data || {}).data || {};
    return d.intent === 'overview' ? '' : '兜底意图不正确';
  }));

  // —— 调度器（两种受众） ——
  results.push(await call('调度器自然语言对话', '/api/chat', {
    method: 'POST', body: JSON.stringify({ message: '介绍一下蟳埔渔村' })
  }));
  results.push(await call('调度器路由：乡村振兴洞察', '/api/chat', {
    method: 'POST', body: JSON.stringify({ message: '潮州乡村振兴的运营数据怎么样？' })
  }));
  results.push(await callWith('调度器路由：识别苏州（数据驱动城市识别）', '/api/chat', {
    method: 'POST', body: JSON.stringify({ message: '碧螺春是哪里产的？' })
  }, (b) => (b.data && b.data.data && b.data.data.city === '苏州' ? '' : '未路由到苏州')));
  results.push(await callWith('调度器·工作人员受众（总结归纳）', '/api/chat', {
    method: 'POST', body: JSON.stringify({ message: '帮我总结一下苏州的非遗与产业情况', audience: 'staff', cityId: 'suzhou' })
  }, (b) => (b.data && b.data.agent === '政务产业助手Agent' ? '' : '未路由到政务产业助手')));
  results.push(await callSSE('SSE 多智能体协作链路（游客）', '介绍一下广济桥'));
  results.push(await callSSE('SSE 政务助手链路（工作人员）', '帮我总结一下苏州的非遗情况', '&audience=staff&cityId=suzhou'));

  // —— 异常与边界 ——
  results.push(await call('异常处理：非法城市（行程）', '/api/plan', {
    method: 'POST', body: JSON.stringify({ cityId: 'nowhere' })
  }, true));
  results.push(await call('异常处理：非法城市（看板）', '/api/insight', {
    method: 'POST', body: JSON.stringify({ cityId: 'nowhere' })
  }, true));
  results.push(await call('异常处理：非法区县', '/api/insight', {
    method: 'POST', body: JSON.stringify({ cityId: 'suzhou', county: '不存在的区' })
  }, true));
  results.push(await call('异常处理：非法工坊', '/api/rural/empower', {
    method: 'POST', body: JSON.stringify({ cityId: 'chaozhou', workshopId: 'no-such' })
  }, true));
  results.push(await call('异常处理：非法生成类型', '/api/aigc', {
    method: 'POST', body: JSON.stringify({ cityId: 'chaozhou', type: 'bad', heritage: '潮绣' })
  }, true));
  results.push(await call('异常处理：空问题', '/api/heritage/query', {
    method: 'POST', body: JSON.stringify({ cityId: 'chaozhou', question: '' })
  }, true));
  results.push(await call('异常处理：空提问（政务助手）', '/api/advisor/ask', {
    method: 'POST', body: JSON.stringify({ message: '' })
  }, true));

  const passed = results.filter(Boolean).length;
  console.log('\n===== 冒烟测试结果：' + passed + '/' + results.length + ' 通过 =====');
  process.exit(passed === results.length ? 0 : 1);
})();
