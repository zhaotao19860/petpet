import type { CareAction, StoredPet } from '../auth.js';

export type StarBuddyMode = 'chat' | 'care-plan' | 'story' | 'quiz';
export type StarBuddyEmotion = 'encourage' | 'celebrate' | 'gentle' | 'curious' | 'thinking' | 'sleepy';

export interface StarBuddyAnimalContext {
  id: string;
  name: string;
  category: string;
  summary: string;
  habitat: string[];
  habits: string[];
  safeFood: string[];
  unsafeFood: string[];
  rest: string;
  safetyNote: string;
}

export interface StarBuddyCarePlanResponse {
  kind: 'care-plan';
  message: string;
  suggestedActions: CareAction[];
  emotion: StarBuddyEmotion;
}

export interface StarBuddyChatResponse {
  kind: 'chat';
  message: string;
  quickPrompts: string[];
  emotion: StarBuddyEmotion;
}

export interface StarBuddyStoryResponse {
  kind: 'story';
  title: string;
  paragraphs: string[];
  choices: Array<{ label: string; prompt: string }>;
  emotion: StarBuddyEmotion;
}

export interface StarBuddyQuizResponse {
  kind: 'quiz';
  question: string;
  options: string[];
  correctIndex: number;
  hint: string;
  emotion: StarBuddyEmotion;
}

export type StarBuddyResponse =
  | StarBuddyCarePlanResponse
  | StarBuddyChatResponse
  | StarBuddyStoryResponse
  | StarBuddyQuizResponse;

export interface StarAiProviderRequest {
  mode: StarBuddyMode;
  system: string;
  user: string;
  timeoutMs: number;
  outputSize?: 'normal' | 'long';
}

export interface StarAiProvider {
  complete(request: StarAiProviderRequest): Promise<string>;
}

export interface SpeechToTextRequest {
  audio: Uint8Array;
  filename: string;
  mimeType: string;
  timeoutMs: number;
}

export interface SpeechToTextProvider {
  transcribe(request: SpeechToTextRequest): Promise<string>;
}

export type TextToSpeechMode = 'chat' | 'story' | 'quiz';

export interface TextToSpeechRequest {
  text: string;
  mode: TextToSpeechMode;
  voice?: string;
  timeoutMs: number;
}

export interface TextToSpeechResult {
  audio: Uint8Array;
  mimeType: string;
  provider: string;
  voice: string;
}

export interface TextToSpeechProvider {
  synthesize(request: TextToSpeechRequest): Promise<TextToSpeechResult>;
}
