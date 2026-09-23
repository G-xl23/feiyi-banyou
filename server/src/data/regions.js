'use strict';
/**
 * 地区（区县）归属表 —— 支持"城市内下钻"的地区选项
 *
 * 为什么单独成文件：
 *   heritage.js 记录的是"非遗项目本身"，而项目归属哪些区县属于行政区划元数据。
 *   把两者分开，新增城市时只需在 heritage.js / rural.js 写内容，
 *   再在本文件补一张归属表即可，不必回头改动已有条目。
 *
 * 结构：
 *   counties  该市下辖（已收录相关内容的）区县名列表，用于前端地区下拉
 *   heritage  { 非遗项目 id: [归属区县...] }，用于区县级统计与筛选
 *
 * 维护约定：
 *   - counties 中的名称必须与 rural.js 中 spots/workshops 的 county 字段完全一致，
 *     否则区县筛选会取不到数据（scripts/validate-data.js 会校验这一点）。
 *   - 一个项目可归属多个区县（如潮州木雕在湘桥区与潮安区均有传承）。
 *   - 区划发生过调整的地区以现行区划为准（如潮州枫溪已并入潮安区）。
 */

const regions = {
  quanzhou: {
    counties: ['鲤城区', '丰泽区', '洛江区', '泉港区', '晋江市', '石狮市', '南安市', '惠安县', '安溪县', '永春县', '德化县'],
    heritage: {
      'qz-nanyin': ['鲤城区', '丰泽区'],
      'qz-marionette': ['鲤城区', '丰泽区'],
      'qz-huiandress': ['惠安县'],
      'qz-xunpu': ['丰泽区'],
      'qz-dehua': ['德化县'],
      'qz-tieguanyin': ['安溪县'],
      'qz-lantern': ['鲤城区', '丰泽区'],
      'qz-liyuan': ['鲤城区'],
      'qz-gaojiaxi': ['南安市', '晋江市'],
      'qz-huidiao': ['惠安县'],
      'qz-dapu-incense': ['永春县'],
      'qz-yongchun-vinegar': ['永春县'],
      'qz-handmianxian': ['晋江市', '南安市']
    }
  },

  chaozhou: {
    counties: ['湘桥区', '潮安区', '饶平县'],
    heritage: {
      'cz-gongfucha': ['湘桥区'],
      'cz-chaoxiu': ['湘桥区'],
      'cz-mudiao': ['湘桥区', '潮安区'],
      'cz-chaoju': ['湘桥区', '潮安区'],
      'cz-caipeng': ['湘桥区', '潮安区'],
      'cz-dancong': ['潮安区'],
      'cz-nisu': ['潮安区'],
      'cz-fengxi': ['潮安区'],
      'cz-qianci': ['潮安区', '湘桥区'],
      'cz-zhubian': ['潮安区']
    }
  },

  suzhou: {
    counties: ['姑苏区', '虎丘区', '吴中区', '相城区', '吴江区', '常熟市', '张家港市', '昆山市', '太仓市'],
    heritage: {
      'sz-kunqu': ['姑苏区', '昆山市'],
      'sz-guqin': ['常熟市', '姑苏区'],
      'sz-songjin': ['姑苏区', '吴江区'],
      'sz-kesi': ['姑苏区', '吴中区'],
      'sz-xiangshanbang': ['吴中区'],
      'sz-duanwu': ['姑苏区', '吴中区'],
      'sz-biluochun': ['吴中区'],
      'sz-taohuawu': ['姑苏区'],
      'sz-suxiu': ['虎丘区', '吴中区'],
      'sz-pingtan': ['姑苏区'],
      'sz-shanzi': ['姑苏区'],
      'sz-mingfurniture': ['姑苏区', '吴中区'],
      'sz-yudiao': ['姑苏区'],
      'sz-dengcai': ['姑苏区'],
      'sz-wuge': ['吴江区', '常熟市', '张家港市'],
      'sz-jiangnan-sizhu': ['太仓市', '姑苏区']
    }
  }
};

/** 取某市已收录的区县列表（无记录时返回空数组，不抛错） */
function countiesOf(cityId) {
  const r = regions[cityId];
  return r ? r.counties.slice() : [];
}

/** 取某非遗项目的归属区县（无记录时返回空数组） */
function countiesOfHeritage(cityId, heritageId) {
  const r = regions[cityId];
  if (!r || !r.heritage) return [];
  return (r.heritage[heritageId] || []).slice();
}

/** 某区县是否属于该市（用于入参校验） */
function isValidCounty(cityId, county) {
  return countiesOf(cityId).indexOf(county) >= 0;
}

module.exports = { regions, countiesOf, countiesOfHeritage, isValidCounty };
