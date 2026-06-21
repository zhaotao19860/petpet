# Child-Friendly Real Sounds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the rough synthetic-heavy sound set with traceable real or real-layered child-friendly animal sounds for the existing 30 animals.

**Architecture:** Keep the current public asset path contract. Extend the Node asset pipeline to search Freesound with an environment token, download previews, convert them to WAV, create soft mood/action clips, write richer manifest metadata, and keep procedural audio only as last resort.

**Tech Stack:** Vite, React, TypeScript, Node scripts, Freesound API preview audio, Wikimedia Commons, `ffmpeg-static`, browser `Audio`.

---

### Task 1: Tests For Better Sound Quality Metadata

**Files:**
- Modify: `web/scripts/sound-pipeline.test.mjs`

- [ ] Add tests that require each manifest clip to include provider/license/source metadata.
- [ ] Add tests that require generated WAV files to be short, audible, and not clipped.
- [ ] Add tests that require improved real-source coverage versus the old 6-real-animal baseline.

### Task 2: Source Catalog Upgrade

**Files:**
- Modify: `web/scripts/sound-source-catalog.mjs`

- [ ] Add Freesound-friendly animal query metadata without storing credentials.
- [ ] Add shared action layer profiles for eating, drinking, and sleeping.
- [ ] Add source exclusion keywords for music, speech, toys, horror, and synthetic effects.
- [ ] Export helper data used by tests and the build script.

### Task 3: Real Child-Friendly Build Pipeline

**Files:**
- Modify: `web/scripts/build-real-sound-assets.mjs`

- [ ] Read Freesound API key from `FREESOUND_API_KEY` or `FREESOUND_TOKEN`.
- [ ] Search Freesound API previews when a key is available.
- [ ] Keep Wikimedia Commons manual candidates as curated sources.
- [ ] Build action clips from real action/environment layers.
- [ ] Add trim, fade, soft limiting, loudness normalization, and clip duration checks.
- [ ] Write richer manifest metadata without local paths or credentials.

### Task 4: Playback Type Support

**Files:**
- Modify: `web/src/utils/petSounds.ts`

- [ ] Accept the new manifest clip kinds.
- [ ] Keep current preload/playback behavior and WebAudio fallback.

### Task 5: Build Assets And Verify

**Files:**
- Generated: `web/public/assets/sounds/**/*.wav`
- Generated: `web/public/assets/sounds/manifest.json`

- [ ] Run the sound build with the Freesound key provided for this session.
- [ ] Run `npm run sounds:test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Inspect the manifest coverage report and note any remaining procedural fallbacks.
