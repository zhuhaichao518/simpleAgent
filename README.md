# Simple Agent · 30 秒生成你的小应用

一个用 JavaScript 写的「通用 Agent 框架」+「对话式微应用工坊」短平快 MVP，灵感来自阿里灵光。

- 主页面是一个对话页（Chat）
- Agent 有一个核心技能：`generate_app` —— 把一个可交互的小应用直接渲染到对话流里
- 内置 8 种小应用模板（计数器 / 待办 / 番茄钟 / 骰子 / 抽奖转盘 / 投票 / 闪卡 / 调色板）
- 应用支持「编辑 / 分享链接 / 本地持久化」
- Agent 框架包含：Agent Loop、记忆、上下文管理、任务规划、技能注册表、LLM 适配层

> 模板 + 配置 的设计：LLM 不去现场写组件代码，而是从清单里挑一个 `type` 再填 `config`，所以可以做到 30 秒级别的生成。

---

## 快速开始

### 1. 安装依赖
```bash
npm run install:all
```

### 2. 配置 LLM
复制环境变量模板并填上你的 key：
```bash
cp .env.example .env
```
`.env` 兼容 OpenAI Chat Completions 协议，可以用 OpenAI / DeepSeek / 通义千问等：
```
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat
PORT=3001
```

### 3. 启动开发模式
```bash
npm run dev
```
- 后端跑在 `http://localhost:3001`
- 前端跑在 `http://localhost:5173`（已设置 /api 代理到后端）

### 4. 生产构建
```bash
npm run build
npm start
# 访问 http://localhost:3001
```

---

## 试一试

打开页面后直接说：
- 「帮我做一个今天吃什么的转盘，选项有火锅、日料、麻辣烫、盖浇饭、沙拉、披萨」
- 「来一个 25 分钟番茄钟」
- 「俯卧撑计数器，每次 +1」
- 「5 张高级 GRE 单词的记忆闪卡」
- 「莫兰迪风格调色板」

Agent 会把生成好的小应用直接嵌入对话流，可点击体验、可编辑配置（点右上「编辑」改 JSON）、可分享（点「分享」复制链接）。

继续追加：「把转盘第二个换成米线」「再加一项寿司」 —— 触发 `edit_app` 技能。

---

## 架构

```
┌──────────────────────────── Browser (React + Vite) ────────────────────────────┐
│  ChatPanel ── MessageList ── AppCard ── AppEditor                              │
│      │                            │                                            │
│      └─ POST /api/chat (SSE) ◀────┴─ 8 个内置 Template 组件                     │
└────────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼  SSE 事件流
┌────────────────────────── Server (Node + Express) ─────────────────────────────┐
│                                                                                │
│  Agent Loop  ──► Context Manager ──► LLM 适配层 (chat / chatStream)             │
│      │                  ▲                                                      │
│      ▼                  │                                                      │
│  Skills Registry ◀──────┘                                                      │
│      ├─ chat                                                                   │
│      ├─ list_apps                                                              │
│      ├─ generate_app  ──► Templates Registry  ──► 推 app 事件给前端             │
│      └─ edit_app                                                               │
│                                                                                │
│  Memory (短期/工作 app/长期事实) ◀───── Planner (启发式) ◀─── 用户输入           │
└────────────────────────────────────────────────────────────────────────────────┘
```

### 核心模块（都在 `server/agent/`）

| 文件 | 职责 |
| --- | --- |
| `loop.js` | Agent 主循环：plan → think → act → observe → 直至 done |
| `context.js` | 拼装 system + 历史 + 最近 app 列表 + 当前输入；超长自动摘要 |
| `memory.js` | 进程内会话记忆：短期消息 / 工作 app / 长期事实 |
| `planner.js` | 轻量启发式规划：先打 intent 标签（chat / generate_app / edit_app / multi_step）作为提示 |
| `skills.js` | 技能注册表：每个技能独立 handler，返回事件列表 |
| `templates.js` | App 模板的元数据 / schema / 默认值（用于 prompt 与生成） |
| `prompts.js` | 系统提示词（含模板清单的自动序列化） |
| `llm.js` | LLM 适配层：兼容任何 OpenAI 协议提供方 |

### 扩展指南

**新增一个 App 模板**：
1. 在 `server/agent/templates.js` 增加一个对象（type / 描述 / schema / defaults）。
2. 在 `client/src/templates/` 新增一个 React 组件（接收 `config` prop）。
3. 在 `client/src/templates/index.js` 注册到 `TEMPLATE_REGISTRY`。
4. 完成。LLM 立即可用。

**新增一个 Agent 技能**（比如「联网搜索」「生成图片」）：
1. 在 `server/agent/skills.js` 调用 `skills.register({ name, description, handler })`。
2. 在 `prompts.js` 的 system prompt 里加一段对该 action 的说明。
3. 完成。Loop 会自动 dispatch。

---

## 设计取舍

- **不让 LLM 现场写组件代码**：稳定、秒级、安全；代价是模板有限（但加一个模板很快）。
- **SSE 流而不是 WebSocket**：一个 POST 一个 SSE 响应，足够，部署简单。
- **进程内 Memory**：MVP 用 Map；要做多用户/持久化，把 `memory.js` 替成 Redis/SQLite 实现即可，接口不变。
- **响应格式强制 JSON**：用 OpenAI 的 `response_format: json_object`；模型不支持时 fallback 到正则提 JSON。
- **轻量 Planner**：纯启发式打标签，避免给规划再加一次 LLM 调用，省钱省时；以后想升级成 LLM Planner 也只改 `planner.js`。
