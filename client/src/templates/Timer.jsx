import React, { useEffect, useRef, useState } from 'react';

function fmt(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function Timer({ config }) {
  const { seconds = 1500, color = '#ef4444' } = config || {};
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    setLeft(seconds);
    setRunning(false);
  }, [seconds]);

  useEffect(() => {
    if (!running) return;
    ref.current = setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          clearInterval(ref.current);
          setRunning(false);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(ref.current);
  }, [running]);

  return (
    <div className="tpl-timer">
      <div className="display" style={{ color }}>
        {fmt(left)}
      </div>
      <div className="controls">
        <button onClick={() => setRunning((x) => !x)}>{running ? '暂停' : '开始'}</button>
        <button onClick={() => { setRunning(false); setLeft(seconds); }}>重置</button>
      </div>
    </div>
  );
}
