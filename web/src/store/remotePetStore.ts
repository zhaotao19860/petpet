import { useCallback, useEffect, useMemo, useState } from 'react';
import { animals, getAnimalById } from '../data/animals';
import type { CareAction } from '../models/interaction';
import type { Achievement, PetInstance, PetUserProfile } from '../models/pet';
import { ensureDailyQuestProgress, type DailyQuestProgress, type DailyQuestStepId } from '../utils/dailyTasks';
import { apiRequest } from '../utils/apiClient';

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

export interface RemoteUser {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
}

interface MeResponse {
  user: RemoteUser;
  pets: Array<Omit<PetInstance, 'userId'> & { userId?: string }>;
  achievements: Array<{ achievementId: string; unlockedAt?: string }>;
  dailyQuests: Array<{ petId?: string; date?: string; dateKey?: string; steps?: DailyQuestProgress['steps']; stepsJson?: DailyQuestProgress['steps']; stars?: number }>;
}

interface RemoteState {
  user?: RemoteUser;
  pets: PetInstance[];
  activePetId?: string;
  selectedAnimalId?: string;
  pendingAdoption?: { animalTypeId: string; name: string };
  achievements: Achievement[];
  dailyQuests: Record<string, DailyQuestProgress>;
}

function freshAchievements(saved: Array<{ achievementId: string; unlockedAt?: string }> = []) {
  return defaultAchievements.map((item) => {
    const savedItem = saved.find((achievement) => achievement.achievementId === item.id);
    return savedItem ? { ...item, unlockedAt: savedItem.unlockedAt } : item;
  });
}

function mapMe(data: MeResponse, currentActivePetId?: string): RemoteState {
  const pets = data.pets.map((pet) => ({ ...pet, userId: pet.userId ?? data.user.id })) as PetInstance[];
  const firstPetId = pets[0]?.id;
  const activePetId = pets.some((pet) => pet.id === currentActivePetId) ? currentActivePetId : firstPetId;
  const dailyQuests: Record<string, DailyQuestProgress> = {};
  for (const quest of data.dailyQuests ?? []) {
    if (quest.petId) {
      dailyQuests[quest.petId] = ensureDailyQuestProgress({
        date: quest.date ?? quest.dateKey ?? new Date().toISOString().slice(0, 10),
        stars: quest.stars ?? 0,
        steps: quest.steps ?? quest.stepsJson ?? {},
      } as DailyQuestProgress);
    }
  }
  return {
    user: data.user,
    pets,
    activePetId,
    selectedAnimalId: pets.find((pet) => pet.id === activePetId)?.animalTypeId ?? pets[0]?.animalTypeId,
    achievements: freshAchievements(data.achievements),
    dailyQuests,
  };
}

export function useRemotePetStore() {
  const [state, setState] = useState<RemoteState>({ pets: [], achievements: freshAchievements(), dailyQuests: {} });
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string>();
  const [lastMessage, setLastMessage] = useState('欢迎来到 petpet宠宠星球。');

  const refresh = useCallback(async () => {
    try {
      const data = await apiRequest<MeResponse>('/api/me');
      setState((current) => ({ ...mapMe(data, current.activePetId), pendingAdoption: current.pendingAdoption }));
      setAuthError(undefined);
    } catch {
      setState({ pets: [], achievements: freshAchievements(), dailyQuests: {} });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    try {
      const data = await apiRequest<MeResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      setState(mapMe(data));
      setAuthError(undefined);
      setLoading(false);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : '登录失败');
      setLoading(false);
    }
  }, [refresh]);

  const register = useCallback(async (username: string, password: string, displayName: string) => {
    setLoading(true);
    try {
      await apiRequest('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, password, displayName }) });
      const data = await apiRequest<MeResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      setState(mapMe(data));
      setAuthError(undefined);
      setLoading(false);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : '注册失败');
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setState({ pets: [], achievements: freshAchievements(), dailyQuests: {} });
    setAuthError(undefined);
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      setAuthError('已在本机退出，网络恢复后会自动重新确认登录状态。');
    }
  }, []);

  const selectPet = useCallback(async (petId: string) => {
    await apiRequest(`/api/pets/${petId}/select`, { method: 'POST' });
    setState((current) => ({ ...current, activePetId: petId, selectedAnimalId: current.pets.find((pet) => pet.id === petId)?.animalTypeId }));
  }, []);

  const startPendingAdoption = useCallback((animalTypeId: string, name: string) => {
    setState((current) => ({ ...current, selectedAnimalId: animalTypeId, pendingAdoption: { animalTypeId, name } }));
    setLastMessage('先完成入门挑战，再迎接新的动物伙伴。');
  }, []);

  const completePendingAdoption = useCallback(async () => {
    if (!state.pendingAdoption) return undefined;
    const data = await apiRequest<{ pet: PetInstance }>('/api/pets/adoptions/complete', {
      method: 'POST',
      body: JSON.stringify(state.pendingAdoption),
    });
    await refresh();
    setLastMessage('新的动物伙伴已经来到星球。');
    return data.pet;
  }, [refresh, state.pendingAdoption]);

  const cancelPendingAdoption = useCallback(() => {
    setState((current) => ({ ...current, pendingAdoption: undefined }));
    setLastMessage('已回到动物选择。');
  }, []);

  const adoptPet = useCallback((animalTypeId: string, name: string) => {
    startPendingAdoption(animalTypeId, name);
  }, [startPendingAdoption]);

  const doCare = useCallback(async (action: CareAction, petId?: string) => {
    const targetPetId = petId ?? state.activePetId;
    if (!targetPetId) return;
    const data = await apiRequest<{ pet: PetInstance; message: string }>(`/api/pets/${targetPetId}/care`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
    setState((current) => ({
      ...current,
      pets: current.pets.map((pet) => pet.id === data.pet.id ? data.pet : pet),
    }));
    setLastMessage(data.message);
    await refresh();
  }, [refresh, state.activePetId]);

  const markDailyQuest = useCallback(async (stepId: DailyQuestStepId) => {
    if (!state.activePetId) return;
    await apiRequest(`/api/daily-quests/${state.activePetId}/${stepId}`, { method: 'POST' });
    await refresh();
  }, [refresh, state.activePetId]);

  const unlock = useCallback(async (achievementId?: string) => {
    if (!achievementId) return;
    await apiRequest(`/api/achievements/${achievementId}/unlock`, { method: 'POST' });
    await refresh();
  }, [refresh]);

  const activePet = useMemo(() => state.pets.find((pet) => pet.id === state.activePetId), [state.activePetId, state.pets]);
  const activeAnimal = useMemo(() => activePet ? getAnimalById(activePet.animalTypeId) : undefined, [activePet]);
  const selectedAnimal = useMemo(() => animals.find((animal) => animal.id === state.selectedAnimalId), [state.selectedAnimalId]);
  const pendingAnimal = useMemo(() => state.pendingAdoption ? getAnimalById(state.pendingAdoption.animalTypeId) : undefined, [state.pendingAdoption]);
  const activeDailyQuest = activePet ? ensureDailyQuestProgress(state.dailyQuests[activePet.id]) : undefined;
  const activeUser: PetUserProfile | undefined = state.user ? {
    id: state.user.id,
    name: state.user.displayName,
    petIds: state.pets.map((pet) => pet.id),
    achievements: state.achievements,
    createdAt: state.user.createdAt,
  } : undefined;

  return {
    state,
    activeUser,
    activePet,
    activeAnimal,
    activeDailyQuest,
    selectedAnimal,
    pendingAnimal,
    achievements: state.achievements,
    lastMessage,
    loading,
    authError,
    isAuthenticated: Boolean(state.user),
    login,
    register,
    logout,
    refresh,
    selectPet,
    startPendingAdoption,
    completePendingAdoption,
    cancelPendingAdoption,
    adoptPet,
    doCare,
    markDailyQuest,
    unlock,
  };
}
