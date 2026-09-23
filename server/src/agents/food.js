'use strict';
/**
 * Agent 3 —— 美食民俗推荐 Agent
 * 职责：结合目的地与可选行程主题，推荐地方美食并关联饮食类非遗背景，
 * 输出民俗活动提示。数据来自本地知识库。
 */
const db = require('../data/heritage');
const llm = require('./llm');

function recommend(cityId, opts) {
  const city = db.cities[cityId];
  if (!city) return Promise.reject(Object.assign(new Error('暂不支持该目的地'), { statusCode: 400, code: 'BAD_REQUEST' }));
  const options = opts || {};

  const foods = city.foods.map((f, i) => Object.assign({}, f, {
    isMustTry: i < 3
  }));

  return llm.chat([
    { role: 'system', content: '你是地方美食向导。基于给定美食事实写一段80字内的开场推荐语，口语化，突出饮食与非遗/民俗的关系，不得编造新菜品或新事实。' },
    { role: 'user', content: '城市：' + city.name + '。美食清单：' + foods.map((f) => f.name + '——' + f.desc).join('；') }
  ], { temperature: 0.8, maxTokens: 200 }).then((intro) => ({
    city: { id: city.id, name: city.name },
    intro: intro || ('到' + city.name + '，吃得地道才算来过。以下美食不止好吃，背后都连着本地的非遗技艺与民俗讲究。'),
    foods,
    customs: city.customs
  }));
}

module.exports = { recommend };
