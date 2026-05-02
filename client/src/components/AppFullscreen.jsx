import React, { useEffect } from 'react';
import { TEMPLATE_REGISTRY } from '../templates/index.js';

export default function AppFullscreen({ app, onClose, onEdit, onShare }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const reg = TEMPLATE_REGISTRY[app.template];
  const Comp = reg?.component;
  const title = app.config?.title || reg?.name || '小应用';

  return (
    <div className="fullscreen-mask">
      <header className="fullscreen-header">
        <div className="fullscreen-title">
          <span className="dot" />
          <strong>{title}</strong>
          <span className="meta">{reg?.name}</span>
        </div>
        <div className="fullscreen-actions">
          {onEdit && <button onClick={onEdit}>编辑</button>}
          {onShare && <button onClick={onShare}>分享</button>}
          <button className="primary" onClick={onClose}>关闭 (Esc)</button>
        </div>
      </header>
      <div className="fullscreen-body">
        {Comp ? (
          <div className={`fullscreen-stage ${app.template === 'custom' ? 'flex' : 'centered'}`}>
            <Comp config={app.config} fullscreen appId={app.id} />
          </div>
        ) : (
          <div style={{ color: 'var(--muted)', padding: 40 }}>未知模板：{app.template}</div>
        )}
      </div>
    </div>
  );
}
