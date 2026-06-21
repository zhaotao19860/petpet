import type { SpeechToTextProvider, SpeechToTextRequest, StarAiProvider, StarAiProviderRequest, StarBuddyMode } from '../types.js';

type OneApiEndpoint = 'responses' | 'chat' | 'messages';

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function baseUrl() {
  return trimTrailingSlash(process.env.AI_BASE_URL || 'https://oneapi-comate.baidu-int.com');
}

function token() {
  return process.env.ONEAPI_TOKEN || process.env.AI_API_KEY || '';
}

function isGptModel(model: string) {
  return /^gpt[-\w.]*$/i.test(model) || /^GPT[-\w.]*$/.test(model);
}

function isClaudeModel(model: string) {
  return /^Claude\b/i.test(model);
}

function isGlmModel(model: string) {
  return /^GLM[-\w.]*$/i.test(model);
}

function endpointForModel(model: string): OneApiEndpoint {
  if (isClaudeModel(model)) return 'messages';
  if (isGptModel(model)) return 'responses';
  return 'chat';
}

function modelForMode(mode: StarBuddyMode) {
  const strategy = (process.env.AI_MODEL_STRATEGY || 'speed-first').toLowerCase();
  const fastModel = process.env.AI_FAST_MODEL || 'GLM-5-Turbo';
  const smartModel = process.env.AI_SMART_MODEL || 'GPT-5.4-Mini';
  const defaultModel = process.env.AI_MODEL || fastModel;
  if (strategy === 'single') return defaultModel;
  return mode === 'story' ? smartModel : fastModel;
}

function maxTokensForRequest(request: StarAiProviderRequest, endpoint: OneApiEndpoint) {
  const longStoryTokens = Number(process.env.AI_LONG_STORY_MAX_TOKENS || 12000);
  const value = request.mode === 'story'
    ? request.outputSize === 'long' || /一万字|1万字|10000字|万字|长篇|超长|很长|长一点/.test(request.user)
      ? longStoryTokens
      : 900
    : 220;
  return endpoint === 'responses' ? Math.max(16, value) : value;
}

async function postJson(url: string, body: unknown, timeoutMs: number) {
  const apiToken = token();
  if (!apiToken) throw new Error('ONEAPI_TOKEN_MISSING');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`ONEAPI_HTTP_${response.status}: ${text.slice(0, 300)}`);
    }
    if (!contentType.includes('application/json')) {
      throw new Error('ONEAPI_NON_JSON_RESPONSE');
    }
    return JSON.parse(text) as Record<string, unknown>;
  } finally {
    clearTimeout(timer);
  }
}

async function postFormData(url: string, body: FormData, timeoutMs: number) {
  const apiToken = token();
  if (!apiToken) throw new Error('ONEAPI_TOKEN_MISSING');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
      body,
      signal: controller.signal,
    });
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`ONEAPI_STT_HTTP_${response.status}: ${text.slice(0, 300)}`);
    }
    if (!contentType.includes('application/json')) {
      throw new Error('ONEAPI_STT_NON_JSON_RESPONSE');
    }
    return JSON.parse(text) as Record<string, unknown>;
  } finally {
    clearTimeout(timer);
  }
}

function textFromResponses(data: Record<string, unknown>) {
  if (typeof data.output_text === 'string') return data.output_text;
  const output = Array.isArray(data.output) ? data.output : [];
  const chunks: string[] = [];
  for (const item of output) {
    const outputItem = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const content = Array.isArray(outputItem.content) ? outputItem.content : [];
    for (const contentItem of content) {
      const block = contentItem && typeof contentItem === 'object' ? contentItem as Record<string, unknown> : {};
      if (typeof block.text === 'string') chunks.push(block.text);
    }
  }
  return chunks.join('');
}

function textFromChat(data: Record<string, unknown>) {
  const choices = Array.isArray(data.choices) ? data.choices : [];
  const first = choices[0] && typeof choices[0] === 'object' ? choices[0] as Record<string, unknown> : {};
  const message = first.message && typeof first.message === 'object' ? first.message as Record<string, unknown> : {};
  return typeof message.content === 'string' ? message.content : '';
}

function textFromMessages(data: Record<string, unknown>) {
  const content = Array.isArray(data.content) ? data.content : [];
  const chunks: string[] = [];
  for (const item of content) {
    const block = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    if (typeof block.text === 'string') chunks.push(block.text);
  }
  return chunks.join('');
}

function extractText(endpoint: OneApiEndpoint, data: Record<string, unknown>) {
  if (endpoint === 'responses') return textFromResponses(data);
  if (endpoint === 'messages') return textFromMessages(data);
  return textFromChat(data);
}

function buildBody(endpoint: OneApiEndpoint, model: string, request: StarAiProviderRequest) {
  const maxTokens = maxTokensForRequest(request, endpoint);
  if (endpoint === 'responses') {
    return {
      model,
      instructions: request.system,
      input: request.user,
      max_output_tokens: maxTokens,
      temperature: 0.2,
    };
  }
  if (endpoint === 'messages') {
    return {
      model,
      system: request.system,
      messages: [{ role: 'user', content: request.user }],
      max_tokens: maxTokens,
      temperature: 0.2,
    };
  }
  return {
    model,
    messages: [
      { role: 'system', content: request.system },
      { role: 'user', content: request.user },
    ],
    max_tokens: maxTokens,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    ...(isGlmModel(model) ? { enable_thinking: false, thinking: { type: 'disabled' } } : {}),
  };
}

function endpointUrl(endpoint: OneApiEndpoint) {
  if (endpoint === 'responses') return `${baseUrl()}/v1/responses`;
  if (endpoint === 'messages') return `${baseUrl()}/v1/messages`;
  return `${baseUrl()}/v1/chat/completions`;
}

export class OneApiStarAiProvider implements StarAiProvider {
  async complete(request: StarAiProviderRequest) {
    const model = modelForMode(request.mode);
    const endpoint = endpointForModel(model);
    const data = await postJson(endpointUrl(endpoint), buildBody(endpoint, model, request), request.timeoutMs);
    const text = extractText(endpoint, data).trim();
    if (!text) throw new Error('ONEAPI_EMPTY_RESPONSE');
    return text;
  }
}

export class OneApiSpeechToTextProvider implements SpeechToTextProvider {
  async transcribe(request: SpeechToTextRequest) {
    const form = new FormData();
    const audio = new Uint8Array(request.audio);
    const file = new File([audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength)], request.filename || 'voice.webm', {
      type: request.mimeType || 'audio/webm',
    });
    form.append('file', file);
    form.append('model', process.env.AI_STT_MODEL || 'whisper-1');
    form.append('language', 'zh');
    form.append('response_format', 'json');

    const data = await postFormData(`${baseUrl()}/v1/audio/transcriptions`, form, request.timeoutMs);
    const text = typeof data.text === 'string' ? data.text.trim() : '';
    if (!text) throw new Error('ONEAPI_STT_EMPTY_RESPONSE');
    return text;
  }
}
