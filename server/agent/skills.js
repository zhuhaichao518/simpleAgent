import { nanoid } from 'nanoid';
import { getTemplate, TEMPLATES } from './templates.js';

/**
 * 技能注册表
 *
 * 每个技能 = 一个可被 Agent 调用的能力，独立、可测、易扩展。
 * 想新增技能（比如「搜索」「画图」），照这个结构加一项即可。
 */
export class SkillRegistry {
  constructor() {
    this.skills = new Map();
  }

  register(skill) {
    this.skills.set(skill.name, skill);
  }

  has(name) {
    return this.skills.has(name);
  }

  async run(name, args, ctx) {
    const skill = this.skills.get(name);
    if (!skill) {
      return { ok: false, error: `unknown skill: ${name}` };
    }
    try {
      const result = await skill.handler(args || {}, ctx);
      return { ok: true, ...result };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  }
}

export const skills = new SkillRegistry();

/* ----------------- 内置技能 ------------------ */

skills.register({
  name: 'chat',
  description: '直接和用户聊天 / 回答问题 / 解释',
  handler: async ({ content }) => {
    return {
      events: [{ type: 'message', role: 'assistant', content: content || '' }],
      done: true,
    };
  },
});

skills.register({
  name: 'list_apps',
  description: '列出所有可用的应用模板',
  handler: async () => {
    const text =
      '我目前可以「秒生成」这些小应用，你直接说场景就行：\n' +
      TEMPLATES.map((t) => `- **${t.name}** —— ${t.description}（例：${t.examples[0]}）`).join('\n');
    return {
      events: [{ type: 'message', role: 'assistant', content: text }],
      done: true,
    };
  },
});

skills.register({
  name: 'generate_app',
  description: '根据 template + config 生成一个小应用并推到对话流里',
  handler: async ({ template, config, explain }, { memory, sessionId }) => {
    let merged;
    let templateName;

    if (template === 'custom') {
      // LLM 现场生成的定制小应用
      const cfg = config || {};
      if (!cfg.html || typeof cfg.html !== 'string') {
        return {
          events: [
            {
              type: 'message',
              role: 'assistant',
              content: '生成自定义应用时缺少 html 字段，我再试一次。',
            },
          ],
          done: true,
        };
      }
      merged = {
        title: cfg.title || '自定义小应用',
        html: cfg.html,
        summary: cfg.summary || '',
      };
      templateName = '自定义';
    } else {
      const tpl = getTemplate(template);
      if (!tpl) {
        return {
          events: [
            {
              type: 'message',
              role: 'assistant',
              content: `抱歉，没有 "${template}" 这个模板。可用模板：${TEMPLATES.map((t) => t.type).join(', ')}, custom`,
            },
          ],
          done: true,
        };
      }
      merged = { ...tpl.defaults, ...(config || {}) };
      templateName = tpl.name;
    }

    const app = {
      id: 'app_' + nanoid(8),
      template,
      templateName,
      config: merged,
      createdAt: Date.now(),
    };
    memory.addApp(sessionId, app);

    const events = [];
    if (explain) events.push({ type: 'message', role: 'assistant', content: explain });
    events.push({ type: 'app', app });
    return { events, done: true };
  },
});

skills.register({
  name: 'edit_app',
  description: '修改对话里已有的某个 app 的 config',
  handler: async ({ appId, config, explain }, { memory, sessionId }) => {
    let target = appId ? memory.getApp(sessionId, appId) : null;
    if (!target) {
      const recent = memory.getRecentApps(sessionId, 1);
      target = recent[0];
    }
    if (!target) {
      return {
        events: [
          {
            type: 'message',
            role: 'assistant',
            content: '当前对话里还没有可以编辑的 app，要不要我先给你生成一个？',
          },
        ],
        done: true,
      };
    }
    const tpl = getTemplate(target.template);
    const newConfig = { ...target.config, ...(config || {}) };
    const updated = memory.updateApp(sessionId, target.id, { config: newConfig });

    const events = [];
    if (explain) events.push({ type: 'message', role: 'assistant', content: explain });
    events.push({ type: 'app_update', app: updated });
    return { events, done: true };
  },
});
