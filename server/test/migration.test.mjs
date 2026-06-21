import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../dist/app.js';

async function registerAndLogin(app, username) {
  await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { username, password: 'safe-password', displayName: username },
  });
  const login = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { username, password: 'safe-password' },
  });
  return String(login.headers['set-cookie']);
}

test('local state import maps legacy pets into the logged in account only', async () => {
  const app = await createApp({ storage: 'memory' });
  const cookie = await registerAndLogin(app, 'alice');

  const migration = await app.inject({
    method: 'POST',
    url: '/api/migrations/local-state',
    headers: { cookie },
    payload: {
      users: [
        {
          id: 'local-user-a',
          name: '本机观察员',
          achievements: [{ id: 'first_feed', title: '科学喂食', description: '旧成就', unlockedAt: '2026-06-01T00:00:00.000Z' }],
        },
      ],
      pets: [
        {
          id: 'local-pet-a',
          userId: 'local-user-a',
          animalTypeId: 'cat_orange',
          name: '旧猫猫',
          birthday: '2026-06-01T00:00:00.000Z',
          lastUpdatedAt: '2026-06-01T00:00:00.000Z',
          speedMultiplier: 1,
          mood: 'happy',
          hunger: 0.8,
          thirst: 0.8,
          energy: 0.8,
          happiness: 0.8,
          health: 1,
          hygiene: 0.8,
          stress: 0.1,
          isSick: false,
          outfitIds: [],
          friendIds: [],
        },
      ],
      dailyQuests: {
        'local-pet-a': {
          steps: {
            care: { done: true, icon: '🫶', label: '照顾动物' },
            learn: { done: false, icon: '📘', label: '发现知识' },
            play: { done: false, icon: '🎮', label: '完成游戏' },
            reward: { done: false, icon: '⭐', label: '领取贴纸' },
          },
          stars: 1,
        },
      },
    },
  });

  assert.equal(migration.statusCode, 201);
  assert.equal(migration.json().summary.importedPets, 1);
  assert.equal(migration.json().summary.importedUsers, 0);

  const me = await app.inject({
    method: 'GET',
    url: '/api/me',
    headers: { cookie },
  });
  assert.equal(me.statusCode, 200);
  assert.equal(me.json().pets.length, 1);
  assert.equal(me.json().pets[0].name, '旧猫猫');
  assert.equal(me.json().pets[0].userId, undefined);
  assert.equal(me.json().achievements.some((item) => item.achievementId === 'first_feed'), true);

  const searchLegacyUser = await app.inject({
    method: 'GET',
    url: '/api/users/search?username=local-user-a',
    headers: { cookie },
  });
  assert.equal(searchLegacyUser.statusCode, 200);
  assert.equal(searchLegacyUser.json().users.length, 0);

  await app.close();
});
