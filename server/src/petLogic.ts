import type { CareAction, PetMood, StoredPet } from './auth.js';

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function resolveMood(pet: Pick<StoredPet, 'hunger' | 'thirst' | 'energy' | 'happiness' | 'health' | 'stress' | 'isSick'>): PetMood {
  if (pet.isSick || pet.health < 0.35) return 'sick';
  if (pet.hunger < 0.3 || pet.thirst < 0.3) return 'hungry';
  if (pet.energy < 0.28) return 'tired';
  if (pet.happiness < 0.38 || pet.stress > 0.68) return 'upset';
  if (pet.happiness > 0.78 && pet.stress < 0.35) return 'happy';
  return 'calm';
}

export function createPetState(userId: string, animalTypeId: string, name: string): Omit<StoredPet, 'id' | 'createdAt' | 'updatedAt'> {
  const now = new Date().toISOString();
  const pet = {
    userId,
    animalTypeId,
    name: name.trim() || '我的动物伙伴',
    birthday: now,
    lastUpdatedAt: now,
    speedMultiplier: 1,
    mood: 'happy' as PetMood,
    hunger: 0.82,
    thirst: 0.84,
    energy: 0.86,
    happiness: 0.9,
    health: 1,
    hygiene: 0.88,
    stress: 0.12,
    isSick: false,
    outfitIds: [],
    friendIds: [],
  };
  return { ...pet, mood: resolveMood(pet) };
}

export function applyCare(pet: StoredPet, action: CareAction): { pet: StoredPet; achievementId?: string; message: string } {
  const next = { ...pet, lastUpdatedAt: new Date().toISOString() };
  let achievementId: string | undefined;
  let message = '完成一次温柔照顾。';

  if (action === 'feed') {
    next.hunger = clamp01(next.hunger + 0.28);
    next.happiness = clamp01(next.happiness + 0.04);
    achievementId = 'first_feed';
    message = '完成科学喂食。';
  } else if (action === 'water') {
    next.thirst = clamp01(next.thirst + 0.3);
    message = '补充了干净水源。';
  } else if (action === 'rest') {
    next.energy = clamp01(next.energy + 0.34);
    next.stress = clamp01(next.stress - 0.14);
    message = '给动物伙伴留出了安静休息时间。';
  } else if (action === 'clean') {
    next.hygiene = clamp01(next.hygiene + 0.32);
    next.health = clamp01(next.health + 0.05);
    achievementId = 'clean_habitat';
    message = '栖息地变干净了。';
  } else if (action === 'play') {
    next.happiness = clamp01(next.happiness + 0.22);
    next.energy = clamp01(next.energy - 0.08);
    next.hunger = clamp01(next.hunger - 0.04);
    next.thirst = clamp01(next.thirst - 0.06);
    message = '完成了温和互动，玩球后有点口渴。';
  } else if (action === 'heal') {
    next.health = clamp01(next.health + 0.45);
    next.stress = clamp01(next.stress - 0.12);
    next.isSick = next.health < 0.3;
    achievementId = 'health_helper';
    message = '已联系兽医或救助站进行模拟救助。';
  } else if (action === 'observe') {
    next.happiness = clamp01(next.happiness + 0.08);
    next.stress = clamp01(next.stress - 0.08);
    achievementId = 'first_observe';
    message = '完成一次安静观察。';
  }

  return { pet: { ...next, mood: resolveMood(next) }, achievementId, message };
}

export function toPublicPet(pet: StoredPet) {
  const { userId: _userId, ...publicPet } = pet;
  return publicPet;
}
