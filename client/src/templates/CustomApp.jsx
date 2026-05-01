import React, { useEffect, useRef, useState } from 'react';

/**
 * 定制小应用：把 LLM 生成的 HTML 跑在 iframe 沙箱里
 *
 * - sandbox 不开 allow-same-origin，iframe 拿不到父页面的 cookie/localStorage，安全
 * - allow-scripts 允许 JS 跑起来
 * - 通过 postMessage 让 iframe 自报高度，达到自适应内容（嵌入卡片时）
 * - fullscreen 模式下直接占满，无需自适应
 */
export default function CustomApp({ config, fullscreen }) {
  const { html = '<p style="padding:20px;color:#888">空内容</p>' } = config || {};
  const ref = useRef(null);
  const [autoHeight, setAutoHeight] = useState(360);

  // 注入一段小脚本：内部 ResizeObserver -> postMessage 报告高度
  const injected = injectAutoHeight(html);

  useEffect(() => {
    function onMessage(e) {
      if (!e.data || e.data.__simpleAgentApp !== true) return;
      if (e.source !== ref.current?.contentWindow) return;
      if (typeof e.data.height === 'number') {
        const h = Math.max(220, Math.min(720, Math.ceil(e.data.height) + 8));
        setAutoHeight(h);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <iframe
      ref={ref}
      title={config?.title || 'custom-app'}
      srcDoc={injected}
      sandbox="allow-scripts allow-forms allow-popups allow-modals"
      style={{
        width: '100%',
        height: fullscreen ? '100%' : autoHeight,
        border: 'none',
        borderRadius: fullscreen ? 0 : 8,
        background: '#1f2330',
        display: 'block',
      }}
    />
  );
}

function injectAutoHeight(html) {
  const probe = `<script>(function(){
    function report(){
      try {
        var h = Math.max(
          document.documentElement.scrollHeight,
          document.body ? document.body.scrollHeight : 0
        );
        parent.postMessage({ __simpleAgentApp: true, height: h }, '*');
      } catch(e) {}
    }
    window.addEventListener('load', report);
    if (document.readyState === 'complete') report();
    setTimeout(report, 50);
    setTimeout(report, 300);
    setTimeout(report, 1000);
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(report);
      if (document.body) ro.observe(document.body);
    } else {
      setInterval(report, 1000);
    }
  })();<\/script>`;
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, probe + '</body>');
  return html + probe;
}
