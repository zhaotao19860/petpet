import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createApp } from '../dist/app.js';
import { createStarAiProvider } from '../dist/ai/providers/index.js';
import { createTextToSpeechProvider } from '../dist/ai/providers/textToSpeechProvider.js';

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
  assert.deepEqual(response.json().response.quickPrompts, ['问一个动物问题', '讲个故事']);
  await app.close();
});

test('star buddy chat can answer safe everyday questions', async () => {
  process.env.AI_PROVIDER = 'mock';
  const app = await createApp({ storage: 'memory' });
  const cookie = await registerAndLogin(app, 'alice-general-ai');
  const pet = await createPet(app, cookie);
  const response = await app.inject({
    method: 'POST',
    url: '/api/ai/star-buddy/chat',
    headers: { cookie },
    payload: { petId: pet.id, message: '今天是星期几？' },
  });
  const chat = response.json().response;
  assert.equal(response.statusCode, 200);
  assert.equal(chat.kind, 'chat');
  assert.match(chat.message, /星期|周/);
  assert.doesNotMatch(chat.message, /只能|只知道|只会|先认识/);
  await app.close();
});

test('star buddy prompt allows child-safe general knowledge while keeping animal priority', () => {
  const source = readFileSync(resolve(import.meta.dirname, '../src/ai/starBuddy.ts'), 'utf8');

  assert.match(source, /儿童安全的日常小问题/);
  assert.match(source, /时间日期/);
  assert.match(source, /简单算术/);
  assert.match(source, /自然常识/);
  assert.match(source, /动物陪伴/);
  assert.doesNotMatch(source, /只围绕当前动物、照顾建议、动物知识、故事和小测验回答/);
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

test('oneapi speed-first provider routes chat to GLM chat completions', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  process.env.AI_PROVIDER = 'oneapi';
  process.env.ONEAPI_TOKEN = 'test-token';
  process.env.AI_MODEL_STRATEGY = 'speed-first';
  process.env.AI_FAST_MODEL = 'GLM-5-Turbo';
  process.env.AI_SMART_MODEL = 'GPT-5.4-Mini';
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), body: JSON.parse(String(options.body)) });
    return new Response(JSON.stringify({
      choices: [{ message: { content: '{"kind":"chat","message":"快快回答","quickPrompts":["讲故事"],"emotion":"curious"}' } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const provider = createStarAiProvider();
    const raw = await provider.complete({ mode: 'chat', system: 'sys', user: 'hi', timeoutMs: 1000 });
    assert.match(raw, /快快回答/);
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /\/v1\/chat\/completions$/);
    assert.equal(calls[0].body.model, 'GLM-5-Turbo');
    assert.equal(calls[0].body.max_tokens, 220);
    assert.equal(calls[0].body.enable_thinking, false);
    assert.deepEqual(calls[0].body.thinking, { type: 'disabled' });
    assert.deepEqual(calls[0].body.response_format, { type: 'json_object' });
  } finally {
    global.fetch = originalFetch;
  }
});

test('oneapi provider routes GPT story requests to responses endpoint', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  process.env.AI_PROVIDER = 'oneapi';
  process.env.ONEAPI_TOKEN = 'test-token';
  process.env.AI_MODEL_STRATEGY = 'speed-first';
  process.env.AI_FAST_MODEL = 'GLM-5-Turbo';
  process.env.AI_SMART_MODEL = 'GPT-5.4-Mini';
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), body: JSON.parse(String(options.body)) });
    return new Response(JSON.stringify({
      output_text: '{"kind":"story","title":"星星故事","paragraphs":["你好"],"choices":[],"emotion":"gentle"}',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const provider = createStarAiProvider();
    const raw = await provider.complete({ mode: 'story', system: 'sys', user: 'hi', timeoutMs: 1000 });
    assert.match(raw, /星星故事/);
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /\/v1\/responses$/);
    assert.equal(calls[0].body.model, 'GPT-5.4-Mini');
    assert.equal(calls[0].body.max_output_tokens, 900);
  } finally {
    global.fetch = originalFetch;
  }
});

test('oneapi provider gives long story requests a larger output budget', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  process.env.AI_PROVIDER = 'oneapi';
  process.env.ONEAPI_TOKEN = 'test-token';
  process.env.AI_MODEL_STRATEGY = 'speed-first';
  process.env.AI_FAST_MODEL = 'GLM-5-Turbo';
  process.env.AI_SMART_MODEL = 'GPT-5.4-Mini';
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), body: JSON.parse(String(options.body)) });
    return new Response(JSON.stringify({
      output_text: '{"kind":"story","title":"长故事","paragraphs":["第一章"],"choices":[],"emotion":"gentle"}',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const provider = createStarAiProvider();
    await provider.complete({ mode: 'story', system: 'sys', user: '孩子的问题：给我找一个一万字的故事', timeoutMs: 1000 });
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /\/v1\/responses$/);
    assert.equal(calls[0].body.max_output_tokens, 12000);
  } finally {
    global.fetch = originalFetch;
  }
});

test('star buddy asks providers for long stories when children request ten thousand characters', async () => {
  const app = await createApp({ storage: 'memory' });
  const cookie = await registerAndLogin(app, 'long-story-ai');
  const pet = await createPet(app, cookie);
  const calls = [];
  const originalProvider = process.env.AI_PROVIDER;
  process.env.AI_PROVIDER = 'mock';
  const providerResponse = JSON.stringify({
    kind: 'story',
    title: '很长的荷兰兔故事',
    paragraphs: Array.from({ length: 12 }, (_, index) => `第${index + 1}段，星宝和荷兰兔慢慢走过温柔的小路。`),
    choices: [{ label: '继续', prompt: '继续这个长故事' }],
    emotion: 'gentle',
  });
  const originalFetch = global.fetch;

  try {
    const { createStarBuddyReply } = await import('../dist/ai/starBuddy.js');
    const story = await createStarBuddyReply({
      mode: 'story',
      message: '给我找一个一万字的故事',
      pet,
      provider: {
        async complete(request) {
          calls.push(request);
          return providerResponse;
        },
      },
    });
    assert.equal(story.kind, 'story');
    assert.equal(story.paragraphs.length, 12);
    assert.match(calls[0].system, /长篇故事模式/);
    assert.match(calls[0].system, /12-20 段/);
    assert.equal(calls[0].timeoutMs, 60000);
  } finally {
    global.fetch = originalFetch;
    process.env.AI_PROVIDER = originalProvider;
    await app.close();
  }
});

test('star buddy treats traditional Chinese ten-thousand-character story prompts as long stories', async () => {
  const app = await createApp({ storage: 'memory' });
  const cookie = await registerAndLogin(app, 'long-story-traditional-ai');
  const pet = await createPet(app, cookie, 'rabbit_holland_lop');
  const calls = [];
  const providerResponse = JSON.stringify({
    kind: 'story',
    title: '一萬字兔兔故事',
    paragraphs: Array.from({ length: 12 }, (_, index) => `第${index + 1}段，荷兰兔和星宝在星光小路上发现新的温柔秘密。`),
    choices: [{ label: '继续', prompt: '继续这个长故事' }],
    emotion: 'gentle',
  });

  try {
    const { createStarBuddyReply } = await import('../dist/ai/starBuddy.js');
    const story = await createStarBuddyReply({
      mode: 'story',
      message: '請講一個一萬字的童話故事',
      pet,
      provider: {
        async complete(request) {
          calls.push(request);
          return providerResponse;
        },
      },
    });
    assert.equal(story.kind, 'story');
    assert.equal(story.paragraphs.length, 12);
    assert.match(calls[0].system, /长篇故事模式/);
    assert.equal(calls[0].outputSize, 'long');
    assert.equal(calls[0].timeoutMs, 60000);
  } finally {
    await app.close();
  }
});

test('star buddy long story fallback is long enough and varies by prompt', async () => {
  const app = await createApp({ storage: 'memory' });
  const cookie = await registerAndLogin(app, 'long-story-fallback-ai');
  const pet = await createPet(app, cookie, 'rabbit_holland_lop');

  try {
    const { createStarBuddyReply } = await import('../dist/ai/starBuddy.js');
    const provider = {
      async complete() {
        throw new Error('provider down');
      },
    };
    const first = await createStarBuddyReply({ mode: 'story', message: '請講一個一萬字的童話故事', pet, provider });
    const second = await createStarBuddyReply({ mode: 'story', message: '請講一個一萬字的森林冒險故事', pet, provider });
    assert.equal(first.kind, 'story');
    assert.equal(second.kind, 'story');
    assert.ok(first.paragraphs.length >= 10);
    assert.ok(first.paragraphs.join('').length >= 900);
    assert.notEqual(first.title, second.title);
  } finally {
    await app.close();
  }
});

test('star buddy short story continuation fallback continues instead of restarting fixed title', async () => {
  const app = await createApp({ storage: 'memory' });
  const cookie = await registerAndLogin(app, 'story-continuation-fallback-ai');
  const pet = await createPet(app, cookie, 'cat_orange');

  try {
    const { createStarBuddyReply } = await import('../dist/ai/starBuddy.js');
    const provider = {
      async complete() {
        throw new Error('provider down');
      },
    };
    const story = await createStarBuddyReply({
      mode: 'story',
      message: '继续这个故事。故事标题：橘猫和星星口袋。上一段：橘猫把今天看到的颜色放进星星口袋。',
      pet,
      provider,
    });
    assert.equal(story.kind, 'story');
    assert.doesNotMatch(story.title, /^橘猫的小小星光$/);
    assert.match(story.title, /继续|后来|星星口袋|下一段/);
    assert.match(story.paragraphs.join(''), /星星口袋|上一段|继续|后来/);
  } finally {
    await app.close();
  }
});

test('star buddy story mock returns a longer read-aloud fairy tale', async () => {
  process.env.AI_PROVIDER = 'mock';
  const app = await createApp({ storage: 'memory' });
  const cookie = await registerAndLogin(app, 'story-ai');
  const pet = await createPet(app, cookie);
  const response = await app.inject({
    method: 'POST',
    url: '/api/ai/star-buddy/story',
    headers: { cookie },
    payload: { petId: pet.id, message: '讲一个长一点的动物童话故事' },
  });
  const story = response.json().response;
  assert.equal(response.statusCode, 200);
  assert.equal(story.kind, 'story');
  assert.ok(story.paragraphs.length >= 4);
  assert.ok(story.paragraphs.join('').length >= 180);
  await app.close();
});

test('star buddy quiz returns encyclopedia-relevant multiple choice for owned pet', async () => {
  process.env.AI_PROVIDER = 'mock';
  const app = await createApp({ storage: 'memory' });
  const cookie = await registerAndLogin(app, 'quiz-ai');
  const pet = await createPet(app, cookie, 'cat_orange');
  const response = await app.inject({
    method: 'POST',
    url: '/api/ai/star-buddy/quiz',
    headers: { cookie },
    payload: { petId: pet.id, message: '出一个关于橘猫的问题' },
  });
  const quiz = response.json().response;
  assert.equal(response.statusCode, 200);
  assert.equal(quiz.kind, 'quiz');
  assert.ok(quiz.options.length >= 3);
  assert.ok(quiz.correctIndex >= 0 && quiz.correctIndex < quiz.options.length);
  assert.match([quiz.question, ...quiz.options, quiz.hint].join(''), /呼噜|清水|巧克力|洋葱|葡萄|睡眠|梳理|安全/);
  assert.match(quiz.hint, /因为|所以|可以|需要|能/);
  await app.close();
});

test('star buddy quiz fallback uses animal facts and explains the answer', async () => {
  const app = await createApp({ storage: 'memory' });
  const cookie = await registerAndLogin(app, 'quiz-fallback-ai');
  const pet = await createPet(app, cookie, 'cat_orange');

  try {
    const { createStarBuddyReply } = await import('../dist/ai/starBuddy.js');
    const quiz = await createStarBuddyReply({
      mode: 'quiz',
      message: '出一个百科选择题',
      pet,
      provider: {
        async complete() {
          throw new Error('provider down');
        },
      },
    });
    assert.equal(quiz.kind, 'quiz');
    assert.ok(quiz.options.length >= 3);
    assert.ok(quiz.correctIndex >= 0 && quiz.correctIndex < quiz.options.length);
    assert.match([quiz.question, ...quiz.options, quiz.hint].join(''), /呼噜|清水|巧克力|洋葱|葡萄|睡眠|梳理|安全|休息|12-16/);
    assert.match(quiz.hint, /因为|所以|可以|需要|能/);
  } finally {
    await app.close();
  }
});

test('star buddy quiz can use encyclopedia facts for non-pet animals', async () => {
  process.env.AI_PROVIDER = 'mock';
  const app = await createApp({ storage: 'memory' });
  const cookie = await registerAndLogin(app, 'quiz-dolphin-ai');
  const pet = await createPet(app, cookie, 'dolphin_bottlenose');
  const response = await app.inject({
    method: 'POST',
    url: '/api/ai/star-buddy/quiz',
    headers: { cookie },
    payload: { petId: pet.id, message: '出一个宽吻海豚百科题' },
  });
  const quiz = response.json().response;
  assert.equal(response.statusCode, 200);
  assert.equal(quiz.kind, 'quiz');
  assert.match([quiz.question, ...quiz.options, quiz.hint].join(''), /回声定位|半脑睡眠|海湾|近海|乌贼|塑料|群体合作|跳跃换气/);
  await app.close();
});

test('star buddy knows woodlouse facts for quizzes', async () => {
  process.env.AI_PROVIDER = 'mock';
  const app = await createApp({ storage: 'memory' });
  const cookie = await registerAndLogin(app, 'quiz-woodlouse-ai');
  const pet = await createPet(app, cookie, 'woodlouse_pillbug');
  const response = await app.inject({
    method: 'POST',
    url: '/api/ai/star-buddy/quiz',
    headers: { cookie },
    payload: { petId: pet.id, message: '出一个西瓜虫百科题' },
  });
  const quiz = response.json().response;
  assert.equal(response.statusCode, 200);
  assert.equal(quiz.kind, 'quiz');
  assert.match([quiz.question, ...quiz.options, quiz.hint].join(''), /潮湿|落叶|蜕皮|卷成|腐叶|甲壳|育幼袋|腐木旁边|石头下方|杀虫剂|清洁剂/);
  await app.close();
});

test('speech-to-text route requires login', async () => {
  const app = await createApp({ storage: 'memory' });
  const form = new FormData();
  form.append('audio', new Blob(['audio'], { type: 'audio/webm' }), 'voice.webm');
  const response = await app.inject({
    method: 'POST',
    url: '/api/ai/speech-to-text',
    headers: form.headers,
    payload: form,
  });
  assert.equal(response.statusCode, 401);
  await app.close();
});

test('oneapi speech-to-text route sends uploaded audio to transcription endpoint', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  process.env.AI_PROVIDER = 'oneapi';
  process.env.ONEAPI_TOKEN = 'test-token';
  process.env.AI_STT_MODEL = 'whisper-1';
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), body: options.body });
    return new Response(JSON.stringify({ text: '是干草吗' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const app = await createApp({ storage: 'memory' });
    const cookie = await registerAndLogin(app, 'speech-ai');
    const form = new FormData();
    form.append('audio', new Blob(['pretend audio'], { type: 'audio/webm' }), 'voice.webm');
    const response = await app.inject({
      method: 'POST',
      url: '/api/ai/speech-to-text',
      headers: { cookie, ...form.headers },
      payload: form,
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().text, '是干草吗');
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /\/v1\/audio\/transcriptions$/);
    assert.ok(calls[0].body instanceof FormData);
    assert.equal(calls[0].body.get('model'), 'whisper-1');
    await app.close();
  } finally {
    global.fetch = originalFetch;
  }
});

test('cloudflare speech-to-text provider uses Workers AI whisper without changing chat provider', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  process.env.AI_PROVIDER = 'oneapi';
  process.env.STT_PROVIDER = 'cloudflare';
  process.env.CLOUDFLARE_ACCOUNT_ID = 'account-123';
  process.env.CLOUDFLARE_API_TOKEN = 'cloudflare-test-token';
  process.env.CLOUDFLARE_STT_MODEL = '@cf/openai/whisper';
  global.fetch = async (url, options) => {
    calls.push({
      url: String(url),
      authorization: options.headers.Authorization,
      body: JSON.parse(String(options.body)),
    });
    return new Response(JSON.stringify({ text: '橘猫为什么呼噜' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const app = await createApp({ storage: 'memory' });
    const cookie = await registerAndLogin(app, 'cloudflare-speech-ai');
    const form = new FormData();
    form.append('audio', new Blob(['pretend audio'], { type: 'audio/webm' }), 'voice.webm');
    const response = await app.inject({
      method: 'POST',
      url: '/api/ai/speech-to-text',
      headers: { cookie, ...form.headers },
      payload: form,
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().text, '橘猫为什么呼噜');
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /^https:\/\/api\.cloudflare\.com\/client\/v4\/accounts\/account-123\/ai\/run\/@cf\/openai\/whisper$/);
    assert.equal(calls[0].authorization, 'Bearer cloudflare-test-token');
    assert.deepEqual(calls[0].body.audio, Array.from(new TextEncoder().encode('pretend audio')));
    assert.equal('source_lang' in calls[0].body, false);
    await app.close();
  } finally {
    global.fetch = originalFetch;
    delete process.env.STT_PROVIDER;
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CLOUDFLARE_STT_MODEL;
  }
});

test('text-to-speech route requires login', async () => {
  const app = await createApp({ storage: 'memory' });
  const response = await app.inject({
    method: 'POST',
    url: '/api/ai/text-to-speech',
    payload: { text: '星宝讲故事', mode: 'story' },
  });
  assert.equal(response.statusCode, 401);
  await app.close();
});

test('mock text-to-speech route returns cached mp3 audio for read aloud', async () => {
  process.env.TTS_PROVIDER = 'mock';
  const app = await createApp({ storage: 'memory' });
  const cookie = await registerAndLogin(app, 'tts-ai');
  const first = await app.inject({
    method: 'POST',
    url: '/api/ai/text-to-speech',
    headers: { cookie },
    payload: { text: '星宝给小朋友讲一个温柔的动物故事。', mode: 'story' },
  });
  const second = await app.inject({
    method: 'POST',
    url: '/api/ai/text-to-speech',
    headers: { cookie },
    payload: { text: '星宝给小朋友讲一个温柔的动物故事。', mode: 'story' },
  });
  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 200);
  assert.equal(first.headers['content-type'], 'audio/mpeg');
  assert.equal(first.headers['x-petpet-tts-provider'], 'mock');
  assert.equal(first.headers['x-petpet-tts-cache'], 'miss');
  assert.equal(second.headers['x-petpet-tts-cache'], 'hit');
  assert.ok(first.rawPayload.byteLength > 16);
  assert.equal(first.rawPayload.subarray(0, 3).toString('latin1'), 'ID3');
  assert.deepEqual(first.rawPayload, second.rawPayload);
  await app.close();
});

test('oneapi text-to-speech provider posts to audio speech endpoint', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  process.env.TTS_PROVIDER = 'oneapi';
  process.env.ONEAPI_TOKEN = 'test-token';
  process.env.AI_BASE_URL = 'https://oneapi.example.test';
  process.env.TTS_MODEL = 'tts-1';
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), body: JSON.parse(String(options.body)), authorization: options.headers.Authorization });
    return new Response(Buffer.from('ID3oneapi-audio'), {
      status: 200,
      headers: { 'Content-Type': 'audio/mpeg' },
    });
  };

  try {
    const app = await createApp({ storage: 'memory' });
    const cookie = await registerAndLogin(app, 'oneapi-tts-ai');
    const response = await app.inject({
      method: 'POST',
      url: '/api/ai/text-to-speech',
      headers: { cookie },
      payload: { text: '星宝讲一个故事', mode: 'story' },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers['x-petpet-tts-provider'], 'oneapi');
    assert.equal(response.rawPayload.subarray(0, 3).toString('latin1'), 'ID3');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://oneapi.example.test/v1/audio/speech');
    assert.equal(calls[0].authorization, 'Bearer test-token');
    assert.equal(calls[0].body.model, 'tts-1');
    assert.equal(calls[0].body.voice, 'nova');
    assert.equal(calls[0].body.response_format, 'mp3');
    assert.match(calls[0].body.input, /星宝讲一个故事/);
    await app.close();
  } finally {
    global.fetch = originalFetch;
    delete process.env.TTS_PROVIDER;
    delete process.env.ONEAPI_TOKEN;
    delete process.env.AI_BASE_URL;
    delete process.env.TTS_MODEL;
  }
});

test('text-to-speech defaults to edge voice even when oneapi token exists', () => {
  const previous = {
    TTS_PROVIDER: process.env.TTS_PROVIDER,
    TTS_API_KEY: process.env.TTS_API_KEY,
    ONEAPI_TOKEN: process.env.ONEAPI_TOKEN,
    AI_API_KEY: process.env.AI_API_KEY,
  };
  delete process.env.TTS_PROVIDER;
  delete process.env.TTS_API_KEY;
  delete process.env.AI_API_KEY;
  process.env.ONEAPI_TOKEN = 'test-token';

  try {
    assert.equal(createTextToSpeechProvider().constructor.name, 'EdgeTextToSpeechProvider');
    process.env.TTS_PROVIDER = 'oneapi';
    assert.equal(createTextToSpeechProvider().constructor.name, 'OneApiTextToSpeechProvider');
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('text-to-speech provider layer supports edge voices and request normalization', () => {
  const source = readFileSync(resolve(import.meta.dirname, '../src/ai/providers/textToSpeechProvider.ts'), 'utf8');
  const routeSource = readFileSync(resolve(import.meta.dirname, '../src/routes/ai.ts'), 'utf8');
  const typesSource = readFileSync(resolve(import.meta.dirname, '../src/ai/types.ts'), 'utf8');

  assert.match(typesSource, /export interface TextToSpeechResult/);
  assert.match(source, /createTextToSpeechProvider/);
  assert.match(source, /TTS_PROVIDER/);
  assert.match(source, /OneApiTextToSpeechProvider/);
  assert.match(source, /\/v1\/audio\/speech/);
  assert.match(source, /edge/);
  assert.match(source, /edge-tts/);
  assert.match(source, /zh-CN-XiaoxiaoNeural/);
  assert.match(source, /zh-CN-XiaoyouNeural/);
  assert.match(source, /audio-24khz-96kbitrate-mono-mp3/);
  assert.match(source, /maxTextLength/);
  assert.match(source, /ttsCache/);
  assert.match(routeSource, /\/api\/ai\/text-to-speech/);
  assert.match(routeSource, /synthesizeTextToSpeech/);
  assert.match(routeSource, /\.type\(audio\.mimeType\)/);
});

test('oneapi provider rejects html responses so star buddy can use fallback', async () => {
  const originalFetch = global.fetch;
  process.env.AI_PROVIDER = 'oneapi';
  process.env.ONEAPI_TOKEN = 'test-token';
  process.env.AI_FAST_MODEL = 'Kimi-K2.5';
  global.fetch = async () => new Response('<html>not model json</html>', {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });

  try {
    const provider = createStarAiProvider();
    await assert.rejects(
      () => provider.complete({ mode: 'chat', system: 'sys', user: 'hi', timeoutMs: 1000 }),
      /ONEAPI_NON_JSON_RESPONSE/,
    );
  } finally {
    global.fetch = originalFetch;
  }
});
