# PetPet Multi-User Deployment

## Local Demo On Mac

Install Docker Desktop first if you want the PostgreSQL version locally.

```bash
cp .env.example .env
docker compose up --build
```

Open `http://localhost` after the containers are ready.

For frontend-only iteration with a temporary in-memory API:

```bash
cd server
npm install
npm run build
node --input-type=module -e "import { createApp } from './dist/app.js'; const app = await createApp({ storage: 'memory' }); await app.listen({ host: '0.0.0.0', port: 3000 });"
```

In another terminal:

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:5173`.

## Linux Server

1. Install Docker Engine and Docker Compose plugin.
2. Copy the project to the server.
3. Create `.env` from `.env.example`.
4. Change `POSTGRES_PASSWORD`, `DATABASE_URL`, and `SESSION_SECRET`.
5. Set `COOKIE_SECURE=true` when serving through HTTPS.
6. Run:

```bash
docker compose up -d --build
```

The `server` container runs Prisma migrations before starting the API. PostgreSQL data is stored in the named Docker volume `petpet-postgres-data`.

## Useful Checks

```bash
cd server && npm run build && npm test
cd web && npm run typecheck && npm run build
node --test scripts/deployment-smoke.test.mjs
```
