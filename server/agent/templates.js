/**
 * App 模板注册表
 * - 这里是「服务端的元数据」：name / 描述 / config schema / 默认配置 / 适用场景
 * - 真正的渲染组件在 client/src/templates 里，按 type 字段一一对应
 *
 * LLM 不直接生成代码，而是从这个清单里挑一个 type，再填 config，
 * 这样 30 秒内就能稳定生成出可用的小应用。
 */
export const TEMPLATES = [
  {
    type: 'counter',
    name: '计数器',
    description: '一个可以加减的计数器，适合记次数、记账、积分卡等场景',
    examples: ['打卡计数', '俯卧撑计数', '宝宝喝奶次数'],
    schema: {
      title: 'string · 显示在卡片顶部的标题',
      initial: 'number · 初始值，默认 0',
      step: 'number · 每次加减的步长，默认 1',
      unit: 'string · 单位，例如 "次" "杯"',
      color: 'string · 主题色 hex，例如 "#6366f1"',
    },
    defaults: { title: '我的计数器', initial: 0, step: 1, unit: '次', color: '#6366f1' },
  },
  {
    type: 'todo',
    name: '待办清单',
    description: '可勾选、可增删的待办列表',
    examples: ['今日待办', '购物清单', '出差打包清单'],
    schema: {
      title: 'string',
      items: 'string[] · 初始任务文本数组',
      color: 'string',
    },
    defaults: { title: '今日待办', items: ['喝一杯水', '散步 10 分钟'], color: '#10b981' },
  },
  {
    type: 'timer',
    name: '番茄/倒计时',
    description: '可启动暂停的倒计时',
    examples: ['25 分钟番茄钟', '泡面 3 分钟', '冥想计时'],
    schema: {
      title: 'string',
      seconds: 'number · 总秒数',
      color: 'string',
    },
    defaults: { title: '番茄钟', seconds: 1500, color: '#ef4444' },
  },
  {
    type: 'dice',
    name: '骰子',
    description: '掷 N 个 M 面骰子',
    examples: ['掷骰子选餐厅', 'DnD 跑团', '抽签'],
    schema: {
      title: 'string',
      count: 'number · 骰子个数，1-6',
      faces: 'number · 骰子面数，例如 6 / 20',
      color: 'string',
    },
    defaults: { title: '掷骰子', count: 2, faces: 6, color: '#f59e0b' },
  },
  {
    type: 'wheel',
    name: '抽奖转盘',
    description: '点击旋转，从选项中随机抽一个',
    examples: ['今天吃什么', '点名转盘', '惩罚转盘'],
    schema: {
      title: 'string',
      options: 'string[] · 转盘上的选项，2-12 个',
      color: 'string',
    },
    defaults: {
      title: '今天吃什么',
      options: ['火锅', '日料', '麻辣烫', '盖浇饭', '沙拉', '披萨'],
      color: '#8b5cf6',
    },
  },
  {
    type: 'voting',
    name: '投票',
    description: '多选项投票，可看到比例',
    examples: ['团队周末活动投票', '产品方案 PK'],
    schema: {
      title: 'string',
      options: 'string[]',
      color: 'string',
    },
    defaults: {
      title: '周末去哪玩',
      options: ['爬山', '看电影', '剧本杀', '宅家'],
      color: '#0ea5e9',
    },
  },
  {
    type: 'flashcard',
    name: '记忆闪卡',
    description: '正反翻面的闪卡，可切换上一张/下一张',
    examples: ['英语单词卡', '历史知识点', '面试八股'],
    schema: {
      title: 'string',
      cards: '{front:string, back:string}[] · 闪卡数组',
      color: 'string',
    },
    defaults: {
      title: '英语单词',
      cards: [
        { front: 'serendipity', back: '意外发现美好事物的能力' },
        { front: 'ephemeral', back: '短暂的，转瞬即逝的' },
        { front: 'ubiquitous', back: '无处不在的' },
      ],
      color: '#ec4899',
    },
  },
  {
    type: 'palette',
    name: '调色板',
    description: '展示一组配色，点击复制色值',
    examples: ['莫兰迪配色', '夏日海滩配色'],
    schema: {
      title: 'string',
      colors: 'string[] · hex 颜色数组，3-8 个',
    },
    defaults: {
      title: '莫兰迪配色',
      colors: ['#A8B5A2', '#C9C0B7', '#E8DCC4', '#D4A89A', '#8B7E74'],
    },
  },
];

export function getTemplate(type) {
  return TEMPLATES.find((t) => t.type === type);
}

export function describeTemplatesForPrompt() {
  return TEMPLATES.map((t) => {
    const fields = Object.entries(t.schema)
      .map(([k, v]) => `      - ${k}: ${v}`)
      .join('\n');
    return `- type: "${t.type}"  (${t.name})
    描述: ${t.description}
    适用: ${t.examples.join(' / ')}
    config 字段:
${fields}
    默认值参考: ${JSON.stringify(t.defaults)}`;
  }).join('\n\n');
}
