import React from 'react';

const QUICK = [
  { label: '抽奖转盘', prompt: '帮我做一个今天吃什么的转盘，选项有火锅、日料、麻辣烫、盖浇饭、沙拉、披萨' },
  { label: '番茄钟', prompt: '来一个 25 分钟番茄钟' },
  { label: '俯卧撑计数', prompt: '帮我做个俯卧撑计数器，每次 +1' },
  { label: '购物清单', prompt: '帮我做一个周末超市购物清单' },
  { label: '掷骰子', prompt: '做一个掷 2 颗 6 面骰的骰子' },
  { label: '英语闪卡', prompt: '帮我做一个 5 张高级 GRE 单词的记忆闪卡' },
  { label: '团队投票', prompt: '做一个团建去哪儿的投票，选项：露营/密室/桌游/聚餐' },
  { label: '莫兰迪配色', prompt: '给我一个莫兰迪风格的调色板' },
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

      <div className="sidebar-section">快捷指令</div>
      {QUICK.map((q) => (
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
