import type { AgeImage, AnimalType, GrowthStageDefinition } from './animal';

export const TOTAL_GROWTH_DAYS = 30;
export const TOTAL_GROWTH_STAGES = 30;
export const speedOptions = [1, 5, 10, 50] as const;

export function getEffectiveAgeDays(birthday: string, speedMultiplier: number): number {
  const bornAt = new Date(birthday).getTime();
  if (Number.isNaN(bornAt)) {
    return 0;
  }
  const realElapsedMs = Date.now() - bornAt;
  return Math.max(0, (realElapsedMs / 86_400_000) * speedMultiplier);
}

export function getCurrentGrowthStage(animal: AnimalType, birthday: string, speedMultiplier: number): GrowthStageDefinition {
  const ageDays = getEffectiveAgeDays(birthday, speedMultiplier);
  let elapsed = 0;
  for (const stage of animal.growthStages) {
    elapsed += stage.realDurationDays;
    if (ageDays < elapsed) {
      return stage;
    }
  }
  return animal.growthStages[animal.growthStages.length - 1];
}

export function getGrowthProgress(animal: AnimalType, birthday: string, speedMultiplier: number): number {
  const totalDays = animal.growthStages.reduce((sum, stage) => sum + stage.realDurationDays, 0);
  if (totalDays <= 0) {
    return 1;
  }
  return Math.min(1, getEffectiveAgeDays(birthday, speedMultiplier) / totalDays);
}

export function getAgeImage(animal: AnimalType, effectiveAgeDays: number): AgeImage {
  const stageNumber = Math.min(TOTAL_GROWTH_STAGES, Math.max(1, Math.floor(effectiveAgeDays) + 1));
  return animal.media.ageImages.find((item) => item.age === stageNumber) ?? animal.media.ageImages[0];
}
