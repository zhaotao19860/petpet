# Browser Read Aloud Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve Star Buddy's free browser-based read aloud experience without adding paid TTS services.

**Architecture:** Move speech text preparation and voice preference into a focused utility, then let `StarBuddyPanel` manage a small read-aloud queue with play, pause, resume, stop, and visible progress. Keep browser `speechSynthesis` as the only output engine.

**Tech Stack:** React, TypeScript, Web Speech API, Node test runner, Vite.

---

### Task 1: Speech Helper

**Files:**
- Create: `web/src/utils/browserSpeech.ts`
- Modify: `web/scripts/star-buddy-play.test.mjs`

- [ ] Add tests for chunking long Chinese stories into speakable parts.
- [ ] Add tests for preferring natural Mandarin voices over generic defaults.
- [ ] Implement `splitSpeechText`, `chooseBestChineseVoice`, and `getSpeechSettings`.
- [ ] Run `cd web && npm run starbuddy:test`.

### Task 2: Star Buddy Playback

**Files:**
- Modify: `web/src/components/StarBuddyPanel.tsx`
- Modify: `web/src/styles.css`
- Modify: `web/scripts/star-buddy-play.test.mjs`

- [ ] Add tests that Star Buddy imports the speech helper and exposes play, pause/resume, stop, and progress controls.
- [ ] Replace single-utterance speaking with a chunk queue.
- [ ] Load voices with `voiceschanged`.
- [ ] Use slower story settings and slightly quicker question settings.
- [ ] Update controls to large child-friendly buttons.
- [ ] Run `cd web && npm run starbuddy:test && npm run build`.

### Task 3: Local Verification

**Files:**
- No source file changes expected.

- [ ] Rebuild or reload the local app.
- [ ] Open `http://127.0.0.1/` in the in-app browser.
- [ ] Verify the Star Buddy panel shows simple read controls and progress.
