import type { FastifyInstance } from 'fastify';
import { resolveMood, toPublicPet } from '../petLogic.js';
import type { PetMood, StoredPet } from '../auth.js';

function readBody(requestBody: unknown) {
  return (requestBody && typeof requestBody === 'object' ? requestBody : {}) as Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function legacyPetToInput(currentUserId: string, value: unknown): Omit<StoredPet, 'id' | 'createdAt' | 'updatedAt'> | undefined {
  if (!isRecord(value)) return undefined;
  const animalTypeId = String(value.animalTypeId ?? '').trim();
  const name = String(value.name ?? '').trim();
  if (!animalTypeId || !name) return undefined;
  const pet = {
    userId: currentUserId,
    animalTypeId,
    name,
    birthday: String(value.birthday ?? new Date().toISOString()),
    lastUpdatedAt: String(value.lastUpdatedAt ?? new Date().toISOString()),
    speedMultiplier: numberValue(value.speedMultiplier, 1),
    mood: (typeof value.mood === 'string' ? value.mood : 'happy') as PetMood,
    hunger: numberValue(value.hunger, 0.82),
    thirst: numberValue(value.thirst, 0.84),
    energy: numberValue(value.energy, 0.86),
    happiness: numberValue(value.happiness, 0.9),
    health: numberValue(value.health, 1),
    hygiene: numberValue(value.hygiene, 0.88),
    stress: numberValue(value.stress, 0.12),
    isSick: Boolean(value.isSick),
    outfitIds: stringArray(value.outfitIds),
    friendIds: stringArray(value.friendIds),
  };
  return { ...pet, mood: resolveMood(pet) };
}

export async function registerMigrationRoutes(app: FastifyInstance) {
  app.post('/api/migrations/local-state', { preHandler: app.requireAuth }, async (request, reply) => {
    const body = readBody(request.body);
    const pets = Array.isArray(body.pets) ? body.pets : [];
    const importedPets = [];

    for (const item of pets) {
      const input = legacyPetToInput(request.currentUser!.id, item);
      if (!input) continue;
      const pet = await app.repository.createPet(input);
      importedPets.push(pet);
    }

    if (importedPets[0]) {
      await app.repository.setSelectedPet(request.currentUser!.id, importedPets[0].id);
    }

    const users = Array.isArray(body.users) ? body.users : [];
    for (const user of users) {
      if (!isRecord(user) || !Array.isArray(user.achievements)) continue;
      for (const achievement of user.achievements) {
        if (isRecord(achievement) && typeof achievement.id === 'string' && achievement.unlockedAt) {
          await app.repository.unlockAchievement(request.currentUser!.id, achievement.id);
        }
      }
    }

    const dailyQuests = isRecord(body.dailyQuests) ? body.dailyQuests : {};
    for (const pet of importedPets) {
      const quest = dailyQuests[pet.id] ?? dailyQuests[(pets.find((item) => isRecord(item) && item.name === pet.name) as Record<string, unknown> | undefined)?.id as string];
      if (!isRecord(quest)) continue;
      const steps = isRecord(quest.steps) ? quest.steps : {};
      for (const stepId of Object.keys(steps)) {
        if (isRecord(steps[stepId]) && steps[stepId].done === true) {
          await app.repository.markDailyQuest(request.currentUser!.id, pet.id, stepId);
        }
      }
    }

    return reply.code(201).send({
      summary: {
        importedPets: importedPets.length,
        importedUsers: 0,
      },
      pets: importedPets.map(toPublicPet),
    });
  });
}
