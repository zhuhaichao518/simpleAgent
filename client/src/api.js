/**
 * 用 fetch + ReadableStream 解析后端的 SSE
 * （用 EventSource 不能 POST，所以手动解析）
 *
 * 所有 URL 都基于 import.meta.env.BASE_URL，方便整体挂在 /simpleagent 这种子路径下
 */

// e.g. '/simpleagent' 或 '' （根挂载时）
export const API_BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

const url = (p) => `${API_BASE}${p}`;

export async function streamChat({ sessionId, message, onEvent, signal }) {
  const resp = await fetch(url('/api/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message }),
    signal,
  });
  if (!resp.ok || !resp.body) {
    const text = await resp.text().catch(() => '');
    throw new Error(`chat failed: ${resp.status} ${text}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split('\n\n');
    buf = parts.pop() || '';
    for (const p of parts) {
      const line = p.trim();
      if (!line.startsWith('data:')) continue;
      const json = line.slice(5).trim();
      try {
        onEvent(JSON.parse(json));
      } catch {
        // ignore
      }
    }
  }
}

export async function fetchSession(sessionId) {
  const r = await fetch(url(`/api/session/${sessionId}`));
  return r.json();
}

export async function resetSession(sessionId) {
  await fetch(url(`/api/session/${sessionId}`), { method: 'DELETE' });
}

export async function updateAppOnServer(appId, sessionId, config) {
  await fetch(url(`/api/app/${appId}`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, config }),
  });
}

export async function fetchTemplates() {
  const r = await fetch(url('/api/templates'));
  return r.json();
}
