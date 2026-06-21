import type { FastifyInstance } from 'fastify';
import { toPublicPet } from '../petLogic.js';
import { toPublicUser, type StoredFriendship } from '../auth.js';

const interactionKinds = new Set(['wave', 'like', 'gift_sticker', 'encourage', 'play']);

function readBody(requestBody: unknown) {
  return (requestBody && typeof requestBody === 'object' ? requestBody : {}) as Record<string, unknown>;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function toFriendshipView(app: FastifyInstance, friendship: StoredFriendship, currentUserId: string) {
  const friendId = friendship.requesterId === currentUserId ? friendship.addresseeId : friendship.requesterId;
  const friend = await app.repository.findUserById(friendId);
  return {
    ...friendship,
    direction: friendship.requesterId === currentUserId ? 'outgoing' : 'incoming',
    friend: friend ? toPublicUser(friend) : undefined,
  };
}

export async function registerFriendRoutes(app: FastifyInstance) {
  app.get('/api/users/search', { preHandler: app.requireAuth }, async (request) => {
    const query = request.query as { username?: string };
    const users = await app.repository.searchUsersByUsername(String(query.username ?? ''), request.currentUser!.id);
    return { users: users.map(toPublicUser) };
  });

  app.get('/api/users/:userId/public', { preHandler: app.requireAuth }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const user = await app.repository.findUserById(userId);
    if (!user) return reply.code(404).send({ error: 'USER_NOT_FOUND' });
    return { user: toPublicUser(user) };
  });

  app.post('/api/friendships', { preHandler: app.requireAuth }, async (request, reply) => {
    const body = readBody(request.body);
    const addresseeId = String(body.addresseeId ?? '');
    const addressee = await app.repository.findUserById(addresseeId);
    if (!addressee || addressee.id === request.currentUser!.id) {
      return reply.code(404).send({ error: 'USER_NOT_FOUND' });
    }
    const friendship = await app.repository.createFriendship(request.currentUser!.id, addressee.id);
    return reply.code(friendship.status === 'pending' ? 201 : 200).send({ friendship });
  });

  app.post('/api/friendships/:friendshipId/accept', { preHandler: app.requireAuth }, async (request, reply) => {
    const { friendshipId } = request.params as { friendshipId: string };
    const friendship = await app.repository.acceptFriendship(friendshipId, request.currentUser!.id);
    if (!friendship) return reply.code(404).send({ error: 'FRIENDSHIP_NOT_FOUND' });
    return { friendship };
  });

  app.get('/api/friendships', { preHandler: app.requireAuth }, async (request) => {
    const friendships = await app.repository.listFriendships(request.currentUser!.id);
    const views = await Promise.all(friendships.map((friendship) => toFriendshipView(app, friendship, request.currentUser!.id)));
    return { friendships: views.filter((friendship) => friendship.friend) };
  });

  app.get('/api/friends/:userId/pets', { preHandler: app.requireAuth }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    if (!(await app.repository.areFriends(request.currentUser!.id, userId))) {
      return reply.code(403).send({ error: 'NOT_FRIENDS' });
    }
    const pets = await app.repository.listPetsByUser(userId);
    return { pets: pets.map(toPublicPet) };
  });

  app.post('/api/pets/:petId/visit', { preHandler: app.requireAuth }, async (request, reply) => {
    const { petId } = request.params as { petId: string };
    const pet = await app.repository.findPetById(petId);
    if (!pet) return reply.code(404).send({ error: 'PET_NOT_FOUND' });
    if (pet.userId !== request.currentUser!.id && !(await app.repository.areFriends(request.currentUser!.id, pet.userId))) {
      return reply.code(403).send({ error: 'NOT_FRIENDS' });
    }
    const visit = await app.repository.createPetVisit(request.currentUser!.id, pet.userId, pet.id);
    return reply.code(201).send({ visit });
  });

  app.post('/api/pets/:petId/interactions', { preHandler: app.requireAuth }, async (request, reply) => {
    const { petId } = request.params as { petId: string };
    const body = readBody(request.body);
    const kind = String(body.kind ?? '');
    if (!interactionKinds.has(kind)) {
      return reply.code(400).send({ error: 'INVALID_INTERACTION' });
    }
    const pet = await app.repository.findPetById(petId);
    if (!pet) return reply.code(404).send({ error: 'PET_NOT_FOUND' });
    if (pet.userId === request.currentUser!.id) {
      return reply.code(400).send({ error: 'CANNOT_INTERACT_WITH_OWN_PET' });
    }
    if (!(await app.repository.areFriends(request.currentUser!.id, pet.userId))) {
      return reply.code(403).send({ error: 'NOT_FRIENDS' });
    }
    try {
      const interaction = await app.repository.createPetInteraction(request.currentUser!.id, pet.userId, pet.id, kind, todayKey());
      return reply.code(201).send({ interaction });
    } catch (error) {
      if (error instanceof Error && error.message === 'INTERACTION_RATE_LIMITED') {
        return reply.code(409).send({ error: 'INTERACTION_RATE_LIMITED' });
      }
      throw error;
    }
  });
}
