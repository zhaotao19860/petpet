# Children Playground Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first large-version child playground experience with a planet-map home, daily quest loop, richer encyclopedia cards, and four mini-games.

**Architecture:** Add small focused React components that reuse existing animal, pet, sound, and challenge data. Keep navigation in the existing app state model, expand challenge generation in utilities, and store daily progress locally inside the current pet store rather than adding external services.

**Tech Stack:** React, TypeScript, Vite, localStorage-backed store, CSS, existing local audio assets.

---

### Task 1: Daily Quest And Expanded Challenge Data

**Files:**
- Create: `web/src/utils/dailyTasks.ts`
- Modify: `web/src/utils/challenges.ts`
- Modify: `web/src/store/petStore.ts`

- [ ] Add daily task types for care, learn, play, reward.
- [ ] Add store state and actions for marking daily quest steps.
- [ ] Expand generated questions to include food, unsafe food, habitat, behavior, rest, growth, safety, and conservation.
- [ ] Verify with `npm run typecheck`.

### Task 2: Planet Map Home

**Files:**
- Create: `web/src/components/PlanetMap.tsx`
- Create: `web/src/components/DailyQuestStrip.tsx`
- Modify: `web/src/pages/HomePage.tsx`
- Modify: `web/src/styles.css`

- [ ] Replace the portal-card feel with a map-like zone layout.
- [ ] Add daily quest progress to the home page.
- [ ] Keep existing care actions and status visible.
- [ ] Verify mobile and desktop layout manually.

### Task 3: Encyclopedia Cards And Mini Quiz

**Files:**
- Create: `web/src/components/FactCards.tsx`
- Modify: `web/src/pages/StoryLearnPage.tsx`
- Modify: `web/src/styles.css`

- [ ] Add fact cards for habitat, food, rest, behavior, safety, growth, and health.
- [ ] Add a small quiz using expanded questions.
- [ ] Mark learn progress when the page is used.
- [ ] Verify with several animal categories.

### Task 4: Mini-Game Hub

**Files:**
- Create: `web/src/components/MiniGameHub.tsx`
- Create: `web/src/components/games/SoundSafari.tsx`
- Create: `web/src/components/games/FoodSorter.tsx`
- Create: `web/src/components/games/HabitatMatch.tsx`
- Create: `web/src/components/games/MemoryCards.tsx`
- Modify: `web/src/pages/ChallengePage.tsx`
- Modify: `web/src/styles.css`

- [ ] Add a game hub with four game cards.
- [ ] Implement Sound Safari with existing sounds.
- [ ] Implement Food Sorter with tap-to-bucket interaction.
- [ ] Implement Habitat Match with current animal data.
- [ ] Implement Memory Cards with a small deterministic board.
- [ ] Mark play progress when a game completes.

### Task 5: Rewards, Polish, And Verification

**Files:**
- Modify: `web/src/store/petStore.ts`
- Modify: `web/src/pages/AchievementsPage.tsx` if needed.
- Modify: `web/src/styles.css`

- [ ] Add or reuse achievements for sound game, food helper, habitat finder, memory master, daily explorer.
- [ ] Add child-friendly success and retry feedback states.
- [ ] Run `npm run typecheck`, `npm run sounds:test`, and `npm run build`.
- [ ] Start local server and inspect desktop/mobile views.

