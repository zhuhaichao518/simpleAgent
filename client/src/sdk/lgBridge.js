/**
 * LG Bridge —— 父页面侧
 *
 * 监听所有 iframe 的 postMessage，把 LG.* 调用真实执行掉：
 *   - llm:    调后端 /api/sandbox/llm
 *   - tts:    SpeechSynthesis (在父页面执行，绕开 iframe sandbox 限制)
 *   - vibrate: navigator.vibrate
 *   - kv:     localStorage，用 LG:${appId}:${key} 命名空间
 *   - toast:  父页面顶部弹一条
 *
 * 安全措施：
 *   - iframe 没有 allow-same-origin，本身已经隔离
 *   - 这里再加 size 限制 + 简单速率限制
 */

const KV_PREFIX = 'LG';
const KV_MAX_VAL_LEN = 200_000; // 单 key 最大 200KB（足够对付绝大多数小工具）
const RATE_LIMIT_MS = 200; // 同一个 iframe 最快 200ms 一次 LLM 调用
const lastLlmCallAt = new WeakMap();

// 与 import.meta.env.BASE_URL 保持一致；当应用挂在 /simpleagent 子路径时
// 这里就是 '/simpleagent'，根挂载时是 ''
const API_BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

let toastListener = null;
export function setToastListener(fn) {
  toastListener = fn;
}

let installed = false;

export function installLGBridge() {
  if (installed) return;
  installed = true;
  window.addEventListener('message', handleMessage);
}

async function handleMessage(e) {
  const msg = e.data;
  if (!msg || msg.__LG !== true) return;
  const { id, method, params, appId } = msg;
  const source = e.source;
  if (!source) return;

  const reply = (ok, data, error) => {
    try {
      source.postMessage({ __LG_RES: true, id, ok, data, error }, '*');
    } catch {}
  };

  try {
    let data;
    switch (method) {
      case 'llm': {
        const last = lastLlmCallAt.get(source) || 0;
        const now = Date.now();
        if (now - last < RATE_LIMIT_MS) {
          throw new Error('rate limited; LG.llm 调用过于频繁');
        }
        lastLlmCallAt.set(source, now);

        const { prompt, system, temperature, json } = params || {};
        const r = await fetch(`${API_BASE}/api/sandbox/llm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, system, temperature, json }),
        });
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.error || `LLM 调用失败 (${r.status})`);
        }
        const j = await r.json();
        data = j.text || '';
        break;
      }
      case 'tts': {
        const { text, lang, rate } = params || {};
        if (!text) throw new Error('tts needs text');
        if (!('speechSynthesis' in window)) throw new Error('not supported');
        const u = new SpeechSynthesisUtterance(String(text).slice(0, 1000));
        if (lang) u.lang = lang;
        if (typeof rate === 'number') u.rate = rate;
        window.speechSynthesis.speak(u);
        data = true;
        break;
      }
      case 'stopTTS': {
        window.speechSynthesis?.cancel();
        data = true;
        break;
      }
      case 'vibrate': {
        const pattern = params?.pattern ?? 100;
        navigator.vibrate?.(pattern);
        data = true;
        break;
      }
      case 'kv.get': {
        const k = kvKey(appId, params?.key);
        const raw = localStorage.getItem(k);
        data = raw == null ? null : safeParse(raw);
        break;
      }
      case 'kv.set': {
        const { key, value } = params || {};
        const k = kvKey(appId, key);
        const ser = JSON.stringify(value);
        if (ser && ser.length > KV_MAX_VAL_LEN) {
          throw new Error(`kv 值过大 (${ser.length} > ${KV_MAX_VAL_LEN})`);
        }
        localStorage.setItem(k, ser);
        data = true;
        break;
      }
      case 'kv.remove': {
        localStorage.removeItem(kvKey(appId, params?.key));
        data = true;
        break;
      }
      case 'kv.keys': {
        const prefix = `${KV_PREFIX}:${appId || 'anon'}:`;
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(prefix)) keys.push(k.slice(prefix.length));
        }
        data = keys;
        break;
      }
      case 'toast': {
        const m = String(params?.msg ?? '').slice(0, 200);
        toastListener?.(m);
        data = true;
        break;
      }
      default:
        throw new Error(`unknown method: ${method}`);
    }
    reply(true, data);
  } catch (err) {
    reply(false, null, err?.message || String(err));
  }
}

function kvKey(appId, key) {
  if (!key || typeof key !== 'string') throw new Error('kv key required');
  if (key.length > 200) throw new Error('kv key too long');
  return `${KV_PREFIX}:${appId || 'anon'}:${key}`;
}
function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

/** 删除某个 app 的所有 kv 数据（在删除应用时调用） */
export function clearAppKV(appId) {
  if (!appId) return;
  const prefix = `${KV_PREFIX}:${appId}:`;
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}
