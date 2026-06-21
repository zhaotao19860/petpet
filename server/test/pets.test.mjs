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

test('pet care is isolated to the owning user', async () => {
  const app = await createApp({ storage: 'memory' });
  const userACookie = await registerAndLogin(app, 'alice');
  const userBCookie = await registerAndLogin(app, 'bob');

  const createPet = await app.inject({
    method: 'POST',
    url: '/api/pets/adoptions/complete',
    headers: { cookie: userACookie },
    payload: { animalTypeId: 'cat_orange', name: 'Mimi' },
  });
  assert.equal(createPet.statusCode, 201);
  const petId = createPet.json().pet.id;
  assert.equal(createPet.json().pet.userId, undefined);

  const careByOwner = await app.inject({
    method: 'POST',
    url: `/api/pets/${petId}/care`,
    headers: { cookie: userACookie },
    payload: { action: 'feed' },
  });
  assert.equal(careByOwner.statusCode, 200);
  assert.equal(careByOwner.json().pet.name, 'Mimi');

  const careByOtherUser = await app.inject({
    method: 'POST',
    url: `/api/pets/${petId}/care`,
    headers: { cookie: userBCookie },
    payload: { action: 'feed' },
  });
  assert.equal(careByOtherUser.statusCode, 404);

  const me = await app.inject({
    method: 'GET',
    url: '/api/me',
    headers: { cookie: userACookie },
  });
  assert.equal(me.statusCode, 200);
  assert.equal(me.json().pets.length, 1);
  assert.equal(me.json().pets[0].id, petId);

  await app.close();
});

test('playing ball makes the pet happier and a little thirstier', async () => {
  const app = await createApp({ storage: 'memory' });
  const cookie = await registerAndLogin(app, 'play-care');

  const createPet = await app.inject({
    method: 'POST',
    url: '/api/pets/adoptions/complete',
    headers: { cookie },
    payload: { animalTypeId: 'dog_shiba', name: 'Qiuqiu' },
  });
  assert.equal(createPet.statusCode, 201);
  const beforePet = createPet.json().pet;

  const play = await app.inject({
    method: 'POST',
    url: `/api/pets/${beforePet.id}/care`,
    headers: { cookie },
    payload: { action: 'play' },
  });
  const body = play.json();
  assert.equal(play.statusCode, 200);
  assert.ok(body.pet.happiness > beforePet.happiness, 'play should raise happiness');
  assert.ok(body.pet.thirst < beforePet.thirst, 'play should lower drinking status');
  assert.match(body.message, /口渴/, 'play feedback should explain the water change');

  await app.close();
});
