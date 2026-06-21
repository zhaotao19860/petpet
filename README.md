# petpet

petpet is a kid-friendly virtual pet world for observing real animals, learning safe care habits, and completing playful knowledge challenges. The app combines a React web experience, a Fastify API, PostgreSQL persistence, and optional AI-powered pet companion features.

## Highlights

- Multi-user accounts with session cookies and PostgreSQL-backed data.
- Pet adoption flow with animal selection, adoption challenges, care actions, daily quests, and achievements.
- Real-animal learning content with habitats, habits, safe and unsafe foods, conservation notes, and 30-stage growth arcs.
- Game and learning areas for quizzes, mini games, friends, sound play, and story-style exploration.
- Star Buddy AI routes for chat, care plans, stories, quizzes, speech-to-text, and text-to-speech.
- Docker Compose deployment with PostgreSQL, the API server, and the web frontend.

## Project Layout

```text
.
├── server/                 # Fastify API, Prisma models, tests, AI providers
├── web/                    # React + Vite frontend and asset pipelines
├── Sources/PetPet/         # SwiftUI package prototype
├── scripts/                # Deployment checks and animal asset restore scripts
├── docs/                   # Detailed deployment and provider notes
├── docker-compose.yml      # Full PostgreSQL + API + web stack
├── DEPLOYMENT.md           # Quick multi-user deployment notes
└── CHANGELOG.md            # Release history
```

## Requirements

- Node.js 20 or newer is recommended for local development.
- npm, Docker, and Docker Compose for the full stack.
- PostgreSQL when running the API outside Docker.
- curl and tar for restoring released animal assets.

## Quick Start With Docker

```bash
cp .env.example .env
./scripts/download-animal-assets.sh
docker compose up --build
```

Open `http://localhost` after the containers are ready. Change `WEB_PORT` in `.env` if port `80` is already in use.

Before using this outside local development, update at least `POSTGRES_PASSWORD`, `DATABASE_URL`, `SESSION_SECRET`, and `COOKIE_SECURE`.

## Local Development

Install dependencies separately for the API and web app:

```bash
cd server
npm install

cd ../web
npm install
```

For a full local stack, use Docker Compose. For frontend iteration with a temporary in-memory API, build the server once and start it directly:

```bash
cd server
npm run build
node --input-type=module -e "import { createApp } from './dist/app.js'; const app = await createApp({ storage: 'memory' }); await app.listen({ host: '0.0.0.0', port: 3000 });"
```

Then run the web app in another terminal:

```bash
cd web
npm run dev
```

Open `http://localhost:5173`.

## Useful Commands

```bash
cd server && npm run build
cd server && npm test
cd web && npm run typecheck
cd web && npm run build
node --test scripts/deployment-smoke.test.mjs
```

Frontend asset helpers:

```bash
cd web
npm run images:build
npm run sounds:build
npm run sounds:test
npm run starbuddy:test
```

## Animal Assets

The large animal source images are intentionally not committed to Git. Restore the released WebP/SVG-ready asset set before building fresh deployments:

```bash
./scripts/download-animal-assets.sh
```

The frontend expects animal assets under `web/public/assets/animals/`. The app uses generated WebP images and thumbnails, with fallback paths kept in the animal data model.

## Configuration

Start from `.env.example`. Important settings include:

- `DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` for PostgreSQL.
- `SESSION_SECRET`, `COOKIE_SECURE`, and `CORS_ORIGIN` for authentication and browser access.
- `AI_PROVIDER`, `AI_BASE_URL`, `ONEAPI_TOKEN`, and model settings for Star Buddy.
- `TTS_PROVIDER` and TTS settings for text-to-speech.
- `STT_PROVIDER`, `CLOUDFLARE_ACCOUNT_ID`, and `CLOUDFLARE_API_TOKEN` for speech-to-text.

If no production AI provider is configured, the server can use mock behavior for development.

## Deployment Notes

- `DEPLOYMENT.md` covers the standard Docker Compose setup.
- `docs/linux-deployment.md` covers a low-resource CentOS + Caddy deployment.
- `docs/home-mac-vps-frp-deployment.md` covers home Mac plus VPS/FRP deployment.
- `docs/cloudflare-workers-ai-stt.md` covers Cloudflare Workers AI speech-to-text setup.
- `web/deploy.md` covers static frontend and web container deployment details.

For production, serve HTTPS, keep `COOKIE_SECURE=true`, do not expose PostgreSQL publicly, and store uploaded pet sounds in persistent storage.
