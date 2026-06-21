import type { CareAction } from '../auth.js';
import type {
  StarBuddyAnimalContext,
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

export function cleanStoryText(value: unknown, fallback: string, maxLength = 260) {
  return cleanText(value, fallback, maxLength);
}

export function cleanEmotion(value: unknown): StarBuddyEmotion {
  return value === 'celebrate' || value === 'gentle' || value === 'curious' || value === 'thinking' || value === 'sleepy' ? value : 'encourage';
}

export function normalizeChatPrompts(value: unknown): string[] {
  const prompts = Array.isArray(value) ? value.map((item) => cleanText(item, '', 18)).filter(Boolean) : [];
  const childFriendly = prompts.filter((prompt) => /故事|童话|为什么|怎么|什么|哪里|动物|小秘密|知识|问/.test(prompt) && !/照顾|出题|答题|题目|游戏|吃饭|喝水/.test(prompt));
  const merged = [...childFriendly, '问一个动物问题', '讲个故事'];
  return [...new Set(merged)].slice(0, 2);
}

export function normalizeCareActions(value: unknown): CareAction[] {
  if (!Array.isArray(value)) return ['observe'];
  const actions = value.filter((item): item is CareAction => allowedCareActions.has(item as CareAction));
  return actions.slice(0, 2).length > 0 ? actions.slice(0, 2) : ['observe'];
}

function hashText(value: string) {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function pickByHash<T>(items: T[], seed: number, offset = 0) {
  return items[(seed + offset) % items.length];
}

function asAnimalContext(animal: StarBuddyAnimalContext | string): StarBuddyAnimalContext {
  if (typeof animal !== 'string') return animal;
  return {
    id: 'animal',
    name: animal,
    category: 'animal',
    summary: `${animal}是宠宠星球里的动物伙伴。`,
    habitat: ['合适栖息地'],
    habits: ['需要安静观察'],
    safeFood: ['合适食物', '清水'],
    unsafeFood: ['人类零食'],
    rest: '需要安静休息',
    safetyNote: '现实中接触动物要先征得成年人同意，遇到野生动物要保持安全距离。',
  };
}

function getShanghaiDate() {
  return new Date();
}

function formatShanghaiWeekday(date = getShanghaiDate()) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    weekday: 'long',
  }).format(date);
}

function formatShanghaiTime(date = getShanghaiDate()) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function generalQuickPrompts() {
  return ['讲个故事', '问一个动物问题'];
}

export function createSafeGeneralChatResponse(message = ''): StarBuddyChatResponse | undefined {
  const normalized = normalizeChildMessage(message)
    .replace(/[？?！!。,.，]/g, ' ')
    .trim();
  if (!normalized) return undefined;

  if (/今天.*(星期|周几|週幾|礼拜几|禮拜幾)|星期几|周几|週幾|礼拜几|禮拜幾/.test(normalized)) {
    return {
      kind: 'chat',
      message: `今天是${formatShanghaiWeekday()}。你还可以问星宝一个动物小秘密。`,
      quickPrompts: generalQuickPrompts(),
      emotion: 'curious',
    };
  }

  if (/现在.*(几点|幾點|时间|時間)|几点了|幾點了|现在时间|現在時間/.test(normalized)) {
    return {
      kind: 'chat',
      message: `现在大约是 ${formatShanghaiTime()}。如果要出门看动物，记得请大人一起看时间。`,
      quickPrompts: generalQuickPrompts(),
      emotion: 'curious',
    };
  }

  const addition = normalized.match(/(\d{1,3})\s*(?:\+|加)\s*(\d{1,3})/);
  if (addition) {
    const left = Number(addition[1]);
    const right = Number(addition[2]);
    return {
      kind: 'chat',
      message: `${left}+${right}=${left + right}。你算得很认真，星宝也想和你一起数一数动物脚印。`,
      quickPrompts: generalQuickPrompts(),
      emotion: 'celebrate',
    };
  }

  if (/为什么.*(天会黑|天黑|晚上)|天为什么会黑|為什麼.*(天會黑|天黑|晚上)/.test(normalized)) {
    return {
      kind: 'chat',
      message: '天会黑，是因为地球一直在转。当我们住的这一边背对太阳时，天空就慢慢变暗，夜晚就来了。',
      quickPrompts: generalQuickPrompts(),
      emotion: 'curious',
    };
  }

  return undefined;
}

function uniqueOptions(options: string[]) {
  return [...new Set(options.map((option) => option.trim()).filter(Boolean))].slice(0, 4);
}

export function createAnimalFactQuiz(animalInput: StarBuddyAnimalContext | string, message = ''): StarBuddyQuizResponse {
  const animal = asAnimalContext(animalInput);
  const seed = hashText(`${animal.id}:${message}:${animal.name}`);
  const safeFood = animal.safeFood[seed % animal.safeFood.length] ?? '清水';
  const unsafeFood = animal.unsafeFood[(seed + 1) % animal.unsafeFood.length] ?? '人类零食';
  const habit = animal.habits[(seed + 2) % animal.habits.length] ?? '安静观察';
  const relatedHabit = animal.habits[(seed + 1) % animal.habits.length] ?? habit;
  const habitat = animal.habitat[(seed + 3) % animal.habitat.length] ?? '合适栖息地';
  const themes = [
    {
      question: `${animal.name}的哪个小知识是对的？`,
      options: uniqueOptions([habit, `可以随便吃${unsafeFood}`, '不需要休息', '可以被突然吓一跳']),
      correctText: habit,
      hint: `${animal.name}有“${habit}”这个特点，所以观察时要慢一点、轻一点。`,
    },
    {
      question: `认识${animal.name}时，哪个食物更适合在百科里了解？`,
      options: uniqueOptions([safeFood, unsafeFood, '高盐零食', '脏水']),
      correctText: safeFood,
      hint: `${safeFood}更适合${animal.name}；${unsafeFood}需要避免。百科里还可以观察“${relatedHabit}”，现实投喂要先问成年人或专业人员。`,
    },
    {
      question: `${animal.name}通常更适合在哪里生活或活动？`,
      options: uniqueOptions([habitat, '吵闹的玩具箱', '没有空气的盒子', '随便丢垃圾的地方']),
      correctText: habitat,
      hint: `${animal.name}需要像“${habitat}”这样的合适环境，环境安全才舒服。`,
    },
    {
      question: `关于${animal.name}休息，哪个说法更接近百科？`,
      options: uniqueOptions([animal.rest, '完全不用休息', '越吵越能睡', '只能站在水里睡']),
      correctText: animal.rest,
      hint: `因为${animal.name}的睡眠/休息节奏是“${animal.rest}”，所以它休息时需要安静，不要强行打扰。`,
    },
    {
      question: `观察${animal.name}时，哪个做法更安全？`,
      options: uniqueOptions([animal.safetyNote, `偷偷喂${unsafeFood}`, '突然追赶它', '把它带离原来的地方']),
      correctText: animal.safetyNote,
      hint: `${animal.safetyNote} 因为真实动物需要安全距离，也需要大人帮忙判断。`,
    },
  ];
  const selected = themes[seed % (themes.length - 1)];
  const correctIndex = selected.options.indexOf(selected.correctText);
  return {
    kind: 'quiz',
    question: selected.question,
    options: selected.options,
    correctIndex: Math.max(0, correctIndex),
    hint: selected.hint,
    emotion: 'curious',
  };
}

export function createLongStoryFallback(animalName = '动物伙伴', message = ''): StarBuddyStoryResponse {
  const seed = hashText(`${animalName}:${message}`);
  const settings = ['星光森林', '月亮花园', '彩虹溪谷', '云朵图书馆', '蒲公英山坡'];
  const treasures = ['会发光的叶子', '唱歌的小石头', '装满风声的贝壳', '会跳舞的影子', '一颗暖暖的小星星'];
  const lessons = ['慢慢观察', '温柔等待', '认真倾听', '勇敢说出想法', '把发现分享给朋友'];
  const setting = pickByHash(settings, seed);
  const treasure = pickByHash(treasures, seed, 2);
  const lesson = pickByHash(lessons, seed, 4);
  const title = `${animalName}和${treasure}`;
  const beats = [
    `清晨，${animalName}醒来时，发现窗边落着一张亮晶晶的小邀请卡。卡片上写着：“请和星宝一起来${setting}，那里藏着一个需要温柔照顾的秘密。”${animalName}把小围巾系好，轻轻点点头，和星宝一起出发了。`,
    `一路上，草叶上挂着小水珠，像一排排透明的小铃铛。星宝提醒说：“我们走慢一点，别吵醒正在休息的小动物。”${animalName}学着放轻脚步，还把路边倒下的小枝条挪到安全的地方。`,
    `到了${setting}，它们看见${treasure}正躲在一片大叶子下面，一闪一闪地发光。${animalName}很想马上跑过去摸一摸，可星宝摇摇头说：“先观察，再靠近，温柔是最好的问候。”`,
    `${animalName}蹲下来，看见地上有细细的脚印，还有几片被风吹乱的花瓣。它猜想，也许昨晚有小伙伴经过这里，留下了想被发现的线索。星宝把这些线索画进星星本子里。`,
    `忽然，远处传来轻轻的哭声。它们顺着声音走过去，看见一只迷路的小云朵正挂在树枝上。${animalName}没有大声喊，而是用柔柔的声音说：“别怕，我们会想办法帮你。”`,
    `星宝变出一条星光丝带，${animalName}用嘴巴轻轻叼住一端，一点一点把丝带送到树枝旁。小云朵顺着丝带滑下来，落在柔软的草地上，像一团刚洗好的棉花。`,
    `小云朵说，它是在找${treasure}时迷路的，因为它想把这份光送给夜里害怕黑的小伙伴。${animalName}听完，心里暖暖的。原来一个小小的发现，也可以帮到别人。`,
    `它们决定一起寻找让${treasure}变亮的方法。星宝说需要三样东西：一阵不着急的风、一句真诚的谢谢，还有一个愿意分享的心愿。${animalName}觉得这些东西听起来很神奇。`,
    `于是，${animalName}坐在草地上等风来。它没有催促，也没有乱跑，只是安静地听叶子说话。过了一会儿，风真的来了，轻轻吹过${treasure}，发出像小铃铛一样的声音。`,
    `接着，${animalName}对小云朵说：“谢谢你告诉我们你的心愿。”小云朵也对${animalName}说：“谢谢你没有笑我迷路。”两句谢谢碰在一起，变成了一点温柔的亮光。`,
    `最后，${animalName}许下心愿：“希望每个小朋友喜欢动物时，都能记得给它们安全距离，也给它们安静休息的时间。”话音刚落，${treasure}亮了起来，把整片${setting}照得像睡前故事一样柔和。`,
    `天快黑时，星宝和${animalName}把光送给了小云朵。小云朵飞上天空，变成一盏小小的夜灯。${animalName}明白了，今天最重要的宝物不是发光的东西，而是学会了${lesson}。`,
  ];
  return {
    kind: 'story',
    title,
    paragraphs: beats,
    choices: [{ label: '继续这个故事', prompt: `继续讲${animalName}在${setting}的温柔冒险` }],
    emotion: 'gentle',
  };
}

function isStoryContinuation(message: string) {
  return /继续|續|上一段|故事标题|故事標題|不要从头|不要重讲|接着讲|接著講|后来/.test(message);
}

function createStoryFallback(animalName: string, message = ''): StarBuddyStoryResponse {
  if (isStoryContinuation(message)) {
    const titleMatch = message.match(/故事标题[:：]\s*([^。.\n]+)/);
    const originalTitle = cleanText(titleMatch?.[1], `${animalName}的故事`, 28);
    const previousMatch = message.match(/上一段[:：]\s*([^。\n]+(?:。[^。\n]+)?)/);
    const previous = cleanText(previousMatch?.[1], `${animalName}刚刚把发现放进星星口袋。`, 90);
    return {
      kind: 'story',
      title: `${originalTitle}的下一段`,
      paragraphs: [
        `星宝轻轻翻开故事本，说：“我们接着往前走。”${previous}`,
        `${animalName}发现星星口袋里又亮起一点小光，像是在提醒它：新的线索就在不远处。它没有从头重来，而是顺着刚才的小路继续走。`,
        `路边的叶子沙沙响，星宝把声音画成一条弯弯的线。${animalName}跟着线索来到一扇圆圆的小门前，门上写着：“温柔观察的人，可以看见更多秘密。”`,
        `它们推开小门，看见一个安静的小角落。${animalName}学会了先听、再看、最后轻轻提问。星宝笑着说：“故事继续长大啦，因为你记住了刚才发生的事。”`,
      ],
      choices: [{ label: '继续这个故事', prompt: `继续讲${originalTitle}，从星星口袋的新线索接着讲` }],
      emotion: 'gentle',
    };
  }
  return {
    kind: 'story',
    title: `${animalName}的小小星光`,
    paragraphs: [
      `${animalName}在宠宠星球遇见了星宝。清晨的草叶上有亮晶晶的小水珠，像一颗颗小星星。`,
      `星宝轻轻说：“今天我们慢慢走，仔细听，看看风把哪些秘密送到身边。”${animalName}点点头，脚步放得很轻。`,
      '它们一起经过柔软的小路，看见叶子摇晃，听见远处传来温柔的声音，还把今天的小发现收进星星口袋。',
      `晚上回到小窝时，${animalName}把最喜欢的发现讲给星宝听。星宝笑着说：“会观察的孩子，也会温柔地保护动物。”`,
    ],
    choices: [{ label: '继续这个故事', prompt: `继续讲${animalName}的小小星光` }],
    emotion: 'gentle',
  };
}

export function fallbackForMode(mode: StarBuddyMode, animalInput: StarBuddyAnimalContext | string = '动物伙伴', message = '', longStory = false): StarBuddyResponse {
  const animal = asAnimalContext(animalInput);
  if (mode === 'care-plan') {
    return {
      kind: 'care-plan',
      message: `星宝建议先安静观察${animal.name}，看看它现在最需要什么。`,
      suggestedActions: ['observe'],
      emotion: 'encourage',
    };
  }
  if (mode === 'story') {
    if (longStory) return createLongStoryFallback(animal.name, message);
    return createStoryFallback(animal.name, message);
  }
  if (mode === 'quiz') {
    return createAnimalFactQuiz(animal, message);
  }
  const safeGeneral = createSafeGeneralChatResponse(message);
  if (safeGeneral) return safeGeneral;
  return {
    kind: 'chat',
    message: `星宝在这里。我们可以一起认识${animal.name}，也可以讲一个温柔故事。`,
    quickPrompts: ['问一个动物问题', '讲个故事'],
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

export function normalizeProviderResponse(
  mode: StarBuddyMode,
  raw: string,
  animalInput: StarBuddyAnimalContext | string,
  normalizeOptions: { maxStoryParagraphs?: number; storyParagraphMaxLength?: number } = {},
): StarBuddyResponse {
  const animal = asAnimalContext(animalInput);
  const parsed = parseJsonObject(raw);
  if (!parsed) {
    return mode === 'chat'
      ? { kind: 'chat', message: cleanText(raw, `星宝想和你一起认识${animal.name}。`), quickPrompts: ['问一个动物问题', '讲个故事'], emotion: 'gentle' }
      : fallbackForMode(mode, animal);
  }

  if (mode === 'care-plan') {
    const response: StarBuddyCarePlanResponse = {
      kind: 'care-plan',
      message: cleanText(parsed.message, `星宝建议先观察${animal.name}。`),
      suggestedActions: normalizeCareActions(parsed.suggestedActions),
      emotion: cleanEmotion(parsed.emotion),
    };
    return response;
  }

  if (mode === 'story') {
    const maxStoryParagraphs = normalizeOptions.maxStoryParagraphs ?? 6;
    const storyParagraphMaxLength = normalizeOptions.storyParagraphMaxLength ?? 260;
    const paragraphs = Array.isArray(parsed.paragraphs)
      ? parsed.paragraphs.map((item) => cleanStoryText(item, '', storyParagraphMaxLength)).filter(Boolean).slice(0, maxStoryParagraphs)
      : [];
    const choices = Array.isArray(parsed.choices)
      ? parsed.choices.map((item) => {
          const choice = item && typeof item === 'object' ? item as Record<string, unknown> : {};
          return { label: cleanText(choice.label, '继续', 16), prompt: cleanText(choice.prompt, `继续讲${animal.name}的故事`, 80) };
        }).slice(0, 2)
      : [];
    const response: StarBuddyStoryResponse = {
      kind: 'story',
      title: cleanText(parsed.title, `${animal.name}的小故事`, 40),
      paragraphs: paragraphs.length > 0 ? paragraphs : [`${animal.name}和星宝一起完成了一次温柔观察。`],
      choices: choices.length > 0 ? choices : [{ label: '继续', prompt: `继续讲${animal.name}的故事` }],
      emotion: cleanEmotion(parsed.emotion),
    };
    return response;
  }

  if (mode === 'quiz') {
    const parsedOptions = Array.isArray(parsed.options) ? parsed.options.map((item) => cleanText(item, '', 32)).filter(Boolean).slice(0, 4) : [];
    const correctIndex = Number.isInteger(parsed.correctIndex) ? Number(parsed.correctIndex) : 0;
    const safeOptions = parsedOptions.length >= 2 ? parsedOptions : createAnimalFactQuiz(animal).options;
    const response: StarBuddyQuizResponse = {
      kind: 'quiz',
      question: cleanText(parsed.question, `观察${animal.name}时，哪个做法更安全？`, 80),
      options: safeOptions,
      correctIndex: Math.min(safeOptions.length - 1, Math.max(0, correctIndex)),
      hint: cleanText(parsed.hint, '安静观察能保护动物，也保护自己。', 120),
      emotion: cleanEmotion(parsed.emotion),
    };
    return response;
  }

  const response: StarBuddyChatResponse = {
    kind: 'chat',
    message: cleanText(parsed.message, `星宝想和你一起认识${animal.name}。`),
    quickPrompts: normalizeChatPrompts(parsed.quickPrompts),
    emotion: cleanEmotion(parsed.emotion),
  };
  return response;
}
