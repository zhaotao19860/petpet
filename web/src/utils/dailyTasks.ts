export type DailyQuestStepId = 'care' | 'learn' | 'play' | 'reward';

export interface DailyQuestStep {
  id: DailyQuestStepId;
  label: string;
  icon: string;
  done: boolean;
  completedAt?: string;
}

export interface DailyQuestProgress {
  date: string;
  steps: Record<DailyQuestStepId, DailyQuestStep>;
  stars: number;
}

export const dailyQuestStepOrder: DailyQuestStepId[] = ['care', 'learn', 'play', 'reward'];

const stepMeta: Record<DailyQuestStepId, Pick<DailyQuestStep, 'label' | 'icon'>> = {
  care: { label: '照顾动物', icon: '🫶' },
  learn: { label: '发现知识', icon: '📘' },
  play: { label: '完成游戏', icon: '🎮' },
  reward: { label: '领取贴纸', icon: '⭐' },
};

export function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createDailyQuestProgress(date = todayKey()): DailyQuestProgress {
  return {
    date,
    stars: 0,
    steps: dailyQuestStepOrder.reduce((steps, id) => ({
      ...steps,
      [id]: { id, ...stepMeta[id], done: false },
    }), {} as Record<DailyQuestStepId, DailyQuestStep>),
  };
}

export function ensureDailyQuestProgress(progress: DailyQuestProgress | undefined, date = todayKey()) {
  if (!progress || progress.date !== date) return createDailyQuestProgress(date);

  return {
    date: progress.date,
    stars: progress.stars ?? 0,
    steps: dailyQuestStepOrder.reduce((steps, id) => ({
      ...steps,
      [id]: progress.steps?.[id] ?? { id, ...stepMeta[id], done: false },
    }), {} as Record<DailyQuestStepId, DailyQuestStep>),
  };
}

export function markDailyQuestStep(progress: DailyQuestProgress | undefined, stepId: DailyQuestStepId, date = todayKey()) {
  const current = ensureDailyQuestProgress(progress, date);
  const existing = current.steps[stepId];
  if (existing.done) return current;

  const steps = {
    ...current.steps,
    [stepId]: {
      ...existing,
      done: true,
      completedAt: new Date().toISOString(),
    },
  };
  const completedCount = dailyQuestStepOrder.filter((id) => steps[id].done).length;
  return {
    ...current,
    steps,
    stars: Math.max(current.stars, completedCount),
  };
}

export function getDailyQuestSummary(progress: DailyQuestProgress | undefined, date = todayKey()) {
  const current = ensureDailyQuestProgress(progress, date);
  const completedCount = dailyQuestStepOrder.filter((id) => current.steps[id].done).length;
  return {
    completedCount,
    totalCount: dailyQuestStepOrder.length,
    complete: completedCount === dailyQuestStepOrder.length,
    nextStep: dailyQuestStepOrder.find((id) => !current.steps[id].done),
  };
}
