import React, { useState } from 'react';
import { TEMPLATE_REGISTRY } from '../templates/index.js';
import AppFullscreen from './AppFullscreen.jsx';

/**
 * 「我的应用」库
 * - 列出所有生成过的 app（持久化在 localStorage 里，由 App.jsx 维护）
 * - 点击直接全屏打开，可分享、可删除
 */
export default function MyAppsModal({ apps, onClose, onDelete, onUpdate }) {
  const [openApp, setOpenApp] = useState(null);

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal my-apps" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>📦 我的应用</span>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 'normal' }}>共 {apps.length} 个</span>
        </h3>

        {apps.length === 0 ? (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px 0', fontSize: 13 }}>
            还没有生成过应用。试试在对话里说「帮我做一个 BMI 计算器」？
          </div>
        ) : (
          <div className="my-apps-grid">
            {apps
              .slice()
              .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
              .map((app) => {
                const reg = TEMPLATE_REGISTRY[app.template];
                const title = app.config?.title || reg?.name || app.template;
                return (
                  <div key={app.id} className="my-app-card">
                    <div className="ico">{getIcon(app.template)}</div>
                    <div className="info" onClick={() => setOpenApp(app)}>
                      <div className="t">{title}</div>
                      <div className="m">
                        {reg?.name || app.template} · {fmtTime(app.createdAt)}
                      </div>
                    </div>
                    <div className="acts">
                      <button onClick={() => setOpenApp(app)} title="打开">▶</button>
                      <button
                        onClick={() => {
                          if (confirm(`确定删除「${title}」？`)) onDelete?.(app.id);
                        }}
                        title="删除"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        <div className="actions">
          <button onClick={onClose}>关闭</button>
        </div>
      </div>

      {openApp && (
        <AppFullscreen
          app={openApp}
          onClose={() => setOpenApp(null)}
        />
      )}
    </div>
  );
}

function getIcon(template) {
  const map = {
    counter: '🔢',
    todo: '✅',
    timer: '⏱️',
    dice: '🎲',
    wheel: '🎯',
    voting: '🗳️',
    flashcard: '📚',
    palette: '🎨',
    custom: '✨',
  };
  return map[template] || '🧩';
}

function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60_000) return '刚刚';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`;
  return d.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
