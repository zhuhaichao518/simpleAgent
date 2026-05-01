import React, { useState } from 'react';

export default function TodoList({ config }) {
  const { items = [], color = '#10b981' } = config || {};
  const [list, setList] = useState(() =>
    items.map((t, i) => ({ id: i, text: t, done: false })),
  );
  const [text, setText] = useState('');

  const add = () => {
    if (!text.trim()) return;
    setList([...list, { id: Date.now(), text: text.trim(), done: false }]);
    setText('');
  };

  return (
    <div className="tpl-todo">
      <ul>
        {list.map((it) => (
          <li key={it.id} className={it.done ? 'done' : ''}>
            <input
              type="checkbox"
              checked={it.done}
              onChange={() =>
                setList(list.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)))
              }
              style={{ accentColor: color }}
            />
            <span style={{ flex: 1 }}>{it.text}</span>
            <button className="remove" onClick={() => setList(list.filter((x) => x.id !== it.id))}>
              ×
            </button>
          </li>
        ))}
        {list.length === 0 && <li style={{ color: 'var(--muted)' }}>清单是空的，加一个吧 ↓</li>}
      </ul>
      <div className="add">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="添加一项…"
        />
        <button onClick={add} style={{ background: color, borderColor: color, color: '#fff' }}>
          添加
        </button>
      </div>
    </div>
  );
}
