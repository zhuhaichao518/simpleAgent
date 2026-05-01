import { buildSystemPrompt, buildContextHeader } from './prompts.js';

/**
 * 上下文管理器
 *
 * 职责：把「系统提示 + 长期记忆 + 最近对话 + 当前任务」组装成一个 messages 数组
 * 喂给 LLM。当短期消息过多时做截断 + 摘要降级，避免 context 爆炸。
 *
 * 这里的策略足够给 MVP 用：
 *  - 保留最近 N 轮（默认 16 条 message）
 *  - 更老的内容压成一段「历史摘要」放进 system，避免遗忘
 *  - 把"最近生成过的 app"也注入到 system 里，方便 LLM 引用其 id
 */
const MAX_RECENT = 16;

function summarize(olderMessages) {
  if (!olderMessages.length) return '';
  const lines = olderMessages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => `${m.role === 'user' ? '用户' : '助手'}: ${truncate(m.content, 80)}`);
  return `（更早的对话摘要，省略了细节）\n${lines.slice(-12).join('\n')}`;
}

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}

export function buildMessages({ memory, sessionId, userInput }) {
  const all = memory.getShortTerm(sessionId);
  const recent = all.slice(-MAX_RECENT);
  const older = all.slice(0, -MAX_RECENT);

  const system = [buildSystemPrompt()];
  if (older.length) {
    system.push('\n# 历史摘要\n' + summarize(older));
  }
  const recentApps = memory.getRecentApps(sessionId, 3);
  const ctxHeader = buildContextHeader({ recentApps });
  if (ctxHeader) system.push(ctxHeader);

  const messages = [{ role: 'system', content: system.join('\n') }];

  for (const m of recent) {
    if (m.role === 'observation') {
      messages.push({
        role: 'user',
        content: `[observation] ${m.content}`,
      });
    } else {
      messages.push({ role: m.role, content: m.content });
    }
  }

  if (userInput) {
    messages.push({ role: 'user', content: userInput });
  }
  return messages;
}
