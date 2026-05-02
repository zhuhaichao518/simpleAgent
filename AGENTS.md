# AGENTS.md · 工作笔记本

> 这份文档供本仓库的 AI 编程协作者使用。如果对话被压缩或换 session，读这一份就能续上。
> 也欢迎人类作者维护。

---

## 1. 项目快照

**simpleAgent** = 「通用 JS Agent 框架」+「30 秒生成可交互小应用」的对话式工坊（对标蚂蚁灵光闪应用）。

- **后端**：Node.js + Express + OpenAI SDK（OpenAI 协议兼容任意 LLM 提供方）
- **前端**：Vite + React 18，对话主页 + 内嵌可交互 AppCard
- **当前模型**：通过 `.env` 的 `OPENAI_BASE_URL` / `OPENAI_MODEL` 切换；推荐 OpenRouter
- **GitHub**：[https://github.com/zhuhaichao518/simpleAgent](https://github.com/zhuhaichao518/simpleAgent)

### 1.1 核心机制

1. 用户在对话框输入需求
2. **Planner** 用启发式规则打 intent 标签（chat / generate_app / edit_app / multi_step）作为 hint
3. **Agent Loop**（ReAct 风格）调 LLM，强制 JSON 输出 `{ thought, action, args, done }`
4. **Skills Registry** dispatch action：`chat` / `list_apps` / `generate_app` / `edit_app`
5. `generate_app` 有两条路径：
  - **内置模板**（counter / todo / timer / dice / wheel / voting / flashcard / palette）：LLM 只填 config，秒级
  - `**template: "custom"`**：LLM 现写完整 HTML+CSS+JS，前端用 `<iframe sandbox srcdoc>` 跑，15-30 秒
6. 通过 SSE 把事件流推给前端：`plan / thinking / action / message / app / app_update / done`

---

## 2. 关键文件地图

```
simpleAgent/
├── AGENTS.md                  ← 本文档
├── README.md                  ← 用户面向 README
├── .env / .env.example        ← LLM 配置（.env 不入库）
├── package.json               ← 后端 + 启动脚本
├── server/
│   ├── index.js               ← Express 入口、/api/chat SSE 路由
│   └── agent/
│       ├── loop.js            ← ReAct 主循环
│       ├── context.js         ← 上下文组装 + 摘要降级
│       ├── memory.js          ← 进程内会话记忆（短期/工作 app/长期）
│       ├── planner.js         ← 启发式 intent 标签
│       ├── skills.js          ← 技能注册表 + 内置 4 技能
│       ├── templates.js       ← 8 个内置 app 模板元数据
│       ├── prompts.js         ← system prompt（含模板清单序列化）
│       └── llm.js             ← OpenAI 协议适配层
└── client/
    ├── package.json
    ├── vite.config.js         ← /api 代理到 :3001
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx            ← 顶层：sessionId、对话项数组、SSE 解析
        ├── api.js             ← streamChat / fetchSession / 等
        ├── styles.css
        ├── components/
        │   ├── Sidebar.jsx
        │   ├── Composer.jsx
        │   ├── MessageList.jsx
        │   ├── AppCard.jsx        ← 卡片：编辑/分享/全屏
        │   ├── AppEditor.jsx      ← 直接改 JSON config
        │   └── AppFullscreen.jsx  ← 全屏 modal（Esc 关闭）
        └── templates/
            ├── index.js           ← TEMPLATE_REGISTRY（含 custom）
            ├── Counter.jsx
            ├── TodoList.jsx
            ├── Timer.jsx
            ├── DiceRoller.jsx
            ├── LuckyWheel.jsx     ← SVG 自绘转盘
            ├── Voting.jsx
            ├── Flashcard.jsx
            ├── ColorPalette.jsx
            └── CustomApp.jsx      ← iframe sandbox srcdoc + 自适应高度
```

---

## 3. 当前路线图（持续更新）

### ✅ 已完成

- 项目骨架（server + client + 依赖）
- Agent 框架六件套（loop / memory / context / planner / skills / llm）
- 8 个内置 app 模板（含可旋转 SVG 转盘、3D 翻面闪卡）
- AppCard 编辑（JSON）、分享（base64 URL hash）、全屏
- custom 模板：LLM 现写 HTML 用 iframe sandbox 渲染（不开 allow-same-origin）
- iframe 自适应高度（postMessage 探针）
- 配 OpenRouter 跑通

### ✅ 已完成 · 演示对齐改造（P0+P1，对标灵光闪应用）

- **P0-1：iframe AI 后端 SDK**（最关键，已落地）
  - `POST /api/sandbox/llm` 端点：无状态、限长 8000 字符、限速 200ms/次
  - `CustomApp.jsx` 注入 `window.LG.{llm, tts, stopTTS, vibrate, kv.{get,set,remove,keys}, toast}`
  - 父页面 `client/src/sdk/lgBridge.js` 处理所有 postMessage 调用
  - KV 用 localStorage，命名空间 `LG:${appId}:${key}`，删 app 时同步清掉
- **P0-2：生成过程"工艺动画"**
  - `loop.js` 发 `progress` 事件：analyze → design → code → render
  - 前端 thinking 卡片渲染 4 步进度条（active 步骤脉冲发光）
- **P0-3：prompt 升级**
  - system prompt 详细列出 LG SDK 用法 + 示例代码
  - 增加"用户隐含 AI 能力时必须用 custom + LG.llm"的硬规则
- **P0-4：精选 demo prompt**
  - sidebar 三组：⚡ 内置模板 / 🔥 AI 现写·调 AI（高亮 HOT）/ 🎨 AI 现写·离线
  - 6 个 AI demo：故事书+朗读、面试官、翻译、塔罗解读、心情日记、口算挑战
- **P1-1：「我的应用」库**
  - sidebar 顶部 `📦 我的应用 [N]` 按钮
  - `MyAppsModal` 列表：图标 / 名字 / 创建时间 / 打开 / 删除
  - 持久化 `simple-agent-my-apps-v1`
  - app 生成与更新时自动 upsert

### 🔮 未来（P2，看时间）

- 图片生应用（vision 模型，composer 上传图）
- 图表能力（self-host Chart.js + 白名单允许 custom app 引用）
- 灵光圈式社区（实际意义低，只在演示加分时考虑）
- 多用户：把 `memory.js` Map 换成 Redis/SQLite

---

## 4. 关键设计决策


| 决策                                      | 为什么                          | 反过来意味着                                   |
| --------------------------------------- | ---------------------------- | ---------------------------------------- |
| **模板填 config + LLM 现写 HTML 双轨**         | 内置模板秒级稳定；不在内置范围的让 LLM 现写自由度高 | LLM 选哪条路径靠 prompt 引导，可能误判                |
| **iframe sandbox 不开 allow-same-origin** | 安全：LLM 写出恶意 JS 也碰不到主站存储      | 必须用 postMessage 桥才能让 app 用设备能力/调 LLM/持久化 |
| **JSON 模式强制**                           | LLM 输出更稳定                    | 模型不支持时只能正则提 JSON（已有 fallback）            |
| **启发式 Planner 而非 LLM Planner**          | 零延迟、零成本                      | 复杂多目标场景识别不准；以后想升级直接换 `planner.js`        |
| **进程内 Map 做记忆**                         | MVP 简单                       | 重启即失；多用户必须换 Redis/SQLite，但接口已经抽象         |
| **OpenAI 协议适配**                         | 一份代码切所有提供商                   | 不通用功能（如 Anthropic 的 tool use 原生）拿不到      |
| **SSE 单向流而非 WebSocket**                 | 部署简单                         | 暂时不做双向交互；要做也好加                           |


---

## 5. iframe SDK 设计（P0-1 详细方案）

### 5.1 SDK API（暴露给 LLM 生成的 HTML）

```js
// LLM 在 <script> 里可以直接用：
window.LG = {
  llm: (prompt, opts?) => Promise<string>,    // 调后端 LLM
  tts: (text, opts?)   => Promise<void>,      // SpeechSynthesis 朗读（父页面执行）
  stopTTS: ()          => Promise<void>,
  vibrate: (pattern)   => Promise<void>,
  kv: {
    get: (key)        => Promise<any>,
    set: (key, val)   => Promise<void>,
    remove: (key)     => Promise<void>,
  },
  toast: (msg)         => Promise<void>,      // 父页面顶部弹一条
};
```

### 5.2 通信协议

iframe → parent: `{ __LG: true, id, method, params, appId }`
parent → iframe: `{ __LG_RES: true, id, ok, data, error }`

每个调用一个递增 id，用 Promise + Map 配对。60s 超时。

### 5.3 实现位置

- **iframe 端**：`templates/CustomApp.jsx` 的 `injectAutoHeight` 同位置，新增 `injectLGSDK(html, appId)`，在 `</head>` 前注入 `<script>` 块
- **parent 端**：新增 `client/src/sdk/lgBridge.js`，App.jsx 启动时挂全局 `message` 监听
- **后端 LLM 转发**：`server/index.js` 加 `POST /api/sandbox/llm`，body `{ prompt, system?, temperature? }`，调 `llm.chat()`，返回 `{ text }`

### 5.4 安全

- iframe sandbox 必须保留 `allow-scripts`，但**不要**加 `allow-same-origin`
- `/api/sandbox/llm` 限制最大 prompt 长度 + max tokens（防滥用刷 token）
- KV 限制单值大小 + 总条目数（防灌爆 localStorage）

### 5.5 LLM 引导策略

system prompt 加一段示例代码：

```html
<!-- 在生成的 HTML 里这样调 -->
<script>
async function ask() {
  const reply = await LG.llm('用一句俏皮话夸夸我');
  document.getElementById('out').textContent = reply;
  LG.tts(reply, { lang: 'zh-CN' });
}
</script>
```

---

## 6. 开发与运行

```bash
# 安装
npm run install:all

# 配置（.env）
OPENAI_API_KEY=sk-or-v1-...
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_MODEL=deepseek/deepseek-chat   # 演示时建议切 anthropic/claude-3.5-sonnet

# 开发
npm run dev    # server :3001 + client :5173

# 生产
npm run build && npm start    # http://localhost:3001
```

### 演示前 checklist

- `.env` 切到 `claude-3.5-sonnet` 或 `gpt-5`/`gemini-2.5-pro`
- 浏览器开 [http://localhost:5173，先清一次会话](http://localhost:5173，先清一次会话)
- 打开"显示 Agent 轨迹"开关
- 准备好 5 个 demo prompt（建议：AI 故事书、AI 面试官、口算挑战、塔罗占卜、抽奖转盘）

---

## 7. 已知坑 / 注意事项

- **OpenRouter 部分模型不支持 `response_format: json_object`**（如某些 vision-only 模型）。`loop.js` 已有 fallback 用正则提取 JSON，但稳定性下降。
- **iframe srcdoc 的 origin 是 null**，所以 iframe 内自己的 `localStorage` / `fetch(/api/...)` 都不工作，**必须**走 postMessage 桥。
- **LLM 偶尔会忘记 `template: "custom"` 必须 stringify 整个 HTML**：JSON 输出失败的兜底已经做了，但生成出空 app 时给用户的提示要清楚。
- **iframe 高度自适应**有上下限（220-720），custom app 太长时会出现内部滚动。全屏模式不受此限。
- `**max_tokens` 设了 6000**：复杂 custom app 可能仍然被截断。LLM 截断时输出的 HTML 不完整，iframe 会渲染失败。可以考虑加重试或者更高 max_tokens。
- **Agent loop `MAX_STEPS = 4`**：避免死循环。complex multi-step 任务可能跑不完。
- **不要在 `git commit` 时把 `.env` 推上去**：已经在 `.gitignore` 里。

---

## 8. 上下文压缩后续工作建议

如果你（AI 协作者）刚刚被换 session 或上下文压缩了：

1. 通读这份文档（重点 §3 路线图 + §5 SDK 设计）
2. `git log --oneline -10` 看最近做了什么
3. `git status` 看当前是否有未提交工作
4. 关键文件存在性快速诊断：
   - `client/src/sdk/lgBridge.js` 存在 = P0-1 已完成
   - `client/src/components/MyAppsModal.jsx` 存在 = P1-1 已完成
   - `server/index.js` 含 `/api/sandbox/llm` = sandbox 端点已就绪
   - `client/src/templates/CustomApp.jsx` 含 `buildSdkScript` = SDK 注入已就绪
   - `server/agent/loop.js` 含 `progress` 事件 = 工艺动画已就绪
5. 按 §3 路线图（特别是 🔮 P2 部分）继续

提交规范：使用约定式 commit（`feat:` / `fix:` / `refactor:` / `docs:`），中文描述，正文每行 ≤ 100 字。

### 测试 SDK 是否正常工作的最小 prompt

让用户在对话里说：

> "做一个 AI 夸夸机器人：一个按钮叫'夸我一下'，点击调 LG.llm 让 AI 生成一句俏皮的夸赞话，再调 LG.tts 朗读出来。"

如果生成的应用里点按钮能真的出现一句话 + 朗读，整个 SDK 桥就是活的。