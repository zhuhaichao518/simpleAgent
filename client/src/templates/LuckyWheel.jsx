import React, { useMemo, useRef, useState } from 'react';

const PALETTE = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#0ea5e9', '#ef4444', '#14b8a6', '#f97316', '#a855f7', '#22c55e', '#eab308'];

export default function LuckyWheel({ config }) {
  const { options = ['A', 'B', 'C', 'D'], color = '#8b5cf6' } = config || {};
  const safeOptions = options.length >= 2 ? options : ['请', '至少', '两项'];
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState(null);
  const spinning = useRef(false);

  const slices = useMemo(() => {
    const n = safeOptions.length;
    const angle = 360 / n;
    return safeOptions.map((label, i) => ({
      label,
      start: i * angle,
      end: (i + 1) * angle,
      color: PALETTE[i % PALETTE.length],
    }));
  }, [safeOptions]);

  const spin = () => {
    if (spinning.current) return;
    spinning.current = true;
    const n = safeOptions.length;
    const pickIndex = Math.floor(Math.random() * n);
    const sliceAngle = 360 / n;
    const sliceCenter = pickIndex * sliceAngle + sliceAngle / 2;
    const target = 360 * 6 + (360 - sliceCenter);
    setRotation(target);
    setWinner(null);
    setTimeout(() => {
      setWinner(safeOptions[pickIndex]);
      spinning.current = false;
    }, 4100);
  };

  const r = 100;
  const cx = 110;
  const cy = 110;

  return (
    <div className="tpl-wheel">
      <div className="wheel-wrap">
        <div className="pointer" />
        <svg
          width="220"
          height="220"
          viewBox="0 0 220 220"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {slices.map((s, i) => {
            const startRad = (Math.PI / 180) * s.start;
            const endRad = (Math.PI / 180) * s.end;
            const x1 = cx + r * Math.sin(startRad);
            const y1 = cy - r * Math.cos(startRad);
            const x2 = cx + r * Math.sin(endRad);
            const y2 = cy - r * Math.cos(endRad);
            const large = s.end - s.start > 180 ? 1 : 0;
            const d = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`;
            const midRad = (startRad + endRad) / 2;
            const tx = cx + r * 0.6 * Math.sin(midRad);
            const ty = cy - r * 0.6 * Math.cos(midRad);
            const angleDeg = (s.start + s.end) / 2;
            return (
              <g key={i}>
                <path d={d} fill={s.color} stroke="#0f1117" strokeWidth="1" />
                <text
                  x={tx}
                  y={ty}
                  fill="#fff"
                  fontSize="11"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${angleDeg} ${tx} ${ty})`}
                >
                  {s.label.length > 6 ? s.label.slice(0, 6) + '…' : s.label}
                </text>
              </g>
            );
          })}
          <circle cx={cx} cy={cy} r={10} fill="#fff" />
        </svg>
      </div>
      <button className="spin" onClick={spin} style={{ background: color }}>
        转 动
      </button>
      {winner && <div className="winner">🎉 {winner}</div>}
    </div>
  );
}
