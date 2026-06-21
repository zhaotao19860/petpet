# Star Buddy AI Gateway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first usable `宠宠星宝` AI companion: authenticated backend AI gateway with mock/Codex CLI providers plus a child-friendly home-page panel for care advice, animal Q&A, stories, and quizzes.

**Architecture:** The frontend calls PetPet's existing Fastify backend. The backend resolves the authenticated user and owned pet, builds a child-safe prompt from trusted pet/animal context, calls a replaceable AI provider, normalizes the response shape, and returns only advisory content. AI never writes pet data directly.

**Tech Stack:** Fastify, Node.js built-in test runner, TypeScript, React, existing Vite build, existing PetPet API client.

---

## File Structure

Backend files:

- Create `server/src/animalFacts.ts`: server-side safe animal context map for the 30 existing animals. Keep this smaller than the frontend media data and include only facts needed for Star Buddy.
- Create `server/src/ai/types.ts`: shared Star Buddy request/response/provider TypeScript types.
- Create `server/src/ai/safety.ts`: input length limits, unsafe-topic checks, response cleanup, safe fallback builders.
- Create `server/src/ai/providers/mockProvider.ts`: deterministic provider for tests and no-AI demos.
- Create `server/src/ai/providers/codexCliProvider.ts`: local Codex CLI adapter using `codex exec`.
- Create `server/src/ai/providers/index.ts`: provider selection from environment.
- Create `server/src/ai/starBuddy.ts`: context building, prompts, provider invocation, response normalization.
- Create `server/src/routes/ai.ts`: authenticated route registration.
- Modify `server/src/app.ts`: register AI routes.
- Create `server/test/ai.test.mjs`: backend route and safety tests.

Frontend files:

- Create `web/src/models/starBuddy.ts`: frontend response/request types.
- Create `web/src/utils/starBuddyApi.ts`: API wrapper around existing `apiRequest`.
- Create `web/src/components/StarBuddyPanel.tsx`: child-friendly panel UI.
- Modify `web/src/pages/HomePage.tsx`: mount Star Buddy panel and wire quick actions.
- Modify `web/src/styles.css`: panel layout, mobile behavior, loading/error states.

No database migration is required for Phase 1.

---

## Task 1: Backend Types, Safety, And Animal Context

**Files:**

- Create: `server/src/ai/types.ts`
- Create: `server/src/ai/safety.ts`
- Create: `server/src/animalFacts.ts`
- Test later through `server/test/ai.test.mjs`

- [ ] **Step 1: Create Star Buddy shared backend types**

Create `server/src/ai/types.ts`:

```ts
import type { CareAction, StoredPet } from '../auth.js';

export type StarBuddyMode = 'chat' | 'care-plan' | 'story' | 'quiz';
export type StarBuddyEmotion = 'encourage' | 'celebrate' | 'gentle' | 'curious';

export interface StarBuddyAnimalContext {
  id: string;
  name: string;
  category: string;
  summary: string;
  habitat: string[];
  habits: string[];
  safeFood: string[];
  unsafeFood: string[];
  rest: string;
  safetyNote: string;
}

export interface StarBuddyContext {
  mode: StarBuddyMode;
  message: string;
  pet: StoredPet;
  animal: StarBuddyAnimalContext;
}

export interface StarBuddyCarePlanResponse {
  kind: 'care-plan';
  message: string;
  suggestedActions: CareAction[];
  emotion: StarBuddyEmotion;
}

export interface StarBuddyChatResponse {
  kind: 'chat';
  message: string;
  quickPrompts: string[];
  emotion: StarBuddyEmotion;
}

export interface StarBuddyStoryResponse {
  kind: 'story';
  title: string;
  paragraphs: string[];
  choices: Array<{ label: string; prompt: string }>;
  emotion: StarBuddyEmotion;
}

export interface StarBuddyQuizResponse {
  kind: 'quiz';
  question: string;
  options: string[];
  correctIndex: number;
  hint: string;
  emotion: StarBuddyEmotion;
}

export type StarBuddyResponse =
  | StarBuddyCarePlanResponse
  | StarBuddyChatResponse
  | StarBuddyStoryResponse
  | StarBuddyQuizResponse;

export interface StarAiProviderRequest {
  mode: StarBuddyMode;
  system: string;
  user: string;
  timeoutMs: number;
}

export interface StarAiProvider {
  complete(request: StarAiProviderRequest): Promise<string>;
}
```

- [ ] **Step 2: Create safety helpers**

Create `server/src/ai/safety.ts`:

```ts
import type { CareAction } from '../auth.js';
import type {
  StarBuddyCarePlanResponse,
  StarBuddyChatResponse,
  StarBuddyEmotion,
  StarBuddyMode,
  StarBuddyQuizResponse,
  StarBuddyResponse,
  StarBuddyStoryResponse,
} from './types.js';

export const allowedCareActions = new Set<CareAction>(['feed', 'water', 'rest', 'clean', 'play', 'heal', 'observe']);

const unsafePatterns = [
  /杀|打死|虐待|解剖|血腥|恐怖|鬼|自残|自杀|毒药|下毒|伤害/,
  /抓野生|摸野生|喂野生|追动物|掏鸟窝|靠近狮子|靠近大象/,
  /生病.*吃什么药|用什么药|打针|手术|诊断|处方/,
];

export function normalizeChildMessage(input: unknown) {
  return String(input ?? '').replace(/\s+/g, ' ').trim().slice(0, 240);
}

export function isUnsafeChildTopic(message: string) {
  return unsafePatterns.some((pattern) => pattern.test(message));
}

export function childSafeRedirect(mode: StarBuddyMode): StarBuddyResponse {
  if (mode === 'quiz') {
    return {
      kind: 'quiz',
      question: '遇到不确定的动物问题时，最好的做法是什么？',
      options: ['请大人一起帮忙', '自己偷偷尝试', '去打扰野生动物'],
      correctIndex: 0,
      hint: '真实动物需要安全距离，也需要大人帮忙判断。',
      emotion: 'gentle',
    };
  }
  if (mode === 'story') {
    return {
      kind: 'story',
      title: '安全观察小约定',
      paragraphs: ['星宝想起一个小约定：喜欢动物，也要保护动物和自己。', '遇到不确定的事，我们可以请爸爸妈妈、老师或兽医一起帮忙。'],
      choices: [{ label: '讲个温柔故事', prompt: '讲一个安全观察动物的温柔故事' }],
      emotion: 'gentle',
    };
  }
  if (mode === 'care-plan') {
    return {
      kind: 'care-plan',
      message: '这个问题需要大人一起判断。我们先在 app 里做一次安全照顾吧。',
      suggestedActions: ['observe'],
      emotion: 'gentle',
    };
  }
  return {
    kind: 'chat',
    message: '这个问题要请爸爸妈妈、老师或兽医一起帮忙。星宝可以陪你学习一个安全的动物小知识。',
    quickPrompts: ['讲个动物故事', '出一道动物题', '怎么安全观察动物'],
    emotion: 'gentle',
  };
}

export function cleanText(value: unknown, fallback: string, maxLength = 280) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return (text || fallback).slice(0, maxLength);
}

export function cleanEmotion(value: unknown): StarBuddyEmotion {
  return value === 'celebrate' || value === 'gentle' || value === 'curious' ? value : 'encourage';
}

export function normalizeCareActions(value: unknown): CareAction[] {
  if (!Array.isArray(value)) return ['observe'];
  const actions = value.filter((item): item is CareAction => allowedCareActions.has(item as CareAction));
  return actions.slice(0, 2).length > 0 ? actions.slice(0, 2) : ['observe'];
}

export function fallbackForMode(mode: StarBuddyMode, animalName = '动物伙伴'): StarBuddyResponse {
  if (mode === 'care-plan') {
    return {
      kind: 'care-plan',
      message: `星宝建议先安静观察${animalName}，看看它现在最需要什么。`,
      suggestedActions: ['observe'],
      emotion: 'encourage',
    };
  }
  if (mode === 'story') {
    return {
      kind: 'story',
      title: `${animalName}的小小星光`,
      paragraphs: [`${animalName}在宠宠星球遇见了星宝。`, '它们一起安静观察、慢慢学习，还把今天的小发现收进星星口袋。'],
      choices: [{ label: '再来一个', prompt: `再讲一个${animalName}的温柔故事` }],
      emotion: 'gentle',
    };
  }
  if (mode === 'quiz') {
    return {
      kind: 'quiz',
      question: `观察${animalName}时，哪个做法更安全？`,
      options: ['安静观察', '突然吓它', '乱喂零食'],
      correctIndex: 0,
      hint: '安静观察能保护动物，也保护自己。',
      emotion: 'curious',
    };
  }
  return {
    kind: 'chat',
    message: `星宝在这里。我们可以一起照顾${animalName}、讲故事，或者学一个动物小知识。`,
    quickPrompts: ['帮我照顾', '讲个故事', '出一道题'],
    emotion: 'encourage',
  };
}

export function parseJsonObject(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return undefined;
    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return undefined;
    }
  }
}

export function normalizeProviderResponse(mode: StarBuddyMode, raw: string, animalName: string): StarBuddyResponse {
  const parsed = parseJsonObject(raw);
  if (!parsed) {
    return mode === 'chat'
      ? { kind: 'chat', message: cleanText(raw, `星宝想和你一起认识${animalName}。`), quickPrompts: ['讲个故事', '出一道题'], emotion: 'gentle' }
      : fallbackForMode(mode, animalName);
  }

  if (mode === 'care-plan') {
    const response: StarBuddyCarePlanResponse = {
      kind: 'care-plan',
      message: cleanText(parsed.message, `星宝建议先观察${animalName}。`),
      suggestedActions: normalizeCareActions(parsed.suggestedActions),
      emotion: cleanEmotion(parsed.emotion),
    };
    return response;
  }

  if (mode === 'story') {
    const paragraphs = Array.isArray(parsed.paragraphs)
      ? parsed.paragraphs.map((item) => cleanText(item, '', 160)).filter(Boolean).slice(0, 3)
      : [];
    const choices = Array.isArray(parsed.choices)
      ? parsed.choices.map((item) => {
          const choice = item && typeof item === 'object' ? item as Record<string, unknown> : {};
          return { label: cleanText(choice.label, '继续', 16), prompt: cleanText(choice.prompt, `继续讲${animalName}的故事`, 80) };
        }).slice(0, 2)
      : [];
    const response: StarBuddyStoryResponse = {
      kind: 'story',
      title: cleanText(parsed.title, `${animalName}的小故事`, 40),
      paragraphs: paragraphs.length > 0 ? paragraphs : [`${animalName}和星宝一起完成了一次温柔观察。`],
      choices: choices.length > 0 ? choices : [{ label: '继续', prompt: `继续讲${animalName}的故事` }],
      emotion: cleanEmotion(parsed.emotion),
    };
    return response;
  }

  if (mode === 'quiz') {
    const options = Array.isArray(parsed.options) ? parsed.options.map((item) => cleanText(item, '', 32)).filter(Boolean).slice(0, 4) : [];
    const correctIndex = Number.isInteger(parsed.correctIndex) ? Number(parsed.correctIndex) : 0;
    const safeOptions = options.length >= 2 ? options : ['安静观察', '突然吓它', '乱喂零食'];
    const response: StarBuddyQuizResponse = {
      kind: 'quiz',
      question: cleanText(parsed.question, `观察${animalName}时，哪个做法更安全？`, 80),
      options: safeOptions,
      correctIndex: Math.min(safeOptions.length - 1, Math.max(0, correctIndex)),
      hint: cleanText(parsed.hint, '安静观察能保护动物，也保护自己。', 120),
      emotion: cleanEmotion(parsed.emotion),
    };
    return response;
  }

  const response: StarBuddyChatResponse = {
    kind: 'chat',
    message: cleanText(parsed.message, `星宝想和你一起认识${animalName}。`),
    quickPrompts: Array.isArray(parsed.quickPrompts) ? parsed.quickPrompts.map((item) => cleanText(item, '', 18)).filter(Boolean).slice(0, 3) : ['讲个故事', '出一道题'],
    emotion: cleanEmotion(parsed.emotion),
  };
  return response;
}
```

- [ ] **Step 3: Create server-side animal facts**

Create `server/src/animalFacts.ts`:

```ts
import type { StarBuddyAnimalContext } from './ai/types.js';

const sharedSafety = '现实中接触动物要先征得成年人同意，遇到野生动物要保持安全距离。';

export const starBuddyAnimals: Record<string, StarBuddyAnimalContext> = {
  cat_orange: {
    id: 'cat_orange',
    name: '橘猫',
    category: 'domestic_pet',
    summary: '橘猫是常见家庭宠物，喜欢安静、安全和规律照护。',
    habitat: ['家庭室内', '安全阳台', '温暖休息角'],
    habits: ['每天睡眠 12-16 小时', '用舌头梳理毛发', '通过呼噜声表达放松'],
    safeFood: ['猫粮', '熟鸡胸肉', '清水'],
    unsafeFood: ['巧克力', '洋葱', '葡萄'],
    rest: '12-16 小时',
    safetyNote: '现实中摸猫前要先问大人和主人，也要尊重猫咪休息。',
  },
  dog_shiba: {
    id: 'dog_shiba',
    name: '柴犬',
    category: 'domestic_pet',
    summary: '柴犬性格独立，喜欢散步和清晰的生活规则。',
    habitat: ['家庭', '公园步道', '安全院落'],
    habits: ['爱清洁', '需要散步', '通过尾巴和耳朵表达情绪'],
    safeFood: ['狗粮', '熟鸡肉', '胡萝卜'],
    unsafeFood: ['巧克力', '葡萄', '洋葱'],
    rest: '12-14 小时',
    safetyNote: '现实中接近狗狗要先问主人和大人，不要突然拥抱陌生狗。',
  },
  rabbit_holland: {
    id: 'rabbit_holland',
    name: '荷兰兔',
    category: 'domestic_pet',
    summary: '兔子需要干草、安静环境和温柔接触。',
    habitat: ['室内兔舍', '安静角落', '草垫区域'],
    habits: ['牙齿持续生长', '黄昏活跃', '受惊会跺脚'],
    safeFood: ['提摩西草', '兔粮', '少量生菜'],
    unsafeFood: ['巧克力', '面包', '大量坚果'],
    rest: '8-12 小时',
    safetyNote: '兔子身体脆弱，现实抱兔子要有成年人帮助。',
  },
};

const fallbackByCategory: Record<string, Omit<StarBuddyAnimalContext, 'id' | 'name'>> = {
  domestic_pet: {
    category: 'domestic_pet',
    summary: '这是需要温柔照顾的家庭动物伙伴。',
    habitat: ['安全室内', '安静休息处'],
    habits: ['喜欢规律照护', '需要干净水源'],
    safeFood: ['合适主粮', '清水'],
    unsafeFood: ['巧克力', '人类零食'],
    rest: '需要充足休息',
    safetyNote: sharedSafety,
  },
  wildlife: {
    category: 'wildlife',
    summary: '这是适合远距离观察和保护学习的野生动物。',
    habitat: ['自然栖息地', '保护区'],
    habits: ['依赖自然环境', '需要安全距离'],
    safeFood: ['自然食物', '洁净水源'],
    unsafeFood: ['人类零食', '塑料垃圾'],
    rest: '按自然节律休息',
    safetyNote: '野生动物不适合触摸或投喂，要远距离观察。',
  },
  default: {
    category: 'animal',
    summary: '这是宠宠星球里的真实动物伙伴。',
    habitat: ['合适栖息地', '安全空间'],
    habits: ['需要观察', '需要尊重'],
    safeFood: ['合适食物', '清水'],
    unsafeFood: ['人类零食', '污染食物'],
    rest: '需要安静休息',
    safetyNote: sharedSafety,
  },
};

const knownNames: Record<string, string> = {
  hamster_golden: '金丝熊仓鼠',
  guinea_pig: '豚鼠',
  hedgehog_african: '非洲迷你刺猬',
  butterfly_swallowtail: '凤蝶',
  beetle_hercules: '独角仙',
  bee_honey: '蜜蜂',
  horse_thoroughbred: '纯血马',
  elephant_asian: '亚洲象',
  giraffe_reticulated: '长颈鹿',
  lion_african: '非洲狮',
  panda_giant: '大熊猫',
  fox_arctic: '北极狐',
  owl_barn: '仓鸮',
  parrot_macaw: '金刚鹦鹉',
  swift_common: '雨燕',
  tree_frog: '树蛙',
  salamander_fire: '火蝾螈',
  toad_chinese: '中华大蟾蜍',
  tortoise_russian: '陆龟',
  gecko_leopard: '豹纹守宫',
  chameleon_veiled: '变色龙',
  clownfish: '小丑鱼',
  turtle_green_sea: '绿海龟',
  dolphin_bottlenose: '宽吻海豚',
  chicken_hen: '母鸡',
  goat_dwarf: '侏儒山羊',
  alpaca: '羊驼',
};

const categoryById: Record<string, string> = {
  lion_african: 'wildlife',
  panda_giant: 'wildlife',
  fox_arctic: 'wildlife',
  elephant_asian: 'wildlife',
  giraffe_reticulated: 'wildlife',
  owl_barn: 'wildlife',
  parrot_macaw: 'wildlife',
  swift_common: 'wildlife',
  turtle_green_sea: 'wildlife',
  dolphin_bottlenose: 'wildlife',
};

export function getStarBuddyAnimal(animalId: string): StarBuddyAnimalContext {
  const exact = starBuddyAnimals[animalId];
  if (exact) return exact;
  const category = categoryById[animalId] ?? 'default';
  const fallback = fallbackByCategory[category] ?? fallbackByCategory.default;
  return {
    id: animalId,
    name: knownNames[animalId] ?? '动物伙伴',
    ...fallback,
  };
}
```

- [ ] **Step 4: Build server to catch TypeScript errors**

Run:

```bash
cd server && npm run build
```

Expected: TypeScript may fail because routes are not added yet only if imports are wrong. Fix import/type errors before moving on.

---

## Task 2: Mock Provider And Star Buddy Service

**Files:**

- Create: `server/src/ai/providers/mockProvider.ts`
- Create: `server/src/ai/providers/index.ts`
- Create: `server/src/ai/starBuddy.ts`

- [ ] **Step 1: Create mock provider**

Create `server/src/ai/providers/mockProvider.ts`:

```ts
import type { StarAiProvider } from '../types.js';

export class MockStarAiProvider implements StarAiProvider {
  async complete({ mode, user }: Parameters<StarAiProvider['complete']>[0]) {
    const match = user.match(/动物：([^\\n]+)/);
    const animalName = match?.[1]?.trim() || '动物伙伴';

    if (mode === 'care-plan') {
      return JSON.stringify({
        message: `星宝看了看状态，建议先温柔观察${animalName}，再补充需要的照顾。`,
        suggestedActions: ['observe', 'water'],
        emotion: 'encourage',
      });
    }
    if (mode === 'story') {
      return JSON.stringify({
        title: `${animalName}和星星口袋`,
        paragraphs: [`${animalName}在宠宠星球发现了一颗小星星。`, '星宝提醒它慢慢走、安静看，把今天的新发现放进口袋里。'],
        choices: [{ label: '继续冒险', prompt: `继续讲${animalName}的安全冒险` }],
        emotion: 'gentle',
      });
    }
    if (mode === 'quiz') {
      return JSON.stringify({
        question: `照顾${animalName}时，哪个做法更安全？`,
        options: ['安静观察', '突然吓它', '乱喂零食'],
        correctIndex: 0,
        hint: '安静观察能保护动物，也保护自己。',
        emotion: 'curious',
      });
    }
    return JSON.stringify({
      message: `星宝在这里。我们可以一起认识${animalName}，也可以讲故事或出题。`,
      quickPrompts: ['帮我照顾', '讲个故事', '出一道题'],
      emotion: 'encourage',
    });
  }
}
```

- [ ] **Step 2: Create provider selector with mock default**

Create `server/src/ai/providers/index.ts`:

```ts
import type { StarAiProvider } from '../types.js';
import { MockStarAiProvider } from './mockProvider.js';

export function createStarAiProvider(): StarAiProvider {
  const provider = (process.env.AI_PROVIDER ?? 'mock').toLowerCase();
  if (provider === 'mock') {
    return new MockStarAiProvider();
  }
  return new MockStarAiProvider();
}
```

- [ ] **Step 3: Create Star Buddy service**

Create `server/src/ai/starBuddy.ts`:

```ts
import type { StoredPet } from '../auth.js';
import { getStarBuddyAnimal } from '../animalFacts.js';
import { childSafeRedirect, fallbackForMode, isUnsafeChildTopic, normalizeChildMessage, normalizeProviderResponse } from './safety.js';
import type { StarAiProvider, StarBuddyMode, StarBuddyResponse } from './types.js';

export interface CreateStarBuddyReplyInput {
  mode: StarBuddyMode;
  message?: unknown;
  pet: StoredPet;
  provider: StarAiProvider;
}

function systemPrompt(mode: StarBuddyMode) {
  return [
    '你是儿童动物应用 petpet 里的宠宠星宝。',
    '你的用户是 3-10 岁儿童，回答必须短、温柔、清楚。',
    '只围绕当前动物、照顾建议、动物知识、故事和小测验回答。',
    '不要给现实兽医诊断或危险动物接触建议。',
    '不要要求孩子独自接触野生动物、喂野生动物或打扰动物。',
    '只输出 JSON，不要 Markdown，不要代码块。',
    `当前模式：${mode}`,
  ].join('\n');
}

function userPrompt(input: CreateStarBuddyReplyInput) {
  const animal = getStarBuddyAnimal(input.pet.animalTypeId);
  const message = normalizeChildMessage(input.message);
  return [
    `动物：${animal.name}`,
    `动物ID：${animal.id}`,
    `宠物名：${input.pet.name}`,
    `心情：${input.pet.mood}`,
    `饥饿值：${input.pet.hunger.toFixed(2)}`,
    `口渴值：${input.pet.thirst.toFixed(2)}`,
    `精力：${input.pet.energy.toFixed(2)}`,
    `快乐：${input.pet.happiness.toFixed(2)}`,
    `健康：${input.pet.health.toFixed(2)}`,
    `清洁：${input.pet.hygiene.toFixed(2)}`,
    `压力：${input.pet.stress.toFixed(2)}`,
    `简介：${animal.summary}`,
    `栖息地：${animal.habitat.join('、')}`,
    `习性：${animal.habits.join('、')}`,
    `适合了解的食物：${animal.safeFood.join('、')}`,
    `需要避免：${animal.unsafeFood.join('、')}`,
    `休息：${animal.rest}`,
    `安全提醒：${animal.safetyNote}`,
    `孩子的问题：${message || '没有输入，请主动给一个适合当前模式的内容。'}`,
  ].join('\n');
}

export async function createStarBuddyReply(input: CreateStarBuddyReplyInput): Promise<StarBuddyResponse> {
  const animal = getStarBuddyAnimal(input.pet.animalTypeId);
  const message = normalizeChildMessage(input.message);
  if (message && isUnsafeChildTopic(message)) {
    return childSafeRedirect(input.mode);
  }
  try {
    const raw = await input.provider.complete({
      mode: input.mode,
      system: systemPrompt(input.mode),
      user: userPrompt({ ...input, message }),
      timeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 25000),
    });
    return normalizeProviderResponse(input.mode, raw, animal.name);
  } catch {
    return fallbackForMode(input.mode, animal.name);
  }
}
```

- [ ] **Step 4: Build server**

Run:

```bash
cd server && npm run build
```

Expected: PASS.

---

## Task 3: Authenticated AI Routes And Tests

**Files:**

- Create: `server/src/routes/ai.ts`
- Modify: `server/src/app.ts`
- Create: `server/test/ai.test.mjs`

- [ ] **Step 1: Add AI routes**

Create `server/src/routes/ai.ts`:

```ts
import type { FastifyInstance } from 'fastify';
import { createStarBuddyReply } from '../ai/starBuddy.js';
import { createStarAiProvider } from '../ai/providers/index.js';
import type { StarBuddyMode } from '../ai/types.js';

const modes = new Set<StarBuddyMode>(['chat', 'care-plan', 'story', 'quiz']);

function readBody(requestBody: unknown) {
  return (requestBody && typeof requestBody === 'object' ? requestBody : {}) as Record<string, unknown>;
}

async function handleStarBuddy(app: FastifyInstance, mode: StarBuddyMode, request: Parameters<FastifyInstance['post']>[2] extends infer _ ? any : never, reply: any) {
  const body = readBody(request.body);
  const petId = String(body.petId ?? '').trim();
  if (!petId) {
    return reply.code(400).send({ error: 'INVALID_AI_INPUT' });
  }
  const pet = await app.repository.findPetById(petId);
  if (!pet || pet.userId !== request.currentUser!.id) {
    return reply.code(404).send({ error: 'PET_NOT_FOUND' });
  }
  const response = await createStarBuddyReply({
    mode,
    message: body.message,
    pet,
    provider: createStarAiProvider(),
  });
  return { response };
}

export async function registerAiRoutes(app: FastifyInstance) {
  app.post('/api/ai/star-buddy/:mode', { preHandler: app.requireAuth }, async (request, reply) => {
    const mode = String((request.params as { mode?: string }).mode ?? '') as StarBuddyMode;
    if (!modes.has(mode)) {
      return reply.code(404).send({ error: 'AI_MODE_NOT_FOUND' });
    }
    return handleStarBuddy(app, mode, request, reply);
  });
}
```

After writing this, clean up the loose `any` typing by importing Fastify request/reply types:

```ts
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
```

Then use:

```ts
async function handleStarBuddy(app: FastifyInstance, mode: StarBuddyMode, request: FastifyRequest, reply: FastifyReply) {
```

- [ ] **Step 2: Register routes in app**

Modify `server/src/app.ts`:

```ts
import { registerAiRoutes } from './routes/ai.js';
```

Add after existing route registrations:

```ts
  await registerAiRoutes(app);
```

- [ ] **Step 3: Add backend tests**

Create `server/test/ai.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../dist/app.js';

async function registerAndLogin(app, username) {
  await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { username, password: 'safe-password', displayName: username },
  });
  const login = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { username, password: 'safe-password' },
  });
  return String(login.headers['set-cookie']);
}

async function createPet(app, cookie, animalTypeId = 'cat_orange') {
  const response = await app.inject({
    method: 'POST',
    url: '/api/pets/adoptions/complete',
    headers: { cookie },
    payload: { animalTypeId, name: 'Mimi' },
  });
  assert.equal(response.statusCode, 201);
  return response.json().pet;
}

test('star buddy routes require login', async () => {
  const app = await createApp({ storage: 'memory' });
  const response = await app.inject({
    method: 'POST',
    url: '/api/ai/star-buddy/chat',
    payload: { petId: 'missing', message: '你好' },
  });
  assert.equal(response.statusCode, 401);
  await app.close();
});

test('star buddy chat returns child friendly mock response for owned pet', async () => {
  process.env.AI_PROVIDER = 'mock';
  const app = await createApp({ storage: 'memory' });
  const cookie = await registerAndLogin(app, 'alice-ai');
  const pet = await createPet(app, cookie);
  const response = await app.inject({
    method: 'POST',
    url: '/api/ai/star-buddy/chat',
    headers: { cookie },
    payload: { petId: pet.id, message: '猫为什么会呼噜' },
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().response.kind, 'chat');
  assert.match(response.json().response.message, /星宝|橘猫|动物/);
  await app.close();
});

test('star buddy cannot read another user pet', async () => {
  const app = await createApp({ storage: 'memory' });
  const aliceCookie = await registerAndLogin(app, 'alice-ai-private');
  const bobCookie = await registerAndLogin(app, 'bob-ai-private');
  const pet = await createPet(app, aliceCookie);
  const response = await app.inject({
    method: 'POST',
    url: '/api/ai/star-buddy/care-plan',
    headers: { cookie: bobCookie },
    payload: { petId: pet.id },
  });
  assert.equal(response.statusCode, 404);
  await app.close();
});

test('star buddy redirects unsafe child topics', async () => {
  const app = await createApp({ storage: 'memory' });
  const cookie = await registerAndLogin(app, 'safe-ai');
  const pet = await createPet(app, cookie, 'lion_african');
  const response = await app.inject({
    method: 'POST',
    url: '/api/ai/star-buddy/chat',
    headers: { cookie },
    payload: { petId: pet.id, message: '我能不能去摸野生狮子' },
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().response.kind, 'chat');
  assert.match(response.json().response.message, /爸爸妈妈|老师|兽医|安全/);
  await app.close();
});
```

- [ ] **Step 4: Run backend build and tests**

Run:

```bash
cd server && npm run build && npm test
```

Expected: PASS.

---

## Task 4: Codex CLI Provider

**Files:**

- Create: `server/src/ai/providers/codexCliProvider.ts`
- Modify: `server/src/ai/providers/index.ts`
- Test manually with `AI_PROVIDER=codex-cli`

- [ ] **Step 1: Create Codex CLI provider**

Create `server/src/ai/providers/codexCliProvider.ts`:

```ts
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import type { StarAiProvider, StarAiProviderRequest } from '../types.js';

function runCodex(prompt: string, outputFile: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const codexPath = process.env.CODEX_CLI_PATH || '/opt/homebrew/bin/codex';
    const child = spawn(codexPath, [
      'exec',
      '--skip-git-repo-check',
      '--ephemeral',
      '--output-last-message',
      outputFile,
      '-',
    ], {
      stdio: ['pipe', 'ignore', 'pipe'],
      env: process.env,
    });

    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('CODEX_TIMEOUT'));
    }, timeoutMs);

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`CODEX_EXIT_${code}: ${stderr.slice(0, 300)}`));
      }
    });
    child.stdin.end(prompt);
  });
}

export class CodexCliStarAiProvider implements StarAiProvider {
  async complete(request: StarAiProviderRequest) {
    const dir = await mkdtemp(join(tmpdir(), 'petpet-star-codex-'));
    const outputFile = join(dir, 'last-message.txt');
    const promptFile = join(dir, 'prompt.txt');
    const prompt = [
      request.system,
      '',
      '请只回答一个 JSON 对象，不要运行命令，不要修改文件。',
      'JSON 必须符合当前模式需要的字段。',
      '',
      request.user,
    ].join('\n');
    try {
      await writeFile(promptFile, prompt, 'utf8');
      await runCodex(prompt, outputFile, request.timeoutMs);
      return await readFile(outputFile, 'utf8');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
}
```

- [ ] **Step 2: Register provider**

Modify `server/src/ai/providers/index.ts`:

```ts
import type { StarAiProvider } from '../types.js';
import { CodexCliStarAiProvider } from './codexCliProvider.js';
import { MockStarAiProvider } from './mockProvider.js';

export function createStarAiProvider(): StarAiProvider {
  const provider = (process.env.AI_PROVIDER ?? 'mock').toLowerCase();
  if (provider === 'codex-cli') {
    return new CodexCliStarAiProvider();
  }
  if (provider === 'mock') {
    return new MockStarAiProvider();
  }
  return new MockStarAiProvider();
}
```

- [ ] **Step 3: Build and keep tests on mock**

Run:

```bash
cd server && npm run build && AI_PROVIDER=mock npm test
```

Expected: PASS.

- [ ] **Step 4: Manual Codex provider smoke check**

Run after the server build passes:

```bash
cd server && AI_PROVIDER=codex-cli node --test test/ai.test.mjs --test-name-pattern "star buddy chat returns"
```

Expected: PASS or a friendly fallback if local Codex takes too long. If it times out, keep `codex-cli` available but do not make it default.

---

## Task 5: Frontend API Types And Wrapper

**Files:**

- Create: `web/src/models/starBuddy.ts`
- Create: `web/src/utils/starBuddyApi.ts`

- [ ] **Step 1: Add frontend types**

Create `web/src/models/starBuddy.ts`:

```ts
import type { CareAction } from './interaction';

export type StarBuddyMode = 'chat' | 'care-plan' | 'story' | 'quiz';
export type StarBuddyEmotion = 'encourage' | 'celebrate' | 'gentle' | 'curious';

export interface StarBuddyCarePlanResponse {
  kind: 'care-plan';
  message: string;
  suggestedActions: CareAction[];
  emotion: StarBuddyEmotion;
}

export interface StarBuddyChatResponse {
  kind: 'chat';
  message: string;
  quickPrompts: string[];
  emotion: StarBuddyEmotion;
}

export interface StarBuddyStoryResponse {
  kind: 'story';
  title: string;
  paragraphs: string[];
  choices: Array<{ label: string; prompt: string }>;
  emotion: StarBuddyEmotion;
}

export interface StarBuddyQuizResponse {
  kind: 'quiz';
  question: string;
  options: string[];
  correctIndex: number;
  hint: string;
  emotion: StarBuddyEmotion;
}

export type StarBuddyResponse =
  | StarBuddyCarePlanResponse
  | StarBuddyChatResponse
  | StarBuddyStoryResponse
  | StarBuddyQuizResponse;
```

- [ ] **Step 2: Add API wrapper**

Create `web/src/utils/starBuddyApi.ts`:

```ts
import type { StarBuddyMode, StarBuddyResponse } from '../models/starBuddy';
import { apiRequest } from './apiClient';

export async function requestStarBuddy(mode: StarBuddyMode, petId: string, message?: string) {
  const data = await apiRequest<{ response: StarBuddyResponse }>(`/api/ai/star-buddy/${mode}`, {
    method: 'POST',
    body: JSON.stringify({ petId, message }),
  });
  return data.response;
}
```

- [ ] **Step 3: Run frontend typecheck**

Run:

```bash
cd web && npm run typecheck
```

Expected: PASS.

---

## Task 6: Star Buddy Panel UI

**Files:**

- Create: `web/src/components/StarBuddyPanel.tsx`
- Modify later: `web/src/pages/HomePage.tsx`

- [ ] **Step 1: Create panel component**

Create `web/src/components/StarBuddyPanel.tsx`:

```tsx
import { useState } from 'react';
import type { CareAction } from '../models/interaction';
import type { PetInstance } from '../models/pet';
import type { StarBuddyMode, StarBuddyResponse } from '../models/starBuddy';
import { requestStarBuddy } from '../utils/starBuddyApi';

const modeLabels: Array<{ mode: StarBuddyMode; label: string; icon: string; starter: string }> = [
  { mode: 'care-plan', label: '照顾', icon: '✨', starter: '' },
  { mode: 'chat', label: '问问', icon: '💬', starter: '这个动物有什么小秘密？' },
  { mode: 'story', label: '故事', icon: '📚', starter: '讲一个温柔的动物故事' },
  { mode: 'quiz', label: '出题', icon: '⭐', starter: '出一道适合小朋友的题' },
];

const careActionLabels: Record<CareAction, string> = {
  feed: '去喂食',
  water: '喝水',
  rest: '休息',
  clean: '打扫',
  play: '玩一会儿',
  heal: '健康照顾',
  observe: '安静观察',
};

export function StarBuddyPanel({ pet, onCare, onOpenLearn, onOpenChallenge }: { pet: PetInstance; onCare: (action: CareAction) => void; onOpenLearn: () => void; onOpenChallenge: () => void }) {
  const [open, setOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<StarBuddyMode>('care-plan');
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState<StarBuddyResponse>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function ask(mode = activeMode, nextMessage = message) {
    setActiveMode(mode);
    setLoading(true);
    setError('');
    try {
      const result = await requestStarBuddy(mode, pet.id, nextMessage);
      setResponse(result);
    } catch {
      setError('星宝现在有点忙，我们先照顾小动物吧。');
    } finally {
      setLoading(false);
    }
  }

  function chooseMode(mode: StarBuddyMode, starter: string) {
    setMessage(starter);
    void ask(mode, starter);
  }

  return (
    <section className={open ? 'star-buddy open' : 'star-buddy'} aria-label="宠宠星宝">
      <button className="star-buddy-launcher" type="button" onClick={() => { setOpen((value) => !value); if (!open && !response) void ask('care-plan', ''); }}>
        <span aria-hidden="true">✦</span>
        <strong>宠宠星宝</strong>
      </button>

      {open && (
        <div className="star-buddy-panel">
          <header className="star-buddy-header">
            <div>
              <p className="eyebrow">AI 小助手</p>
              <h2>星宝陪你照顾 {pet.name}</h2>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="关闭宠宠星宝">×</button>
          </header>

          <div className="star-buddy-modes" role="tablist" aria-label="星宝功能">
            {modeLabels.map((item) => (
              <button className={activeMode === item.mode ? 'active' : ''} key={item.mode} type="button" onClick={() => chooseMode(item.mode, item.starter)}>
                <span>{item.icon}</span>
                <strong>{item.label}</strong>
              </button>
            ))}
          </div>

          <div className="star-buddy-question-row">
            <input value={message} onChange={(event) => setMessage(event.target.value)} maxLength={120} placeholder="问星宝一个动物问题" />
            <button type="button" onClick={() => void ask()}>问</button>
          </div>

          <div className="star-buddy-response" aria-live="polite">
            {loading && <p className="star-buddy-loading">星宝正在想一想...</p>}
            {error && <p className="star-buddy-error">{error}</p>}
            {!loading && !error && response && <StarBuddyResponseView response={response} onCare={onCare} onOpenLearn={onOpenLearn} onOpenChallenge={onOpenChallenge} onPrompt={(prompt) => { setMessage(prompt); void ask('chat', prompt); }} />}
          </div>
        </div>
      )}
    </section>
  );
}

function StarBuddyResponseView({ response, onCare, onOpenLearn, onOpenChallenge, onPrompt }: { response: StarBuddyResponse; onCare: (action: CareAction) => void; onOpenLearn: () => void; onOpenChallenge: () => void; onPrompt: (prompt: string) => void }) {
  if (response.kind === 'care-plan') {
    return (
      <div>
        <p>{response.message}</p>
        <div className="star-buddy-actions">
          {response.suggestedActions.map((action) => <button key={action} type="button" onClick={() => onCare(action)}>{careActionLabels[action]}</button>)}
          <button type="button" onClick={onOpenLearn}>去百科</button>
        </div>
      </div>
    );
  }

  if (response.kind === 'story') {
    return (
      <article>
        <h3>{response.title}</h3>
        {response.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <div className="star-buddy-actions">
          {response.choices.map((choice) => <button key={choice.label} type="button" onClick={() => onPrompt(choice.prompt)}>{choice.label}</button>)}
        </div>
      </article>
    );
  }

  if (response.kind === 'quiz') {
    return (
      <article>
        <h3>{response.question}</h3>
        <div className="star-buddy-quiz-options">
          {response.options.map((option, index) => <span className={index === response.correctIndex ? 'correct' : ''} key={option}>{option}</span>)}
        </div>
        <p>{response.hint}</p>
        <div className="star-buddy-actions">
          <button type="button" onClick={onOpenChallenge}>去游戏空间</button>
        </div>
      </article>
    );
  }

  return (
    <div>
      <p>{response.message}</p>
      <div className="star-buddy-actions">
        {response.quickPrompts.map((prompt) => <button key={prompt} type="button" onClick={() => onPrompt(prompt)}>{prompt}</button>)}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run frontend typecheck**

Run:

```bash
cd web && npm run typecheck
```

Expected: FAIL only if prop types need tightening. Fix before continuing.

---

## Task 7: Integrate Panel Into Home Page And Styling

**Files:**

- Modify: `web/src/pages/HomePage.tsx`
- Modify: `web/src/styles.css`

- [ ] **Step 1: Mount Star Buddy in home page**

Modify `web/src/pages/HomePage.tsx` imports:

```ts
import { StarBuddyPanel } from '../components/StarBuddyPanel';
```

Add inside the top-level `<div className="home-layout ...">`, after the `kid-play-deck` section:

```tsx
      <StarBuddyPanel
        pet={pet}
        onCare={onCare}
        onOpenLearn={onOpenLearn}
        onOpenChallenge={onOpenChallenge}
      />
```

- [ ] **Step 2: Add CSS**

Append to `web/src/styles.css`:

```css
.star-buddy {
  position: fixed;
  right: clamp(14px, 3vw, 28px);
  bottom: calc(92px + env(safe-area-inset-bottom));
  z-index: 30;
  max-width: min(420px, calc(100vw - 24px));
}

.star-buddy-launcher {
  min-height: 56px;
  border: 0;
  border-radius: 18px;
  padding: 10px 16px;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  background: linear-gradient(135deg, #fff7b8, #ffd0ef 48%, #bfe9ff);
  color: #483047;
  box-shadow: 0 16px 35px rgba(77, 55, 107, 0.2);
  font-size: 15px;
}

.star-buddy-launcher span {
  width: 32px;
  height: 32px;
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
  background: #ffffff;
  color: #e18a00;
  font-size: 22px;
}

.star-buddy-panel {
  margin-top: 10px;
  border: 2px solid rgba(255, 255, 255, 0.85);
  border-radius: 24px;
  padding: 14px;
  background: rgba(255, 252, 246, 0.96);
  color: #423047;
  box-shadow: 0 24px 70px rgba(58, 42, 80, 0.24);
}

.star-buddy-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.star-buddy-header h2 {
  margin: 2px 0 0;
  font-size: 19px;
  line-height: 1.2;
}

.star-buddy-header button {
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 999px;
  background: #f2e8ff;
  color: #604d68;
  font-size: 24px;
}

.star-buddy-modes {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin: 12px 0;
}

.star-buddy-modes button {
  min-height: 58px;
  border: 1px solid #eadcf8;
  border-radius: 16px;
  background: #fff;
  color: #4c3a55;
  display: grid;
  place-items: center;
  gap: 2px;
}

.star-buddy-modes button.active {
  background: #e9f7ff;
  border-color: #8ed8ff;
}

.star-buddy-question-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.star-buddy-question-row input {
  min-height: 44px;
  border: 1px solid #eadcf8;
  border-radius: 14px;
  padding: 0 12px;
  font-size: 15px;
}

.star-buddy-question-row button,
.star-buddy-actions button {
  border: 0;
  border-radius: 14px;
  background: #6fbdff;
  color: #fff;
  font-weight: 800;
  padding: 10px 14px;
}

.star-buddy-response {
  min-height: 112px;
  margin-top: 12px;
  padding: 12px;
  border-radius: 18px;
  background: #fff8df;
}

.star-buddy-response h3 {
  margin: 0 0 8px;
  font-size: 17px;
}

.star-buddy-response p {
  margin: 6px 0;
  line-height: 1.55;
}

.star-buddy-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.star-buddy-quiz-options {
  display: grid;
  gap: 7px;
  margin: 10px 0;
}

.star-buddy-quiz-options span {
  border-radius: 12px;
  background: #fff;
  padding: 9px 10px;
}

.star-buddy-quiz-options span.correct {
  background: #dff8c8;
  border: 1px solid #9dd66a;
}

.star-buddy-loading,
.star-buddy-error {
  font-weight: 800;
}

@media (max-width: 680px) {
  .star-buddy {
    left: 12px;
    right: 12px;
    bottom: calc(84px + env(safe-area-inset-bottom));
  }

  .star-buddy-launcher {
    width: 100%;
    justify-content: center;
  }

  .star-buddy-modes {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
```

- [ ] **Step 3: Run frontend build**

Run:

```bash
cd web && npm run typecheck && npm run build
```

Expected: PASS.

---

## Task 8: End-To-End Local Verification

**Files:**

- No new files unless fixes are needed.

- [ ] **Step 1: Run backend tests**

Run:

```bash
cd server && npm run build && AI_PROVIDER=mock npm test
```

Expected: PASS.

- [ ] **Step 2: Run frontend build**

Run:

```bash
cd web && npm run typecheck && npm run build
```

Expected: PASS.

- [ ] **Step 3: Start or reuse local app**

If Docker is the current local path, run:

```bash
docker compose up --build
```

If local npm services are preferred, run server and web with existing scripts.

Expected: app loads at the current local URL and `/api/health` returns `{ ok: true }`.

- [ ] **Step 4: Browser checks**

Open the app and verify:

- Login still works.
- Home page still scrolls.
- `宠宠星宝` button appears near the bottom without hiding the bottom tab bar.
- Opening Star Buddy shows four mode buttons.
- `照顾` returns care suggestions.
- `问问` returns a chat reply.
- `故事` returns a short story.
- `出题` returns a quiz card.
- Care suggestion buttons call existing care actions.
- Mobile width does not clip or overflow the panel.

- [ ] **Step 5: Local Codex smoke**

Set the server environment to:

```bash
AI_PROVIDER=codex-cli
AI_TIMEOUT_MS=30000
```

Then verify one chat request. If Codex CLI is slow or times out, keep mock as the default and document that `codex-cli` is a local experiment provider.

---

## Self-Review Checklist

- [ ] Spec coverage: backend gateway, mock provider, Codex CLI provider, authenticated routes, child-safe normalization, and home UI are all covered.
- [ ] Non-goals respected: no Live2D, no voice, no DB writes by AI, no long-term AI memory.
- [ ] Safety boundary: backend owns pet lookup, user isolation, unsafe input redirects, response shape cleanup, and fallback behavior.
- [ ] Provider boundary: frontend does not know whether the backend uses mock, Codex CLI, or future oneapi/openai-compatible providers.
- [ ] Test path: backend has automated tests; frontend has typecheck/build and browser checks.
