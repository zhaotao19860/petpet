import { createHash } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EdgeTTS } from 'node-edge-tts';
import type { TextToSpeechMode, TextToSpeechProvider, TextToSpeechRequest, TextToSpeechResult } from '../types.js';

export interface TextToSpeechCacheEntry extends TextToSpeechResult {
  createdAt: number;
}

export const maxTextLength = 1800;
const maxCacheEntries = Number(process.env.TTS_CACHE_MAX_ENTRIES || 80);
const storyVoice = process.env.TTS_STORY_VOICE || 'zh-CN-XiaoxiaoNeural';
const chatVoice = process.env.TTS_CHAT_VOICE || 'zh-CN-XiaoxiaoNeural';
const quizVoice = process.env.TTS_QUIZ_VOICE || 'zh-CN-XiaoyouNeural';
const oneApiVoice = process.env.TTS_ONEAPI_VOICE || 'nova';
const edgeOutputFormat = process.env.TTS_EDGE_OUTPUT_FORMAT || 'audio-24khz-96kbitrate-mono-mp3';

export const ttsCache = new Map<string, TextToSpeechCacheEntry>();

function normalizeText(text: string) {
  return text
    .replace(/\r/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[•★☆✦✧✨🌟⭐🎉🎈🐾]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim()
    .slice(0, maxTextLength);
}

function voiceForMode(mode: TextToSpeechMode, requestedVoice?: string) {
  if (requestedVoice) return requestedVoice;
  if (mode === 'story') return storyVoice;
  if (mode === 'quiz') return quizVoice;
  return chatVoice;
}

function speechStyleForMode(mode: TextToSpeechMode) {
  if (mode === 'story') {
    return { rate: '-12%', pitch: '+2Hz' };
  }
  if (mode === 'quiz') {
    return { rate: '-4%', pitch: '+8Hz' };
  }
  return { rate: '-6%', pitch: '+5Hz' };
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function oneApiBaseUrl() {
  return trimTrailingSlash(process.env.TTS_BASE_URL || process.env.AI_BASE_URL || 'https://oneapi-comate.baidu-int.com');
}

function oneApiToken() {
  return process.env.TTS_API_KEY || process.env.ONEAPI_TOKEN || process.env.AI_API_KEY || '';
}

export function cacheKeyForTextToSpeech(request: TextToSpeechRequest) {
  const normalized = normalizeText(request.text);
  const voice = voiceForMode(request.mode, request.voice);
  return createHash('sha256')
    .update(JSON.stringify({ mode: request.mode, text: normalized, voice }))
    .digest('hex');
}

function remember(cacheKey: string, result: TextToSpeechResult) {
  if (ttsCache.size >= maxCacheEntries) {
    const oldestKey = ttsCache.keys().next().value as string | undefined;
    if (oldestKey) ttsCache.delete(oldestKey);
  }
  ttsCache.set(cacheKey, { ...result, createdAt: Date.now() });
}

export class MockTextToSpeechProvider implements TextToSpeechProvider {
  async synthesize(request: TextToSpeechRequest): Promise<TextToSpeechResult> {
    const text = normalizeText(request.text);
    if (!text) throw new Error('TTS_TEXT_EMPTY');
    const marker = Buffer.from(`ID3petpet-mock-tts:${request.mode}:${text}`);
    return {
      audio: new Uint8Array(marker),
      mimeType: 'audio/mpeg',
      provider: 'mock',
      voice: voiceForMode(request.mode, request.voice),
    };
  }
}

export class EdgeTextToSpeechProvider implements TextToSpeechProvider {
  async synthesize(request: TextToSpeechRequest): Promise<TextToSpeechResult> {
    const text = normalizeText(request.text);
    if (!text) throw new Error('TTS_TEXT_EMPTY');
    const voice = voiceForMode(request.mode, request.voice);
    const tempDir = await mkdtemp(join(tmpdir(), 'petpet-tts-'));
    const outputPath = join(tempDir, `${randomUUID()}.mp3`);
    try {
      const tts = new EdgeTTS({
        voice,
        lang: 'zh-CN',
        outputFormat: edgeOutputFormat,
        timeout: request.timeoutMs,
      });
      await tts.ttsPromise(text, outputPath);
      const audio = await readFile(outputPath);
      return {
        audio: new Uint8Array(audio),
        mimeType: 'audio/mpeg',
        provider: 'edge',
        voice,
      };
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }
}

export class OneApiTextToSpeechProvider implements TextToSpeechProvider {
  async synthesize(request: TextToSpeechRequest): Promise<TextToSpeechResult> {
    const text = normalizeText(request.text);
    if (!text) throw new Error('TTS_TEXT_EMPTY');
    const apiToken = oneApiToken();
    if (!apiToken) throw new Error('TTS_ONEAPI_TOKEN_MISSING');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), request.timeoutMs);
    try {
      const response = await fetch(`${oneApiBaseUrl()}/v1/audio/speech`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.TTS_MODEL || 'tts-1',
          voice: request.voice || oneApiVoice,
          input: text,
          response_format: 'mp3',
        }),
        signal: controller.signal,
      });
      const contentType = response.headers.get('content-type') || 'audio/mpeg';
      const audio = new Uint8Array(await response.arrayBuffer());
      if (!response.ok) {
        const message = Buffer.from(audio).toString('utf8').slice(0, 300);
        throw new Error(`TTS_ONEAPI_HTTP_${response.status}: ${message}`);
      }
      if (!audio.byteLength) throw new Error('TTS_ONEAPI_EMPTY_AUDIO');
      return {
        audio,
        mimeType: contentType.includes('audio/') ? contentType : 'audio/mpeg',
        provider: 'oneapi',
        voice: request.voice || oneApiVoice,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

export function createTextToSpeechProvider(): TextToSpeechProvider {
  const provider = (process.env.TTS_PROVIDER || 'edge').toLowerCase();
  if (provider === 'mock') return new MockTextToSpeechProvider();
  if (provider === 'oneapi' || provider === 'openai-compatible' || provider === 'openai') return new OneApiTextToSpeechProvider();
  if (provider === 'edge' || provider === 'edge-tts') return new EdgeTextToSpeechProvider();
  return new EdgeTextToSpeechProvider();
}

export async function synthesizeTextToSpeech(request: TextToSpeechRequest, provider = createTextToSpeechProvider()) {
  const cacheKey = cacheKeyForTextToSpeech(request);
  const cached = ttsCache.get(cacheKey);
  if (cached) {
    return { result: cached, cacheStatus: 'hit' as const };
  }
  let result: TextToSpeechResult;
  try {
    result = await provider.synthesize({ ...request, text: normalizeText(request.text) });
  } catch (error) {
    if (provider instanceof OneApiTextToSpeechProvider && process.env.TTS_DISABLE_EDGE_FALLBACK !== 'true') {
      console.warn('[tts] oneapi failed, trying edge fallback', error instanceof Error ? error.message : String(error));
      result = await new EdgeTextToSpeechProvider().synthesize({ ...request, text: normalizeText(request.text) });
    } else {
      throw error;
    }
  }
  remember(cacheKey, result);
  return { result, cacheStatus: 'miss' as const };
}
