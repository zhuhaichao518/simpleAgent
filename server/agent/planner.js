/**
 * 任务规划器
 *
 * 在我们这个 MVP 里，绝大多数请求都是「单步」就能完成的（聊一句 / 生成一个 app /
 * 改一个 app），所以我们的 planner 用「轻量启发式 + 给 Agent 提示」的方式：
 *
 *   1. 先做一次快速分类（heuristics），打上标签：chat / generate_app / edit_app /
 *      multi_step。这一步不调 LLM，零延迟。
 *   2. 把分类结果作为「建议」塞回 Agent 的上下文里，LLM 仍然有最终决定权。
 *   3. 真正的 multi_step（用户一次说"先做个转盘再做个待办"）会让 loop 跑多轮。
 *
 * 这样的设计兼顾了「短平快」和「框架完整」：planner 真实存在并起作用，但不强制
 * LLM 走它的路径，避免规划本身成为瓶颈。
 */

const APP_KEYWORDS = ['做', '生成', '搞', '弄', '来一个', '帮我', '需要', '想要', '做个', '建一个', '创建'];
const EDIT_KEYWORDS = ['改', '修改', '换', '调整', '加一个', '去掉', '删掉', '颜色', '改成'];
const MULTI_HINTS = ['再', '然后', '另外', '顺便', '同时', '还要'];

export function plan(userInput, { recentApps = [] } = {}) {
  const text = (userInput || '').trim();
  if (!text) return { intent: 'chat', hints: [] };

  const hasAppHint = APP_KEYWORDS.some((k) => text.includes(k));
  const hasEditHint = EDIT_KEYWORDS.some((k) => text.includes(k));
  const isMulti = MULTI_HINTS.some((k) => text.includes(k));

  let intent = 'chat';
  if (hasEditHint && recentApps.length) intent = 'edit_app';
  else if (hasAppHint || /(转盘|计数|待办|清单|倒计时|番茄|骰子|抽签|抽奖|投票|闪卡|背单词|配色)/.test(text))
    intent = 'generate_app';

  if (isMulti) intent = 'multi_step';

  const hints = [];
  if (intent === 'edit_app') {
    const last = recentApps.at(-1);
    if (last) hints.push(`用户大概率想修改最近这个 app：${last.id} (${last.template})`);
  }
  if (intent === 'multi_step') {
    hints.push('用户的请求疑似包含多个目标，分多轮逐步完成；每完成一个就立刻 generate_app 推到对话里。');
  }
  if (intent === 'generate_app') {
    hints.push('用户疑似要直接生成 app，不要反复确认，挑一个最贴合的模板直接生成。');
  }

  return { intent, hints };
}
