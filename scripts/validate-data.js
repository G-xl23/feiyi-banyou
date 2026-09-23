'use strict';
/**
 * 数据完整性校验：node scripts/validate-data.js
 *
 * 用途：新增/修改城市数据后先跑这个脚本，把"漏字段、错误引用、区县名不一致、
 * 成本占比不等于 1"等问题一次性找出来，避免带病上线。
 * 退出码：0 = 无 error（可能有 warning）；1 = 存在 error。
 */
const registry = require('../server/src/data/registry');

const report = registry.auditData();

const line = (s) => process.stdout.write(s + '\n');

line('===== 知识库数据校验 =====');
registry.listCities().forEach((c) => {
  const n = c.counts;
  line(
    '· ' + c.name + '（' + (c.province || '—') + '）' +
    ' 非遗 ' + n.heritages +
    ' / 景点 ' + n.attractions +
    ' / 美食 ' + n.foods +
    ' / 乡村点位 ' + n.ruralSpots +
    ' / 工坊 ' + n.workshops +
    ' / 区县 ' + c.counties.length
  );
});
line('');
line('结构统计：');
report.stats.forEach((s) => {
  line(
    '  ' + s.city + '：非遗 ' + s.heritages + '｜景点 ' + s.attractions + '｜美食 ' + s.foods +
    '｜民俗 ' + s.customs + '｜乡村点位 ' + s.ruralSpots + '｜工坊 ' + s.workshops +
    '｜好物 ' + s.products + '｜农事体验 ' + s.farm + '｜村宿 ' + s.stays + '｜公开统计 ' + s.stats +
    '｜区县 ' + s.counties
  );
});
line('');
line('别名识别自检：');
['介绍泉州南音', '潮州工夫茶怎么体验', '碧螺春是哪里产的', '苏州缂丝难吗', '常熟有什么非遗', '镇湖刺绣', '德化白瓷工坊', '凤凰镇单丛茶'].forEach((q) => {
  const id = registry.detectCity(q);
  const name = id ? registry.city(id).name : '（未识别，将用默认城市）';
  line('  「' + q + '」 → ' + name);
});
line('');

if (report.warnings.length) {
  line('警告（' + report.warnings.length + ' 条，不阻断）：');
  report.warnings.forEach((w) => line('  ⚠ ' + w));
  line('');
}

if (report.errors.length) {
  line('错误（' + report.errors.length + ' 条，需修复）：');
  report.errors.forEach((e) => line('  ✗ ' + e));
  line('');
  line('===== 校验未通过 =====');
  process.exit(1);
}

line('===== 校验通过（0 error）=====');
