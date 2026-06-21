# Star Buddy Core Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn 宠宠星宝 from an AI launcher into a playful companion loop with tap reactions, daily mini-missions, richer AI cards, sticker rewards, and short UI sounds.

**Architecture:** Keep the existing Star Buddy API and React component. Add small frontend-only state helpers for tap reactions and mission presentation, reuse existing daily quest APIs for persistence, reuse the current celebration toast for sticker feedback, and extend the existing procedural sound utilities for Star Buddy UI sounds. No new database table is needed for this version.

**Tech Stack:** React, TypeScript, CSS animations, existing Fastify/Node test runner, existing browser verification workflow.

---

## File Structure

- Create `web/src/utils/starBuddyPlay.ts`
  - Owns pure helper logic for tap reactions, mission cards, and reward labels.
  - Exported functions should be deterministic enough to test with plain Node after TypeScript build.
- Modify `web/src/components/StarBuddyPanel.tsx`
  - Adds tap reaction state, mission strip inside Star Buddy panel, richer response cards, quiz reward callback, and entry behavior.
- Modify `web/src/pages/HomePage.tsx`
  - Passes daily quest progress and callbacks into `StarBuddyPanel`.
- Modify `web/src/App.tsx`
  - Adds a Star Buddy sticker celebration path and passes `markDailyQuest` / celebration callback down.
- Modify `web/src/components/CelebrationToast.tsx`
  - Adds a more sticker-like visual option while preserving existing achievement toast behavior.
- Modify `web/src/utils/petSounds.ts`
  - Adds `playStarBuddySound(kind)` using the existing sound enabled preference and WebAudio pattern.
- Modify `web/src/styles.css`
  - Adds Star Buddy mission strip, tap toast, card, reward, and extra action animation styles.
- Create `web/scripts/star-buddy-play.test.mjs`
  - Tests helper contracts with source-inspection Node tests because this project does not have a frontend unit-test runtime configured.
- Modify `web/package.json`
  - Add `starbuddy:test` script using Node source-inspection tests.

## Existing Context To Preserve

- `StarBuddyPanel` already renders the Star Buddy launcher, entrance menu, AI panel, and quiz card.
- `DailyQuestStrip` and `dailyTasks.ts` already define `care`, `learn`, `play`, and `reward`.
- `App.tsx` already has `showCelebration` and `claimDailyReward`.
- `petSounds.ts` already has sound preference logic and procedural quiz feedback sounds.
- The app uses no frontend unit test framework, so verification is mostly `npm run typecheck`, `npm run build`, browser checks, and Node source tests where useful.

---

## Task 1: Add Star Buddy Play Helpers

**Files:**
- Create: `web/src/utils/starBuddyPlay.ts`
- Create: `web/scripts/star-buddy-play.test.mjs`
- Modify: `web/package.json`

- [ ] **Step 1: Add source-inspection test for helper exports**

Create `web/scripts/star-buddy-play.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const helperSource = () => readFileSync(resolve(import.meta.dirname, '../src/utils/starBuddyPlay.ts'), 'utf8');

test('star buddy play helper exports stable contracts', () => {
  const source = helperSource();

  assert.match(source, /export type StarBuddyActionName = /);
  assert.match(source, /export interface StarBuddyReaction/);
  assert.match(source, /export interface StarBuddyMissionCard/);
  assert.match(source, /export function getStarBuddyReaction/);
  assert.match(source, /export function getStarBuddyMissionCards/);
  assert.match(source, /export function getStarBuddyRewardCopy/);
});

test('star buddy missions cover care learn play without adding backend concepts', () => {
  const source = helperSource();

  assert.match(source, /stepId: 'care'/);
  assert.match(source, /stepId: 'learn'/);
  assert.match(source, /stepId: 'play'/);
  assert.doesNotMatch(source, /stepId: 'reward'[\s\S]*领取贴纸/, 'reward remains handled by the existing daily reward flow');
});

test('tap reactions define five child-friendly action names', () => {
  const source = helperSource();
  const actions = ['bounce', 'spin', 'wink', 'sparkle', 'tilt'];

  for (const action of actions) {
    assert.match(source, new RegExp(`action: '${action}'`));
  }
});
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
cd /Users/tom/Desktop/github/petpet/web
node --test scripts/star-buddy-play.test.mjs
```

Expected: fails because `web/src/utils/starBuddyPlay.ts` does not exist.

- [ ] **Step 3: Implement helper module**

Create `web/src/utils/starBuddyPlay.ts`:

```ts
import type { DailyQuestProgress, DailyQuestStepId } from './dailyTasks';

export type StarBuddyActionName = 'bounce' | 'spin' | 'wink' | 'sparkle' | 'tilt';
export type StarBuddySoundKind = 'tap' | 'open' | 'reward' | 'correct' | 'gentle';

export interface StarBuddyReaction {
  action: StarBuddyActionName;
  message: string;
  sound: StarBuddySoundKind;
}

export interface StarBuddyMissionCard {
  stepId: Exclude<DailyQuestStepId, 'reward'>;
  icon: string;
  title: string;
  hint: string;
  done: boolean;
  cta: string;
}

const reactions: StarBuddyReaction[] = [
  { action: 'bounce', message: '我在这里呢！', sound: 'tap' },
  { action: 'spin', message: '一起照顾小动物吧。', sound: 'tap' },
  { action: 'wink', message: '我发现了一个小秘密。', sound: 'tap' },
  { action: 'sparkle', message: '今天也温柔一点点。', sound: 'tap' },
  { action: 'tilt', message: '要不要先看看它需要什么？', sound: 'tap' },
];

export function getStarBuddyReaction(seed = Date.now()): StarBuddyReaction {
  const index = Math.abs(Math.floor(seed)) % reactions.length;
  return reactions[index];
}

export function getStarBuddyMissionCards(progress?: DailyQuestProgress): StarBuddyMissionCard[] {
  return [
    {
      stepId: 'care',
      icon: '🫶',
      title: '照顾一个',
      hint: '吃饭、喝水或安静观察都可以',
      done: Boolean(progress?.steps.care.done),
      cta: '去照顾',
    },
    {
      stepId: 'learn',
      icon: '🔍',
      title: '学一个',
      hint: '问星宝一个动物小秘密',
      done: Boolean(progress?.steps.learn.done),
      cta: '问问看',
    },
    {
      stepId: 'play',
      icon: '⭐',
      title: '玩一个',
      hint: '答一道题或去游戏空间',
      done: Boolean(progress?.steps.play.done),
      cta: '来出题',
    },
  ];
}

export function getStarBuddyRewardCopy(stepId: DailyQuestStepId) {
  if (stepId === 'care') {
    return { title: '照顾星星贴纸', detail: '你完成了一次温柔照顾。' };
  }
  if (stepId === 'learn') {
    return { title: '小秘密贴纸', detail: '你发现了一个动物知识。' };
  }
  if (stepId === 'play') {
    return { title: '答题星星贴纸', detail: '你完成了一次星宝小游戏。' };
  }
  return { title: '今日贴纸收好啦', detail: '完成一轮今日星球任务。' };
}
```

- [ ] **Step 4: Add package script**

Modify `web/package.json` scripts to include:

```json
"starbuddy:test": "node --test scripts/star-buddy-play.test.mjs"
```

Keep existing scripts unchanged.

- [ ] **Step 5: Run helper test and typecheck**

Run:

```bash
cd /Users/tom/Desktop/github/petpet/web
npm run starbuddy:test
npm run typecheck
```

Expected: helper test passes, typecheck passes.

---

## Task 2: Add Star Buddy UI Sounds

**Files:**
- Modify: `web/src/utils/petSounds.ts`
- Modify: `web/scripts/sound-pipeline.test.mjs`

- [ ] **Step 1: Add sound test expectations**

Append this test to `web/scripts/sound-pipeline.test.mjs`:

```js
test('star buddy UI sounds respect the shared sound preference', () => {
  const source = readFileSync(resolve(import.meta.dirname, '../src/utils/petSounds.ts'), 'utf8');

  assert.match(source, /export function playStarBuddySound/);
  assert.match(source, /type StarBuddyUiSound = 'tap' \| 'open' \| 'reward' \| 'correct' \| 'gentle'/);
  assert.match(source, /if \(!isPetSoundEnabled\(\)\) return;/);
  assert.match(source, /kind === 'reward'/);
});
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
cd /Users/tom/Desktop/github/petpet/web
npm run sounds:test
```

Expected: fails because `playStarBuddySound` is not defined.

- [ ] **Step 3: Implement `playStarBuddySound`**

In `web/src/utils/petSounds.ts`, add near `playQuizFeedbackSound`:

```ts
type StarBuddyUiSound = 'tap' | 'open' | 'reward' | 'correct' | 'gentle';

export function playStarBuddySound(kind: StarBuddyUiSound) {
  if (!isPetSoundEnabled()) return;

  const context = getAudioContext();
  if (!context) return;
  if (context.state === 'suspended') {
    void context.resume().catch(() => undefined);
  }

  const now = context.currentTime;
  const masterGain = context.createGain();
  masterGain.connect(context.destination);
  masterGain.gain.setValueAtTime(0.0001, now);
  masterGain.gain.exponentialRampToValueAtTime(kind === 'reward' ? 0.15 : 0.09, now + 0.012);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === 'reward' ? 0.46 : 0.24));

  const tones: Record<StarBuddyUiSound, number[]> = {
    tap: [659.25],
    open: [523.25, 659.25],
    reward: [523.25, 659.25, 783.99, 1046.5],
    correct: [659.25, 783.99, 987.77],
    gentle: [392, 329.63],
  };

  tones[kind].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const toneGain = context.createGain();
    const start = now + index * 0.055;
    oscillator.type = kind === 'gentle' ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    toneGain.gain.setValueAtTime(0.0001, start);
    toneGain.gain.exponentialRampToValueAtTime(0.65, start + 0.014);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
    oscillator.connect(toneGain);
    toneGain.connect(masterGain);
    oscillator.start(start);
    oscillator.stop(start + 0.18);
  });
}
```

- [ ] **Step 4: Run sound tests**

Run:

```bash
cd /Users/tom/Desktop/github/petpet/web
npm run sounds:test
npm run typecheck
```

Expected: sound tests pass and typecheck passes.

---

## Task 3: Wire Star Buddy Missions And Rewards Through App

**Files:**
- Modify: `web/src/App.tsx`
- Modify: `web/src/pages/HomePage.tsx`
- Modify: `web/src/components/StarBuddyPanel.tsx`

- [ ] **Step 1: Update `StarBuddyPanel` props contract**

In `web/src/components/StarBuddyPanel.tsx`, import `DailyQuestProgress` and `DailyQuestStepId`:

```ts
import type { DailyQuestProgress, DailyQuestStepId } from '../utils/dailyTasks';
```

Update the component signature to include:

```ts
export function StarBuddyPanel({
  pet,
  dailyQuest,
  onCare,
  onOpenLearn,
  onOpenChallenge,
  onMarkDailyQuest,
  onStickerReward,
}: {
  pet: PetInstance;
  dailyQuest?: DailyQuestProgress;
  onCare: (action: CareAction) => void;
  onOpenLearn: () => void;
  onOpenChallenge: () => void;
  onMarkDailyQuest: (stepId: DailyQuestStepId) => void;
  onStickerReward: (stepId: DailyQuestStepId) => void;
}) {
```

No behavior change yet.

- [ ] **Step 2: Update `HomePage` props contract**

In `web/src/pages/HomePage.tsx`, import `DailyQuestStepId`:

```ts
import type { DailyQuestProgress, DailyQuestStepId } from '../utils/dailyTasks';
```

Extend `HomePage` props:

```ts
onMarkDailyQuest: (stepId: DailyQuestStepId) => void;
onStickerReward: (stepId: DailyQuestStepId) => void;
```

Pass through to `StarBuddyPanel`:

```tsx
<StarBuddyPanel
  pet={pet}
  dailyQuest={dailyQuest}
  onCare={onCare}
  onOpenLearn={onOpenLearn}
  onOpenChallenge={onOpenChallenge}
  onMarkDailyQuest={onMarkDailyQuest}
  onStickerReward={onStickerReward}
/>
```

- [ ] **Step 3: Add App callbacks**

In `web/src/App.tsx`, import the reward helper:

```ts
import { getStarBuddyRewardCopy } from './utils/starBuddyPlay';
import type { DailyQuestStepId } from './utils/dailyTasks';
```

Add this function near `claimDailyReward`:

```ts
function rewardStarBuddyStep(stepId: DailyQuestStepId) {
  const copy = getStarBuddyRewardCopy(stepId);
  showCelebration('star-buddy-sticker', copy.title, copy.detail);
}
```

Update the `HomePage` usage:

```tsx
onMarkDailyQuest={(stepId) => { void store.markDailyQuest(stepId); }}
onStickerReward={rewardStarBuddyStep}
```

- [ ] **Step 4: Extend celebration toast type**

This task references `star-buddy-sticker`; Task 6 will style it. For now, update `CelebrationToastData` in `web/src/components/CelebrationToast.tsx`:

```ts
kind: 'new-achievement' | 'daily-sticker' | 'star-buddy-sticker';
```

And compute label/icon:

```ts
const icon = toast.kind === 'new-achievement' ? '🏆' : toast.kind === 'star-buddy-sticker' ? '✦' : '⭐';
const label = toast.kind === 'new-achievement' ? '获得新成就' : toast.kind === 'star-buddy-sticker' ? '星宝贴纸' : '今日贴纸';
```

- [ ] **Step 5: Typecheck**

Run:

```bash
cd /Users/tom/Desktop/github/petpet/web
npm run typecheck
```

Expected: passes.

---

## Task 4: Implement Tap Reactions And Mission Strip

**Files:**
- Modify: `web/src/components/StarBuddyPanel.tsx`
- Modify: `web/src/styles.css`

- [ ] **Step 1: Import helpers and sound**

In `web/src/components/StarBuddyPanel.tsx`, add:

```ts
import { getStarBuddyMissionCards, getStarBuddyReaction, type StarBuddyActionName } from '../utils/starBuddyPlay';
import { playStarBuddySound } from '../utils/petSounds';
```

- [ ] **Step 2: Add local reaction state**

Inside `StarBuddyPanel`, add:

```ts
const [reaction, setReaction] = useState<{ action: StarBuddyActionName; message: string; id: number }>();
const [tapCount, setTapCount] = useState(0);
const missionCards = getStarBuddyMissionCards(dailyQuest);
const actionClass = reaction ? ` action-${reaction.action}` : '';
```

Update the section class:

```tsx
<section className={`star-buddy ${open ? 'open' : ''} expression-${expression}${actionClass}`} aria-label="宠宠星宝">
```

- [ ] **Step 3: Replace launcher click behavior**

Replace `toggleOpen` with:

```ts
function handleLauncherClick() {
  const nextTapCount = tapCount + 1;
  const nextReaction = getStarBuddyReaction(nextTapCount);
  const id = Date.now();
  setTapCount(nextTapCount);
  setReaction({ action: nextReaction.action, message: nextReaction.message, id });
  playStarBuddySound(nextTapCount % 3 === 0 ? 'open' : nextReaction.sound);
  window.setTimeout(() => {
    setReaction((current) => (current?.id === id ? undefined : current));
  }, 1800);
  setMenuOpen((value) => !value);
}
```

Update button:

```tsx
<button className="star-buddy-launcher" type="button" onClick={handleLauncherClick} aria-expanded={menuOpen || open} aria-haspopup="menu">
```

- [ ] **Step 4: Render tap toast**

Below launcher button, render:

```tsx
{reaction && <div className="star-buddy-tap-toast" role="status">{reaction.message}</div>}
```

- [ ] **Step 5: Render mission strip inside panel**

Inside `.star-buddy-panel`, after header and before `.star-buddy-modes`, add:

```tsx
<div className="star-buddy-mission-strip" aria-label="星宝今日小任务">
  {missionCards.map((mission) => (
    <button
      className={mission.done ? 'done' : ''}
      key={mission.stepId}
      type="button"
      onClick={() => {
        if (mission.stepId === 'care') chooseMode('care-plan', '');
        if (mission.stepId === 'learn') chooseMode('chat', '告诉我一个动物小秘密');
        if (mission.stepId === 'play') chooseMode('quiz', '出一道适合小朋友的题');
      }}
    >
      <span aria-hidden="true">{mission.done ? '✅' : mission.icon}</span>
      <strong>{mission.title}</strong>
      <small>{mission.done ? '完成啦' : mission.cta}</small>
    </button>
  ))}
</div>
```

- [ ] **Step 6: Add CSS for tap reaction and mission strip**

Append near existing Star Buddy CSS in `web/src/styles.css`:

```css
.star-buddy-tap-toast {
  align-self: flex-end;
  max-width: min(270px, calc(100vw - 32px));
  border: 2px solid rgba(255, 255, 255, 0.9);
  border-radius: 18px;
  padding: 9px 12px;
  background: rgba(255, 253, 248, 0.97);
  color: #51384c;
  box-shadow: 0 14px 32px rgba(77, 55, 107, 0.18);
  font-weight: 800;
  animation: star-buddy-toast-in 180ms ease-out;
}

.star-buddy-mission-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 12px 0;
}

.star-buddy-mission-strip button {
  min-height: 74px;
  border: 1px solid #f0dff1;
  border-radius: 16px;
  background: #fff;
  color: #4c3a55;
  display: grid;
  place-items: center;
  gap: 2px;
  font-weight: 800;
}

.star-buddy-mission-strip button.done {
  background: #ebffd9;
  border-color: #b8e48e;
}

.star-buddy-mission-strip small {
  font-size: 11px;
  color: #7b657b;
}

.action-bounce .star-buddy-avatar {
  animation: star-buddy-bounce 0.72s cubic-bezier(0.28, 0.84, 0.42, 1) 1;
}

.action-spin .star-buddy-avatar {
  animation: star-buddy-spin-pop 0.82s ease-in-out 1;
}

.action-wink .star-buddy-eye.right {
  height: 2px;
  top: 11px;
  animation: none;
}

.action-sparkle .star-buddy-sparkle {
  color: #ffca46;
  animation-duration: 0.55s;
}

.action-tilt .star-buddy-avatar {
  animation: star-buddy-curious 0.9s ease-in-out 1;
}

@keyframes star-buddy-toast-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes star-buddy-spin-pop {
  0% {
    transform: rotate(0deg) scale(1);
  }
  55% {
    transform: rotate(220deg) scale(1.08);
  }
  100% {
    transform: rotate(360deg) scale(1);
  }
}
```

Inside the existing mobile media query:

```css
.star-buddy-tap-toast {
  align-self: center;
}

.star-buddy-mission-strip {
  grid-template-columns: 1fr;
}
```

- [ ] **Step 7: Typecheck**

Run:

```bash
cd /Users/tom/Desktop/github/petpet/web
npm run typecheck
```

Expected: passes.

---

## Task 5: Make AI Cards Complete Missions And Trigger Rewards

**Files:**
- Modify: `web/src/components/StarBuddyPanel.tsx`
- Modify: `web/src/styles.css`

- [ ] **Step 1: Add helper to complete mission once**

Inside `StarBuddyPanel`, add:

```ts
function completeMission(stepId: DailyQuestStepId) {
  if (dailyQuest?.steps[stepId]?.done) return;
  onMarkDailyQuest(stepId);
  onStickerReward(stepId);
  playStarBuddySound('reward');
}
```

- [ ] **Step 2: Complete learn mission on successful chat**

Inside `ask`, after `setResponse(result);`, add:

```ts
if (mode === 'chat') completeMission('learn');
```

This marks the learn mission when a Star Buddy answer returns. It should not mark story or quiz as learn.

- [ ] **Step 3: Wrap care actions**

In the `StarBuddyResponseView` call, change `onCare={onCare}` to:

```tsx
onCare={(action) => {
  onCare(action);
  completeMission('care');
}}
```

- [ ] **Step 4: Pass mission callbacks into quiz card**

Update `StarBuddyResponseView` props to include:

```ts
onQuizCorrect: () => void;
```

Pass it into quiz card:

```tsx
return <StarBuddyQuizCard response={response} onOpenChallenge={onOpenChallenge} onQuizCorrect={onQuizCorrect} />;
```

From parent, provide:

```tsx
onQuizCorrect={() => completeMission('play')}
```

- [ ] **Step 5: Trigger quiz reward once**

In `StarBuddyQuizCard`, import `useEffect` at the top if not already imported. Current file already imports `useState`; update:

```ts
import { useEffect, useState } from 'react';
```

Update signature:

```ts
function StarBuddyQuizCard({ response, onOpenChallenge, onQuizCorrect }: { response: Extract<StarBuddyResponse, { kind: 'quiz' }>; onOpenChallenge: () => void; onQuizCorrect: () => void }) {
```

Add a local guard and effect:

```ts
const [rewarded, setRewarded] = useState(false);

useEffect(() => {
  if (correct && !rewarded) {
    setRewarded(true);
    onQuizCorrect();
  }
}, [correct, onQuizCorrect, rewarded]);
```

- [ ] **Step 6: Improve response card markup**

Add class wrappers in `StarBuddyResponseView`:

```tsx
<div className="star-buddy-card star-buddy-care-card">
```

For story:

```tsx
<article className="star-buddy-card star-buddy-story-card">
```

For chat:

```tsx
<div className="star-buddy-card star-buddy-chat-card">
```

For quiz article:

```tsx
<article className={correct ? 'star-buddy-card star-buddy-quiz-card reward-ready' : 'star-buddy-card star-buddy-quiz-card'}>
```

- [ ] **Step 7: Add card CSS**

Append:

```css
.star-buddy-card {
  border: 1px solid rgba(255, 255, 255, 0.84);
  border-radius: 18px;
  padding: 12px;
  background: linear-gradient(145deg, #fffefa, #fff1f8);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.62);
}

.star-buddy-story-card {
  background: linear-gradient(145deg, #fff7c9, #ffe6f3);
}

.star-buddy-quiz-card.reward-ready {
  animation: star-buddy-card-celebrate 520ms ease-out 1;
}

@keyframes star-buddy-card-celebrate {
  0% {
    transform: scale(1);
  }
  45% {
    transform: scale(1.025) rotate(-0.6deg);
  }
  100% {
    transform: scale(1);
  }
}
```

- [ ] **Step 8: Typecheck**

Run:

```bash
cd /Users/tom/Desktop/github/petpet/web
npm run typecheck
```

Expected: passes.

---

## Task 6: Upgrade Sticker Celebration Toast

**Files:**
- Modify: `web/src/components/CelebrationToast.tsx`
- Modify: `web/src/styles.css`

- [ ] **Step 1: Add richer toast class**

In `CelebrationToast.tsx`, change aside class:

```tsx
<aside className={`celebration-toast ${toast.kind}`} aria-live="polite" aria-label={label}>
```

- [ ] **Step 2: Add style for Star Buddy sticker**

Find existing `.celebration-toast` styles in `web/src/styles.css` and add:

```css
.celebration-toast.star-buddy-sticker {
  background: linear-gradient(135deg, #fff7ba, #ffd7ec 55%, #d8f5ff);
  border: 2px solid rgba(255, 255, 255, 0.88);
  box-shadow: 0 18px 46px rgba(142, 85, 128, 0.28);
}

.celebration-toast.star-buddy-sticker span {
  animation: star-buddy-sticker-pop 0.78s ease-in-out infinite;
}

@keyframes star-buddy-sticker-pop {
  0%,
  100% {
    transform: rotate(-6deg) scale(1);
  }
  50% {
    transform: rotate(7deg) scale(1.12);
  }
}
```

- [ ] **Step 3: Typecheck**

Run:

```bash
cd /Users/tom/Desktop/github/petpet/web
npm run typecheck
```

Expected: passes.

---

## Task 7: Verification And Browser QA

**Files:**
- No planned code changes unless verification finds issues.

- [ ] **Step 1: Run frontend checks**

Run:

```bash
cd /Users/tom/Desktop/github/petpet/web
npm run starbuddy:test
npm run sounds:test
npm run typecheck
npm run build
```

Expected: all pass.

- [ ] **Step 2: Run backend checks**

Run:

```bash
cd /Users/tom/Desktop/github/petpet/server
npm run build
AI_PROVIDER=mock npm test
```

Expected: all pass.

- [ ] **Step 3: Rebuild Docker**

Run:

```bash
cd /Users/tom/Desktop/github/petpet
docker compose up -d --build web server
docker compose ps
```

Expected: `web`, `server`, and `postgres` are running; `web` is healthy.

- [ ] **Step 4: Browser desktop verification**

Use the in-app browser at `http://127.0.0.1/`.

Verify:

- Star Buddy appears on the pet home page.
- Clicking Star Buddy shows a short toast and opens/closes the entrance menu.
- Open panel shows 3 Star Buddy mission cards.
- Choosing “问问” returns an AI card and marks the learn mission.
- Choosing “出题”, answering correctly, triggers Star Buddy sticker toast and marks play mission.
- Choosing a care action from Star Buddy marks care mission.
- Panel bottom stays above bottom navigation.

- [ ] **Step 5: Browser mobile verification**

Set viewport to `390x844` in the in-app browser.

Verify:

- Star Buddy launcher is above bottom navigation.
- Mission cards do not overflow horizontally.
- Panel content scrolls if needed.
- Sticker toast does not hide the bottom navigation controls.
- Reduced space still keeps buttons at least 44px tall.

- [ ] **Step 6: Sound preference verification**

In the app:

- Turn sound on.
- Tap Star Buddy and answer a quiz correctly. Expected: short UI sounds play.
- Turn sound off.
- Repeat both interactions. Expected: no Star Buddy UI sounds play.
- Animal care sounds remain controlled by the same toggle.

- [ ] **Step 7: Final diff review**

Run:

```bash
cd /Users/tom/Desktop/github/petpet
git diff -- web/src/components/StarBuddyPanel.tsx web/src/pages/HomePage.tsx web/src/App.tsx web/src/components/CelebrationToast.tsx web/src/utils/petSounds.ts web/src/utils/starBuddyPlay.ts web/src/styles.css web/scripts/star-buddy-play.test.mjs web/package.json
```

Expected:

- No secret values.
- No unrelated large refactor.
- No new backend database migration.
- Star Buddy code remains scoped to existing components/helpers.
