import type { FastifyInstance } from 'fastify';
import type { CareAction } from '../auth.js';
import { applyCare, createPetState, toPublicPet } from '../petLogic.js';

const careActions = new Set<CareAction>(['feed', 'water', 'rest', 'clean', 'play', 'heal', 'observe']);

function readBody(requestBody: unknown) {
  return (requestBody && typeof requestBody === 'object' ? requestBody : {}) as Record<string, unknown>;
}

export async function registerPetRoutes(app: FastifyInstance) {
  app.get('/api/pets', { preHandler: app.requireAuth }, async (request) => {
    const pets = await app.repository.listPetsByUser(request.currentUser!.id);
    return { pets: pets.map(toPublicPet) };
  });

  app.post('/api/pets/adoptions/complete', { preHandler: app.requireAuth }, async (request, reply) => {
    const body = readBody(request.body);
    const animalTypeId = String(body.animalTypeId ?? '').trim();
    const name = String(body.name ?? '').trim();
    if (!animalTypeId) {
      return reply.code(400).send({ error: 'INVALID_PET_INPUT' });
    }
    const pet = await app.repository.createPet(createPetState(request.currentUser!.id, animalTypeId, name));
    await app.repository.setSelectedPet(request.currentUser!.id, pet.id);
    await app.repository.unlockAchievement(request.currentUser!.id, 'first_adopt');
    return reply.code(201).send({ pet: toPublicPet(pet) });
  });

  app.post('/api/pets/:petId/care', { preHandler: app.requireAuth }, async (request, reply) => {
    const petId = (request.params as { petId: string }).petId;
    const body = readBody(request.body);
    const action = String(body.action ?? '') as CareAction;
    if (!careActions.has(action)) {
      return reply.code(400).send({ error: 'INVALID_CARE_ACTION' });
    }
    const pet = await app.repository.findPetById(petId);
    if (!pet || pet.userId !== request.currentUser!.id) {
      return reply.code(404).send({ error: 'PET_NOT_FOUND' });
    }
    const result = applyCare(pet, action);
    const updated = await app.repository.updatePet(pet.id, () => result.pet);
    await app.repository.markDailyQuest(request.currentUser!.id, pet.id, 'care');
    if (result.achievementId) {
      await app.repository.unlockAchievement(request.currentUser!.id, result.achievementId);
    }
    return { pet: toPublicPet(updated!), message: result.message };
  });

  app.post('/api/pets/:petId/select', { preHandler: app.requireAuth }, async (request, reply) => {
    const petId = (request.params as { petId: string }).petId;
    const pet = await app.repository.findPetById(petId);
    if (!pet || pet.userId !== request.currentUser!.id) {
      return reply.code(404).send({ error: 'PET_NOT_FOUND' });
    }
    await app.repository.setSelectedPet(request.currentUser!.id, pet.id);
    return { pet: toPublicPet(pet) };
  });

  app.post('/api/daily-quests/:petId/:stepId', { preHandler: app.requireAuth }, async (request, reply) => {
    const { petId, stepId } = request.params as { petId: string; stepId: string };
    const pet = await app.repository.findPetById(petId);
    if (!pet || pet.userId !== request.currentUser!.id) {
      return reply.code(404).send({ error: 'PET_NOT_FOUND' });
    }
    const quest = await app.repository.markDailyQuest(request.currentUser!.id, pet.id, stepId);
    if (Object.values(quest.stepsJson).every((step) => step.done)) {
      await app.repository.unlockAchievement(request.currentUser!.id, 'daily_explorer');
    }
    return { dailyQuest: quest };
  });

  app.post('/api/achievements/:achievementId/unlock', { preHandler: app.requireAuth }, async (request) => {
    const { achievementId } = request.params as { achievementId: string };
    const achievement = await app.repository.unlockAchievement(request.currentUser!.id, achievementId);
    return { achievement };
  });
}
