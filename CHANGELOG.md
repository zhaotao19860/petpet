# Changelog

All notable changes to petpet are documented in this file.

## [0.1.0] - 2026-06-21

### Added

- Added the initial petpet multi-user virtual pet app.
- Added a React + Vite web frontend with pet selection, adoption challenges, home care, learning, games, friends, achievements, and mobile-friendly navigation.
- Added a Fastify API with authentication, sessions, pets, care actions, daily quests, achievements, friends, migrations, pet sound routes, and AI routes.
- Added PostgreSQL persistence through Prisma, plus an in-memory repository path for local development and tests.
- Added Star Buddy AI support for chat, care plans, stories, quizzes, speech-to-text, and text-to-speech.
- Added real-animal data for multiple animal categories, including safe care notes, habitats, habits, food guidance, conservation context, and 30-stage growth arcs.
- Added Docker Compose deployment for PostgreSQL, the API server, and the web frontend.
- Added deployment documentation for Docker, Linux/Caddy, home Mac plus VPS/FRP, and Cloudflare Workers AI STT.

### Changed

- Restored the project tree after asset and build cleanup work.
- Added thumbnail fallback support for animal growth images.
- Documented the animal asset restore workflow.

### Notes

- Large animal source assets are not stored in Git. Restore released animal assets with `./scripts/download-animal-assets.sh` before building on a fresh machine.
