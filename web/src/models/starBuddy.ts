import type { CareAction } from './interaction';

export type StarBuddyMode = 'chat' | 'care-plan' | 'story' | 'quiz';
export type StarBuddyEmotion = 'encourage' | 'celebrate' | 'gentle' | 'curious' | 'thinking' | 'sleepy';

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
