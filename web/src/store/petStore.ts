import { useCallback, useEffect, useMemo, useState } from 'react';
import { animals, getAnimalById } from '../data/animals';
import type { CareAction, CareResult } from '../models/interaction';
import type { Achievement, PetInstance, PetMood, PetUserProfile } from '../models/pet';
import { ensureDailyQuestProgress, markDailyQuestStep, todayKey, type DailyQuestProgress, type DailyQuestStepId } from '../utils/dailyTasks';

const STORAGE_KEY = 'petpet-planet.state.v2';
const LEGACY_STORAGE_KEY = 'petpet-planet.state.v1';
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export interface PendingAdoption {
  animalTypeId: string;
  name: string;
}

export interface PetPlanetState {
  users: PetUserProfile[];
  pets: PetInstance[];
  activeUserId?: string;
  activePetId?: string;
  selectedAnimalId?: string;
  pendingAdoption?: PendingAdoption;
  dailyQuests?: Record<string, DailyQuestProgress>;
}

interface LegacyPetPlanetState {
  pet?: Omit<PetInstance, 'userId' | 'mood'> & Partial<Pick<PetInstance, 'userId' | 'mood'>>;
  achievements?: Achievement[];
  selectedAnimalId?: string;
}

const defaultAchievements: Achievement[] = [
  { id: 'first_adopt', title: '星球新朋友', description: '第一次选择动物伙伴' },
  { id: 'first_feed', title: '科学喂食', description: '完成第一次合适的喂食或觅食观察' },
  { id: 'first_observe', title: '观察员出发', description: '完成第一次真实观察' },
  { id: 'clean_habitat', title: '栖息地守护者', description: '完成一次环境清洁' },
  { id: 'health_helper', title: '健康小助手', description: '帮助生病伙伴恢复健康' },
  { id: 'friend_visit', title: '好朋友来访', description: '完成一次好友互动' },
  { id: 'quiz_streak', title: '知识连击', description: '在知识挑战中连续答对题目' },
  { id: 'story_reader', title: '故事观察员', description: '完成一次故事科普阅读和绘图任务' },
  { id: 'sound_safari', title: '声音探险家', description: '完成一次听声识动物游戏' },
  { id: 'food_helper', title: '食物小帮手', description: '完成一次安全食物分类' },
  { id: 'habitat_finder', title: '栖息地发现家', description: '完成一次栖息地配对' },
  { id: 'memory_master', title: '记忆翻牌星', description: '完成一次动物记忆翻牌' },
  { id: 'daily_explorer', title: '今日星球探险家', description: '完成一轮今日任务' },
];

function freshAchievements(saved?: Achievement[]) {
  return defaultAchievements.map((item) => saved?.find((savedItem) => savedItem.id === item.id) ?? item);
}

function createUser(name: string): PetUserProfile {
  return {
    id: crypto.randomUUID(),
    name: name.trim() || '星球观察员',
    petIds: [],
    achievements: freshAchievements(),
    createdAt: new Date().toISOString(),
  };
}

function resolveMood(pet: Pick<PetInstance, 'hunger' | 'thirst' | 'energy' | 'happiness' | 'health' | 'stress' | 'isSick'>): PetMood {
  if (pet.isSick || pet.health < 0.35) return 'sick';
  if (pet.hunger < 0.3 || pet.thirst < 0.3) return 'hungry';
  if (pet.energy < 0.28) return 'tired';
  if (pet.happiness < 0.38 || pet.stress > 0.68) return 'upset';
  if (pet.happiness > 0.78 && pet.stress < 0.35) return 'happy';
  return 'calm';
}

function createPet(userId: string, animalTypeId: string, name: string): PetInstance {
  const now = new Date().toISOString();
  const pet: PetInstance = {
    id: crypto.randomUUID(),
    userId,
    animalTypeId,
    name: name.trim() || '我的动物伙伴',
    birthday: now,
    lastUpdatedAt: now,
    speedMultiplier: 1,
    mood: 'happy',
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

function ensureState(state: PetPlanetState): PetPlanetState {
  const users = state.users.length > 0 ? state.users : [createUser('星球观察员')];
  const pets = state.pets.map((pet) => ({ ...pet, mood: resolveMood(pet) }));
  const activeUserId = users.some((user) => user.id === state.activeUserId) ? state.activeUserId : users[0]?.id;
  const activeUser = users.find((user) => user.id === activeUserId);
  const activePetId = pets.some((pet) => pet.id === state.activePetId && pet.userId === activeUserId)
    ? state.activePetId
    : activeUser?.petIds.find((petId) => pets.some((pet) => pet.id === petId));

  return {
    ...state,
    users: users.map((user) => ({ ...user, achievements: freshAchievements(user.achievements), petIds: user.petIds.filter((petId) => pets.some((pet) => pet.id === petId && pet.userId === user.id)) })),
    pets,
    activeUserId,
    activePetId,
    dailyQuests: state.dailyQuests ?? {},
  };
}

function migrateLegacyState(legacy: LegacyPetPlanetState): PetPlanetState {
  const user = createUser('星球观察员');
  user.achievements = freshAchievements(legacy.achievements);
  const pets: PetInstance[] = [];
  if (legacy.pet) {
    const pet = {
      ...legacy.pet,
      userId: user.id,
      mood: resolveMood({ ...legacy.pet, mood: legacy.pet.mood ?? 'calm' } as PetInstance),
    } as PetInstance;
    pets.push(pet);
    user.petIds = [pet.id];
  }
  return ensureState({
    users: [user],
    pets,
    activeUserId: user.id,
    activePetId: pets[0]?.id,
    selectedAnimalId: legacy.selectedAnimalId ?? pets[0]?.animalTypeId,
  });
}

function loadState(): PetPlanetState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return ensureState(JSON.parse(raw) as PetPlanetState);
    }

    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      return migrateLegacyState(JSON.parse(legacyRaw) as LegacyPetPlanetState);
    }
  } catch {
    // fall through to default state
  }

  const user = createUser('星球观察员');
  return ensureState({ users: [user], pets: [], activeUserId: user.id });
}

function decayPet(pet: PetInstance): PetInstance {
  const last = new Date(pet.lastUpdatedAt).getTime();
  const now = Date.now();
  const minutes = Math.max(0, (now - last) / 60_000) * pet.speedMultiplier;
  if (minutes < 0.2) {
    return { ...pet, mood: resolveMood(pet) };
  }

  const next = {
    ...pet,
    hunger: clamp01(pet.hunger - minutes * 0.002),
    thirst: clamp01(pet.thirst - minutes * 0.0025),
    energy: clamp01(pet.energy - minutes * 0.0015),
    happiness: clamp01(pet.happiness - minutes * 0.001),
    hygiene: clamp01(pet.hygiene - minutes * 0.0012),
    stress: clamp01(pet.stress + minutes * 0.0008),
    lastUpdatedAt: new Date().toISOString(),
  };
  const lowNeeds = [next.hunger, next.thirst, next.energy, next.hygiene].filter((value) => value < 0.25).length;
  next.health = clamp01(next.health - lowNeeds * minutes * 0.0015 + (lowNeeds === 0 ? minutes * 0.0004 : 0));
  next.isSick = next.health < 0.3;
  return { ...next, mood: resolveMood(next) };
}

function applyCare(pet: PetInstance, action: CareAction): [PetInstance, CareResult] {
  const animal = getAnimalById(pet.animalTypeId);
  const next = { ...pet, lastUpdatedAt: new Date().toISOString() };
  let result: CareResult;
  switch (action) {
    case 'feed':
      next.hunger = clamp01(next.hunger + 0.28);
      next.happiness = clamp01(next.happiness + 0.04);
      result = { message: animal?.interactionRules.canFeedDirectly ? '完成科学喂食。' : '完成一次觅食观察，没有直接投喂野生动物。', achievementId: 'first_feed' };
      break;
    case 'water':
      next.thirst = clamp01(next.thirst + 0.3);
      result = { message: '补充了干净水源。' };
      break;
    case 'rest':
      next.energy = clamp01(next.energy + 0.34);
      next.stress = clamp01(next.stress - 0.14);
      result = { message: '给动物伙伴留出了安静休息时间。' };
      break;
    case 'clean':
      next.hygiene = clamp01(next.hygiene + 0.32);
      next.health = clamp01(next.health + 0.05);
      result = { message: '栖息地变干净了。', achievementId: 'clean_habitat' };
      break;
    case 'play':
      next.happiness = clamp01(next.happiness + 0.22);
      next.energy = clamp01(next.energy - 0.08);
      next.hunger = clamp01(next.hunger - 0.04);
      next.thirst = clamp01(next.thirst - 0.06);
      result = { message: '完成了温和互动，玩球后有点口渴。' };
      break;
    case 'heal':
      next.health = clamp01(next.health + 0.45);
      next.stress = clamp01(next.stress - 0.12);
      next.isSick = next.health < 0.3;
      result = { message: '已联系兽医或救助站进行模拟救助。', achievementId: 'health_helper' };
      break;
    case 'observe':
      next.happiness = clamp01(next.happiness + 0.08);
      next.stress = clamp01(next.stress - 0.08);
      result = { message: '完成一次安静观察。', achievementId: 'first_observe' };
      break;
  }
  return [{ ...next, mood: resolveMood(next) }, result];
}

function updateActivePet(state: PetPlanetState, updater: (pet: PetInstance) => PetInstance): PetPlanetState {
  if (!state.activePetId) return state;
  return {
    ...state,
    pets: state.pets.map((pet) => (pet.id === state.activePetId ? updater(pet) : pet)),
  };
}

export function usePetPlanetStore() {
  const [state, setState] = useState<PetPlanetState>(() => loadState());
  const [lastMessage, setLastMessage] = useState('欢迎来到 petpet宠宠星球。');

  useEffect(() => {
    setState((current) => ensureState({ ...current, pets: current.pets.map(decayPet) }));
    const timer = window.setInterval(() => {
      setState((current) => ensureState({ ...current, pets: current.pets.map((pet) => (pet.id === current.activePetId ? decayPet(pet) : pet)) }));
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const activeUser = useMemo(() => state.users.find((user) => user.id === state.activeUserId), [state.activeUserId, state.users]);
  const activePet = useMemo(() => state.pets.find((pet) => pet.id === state.activePetId), [state.activePetId, state.pets]);
  const selectedAnimal = useMemo(() => animals.find((animal) => animal.id === state.selectedAnimalId), [state.selectedAnimalId]);
  const pendingAnimal = useMemo(() => state.pendingAdoption ? getAnimalById(state.pendingAdoption.animalTypeId) : undefined, [state.pendingAdoption]);
  const activeAnimal = useMemo(() => activePet ? getAnimalById(activePet.animalTypeId) : undefined, [activePet]);
  const achievements = activeUser?.achievements ?? freshAchievements();
  const activeDailyQuest = useMemo(() => {
    if (!activePet) return undefined;
    return ensureDailyQuestProgress(state.dailyQuests?.[activePet.id], todayKey());
  }, [activePet, state.dailyQuests]);

  const unlock = useCallback((achievementId?: string) => {
    if (!achievementId) return;
    setState((current) => ({
      ...current,
      users: current.users.map((user) => user.id === current.activeUserId ? {
        ...user,
        achievements: freshAchievements(user.achievements).map((item) => item.id === achievementId && !item.unlockedAt ? { ...item, unlockedAt: new Date().toISOString() } : item),
      } : user),
    }));
  }, []);

  const createLocalUser = useCallback((name: string) => {
    const user = createUser(name);
    setState((current) => ensureState({ ...current, users: [...current.users, user], activeUserId: user.id, activePetId: undefined }));
    setLastMessage(`欢迎 ${user.name} 来到星球。`);
  }, []);

  const selectUser = useCallback((userId: string) => {
    setState((current) => {
      const user = current.users.find((item) => item.id === userId);
      return ensureState({ ...current, activeUserId: userId, activePetId: user?.petIds[0] });
    });
    setLastMessage('已切换观察员。');
  }, []);

  const selectPet = useCallback((petId: string) => {
    setState((current) => ensureState({ ...current, activePetId: petId }));
    setLastMessage('已切换动物伙伴。');
  }, []);

  const selectAnimal = useCallback((animalTypeId: string) => {
    setState((current) => ({ ...current, selectedAnimalId: animalTypeId }));
  }, []);

  const startPendingAdoption = useCallback((animalTypeId: string, name: string) => {
    setState((current) => ({ ...current, selectedAnimalId: animalTypeId, pendingAdoption: { animalTypeId, name } }));
    setLastMessage('先完成入门挑战，再迎接新的动物伙伴。');
  }, []);

  const completePendingAdoption = useCallback(() => {
    let createdPet: PetInstance | undefined;
    setState((current) => {
      const activeUserId = current.activeUserId ?? current.users[0]?.id;
      if (!activeUserId || !current.pendingAdoption) return current;
      createdPet = createPet(activeUserId, current.pendingAdoption.animalTypeId, current.pendingAdoption.name);
      return ensureState({
        ...current,
        pets: [...current.pets, createdPet],
        users: current.users.map((user) => user.id === activeUserId ? { ...user, petIds: [...user.petIds, createdPet!.id] } : user),
        activeUserId,
        activePetId: createdPet.id,
        selectedAnimalId: createdPet.animalTypeId,
        pendingAdoption: undefined,
      });
    });
    unlock('first_adopt');
    setLastMessage('新的动物伙伴已经来到星球。');
    return createdPet;
  }, [unlock]);

  const cancelPendingAdoption = useCallback(() => {
    setState((current) => ({ ...current, pendingAdoption: undefined }));
    setLastMessage('已回到动物选择。');
  }, []);

  const adoptPet = useCallback((animalTypeId: string, name: string) => {
    startPendingAdoption(animalTypeId, name);
  }, [startPendingAdoption]);

  const doCare = useCallback((action: CareAction) => {
    const pet = state.activePetId ? state.pets.find((item) => item.id === state.activePetId) : undefined;
    if (!pet) return;
    const [nextPet, result] = applyCare(decayPet(pet), action);
    setState((current) => {
      if (!current.activePetId) return current;
      const withPet = updateActivePet(current, () => nextPet);
      return {
        ...withPet,
        dailyQuests: {
          ...(withPet.dailyQuests ?? {}),
          [current.activePetId]: markDailyQuestStep(withPet.dailyQuests?.[current.activePetId], 'care'),
        },
      };
    });
    unlock(result.achievementId);
    setLastMessage(result.message);
  }, [state.activePetId, state.pets, unlock]);

  const markDailyQuest = useCallback((stepId: DailyQuestStepId) => {
    let shouldUnlockDaily = false;
    setState((current) => {
      if (!current.activePetId) return current;
      const progress = markDailyQuestStep(current.dailyQuests?.[current.activePetId], stepId);
      shouldUnlockDaily = Object.values(progress.steps).every((step) => step.done);
      return {
        ...current,
        dailyQuests: {
          ...(current.dailyQuests ?? {}),
          [current.activePetId]: progress,
        },
      };
    });
    if (shouldUnlockDaily) unlock('daily_explorer');
  }, [unlock]);

  const setSpeedMultiplier = useCallback((speedMultiplier: number) => {
    setState((current) => updateActivePet(current, (pet) => ({ ...pet, speedMultiplier, lastUpdatedAt: new Date().toISOString(), mood: resolveMood(pet) })));
  }, []);

  const toggleOutfit = useCallback((outfitId: string) => {
    setState((current) => updateActivePet(current, (pet) => {
      const exists = pet.outfitIds.includes(outfitId);
      return {
        ...pet,
        outfitIds: exists ? pet.outfitIds.filter((id) => id !== outfitId) : [...pet.outfitIds, outfitId],
      };
    }));
  }, []);

  const resetPet = useCallback(() => {
    setState((current) => ensureState({ ...current, activePetId: undefined, pendingAdoption: undefined }));
    setLastMessage('已回到用户中心。');
  }, []);

  return {
    state,
    activeUser,
    activePet,
    activeAnimal,
    activeDailyQuest,
    selectedAnimal,
    pendingAnimal,
    achievements,
    lastMessage,
    createLocalUser,
    selectUser,
    selectPet,
    selectAnimal,
    startPendingAdoption,
    completePendingAdoption,
    cancelPendingAdoption,
    adoptPet,
    doCare,
    markDailyQuest,
    setSpeedMultiplier,
    toggleOutfit,
    resetPet,
    unlock,
  };
}
