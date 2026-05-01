/**
 * 记忆模块
 *
 * 设计目标：让 Agent 框架同时具备「短期对话记忆」和「长期事实记忆」，
 * 但实现尽可能精简，方便后续替换为向量库 / Redis / SQLite 等。
 *
 * - shortTerm: 最近的多轮消息（user / agent / observation）
 * - workingApps: 本会话生成的 app 列表（让 Agent 能引用、修改）
 * - longTerm: 提取出的稳定事实，例如用户偏好（"我喜欢深色"）
 *
 * 这里用进程内 Map 做存储，重启即失效；产线接 Redis 即可。
 */
export class Memory {
  constructor() {
    this.sessions = new Map();
  }

  _ensure(sessionId) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        shortTerm: [], // [{ role, content, ts }]
        workingApps: [], // [{ id, template, config, createdAt }]
        longTerm: [], // [{ fact, ts }]
      });
    }
    return this.sessions.get(sessionId);
  }

  appendMessage(sessionId, role, content) {
    const s = this._ensure(sessionId);
    s.shortTerm.push({ role, content, ts: Date.now() });
  }

  getShortTerm(sessionId) {
    return this._ensure(sessionId).shortTerm;
  }

  addApp(sessionId, app) {
    const s = this._ensure(sessionId);
    s.workingApps.push(app);
  }

  updateApp(sessionId, appId, patch) {
    const s = this._ensure(sessionId);
    const i = s.workingApps.findIndex((a) => a.id === appId);
    if (i >= 0) {
      s.workingApps[i] = { ...s.workingApps[i], ...patch, updatedAt: Date.now() };
      return s.workingApps[i];
    }
    return null;
  }

  getApp(sessionId, appId) {
    return this._ensure(sessionId).workingApps.find((a) => a.id === appId) || null;
  }

  getRecentApps(sessionId, limit = 3) {
    return this._ensure(sessionId).workingApps.slice(-limit);
  }

  rememberFact(sessionId, fact) {
    const s = this._ensure(sessionId);
    s.longTerm.push({ fact, ts: Date.now() });
  }

  /** 用于前端首次连上时把历史 hydrate 回去 */
  snapshot(sessionId) {
    const s = this._ensure(sessionId);
    return {
      messages: s.shortTerm,
      apps: s.workingApps,
      longTerm: s.longTerm,
    };
  }

  reset(sessionId) {
    this.sessions.delete(sessionId);
  }
}

export const memory = new Memory();
