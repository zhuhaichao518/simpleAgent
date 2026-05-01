import React, { useState } from 'react';

export default function Voting({ config }) {
  const { options = [], color = '#0ea5e9' } = config || {};
  const [votes, setVotes] = useState(() => Object.fromEntries(options.map((o) => [o, 0])));

  const total = Object.values(votes).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="tpl-voting">
      {options.map((o) => {
        const v = votes[o] || 0;
        const pct = Math.round((v / total) * 100);
        return (
          <div key={o} className="opt">
            <div className="label">{o}</div>
            <div className="bar">
              <div style={{ width: `${pct}%`, background: color }} />
            </div>
            <div className="num">{v}</div>
            <button onClick={() => setVotes({ ...votes, [o]: v + 1 })}>+1</button>
          </div>
        );
      })}
      {options.length === 0 && <div style={{ color: 'var(--muted)' }}>没有选项，请编辑配置加几项</div>}
    </div>
  );
}
