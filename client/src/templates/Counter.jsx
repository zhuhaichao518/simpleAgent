import React, { useState } from 'react';

export default function Counter({ config, onChange }) {
  const { title = '计数器', initial = 0, step = 1, unit = '次', color = '#6366f1' } = config || {};
  const [v, setV] = useState(initial);
  return (
    <div className="tpl-counter" style={{ '--c': color }}>
      <div className="num" style={{ color }}>
        {v}
        <span className="unit">{unit}</span>
      </div>
      <div className="controls">
        <button onClick={() => setV(v - step)}>−</button>
        <button onClick={() => setV(initial)} title="重置">↺</button>
        <button onClick={() => setV(v + step)}>+</button>
      </div>
    </div>
  );
}
