import type { SpeechToTextProvider, StarAiProvider } from '../types.js';
import { CodexCliStarAiProvider } from './codexCliProvider.js';
import { CloudflareSpeechToTextProvider } from './cloudflareProvider.js';
import { MockSpeechToTextProvider, MockStarAiProvider } from './mockProvider.js';
import { OneApiSpeechToTextProvider, OneApiStarAiProvider } from './oneApiProvider.js';

export function createStarAiProvider(): StarAiProvider {
  const provider = (process.env.AI_PROVIDER ?? 'mock').toLowerCase();
  if (provider === 'codex-cli') {
    return new CodexCliStarAiProvider();
  }
  if (provider === 'oneapi' || provider === 'openai-compatible') {
    return new OneApiStarAiProvider();
  }
  if (provider === 'mock') {
    return new MockStarAiProvider();
  }
  return new MockStarAiProvider();
}

export function createSpeechToTextProvider(): SpeechToTextProvider {
  const provider = (process.env.STT_PROVIDER || process.env.AI_PROVIDER || 'mock').toLowerCase();
  if (provider === 'cloudflare' || provider === 'workers-ai') {
    return new CloudflareSpeechToTextProvider();
  }
  if (provider === 'oneapi' || provider === 'openai-compatible') {
    return new OneApiSpeechToTextProvider();
  }
  return new MockSpeechToTextProvider();
}
