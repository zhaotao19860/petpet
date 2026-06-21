import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

test('docker compose defines web server and postgres services', async () => {
  const compose = await readFile(new URL('../docker-compose.yml', import.meta.url), 'utf8');

  for (const service of ['web:', 'server:', 'postgres:']) {
    assert.match(compose, new RegExp(`\\n\\s{2}${service}`), `compose should define ${service}`);
  }
  assert.match(compose, /DATABASE_URL/, 'server should receive a database URL');
  assert.match(compose, /petpet-postgres-data/, 'postgres should use a named volume');
});

test('deployment files proxy api and document required environment', async () => {
  const nginx = await readFile(new URL('../web/nginx.conf', import.meta.url), 'utf8');
  const serverDockerfile = await readFile(new URL('../server/Dockerfile', import.meta.url), 'utf8');
  const envExample = await readFile(new URL('../.env.example', import.meta.url), 'utf8');
  const migrations = await readdir(new URL('../server/prisma/migrations', import.meta.url));

  assert.match(nginx, /location\s+\/api\//, 'nginx should proxy /api/');
  assert.match(nginx, /proxy_pass\s+http:\/\/server:3000/, 'nginx should send api traffic to server');
  assert.match(serverDockerfile, /prisma\s+migrate\s+deploy/, 'server container should run migrations before start');
  assert.ok(migrations.some((name) => name.includes('init')), 'server should include an initial Prisma migration for docker deploy');
  for (const key of ['DATABASE_URL', 'SESSION_SECRET', 'POSTGRES_PASSWORD']) {
    assert.match(envExample, new RegExp(`${key}=`), `.env.example should include ${key}`);
  }
});

test('web docker build avoids local-only asset and sound dependencies', async () => {
  const webDockerfile = await readFile(new URL('../web/Dockerfile', import.meta.url), 'utf8');
  const webDockerignore = await readFile(new URL('../web/.dockerignore', import.meta.url), 'utf8');

  assert.match(webDockerfile, /npm ci --ignore-scripts/, 'web image build should not run local sound/image dependency install scripts');
  assert.doesNotMatch(webDockerfile, /RUN npm install/, 'web image build should use the lockfile instead of a loose install');
  assert.match(webDockerignore, /public\/assets\/animals\/\*\*\/\*\.png/, 'web Docker context should not send original animal PNG files');
});
