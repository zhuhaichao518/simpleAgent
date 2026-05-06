import OpenAI from 'openai';
import { ProxyAgent, setGlobalDispatcher } from 'undici';

/**
 * LLM 适配层
 * - 兼容 OpenAI / DeepSeek / 通义千问等所有 OpenAI Chat Completions 协议
 * - 之所以单独抽出来，是为了未来很容易再接入 Anthropic、本地模型等
 *
 * 出海代理：国内 VPS 调 OpenAI / Anthropic / OpenRouter 时容易被地区封禁
 * （403 "not available in your region"）。通过环境变量配出口代理，会把
 * 当前 Node 进程所有 fetch 都路由过去（OpenAI SDK 底层就是 fetch）。
 *
 * 优先级：LLM_PROXY > HTTPS_PROXY > HTTP_PROXY > ALL_PROXY
 * 例：LLM_PROXY=http://127.0.0.1:7897
 *     LLM_PROXY=socks5://127.0.0.1:1080  （仅 undici v6+ 支持 socks，更通用建议用 http 代理）
 */
const proxyUrl =
  process.env.LLM_PROXY ||
  process.env.HTTPS_PROXY ||
  process.env.https_proxy ||
  process.env.HTTP_PROXY ||
  process.env.http_proxy ||
  process.env.ALL_PROXY ||
  process.env.all_proxy ||
  '';

if (proxyUrl) {
  try {
    setGlobalDispatcher(new ProxyAgent(proxyUrl));
    console.log(`[llm] 出口走代理: ${proxyUrl}`);
  } catch (e) {
    console.warn(`[llm] 代理配置失败，将走直连: ${e.message}`);
  }
}

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
