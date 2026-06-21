export type SpeechMode = 'chat' | 'story' | 'quiz';
export type SpeechPlatform = 'ios' | 'android' | 'desktop' | 'unknown';

export interface BrowserSpeechSettings {
  rate: number;
  pitch: number;
  volume: number;
  pauseMs: number;
  maxChunkLength: number;
}

export interface BrowserSpeechProfile {
  platform: SpeechPlatform;
  isMobile: boolean;
  prefersLocalSystemVoice: boolean;
}

const NATURAL_VOICE_HINTS = [
  'Natural',
  'Premium',
  'Online',
  'Xiaoxiao',
  'Yunxi',
  'Xiaoyi',
  'Xiaobei',
  'Tingting',
  'Ting-Ting',
  'Mei-Jia',
  'Meijia',
  'Yu-shu',
  'Li-mu',
  'Sin-ji',
  'Google',
  'Microsoft',
  'Apple',
  'Siri',
];

const IOS_SYSTEM_VOICE_HINTS = [
  'Tingting',
  'Ting-Ting',
  'Mei-Jia',
  'Meijia',
  'Sin-ji',
  'Li-mu',
  'Yu-shu',
  'Apple',
  'Siri',
  '婷婷',
  '美佳',
];

const ANDROID_SYSTEM_VOICE_HINTS = [
  'Google',
  '普通话',
  '普通話',
  '国语',
  '國語',
  'Mandarin',
  'Chinese',
  '中文',
  'zh-CN',
];

const ROBOTIC_VOICE_HINTS = [
  'default',
  'compact',
  'basic',
  'espeak',
  'robot',
  'novelty',
  'sam',
  'desktop',
  'Huihui Desktop',
];

const SPOKEN_OPTION_LABELS: Record<string, string> = {
  A: 'A 选项',
  B: 'B 选项',
  C: 'C 选项',
  D: 'D 选项',
};

function getNavigatorValue<T>(getter: (navigatorValue: Navigator) => T, fallback: T) {
  if (typeof navigator === 'undefined') return fallback;
  return getter(navigator);
}

function normalizeText(text: string) {
  return text
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function prepareSpeechText(text: string) {
  return normalizeText(text)
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[#>*_~[\](){}]/g, ' ')
    .replace(/[•★☆✦✧✨🌟⭐🎉🎈🐾]/g, ' ')
    .replace(/(^|[\s\n。！？；!?;])([A-D])[\.\。、:：]\s*/g, (_match, prefix: string, label: string) => `${prefix}${SPOKEN_OPTION_LABELS[label] ?? `${label} 选项`}，`)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[-—–]{2,}/g, '。')
    .replace(/[，,]\s*[，,]+/g, '，')
    .replace(/[。]\s*[。]+/g, '。')
    .replace(/[!?！？]\s*[!?！？]+/g, '！')
    .replace(/\s+([，。！？；、])/g, '$1')
    .replace(/([，。！？；、])\s+/g, '$1')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function splitLongSentence(sentence: string, maxChunkLength: number) {
  if (sentence.length <= maxChunkLength) return [sentence];
  const pieces: string[] = [];
  let remaining = sentence;

  while (remaining.length > maxChunkLength) {
    let cutIndex = remaining.lastIndexOf('，', maxChunkLength);
    if (cutIndex < Math.floor(maxChunkLength * 0.45)) {
      cutIndex = remaining.lastIndexOf('、', maxChunkLength);
    }
    if (cutIndex < Math.floor(maxChunkLength * 0.45)) {
      cutIndex = maxChunkLength;
    }
    pieces.push(remaining.slice(0, cutIndex + 1).trim());
    remaining = remaining.slice(cutIndex + 1).trim();
  }

  if (remaining) pieces.push(remaining);
  return pieces;
}

export function splitSpeechText(text: string, maxChunkLength = 140) {
  const normalized = normalizeText(prepareSpeechText(text));
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n+/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const chunks: string[] = [];

  for (const paragraph of paragraphs) {
    const sentences = paragraph.match(/[^。！？；!?;]+[。！？；!?;]?/g) ?? [paragraph];
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;
      chunks.push(...splitLongSentence(trimmed, maxChunkLength));
    }
  }

  return chunks.filter(Boolean);
}

export function detectSpeechPlatform(
  userAgent = getNavigatorValue((navigatorValue) => navigatorValue.userAgent, ''),
  platform = getNavigatorValue((navigatorValue) => navigatorValue.platform, ''),
  maxTouchPoints = getNavigatorValue((navigatorValue) => navigatorValue.maxTouchPoints ?? 0, 0),
): SpeechPlatform {
  const target = `${userAgent} ${platform}`;
  if (/iPhone|iPad|iPod/i.test(target) || (/Macintosh/i.test(target) && maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(target)) return 'android';
  if (/Windows|Macintosh|MacIntel|Linux|X11|CrOS/i.test(target)) return 'desktop';
  return 'unknown';
}

export function getSpeechProfile(platform = detectSpeechPlatform()): BrowserSpeechProfile {
  const isMobile = platform === 'ios' || platform === 'android';
  return {
    platform,
    isMobile,
    prefersLocalSystemVoice: isMobile,
  };
}

function includesHint(value: string, hints: string[]) {
  const lowerValue = value.toLowerCase();
  return hints.some((hint) => lowerValue.includes(hint.toLowerCase()));
}

function scoreVoice(voice: SpeechSynthesisVoice, profile: BrowserSpeechProfile) {
  const name = voice.name || '';
  const lang = voice.lang || '';
  const target = `${name} ${lang}`;
  let score = 0;

  if (/^zh-CN/i.test(lang)) score += 120;
  else if (/^zh/i.test(lang)) score += 70;
  else if (/cmn|mandarin|chinese|中文|普通话|普通話/i.test(target)) score += 45;

  if (voice.localService) score += profile.prefersLocalSystemVoice ? 34 : 10;

  if (profile.platform === 'ios' && includesHint(target, IOS_SYSTEM_VOICE_HINTS)) {
    score += 42;
  }
  if (profile.platform === 'android' && includesHint(target, ANDROID_SYSTEM_VOICE_HINTS)) {
    score += 38;
  }
  if (!profile.isMobile && /Natural|Premium|Online|Microsoft|Google|Apple/i.test(target)) {
    score += 30;
  }

  if (includesHint(target, NATURAL_VOICE_HINTS)) {
    score += 18;
  }

  if (includesHint(target, ROBOTIC_VOICE_HINTS)) {
    score -= profile.isMobile ? 58 : 44;
  }

  if (/female|woman|xiaoxiao|tingting|meijia|mei-jia|huihui|yaoyao/i.test(name)) score += 6;
  if (/child|kid|girl|boy|童|萌/i.test(name)) score += 5;

  return score;
}

export function chooseBestChineseVoice(voices: SpeechSynthesisVoice[], profile = getSpeechProfile()) {
  const chineseVoices = voices.filter((voice) => /^zh/i.test(voice.lang || '') || /chinese|mandarin|xiaoxiao|yunxi|tingting|mei-jia|meijia/i.test(voice.name || ''));
  const candidates = chineseVoices.length ? chineseVoices : voices;
  return [...candidates].sort((a, b) => scoreVoice(b, profile) - scoreVoice(a, profile))[0] ?? null;
}

export function getSpeechVoiceLabel(voice: SpeechSynthesisVoice | null, profile = getSpeechProfile()) {
  if (profile.isMobile && voice?.localService) return '手机系统朗读';
  if (profile.isMobile) return '手机浏览器朗读';
  if (voice && /Natural|Premium|Online/i.test(voice.name)) return '自然音色朗读';
  return '电脑浏览器朗读';
}

export function getSpeechSettings(mode: SpeechMode, profile = getSpeechProfile()): BrowserSpeechSettings {
  if (mode === 'story') {
    return profile.isMobile
      ? {
          rate: 0.78,
          pitch: 1.03,
          volume: 1,
          pauseMs: 340,
          maxChunkLength: 92,
        }
      : {
          rate: 0.84,
          pitch: 1.04,
          volume: 1,
          pauseMs: 280,
          maxChunkLength: 112,
        };
  }

  if (mode === 'quiz') {
    return profile.isMobile
      ? {
          rate: 0.86,
          pitch: 1.06,
          volume: 1,
          pauseMs: 180,
          maxChunkLength: 116,
        }
      : {
          rate: 0.9,
          pitch: 1.07,
          volume: 1,
          pauseMs: 140,
          maxChunkLength: 136,
        };
  }

  return profile.isMobile
    ? {
        rate: 0.88,
        pitch: 1.06,
        volume: 1,
        pauseMs: 150,
        maxChunkLength: 124,
      }
    : {
        rate: 0.92,
        pitch: 1.06,
        volume: 1,
        pauseMs: 120,
        maxChunkLength: 150,
      };
}
