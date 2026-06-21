import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { hashPassword, MemoryRepository, sessionCookieName, toPublicUser, verifyPassword, type AppRepository, type StoredUser } from './auth.js';
import { getPrisma } from './db.js';
import { PrismaRepository } from './prismaRepository.js';
import { registerAiRoutes } from './routes/ai.js';
import { registerFriendRoutes } from './routes/friends.js';
import { registerMigrationRoutes } from './routes/migration.js';
import { registerPetSoundRoutes } from './routes/petSounds.js';
import { registerPetRoutes } from './routes/pets.js';

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: StoredUser;
  }
}

export interface CreateAppOptions {
  storage?: 'memory';
  repository?: AppRepository;
}

function readBody(requestBody: unknown) {
  return (requestBody && typeof requestBody === 'object' ? requestBody : {}) as Record<string, unknown>;
}

function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
  };
}

async function getUserSnapshot(app: FastifyInstance, user: StoredUser) {
  const pets = await app.repository.listPetsByUser(user.id);
  const achievements = await app.repository.listAchievementsByUser(user.id);
  const dailyQuests = await app.repository.listDailyQuestsByUser(user.id);
  return {
    user: toPublicUser(user),
    pets: pets.map(({ userId: _userId, ...pet }) => pet),
    achievements,
    dailyQuests,
  };
}

async function requireUser(app: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  const sessionId = request.cookies[sessionCookieName];
  if (!sessionId) {
    reply.code(401).send({ error: 'UNAUTHENTICATED' });
    return undefined;
  }
  const session = await app.repository.findSession(sessionId);
  if (!session) {
    reply.code(401).send({ error: 'UNAUTHENTICATED' });
    return undefined;
  }
  const user = await app.repository.findUserById(session.userId);
  if (!user) {
    reply.code(401).send({ error: 'UNAUTHENTICATED' });
    return undefined;
  }
  request.currentUser = user;
  return user;
}

declare module 'fastify' {
  interface FastifyInstance {
    repository: AppRepository;
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export async function createApp(options: CreateAppOptions = {}) {
  const app = Fastify({ logger: false });
  const repository = options.repository ?? (options.storage === 'memory' ? new MemoryRepository() : new PrismaRepository(getPrisma()));
  app.decorate('repository', repository);
  app.decorate('requireAuth', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireUser(app, request, reply);
  });
  await app.register(cookie);
  await app.register(multipart, {
    limits: {
      fileSize: Number(process.env.PET_SOUND_MAX_BYTES || 2_500_000),
      files: 1,
    },
  });

  app.get('/api/health', async () => ({ ok: true }));

  app.post('/api/auth/register', async (request, reply) => {
    const body = readBody(request.body);
    const username = String(body.username ?? '').trim();
    const password = String(body.password ?? '');
    const displayName = String(body.displayName ?? username).trim();
    if (username.length < 2 || password.length < 6) {
      return reply.code(400).send({ error: 'INVALID_REGISTER_INPUT' });
    }
    const existing = await app.repository.findUserByUsername(username);
    if (existing) {
      return reply.code(409).send({ error: 'USERNAME_TAKEN' });
    }
    const user = await app.repository.createUser({
      username,
      passwordHash: await hashPassword(password),
      displayName,
    });
    return reply.code(201).send({ user: toPublicUser(user) });
  });

  app.post('/api/auth/login', async (request, reply) => {
    const body = readBody(request.body);
    const username = String(body.username ?? '').trim();
    const password = String(body.password ?? '');
    const user = await app.repository.findUserByUsername(username);
    if (!user || !(await verifyPassword(user.passwordHash, password))) {
      return reply.code(401).send({ error: 'INVALID_CREDENTIALS' });
    }
    const session = await app.repository.createSession(user.id);
    reply.setCookie(sessionCookieName, session.id, {
      ...getCookieOptions(),
      expires: new Date(session.expiresAt),
    });
    return getUserSnapshot(app, user);
  });

  app.post('/api/auth/logout', async (request, reply) => {
    const sessionId = request.cookies[sessionCookieName];
    if (sessionId) {
      await app.repository.deleteSession(sessionId);
    }
    reply.clearCookie(sessionCookieName, getCookieOptions());
    return { ok: true };
  });

  app.get('/api/me', async (request, reply) => {
    const user = await requireUser(app, request, reply);
    if (!user) return reply;
    return getUserSnapshot(app, user);
  });

  await registerPetRoutes(app);
  await registerPetSoundRoutes(app);
  await registerFriendRoutes(app);
  await registerMigrationRoutes(app);
  await registerAiRoutes(app);

  return app;
}
