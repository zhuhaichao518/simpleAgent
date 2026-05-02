import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * 定制小应用：把 LLM 生成的 HTML 跑在 iframe 沙箱里
 *
 * - sandbox 不开 allow-same-origin，iframe 拿不到父页面的 cookie/localStorage，安全
 * - 注入 LG SDK：postMessage 桥到父页面，让 app 能调 LLM / TTS / 振动 / KV / Toast
 * - 注入 自适应高度探针：嵌入卡片时根据内容自动撑高
 * - fullscreen 模式下直接占满
 */
export default function CustomApp({ config, fullscreen, appId }) {
  const { html = '<p style="padding:20px;color:#888">空内容</p>' } = config || {};
  const ref = useRef(null);
  const [autoHeight, setAutoHeight] = useState(360);

  // 注入：LG SDK + 自适应高度探针
  const injected = useMemo(() => injectAll(html, appId || 'anon'), [html, appId]);

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

function injectAll(html, appId) {
  const sdk = buildSdkScript(appId);
  const probe = buildProbeScript();
  const inject = sdk + probe;
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, inject + '</body>');
  return html + inject;
}

function buildSdkScript(appId) {
  // 注入到 iframe 内的 JS
  // 用模板字符串拼好后发到 iframe srcdoc
  return `<script>(function(){
    var APP_ID = ${JSON.stringify(appId)};
    var _id = 0;
    var _pending = new Map();
    function _call(method, params){
      return new Promise(function(resolve, reject){
        var id = ++_id;
        _pending.set(id, { resolve: resolve, reject: reject });
        try { parent.postMessage({ __LG: true, id: id, method: method, params: params || {}, appId: APP_ID }, '*'); }
        catch(e){ _pending.delete(id); reject(e); return; }
        setTimeout(function(){
          if (_pending.has(id)) { _pending.delete(id); reject(new Error('LG.' + method + ' 超时')); }
        }, 60000);
      });
    }
    window.addEventListener('message', function(e){
      var d = e.data;
      if (!d || d.__LG_RES !== true) return;
      var p = _pending.get(d.id);
      if (!p) return;
      _pending.delete(d.id);
      if (d.ok) p.resolve(d.data);
      else p.reject(new Error(d.error || 'LG call failed'));
    });
    window.LG = {
      llm: function(prompt, opts){ return _call('llm', Object.assign({ prompt: prompt }, opts || {})); },
      tts: function(text, opts){ return _call('tts', Object.assign({ text: text }, opts || {})); },
      stopTTS: function(){ return _call('stopTTS'); },
      vibrate: function(pattern){ return _call('vibrate', { pattern: pattern }); },
      toast: function(msg){ return _call('toast', { msg: msg }); },
      kv: {
        get: function(key){ return _call('kv.get', { key: key }); },
        set: function(key, value){ return _call('kv.set', { key: key, value: value }); },
        remove: function(key){ return _call('kv.remove', { key: key }); },
        keys: function(){ return _call('kv.keys'); }
      }
    };
  })();<\/script>`;
}

function buildProbeScript() {
  return `<script>(function(){
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
}
