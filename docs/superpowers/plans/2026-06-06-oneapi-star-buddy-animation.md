# OneAPI Speed-First Star Buddy Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `宠宠星宝` with a speed-first OneAPI provider that can route GPT/GLM-style models correctly, and turn the launcher into a lively animated character with expressions and function entrances.

**Architecture:** Keep the existing PetPet AI gateway and add a direct HTTP OneAPI provider behind the same `StarAiProvider` interface. The frontend remains provider-agnostic, but Star Buddy UI gains local animation states derived from loading, mode, and response emotion.

**Tech Stack:** Fastify, Node.js `fetch`, Node test runner, TypeScript, React, CSS animations.

---

## Implementation Tasks

### Task 1: Backend OneAPI Provider Tests

**Files:**
- Modify: `server/test/ai.test.mjs`

- [ ] Add tests that mock `global.fetch` and verify:
  - `AI_PROVIDER=oneapi` with `AI_MODEL_STRATEGY=speed-first` chooses `GLM-5-Turbo` and `/v1/chat/completions` for `chat`.
  - `story` chooses `AI_SMART_MODEL` when configured.
  - GPT model names use `/v1/responses`.
  - HTML content-type or non-JSON responses fall back safely.

### Task 2: OneAPI Provider

**Files:**
- Create: `server/src/ai/providers/oneApiProvider.ts`
- Modify: `server/src/ai/providers/index.ts`

- [ ] Add `OneApiStarAiProvider`.
- [ ] Environment:
  - `AI_PROVIDER=oneapi`
  - `ONEAPI_TOKEN` or `AI_API_KEY`
  - `AI_BASE_URL`, default `https://oneapi-comate.baidu-int.com`
  - `AI_FAST_MODEL`, default `GLM-5-Turbo`
  - `AI_SMART_MODEL`, default `GPT-5.4-Mini`
  - `AI_MODEL_STRATEGY=speed-first`
- [ ] Route model families:
  - `GPT-*` or `gpt-*` -> `/v1/responses`
  - `Claude*` -> `/v1/messages`
  - otherwise -> `/v1/chat/completions`
- [ ] Choose model by mode:
  - `care-plan`, `chat`, `quiz` -> fast model
  - `story` -> smart model
- [ ] Validate HTTP status and content type before parsing.
- [ ] Extract text from Responses, Chat Completions, and Messages formats.

### Task 3: Star Buddy Emotion And Action Metadata

**Files:**
- Modify: `server/src/ai/types.ts`
- Modify: `server/src/ai/safety.ts`
- Modify: `web/src/models/starBuddy.ts`

- [ ] Add frontend/backend-compatible emotion vocabulary:
  - `encourage`, `celebrate`, `gentle`, `curious`, `thinking`, `sleepy`
- [ ] Keep existing response shapes backward compatible.

### Task 4: Animated Star Buddy Character

**Files:**
- Modify: `web/src/components/StarBuddyPanel.tsx`
- Modify: `web/src/styles.css`

- [ ] Replace static launcher with an animated character button:
  - floating body
  - face with eyes and mouth
  - sparkles
  - expression class from loading/mode/response emotion
- [ ] First click opens a radial/compact entrance menu:
  - 照顾
  - 问问
  - 故事
  - 出题
- [ ] Selecting an entrance opens/updates the existing panel.
- [ ] Add states:
  - idle: floating
  - thinking: pulse/spin sparkle
  - celebrate: bounce
  - gentle: soft sway
  - curious: tilt
- [ ] Preserve accessibility with text labels and buttons.

### Task 5: Verification

**Files:**
- No direct code files unless fixes are needed.

- [ ] Run `cd server && npm run build && AI_PROVIDER=mock npm test`.
- [ ] Run `cd web && npm run typecheck && npm run build`.
- [ ] Rebuild Docker with `AI_PROVIDER=mock docker compose up -d --build web server`.
- [ ] Browser verify:
  - star buddy character appears
  - tap opens entrance menu
  - entrance buttons call modes
  - loading/thinking state appears
  - quiz remains interactive
  - mobile panel does not cover bottom nav.
