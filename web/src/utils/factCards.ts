import type { AnimalType, GrowthStageDefinition } from '../models/animal';

export interface FactCard {
  id: string;
  icon: string;
  title: string;
  value: string;
}

function shortJoin(items: string[], fallback: string, limit = 3) {
  const text = items.filter(Boolean).slice(0, limit).join('、');
  return text || fallback;
}

export function buildFactCards(animal: AnimalType, stage: GrowthStageDefinition): FactCard[] {
  return [
    { id: 'habitat', icon: '🏞️', title: '住在哪里', value: shortJoin(animal.habitat, '安全栖息地') },
    { id: 'food', icon: '🥗', title: '适合了解', value: shortJoin(animal.safeFood.map((item) => item.name), '合适食物') },
    { id: 'avoid', icon: '🚫', title: '需要避免', value: shortJoin(animal.unsafeFood.map((item) => item.name), '不合适食物') },
    { id: 'rest', icon: '🌙', title: '休息节奏', value: animal.restPattern.dailyRestHours },
    { id: 'habit', icon: '🔎', title: '观察动作', value: shortJoin(animal.habits, animal.tagline, 1) },
    { id: 'growth', icon: '🌱', title: '今天阶段', value: `${stage.name}：${stage.observableFeatures[0] ?? '继续观察'}` },
    { id: 'safety', icon: '🛟', title: '安全提醒', value: animal.interactionRules.canFeedDirectly ? '大人同意后再接触' : '远远观察不打扰' },
  ];
}
