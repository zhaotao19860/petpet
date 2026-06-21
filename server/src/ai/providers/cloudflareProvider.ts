import type { SpeechToTextProvider, SpeechToTextRequest } from '../types.js';

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function baseUrl() {
  return trimTrailingSlash(process.env.CLOUDFLARE_BASE_URL || 'https://api.cloudflare.com/client/v4');
}

function accountId() {
  return process.env.CLOUDFLARE_ACCOUNT_ID || '';
}

function apiToken() {
  return process.env.CLOUDFLARE_API_TOKEN || '';
}

function modelName() {
  return process.env.CLOUDFLARE_STT_MODEL || process.env.AI_STT_MODEL || '@cf/openai/whisper';
}

async function postJson(url: string, body: unknown, timeoutMs: number) {
  const token = apiToken();
  if (!token) throw new Error('CLOUDFLARE_API_TOKEN_MISSING');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`CLOUDFLARE_STT_HTTP_${response.status}: ${text.slice(0, 300)}`);
    }
    if (!contentType.includes('application/json')) {
      throw new Error('CLOUDFLARE_STT_NON_JSON_RESPONSE');
    }
    return JSON.parse(text) as Record<string, unknown>;
  } finally {
    clearTimeout(timer);
  }
}

function textFromCloudflareResponse(data: Record<string, unknown>) {
  if (typeof data.text === 'string') return data.text;
  const result = data.result && typeof data.result === 'object' ? data.result as Record<string, unknown> : {};
  return typeof result.text === 'string' ? result.text : '';
}

export class CloudflareSpeechToTextProvider implements SpeechToTextProvider {
  async transcribe(request: SpeechToTextRequest) {
    const id = accountId();
    if (!id) throw new Error('CLOUDFLARE_ACCOUNT_ID_MISSING');
    const audio = Array.from(new Uint8Array(request.audio));
    const data = await postJson(`${baseUrl()}/accounts/${id}/ai/run/${modelName()}`, {
      audio,
    }, request.timeoutMs);
    const text = textFromCloudflareResponse(data).trim();
    if (!text) throw new Error('CLOUDFLARE_STT_EMPTY_RESPONSE');
    return text;
  }
}
