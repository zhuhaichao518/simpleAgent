import React, { useState } from 'react';

export default function DiceRoller({ config }) {
  const { count = 2, faces = 6, color = '#f59e0b' } = config || {};
  const init = Array.from({ length: count }, () => 1);
  const [vals, setVals] = useState(init);

  const roll = () => {
    setVals(Array.from({ length: count }, () => 1 + Math.floor(Math.random() * faces)));
  };

  const total = vals.reduce((a, b) => a + b, 0);
  return (
    <div className="tpl-dice">
      <div className="dice-row">
        {vals.map((v, i) => (
          <div key={i} className="dice">{v}</div>
        ))}
      </div>
      <div className="total">总点数：{total}（{count} × d{faces}）</div>
      <button className="roll" onClick={roll} style={{ background: color }}>
        掷骰子
      </button>
    </div>
  );
}
