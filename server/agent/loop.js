import { chat } from './llm.js';
import { buildMessages } from './context.js';
import { plan } from './planner.js';
import { skills } from './skills.js';
import { memory } from './memory.js';

const MAX_STEPS = 4;

/**
 * Agent 主循环（ReAct 风格）
 *
 *   plan(用户输入)
 *     -> 把输入 + 规划提示写入短期记忆
 *     -> 反复:
 *          messages = context.build(...)
 *          step = LLM(messages)         // 输出结构化 JSON: { action, args, done }
 *          result = skills.run(step.action, step.args)
 *          emit(result.events)          // 把消息 / app 事件推给前端
 *          if result.done && step.done: break
 *          else: 把 result 当作 observation 写回记忆，继续下一轮
 *
 * `emit` 是一个回调，用于实时把事件流推到前端（SSE）。
 */
export async function runAgent({ sessionId, userInput, emit }) {
  memory.appendMessage(sessionId, 'user', userInput);

  const recentApps = memory.getRecentApps(sessionId, 3);
  const planning = plan(userInput, { recentApps });

  if (planning.hints.length) {
    memory.appendMessage(
      sessionId,
      'observation',
      `[planner] intent=${planning.intent}; hints: ${planning.hints.join(' | ')}`,
    );
  }
  emit({ type: 'plan', intent: planning.intent, hints: planning.hints });

  for (let step = 0; step < MAX_STEPS; step++) {
    emit({ type: 'thinking', step });

    const messages = buildMessages({ memory, sessionId, userInput: null });
    let raw;
    try {
      raw = await chat(messages, { temperature: 0.4, responseFormat: 'json' });
    } catch (e) {
      const msg = `[LLM 调用失败] ${e.message}`;
      emit({ type: 'message', role: 'assistant', content: msg });
      memory.appendMessage(sessionId, 'assistant', msg);
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(extractJson(raw));
    } catch {
      const msg = '我刚才走神了，能再说一遍你的需求吗？';
      emit({ type: 'message', role: 'assistant', content: msg });
      memory.appendMessage(sessionId, 'assistant', msg);
      return;
    }

    const { thought, action, args, done } = parsed;
    emit({ type: 'action', action, args, thought });
    memory.appendMessage(
      sessionId,
      'assistant',
      JSON.stringify({ thought, action, args }),
    );

    if (!skills.has(action)) {
      const msg = `（我尝试调用了未知能力：${action}）`;
      emit({ type: 'message', role: 'assistant', content: msg });
      memory.appendMessage(sessionId, 'observation', `unknown action: ${action}`);
      continue;
    }

    const result = await skills.run(action, args, { memory, sessionId });
    for (const ev of result.events || []) {
      emit(ev);
      if (ev.type === 'message') {
        memory.appendMessage(sessionId, 'assistant', ev.content);
      } else if (ev.type === 'app') {
        memory.appendMessage(
          sessionId,
          'observation',
          `[已生成 app] id=${ev.app.id} type=${ev.app.template}`,
        );
      } else if (ev.type === 'app_update') {
        memory.appendMessage(
          sessionId,
          'observation',
          `[已更新 app] id=${ev.app.id} type=${ev.app.template}`,
        );
      }
    }

    if (!result.ok) {
      memory.appendMessage(sessionId, 'observation', `skill error: ${result.error}`);
      continue;
    }

    if (result.done !== false && done !== false) {
      break;
    }
  }

  emit({ type: 'done' });
}

function extractJson(text) {
  if (!text) return '{}';
  const s = text.trim();
  if (s.startsWith('{')) return s;
  const m = s.match(/\{[\s\S]*\}/);
  return m ? m[0] : '{}';
}
