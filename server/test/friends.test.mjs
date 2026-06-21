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

async function createPet(app, cookie, name) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/pets/adoptions/complete',
    headers: { cookie },
    payload: { animalTypeId: 'rabbit_holland', name },
  });
  assert.equal(response.statusCode, 201);
  return response.json().pet;
}

test('friends can visit and lightly interact with pets once per day', async () => {
  const app = await createApp({ storage: 'memory' });
  const aliceCookie = await registerAndLogin(app, 'alice');
  const bobCookie = await registerAndLogin(app, 'bob');
  const bobPet = await createPet(app, bobCookie, 'Bunny');

  const search = await app.inject({
    method: 'GET',
    url: '/api/users/search?username=bob',
    headers: { cookie: aliceCookie },
  });
  assert.equal(search.statusCode, 200);
  assert.equal(search.json().users[0].username, 'bob');
  const bobId = search.json().users[0].id;

  const request = await app.inject({
    method: 'POST',
    url: '/api/friendships',
    headers: { cookie: aliceCookie },
    payload: { addresseeId: bobId },
  });
  assert.equal(request.statusCode, 201);

  const accept = await app.inject({
    method: 'POST',
    url: `/api/friendships/${request.json().friendship.id}/accept`,
    headers: { cookie: bobCookie },
  });
  assert.equal(accept.statusCode, 200);
  assert.equal(accept.json().friendship.status, 'accepted');

  const friendships = await app.inject({
    method: 'GET',
    url: '/api/friendships',
    headers: { cookie: aliceCookie },
  });
  assert.equal(friendships.statusCode, 200);
  assert.equal(friendships.json().friendships.length, 1);
  assert.equal(friendships.json().friendships[0].friend.username, 'bob');
  assert.equal(friendships.json().friendships[0].direction, 'outgoing');

  const bobFriendships = await app.inject({
    method: 'GET',
    url: '/api/friendships',
    headers: { cookie: bobCookie },
  });
  assert.equal(bobFriendships.statusCode, 200);
  assert.equal(bobFriendships.json().friendships[0].friend.username, 'alice');
  assert.equal(bobFriendships.json().friendships[0].direction, 'incoming');

  const friendPets = await app.inject({
    method: 'GET',
    url: `/api/friends/${bobId}/pets`,
    headers: { cookie: aliceCookie },
  });
  assert.equal(friendPets.statusCode, 200);
  assert.equal(friendPets.json().pets[0].id, bobPet.id);

  const visit = await app.inject({
    method: 'POST',
    url: `/api/pets/${bobPet.id}/visit`,
    headers: { cookie: aliceCookie },
  });
  assert.equal(visit.statusCode, 201);

  const interaction = await app.inject({
    method: 'POST',
    url: `/api/pets/${bobPet.id}/interactions`,
    headers: { cookie: aliceCookie },
    payload: { kind: 'wave' },
  });
  assert.equal(interaction.statusCode, 201);

  const repeated = await app.inject({
    method: 'POST',
    url: `/api/pets/${bobPet.id}/interactions`,
    headers: { cookie: aliceCookie },
    payload: { kind: 'wave' },
  });
  assert.equal(repeated.statusCode, 409);

  await app.close();
});
