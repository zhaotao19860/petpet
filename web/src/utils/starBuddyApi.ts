import type { StarBuddyMode, StarBuddyResponse } from '../models/starBuddy';
import { apiRequest } from './apiClient';

export async function requestStarBuddy(mode: StarBuddyMode, petId: string, message?: string) {
  const data = await apiRequest<{ response: StarBuddyResponse }>(`/api/ai/star-buddy/${mode}`, {
    method: 'POST',
    body: JSON.stringify({ petId, message }),
  });
  return data.response;
}

export async function requestStarBuddySpeech(text: string, mode: Extract<StarBuddyMode, 'chat' | 'story' | 'quiz'>) {
  const response = await fetch('/api/ai/text-to-speech', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, mode }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(typeof data.error === 'string' ? data.error : 'TTS_ERROR');
  }
  return {
    blob: await response.blob(),
    provider: response.headers.get('x-petpet-tts-provider') || 'tts',
    voice: response.headers.get('x-petpet-tts-voice') || '',
    cache: response.headers.get('x-petpet-tts-cache') || '',
  };
}
