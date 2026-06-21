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

function normalizeStoryRequestText(message: string) {
  return message
    .replace(/萬/g, '万')
    .replace(/講/g, '讲')
    .replace(/個/g, '个')
    .replace(/長/g, '长')
    .replace(/篇/g, '篇')
    .replace(/童話/g, '童话')
    .replace(/壹/g, '一')
    .replace(/１/g, '1')
    .replace(/０/g, '0');
}

function isLongStoryRequest(mode: StarBuddyMode, message: string) {
  const normalized = normalizeStoryRequestText(message);
  return mode === 'story' && /一万字|1万字|10000字|万字|長篇|长篇|超长|很长|长一点|睡前长故事/.test(normalized);
}

function responseShapePrompt(mode: StarBuddyMode, longStory = false) {
  const shared = 'emotion 只能是 encourage、celebrate、gentle、curious、thinking、sleepy 之一。';
  if (mode === 'care-plan') {
    return [
      '返回 JSON 结构：',
      '{"kind":"care-plan","message":"一句适合孩子的照顾建议","suggestedActions":["observe","water"],"emotion":"encourage"}',
      'suggestedActions 只能从 feed、water、rest、clean、play、heal、observe 中选择 1-2 个。',
      shared,
    ].join('\n');
  }
  if (mode === 'story') {
    if (longStory) {
      return [
        '返回 JSON 结构：',
        '{"kind":"story","title":"故事标题","paragraphs":["第一章","第二章"],"choices":[{"label":"继续","prompt":"继续这个故事"}],"emotion":"gentle"}',
        '长篇故事模式：尽量接近 10000 个中文字，适合 3-10 岁儿童听，不要吓人。',
        'paragraphs 返回 12-20 段，每段 450-700 个中文字；如果模型输出限制不够，优先保证故事完整、有开头、发展、高潮和结尾。',
        '每段都要围绕当前动物和宠宠星宝展开，语言温柔、有画面感，适合大人朗读给孩子听。',
        'choices 返回 1-2 个继续故事的按钮。',
        shared,
      ].join('\n');
    }
    return [
      '返回 JSON 结构：',
      '{"kind":"story","title":"故事标题","paragraphs":["第一小段","第二小段","第三小段","第四小段"],"choices":[{"label":"继续","prompt":"继续这个故事"}],"emotion":"gentle"}',
      '故事要像长一点的睡前童话，适合儿童听，不要吓人。',
      'paragraphs 返回 4-6 段，每段 60-120 个中文字。',
      'choices 返回 1-2 个继续故事的按钮。',
      shared,
    ].join('\n');
  }
  if (mode === 'quiz') {
    return [
      '返回 JSON 结构：',
      '{"kind":"quiz","question":"一道动物小题","options":["选项A","选项B","选项C"],"correctIndex":0,"hint":"一句解释","emotion":"curious"}',
      'options 返回 3-4 个，correctIndex 从 0 开始。',
      '题目必须直接来自当前动物百科事实，可围绕栖息地、习性、适合了解的食物、需要避免、休息或安全提醒。',
      'hint 必须解释为什么正确答案对、为什么错误做法不合适，适合 3-10 岁儿童理解。',
      shared,
    ].join('\n');
  }
  return [
    '返回 JSON 结构：',
    '{"kind":"chat","message":"一句清楚有趣的回答","quickPrompts":["讲个故事","出一道题"],"emotion":"curious"}',
    'chat 可以回答儿童安全的日常小问题、时间日期、简单算术、自然常识和生活常识。',
    '如果问题和动物无关，先直接回答，再用一句话邀请孩子继续了解动物伙伴。',
    'quickPrompts 返回 2-3 个孩子可以继续点的问题。',
    shared,
  ].join('\n');
}

function systemPrompt(mode: StarBuddyMode, longStory = false) {
  return [
    '你是儿童动物应用 petpet 里的宠宠星宝。',
    mode === 'story' ? '你的用户是 3-10 岁儿童，故事要温柔、画面感强，适合朗读。' : '你的用户是 3-10 岁儿童，回答必须短、温柔、清楚。',
    mode === 'chat'
      ? '可以回答儿童安全的日常小问题、时间日期、简单算术、自然常识和生活常识；动物陪伴、当前动物、照顾建议、动物知识、故事和小测验要优先结合 app 场景。'
      : '优先围绕当前动物、照顾建议、动物知识、故事和小测验回答。',
    mode === 'quiz' ? '小测验必须使用用户提示里的当前动物百科事实，不要出泛泛的题。' : '',
    '不要给现实兽医诊断或危险动物接触建议。',
    '不要要求孩子独自接触野生动物、喂野生动物或打扰动物。',
    '只输出 JSON，不要 Markdown，不要代码块。',
    longStory ? '长篇故事模式：孩子明确要求很长的故事，要优先满足长度，并保持儿童友好和安全。' : '',
    `当前模式：${mode}`,
    responseShapePrompt(mode, longStory),
  ].join('\n');
}

function currentChildDateTime() {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date());
}

function userPrompt(input: CreateStarBuddyReplyInput) {
  const animal = getStarBuddyAnimal(input.pet.animalTypeId);
  const message = normalizeChildMessage(input.message);
  return [
    `当前日期时间：${currentChildDateTime()}`,
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
  const longStory = isLongStoryRequest(input.mode, message);
  if (message && isUnsafeChildTopic(message)) {
    return childSafeRedirect(input.mode);
  }
  try {
    const raw = await input.provider.complete({
      mode: input.mode,
      system: systemPrompt(input.mode, longStory),
      user: userPrompt({ ...input, message }),
      timeoutMs: longStory ? Number(process.env.AI_LONG_STORY_TIMEOUT_MS ?? 60000) : Number(process.env.AI_TIMEOUT_MS ?? 25000),
      outputSize: longStory ? 'long' : 'normal',
    });
    return normalizeProviderResponse(input.mode, raw, animal, {
      maxStoryParagraphs: longStory ? 24 : 6,
      storyParagraphMaxLength: longStory ? 900 : 260,
    });
  } catch (error) {
    console.warn('[star-buddy] provider failed, using fallback', {
      mode: input.mode,
      longStory,
      message: error instanceof Error ? error.message : String(error),
    });
    return fallbackForMode(input.mode, animal, message, longStory);
  }
}
