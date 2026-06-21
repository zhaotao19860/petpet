import argon2 from 'argon2';
import { randomUUID } from 'node:crypto';

export const sessionCookieName = 'petpet_session';

export interface StoredUser {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  selectedPetId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredSession {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

export type PetMood = 'happy' | 'calm' | 'hungry' | 'tired' | 'upset' | 'sick';
export type CareAction = 'feed' | 'water' | 'rest' | 'clean' | 'play' | 'heal' | 'observe';

export interface StoredPet {
  id: string;
  userId: string;
  animalTypeId: string;
  name: string;
  birthday: string;
  lastUpdatedAt: string;
  speedMultiplier: number;
  mood: PetMood;
  hunger: number;
  thirst: number;
  energy: number;
  happiness: number;
  health: number;
  hygiene: number;
  stress: number;
  isSick: boolean;
  outfitIds: string[];
  friendIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StoredAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt?: string;
  createdAt: string;
}

export interface StoredDailyQuest {
  id: string;
  userId: string;
  petId: string;
  dateKey: string;
  stepsJson: Record<string, { done: boolean; icon: string; label: string }>;
  stars: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoredFriendship {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: 'pending' | 'accepted';
  createdAt: string;
  updatedAt: string;
}

export interface StoredPetVisit {
  id: string;
  visitorId: string;
  ownerId: string;
  petId: string;
  createdAt: string;
}

export interface StoredPetInteraction {
  id: string;
  actorId: string;
  ownerId: string;
  petId: string;
  kind: string;
  dayKey: string;
  createdAt: string;
}

export interface StoredPetSoundClip {
  id: string;
  userId: string;
  petId: string;
  animalTypeId: string;
  soundType: string;
  label?: string;
  mimeType: string;
  filePath: string;
  fileSize: number;
  durationMs?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
}

export interface AppRepository {
  createUser(input: { username: string; passwordHash: string; displayName: string }): Promise<StoredUser>;
  findUserByUsername(username: string): Promise<StoredUser | undefined>;
  findUserById(userId: string): Promise<StoredUser | undefined>;
  createSession(userId: string): Promise<StoredSession>;
  findSession(sessionId: string): Promise<StoredSession | undefined>;
  deleteSession(sessionId: string): Promise<void>;
  createPet(input: Omit<StoredPet, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoredPet>;
  findPetById(petId: string): Promise<StoredPet | undefined>;
  listPetsByUser(userId: string): Promise<StoredPet[]>;
  updatePet(petId: string, updater: (pet: StoredPet) => StoredPet): Promise<StoredPet | undefined>;
  setSelectedPet(userId: string, petId: string | undefined): Promise<StoredUser | undefined>;
  unlockAchievement(userId: string, achievementId: string): Promise<StoredAchievement>;
  listAchievementsByUser(userId: string): Promise<StoredAchievement[]>;
  markDailyQuest(userId: string, petId: string, stepId: string): Promise<StoredDailyQuest>;
  listDailyQuestsByUser(userId: string): Promise<StoredDailyQuest[]>;
  searchUsersByUsername(username: string, currentUserId: string): Promise<StoredUser[]>;
  createFriendship(requesterId: string, addresseeId: string): Promise<StoredFriendship>;
  acceptFriendship(friendshipId: string, addresseeId: string): Promise<StoredFriendship | undefined>;
  listFriendships(userId: string): Promise<StoredFriendship[]>;
  areFriends(userAId: string, userBId: string): Promise<boolean>;
  createPetVisit(visitorId: string, ownerId: string, petId: string): Promise<StoredPetVisit>;
  createPetInteraction(actorId: string, ownerId: string, petId: string, kind: string, dayKey: string): Promise<StoredPetInteraction>;
  listPetSoundClips(userId: string, petId: string): Promise<StoredPetSoundClip[]>;
  findPetSoundClip(userId: string, petId: string, soundType: string): Promise<StoredPetSoundClip | undefined>;
  upsertPetSoundClip(input: Omit<StoredPetSoundClip, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoredPetSoundClip>;
  deletePetSoundClip(userId: string, petId: string, soundType: string): Promise<StoredPetSoundClip | undefined>;
}

export function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    createdAt: user.createdAt,
  };
}

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export async function hashPassword(password: string) {
  return argon2.hash(password);
}

export async function verifyPassword(hash: string, password: string) {
  return argon2.verify(hash, password);
}

export class MemoryRepository implements AppRepository {
  private users = new Map<string, StoredUser>();
  private userIdsByUsername = new Map<string, string>();
  private sessions = new Map<string, StoredSession>();
  private pets = new Map<string, StoredPet>();
  private achievements = new Map<string, StoredAchievement>();
  private dailyQuests = new Map<string, StoredDailyQuest>();
  private friendships = new Map<string, StoredFriendship>();
  private visits = new Map<string, StoredPetVisit>();
  private interactions = new Map<string, StoredPetInteraction>();
  private soundClips = new Map<string, StoredPetSoundClip>();

  async createUser(input: { username: string; passwordHash: string; displayName: string }) {
    const username = normalizeUsername(input.username);
    if (this.userIdsByUsername.has(username)) {
      throw new Error('USERNAME_TAKEN');
    }

    const now = new Date().toISOString();
    const user: StoredUser = {
      id: randomUUID(),
      username,
      displayName: input.displayName.trim() || username,
      passwordHash: input.passwordHash,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(user.id, user);
    this.userIdsByUsername.set(user.username, user.id);
    return user;
  }

  async findUserByUsername(username: string) {
    const userId = this.userIdsByUsername.get(normalizeUsername(username));
    return userId ? this.users.get(userId) : undefined;
  }

  async findUserById(userId: string) {
    return this.users.get(userId);
  }

  async createSession(userId: string) {
    const now = new Date();
    const session: StoredSession = {
      id: randomUUID(),
      userId,
      expiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      createdAt: now.toISOString(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async findSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      this.sessions.delete(sessionId);
      return undefined;
    }
    return session;
  }

  async deleteSession(sessionId: string) {
    this.sessions.delete(sessionId);
  }

  async createPet(input: Omit<StoredPet, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString();
    const pet: StoredPet = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.pets.set(pet.id, pet);
    return pet;
  }

  async findPetById(petId: string) {
    return this.pets.get(petId);
  }

  async listPetsByUser(userId: string) {
    return Array.from(this.pets.values()).filter((pet) => pet.userId === userId);
  }

  async updatePet(petId: string, updater: (pet: StoredPet) => StoredPet) {
    const current = this.pets.get(petId);
    if (!current) return undefined;
    const next = { ...updater(current), updatedAt: new Date().toISOString() };
    this.pets.set(petId, next);
    return next;
  }

  async setSelectedPet(userId: string, petId: string | undefined) {
    const user = this.users.get(userId);
    if (!user) return undefined;
    const next = { ...user, selectedPetId: petId, updatedAt: new Date().toISOString() };
    this.users.set(userId, next);
    return next;
  }

  async unlockAchievement(userId: string, achievementId: string) {
    const key = `${userId}:${achievementId}`;
    const existing = this.achievements.get(key);
    if (existing) return existing;
    const achievement: StoredAchievement = {
      id: randomUUID(),
      userId,
      achievementId,
      unlockedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    this.achievements.set(key, achievement);
    return achievement;
  }

  async listAchievementsByUser(userId: string) {
    return Array.from(this.achievements.values()).filter((achievement) => achievement.userId === userId);
  }

  async markDailyQuest(userId: string, petId: string, stepId: string) {
    const dateKey = new Date().toISOString().slice(0, 10);
    const key = `${petId}:${dateKey}`;
    const current = this.dailyQuests.get(key);
    const stepsJson = current?.stepsJson ?? {
      care: { done: false, icon: '🫶', label: '照顾动物' },
      learn: { done: false, icon: '📘', label: '发现知识' },
      play: { done: false, icon: '🎮', label: '完成游戏' },
      reward: { done: false, icon: '⭐', label: '领取贴纸' },
    };
    if (stepsJson[stepId]) {
      stepsJson[stepId] = { ...stepsJson[stepId], done: true };
    }
    const now = new Date().toISOString();
    const quest: StoredDailyQuest = {
      id: current?.id ?? randomUUID(),
      userId,
      petId,
      dateKey,
      stepsJson,
      stars: Object.values(stepsJson).filter((step) => step.done).length,
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    };
    this.dailyQuests.set(key, quest);
    return quest;
  }

  async listDailyQuestsByUser(userId: string) {
    return Array.from(this.dailyQuests.values()).filter((quest) => quest.userId === userId);
  }

  async searchUsersByUsername(username: string, currentUserId: string) {
    const needle = normalizeUsername(username);
    return Array.from(this.users.values()).filter((user) => user.id !== currentUserId && user.username.includes(needle)).slice(0, 10);
  }

  async createFriendship(requesterId: string, addresseeId: string) {
    const existing = Array.from(this.friendships.values()).find((friendship) => (
      (friendship.requesterId === requesterId && friendship.addresseeId === addresseeId)
      || (friendship.requesterId === addresseeId && friendship.addresseeId === requesterId)
    ));
    if (existing) return existing;
    const now = new Date().toISOString();
    const friendship: StoredFriendship = {
      id: randomUUID(),
      requesterId,
      addresseeId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    this.friendships.set(friendship.id, friendship);
    return friendship;
  }

  async acceptFriendship(friendshipId: string, addresseeId: string) {
    const friendship = this.friendships.get(friendshipId);
    if (!friendship || friendship.addresseeId !== addresseeId) return undefined;
    const next: StoredFriendship = {
      ...friendship,
      status: 'accepted',
      updatedAt: new Date().toISOString(),
    };
    this.friendships.set(friendship.id, next);
    return next;
  }

  async listFriendships(userId: string) {
    return Array.from(this.friendships.values()).filter((friendship) => friendship.requesterId === userId || friendship.addresseeId === userId);
  }

  async areFriends(userAId: string, userBId: string) {
    return Array.from(this.friendships.values()).some((friendship) => friendship.status === 'accepted' && (
      (friendship.requesterId === userAId && friendship.addresseeId === userBId)
      || (friendship.requesterId === userBId && friendship.addresseeId === userAId)
    ));
  }

  async createPetVisit(visitorId: string, ownerId: string, petId: string) {
    const visit: StoredPetVisit = {
      id: randomUUID(),
      visitorId,
      ownerId,
      petId,
      createdAt: new Date().toISOString(),
    };
    this.visits.set(visit.id, visit);
    return visit;
  }

  async createPetInteraction(actorId: string, ownerId: string, petId: string, kind: string, dayKey: string) {
    const key = `${actorId}:${petId}:${kind}:${dayKey}`;
    if (this.interactions.has(key)) {
      throw new Error('INTERACTION_RATE_LIMITED');
    }
    const interaction: StoredPetInteraction = {
      id: randomUUID(),
      actorId,
      ownerId,
      petId,
      kind,
      dayKey,
      createdAt: new Date().toISOString(),
    };
    this.interactions.set(key, interaction);
    return interaction;
  }

  async listPetSoundClips(userId: string, petId: string) {
    return Array.from(this.soundClips.values()).filter((clip) => clip.userId === userId && clip.petId === petId);
  }

  async findPetSoundClip(userId: string, petId: string, soundType: string) {
    return this.soundClips.get(`${userId}:${petId}:${soundType}`);
  }

  async upsertPetSoundClip(input: Omit<StoredPetSoundClip, 'id' | 'createdAt' | 'updatedAt'>) {
    const key = `${input.userId}:${input.petId}:${input.soundType}`;
    const current = this.soundClips.get(key);
    const now = new Date().toISOString();
    const clip: StoredPetSoundClip = {
      ...input,
      id: current?.id ?? randomUUID(),
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    };
    this.soundClips.set(key, clip);
    return clip;
  }

  async deletePetSoundClip(userId: string, petId: string, soundType: string) {
    const key = `${userId}:${petId}:${soundType}`;
    const clip = this.soundClips.get(key);
    this.soundClips.delete(key);
    return clip;
  }
}
