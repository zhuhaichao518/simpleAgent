import React, { useState } from 'react';
import { TEMPLATE_REGISTRY } from '../templates/index.js';
import AppEditor from './AppEditor.jsx';
import AppFullscreen from './AppFullscreen.jsx';

export default function AppCard({ app, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [shared, setShared] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const reg = TEMPLATE_REGISTRY[app.template];
  if (!reg) {
    return (
      <div className="app-card">
        <div className="app-card-header">
          <div>
            <div className="app-card-title">未知模板：{app.template}</div>
          </div>
        </div>
      </div>
    );
  }
  const Comp = reg.component;
  const title = app.config?.title || reg.name;
  const isCustom = app.template === 'custom';

  const onShare = async () => {
    const payload = btoa(unescape(encodeURIComponent(JSON.stringify({ template: app.template, config: app.config }))));
    const url = `${window.location.origin}${window.location.pathname}#share=${payload}`;
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 1500);
    } catch {
      window.prompt('复制这个链接分享：', url);
    }
  };

  const handleSave = (newConfig) => {
    onUpdate?.(app.id, newConfig);
    setEditing(false);
  };

  return (
    <>
      <div className="app-card">
        <div className="app-card-header">
          <div>
            <div className="app-card-title">{title}</div>
            <div className="app-card-meta">{reg.name} · {app.id}</div>
          </div>
          <div className="app-card-actions">
            <button className="open" onClick={() => setFullscreen(true)} title="全屏打开">
              ⛶ 打开
            </button>
            <button onClick={() => setEditing(true)}>编辑</button>
            <button onClick={onShare}>{shared ? '已复制' : '分享'}</button>
          </div>
        </div>
        <div
          className={`app-frame ${isCustom ? 'app-frame-custom' : ''}`}
          onDoubleClick={() => setFullscreen(true)}
          title={isCustom ? '双击进入全屏' : ''}
        >
          <Comp config={app.config} appId={app.id} />
          {isCustom && (
            <button className="app-frame-overlay" onClick={() => setFullscreen(true)}>
              ⛶ 进入全屏体验
            </button>
          )}
        </div>
      </div>

      {editing && (
        <AppEditor
          app={app}
          onClose={() => setEditing(false)}
          onSave={handleSave}
        />
      )}

      {fullscreen && (
        <AppFullscreen
          app={app}
          onClose={() => setFullscreen(false)}
          onEdit={() => { setFullscreen(false); setEditing(true); }}
          onShare={onShare}
        />
      )}
    </>
  );
}
