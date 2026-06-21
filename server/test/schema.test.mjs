import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('prisma schema defines multi-user pet social data models', async () => {
  const schema = await readFile(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');

  for (const model of ['User', 'Session', 'Pet', 'PetSoundClip', 'Achievement', 'DailyQuest', 'Friendship', 'PetVisit', 'PetInteraction']) {
    assert.match(schema, new RegExp(`model\\s+${model}\\s+{`), `schema should define ${model}`);
  }

  assert.match(schema, /username\s+String\s+@unique/, 'users should have unique usernames');
  assert.match(schema, /passwordHash\s+String/, 'users should store password hashes');
  assert.match(schema, /userId\s+String/, 'owned records should carry userId fields');
  assert.match(schema, /@@index\(\[userId\]\)/, 'owned records should be indexed by userId');
  assert.match(schema, /@@unique\(\[petId, soundType\]\)/, 'pet sound clips should have one active clip per pet sound type');
  assert.match(schema, /filePath\s+String/, 'pet sound clips should store uploaded file paths outside the database');
});
