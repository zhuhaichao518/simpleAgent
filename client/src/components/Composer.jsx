import React, { useState } from 'react';

const SUGGESTIONS = [
  '今天吃什么转盘',
  '25 分钟番茄钟',
  '俯卧撑计数器',
  '掷 2 颗骰子',
  '团建投票：露营/密室/桌游',
  '5 张 GRE 单词闪卡',
];

export default function Composer({ onSend, busy, showSuggestions }) {
  const [text, setText] = useState('');

  const send = () => {
    const t = text.trim();
    if (!t || busy) return;
    onSend(t);
    setText('');
  };

  return (
    <div className="composer">
      {showSuggestions && (
        <div className="suggest-row">
          {SUGGESTIONS.map((s) => (
            <button key={s} disabled={busy} onClick={() => onSend(s)}>{s}</button>
          ))}
        </div>
      )}
      <div className="row">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={busy ? 'Agent 正在工作…' : '描述一下你想要的小应用，或聊聊天 (Enter 发送 / Shift+Enter 换行)'}
          rows={1}
          disabled={busy}
        />
        <button className="send" onClick={send} disabled={busy || !text.trim()}>
          发送
        </button>
      </div>
    </div>
  );
}
