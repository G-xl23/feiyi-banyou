# 非遗伴游 HeritageTravel Agents

> 基于多智能体的地方文旅 · 非遗融合导览助手
> 参赛赛道：人工智能在垂直应用场景的创新设计与开发（大模型与智能体应用）

一套多智能体协同的文旅非遗导览 Web 应用：**旅行规划 / 景点-非遗讲解 / 美食民俗 / 非遗知识库 / AIGC文创** 五个智能体协同工作，把非遗体验点自动嵌入旅游行程，并支持非遗知识问答与非遗文创内容生成，实现"游地方、知非遗"。

---

## 一、快速开始（3 步运行）

```bash
# 1. 进入后端目录并安装依赖（仅 express 一个第三方包）
cd server
npm install --omit=dev

# 2. 配置环境变量（可选；不配置则以"离线模板模式"完整运行）
cp .env.example .env      # Windows: copy .env.example .env
#   按需填写 LLM_BASE_URL / LLM_API_KEY / LLM_MODEL
#   server/.env 会被服务自动加载（内置零依赖解析），无需安装 dotenv；
#   若系统已存在同名环境变量，则以系统环境变量为准（便于容器化部署）。

# 3. 启动
npm start
```

### 接入真实大模型（示例）

在 `server/.env` 中填入（以 DeepSeek 为例，任何 OpenAI 兼容接口同理）：

```ini
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_API_KEY=sk-你的密钥
LLM_MODEL=deepseek-chat
```

重启服务后，右上角状态栏会从「离线模板模式」变为「**大模型在线**」。这四项配置生效后：

- 景点讲解 Agent 的口语化讲解稿、AIGC 文创故事/文案由大模型生成；
- **非遗知识库 Agent 仍保持"本地知识库优先"**：先检索本地资料，命中即直接回答并标注来源，大模型只负责把资料润色成通顺表达。问知识库未收录的内容时依然明确回答"暂未收录"，不会编造；
- 大模型调用失败或超时（默认 30s）会自动降级回本地模板，演示不会中断。

启动后浏览器访问 **http://localhost:3000** 即可看到完整界面（后端同时托管前端页面，单端口运行）。

右上角状态栏会显示当前模式：

- `大模型在线` —— 已接入 OpenAI 兼容大模型接口，讲解/AIGC 由大模型生成；
- `离线模板模式` —— 未配置大模型，系统用内置模板引擎生成内容，**全部功能仍可用**。

## 二、环境变量说明

| 变量 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| PORT | 否 | 3000 | 服务端口 |
| LLM_BASE_URL | 否 | - | 大模型接口地址，如 `https://api.deepseek.com/v1` |
| LLM_API_KEY | 否 | - | 大模型密钥（仅存环境变量，勿提交到代码库） |
| LLM_MODEL | 否 | - | 模型名，如 `deepseek-chat` / `qwen-plus` / `glm-4-flash` |
| LLM_TIMEOUT_MS | 否 | 30000 | 大模型调用超时（毫秒） |

> 三项 LLM 变量必须**同时提供或同时留空**，启动时校验，避免半配置状态。

## 三、功能模块与对应智能体

| 界面模块 | 身份 | 智能体 | 核心能力 |
| --- | --- | --- | --- |
| 💬 智能对话 | 旅行者 | 调度器 Orchestrator | 自然语言意图路由与跨 Agent 协同，SSE 实时点亮协作链路 |
| 🧳 行程规划 | 旅行者 | 旅行规划 Agent | 按非遗关联度加权排序点位，城市经典/城乡融合/乡村深度三种线路模式，自动嵌入乡村点位与村宿 |
| 🏛 景点·非遗讲解 | 旅行者 | 景点-非遗讲解 Agent | "景点历史 + 关联非遗与民俗"两层解读与口语化现场讲解稿 |
| 🍜 美食民俗 | 旅行者 | 美食民俗 Agent | 地方美食推荐 + 饮食类非遗背景 + 民俗活动清单 |
| 📚 非遗知识库 | 旅行者 | 非遗知识库 Agent（核心） | 本地知识库检索问答，按意图组卷直答，来源标注，未收录时明示不编造 |
| ✨ AIGC文创 | 旅行者 | AIGC 文创生成 Agent | 非遗小故事 / 朋友圈文案 / 文创产品构思，并标注生成方式 |
| 🌾 乡村产业赋能 | 地方工作人员 | 乡村产业赋能 Agent | 六件套经营方案：定位/三档定价/电商文案/短视频脚本/包装/渠道对策 |
| 📊 乡村振兴看板 | 地方工作人员 | 乡村振兴运营洞察 Agent | HLI 活态传承指数、三档增收测算、濒危预警，支持**城市→区县两级下钻** |
| 💬 智能对话 | 地方工作人员 | 政务产业助手 Agent | 问答（指标/预警/工坊/对比）+ 一键生成分层汇报材料，口径与看板联动 |

双身份工作台：顶栏一键切换"旅行者 / 地方工作人员"，主题色随身份变化，个人资料与收藏夹按身份隔离。

所有结果均支持一键复制导出。

## 四、项目结构

```
VORTEX/
├── public/                     前端（原生 HTML/CSS/JS，无需构建）
│   ├── index.html              六个功能页
│   ├── style.css               中式视觉样式
│   └── app.js                  接口调用与结果渲染
├── server/                     后端（Node.js + Express）
│   ├── package.json
│   ├── .env.example            环境变量占位（真实 .env 不入库）
│   └── src/
│       ├── server.js           入口：中间件、静态资源、优雅停机
│       ├── routes.js           接口层（控制器，不含业务逻辑）
│       ├── config.js           集中配置与启动校验
│       ├── logger.js           结构化 JSON 日志
│       ├── errors.js           类型化错误体系 + 全局错误处理
│       ├── data/heritage.js    非遗-文旅知识库（数据层，可扩展城市）
│       └── agents/             五大智能体 + 调度器 + LLM 接入层
│           ├── orchestrator.js ├── planner.js ├── guide.js
│           ├── food.js         ├── knowledge.js ├── aigc.js
│           └── llm.js
├── scripts/
│   ├── smoke-test.js           端到端冒烟测试（13 项断言）
│   └── md-to-pdf.py            交付文档 Markdown→PDF 排版
└── docs/                       全套交付文档（含 PDF）
```

## 五、接口一览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | /healthz · /readyz | 探活与就绪检查（供部署平台使用） |
| GET | /api/health · /api/ready | 服务信息与运行模式 |
| GET | /api/cities | 城市、景点、非遗清单（前端联动数据源） |
| POST | /api/plan | Agent 1 行程规划 |
| POST | /api/guide | Agent 2 景点-非遗讲解 |
| POST | /api/food | Agent 3 美食民俗推荐 |
| GET | /api/heritage/list | 非遗清单 |
| POST | /api/heritage/query | Agent 4 非遗知识问答 |
| POST | /api/aigc | Agent 5 AIGC 文创生成 |
| POST | /api/chat | 调度器自然语言对话 |

统一响应：成功 `{ ok: true, data }`；失败 `{ ok: false, code, message }`。

## 六、测试

```bash
# 服务启动后，在项目根目录执行
node scripts/smoke-test.js            # 默认 http://127.0.0.1:3000
node scripts/smoke-test.js http://your-host:3000
```

覆盖：健康检查、八大 Agent 主流程（含苏州数据、区县下钻、政务助手问答/归纳/SSE 链路）、反幻觉验证、异常入参（非法城市/区县/工坊等应返回 400），共 42 项断言。

数据改动后先跑自检：

```bash
node scripts/validate-data.js         # 数据完整性与城市别名识别自检
```

## 七、公网部署

1. 服务器安装 Node.js 18+，上传源码；
2. `cd server && npm install --omit=dev`，配置 `.env`；
3. 使用 PM2 托管：`pm2 start src/server.js --name heritage-travel`，`pm2 save && pm2 startup`；
4. Nginx 反向代理 80/443 到 3000 端口，配置域名与 HTTPS 证书；
5. 验证 `https://你的域名/healthz` 返回 `{"ok":true}` 即部署成功。

> 注意：不可仅部署在校园内网，需保证公网可访问（大赛硬性要求）。

## 八、扩展新城市（数据驱动，无需改代码）

编辑 `server/src/data/heritage.js`，按既有结构追加一个城市对象：

```js
cities: {
  yourcity: {
    id: 'yourcity', name: '城市名', tagline: '…', intro: '…',
    heritages: [ { id, name, aliases: [], category, level, summary, masters: [], experienceSpots: [] } ],
    attractions: [ { id, name, type, area, durationMin, desc, heritageRefs: ['非遗id'] } ],
    foods: [ { name, desc, heritageNote } ],
    customs: [ { name, desc } ]
  }
}
```

前端下拉、知识库检索、行程规划与非遗传关联会自动生效。

## 九、交付文档（docs/）

| 文件 | 内容 |
| --- | --- |
| 01-软件设计文档（.md/.pdf） | 需求分析、设计思路、八大 Agent 模块、数据库与接口设计、平台工具说明、测试与部署 |
| 02-作品简介（.md/.pdf） | 800 字以内简介 + 三张核心功能截图位置说明 |
| 03-AI工具使用标注（.md/.pdf） | 大模型名称版本、团队整理内容、AIGC 生成内容、AI 辅助代码占比、第三方组件声明 |
| 04-非遗数据来源说明（.md/.pdf） | 知识库资料来源、整理原则、三城条目清单与免责声明 |
| 05-演示视频脚本（.md/.pdf） | ≤5 分钟演示视频逐秒分镜与解说词、录制压制要求 |
| 06-交付清单（.md/.pdf） | 大赛提交物对照清单与自查表 |
| 07-新增城市扩展指南（.md/.pdf） | 数据驱动扩展的四张数据表规范、自检与验收清单 |
| screenshots/ | 15 张真实运行截图（无头浏览器自动截取） |

## 十、许可证与声明

- 代码：MIT（可自由用于教学与比赛）；
- 第三方组件：Express（MIT）及其依赖共 68 个包；
- 非遗数据：整理自中国非物质文化遗产网与地方文旅部门公开资料，详见《非遗数据来源说明》；
- 大模型生成内容（非遗故事/文案/文创构思）已在界面与接口中标注，用户使用时应遵守相应模型服务条款。
