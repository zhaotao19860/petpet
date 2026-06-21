# Real Animal Sounds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace synthetic local demo sounds with traceable real or real-derived animal audio for all 30 animals and wire playback more robustly into the existing app.

**Architecture:** Keep the existing `/assets/sounds/{animalId}/{soundType}.wav` contract so UI code changes stay small. Add a reusable Node-based asset pipeline that downloads public/non-commercial demo audio where possible, derives seven interaction variants per animal, and writes a JSON manifest with source and fallback metadata.

**Tech Stack:** Vite, React, TypeScript, browser `Audio`, Node scripts, built-in Node APIs, optional system `ffmpeg` when available.

---

### Task 1: Sound Source Manifest And Pipeline

**Files:**
- Create: `web/scripts/sound-source-catalog.mjs`
- Create: `web/scripts/build-real-sound-assets.mjs`
- Create: `web/public/assets/sounds/manifest.json`
- Modify: `web/package.json`

- [ ] Add a catalog that maps each animal to one or more downloadable or fallback source candidates.
- [ ] Add a build script that attempts downloads, records source metadata, and derives `joy`, `angry`, `sad`, `happy`, `eat`, `drink`, and `sleep` wav files for every animal.
- [ ] Preserve current path names so existing app references keep working.
- [ ] Add `sounds:build` npm script.

### Task 2: Playback Metadata And Reliability

**Files:**
- Modify: `web/src/utils/petSounds.ts`

- [ ] Add a typed sound manifest shape.
- [ ] Preload likely sound files in a small in-memory cache.
- [ ] Stop duplicate sound spam by cloning cached audio for each playback and falling back cleanly if a file is missing.
- [ ] Keep the current generated WebAudio tone as final fallback.

### Task 3: Verification

**Files:**
- Generated: `web/public/assets/sounds/**/*.wav`
- Generated: `web/public/assets/sounds/manifest.json`

- [ ] Run the sound build script and confirm 210 wav files exist.
- [ ] Run TypeScript/build verification.
- [ ] Inspect the manifest for source/fallback coverage.
- [ ] Start the local app and verify interaction playback loads the new paths.

