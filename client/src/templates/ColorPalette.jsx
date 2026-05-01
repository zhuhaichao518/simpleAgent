import React, { useState } from 'react';

export default function ColorPalette({ config }) {
  const { colors = [] } = config || {};
  const [copied, setCopied] = useState('');

  const onCopy = async (c) => {
    try {
      await navigator.clipboard.writeText(c);
      setCopied(`已复制 ${c}`);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      setCopied(c);
    }
  };

  return (
    <div className="tpl-palette">
      <div className="colors">
        {colors.map((c, i) => (
          <div
            key={i}
            className="swatch"
            style={{ background: c }}
            onClick={() => onCopy(c)}
            title="点击复制"
          >
            {c}
          </div>
        ))}
      </div>
      <div className="copied">{copied}</div>
    </div>
  );
}
