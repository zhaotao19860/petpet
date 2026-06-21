import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../dist/app.js';

test('register login and me use an http only session cookie', async () => {
  const app = await createApp({ storage: 'memory' });

  const register = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { username: 'tom', password: 'safe-password', displayName: 'Tom' },
  });
  assert.equal(register.statusCode, 201);
  assert.equal(register.json().user.username, 'tom');
  assert.equal(register.json().user.passwordHash, undefined);

  const login = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { username: 'tom', password: 'safe-password' },
  });
  assert.equal(login.statusCode, 200);
  assert.equal(login.json().user.username, 'tom');
  assert.ok(Array.isArray(login.json().pets), 'login should return the initial pet list to avoid an extra /api/me round trip');
  assert.ok(Array.isArray(login.json().achievements), 'login should return achievements for the initial authenticated screen');
  assert.ok(Array.isArray(login.json().dailyQuests), 'login should return daily quests for the initial authenticated screen');
  const cookie = login.headers['set-cookie'];
  assert.match(String(cookie), /petpet_session=/);
  assert.match(String(cookie), /HttpOnly/);

  const me = await app.inject({
    method: 'GET',
    url: '/api/me',
    headers: { cookie: String(cookie) },
  });
  assert.equal(me.statusCode, 200);
  assert.equal(me.json().user.username, 'tom');

  const logout = await app.inject({
    method: 'POST',
    url: '/api/auth/logout',
    headers: { cookie: String(cookie) },
  });
  assert.equal(logout.statusCode, 200);
  assert.match(String(logout.headers['set-cookie']), /petpet_session=/, 'logout should update the browser session cookie');
  assert.match(String(logout.headers['set-cookie']), /Max-Age=0|Expires=Thu, 01 Jan 1970/i, 'logout should expire the browser session cookie');

  const afterLogout = await app.inject({
    method: 'GET',
    url: '/api/me',
    headers: { cookie: String(cookie) },
  });
  assert.equal(afterLogout.statusCode, 401);

  await app.close();
});
