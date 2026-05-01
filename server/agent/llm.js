import OpenAI from 'openai';

/**
 * LLM 适配层
 * - 兼容 OpenAI / DeepSeek / 通义千问等所有 OpenAI Chat Completions 协议
 * - 之所以单独抽出来，是为了未来很容易再接入 Anthropic、本地模型等
 */
const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const isOpenRouter = baseURL.includes('openrouter.ai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-placeholder',
  baseURL,
  defaultHeaders: isOpenRouter
    ? {
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:5173',
        'X-Title': process.env.OPENROUTER_APP_NAME || 'Simple Agent',
      }
    : undefined,
});

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export async function chat(messages, { temperature = 0.4, responseFormat, maxTokens = 4096 } = {}) {
  const params = {
    model: DEFAULT_MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (responseFormat === 'json') {
    params.response_format = { type: 'json_object' };
  }
  const resp = await client.chat.completions.create(params);
  return resp.choices?.[0]?.message?.content ?? '';
}

export async function chatStream(messages, onDelta, { temperature = 0.4 } = {}) {
  const stream = await client.chat.completions.create({
    model: DEFAULT_MODEL,
    messages,
    temperature,
    stream: true,
  });
  let full = '';
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content || '';
    if (delta) {
      full += delta;
      onDelta?.(delta);
    }
  }
  return full;
}
