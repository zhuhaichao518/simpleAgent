import React from 'react';

const QUICK = [
  { label: '🎯 抽奖转盘', prompt: '帮我做一个今天吃什么的转盘，选项有火锅、日料、麻辣烫、盖浇饭、沙拉、披萨', kind: 'preset' },
  { label: '🍅 番茄钟', prompt: '来一个 25 分钟番茄钟', kind: 'preset' },
  { label: '💪 俯卧撑计数', prompt: '帮我做个俯卧撑计数器，每次 +1', kind: 'preset' },
  { label: '📚 GRE 闪卡', prompt: '帮我做一个 5 张高级 GRE 单词的记忆闪卡', kind: 'preset' },
  { label: '🗳️ 团队投票', prompt: '做一个团建去哪儿的投票，选项：露营/密室/桌游/聚餐', kind: 'preset' },
];

const CUSTOM_QUICK = [
  { label: '🧮 BMI 计算器', prompt: '做一个 BMI 计算器，输入身高体重立刻算出结果，并给出健康范围参考' },
  { label: '🎮 贪吃蛇', prompt: '做一个贪吃蛇小游戏，方向键控制，吃到食物变长，撞墙重新开始' },
  { label: '⌨️ 打字练习', prompt: '做一个英文打字练习，给我一段文本，我打字时实时高亮正确/错误，并显示 WPM' },
  { label: '🎲 塔罗抽牌', prompt: '做一个塔罗占卜小应用：随机抽 3 张牌（过去/现在/未来），每张展示牌面 emoji 和一句运势' },
  { label: '🧠 口算练习', prompt: '做一个 30 秒口算挑战：随机出加减乘除题，答对 +1 分，结束显示总分' },
  { label: '🌡️ 单位换算', prompt: '做一个长度单位换算器，支持 米/英尺/英寸/厘米 互转' },
];

export default function Sidebar({ onPick, onReset }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-dot" />
        灵光 Lite
      </div>
      <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 8 }}>
        和我对话，30 秒生成可交互小应用
      </div>

      <div className="sidebar-section">⚡ 内置模板（秒生成）</div>
      {QUICK.map((q) => (
        <button key={q.label} className="tpl-item" onClick={() => onPick(q.prompt)}>
          {q.label}
          <small>{q.prompt}</small>
        </button>
      ))}

      <div className="sidebar-section">🎨 AI 现写（custom）</div>
      {CUSTOM_QUICK.map((q) => (
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
