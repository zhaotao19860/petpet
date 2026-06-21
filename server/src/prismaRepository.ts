import type { PrismaClient } from '@prisma/client';
import type {
  AppRepository,
  StoredAchievement,
  StoredDailyQuest,
  StoredFriendship,
  StoredPet,
  StoredPetInteraction,
  StoredPetSoundClip,
  StoredPetVisit,
  StoredSession,
  StoredUser,
} from './auth.js';
import { normalizeUsername } from './auth.js';

type PrismaUser = Awaited<ReturnType<PrismaClient['user']['create']>>;
type PrismaSession = Awaited<ReturnType<PrismaClient['session']['create']>>;
type PrismaPet = Awaited<ReturnType<PrismaClient['pet']['create']>>;
type PrismaAchievement = Awaited<ReturnType<PrismaClient['achievement']['create']>>;
type PrismaDailyQuest = Awaited<ReturnType<PrismaClient['dailyQuest']['create']>>;
type PrismaFriendship = Awaited<ReturnType<PrismaClient['friendship']['create']>>;
type PrismaPetVisit = Awaited<ReturnType<PrismaClient['petVisit']['create']>>;
type PrismaPetInteraction = Awaited<ReturnType<PrismaClient['petInteraction']['create']>>;
type PrismaPetSoundClip = Awaited<ReturnType<PrismaClient['petSoundClip']['create']>>;

function jsonStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function mapUser(user: PrismaUser): StoredUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    passwordHash: user.passwordHash,
    selectedPetId: user.selectedPetId ?? undefined,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function mapSession(session: PrismaSession): StoredSession {
  return {
    id: session.id,
    userId: session.userId,
    expiresAt: session.expiresAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
  };
}

function mapPet(pet: PrismaPet): StoredPet {
  return {
    id: pet.id,
    userId: pet.userId,
    animalTypeId: pet.animalTypeId,
    name: pet.name,
    birthday: pet.birthday.toISOString(),
    lastUpdatedAt: pet.lastUpdatedAt.toISOString(),
    speedMultiplier: pet.speedMultiplier,
    mood: pet.mood as StoredPet['mood'],
    hunger: pet.hunger,
    thirst: pet.thirst,
    energy: pet.energy,
    happiness: pet.happiness,
    health: pet.health,
    hygiene: pet.hygiene,
    stress: pet.stress,
    isSick: pet.isSick,
    outfitIds: jsonStringArray(pet.outfitIds),
    friendIds: jsonStringArray(pet.friendIds),
    createdAt: pet.createdAt.toISOString(),
    updatedAt: pet.updatedAt.toISOString(),
  };
}

function mapAchievement(achievement: PrismaAchievement): StoredAchievement {
  return {
    id: achievement.id,
    userId: achievement.userId,
    achievementId: achievement.achievementId,
    unlockedAt: achievement.unlockedAt?.toISOString(),
    createdAt: achievement.createdAt.toISOString(),
  };
}

function mapDailyQuest(quest: PrismaDailyQuest): StoredDailyQuest {
  return {
    id: quest.id,
    userId: quest.userId,
    petId: quest.petId,
    dateKey: quest.dateKey,
    stepsJson: quest.stepsJson as StoredDailyQuest['stepsJson'],
    stars: quest.stars,
    createdAt: quest.createdAt.toISOString(),
    updatedAt: quest.updatedAt.toISOString(),
  };
}

function mapFriendship(friendship: PrismaFriendship): StoredFriendship {
  return {
    id: friendship.id,
    requesterId: friendship.requesterId,
    addresseeId: friendship.addresseeId,
    status: friendship.status as StoredFriendship['status'],
    createdAt: friendship.createdAt.toISOString(),
    updatedAt: friendship.updatedAt.toISOString(),
  };
}

function mapVisit(visit: PrismaPetVisit): StoredPetVisit {
  return {
    id: visit.id,
    visitorId: visit.visitorId,
    ownerId: visit.ownerId,
    petId: visit.petId,
    createdAt: visit.createdAt.toISOString(),
  };
}

function mapInteraction(interaction: PrismaPetInteraction): StoredPetInteraction {
  return {
    id: interaction.id,
    actorId: interaction.actorId,
    ownerId: interaction.ownerId,
    petId: interaction.petId,
    kind: interaction.kind,
    dayKey: interaction.dayKey,
    createdAt: interaction.createdAt.toISOString(),
  };
}

function mapPetSoundClip(clip: PrismaPetSoundClip): StoredPetSoundClip {
  return {
    id: clip.id,
    userId: clip.userId,
    petId: clip.petId,
    animalTypeId: clip.animalTypeId,
    soundType: clip.soundType,
    label: clip.label ?? undefined,
    mimeType: clip.mimeType,
    filePath: clip.filePath,
    fileSize: clip.fileSize,
    durationMs: clip.durationMs ?? undefined,
    createdAt: clip.createdAt.toISOString(),
    updatedAt: clip.updatedAt.toISOString(),
  };
}

export class PrismaRepository implements AppRepository {
  constructor(private prisma: PrismaClient) {}

  async createUser(input: { username: string; passwordHash: string; displayName: string }) {
    const user = await this.prisma.user.create({
      data: {
        username: normalizeUsername(input.username),
        passwordHash: input.passwordHash,
        displayName: input.displayName.trim() || normalizeUsername(input.username),
      },
    });
    return mapUser(user);
  }

  async findUserByUsername(username: string) {
    const user = await this.prisma.user.findUnique({ where: { username: normalizeUsername(username) } });
    return user ? mapUser(user) : undefined;
  }

  async findUserById(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user ? mapUser(user) : undefined;
  }

  async createSession(userId: string) {
    const session = await this.prisma.session.create({
      data: {
        userId,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      },
    });
    return mapSession(session);
  }

  async findSession(sessionId: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || session.expiresAt.getTime() < Date.now()) {
      if (session) await this.prisma.session.delete({ where: { id: session.id } });
      return undefined;
    }
    return mapSession(session);
  }

  async deleteSession(sessionId: string) {
    await this.prisma.session.deleteMany({ where: { id: sessionId } });
  }

  async createPet(input: Omit<StoredPet, 'id' | 'createdAt' | 'updatedAt'>) {
    const pet = await this.prisma.pet.create({
      data: {
        ...input,
        birthday: new Date(input.birthday),
        lastUpdatedAt: new Date(input.lastUpdatedAt),
        outfitIds: input.outfitIds,
        friendIds: input.friendIds,
      },
    });
    return mapPet(pet);
  }

  async findPetById(petId: string) {
    const pet = await this.prisma.pet.findUnique({ where: { id: petId } });
    return pet ? mapPet(pet) : undefined;
  }

  async listPetsByUser(userId: string) {
    const pets = await this.prisma.pet.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
    return pets.map(mapPet);
  }

  async updatePet(petId: string, updater: (pet: StoredPet) => StoredPet) {
    const current = await this.findPetById(petId);
    if (!current) return undefined;
    const next = updater(current);
    const pet = await this.prisma.pet.update({
      where: { id: petId },
      data: {
        animalTypeId: next.animalTypeId,
        name: next.name,
        birthday: new Date(next.birthday),
        lastUpdatedAt: new Date(next.lastUpdatedAt),
        speedMultiplier: next.speedMultiplier,
        mood: next.mood,
        hunger: next.hunger,
        thirst: next.thirst,
        energy: next.energy,
        happiness: next.happiness,
        health: next.health,
        hygiene: next.hygiene,
        stress: next.stress,
        isSick: next.isSick,
        outfitIds: next.outfitIds,
        friendIds: next.friendIds,
      },
    });
    return mapPet(pet);
  }

  async setSelectedPet(userId: string, petId: string | undefined) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { selectedPetId: petId },
    });
    return mapUser(user);
  }

  async unlockAchievement(userId: string, achievementId: string) {
    const achievement = await this.prisma.achievement.upsert({
      where: { userId_achievementId: { userId, achievementId } },
      update: { unlockedAt: new Date() },
      create: { userId, achievementId, unlockedAt: new Date() },
    });
    return mapAchievement(achievement);
  }

  async listAchievementsByUser(userId: string) {
    const achievements = await this.prisma.achievement.findMany({ where: { userId } });
    return achievements.map(mapAchievement);
  }

  async markDailyQuest(userId: string, petId: string, stepId: string) {
    const dateKey = new Date().toISOString().slice(0, 10);
    const current = await this.prisma.dailyQuest.findUnique({ where: { petId_dateKey: { petId, dateKey } } });
    const stepsJson = (current?.stepsJson as StoredDailyQuest['stepsJson'] | undefined) ?? {
      care: { done: false, icon: '🫶', label: '照顾动物' },
      learn: { done: false, icon: '📘', label: '发现知识' },
      play: { done: false, icon: '🎮', label: '完成游戏' },
      reward: { done: false, icon: '⭐', label: '领取贴纸' },
    };
    if (stepsJson[stepId]) stepsJson[stepId] = { ...stepsJson[stepId], done: true };
    const quest = await this.prisma.dailyQuest.upsert({
      where: { petId_dateKey: { petId, dateKey } },
      update: { stepsJson, stars: Object.values(stepsJson).filter((step) => step.done).length },
      create: { userId, petId, dateKey, stepsJson, stars: Object.values(stepsJson).filter((step) => step.done).length },
    });
    return mapDailyQuest(quest);
  }

  async listDailyQuestsByUser(userId: string) {
    const quests = await this.prisma.dailyQuest.findMany({ where: { userId } });
    return quests.map(mapDailyQuest);
  }

  async searchUsersByUsername(username: string, currentUserId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        username: { contains: normalizeUsername(username) },
      },
      take: 10,
      orderBy: { username: 'asc' },
    });
    return users.map(mapUser);
  }

  async createFriendship(requesterId: string, addresseeId: string) {
    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
    });
    if (existing) return mapFriendship(existing);
    const friendship = await this.prisma.friendship.create({
      data: { requesterId, addresseeId, status: 'pending' },
    });
    return mapFriendship(friendship);
  }

  async acceptFriendship(friendshipId: string, addresseeId: string) {
    const friendship = await this.prisma.friendship.findFirst({ where: { id: friendshipId, addresseeId } });
    if (!friendship) return undefined;
    const accepted = await this.prisma.friendship.update({ where: { id: friendship.id }, data: { status: 'accepted' } });
    return mapFriendship(accepted);
  }

  async listFriendships(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: { OR: [{ requesterId: userId }, { addresseeId: userId }] },
      orderBy: { createdAt: 'desc' },
    });
    return friendships.map(mapFriendship);
  }

  async areFriends(userAId: string, userBId: string) {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        status: 'accepted',
        OR: [
          { requesterId: userAId, addresseeId: userBId },
          { requesterId: userBId, addresseeId: userAId },
        ],
      },
    });
    return Boolean(friendship);
  }

  async createPetVisit(visitorId: string, ownerId: string, petId: string) {
    const visit = await this.prisma.petVisit.create({ data: { visitorId, ownerId, petId } });
    return mapVisit(visit);
  }

  async createPetInteraction(actorId: string, ownerId: string, petId: string, kind: string, dayKey: string) {
    try {
      const interaction = await this.prisma.petInteraction.create({ data: { actorId, ownerId, petId, kind, dayKey } });
      return mapInteraction(interaction);
    } catch {
      throw new Error('INTERACTION_RATE_LIMITED');
    }
  }

  async listPetSoundClips(userId: string, petId: string) {
    const clips = await this.prisma.petSoundClip.findMany({
      where: { userId, petId },
      orderBy: { updatedAt: 'desc' },
    });
    return clips.map(mapPetSoundClip);
  }

  async findPetSoundClip(userId: string, petId: string, soundType: string) {
    const clip = await this.prisma.petSoundClip.findFirst({ where: { userId, petId, soundType } });
    return clip ? mapPetSoundClip(clip) : undefined;
  }

  async upsertPetSoundClip(input: Omit<StoredPetSoundClip, 'id' | 'createdAt' | 'updatedAt'>) {
    const clip = await this.prisma.petSoundClip.upsert({
      where: { petId_soundType: { petId: input.petId, soundType: input.soundType } },
      update: {
        userId: input.userId,
        animalTypeId: input.animalTypeId,
        label: input.label,
        mimeType: input.mimeType,
        filePath: input.filePath,
        fileSize: input.fileSize,
        durationMs: input.durationMs,
      },
      create: input,
    });
    return mapPetSoundClip(clip);
  }

  async deletePetSoundClip(userId: string, petId: string, soundType: string) {
    const clip = await this.prisma.petSoundClip.findFirst({ where: { userId, petId, soundType } });
    if (!clip) return undefined;
    await this.prisma.petSoundClip.delete({ where: { id: clip.id } });
    return mapPetSoundClip(clip);
  }
}
