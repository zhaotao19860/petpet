# Multi-User Linux Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add username/password multi-user login, server-side data isolation, friend visits/interactions, and Docker Compose deployment for PetPet.

**Architecture:** Add a `server/` Fastify API backed by PostgreSQL through Prisma. Keep `web/` as the React/Vite frontend, but replace core `localStorage` persistence with API-backed auth and pet state. Deploy with root-level Docker Compose where nginx serves the frontend and proxies `/api` to the server.

**Tech Stack:** React, TypeScript, Vite, Fastify, Prisma, PostgreSQL, Argon2, HttpOnly cookies, Docker Compose, Node test runner.

---

## File Structure

- Create `server/package.json`: API package scripts and dependencies.
- Create `server/tsconfig.json`: TypeScript config for Node.
- Create `server/prisma/schema.prisma`: PostgreSQL schema and generated Prisma client.
- Create `server/src/app.ts`: Fastify app factory, auth hook, route registration.
- Create `server/src/index.ts`: production server entrypoint.
- Create `server/src/db.ts`: Prisma client setup.
- Create `server/src/auth.ts`: password hashing, session cookies, auth helper.
- Create `server/src/petLogic.ts`: server-side pet creation, decay, care, achievements, daily tasks.
- Create `server/src/routes/auth.ts`: register/login/logout/me routes.
- Create `server/src/routes/pets.ts`: pet adoption, selection, care, daily quest routes.
- Create `server/src/routes/friends.ts`: user search, friend request, accept, visits, interactions.
- Create `server/src/routes/migration.ts`: import legacy local state for logged-in user.
- Create `server/test/*.test.mjs`: backend API tests using an in-memory fake repository through app injection.
- Modify `web/src/App.tsx`: use API-backed session state and route unauthenticated users to auth page.
- Create `web/src/utils/apiClient.ts`: typed fetch wrapper with credentials.
- Create `web/src/store/remotePetStore.ts`: API-backed state/actions matching the app needs.
- Create `web/src/pages/AuthPage.tsx`: child-friendly login/register view.
- Modify `web/src/pages/UserHubPage.tsx`: account dashboard, no local user creation.
- Modify `web/src/pages/FriendsPage.tsx`: friend search, request, visit, interaction UI.
- Modify `web/src/styles.css`: login and friend UI styles.
- Modify `web/nginx.conf`: proxy `/api/` to `server:3000`.
- Create `docker-compose.yml`: `web`, `server`, and `postgres` services.
- Create `server/Dockerfile`: build and run the API container.
- Create `.env.example`: deployment variables.
- Modify `web/package.json` only if new frontend scripts are needed.

## Task 1: Backend Auth Foundation

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/src/auth.ts`
- Create: `server/src/app.ts`
- Create: `server/src/index.ts`
- Create: `server/test/auth.test.mjs`

- [ ] **Step 1: Write the failing auth API test**

Create `server/test/auth.test.mjs` with tests that import `createApp` from `../dist/app.js` after compilation and verify:

```js
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

  const afterLogout = await app.inject({
    method: 'GET',
    url: '/api/me',
    headers: { cookie: String(cookie) },
  });
  assert.equal(afterLogout.statusCode, 401);

  await app.close();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd server && npm test -- auth.test.mjs
```

Expected: fails because `server/` package and `createApp` do not exist yet.

- [ ] **Step 3: Implement auth foundation**

Create package/config and implement:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`
- In-memory storage path for tests.
- Cookie name `petpet_session`.
- Password hashing through `argon2`.

- [ ] **Step 4: Run auth test to verify it passes**

Run:

```bash
cd server && npm install && npm run build && npm test -- auth.test.mjs
```

Expected: auth test passes.

## Task 2: Prisma Schema And Database Storage

**Files:**
- Create: `server/prisma/schema.prisma`
- Create: `server/src/db.ts`
- Modify: `server/src/app.ts`
- Modify: `server/src/auth.ts`
- Create: `server/test/schema.test.mjs`

- [ ] **Step 1: Write the failing schema test**

Create `server/test/schema.test.mjs` that reads `server/prisma/schema.prisma` and checks for models `User`, `Session`, `Pet`, `Achievement`, `DailyQuest`, `Friendship`, `PetVisit`, and `PetInteraction`.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd server && npm test -- schema.test.mjs
```

Expected: fails until Prisma schema exists.

- [ ] **Step 3: Implement Prisma schema**

Define PostgreSQL models matching the design document, using `String @id @default(uuid())`, `DateTime`, `Json`, and indexes for ownership and friend lookups.

- [ ] **Step 4: Run schema test and Prisma validation**

Run:

```bash
cd server && npm test -- schema.test.mjs && npx prisma validate
```

Expected: schema test and Prisma validation pass.

## Task 3: Server Pet State And Data Isolation

**Files:**
- Create: `server/src/petLogic.ts`
- Create: `server/src/routes/pets.ts`
- Modify: `server/src/app.ts`
- Create: `server/test/pets.test.mjs`

- [ ] **Step 1: Write the failing pet isolation test**

Create `server/test/pets.test.mjs` that:

- Registers user A and user B.
- User A creates a pet.
- User A can care for their pet.
- User B cannot care for user A's pet and gets 404 or 403.
- User A's `/api/me` returns the pet.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd server && npm run build && npm test -- pets.test.mjs
```

Expected: fails because pet routes do not exist.

- [ ] **Step 3: Implement pet routes and logic**

Implement:

- `POST /api/pets/adoptions/complete`
- `GET /api/pets`
- `POST /api/pets/:petId/care`
- `POST /api/pets/:petId/select`
- `POST /api/daily-quests/:petId/:stepId`
- `POST /api/achievements/:achievementId/unlock`

Use server-side versions of current pet creation, care, mood, achievements, and daily quest logic.

- [ ] **Step 4: Run pet tests**

Run:

```bash
cd server && npm run build && npm test -- pets.test.mjs
```

Expected: pet isolation test passes.

## Task 4: Friends, Visits, And Interactions

**Files:**
- Create: `server/src/routes/friends.ts`
- Modify: `server/src/app.ts`
- Create: `server/test/friends.test.mjs`

- [ ] **Step 1: Write the failing friends test**

Create `server/test/friends.test.mjs` that:

- Registers user A and user B.
- User A searches for user B by username.
- User A sends friend request to user B.
- User B accepts it.
- User A can list friendships.
- User A can visit user B's pet and create one `wave` interaction.
- Repeating the same interaction on the same pet in the same day is rejected.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd server && npm run build && npm test -- friends.test.mjs
```

Expected: fails because friend routes do not exist.

- [ ] **Step 3: Implement friend routes**

Implement:

- `GET /api/users/search`
- `GET /api/users/:userId/public`
- `POST /api/friendships`
- `POST /api/friendships/:friendshipId/accept`
- `GET /api/friendships`
- `GET /api/friends/:userId/pets`
- `POST /api/pets/:petId/visit`
- `POST /api/pets/:petId/interactions`

Interaction kinds: `wave`, `like`, `gift_sticker`, `encourage`, `play`.

- [ ] **Step 4: Run friends test**

Run:

```bash
cd server && npm run build && npm test -- friends.test.mjs
```

Expected: friends test passes.

## Task 5: Legacy Local Data Import

**Files:**
- Create: `server/src/routes/migration.ts`
- Modify: `server/src/app.ts`
- Create: `server/test/migration.test.mjs`

- [ ] **Step 1: Write the failing migration test**

Create `server/test/migration.test.mjs` that:

- Registers and logs in a user.
- Posts a legacy `petpet-planet.state.v2` shaped payload.
- Verifies imported pets are owned by the logged-in user.
- Verifies legacy users are not created as real accounts.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd server && npm run build && npm test -- migration.test.mjs
```

Expected: fails because migration route does not exist.

- [ ] **Step 3: Implement migration route**

Implement `POST /api/migrations/local-state` for logged-in users only. Validate the payload minimally, import pets, achievements, and daily quests into current account, and return an import summary.

- [ ] **Step 4: Run migration test**

Run:

```bash
cd server && npm run build && npm test -- migration.test.mjs
```

Expected: migration test passes.

## Task 6: Frontend Auth And Remote Store

**Files:**
- Create: `web/src/utils/apiClient.ts`
- Create: `web/src/store/remotePetStore.ts`
- Create: `web/src/pages/AuthPage.tsx`
- Modify: `web/src/App.tsx`
- Modify: `web/src/pages/UserHubPage.tsx`
- Modify: `web/src/styles.css`
- Create: `web/scripts/multi-user-app.test.mjs`

- [ ] **Step 1: Write the failing frontend integration checks**

Create `web/scripts/multi-user-app.test.mjs` that reads source files and verifies:

- `App.tsx` imports `AuthPage`.
- `App.tsx` uses `useRemotePetStore`.
- `apiClient.ts` sends `credentials: 'include'`.
- `remotePetStore.ts` does not write core state to `localStorage`.
- `AuthPage.tsx` contains login and register controls.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd web && node --test scripts/multi-user-app.test.mjs
```

Expected: fails because frontend auth files do not exist.

- [ ] **Step 3: Implement frontend auth and remote store**

Add API-backed store methods matching current `App.tsx` needs:

- `login`
- `register`
- `logout`
- `refresh`
- `completePendingAdoption`
- `doCare`
- `markDailyQuest`
- `unlock`
- `selectPet`

Update `App.tsx` to render `AuthPage` when unauthenticated.

- [ ] **Step 4: Run frontend checks**

Run:

```bash
cd web && node --test scripts/multi-user-app.test.mjs && npm run typecheck
```

Expected: frontend checks and typecheck pass.

## Task 7: Frontend Friends And Visits

**Files:**
- Modify: `web/src/pages/FriendsPage.tsx`
- Modify: `web/src/store/remotePetStore.ts`
- Modify: `web/src/App.tsx`
- Modify: `web/src/styles.css`
- Modify: `web/scripts/multi-user-app.test.mjs`

- [ ] **Step 1: Extend failing frontend checks for friends**

Update `web/scripts/multi-user-app.test.mjs` to verify `FriendsPage.tsx` renders user search, friend request, visit, and interaction controls and uses remote store actions.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd web && node --test scripts/multi-user-app.test.mjs
```

Expected: fails because friend UI is still empty or incomplete.

- [ ] **Step 3: Implement friend UI**

Implement:

- Username search input.
- Search results.
- Send friend request button.
- Friend list.
- Friend pet cards.
- Interaction buttons for `wave`, `like`, `gift_sticker`, `encourage`, and `play`.

- [ ] **Step 4: Run frontend checks**

Run:

```bash
cd web && node --test scripts/multi-user-app.test.mjs && npm run typecheck
```

Expected: tests and typecheck pass.

## Task 8: Docker Compose Deployment

**Files:**
- Create: `docker-compose.yml`
- Create: `server/Dockerfile`
- Create: `.env.example`
- Modify: `web/nginx.conf`
- Create: `scripts/deployment-smoke.test.mjs`

- [ ] **Step 1: Write failing deployment smoke checks**

Create `scripts/deployment-smoke.test.mjs` that checks:

- root `docker-compose.yml` has `web`, `server`, and `postgres` services.
- `web/nginx.conf` proxies `/api/` to `server:3000`.
- `server/Dockerfile` exists.
- `.env.example` includes `DATABASE_URL`, `SESSION_SECRET`, `POSTGRES_PASSWORD`.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test scripts/deployment-smoke.test.mjs
```

Expected: fails until deployment files exist.

- [ ] **Step 3: Implement deployment files**

Add Docker Compose, server Dockerfile, nginx `/api/` proxy, and env example.

- [ ] **Step 4: Run deployment smoke checks**

Run:

```bash
node --test scripts/deployment-smoke.test.mjs
```

Expected: deployment smoke checks pass.

## Task 9: Full Verification

**Files:**
- No new files.

- [ ] **Step 1: Run backend tests**

Run:

```bash
cd server && npm run build && npm test
```

Expected: all backend tests pass.

- [ ] **Step 2: Run frontend tests**

Run:

```bash
cd web && node --experimental-strip-types --test scripts/children-playground.test.mjs && node --test scripts/multi-user-app.test.mjs && npm run typecheck && npm run build
```

Expected: all frontend tests, typecheck, and build pass.

- [ ] **Step 3: Run deployment checks**

Run:

```bash
node --test scripts/deployment-smoke.test.mjs
```

Expected: deployment checks pass.

- [ ] **Step 4: Browser sanity check**

Start the app locally and verify:

- Unauthenticated users see login/register.
- Register creates a user.
- Create a pet after adoption challenge.
- Logout returns to auth page.

Expected: core flow works without console errors.
