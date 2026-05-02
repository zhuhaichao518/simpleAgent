import React from 'react';

const PRESET = [
  { label: '🎯 抽奖转盘', prompt: '帮我做一个今天吃什么的转盘，选项有火锅、日料、麻辣烫、盖浇饭、沙拉、披萨' },
  { label: '🍅 番茄钟', prompt: '来一个 25 分钟番茄钟' },
  { label: '💪 俯卧撑计数', prompt: '帮我做个俯卧撑计数器，每次 +1' },
  { label: '📚 GRE 闪卡', prompt: '帮我做一个 5 张高级 GRE 单词的记忆闪卡' },
  { label: '🗳️ 团队投票', prompt: '做一个团建去哪儿的投票，选项：露营/密室/桌游/聚餐' },
];

const AI_QUICK = [
  {
    label: '📖 AI 故事书',
    prompt:
      '做一个儿童 AI 故事书：用户输入一个主角和场景，点"讲故事"按钮调用 LG.llm 让 AI 现场写一段 200 字的睡前故事，并用 LG.tts 朗读出来。要可爱的卡通风格。',
  },
  {
    label: '🤝 AI 面试官',
    prompt:
      '做一个产品经理岗位的 AI 模拟面试官：第一轮 AI 用 LG.llm 提出一个面试题，我打字回答，AI 给我打分并提出下一个问题，最多 5 轮，最后给一个总结。',
  },
  {
    label: '🌍 智能翻译',
    prompt:
      '做一个 AI 翻译器：上方文本框输入中文，下面四个语言按钮（英/日/韩/法），点击调 LG.llm 翻译，再调 LG.tts 朗读。设计要简洁好看。',
  },
  {
    label: '🃏 塔罗占卜',
    prompt:
      '做一个塔罗占卜小应用：随机抽 3 张牌（过去/现在/未来），每张有 emoji 牌面，点击"AI 解读"调 LG.llm 让 AI 根据三张牌的含义生成一段我今日运势解读。',
  },
  {
    label: '✍️ AI 心情日记',
    prompt:
      '做一个心情日记本：选择一个表情记录心情、写一段今日感受，调 LG.llm 让 AI 给一段温柔的回应和小建议；用 LG.kv 持久化所有日记，列表在下方可看历史。',
  },
  {
    label: '🧮 口算挑战',
    prompt:
      '做一个 30 秒口算挑战：随机出加减乘除题，答对 +1 分，结束显示总分；用 LG.kv 持久化最高分；答对/答错给不同振动反馈 LG.vibrate。',
  },
];

const OFFLINE_QUICK = [
  { label: '🐍 贪吃蛇', prompt: '做一个贪吃蛇小游戏，方向键控制，吃到食物变长，撞墙重新开始；用 LG.kv 保存最高分。' },
  { label: '⌨️ 打字练习', prompt: '做一个英文打字练习，给我一段文本，我打字时实时高亮正确/错误，并显示 WPM。' },
  { label: '🌡️ 单位换算', prompt: '做一个长度单位换算器，支持 米/英尺/英寸/厘米 互转。' },
];

export default function Sidebar({ onPick, onReset, onShowMyApps, myAppsCount = 0 }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-dot" />
        灵光 Lite
      </div>
      <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 8 }}>
        和我对话，30 秒生成可交互小应用
      </div>

      {onShowMyApps && (
        <button className="my-apps-btn" onClick={onShowMyApps}>
          📦 我的应用 <span className="count">{myAppsCount}</span>
        </button>
      )}

      <div className="sidebar-section">⚡ 内置模板（秒生成）</div>
      {PRESET.map((q) => (
        <button key={q.label} className="tpl-item" onClick={() => onPick(q.prompt)}>
          {q.label}
          <small>{q.prompt}</small>
        </button>
      ))}

      <div className="sidebar-section">
        🔥 AI 现写 · 调 AI 后端 <span className="badge-hot">HOT</span>
      </div>
      {AI_QUICK.map((q) => (
        <button key={q.label} className="tpl-item highlight" onClick={() => onPick(q.prompt)}>
          {q.label}
          <small>{q.prompt}</small>
        </button>
      ))}

      <div className="sidebar-section">🎨 AI 现写 · 离线工具</div>
      {OFFLINE_QUICK.map((q) => (
        <button key={q.label} className="tpl-item" onClick={() => onPick(q.prompt)}>
          {q.label}
          <small>{q.prompt}</small>
        </button>
      ))}

      <div className="sidebar-footer">
        <button
          className="tpl-item"
          onClick={onReset}
          style={{ color: 'var(--muted)', borderColor: 'var(--border)', textAlign: 'center', marginTop: 12 }}
        >
          🗑 清空当前会话
        </button>
        <div style={{ marginTop: 8, fontSize: 11 }}>
          通用 Agent 框架 · React + Express
        </div>
      </div>
    </aside>
  );
}
