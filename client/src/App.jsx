import React, { useEffect, useRef, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import MessageList from './components/MessageList.jsx';
import Composer from './components/Composer.jsx';
import { streamChat, resetSession, updateAppOnServer } from './api.js';

const SESSION_KEY = 'simple-agent-session';
const STATE_KEY = 'simple-agent-state-v1';
const SHOW_TRACE_KEY = 'simple-agent-show-trace';

function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = 'sess_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

let _autoId = 1;
const newId = () => `m_${Date.now()}_${_autoId++}`;

export default function App() {
  const [sessionId] = useState(getSessionId);
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [busy, setBusy] = useState(false);
  const [showTrace, setShowTrace] = useState(() => localStorage.getItem(SHOW_TRACE_KEY) === '1');
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    try {
      const slim = items.filter((i) => i.kind !== 'thinking');
      localStorage.setItem(STATE_KEY, JSON.stringify(slim));
    } catch {}
  }, [items]);

  useEffect(() => {
    localStorage.setItem(SHOW_TRACE_KEY, showTrace ? '1' : '0');
  }, [showTrace]);

  useEffect(() => {
    if (window.location.hash.startsWith('#share=')) {
      try {
        const data = JSON.parse(decodeURIComponent(escape(atob(window.location.hash.slice(7)))));
        if (data?.template && data?.config) {
          const app = {
            id: 'app_shared_' + Math.random().toString(36).slice(2, 8),
            template: data.template,
            config: data.config,
            createdAt: Date.now(),
          };
          setItems((prev) => [
            ...prev,
            {
              id: newId(),
              kind: 'assistant',
              content: '已为你打开一个被分享的小应用：',
            },
            { id: newId(), kind: 'app', app },
          ]);
        }
      } catch {}
      history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const append = (item) => setItems((prev) => [...prev, { id: newId(), ...item }]);
  const updateThinking = (content) => {
    setItems((prev) => {
      const i = [...prev].reverse().findIndex((x) => x.kind === 'thinking');
      if (i < 0) return prev;
      const idx = prev.length - 1 - i;
      const next = [...prev];
      next[idx] = { ...next[idx], content };
      return next;
    });
  };
  const removeThinking = () => {
    setItems((prev) => prev.filter((x) => x.kind !== 'thinking'));
  };

  const handleSend = async (text) => {
    if (busy) return;
    setBusy(true);
    append({ kind: 'user', content: text });
    append({ kind: 'thinking', content: 'Agent 思考中' });

    try {
      await streamChat({
        sessionId,
        message: text,
        onEvent: (ev) => {
          switch (ev.type) {
            case 'plan':
              if (showTrace) {
                append({ kind: 'trace', content: `[planner] intent=${ev.intent}${ev.hints?.length ? ' · ' + ev.hints.join(' | ') : ''}` });
              }
              break;
            case 'thinking':
              updateThinking('Agent 思考中');
              break;
            case 'action':
              if (showTrace) {
                append({ kind: 'trace', content: `[action] ${ev.action}\nthought: ${ev.thought || ''}\nargs: ${JSON.stringify(ev.args)}` });
              }
              updateThinking(`正在执行 ${ev.action}`);
              break;
            case 'message':
              removeThinking();
              append({ kind: 'assistant', content: ev.content });
              append({ kind: 'thinking', content: 'Agent 思考中' });
              break;
            case 'app':
              removeThinking();
              append({ kind: 'app', app: ev.app });
              append({ kind: 'thinking', content: 'Agent 思考中' });
              break;
            case 'app_update':
              setItems((prev) => prev.map((x) => (x.kind === 'app' && x.app.id === ev.app.id ? { ...x, app: ev.app } : x)));
              break;
            case 'done':
              removeThinking();
              break;
            default:
              break;
          }
        },
      });
    } catch (e) {
      removeThinking();
      append({ kind: 'assistant', content: `[请求失败] ${e.message}` });
    } finally {
      setBusy(false);
    }
  };

  const onUpdateApp = async (appId, config) => {
    setItems((prev) => prev.map((x) => (x.kind === 'app' && x.app.id === appId ? { ...x, app: { ...x.app, config } } : x)));
    try {
      await updateAppOnServer(appId, sessionId, config);
    } catch {}
  };

  const onReset = async () => {
    if (!confirm('清空当前对话和所有 app？')) return;
    setItems([]);
    localStorage.removeItem(STATE_KEY);
    try {
      await resetSession(sessionId);
    } catch {}
  };

  const empty = items.length === 0;

  return (
    <div className="app-shell">
      <Sidebar onPick={handleSend} onReset={onReset} />
      <main className="chat">
        <header className="chat-header">
          <div>
            <div className="chat-title">和 Agent 一起造小应用</div>
            <div className="chat-sub">session: {sessionId}</div>
          </div>
          <div className="chat-actions">
            <button onClick={() => setShowTrace((v) => !v)}>
              {showTrace ? '隐藏 Agent 轨迹' : '显示 Agent 轨迹'}
            </button>
          </div>
        </header>

        {empty ? (
          <div className="messages" style={{ alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: 'var(--muted)', maxWidth: 420 }}>
              <div style={{ fontSize: 36 }}>✨</div>
              <h2 style={{ color: 'var(--text)', margin: '8px 0' }}>30 秒，搞个你专属的小应用</h2>
              <p>试试在下方输入：「帮我做一个今天吃什么的转盘」「来个 25 分钟番茄钟」「搞个团建投票」…</p>
            </div>
          </div>
        ) : (
          <MessageList items={items} onUpdateApp={onUpdateApp} sessionId={sessionId} />
        )}

        <Composer onSend={handleSend} busy={busy} showSuggestions={empty} />
      </main>
    </div>
  );
}
