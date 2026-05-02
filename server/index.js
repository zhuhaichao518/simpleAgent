import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runAgent } from './agent/loop.js';
import { memory } from './agent/memory.js';
import { TEMPLATES } from './agent/templates.js';
import { chat as llmChat } from './agent/llm.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/templates', (_req, res) => {
  res.json(
    TEMPLATES.map((t) => ({
      type: t.type,
      name: t.name,
      description: t.description,
      examples: t.examples,
      defaults: t.defaults,
    })),
  );
});

app.get('/api/session/:id', (req, res) => {
  const snap = memory.snapshot(req.params.id);
  res.json(snap);
});

app.delete('/api/session/:id', (req, res) => {
  memory.reset(req.params.id);
  res.json({ ok: true });
});

/**
 * 沙箱 LLM 转发：给 iframe 里的 custom app 用
 *
 * - iframe 没有 same-origin，不能直接调 /api/chat（也不该让它访问会话上下文）
 * - 所以单独开一个干净的端点，每次调用都是无状态的、独立的
 * - 限制 prompt 长度和 max tokens 避免滥用
 */
app.post('/api/sandbox/llm', async (req, res) => {
  try {
    const { prompt, system, temperature, json } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'prompt is required' });
    }
    if (prompt.length > 8000) {
      return res.status(400).json({ error: 'prompt too long (max 8000 chars)' });
    }
    const messages = [];
    if (system && typeof system === 'string') {
      messages.push({ role: 'system', content: system.slice(0, 2000) });
    }
    messages.push({ role: 'user', content: prompt });
    const text = await llmChat(messages, {
      temperature: typeof temperature === 'number' ? temperature : 0.7,
      maxTokens: 1500,
      responseFormat: json ? 'json' : undefined,
    });
    res.json({ text });
  } catch (e) {
    res.status(500).json({ error: e.message || 'llm call failed' });
  }
});

app.post('/api/app/:appId', (req, res) => {
  const { sessionId, config } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
  const updated = memory.updateApp(sessionId, req.params.appId, { config });
  if (!updated) return res.status(404).json({ error: 'app not found' });
  res.json(updated);
});

/**
 * 主对话接口 —— SSE 流
 * 客户端 POST { sessionId, message } 后，服务端实时把 agent 事件推回去：
 *   plan / thinking / action / message / app / app_update / done
 */
app.post('/api/chat', async (req, res) => {
  const { sessionId, message } = req.body || {};
  if (!sessionId || !message) {
    return res.status(400).json({ error: 'sessionId and message are required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const send = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  send({ type: 'user_echo', content: message });

  try {
    await runAgent({ sessionId, userInput: message, emit: send });
  } catch (e) {
    send({ type: 'message', role: 'assistant', content: `[出错] ${e.message}` });
    send({ type: 'done' });
  } finally {
    res.end();
  }
});

// 生产环境下托管 client/dist
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(404).end();
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[simple-agent] server listening on http://localhost:${PORT}`);
});
