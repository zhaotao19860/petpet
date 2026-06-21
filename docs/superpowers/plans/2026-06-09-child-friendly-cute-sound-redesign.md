# Child-Friendly Cute Sound Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the animal sound pack so vocal animals sound real, friendly, and clear, while quiet animals use related cute generated textures instead of mismatched animal calls.

**Architecture:** Keep the existing `/assets/sounds/{animalId}/{soundType}.wav` app contract. Add sound strategy metadata to the catalog, teach the builder to respect real-vocal versus cute-designed animals, and extend tests to audit source strategy, noise/volume, and manifest metadata.

**Tech Stack:** Node asset scripts, Freesound/Wikimedia cached source audio, generated WAV synthesis, ffmpeg-static, React/Vite public assets.

---

### Task 1: Add Strategy Tests

**Files:**
- Modify: `web/scripts/sound-pipeline.test.mjs`

- [ ] Add tests that require quiet animals to use `related-cute-design` or `generated-related-cute` metadata instead of fake vocal recordings.
- [ ] Add tests that require vocal animals to keep real-backed `joy/happy/sad/angry` clips.
- [ ] Add tests that require every generated WAV to meet child-friendly loudness and silence thresholds.
- [ ] Run `npm run sounds:test` and confirm the new tests fail against the old pipeline.

### Task 2: Add Catalog Strategy Metadata

**Files:**
- Modify: `web/scripts/sound-source-catalog.mjs`

- [ ] Export `quietCuteSoundAnimalIds`.
- [ ] Add `soundStrategy` to each animal entry: `real-vocal` or `related-cute-design`.
- [ ] Add cute design descriptors for quiet animals, such as flutter, tiny steps, bubbles, shell taps, mossy steps, and leafy rustles.
- [ ] Run `npm run sounds:test` and confirm tests still fail until the builder uses the metadata.

### Task 3: Update Builder Strategy

**Files:**
- Modify: `web/scripts/build-real-sound-assets.mjs`

- [ ] Import `quietCuteSoundAnimalIds`.
- [ ] For quiet cute animals, do not retain or resolve substitute animal vocal sources for mood clips.
- [ ] Generate `joy/angry/sad/happy` using related cute procedural textures.
- [ ] Keep `eat/drink/sleep` as real foley if available, otherwise generated related action textures.
- [ ] Add manifest fields: `soundStrategy`, `designedFor`, and `qualityProfile`.
- [ ] Improve final polish thresholds so clips are clear but not harsh.

### Task 4: Rebuild and Audit Assets

**Files:**
- Generate: `web/public/assets/sounds/**/*.wav`
- Generate: `web/public/assets/sounds/manifest.json`

- [ ] Run `npm run sounds:build`.
- [ ] Run `npm run sounds:test`.
- [ ] Run a metrics script to summarize source strategy counts, RMS range, peak range, and quiet clips.
- [ ] Run `npm run build`.
- [ ] Rebuild local Docker web service.
