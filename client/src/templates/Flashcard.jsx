import React, { useState } from 'react';

export default function Flashcard({ config }) {
  const { cards = [], color = '#ec4899' } = config || {};
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (!cards.length) return <div style={{ color: 'var(--muted)' }}>没有闪卡内容</div>;
  const c = cards[i % cards.length];

  return (
    <div className="tpl-flashcard">
      <div className="card" onClick={() => setFlipped(!flipped)}>
        <div className={`inner ${flipped ? 'flipped' : ''}`}>
          <div className="face front" style={{ background: color }}>{c.front}</div>
          <div className="face back">{c.back}</div>
        </div>
      </div>
      <div className="nav">
        <button onClick={() => { setI((i - 1 + cards.length) % cards.length); setFlipped(false); }}>← 上一张</button>
        <span>{i + 1} / {cards.length}（点击翻面）</span>
        <button onClick={() => { setI((i + 1) % cards.length); setFlipped(false); }}>下一张 →</button>
      </div>
    </div>
  );
}
