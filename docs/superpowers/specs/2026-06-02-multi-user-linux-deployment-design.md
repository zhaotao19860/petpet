# Multi-User Linux Deployment Design

## Goal

Upgrade PetPet from a local single-browser demo into a deployable multi-user web app with username/password login, server-side data isolation, friend visits, lightweight pet interactions, and Docker Compose deployment on Linux.

## Current State

The current app is a Vite React frontend. Core user, pet, achievement, and daily quest data is stored in browser `localStorage` under `petpet-planet.state.v2`. The UI already has a local "observer" model, but there is no real authentication, API server, database, or cross-device persistence. The existing `web/Dockerfile` builds the frontend and serves it with nginx.

## Architecture

Use a three-service application:

- `web`: existing React/Vite app, built into static files and served by nginx.
- `server`: new Node API service.
- `postgres`: PostgreSQL database.

The Linux deployment entrypoint is Docker Compose. The web container exposes HTTP, serves the frontend, and proxies `/api/*` requests to the server container. The server container connects to PostgreSQL through internal Docker networking.

## Backend Stack

Use:

- Node.js with Fastify.
- Prisma for database schema, migrations, and typed data access.
- PostgreSQL for persistent user and pet data.
- Argon2 for password hashing.
- HttpOnly cookie sessions stored in the database.

Fastify is preferred because it gives a clean plugin structure and straightforward request hooks for authentication. Prisma is preferred because the app will gain several related tables and needs clear migrations for Linux deployment.

## Authentication

First version supports username and password:

- Register with `username`, `password`, and optional display name.
- Username must be unique.
- Password is hashed with Argon2 before storage.
- Login creates a database-backed session and returns a secure HttpOnly cookie.
- Logout deletes the current session and clears the cookie.
- `/api/me` returns the current user, owned pets, selected pet, achievements, and daily quest summary.

The frontend never stores auth tokens in `localStorage`. Session cookies are not readable by JavaScript.

## Data Isolation

Every authenticated request resolves `currentUserId` from the session. Write APIs only operate on rows owned by `currentUserId`.

Isolation rules:

- A user can create, update, care for, dress, and select only their own pets.
- A user can unlock or read only their own achievements.
- A user can update only their own daily quests.
- A user can read another user's public profile only through explicit public/friend APIs.
- A user cannot mutate another user's pet through normal care APIs.

Backend authorization is mandatory even if the frontend hides unavailable actions.

## Data Model

Tables:

- `users`: account identity and public profile.
- `sessions`: persistent login sessions.
- `pets`: all pet state, owned by `users.id`.
- `achievements`: per-user unlocked achievement state.
- `daily_quests`: per-user/per-pet daily task progress.
- `friendships`: friend requests and accepted friendships.
- `pet_visits`: visit history for social spaces.
- `pet_interactions`: lightweight interactions users perform on other users' pets.

Suggested fields:

- `users`: `id`, `username`, `passwordHash`, `displayName`, `createdAt`, `updatedAt`.
- `sessions`: `id`, `userId`, `expiresAt`, `createdAt`.
- `pets`: `id`, `userId`, `animalTypeId`, `name`, `birthday`, `lastUpdatedAt`, `speedMultiplier`, `mood`, `hunger`, `thirst`, `energy`, `happiness`, `health`, `hygiene`, `stress`, `isSick`, `outfitIds`, `friendIds`, `createdAt`, `updatedAt`.
- `achievements`: `id`, `userId`, `achievementId`, `unlockedAt`, `createdAt`.
- `daily_quests`: `id`, `userId`, `petId`, `dateKey`, `stepsJson`, `stars`, `createdAt`, `updatedAt`.
- `friendships`: `id`, `requesterId`, `addresseeId`, `status`, `createdAt`, `updatedAt`.
- `pet_visits`: `id`, `visitorId`, `ownerId`, `petId`, `createdAt`.
- `pet_interactions`: `id`, `actorId`, `ownerId`, `petId`, `kind`, `createdAt`.

## API Surface

Authentication:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`

Pets:

- `GET /api/pets`
- `POST /api/pets/adoptions/pending`
- `POST /api/pets/adoptions/complete`
- `POST /api/pets/:petId/care`
- `POST /api/pets/:petId/select`

Achievements and daily quests:

- `POST /api/achievements/:achievementId/unlock`
- `POST /api/daily-quests/:petId/:stepId`

Friends and visits:

- `GET /api/users/search?username=...`
- `GET /api/users/:userId/public`
- `POST /api/friendships`
- `POST /api/friendships/:friendshipId/accept`
- `GET /api/friendships`
- `GET /api/friends/:userId/pets`
- `POST /api/pets/:petId/visit`
- `POST /api/pets/:petId/interactions`

## Social Interaction Rules

First version supports a safe child-friendly interaction loop:

- Search another user by username.
- Send and accept friend requests.
- Visit a friend's pet space.
- Perform lightweight interactions such as `wave`, `like`, `gift_sticker`, `encourage`, and `play`.
- Store each interaction as an event.
- Rate limit cross-user pet interactions, for example one interaction kind per actor/pet per day.

Cross-user interactions should not directly damage or drain a pet. If an interaction changes pet state, it can only improve small positive values such as happiness, and it must be capped.

## Frontend Changes

Replace local core persistence with API calls:

- Add login/register screen before the app shell when unauthenticated.
- Load user state from `/api/me`.
- Move pet creation, adoption challenge completion, care, achievements, and daily quest updates to API calls.
- Keep sound preference in `localStorage` because it is a device preference.
- Keep existing child-friendly UI visual direction.
- Add friend search, friend list, friend pet visit, and interaction controls.

The existing local user hub becomes an account/pet dashboard after login.

## Local Data Migration

If `localStorage.petpet-planet.state.v2` exists after login:

- Show an import option: "导入本机旧宠物".
- Send the old local users, pets, achievements, and daily quests to a migration API owned by the current account.
- The server creates pets and state for the logged-in user.
- The frontend records a local import marker after success to avoid repeated prompts.

The migration should not import local "users" as real accounts automatically. They should become pet groups or be merged into the current account's pets in the first version.

## Deployment

Add root-level deployment files:

- `docker-compose.yml`
- `server/Dockerfile`
- updated `web/nginx.conf`
- `.env.example`

Services:

- `web`: serves frontend and proxies `/api` to `server:3000`.
- `server`: runs migrations then starts Fastify API.
- `postgres`: stores data in a named Docker volume.

Required environment variables:

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `DATABASE_URL`
- `SESSION_SECRET`
- `COOKIE_SECURE`
- `CORS_ORIGIN`

Local development can run `postgres` through Docker Compose and run `web` and `server` with npm scripts.

## Testing

Backend tests:

- Register/login/logout.
- Password is not stored in plain text.
- Unauthenticated API requests are rejected.
- User A cannot mutate User B's pet.
- Friend request and accept flow.
- Friend visit and interaction event creation.
- Interaction rate limiting.
- Local data import maps legacy data into the logged-in account only.

Frontend tests:

- Unauthenticated users see login/register.
- Authenticated users see their own pets.
- Care and daily quest actions call API paths.
- Friend search and visit views render expected child-friendly controls.
- Sound preference remains local.

Deployment checks:

- `docker compose up` starts web, server, and postgres.
- `GET /api/health` returns healthy.
- Web root loads static app.
- `/api` is proxied correctly from web container to server.

## Non-Goals For First Version

- SMS login.
- OAuth login.
- Payments.
- Real-time chat.
- Push notifications.
- Admin moderation console.
- Multi-region deployment.

## Open Decisions

No open product decisions remain for the first implementation pass. The selected direction is username/password auth, Node Fastify API, PostgreSQL, Prisma, and Docker Compose deployment.
