import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

async function createPet(app, cookie, animalTypeId = 'cat_orange') {
  const response = await app.inject({
    method: 'POST',
    url: '/api/pets/adoptions/complete',
    headers: { cookie },
    payload: { animalTypeId, name: 'Mimi' },
  });
  assert.equal(response.statusCode, 201);
  return response.json().pet;
}

function multipartBody({ name = 'file', filename = 'voice.webm', contentType = 'audio/webm', value = 'voice-bytes', label = '开心泡泡' } = {}) {
  const boundary = `----petpet-${Math.random().toString(16).slice(2)}`;
  const chunks = [
    `--${boundary}\r\n`,
    `Content-Disposition: form-data; name="label"\r\n\r\n${label}\r\n`,
    `--${boundary}\r\n`,
    `Content-Disposition: form-data; name="${name}"; filename="${filename}"\r\n`,
    `Content-Type: ${contentType}\r\n\r\n`,
    value,
    `\r\n--${boundary}--\r\n`,
  ];
  return {
    payload: Buffer.from(chunks.join('')),
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
  };
}

async function withUploadDir(run) {
  const originalDir = process.env.PET_SOUND_UPLOAD_DIR;
  const dir = await mkdtemp(join(tmpdir(), 'petpet-sounds-'));
  process.env.PET_SOUND_UPLOAD_DIR = dir;
  try {
    await run(dir);
  } finally {
    if (originalDir === undefined) delete process.env.PET_SOUND_UPLOAD_DIR;
    else process.env.PET_SOUND_UPLOAD_DIR = originalDir;
    await rm(dir, { recursive: true, force: true });
  }
}

test('pet sound routes require login', async () => {
  const app = await createApp({ storage: 'memory' });
  const response = await app.inject({ method: 'GET', url: '/api/pets/missing/sounds' });
  assert.equal(response.statusCode, 401);
  await app.close();
});

test('owner can upload list play replace and delete a pet sound', async () => {
  await withUploadDir(async () => {
    const app = await createApp({ storage: 'memory' });
    const cookie = await registerAndLogin(app, 'sound-owner');
    const pet = await createPet(app, cookie);
    const firstBody = multipartBody({ value: 'first-voice' });

    const upload = await app.inject({
      method: 'POST',
      url: `/api/pets/${pet.id}/sounds/joy`,
      headers: { ...firstBody.headers, cookie },
      payload: firstBody.payload,
    });
    assert.equal(upload.statusCode, 201);
    assert.equal(upload.json().clip.soundType, 'joy');
    assert.equal(upload.json().clip.label, '开心泡泡');
    assert.match(upload.json().clip.url, new RegExp(`/api/pets/${pet.id}/sounds/joy/file`));

    const list = await app.inject({ method: 'GET', url: `/api/pets/${pet.id}/sounds`, headers: { cookie } });
    assert.equal(list.statusCode, 200);
    assert.equal(list.json().clips.length, 1);

    const file = await app.inject({ method: 'GET', url: `/api/pets/${pet.id}/sounds/joy/file`, headers: { cookie } });
    assert.equal(file.statusCode, 200);
    assert.equal(file.headers['content-type'], 'audio/webm');
    assert.equal(file.body, 'first-voice');

    const secondBody = multipartBody({ value: 'second-voice', label: '新的开心泡泡' });
    const replace = await app.inject({
      method: 'POST',
      url: `/api/pets/${pet.id}/sounds/joy`,
      headers: { ...secondBody.headers, cookie },
      payload: secondBody.payload,
    });
    assert.equal(replace.statusCode, 200);

    const replacedFile = await app.inject({ method: 'GET', url: `/api/pets/${pet.id}/sounds/joy/file`, headers: { cookie } });
    assert.equal(replacedFile.body, 'second-voice');

    const remove = await app.inject({ method: 'DELETE', url: `/api/pets/${pet.id}/sounds/joy`, headers: { cookie } });
    assert.equal(remove.statusCode, 200);
    assert.deepEqual(remove.json(), { ok: true });

    const afterDelete = await app.inject({ method: 'GET', url: `/api/pets/${pet.id}/sounds/joy/file`, headers: { cookie } });
    assert.equal(afterDelete.statusCode, 404);
    await app.close();
  });
});

test('pet sound routes reject unauthorized pet and invalid inputs', async () => {
  await withUploadDir(async () => {
    const app = await createApp({ storage: 'memory' });
    const aliceCookie = await registerAndLogin(app, 'sound-alice');
    const bobCookie = await registerAndLogin(app, 'sound-bob');
    const pet = await createPet(app, aliceCookie);

    const validBody = multipartBody();
    const otherUser = await app.inject({
      method: 'POST',
      url: `/api/pets/${pet.id}/sounds/joy`,
      headers: { ...validBody.headers, cookie: bobCookie },
      payload: validBody.payload,
    });
    assert.equal(otherUser.statusCode, 404);

    const invalidTypeBody = multipartBody();
    const invalidType = await app.inject({
      method: 'POST',
      url: `/api/pets/${pet.id}/sounds/roar`,
      headers: { ...invalidTypeBody.headers, cookie: aliceCookie },
      payload: invalidTypeBody.payload,
    });
    assert.equal(invalidType.statusCode, 400);
    assert.equal(invalidType.json().error, 'INVALID_SOUND_TYPE');

    const textBody = multipartBody({ contentType: 'text/plain', filename: 'note.txt', value: 'not audio' });
    const nonAudio = await app.inject({
      method: 'POST',
      url: `/api/pets/${pet.id}/sounds/joy`,
      headers: { ...textBody.headers, cookie: aliceCookie },
      payload: textBody.payload,
    });
    assert.equal(nonAudio.statusCode, 400);
    assert.equal(nonAudio.json().error, 'AUDIO_FILE_REQUIRED');

    const emptyBody = multipartBody({ value: '' });
    const empty = await app.inject({
      method: 'POST',
      url: `/api/pets/${pet.id}/sounds/joy`,
      headers: { ...emptyBody.headers, cookie: aliceCookie },
      payload: emptyBody.payload,
    });
    assert.equal(empty.statusCode, 400);
    assert.equal(empty.json().error, 'AUDIO_FILE_EMPTY');
    await app.close();
  });
});
