export type CareAction = 'feed' | 'water' | 'rest' | 'clean' | 'play' | 'heal' | 'observe';

export interface CareResult {
  message: string;
  achievementId?: string;
}

export interface FriendlyBattleResult {
  title: string;
  description: string;
  scoreA: number;
  scoreB: number;
}

export type LearnTab = 'habits' | 'food' | 'rest' | 'growth' | 'health' | 'safety';
