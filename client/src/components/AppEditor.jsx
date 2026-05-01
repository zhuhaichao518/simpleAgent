import React, { useState } from 'react';

/**
 * 简化版编辑器：直接以 JSON 形式编辑 config。
 * 这样无论模板字段怎么变都能改，比逐字段渲染表单灵活。
 */
export default function AppEditor({ app, onClose, onSave }) {
  const [text, setText] = useState(JSON.stringify(app.config, null, 2));
  const [err, setErr] = useState('');

  const save = () => {
    try {
      const cfg = JSON.parse(text);
      setErr('');
      onSave(cfg);
    } catch (e) {
      setErr('JSON 格式错误：' + e.message);
    }
  };

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>编辑：{app.config?.title || app.template}</h3>
        <div style={{ color: 'var(--muted)', fontSize: 12 }}>
          直接修改下面的 JSON 配置（保存后立即生效）
        </div>
        <label>config</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={14}
          style={{ minHeight: 220, fontFamily: 'ui-monospace, Menlo, monospace' }}
        />
        {err && <div style={{ color: 'var(--danger)', marginTop: 6, fontSize: 12 }}>{err}</div>}
        <div className="actions">
          <button onClick={onClose}>取消</button>
          <button className="primary" onClick={save}>保存</button>
        </div>
      </div>
    </div>
  );
}
