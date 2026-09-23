'use strict';
/**
 * 乡村文旅 · 产业赋能知识库（本地数据层）
 *
 * 定位：本文件是「乡村振兴」与「新时代产业赋能」两个新增能力的数据底座，
 * 服务于乡村线路规划、非遗工坊经营赋能、乡村振兴运营洞察三类场景。
 *
 * 数据来源：潮州市/潮安区/饶平县人民政府门户网站公开资料、泉州市文旅局公开线路资料、
 * 中国非物质文化遗产网(www.ihchina.cn)、地方党媒与主流媒体公开报道。
 * 凡带 stats 的宏观指标均标注来源年份；无可靠来源的字段一律不写入，不做估算填充。
 * 详细来源与校验说明见 docs/04-非遗数据来源说明.md。
 */

const rural = {
  quanzhou: {
    id: 'quanzhou',
    name: '泉州',
    intro: '泉州乡村以"侨乡古厝 + 非遗手作 + 茶瓷香醋"为底色：晋江梧林的百年侨村、永春达埔的千年香都、安溪的乌龙茶山、德化的白瓷窑火，串联出一条"看得见手艺、留得住乡愁"的乡村文旅带。"文旅+工业"观光工厂线路已成体系，游客可在产地直接观摩工序并带走好物，形成"体验即消费"的产业闭环。',

    // 公开统计与结构性数据（供运营洞察 Agent 引用，逐条标注来源）
    stats: [
      { label: '梧林传统村落古建筑保有量', value: 136, unit: '幢', note: '含明百福墙、清官式红砖大厝42处、番仔楼22处、哥特与罗马式洋楼6处', source: '泉州市文旅部门公开资料' },
      { label: '梧林传统村落建村历史', value: 600, unit: '余年', note: '形成于明洪武年间', source: '泉州市文旅部门公开资料' },
      { label: '梧林传统村落荣誉', value: '全国乡村旅游重点村（2021年第三批）', note: '有"华侨建筑博物馆"雅称', source: '泉州市文旅部门公开资料' },
      { label: '安溪铁观音集团建厂年份', value: 1952, unit: '年', note: '前身为国营福建安溪茶厂，乌龙茶精制加工业中最早实现机械化生产企业', source: '安溪铁观音集团公开资料' },
      { label: '来旺良品堂传承基地占地', value: 32, unit: '亩', note: '含闽南婚喜庆民俗文化馆、古早味观光工厂、伴手礼展售区', source: '来旺良品堂公开资料' },
      { label: '永春老醋酿制技艺非遗级别', value: '省级非物质文化遗产（2009年）', note: '四大名醋中唯一用红曲酿造', source: '福建省非遗保护名录' }
    ],

    // 乡村文旅点位（可被行程规划 Agent 嵌入）
    spots: [
      {
        id: 'qz-rural-wulin', name: '晋江梧林传统村落', village: '新塘街道梧林社区', county: '晋江市',
        type: '传统村落', durationMin: 180, bestSeason: '全年，春秋最宜',
        desc: '形成于明洪武年间、兴盛于清末民初的闽南侨村，600余年历史，保留136幢明、清、民国各式古建筑，红砖大厝与哥特式洋楼交错，有"华侨建筑博物馆"雅称。2021年入选第三批全国乡村旅游重点村。村内德越馆常设南音与掌中木偶演出，侨批馆讲述海外华侨家书故事。',
        highlights: ['古厝建筑群摄影', '德越馆南音+掌中木偶演出', '侨批馆家书文化', '沉浸式换装体验'],
        heritageRefs: ['qz-nanyin', 'qz-marionette'],
        source: '泉州市文旅部门公开资料'
      },
      {
        id: 'qz-rural-dapu-incense', name: '永春达埔"中国香都"香文化创意园', village: '达埔镇', county: '永春县',
        type: '非遗工坊', durationMin: 120, bestSeason: '全年（晴日晒香场景最佳）',
        desc: '永春篾香（达埔制香）主产区，达埔镇素有"中国香都"之称。彬达香文化创意园设有香道表演与制香工艺参观，可观摩掷香花、晒香等工序，体验养生香制作。永春篾香远销海内外，制香是当地村民世代相传的民生产业，也是"一村一品"助农增收的典型样本。',
        highlights: ['制香工序观摩', '香道表演', '掷香花与晒香场景', '养生香手作体验'],
        heritageRefs: ['qz-dapu-incense'],
        source: '泉州市文旅部门公开线路资料'
      },
      {
        id: 'qz-rural-anxi-tea', name: '安溪溪禾山铁观音文化园', village: '城东片区', county: '安溪县',
        type: '茶旅融合', durationMin: 240, bestSeason: '春季4-5月、秋季10月茶季',
        desc: '国家4A级旅游景区，占地约1213亩，以茶文化为主题，森林竹海与层层茶园相映，园内保留多座闽南传统古厝。可参观茶园、观摩铁观音制作工序、观看茶艺表演，配套茶野度假酒店与研学设施，是茶旅融合带动村集体增收的代表性项目。',
        highlights: ['茶园漫步与采茶', '铁观音初制工序观摩', '茶艺表演与品茗', '闽南古厝与茶宿'],
        heritageRefs: ['qz-tieguanyin'],
        source: '泉州市文旅局公开资料'
      },
      {
        id: 'qz-rural-anxi-factory', name: '安溪铁观音集团茶厂（观光工厂）', village: '安溪城区', county: '安溪县',
        type: '非遗工坊', durationMin: 150, bestSeason: '全年',
        desc: '前身为1952年创建的国营福建安溪茶厂，是乌龙茶精制加工业中最早实现机械化生产、最早建立乌龙茶标准的企业。厂区开放厂史馆、初制长廊、无烟灶与陈茶仓库等参观点，可完整了解铁观音采青、晒青、摇青、摊青、炒青、包揉、烘干七道初制工序，是"工业遗产+茶旅"的活教材。',
        highlights: ['厂史馆与工业遗产', '初制七道工序参观', '无烟灶与陈茶仓库', '迎客茶品鉴'],
        heritageRefs: ['qz-tieguanyin'],
        source: '安溪铁观音集团公开资料'
      },
      {
        id: 'qz-rural-dehua-ci', name: '德化陶瓷文化世界（观光工厂）', village: '龙浔镇', county: '德化县',
        type: '非遗工坊', durationMin: 210, bestSeason: '全年',
        desc: '德化是全国最大的陶瓷工艺品生产和出口基地之一，当地陶瓷文化园区集生产研发、技艺体验与购物于一体，设陶瓷文化生活馆、海丝陶瓷历史博物馆、世界陶瓷文化主题馆与陶瓷创意观光工厂。游客可近距离观看拉坯、捏塑、修坯工序并参与陶瓷DIY，把"中国白"亲手带走。',
        highlights: ['陶瓷历史博物馆', '拉坯与瓷花捏塑DIY', '观光工厂生产线', '白瓷茶器选购'],
        heritageRefs: ['qz-dehua'],
        source: '泉州市文旅局公开资料'
      },
      {
        id: 'qz-rural-hushan', name: '永春岵山古镇与古村落群', village: '岵山镇', county: '永春县',
        type: '传统村落', durationMin: 180, bestSeason: '夏季荔枝季、秋季',
        desc: '闽南山区保存较为完整的古村落群，古街、古刹、古厝与成片百年荔枝林共生，田园与聚落肌理清晰。岵山一带是体验闽南农耕与宗族文化、观察"古村活化"路径的典型样本，周边可联动北溪文苑等生态景区。',
        highlights: ['古街古厝群', '百年荔枝林', '闽南宗族祠堂', '田园骑行'],
        heritageRefs: [],
        source: '永春县文旅公开资料'
      },
      {
        id: 'qz-rural-laiwang', name: '来旺良品堂闽南古早味传承基地', village: '安海镇一带', county: '晋江市',
        type: '非遗工坊', durationMin: 150, bestSeason: '全年（晴日可看晒面线）',
        desc: '占地32亩的古早味观光工厂，以"弘扬中华喜文化、传承闽南古早味"为宗旨，设闽南婚喜庆民俗文化馆、古早味观光工厂、伴手礼展售区与传承教室。基地为古早味手工匠人提供规范车间，并研发"我是守艺人"DIY课程体系，其中侨乡手工面线需经十几道工序反复拉弹，是"非遗工坊+创业扶持+研学旅游"一体化运营的样板。',
        highlights: ['手工面线十几道工序', '古早味DIY课程', '闽南婚喜庆民俗馆', '伴手礼展售'],
        heritageRefs: ['qz-handmianxian'],
        source: '来旺良品堂公开资料'
      },
      {
        id: 'qz-rural-cendou', name: '南安石井镇岑兜村（高甲戏发祥地）', village: '石井镇岑兜村', county: '南安市',
        type: '传统文化村落', durationMin: 120, bestSeason: '节庆与民俗活动期间',
        desc: '高甲戏发祥地，村中保留与高甲戏相关的宗祠与戏台记忆，是"剧种起源地+村落"类型文化空间的代表。适合作戏曲研学与乡土文化寻根，可结合周边石材文创园区形成"雕艺+戏曲"主题线。',
        highlights: ['高甲戏发源地文化空间', '乡土戏曲研学', '宗祠戏台'],
        heritageRefs: ['qz-gaojiaxi'],
        source: '泉州市文旅局公开线路资料'
      },
      {
        id: 'qz-rural-laocu', name: '永春老醋文创园（观光工厂）', village: '桃城镇一带', county: '永春县',
        type: '非遗工坊', durationMin: 120, bestSeason: '全年',
        desc: '永春老醋（福建红曲醋）四大名醋中唯一以红曲酿造者，酿制技艺于2009年列入福建省非物质文化遗产保护名录。文创园开放古法酿醋工坊与陈酿车间，可了解糯米、红曲、芝麻为原料的独特酿造路径，并品鉴年份醋。',
        highlights: ['古法酿醋工序', '红曲陈酿车间', '年份醋品鉴', '醋文化文创'],
        heritageRefs: ['qz-yongchun-vinegar'],
        source: '福建省非遗保护名录、永春县公开资料'
      }
    ],

    // 非遗工坊（产业赋能 Agent 的服务对象）
    workshops: [
      {
        id: 'qz-ws-dehua-kiln', name: '德化白瓷手作工坊', village: '龙浔镇/三班镇一带', county: '德化县',
        heritageId: 'qz-dehua', craft: '德化瓷烧制技艺',
        scale: '县域陶瓷产业集群，大中小工坊并存',
        products: [
          { name: '白瓷茶器套装（盖碗+品杯）', priceRange: '120-480元', note: '手绘与量产价差主要来自画工工时' },
          { name: '瓷花/捏塑摆件', priceRange: '80-600元', note: '纯手工捏制，工时占比高' },
          { name: '生肖/节庆限定瓷礼', priceRange: '60-260元', note: '节令性需求集中' }
        ],
        experience: { available: true, price: '50-150元/人', durationMin: 90, desc: '拉坯、捏瓷花、彩绘上釉' },
        channels: ['线下门店与展会', '电商平台', '景区与观光工厂直销'],
        painPoints: ['同质化竞争激烈，低价内卷', '文创设计能力弱，多为来样代工', '品牌故事与产地文化表达不足', '缺乏茶器使用场景内容运营'],
        source: '德化陶瓷产业公开资料整理'
      },
      {
        id: 'qz-ws-tieguanyin', name: '安溪铁观音制茶工坊', village: '感德镇/西坪镇一带', county: '安溪县',
        heritageId: 'qz-tieguanyin', craft: '乌龙茶（铁观音）制作技艺',
        scale: '以茶农家庭作坊与合作社为主',
        products: [
          { name: '清香型铁观音（当季）', priceRange: '120-800元/斤', note: '价格与山头、工艺、季节强相关' },
          { name: '浓香/陈香型铁观音', priceRange: '200-1500元/斤', note: '需炭焙与陈化，时间成本高' },
          { name: '茶礼盒（伴手礼装）', priceRange: '180-600元/盒', note: '包装成本占比通常高于散茶' }
        ],
        experience: { available: true, price: '80-200元/人', durationMin: 150, desc: '采青、摇青、包揉、烘焙体验' },
        channels: ['熟人圈层与产地直销', '茶企收购', '电商直播'],
        painPoints: ['茶农议价能力弱，收购价受压', '真假产地混杂，消费者辨别成本高', '缺少标准化风味描述与品鉴语言', '直播话术套路化，难以表达工艺价值'],
        source: '安溪茶产业公开资料整理'
      },
      {
        id: 'qz-ws-incense', name: '永春达埔制香工坊', village: '达埔镇', county: '永春县',
        heritageId: 'qz-dapu-incense', craft: '永春篾香制作技艺',
        scale: '以家庭作坊与香企作坊群为主',
        products: [
          { name: '养生香/线香', priceRange: '30-200元/盒', note: '原料等级（沉香/檀香含量）决定价位' },
          { name: '香器与香道套装', priceRange: '120-680元/套', note: '组合销售可提升客单价' },
          { name: '文旅联名香礼', priceRange: '60-300元/盒', note: '依赖当地文旅渠道' }
        ],
        experience: { available: true, price: '60-120元/人', durationMin: 60, desc: '制香工序观摩、掷香花、香道体验' },
        channels: ['宗教与民俗用香渠道', '电商平台', '观光工厂与旅游团'],
        painPoints: ['以传统祭祀用香为主，年轻客群认知低', '产品形态老化，包装陈旧', '香道体验与产品销售转化链路断层', '养生香功效表达易踩合规红线'],
        source: '永春达埔香产业公开资料整理'
      },
      {
        id: 'qz-ws-vinegar', name: '永春老醋酿造坊', village: '桃城镇一带', county: '永春县',
        heritageId: 'qz-yongchun-vinegar', craft: '永春老醋酿制技艺（省级非遗）',
        scale: '以老字号企业与作坊并存的格局',
        products: [
          { name: '三年/五年陈老醋', priceRange: '40-260元/瓶', note: '年份决定稀缺性' },
          { name: '醋饮/调味礼盒', priceRange: '100-400元/盒', note: '适合节庆伴手礼' },
          { name: '醋文化文创（开瓶器/醋坛摆件）', priceRange: '50-200元', note: '文旅场景延伸品' }
        ],
        experience: { available: true, price: '40-100元/人', durationMin: 60, desc: '古法酿醋工坊参观与品鉴' },
        channels: ['商超与特产店', '电商平台', '观光工厂'],
        painPoints: ['消费频次受调味品属性限制', '年轻群体对酿醋工艺缺乏感知', '产品与"健康饮食"内容结合不足'],
        source: '永春县公开资料整理'
      },
      {
        id: 'qz-ws-noodle', name: '晋江手工面线工坊（来旺基地内）', village: '安海镇一带', county: '晋江市',
        heritageId: 'qz-handmianxian', craft: '闽南手工面线制作技艺',
        scale: '基地化运营，为匠人提供规范车间',
        products: [
          { name: '侨乡手工面线（960g一提）', priceRange: '30-80元/提', note: '天气晴好方可晾晒，产量受天气约束' },
          { name: '古早味伴手礼组合', priceRange: '80-260元/盒', note: '多品类组合提升客单价' },
          { name: 'DIY体验课程包', priceRange: '60-120元/人', note: '课程+礼包模式' }
        ],
        experience: { available: true, price: '60-120元/人', durationMin: 90, desc: '"我是守艺人"面线制作课程，含礼包赠送' },
        channels: ['研学与旅游团', '观光工厂直销', '电商平台'],
        painPoints: ['受天气制约，产能不稳定', '保鲜与物流要求高', '手工价值难以在价格上体现'],
        source: '来旺良品堂公开资料整理'
      },
      {
        id: 'qz-ws-stone', name: '惠安石雕工坊', village: '崇武镇/洛阳一带', county: '惠安县',
        heritageId: 'qz-huidiao', craft: '惠安石雕',
        scale: '县域雕艺产业集群，大师工作室与工厂并存',
        products: [
          { name: '石雕茶盘/香插', priceRange: '200-1800元', note: '石材与工时决定价格' },
          { name: '小件装饰雕艺品', priceRange: '150-900元', note: '适合文旅零售' },
          { name: '建筑与景观构件', priceRange: '按项目计', note: '工程类订单为主营' }
        ],
        experience: { available: true, price: '80-200元/人', durationMin: 120, desc: '雕艺文创园参观、影雕体验' },
        channels: ['工程订单', '雕艺街与文创园零售', '线上定制'],
        painPoints: ['工程订单波动大，淡旺季明显', '小件文旅产品占比低', '大师工艺价值与大众消费之间断层', '体力与粉尘环境导致年轻人从业意愿低'],
        source: '惠安雕艺产业公开资料整理'
      }
    ],

    // 乡村好物（可生成文案/定价/包装建议）
    products: [
      { name: '德化白瓷茶器', category: '茶器', origin: '德化县', priceRange: '120-480元', heritageNote: '德化瓷烧制技艺为国家级非物质文化遗产，白瓷釉色温润被欧洲誉为"中国白"。', sellingPoints: ['产地窑口直供', '可配合工夫茶/铁观音场景使用', '可定制刻字'], costRef: { material: 0.30, labor: 0.38, package: 0.10, logistics: 0.08, other: 0.14 }, source: '德化陶瓷产业公开资料整理' },
      { name: '安溪铁观音（当季清香型）', category: '茶叶', origin: '安溪县', priceRange: '120-800元', heritageNote: '铁观音制作技艺为国家级非物质文化遗产，2022年随"中国传统制茶技艺及其相关习俗"入选人类非遗代表作名录。', sellingPoints: ['当季新茶', '可溯源山头', '附冲泡建议卡'], costRef: { material: 0.45, labor: 0.22, package: 0.15, logistics: 0.08, other: 0.10 }, source: '安溪茶产业公开资料整理' },
      { name: '永春篾香（养生线香）', category: '香品', origin: '永春县达埔镇', priceRange: '30-200元', heritageNote: '永春篾香制作技艺属省市级非遗保护范畴，达埔镇有"中国香都"之称。', sellingPoints: ['传统篾香工艺', '可搭配香道体验', '礼盒装适合伴手礼'], costRef: { material: 0.42, labor: 0.28, package: 0.12, logistics: 0.08, other: 0.10 }, source: '永春达埔香产业公开资料整理' },
      { name: '永春老醋（三年陈）', category: '调味品', origin: '永春县', priceRange: '40-260元', heritageNote: '永春老醋酿制技艺2009年列入福建省级非物质文化遗产名录，为四大名醋中唯一用红曲酿造者。', sellingPoints: ['古法红曲酿造', '年份可追溯', '佐餐与凉拌皆宜'], costRef: { material: 0.40, labor: 0.20, package: 0.18, logistics: 0.12, other: 0.10 }, source: '福建省非遗保护名录' },
      { name: '惠安石雕茶盘', category: '工艺品', origin: '惠安县', priceRange: '200-1800元', heritageNote: '惠安石雕为国家级非物质文化遗产，以影雕、圆雕等技法著称。', sellingPoints: ['整石开料', '一人一版', '可作景观与实用兼具的茶席主件'], costRef: { material: 0.35, labor: 0.45, package: 0.08, logistics: 0.07, other: 0.05 }, source: '惠安雕艺产业公开资料整理' },
      { name: '侨乡手工面线', category: '食品', origin: '晋江市', priceRange: '30-80元', heritageNote: '闽南手工线面制作技艺属传统饮食技艺保护范畴，工序达十几道。', sellingPoints: ['纯手工拉制', '寓意长寿吉祥', '闽南婚庆必备礼俗食品'], costRef: { material: 0.38, labor: 0.34, package: 0.12, logistics: 0.09, other: 0.07 }, source: '来旺良品堂公开资料整理' }
    ],

    // 农事体验
    farm: [
      { name: '安溪茶园采茶制茶体验', village: '感德镇/西坪镇一带', county: '安溪县', season: '春茶4-5月、秋茶10月', durationMin: 180, price: '80-200元/人', desc: '随茶农上山采青，回到作坊参与晒青、摇青、包揉，把亲手做的茶带走。', heritageRefs: ['qz-tieguanyin'] },
      { name: '永春岵山荔枝采摘与古村农事', village: '岵山镇', county: '永春县', season: '夏季荔枝季', durationMin: 150, price: '按园方计', desc: '百年荔枝林下采摘，结合古村落农事与宗族文化导览。', heritageRefs: [] },
      { name: '德化陶艺手作（含窑址参观）', village: '龙浔镇/三班镇', county: '德化县', season: '全年', durationMin: 120, price: '50-150元/人', desc: '拉坯、捏塑、彩绘，成品可烧制邮寄到家。', heritageRefs: ['qz-dehua'] }
    ],

    // 乡村住宿
    stays: [
      { name: '安溪溪禾山茶野度假酒店', village: '城东片区', county: '安溪县', priceRange: '中高端', desc: '位于铁观音文化园内，可观景客房与茶山步道，适合茶旅深度停留。' },
      { name: '梧林传统村落周边侨乡民宿', village: '新塘街道梧林社区', county: '晋江市', priceRange: '中端', desc: '依托古厝群落改造，出门即古建筑群与南音演出现场。' }
    ]
  },

  chaozhou: {
    id: 'chaozhou',
    name: '潮州',
    intro: '潮州乡村以"一镇一品、非遗成链"见长：凤凰镇的茶、浮洋镇的泥塑、意溪镇的木雕、登塘镇的竹编、饶平的土楼与渔旅，各自围绕一门手艺形成"技艺展示+产品销售+研学体验"的完整链条。当地以"百千万工程"推动乡村美学与产业运营结合，走出一条"非遗活化即产业活化"的路径。',

    // 公开统计与结构性数据（放景区与产业报道中的真实指标）
    stats: [
      { label: '凤凰单丛茶一产产值（潮安区，2024年）', value: 26.52, unit: '亿元', note: '带动二三产产值近63.5亿元', source: '潮安区人民政府网站公开报道' },
      { label: '凤凰镇年接待游客量', value: 800, unit: '万人次', note: '凤凰镇已跻身"全国乡村旅游重点镇"', source: '潮安区人民政府网站公开报道' },
      { label: '凤凰单丛茶产值年均增速（近三年）', value: 13.3, unit: '%', note: '联农带农近3万人', source: '潮安区人民政府网站公开报道' },
      { label: '凤凰镇茶农人均涉茶年收入', value: 3, unit: '万元', note: '"一叶富一方"的联农带农成效', source: '潮安区人民政府网站公开报道' },
      { label: '凤凰单丛茶品牌价值（2024年）', value: 142, unit: '亿元', note: '2025年居全国茶叶区域公用品牌影响力榜单第四名', source: '潮安区人民政府网站公开报道' },
      { label: '百年以上古茶树建档数量', value: 15213, unit: '棵', note: '已编制《凤凰单丛茶古茶树丛谱》并建古茶树基因图谱库', source: '潮安区人民政府网站公开报道' },
      { label: '潮州市非遗项目总量', value: '省级47项 / 市级139项', note: '潮绣、木雕、潮剧等构成高密度可传播素材库', source: '潮州市人民政府门户网站公开报道' }
    ],

    spots: [
      {
        id: 'cz-rural-fenghuang', name: '凤凰镇凤凰山茶旅走廊（乌岽山茶园）', village: '凤凰镇', county: '潮安区',
        type: '茶旅融合', durationMin: 300, bestSeason: '春季3-5月采茶季最佳',
        desc: '凤凰单丛茶核心产区，凤凰镇已跻身"全国乡村旅游重点镇"。当地打造凤凰山茶旅走廊，串联乌岽山茶园、茶企体验馆与非遗工坊，游客可深入茶园体验采茶、制茶，并在茶企学习工夫茶艺。凤凰山梯田茶园与古朴畲寨相映，是"茶+畲+竹"复合体验的集中区。',
        highlights: ['乌岽山古茶树群', '采茶制茶全流程', '工夫茶艺学习', '畲族村寨风情'],
        heritageRefs: ['cz-dancong', 'cz-gongfucha'],
        source: '潮安区人民政府网站公开报道'
      },
      {
        id: 'cz-rural-chaomuseum', name: '凤凰单丛茶博物馆（东兴村）', village: '凤凰镇东兴村', county: '潮安区',
        type: '非遗展馆', durationMin: 120, bestSeason: '全年',
        desc: '东兴村为省级古村落，村中保留众多华侨屋与潮州传统工艺。茶博馆由旧民宅微改造而成，设茶文化主题馆、"旧物"主题馆、"宋茶"标本主题馆、单丛茶体验馆、研学教育基地、潮文化工作室、文创中心与茶乐园八大功能区，以"茶企+村集体+农户"联营模式统一运营，被视作深山古村活化利用的样本。',
        highlights: ['八大功能区全览', '宋茶标本与旧物主题馆', '单丛茶研学教育', '茶文化文创'],
        heritageRefs: ['cz-dancong', 'cz-gongfucha'],
        source: '潮安区人民政府网站公开报道'
      },
      {
        id: 'cz-rural-dawu', name: '浮洋镇大吴村（大吴泥塑博物馆与乡村会客厅）', village: '浮洋镇大吴村', county: '潮安区',
        type: '非遗工坊', durationMin: 150, bestSeason: '全年',
        desc: '大吴泥塑发源地，村内建成大吴泥塑博物馆。当地以泥塑为核心联动陶瓷、珠绣饰品产业，形成"技艺展示+产品销售+研学体验"产业链。由村集体主导、多方共建的"大吴会客厅"汇集文创展厅、书香茶院、乡村戏台与田园营地，让村落成为可停留、可回味、可安放身心的乡土空间。',
        highlights: ['大吴泥塑博物馆', '贴塑技法研学', '乡村戏台与田园营地', '文创展厅'],
        heritageRefs: ['cz-nisu'],
        source: '潮安区人民政府网站公开资料'
      },
      {
        id: 'cz-rural-longyao', name: '凤塘镇洪巷村信靠龙窑（缶谣咖啡）', village: '凤塘镇洪巷村', county: '潮安区',
        type: '非遗工坊', durationMin: 120, bestSeason: '全年',
        desc: '以市级文物保护单位信靠龙窑为根，以"缶"（潮州独有的陶瓷符号）与"谣"（共通的语言）链接年轻时尚的咖啡生活，用陶土、陶罐、原木打造质朴窑场景观，提供陶艺手作、工坊参观与休闲体验，是"陶艺+咖啡"业态创新、让古老龙窑重焕生机的典型。',
        highlights: ['龙窑遗址参观', '陶艺手作体验', '窑场景观咖啡', '青年创业样本'],
        heritageRefs: ['cz-fengxi'],
        source: '潮安区人民政府网站公开资料'
      },
      {
        id: 'cz-rural-yixi', name: '意溪镇美丽圩镇会客厅（木雕非遗体验馆）', village: '意溪镇', county: '湘桥区',
        type: '非遗展馆', durationMin: 100, bestSeason: '全年',
        desc: '意溪为潮州"木雕之乡"。当地活化原意溪水利所闲置资产打造圩镇会客厅，建筑临江而建，屋顶沿用潮州传统厝角头形制，展厅以时间轴梳理意溪千年建制，二层设木雕非遗体验馆，延续木雕之乡文脉，集图文展陈、木雕体验与书香咖啡于一体。',
        highlights: ['木雕非遗体验馆', '临江厝角头建筑', '意溪建制历史展陈', '木雕手作'],
        heritageRefs: ['cz-mudiao'],
        source: '潮安区人民政府网站公开资料'
      },
      {
        id: 'cz-rural-zhulin', name: '登塘镇关竹村唐炫翠竹境生态园（竹编非遗）', village: '登塘镇关竹村', county: '潮安区',
        type: '农事体验', durationMin: 180, bestSeason: '全年，夏季清凉',
        desc: '依托原生竹林与天然溪流的生态基底，深度融合竹文化与竹编非遗技艺。园区配套竹文化陈列馆、竹编手工坊与竹林民宿，构建"体验+住宿+餐饮+研学"一体化运营体系，以特色竹文旅赋能乡村富民增收。',
        highlights: ['竹文化陈列馆', '竹编手工坊', '竹林民宿', '溪流生态步道'],
        heritageRefs: ['cz-zhubian'],
        source: '潮安区人民政府网站公开资料'
      },
      {
        id: 'cz-rural-dongming', name: '饶平县东山镇东明村（梅竹筑美研学基地）', village: '东山镇东明村', county: '饶平县',
        type: '传统文化村落', durationMin: 150, bestSeason: '青梅季（冬春）最宜',
        desc: '盘活闲置东明小学校舍改造为乡村研学基地，紧扣"梅竹东明"农文旅定位，打造竹编课堂、青梅体验等特色场景，采用"合作社主导+传承人授课+村校共建"模式，让梅香竹韵在新时代续写新篇。',
        highlights: ['闲置校舍活化样板', '竹编课堂', '青梅采摘与加工体验', '村校共建研学'],
        heritageRefs: ['cz-zhubian'],
        source: '潮安区人民政府网站公开资料'
      },
      {
        id: 'cz-rural-daoyun', name: '饶平县三饶镇南联村道韵楼', village: '三饶镇南联村', county: '饶平县',
        type: '传统村落', durationMin: 120, bestSeason: '全年',
        desc: '始建于明代的八角形土楼，为中国现存最大的八角形土楼，全国重点文物保护单位。遵循"保护优先、文化赋能"，以"修旧如旧"原则整体修缮，2024年修缮后重焕光彩，通过专业化文旅运营带动客流与村集体增收，让古建在活化中新生。',
        highlights: ['中国最大八角形土楼', '全国重点文物保护单位', '修旧如旧修缮样本', '客家与潮汕文化交融'],
        heritageRefs: [],
        source: '潮安区人民政府网站公开资料'
      },
      {
        id: 'cz-rural-ximi', name: '潮安区归湖镇溪美村（潮州小桂林）', village: '归湖镇溪美村', county: '潮安区',
        type: '农事体验', durationMin: 150, bestSeason: '夏秋最宜',
        desc: '立足"竹林+溪流"资源，1500亩连片毛竹环拥成翠色长廊，被誉为"潮州小桂林"。1.2公里亲水栈道沿溪蜿蜒，18间"小竹楼阁"以竹为骨、以溪为镜，优质生态景观带动乡村文旅发展，助力村集体增收。',
        highlights: ['1500亩连片毛竹', '亲水栈道漫步', '竹楼阁休憩', '竹筏体验'],
        heritageRefs: [],
        source: '潮安区人民政府网站公开资料'
      },
      {
        id: 'cz-rural-xiaoao', name: '饶平县柘林镇西澳村（西澳渔旅）', village: '柘林镇西澳村', county: '饶平县',
        type: '农事体验', durationMin: 180, bestSeason: '春秋最宜',
        desc: '依托西澳内湾优质海洋生态与成熟渔业养殖产业，以新型环保材料搭建3000平方米海上平台，打造现代化滨海休闲空间，配套海鲜餐厅、海景咖啡厅、临海茶座等业态。项目秉持"牧海耕渔"核心理念，推动传统渔业与文旅双向赋能，填补潮州海上渔旅空白，以平台经济激活整片海域产业。',
        highlights: ['3000㎡海上平台', '海上渔排与养殖观摩', '海景茶座与咖啡', '渔旅融合样本'],
        heritageRefs: [],
        source: '潮安区人民政府网站公开资料'
      }
    ],

    workshops: [
      {
        id: 'cz-ws-chaoxiu', name: '潮绣传承人工作室', village: '湘桥区古城及周边镇', county: '湘桥区',
        heritageId: 'cz-chaoxiu', craft: '潮绣（垫高绣）',
        scale: '以大师工作室+绣娘协作网络为主',
        products: [
          { name: '潮绣团扇/挂屏（小件）', priceRange: '300-3000元', note: '绣工时长为价格核心变量' },
          { name: '潮绣服饰与戏服配件', priceRange: '按件计', note: '传统主要收入来源' },
          { name: '潮绣文创（书签/胸针/包饰）', priceRange: '50-300元', note: '降门槛、引流款' }
        ],
        experience: { available: true, price: '80-200元/人', durationMin: 120, desc: '基础针法体验，可完成一件小绣品' },
        channels: ['定制订单', '文创店与景区', '展会与对外交流'],
        painPoints: ['刺绣工时极长，量产困难', '年轻绣娘断层，人工成本高', '纹样创新不足，难以对接现代家居场景', '高价位与大众消费之间缺过渡产品'],
        source: '潮安区/潮州市公开资料整理'
      },
      {
        id: 'cz-ws-mudiao', name: '意溪镇潮州木雕工坊', village: '意溪镇', county: '湘桥区',
        heritageId: 'cz-mudiao', craft: '潮州木雕（多层镂通雕、金漆木雕）',
        scale: '工坊式传承，多为数人至数十人规模',
        products: [
          { name: '木雕摆件/挂屏', priceRange: '400-5000元', note: '按工时与用材定级' },
          { name: '祠堂与建筑构件', priceRange: '按项目计', note: '工程类主营收' },
          { name: '木雕文创（生肖/家居小件）', priceRange: '80-500元', note: '适合文旅零售'}
        ],
        experience: { available: true, price: '80-180元/人', durationMin: 120, desc: '意溪会客厅木雕体验馆，基础雕刻入门' },
        channels: ['工程与宗祠订单', '雕艺街与文创店', '文旅体验馆'],
        painPoints: ['榫卯与雕工传承周期长，学徒少', '产品与当代家居场景适配度低', '工程订单周期长、回款慢', '缺少面向游客的标准化小件产品线'],
        source: '潮安区人民政府网站公开资料整理'
      },
      {
        id: 'cz-ws-nisu', name: '浮洋镇大吴泥塑工坊', village: '浮洋镇大吴村', county: '潮安区',
        heritageId: 'cz-nisu', craft: '大吴泥塑（贴塑技法）',
        scale: '村域作坊群，博物馆+农户作坊协同',
        products: [
          { name: '戏曲人物泥塑摆件', priceRange: '150-1200元', note: '传统代表品类' },
          { name: '泥塑文创小件/冰箱贴', priceRange: '30-150元', note: '引流与伴手礼款' },
          { name: '定制人像与场景捏塑', priceRange: '按件计', note: '高毛利个性化订单' }
        ],
        experience: { available: true, price: '60-150元/人', durationMin: 90, desc: '贴塑入门课程，成品可带走' },
        channels: ['博物馆与景区零售', '研学团', '电商与文创店'],
        painPoints: ['易碎导致物流损耗高', '题材偏传统戏曲，年轻客群认知门槛高', '作坊分散，统一品牌与品控难', '体验转销售的链路不清晰'],
        source: '潮安区人民政府网站公开资料整理'
      },
      {
        id: 'cz-ws-dancong', name: '凤凰镇单丛茶非遗工坊', village: '凤凰镇', county: '潮安区',
        heritageId: 'cz-dancong', craft: '凤凰单丛茶制作技艺',
        scale: '"茶企+村集体+农户"联营为主',
        products: [
          { name: '蜜兰香/黄栀香单丛（口粮装）', priceRange: '150-600元/斤', note: '香型与山场决定价位' },
          { name: '乌岽山古树单丛', priceRange: '800-6000元/斤', note: '百年级古茶树资源稀缺' },
          { name: '创新伴手礼（茶礼盒/鸭屎香柠檬茶）', priceRange: '60-300元', note: '面向年轻客群的快消形态' }
        ],
        experience: { available: true, price: '100-260元/人', durationMin: 180, desc: '茶园采茶、做青观摩、炭焙与工夫茶艺' },
        channels: ['产地直销与茶企', '茶博馆与民宿体验店', '电商与直播'],
        painPoints: ['茶农与终端品牌之间层层加价', '古树茶真假难辨，需要权威身份背书', '香型术语专业，消费者选择困难', '旅游旺季与采茶季高度重叠，接待能力受限'],
        source: '潮安区人民政府网站公开报道整理'
      },
      {
        id: 'cz-ws-tonghua', name: '枫溪通花瓷工坊', village: '枫溪镇', county: '潮安区',
        heritageId: 'cz-fengxi', craft: '枫溪瓷烧制技艺（通花瓷）',
        scale: '陶瓷产业集群内的中小工坊',
        products: [
          { name: '通花瓷茶具', priceRange: '180-900元', note: '镂空手工成本高' },
          { name: '瓷花摆件', priceRange: '120-800元', note: '薄如蝉翼为工艺卖点' },
          { name: '日用瓷（餐具/咖啡具）', priceRange: '60-400元', note: '走量品类' }
        ],
        experience: { available: true, price: '60-160元/人', durationMin: 90, desc: '陶艺手作与通花瓷工艺观摩' },
        channels: ['外贸与批发', '电商', '窑址文旅（缶谣咖啡等）'],
        painPoints: ['外贸依赖度高，价格竞争激烈', '通花工艺附加值未被充分定价', '产品设计同质化', '文旅场景转化率低'],
        source: '潮安区人民政府网站公开资料整理'
      },
      {
        id: 'cz-ws-zhubian', name: '关竹村竹编工坊', village: '登塘镇关竹村', county: '潮安区',
        heritageId: 'cz-zhubian', craft: '潮州竹编',
        scale: '村集体主导的共富工坊',
        products: [
          { name: '竹编茶器与茶席配件', priceRange: '80-400元', note: '与工夫茶场景强相关' },
          { name: '竹编家居收纳', priceRange: '60-300元', note: '实用型走量款' },
          { name: '竹编手作体验包', priceRange: '50-120元', note: '研学与亲子场景' }
        ],
        experience: { available: true, price: '50-120元/人', durationMin: 90, desc: '竹文化陈列馆参观 + 竹编手作' },
        channels: ['景区与民宿', '研学团', '电商'],
        painPoints: ['手编效率低，难以规模化', '产品替代性强，价格敏感', '设计偏传统，缺少现代审美款', '村域工坊品牌影响力弱'],
        source: '潮安区人民政府网站公开资料整理'
      }
    ],

    products: [
      { name: '凤凰单丛茶（蜜兰香/鸭屎香）', category: '茶叶', origin: '潮安区凤凰镇', priceRange: '150-600元', heritageNote: '凤凰单丛茶制作技艺为国家级非物质文化遗产（2021年第五批），与潮州工夫茶艺互为表里。', sellingPoints: ['一树一香，十大香型', '产地海拔与山场可溯源', '配工夫茶冲泡指引'], costRef: { material: 0.42, labor: 0.24, package: 0.16, logistics: 0.08, other: 0.10 }, source: '潮安区人民政府网站公开报道整理' },
      { name: '潮州柑（柑普/柑饼）', category: '农产品', origin: '潮安区一带', priceRange: '40-260元', heritageNote: '潮州柑橘栽培与加工历史悠久，柑普茶为近年热销形态。', sellingPoints: ['地域特色农产品', '可搭配单丛茶的复合口感', '节令性强'], costRef: { material: 0.45, labor: 0.20, package: 0.15, logistics: 0.12, other: 0.08 }, source: '潮州市公开资料整理' },
      { name: '潮绣文创（团扇/书签）', category: '工艺品', origin: '湘桥区', priceRange: '50-300元', heritageNote: '潮绣为国家级非物质文化遗产（2006年首批），以垫高绣浮凸如浮雕著称。', sellingPoints: ['手工刺绣', '可作汉服与国风搭配', '送礼体面'], costRef: { material: 0.25, labor: 0.55, package: 0.10, logistics: 0.05, other: 0.05 }, source: '潮州市公开资料整理' },
      { name: '通花瓷茶具', category: '茶器', origin: '潮安区枫溪镇', priceRange: '180-900元', heritageNote: '枫溪瓷烧制技艺为省级非物质文化遗产（以官方名录为准），通花瓷镂空如网、薄如蝉翼。', sellingPoints: ['镂空手工成型', '与工夫茶美学高度契合', '产地直供'], costRef: { material: 0.32, labor: 0.40, package: 0.12, logistics: 0.10, other: 0.06 }, source: '潮安区公开资料整理' },
      { name: '大吴泥塑摆件', category: '工艺品', origin: '潮安区浮洋镇大吴村', priceRange: '150-1200元', heritageNote: '大吴泥塑为国家级非物质文化遗产（2008年），以贴塑技法塑造戏曲人物见长。', sellingPoints: ['戏曲人物题材', '村域产地直供', '可定制人像'], costRef: { material: 0.22, labor: 0.50, package: 0.16, logistics: 0.07, other: 0.05 }, source: '潮安区人民政府网站公开资料整理' },
      { name: '竹编茶席配件', category: '家居', origin: '潮安区登塘镇关竹村', priceRange: '80-400元', heritageNote: '潮州竹编为地方传统技艺，关竹村以竹文化构建"体验+住宿+餐饮+研学"体系。', sellingPoints: ['手工编织', '与工夫茶场景天然契合', '村集体共富工坊出品'], costRef: { material: 0.28, labor: 0.46, package: 0.12, logistics: 0.09, other: 0.05 }, source: '潮安区人民政府网站公开资料整理' }
    ],

    farm: [
      { name: '凤凰山采茶制茶体验', village: '凤凰镇', county: '潮安区', season: '春茶3-5月、秋茶9-10月', durationMin: 240, price: '100-260元/人', desc: '高山茶园采青，作坊内参与做青、揉捻与炭焙观摩，最后以工夫茶艺收尾。', heritageRefs: ['cz-dancong', 'cz-gongfucha'] },
      { name: '东明村青梅采摘与加工体验', village: '东山镇东明村', county: '饶平县', season: '冬春青梅季', durationMin: 150, price: '按基地计', desc: '梅林采摘、青梅腌制与竹编课堂联动，适合亲子与研学团队。', heritageRefs: ['cz-zhubian'] },
      { name: '关竹村竹编手作与竹林研学', village: '登塘镇关竹村', county: '潮安区', season: '全年', durationMin: 120, price: '50-120元/人', desc: '竹文化陈列馆导览 + 竹编手作，成品可带走。', heritageRefs: ['cz-zhubian'] }
    ],

    stays: [
      { name: '凤凰镇茶山民宿与茶宿', village: '凤凰镇东兴村一带', county: '潮安区', priceRange: '中端至高端', desc: '由华侨屋与古民宅微改造而成，推窗即梯田茶园，可参与采茶与茶艺。' },
      { name: '关竹村竹林民宿', village: '登塘镇关竹村', county: '潮安区', priceRange: '中端', desc: '建于竹林溪畔，配套竹编手作与竹宴，适合静养型乡村旅游。' },
      { name: '竹博园"竹巢引凤"民宿（沙溪镇贾里村）', village: '沙溪镇贾里村', county: '潮安区', priceRange: '中高端', desc: '全竹构筑的特色民宿，集观光、研学、休闲、美食于一体。' }
    ]
  },

  suzhou: {
    id: 'suzhou',
    name: '苏州',
    intro: '苏州乡村以"江南水乡 + 苏作工艺 + 花果茶桑"为底色：太湖东山、西山的茶园与古村，高新区树山的千亩梨园，吴江震泽的蚕桑丝绸，张家港凤凰的河阳山歌，常熟、太仓的田园村落，共同构成环太湖乡村文旅带。当地以"一村一品、茶果间作、农文旅融合"推动乡村经营，游客既能在茶园炒一锅碧螺春，也能在绣庄跟绣娘学一针，形成"手艺即体验、产地即卖场"的乡村产业形态。',

    // 公开统计与结构性数据（供运营洞察 Agent 引用，逐条标注来源）
    stats: [
      { label: '苏州非遗项目总量', value: '世界级8项 / 国家级33项 / 省级173项 / 市级245项', note: '拥有苏州古典园林、中国大运河苏州段两项世界文化遗产，为全球首个"世界遗产典范城市"', source: '苏州市地方志编纂委员会办公室《鉴证苏州·"十四五"回眸：文化赋能》' },
      { label: '非遗代表性传承人', value: '国家级50人 / 省级143人 / 市级464人', note: '覆盖苏绣、缂丝、宋锦、香山帮、碧螺春等主要门类', source: '苏州市地方志编纂委员会办公室《鉴证苏州·"十四五"回眸：文化赋能》' },
      { label: '中国历史文化名镇数量', value: 15, unit: '个', note: '含周庄、同里等；另有山塘、平江2个中国历史文化街区与苏州、常熟2座国家历史文化名城', source: '苏州市地方志编纂委员会办公室《鉴证苏州·"十四五"回眸：文化赋能》' },
      { label: '树山村年旅游接待人数', value: 120, unit: '万人次', note: '全村总面积5.2平方公里，绿化覆盖率98%，1060亩梨园、1000亩茶园、2000亩杨梅林；人均年收入超4.8万元，村内各业态营业年总收入近2亿元', source: '中国网《苏州树山生态村：打造生态空间 助力乡村振兴》（2022年）' },
      { label: '吴中区碧螺春茶园面积', value: 4.4, unit: '万亩', note: '2024年产量374吨、相关产业链总值超4亿元；洞庭山碧螺春列全国绿茶产区品牌强度第三', source: '新华日报《吴中：太湖之滨"拼"出发展新图景》（2025年）' },
      { label: '东山洞庭山茶叶产值', value: 2.06, unit: '亿元', note: '东山镇茶树栽培面积1.96万亩、2024年茶叶产量150吨；金庭镇茶叶面积2.23万亩、产量212吨、产值2亿元', source: '上观新闻《碧螺春下月开采》' },
      { label: '镇湖苏绣从业规模', value: 9000, unit: '余人', note: '镇湖绣品街长约1.7公里、聚集400多家商户；2017年入选江苏省首批省级特色小镇', source: '腾讯新闻·复旦大学新闻学院"记录中国"《苏绣"内卷"待解：非遗如何"出圈"》（2021年）' },
      { label: '吴中区非遗代表性传承人', value: '267人（国家级6人 / 省级17人 / 市级29人）', note: '全区在全国工艺美术11个大类中拥有10个大类、3000余个品种', source: '新华日报《吴中：太湖之滨"拼"出发展新图景》（2025年）' }
    ],

    // 乡村文旅点位（可被行程规划 Agent 嵌入）
    spots: [
      {
        id: 'sz-rural-shushan', name: '树山生态村（树山村）', village: '通安镇树山村', county: '虎丘区',
        type: '茶旅融合', durationMin: 240, bestSeason: '3月梨花季、6月杨梅季、7-8月翠冠梨季',
        desc: '位于大阳山国家森林公园北麓，总面积5.2平方公里，绿化覆盖率98%，拥有1060亩梨园、1000亩茶园、2000亩杨梅林，云泉茶、杨梅、翠冠梨并称"树山三宝"。村内木栈道、竹海与大石山十八景（云泉寺、摩崖石刻、款云亭）散落其间，配温泉与精品民宿，2020年入选全国乡村旅游重点村。',
        highlights: ['千亩梨园梨花季', '木栈道竹林徒步', '云泉寺与大石山摩崖石刻', '树山三宝采摘与温泉民宿'],
        heritageRefs: [],
        source: '中国网《苏州树山生态村：打造生态空间 助力乡村振兴》（2022年）'
      },
      {
        id: 'sz-rural-luxiang', name: '东山镇陆巷古村', village: '东山镇陆巷村', county: '吴中区',
        type: '传统文化村落', durationMin: 180, bestSeason: '全年，春茶与秋季最宜',
        desc: '太湖东山岛上的明代古村落，是明代大学士王鏊故里，村口"三元牌坊"与寒谷渡、会老堂等明清宅第连片保存，被誉为"太湖第一古村"，2021年入选江苏省乡村旅游重点村。巷弄内可见苏作木作与砖雕细节，出村即东山茶园与环湖公路。',
        highlights: ['明代厅堂与三元牌坊', '太湖古码头与环湖栈道', '苏作木作与砖雕细部', '周边碧螺春茶园'],
        heritageRefs: ['sz-xiangshanbang'],
        source: '苏州市文化广电和旅游局《乡村旅游重点村》名单（2021年）'
      },
      {
        id: 'sz-rural-mingyuewan', name: '金庭镇明月湾古村', village: '金庭镇石公村', county: '吴中区',
        type: '传统文化村落', durationMin: 150, bestSeason: '全年，春茶季与秋季最佳',
        desc: '位于太湖西山岛南端，相传春秋时吴王夫差与西施曾在此赏月，故名明月湾。村中千年古樟、棋盘式石板街与伸入太湖的古码头保存完好，是江苏省乡村旅游重点村（2021年）。所在金庭镇植茶已1900余年，为洞庭山碧螺春核心产区之一。',
        highlights: ['千年古樟与石板街', '太湖古码头', '古村夜景与民宿', '碧螺春核心产区茶园'],
        heritageRefs: ['sz-biluochun'],
        source: '苏州市文化广电和旅游局《乡村旅游重点村》名单（2021年）'
      },
      {
        id: 'sz-rural-sanshan', name: '东山镇三山岛', village: '东山镇三山村', county: '吴中区',
        type: '传统文化村落', durationMin: 300, bestSeason: '春秋两季，夏季观荷',
        desc: '太湖中的岛屿村落，因"三山相连"得名，岛上有旧石器时代遗址与板壁峰等自然景观，村中多农家民宿与果园，进出需乘船，保留着相对完整的岛屿生活节奏，2023年入选江苏省乡村旅游重点村。',
        highlights: ['岛屿古村与渔家民宿', '旧石器遗址展示', '环岛步道与观湖点', '果园采摘'],
        heritageRefs: [],
        source: '苏州市文化广电和旅游局《乡村旅游重点村》名单（2023年）'
      },
      {
        id: 'sz-rural-kaixiangong', name: '七都镇开弦弓村（江村）', village: '七都镇开弦弓村', county: '吴江区',
        type: '传统文化村落', durationMin: 180, bestSeason: '全年',
        desc: '社会学家费孝通先生《江村经济》的调研地，是中国乡村研究的经典样本。村内建有费孝通江村纪念馆与中国江村文化园，结合桑田、鱼塘与新型乡村业态，呈现"研究型乡村"的独特气质，2022年入选江苏省乡村旅游重点村。',
        highlights: ['费孝通江村纪念馆', '中国江村文化园', '桑田鱼塘农事景观', '乡村研学课程'],
        heritageRefs: [],
        source: '苏州市文化广电和旅游局《乡村旅游重点村》名单（2022年）'
      },
      {
        id: 'sz-rural-fengmenglong', name: '黄埭镇冯梦龙村', village: '黄埭镇冯梦龙村', county: '相城区',
        type: '农事体验', durationMin: 180, bestSeason: '春季花海、秋季丰收季',
        desc: '明代文学家冯梦龙故里，村内保留冯梦龙故居与纪念馆，围绕"农耕+文学"开发了花海小火车、游船、活字拓印与农耕体验等项目，是苏州近郊亲子与研学乡村的代表，2021年入选江苏省乡村旅游重点村。',
        highlights: ['冯梦龙故居与纪念馆', '花海小火车与游船', '活字拓印体验', '农耕体验与采摘'],
        heritageRefs: [],
        source: '苏州市文化广电和旅游局《乡村旅游重点村》名单（2021年）'
      },
      {
        id: 'sz-rural-xiejialu', name: '震泽镇谢家路村（蚕桑丝绸）', village: '震泽镇谢家路村', county: '吴江区',
        type: '农事体验', durationMin: 210, bestSeason: '春季桑果季、全年丝绸研学',
        desc: '地处"中国丝绸名镇"震泽，村域以蚕桑文化为特色，周边有蚕桑文化园与丝绸工坊，可体验采桑、喂蚕、缫丝与蚕丝被制作，是理解江南"衣被天下"产业脉络的乡村样本，2021年入选江苏省乡村旅游重点村。',
        highlights: ['桑园采摘与养蚕体验', '缫丝与蚕丝被制作', '丝绸文化展陈', '水乡田园民宿'],
        heritageRefs: ['sz-songjin'],
        source: '苏州市文化广电和旅游局《乡村旅游重点村》名单（2021年）'
      },
      {
        id: 'sz-rural-dianzhan', name: '城厢镇电站村', village: '城厢镇电站村', county: '太仓市',
        type: '农事体验', durationMin: 150, bestSeason: '全年，春秋最佳',
        desc: '太仓近郊的田园村落，以果蔬采摘、田园观光与乡村餐饮为主，村域环境整洁、休闲业态集中，2020年入选江苏省乡村旅游重点村。太仓是江南丝竹的重要传承地，村内休闲空间时见民乐演奏与乡土文艺活动。',
        highlights: ['果蔬采摘与田园观光', '乡村特色餐饮', '江南丝竹乡土演出', '亲子农事活动'],
        heritageRefs: ['sz-jiangnan-sizhu'],
        source: '苏州市文化广电和旅游局《乡村旅游重点村》名单（2020年）'
      },
      {
        id: 'sz-rural-shuangtang', name: '凤凰镇双塘村（河阳山歌）', village: '凤凰镇双塘村', county: '张家港市',
        type: '传统文化村落', durationMin: 180, bestSeason: '全年，春季与秋季民俗活动较多',
        desc: '位于张家港凤凰镇，是国家级非遗"吴歌"中"河阳山歌"的核心流传地，周边有河阳山歌馆与凤凰山景区，村域田园风光与山歌文化相互衬托，2022年入选江苏省乡村旅游重点村。',
        highlights: ['河阳山歌馆与山歌传唱', '凤凰山与恬庄古街', '田园水乡景观', '民俗节庆活动'],
        heritageRefs: ['sz-wuge'],
        source: '苏州市文化广电和旅游局《乡村旅游重点村》名单（2022年）'
      },
      {
        id: 'sz-rural-jiangxiang', name: '支塘镇蒋巷村', village: '支塘镇蒋巷村', county: '常熟市',
        type: '传统文化村落', durationMin: 150, bestSeason: '全年',
        desc: '常熟支塘镇的江南水乡村落，以生态农业与乡村旅游闻名，村内建有农民剧场、生态园与乡村展馆，田成方、林成网，是苏州"全国乡村旅游重点村"中的早期代表，2019年入选全国乡村旅游重点村。',
        highlights: ['生态农业观光', '农民剧场与乡村展馆', '水乡田园徒步', '江南农家餐饮'],
        heritageRefs: [],
        source: '苏州市文化广电和旅游局《乡村旅游重点村》名单（2019年）'
      },
      {
        id: 'sz-rural-zhenhu', name: '镇湖苏绣小镇与绣品街', village: '镇湖街道绣品街一带', county: '虎丘区',
        type: '非遗工坊', durationMin: 150, bestSeason: '全年',
        desc: '苏绣最大的产业聚集区，长约1.7公里的绣品街聚集400多家商户，涵盖丝线、装裱、绣架与成品销售的完整链条，镇湖街道从事苏绣产供销人员超9000人，2017年入选江苏省首批省级特色小镇。街头巷尾皆可见绣娘运针。',
        highlights: ['绣品街逛绣庄', '绣娘现场运针观摩', '刺绣入门体验课', '苏绣文创选购'],
        heritageRefs: ['sz-suxiu'],
        source: '腾讯新闻·复旦大学新闻学院"记录中国"《苏绣"内卷"待解》（2021年）'
      },
      {
        id: 'sz-rural-xiangshan', name: '胥口镇香山工坊', village: '胥口镇', county: '吴中区',
        type: '非遗工坊', durationMin: 120, bestSeason: '全年',
        desc: '香山帮传统建筑营造技艺的当代聚集地，工坊内可见木作、砖雕与花窗作场，师傅现场操作榫卯与雕刻，是理解"苏州园林由谁建造"的实地课堂。周边太湖岸线与穹窿山可串联游览。',
        highlights: ['木作与榫卯现场观摩', '砖雕花窗工艺', '香山帮技艺展陈', '穹窿山与太湖岸线'],
        heritageRefs: ['sz-xiangshanbang'],
        source: '苏州市吴中区公开资料整理'
      },
      {
        id: 'sz-rural-dongshan-tea', name: '东山镇碧螺村茶园（洞庭山碧螺春核心产区）', village: '东山镇碧螺村', county: '吴中区',
        type: '茶旅融合', durationMin: 180, bestSeason: '春分至谷雨（3-4月）采茶炒茶季',
        desc: '洞庭山碧螺春核心产区之一，茶树与枇杷、杨梅、柑橘等果树间作，形成独特的"茶果间作"农业系统（2020年入选中国重要农业文化遗产）。游客可在茶厂体验采青、挑拣与"手不离茶、茶不离锅"的炒制全过程，把亲手炒的茶带走。',
        highlights: ['茶果间作生态茶园', '采青与挑拣体验', '手工炒茶观摩与实操', '明前茶季节性选购'],
        heritageRefs: ['sz-biluochun'],
        source: '乡村干部报网《一杯碧螺春 四季"茶"文章》（2024年）'
      }
    ],

    // 非遗工坊（产业赋能 Agent 的服务对象）
    workshops: [
      {
        id: 'sz-ws-suxiu', name: '镇湖苏绣工坊集群', village: '镇湖街道绣品街一带', county: '虎丘区',
        heritageId: 'sz-suxiu', craft: '苏绣',
        scale: '镇湖街道苏绣产供销从业超9000人，绣品街长约1.7公里、聚集400多家商户',
        products: [
          { name: '苏绣文创小件（团扇/书签/胸针）', priceRange: '60-300元', note: '引流与伴手礼主力款' },
          { name: '苏绣装饰画（单面绣/双面绣）', priceRange: '800-8000元', note: '工时与针法复杂度决定价位' },
          { name: '苏绣服饰配饰定制（旗袍/丝巾）', priceRange: '500-5000元', note: '按件定制，交付周期较长' }
        ],
        experience: { available: true, price: '80-260元/人', durationMin: 90, desc: '在绣庄跟绣娘学基础针法，亲手绣制手帕或书签带走' },
        channels: ['绣品街门店与定制', '电商与直播间', '文旅与研学团'],
        painPoints: ['从业者年龄断层严重，年轻绣娘补充不足', '行业同质化内卷，低价竞争压缩利润', '机绣冒充手工绣，消费者辨别成本高', '大件作品工期长，资金占用重'],
        source: '腾讯新闻·复旦大学新闻学院"记录中国"《苏绣"内卷"待解》（2021年）'
      },
      {
        id: 'sz-ws-biluochun', name: '洞庭山碧螺春制茶工坊', village: '东山镇碧螺村一带', county: '吴中区',
        heritageId: 'sz-biluochun', craft: '洞庭山碧螺春制作技艺（茶果间作系统）',
        scale: '"龙头企业+合作社+茶农"为主，吴中区碧螺春茶园面积4.4万亩',
        products: [
          { name: '明前碧螺春（特级/一级）', priceRange: '800-4000元/斤', note: '约七万颗嫩芽得一斤，产量稀缺' },
          { name: '雨前碧螺春（口粮装）', priceRange: '200-800元/斤', note: '日常饮用主力，性价比更高' },
          { name: '创新茶饮与红茶系列（碧螺春拿铁/桂花红茶）', priceRange: '20-180元', note: '实现"一季春茶、四季增收"' }
        ],
        experience: { available: true, price: '100-300元/人', durationMin: 150, desc: '茶园采青、挑拣，观摩并实操手工炒茶，成品可带走' },
        channels: ['产地直销与茶企', '茶文化节与博览会', '电商直播与创新茶饮门店'],
        painPoints: ['正宗核心产区产量少，以次充好与新旧茶混装时有发生', '采茶工季节性短缺，人工成本逐年上升', '香型与等级术语专业，消费者选择困难', '春茶一季集中上市，与全年旅游客流错配'],
        source: '新华日报、上观新闻及乡村干部报网公开报道整理'
      },
      {
        id: 'sz-ws-xiangshanbang', name: '香山帮营造工坊', village: '胥口镇', county: '吴中区',
        heritageId: 'sz-xiangshanbang', craft: '香山帮传统建筑营造技艺',
        scale: '以园林与古建工程队为核心，兼营技艺传习与文创',
        products: [
          { name: '传统木作小件（榫卯摆件/花窗灯）', priceRange: '200-2000元', note: '可零售的标准化小件' },
          { name: '园林式木作与花窗构件定制', priceRange: '按项目计', note: '工程与私家庭院订单为主' },
          { name: '营造研学课程包', priceRange: '120-400元/人', note: '面向研学团与亲子课堂' }
        ],
        experience: { available: true, price: '100-300元/人', durationMin: 120, desc: '榫卯与木作基础体验，参观香山帮技艺作场' },
        channels: ['园林与古建工程订单', '文化创意零售', '研学团与非遗课堂'],
        painPoints: ['技艺学习周期长，年轻学徒少', '工程订单周期长、回款慢', '传统构件与现代居住场景适配度低', '缺少可零售的标准化小件产品线'],
        source: '苏州市吴中区公开资料整理'
      },
      {
        id: 'sz-ws-kesi', name: '苏州缂丝工坊', village: '姑苏区一带', county: '姑苏区',
        heritageId: 'sz-kesi', craft: '苏州缂丝织造技艺',
        scale: '以大师工作室与小型工坊为主，产能极为有限',
        products: [
          { name: '缂丝团扇与挂屏', priceRange: '600-6000元', note: '"一寸缂丝一寸金"，工期长' },
          { name: '缂丝文创（手包/领带/书签）', priceRange: '300-2500元', note: '日常化尝试' },
          { name: '缂丝艺术收藏品（摹缂书画）', priceRange: '按件计', note: '面向收藏市场，议价空间大' }
        ],
        experience: { available: true, price: '120-320元/人', durationMin: 120, desc: '"通经断纬"缂丝织造体验，完成一件小幅作品' },
        channels: ['艺术收藏与拍卖', '高端定制与文创', '非遗展演与研学'],
        painPoints: ['工期极长、产能极低，难以规模化', '织造人才断层，培养周期长', '收藏市场波动大，订单不稳定', '公众认知门槛高，缺少日常化产品'],
        source: '苏州丝绸博物馆公开资料整理'
      },
      {
        id: 'sz-ws-songjin', name: '宋锦织造工坊', village: '盛泽镇一带', county: '吴江区',
        heritageId: 'sz-songjin', craft: '宋锦织造技艺',
        scale: '丝绸企业+大师工作室协同，依托吴江丝绸产业集群',
        products: [
          { name: '宋锦文创（箱包/丝巾/书签）', priceRange: '120-1800元', note: '纹样复原后的大众化品类' },
          { name: '宋锦面料（幅宽定制）', priceRange: '按米计', note: '供服装与装裱渠道' },
          { name: '宋锦礼服与国风服饰', priceRange: '2000-20000元', note: '高端定制，工艺与工期决定价位' }
        ],
        experience: { available: true, price: '80-260元/人', durationMin: 90, desc: '宋锦纹样与织造观摩，体验纹样设计与配色' },
        channels: ['丝绸企业与服装品牌', '博物馆与文旅零售', '国风定制与电商'],
        painPoints: ['传统纹样数字化与复原成本高', '织机与工艺设备更新投入大', '下游品牌议价能力强，加工利润薄', '文创产品设计同质化'],
        source: '苏州丝绸博物馆及吴江丝绸产业公开资料整理'
      },
      {
        id: 'sz-ws-taohuawu', name: '桃花坞木版年画工坊', village: '桃花坞一带', county: '姑苏区',
        heritageId: 'sz-taohuawu', craft: '桃花坞木版年画（三色套印）',
        scale: '以年画社与非遗工作室为主，雕版师傅稀缺',
        products: [
          { name: '传统木版年画（宣纸手拓）', priceRange: '60-800元', note: '手工套印，作品性强' },
          { name: '年画文创（冰箱贴/明信片/红包）', priceRange: '20-160元', note: '节令与伴手礼主力' },
          { name: '雕版与拓印体验包', priceRange: '50-200元', note: '研学与亲子场景' }
        ],
        experience: { available: true, price: '60-180元/人', durationMin: 90, desc: '刻版与套印体验，亲手印制一幅《一团和气》' },
        channels: ['博物馆与文旅门店', '春节节令市场', '研学团与进校园'],
        painPoints: ['节令性极强，销售高度集中在春节前后', '雕版师傅稀缺，技艺传承难', '传统题材与现代家居场景脱节', '文创产品易被低价印刷品替代'],
        source: '苏州桃花坞木刻年画社公开资料整理'
      },
      {
        id: 'sz-ws-shanzi', name: '苏扇与明式家具工坊', village: '姑苏区一带', county: '姑苏区',
        heritageId: 'sz-shanzi', craft: '制扇技艺（苏州折扇·檀香扇）',
        scale: '小型工作室与企业礼品定制并存的作坊群',
        products: [
          { name: '檀香扇与折扇（手工）', priceRange: '150-3000元', note: '"三花"工艺决定价位' },
          { name: '扇面书画定制', priceRange: '300-5000元', note: '名家书画显著增值' },
          { name: '扇文化文创小件', priceRange: '30-200元', note: '引流与伴手礼款' }
        ],
        experience: { available: true, price: '60-200元/人', durationMin: 90, desc: '扇面书画与穿扇骨体验，可带走自制折扇' },
        channels: ['工艺美术门店', '博物馆与企业礼品采购', '电商与直播间'],
        painPoints: ['手工制扇工序多，产能有限', '礼品采购压价，利润空间被压缩', '年轻客群认知度低', '直播话术套路化，难以表达工艺价值'],
        source: '苏州工艺美术博物馆公开资料整理'
      }
    ],

    products: [
      { name: '洞庭山碧螺春（明前特级）', category: '茶叶', origin: '吴中区东山镇/金庭镇', priceRange: '800-4000元', heritageNote: '洞庭山碧螺春制作技艺2022年作为"中国传统制茶技艺及其相关习俗"组成部分入选人类非遗代表作名录，2011年列入国家级非遗；其茶果间作系统2020年入选中国重要农业文化遗产。', sellingPoints: ['核心产区东山/西山直供', '春分至谷雨手工炒制', '茶果间作带来的天然花果香'], costRef: { material: 0.40, labor: 0.32, package: 0.14, logistics: 0.06, other: 0.08 }, source: '新华日报、上观新闻公开报道整理' },
      { name: '阳澄湖大闸蟹', category: '农产品', origin: '昆山市巴城镇一带', priceRange: '200-1500元', heritageNote: '阳澄湖大闸蟹为地理标志保护产品，以"青背、白肚、黄毛、金爪"为特征，九月食母、十月食公，与阳澄湖一带水乡养殖传统相伴生。', sellingPoints: ['地理标志保护产品', '产地直发锁鲜', '节令礼盒需求集中'], costRef: { material: 0.52, labor: 0.14, package: 0.16, logistics: 0.12, other: 0.06 }, source: '苏州市公开资料整理' },
      { name: '东山白沙枇杷', category: '农产品', origin: '吴中区东山镇', priceRange: '40-160元', heritageNote: '东山白沙枇杷已入选全国名特优新农产品名录，与洞庭山碧螺春的"茶果间作"生态系统中果树一脉相承。', sellingPoints: ['全国名特优新农产品', '茶果间作生态种植', '夏季时令鲜果，赏味期短'], costRef: { material: 0.40, labor: 0.24, package: 0.18, logistics: 0.12, other: 0.06 }, source: '新华日报《吴中：太湖之滨"拼"出发展新图景》（2025年）' },
      { name: '树山翠冠梨与杨梅', category: '农产品', origin: '虎丘区通安镇树山村', priceRange: '30-120元', heritageNote: '树山"三宝"中的翠冠梨与杨梅依托千亩梨园、两千亩杨梅林，是苏州近郊乡村采摘经济的主力品类。', sellingPoints: ['树山三宝之一', '近郊采摘即时体验', '季节性强、需预售排产'], costRef: { material: 0.38, labor: 0.26, package: 0.16, logistics: 0.12, other: 0.08 }, source: '中国网《苏州树山生态村》（2022年）' },
      { name: '苏绣文创（团扇/书签/丝巾）', category: '工艺品', origin: '虎丘区镇湖街道', priceRange: '60-800元', heritageNote: '苏绣为国家级非物质文化遗产（2006年首批），以"平、齐、细、密、匀、顺、和、光"及双面绣技法著称，镇湖绣品街为最大产业聚集地。', sellingPoints: ['绣娘手工刺绣', '双面绣等特色技法', '可定制图案与题字'], costRef: { material: 0.24, labor: 0.56, package: 0.10, logistics: 0.05, other: 0.05 }, source: '镇湖刺绣协会及公开报道整理' },
      { name: '宋锦文创（箱包/围巾）', category: '工艺品', origin: '吴江区盛泽镇/姑苏区', priceRange: '120-1800元', heritageNote: '宋锦织造技艺2009年作为"中国蚕桑丝织技艺"组成部分入选人类非遗代表作名录，2006年列入首批国家级非遗，有"锦绣之冠"之称。', sellingPoints: ['人类非遗技艺纹样', '丝绸产业集群产地直供', '国风日常化应用'], costRef: { material: 0.34, labor: 0.36, package: 0.14, logistics: 0.08, other: 0.08 }, source: '苏州丝绸博物馆公开资料整理' }
    ],

    farm: [
      { name: '洞庭东山茶园采茶炒茶体验', village: '东山镇碧螺村', county: '吴中区', season: '春分至谷雨（3-4月）', durationMin: 180, price: '100-300元/人', desc: '茶果间作生态茶园采青、挑拣，进茶厂观摩并实操手工炒茶，成品带走。', heritageRefs: ['sz-biluochun'] },
      { name: '树山梨花季与翠冠梨采摘', village: '通安镇树山村', county: '虎丘区', season: '3月梨花、6月杨梅、7-8月翠冠梨', durationMin: 180, price: '按园方计', desc: '千亩梨园赏花、杨梅与翠冠梨采摘，配木栈道徒步与大石山人文导览。', heritageRefs: [] },
      { name: '镇湖苏绣手作体验', village: '镇湖街道绣品街', county: '虎丘区', season: '全年', durationMin: 90, price: '80-260元/人', desc: '在绣庄跟绣娘学基础针法，绣制手帕或书签带走。', heritageRefs: ['sz-suxiu'] },
      { name: '震泽蚕桑与丝绸研学', village: '震泽镇谢家路村', county: '吴江区', season: '春季桑果季、全年丝绸研学', durationMin: 150, price: '60-200元/人', desc: '采桑喂蚕、缫丝与蚕丝被制作，串联蚕桑与宋锦织造的技艺脉络。', heritageRefs: ['sz-songjin'] }
    ],

    stays: [
      { name: '树山村温泉度假酒店与乡村民宿', village: '通安镇树山村', county: '虎丘区', priceRange: '中端至中高端', desc: '坐落于大阳山北麓、梨园与茶园之间，配套温泉与木栈道，是近郊周末微度假首选。' },
      { name: '陆巷古村民宿与太湖湖畔客栈', village: '东山镇陆巷村', county: '吴中区', priceRange: '中端', desc: '由明代古宅群落微改造而成，出门即古街与太湖环湖公路，可串联茶园与古村游览。' },
      { name: '明月湾古村民宿', village: '金庭镇石公村', county: '吴中区', priceRange: '中端至高端', desc: '位于太湖西山岛南端古村内，推窗见古樟与湖面，春季可近距参与碧螺春茶事。' },
      { name: '开弦弓村乡村研学民宿', village: '七都镇开弦弓村', county: '吴江区', priceRange: '中端', desc: '依托江村文化园与桑田鱼塘而建，适合研学团队与静养型乡村停留。' }
    ]
  }
};

module.exports = rural;
