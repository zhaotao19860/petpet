import type { AnimalType, GrowthStageDefinition } from '../models/animal';

const TARGET_COUNT = 100;
const MAX_LENGTH = 42;

function short(text: string) {
  const normalized = text.replace(/[。！？].*$/, '').trim();
  return normalized.length > MAX_LENGTH ? `${normalized.slice(0, MAX_LENGTH)}…` : normalized;
}

function pick(list: string[], index: number, fallback: string) {
  return list.length > 0 ? list[index % list.length] : fallback;
}

function uniquePush(list: string[], item: string) {
  const value = short(item);
  if (value && !list.includes(value)) {
    list.push(value);
  }
}

export function getStageHabitCandidates(animal: AnimalType, stage: GrowthStageDefinition): string[] {
  const candidates: string[] = [];
  const name = animal.name;
  const stageName = stage.name;
  const stageDay = Number(stage.id.replace('day_', '')) || 1;
  const habitats = animal.habitat.length > 0 ? animal.habitat : ['安全环境'];
  const habits = animal.habits.length > 0 ? animal.habits : ['安静观察'];
  const foods = animal.safeFood.map((item) => item.name);
  const features = stage.observableFeatures.length > 0 ? stage.observableFeatures : ['阶段特征逐渐明显'];
  const careFocus = stage.careFocus.length > 0 ? stage.careFocus : ['减少惊扰'];
  const rest = animal.restPattern.dailyRestHours || '需要规律休息';
  const summary = animal.childFriendlySummary;
  const safety = animal.interactionRules.safetyNote;
  const disease = animal.diseases[0]?.name ?? '健康异常';

  for (let index = 0; candidates.length < TARGET_COUNT && index < TARGET_COUNT * 4; index += 1) {
    const habitat = pick(habitats, index, '安全环境');
    const habit = pick(habits, index, '安静观察');
    const food = pick(foods, index, '合适食物');
    const feature = pick(features, index, '阶段特征逐渐明显');
    const focus = pick(careFocus, index, '减少惊扰');
    const nextHabit = pick(habits, index + 1, habit);
    const nextFeature = pick(features, index + 1, feature);
    const nextHabitat = pick(habitats, index + 1, habitat);
    const pattern = index % 20;

    const templates = [
      `第${stageDay}天${name}处于${stageName}，常表现出${feature}`,
      `第${stageDay}天${name}在${habitat}里更容易保持放松`,
      `第${stageDay}天${name}会通过${habit}适应周围环境`,
      `第${stageDay}天${name}的照护重点是${focus}`, 
      `第${stageDay}天${name}休息约${rest}，醒后活动更明显`,
      `第${stageDay}天${name}对${food}更熟悉，现实投喂需指导`,
      `第${stageDay}天${name}出现${nextFeature}，说明发育在推进`,
      `第${stageDay}天${name}常在${nextHabitat}附近寻找安全感`,
      `第${stageDay}天${name}会把${nextHabit}作为重要日常行为`,
      `第${stageDay}天${name}身体较敏感，观察时要保持距离`,
      `第${stageDay}天${name}的${feature}会随成长逐渐稳定`,
      `第${stageDay}天${name}在光线柔和时更容易安心活动`,
      `第${stageDay}天${name}听到突然声响可能躲避或停住`,
      `第${stageDay}天${name}熟悉气味后更愿意探索附近空间`,
      `第${stageDay}天${name}能通过姿态和活动节奏表达状态`,
      `第${stageDay}天${name}需要干净环境，降低${disease}风险`,
      `第${stageDay}天${name}适合观察${habit}，不要强行互动`,
      `第${stageDay}天${name}在${habitat}中会优先选择安全角落`,
      `第${stageDay}天${name}成长时要关注${focus}和精神状态`,
      `第${stageDay}天${name}处于${stageName}：${summary}`, 
    ];

    uniquePush(candidates, templates[pattern]);
  }

  for (let index = 0; candidates.length < TARGET_COUNT && index < TARGET_COUNT; index += 1) {
    const focus = pick(careFocus, index, '减少惊扰');
    const habitat = pick(habitats, index, '安全环境');
    const habit = pick(habits, index, '安静观察');
    const feature = pick(features, index, '阶段特征逐渐明显');
    const supplement = [
      `第${stageDay}天${name}观察点${index + 1}：在${habitat}里更安心`,
      `第${stageDay}天${name}观察点${index + 1}：${habit}常和安全感有关`,
      `第${stageDay}天${name}观察点${index + 1}：${feature}是阶段线索`,
      `第${stageDay}天${name}观察点${index + 1}：照护重点是${focus}`,
      `第${stageDay}天${name}观察点${index + 1}：${safety}`, 
    ];
    uniquePush(candidates, supplement[index % supplement.length]);
  }

  return candidates.slice(0, TARGET_COUNT);
}
