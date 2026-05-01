import React, { useEffect, useRef } from 'react';
import AppCard from './AppCard.jsx';

export default function MessageList({ items, onUpdateApp, sessionId }) {
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [items]);

  return (
    <div className="messages" ref={ref}>
      {items.map((it) => {
        if (it.kind === 'user') {
          return (
            <div key={it.id} className="msg-row user">
              <div className="bubble">{it.content}</div>
              <div className="avatar">🙋</div>
            </div>
          );
        }
        if (it.kind === 'assistant') {
          return (
            <div key={it.id} className="msg-row">
              <div className="avatar assistant">🤖</div>
              <div className="bubble">{it.content}</div>
            </div>
          );
        }
        if (it.kind === 'thinking') {
          return (
            <div key={it.id} className="msg-row">
              <div className="avatar assistant">🤖</div>
              <div className="thinking">
                {it.content || 'Agent 思考中'} <span className="dots" />
              </div>
            </div>
          );
        }
        if (it.kind === 'trace') {
          return (
            <div key={it.id} className="msg-row">
              <div className="avatar">🔧</div>
              <div className="trace">{it.content}</div>
            </div>
          );
        }
        if (it.kind === 'app') {
          return (
            <div key={it.id} className="msg-row">
              <div className="avatar assistant">🧩</div>
              <AppCard app={it.app} onUpdate={onUpdateApp} sessionId={sessionId} />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
