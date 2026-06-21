import type { CareAction } from '../models/interaction';
import type { PetMood } from '../models/pet';
import { listPetSoundClips, type UserPetSoundClip } from './petSoundApi';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export type PetSoundType = 'joy' | 'angry' | 'sad' | 'happy' | 'eat' | 'drink' | 'sleep';

const soundTypes: PetSoundType[] = ['joy', 'angry', 'sad', 'happy', 'eat', 'drink', 'sleep'];

type SoundManifest = {
  soundTypes: PetSoundType[];
  animals: Record<string, {
    clips: Record<PetSoundType, {
      path: string;
      kind: 'real-recording' | 'derived-real-recording' | 'real-action-layer' | 'procedural-action-layer' | 'procedural-fallback' | 'generated-related-cute';
      derivedFrom: string;
    }>;
  }>;
};

const soundVolume: Record<PetSoundType, number> = {
  joy: 0.68,
  angry: 0.72,
  sad: 0.58,
  happy: 0.66,
  eat: 0.54,
  drink: 0.48,
  sleep: 0.42,
};

const soundAssetVersion = '2026-06-10-full-sound-audit-v1';
const audioCache = new Map<string, HTMLAudioElement>();
const decodedAudioBuffers = new Map<string, AudioBuffer>();
const decodedAudioPromises = new Map<string, Promise<AudioBuffer | undefined>>();
const userSoundClipCache = new Map<string, Partial<Record<PetSoundType, string>>>();
let manifestCache: SoundManifest | undefined;
let manifestPromise: Promise<SoundManifest | undefined> | undefined;
let audioContext: AudioContext | undefined;
const soundEnabledKey = 'petpet:sound-enabled';
const soundPreferenceEvent = 'petpet:sound-preference-change';

function getSoundType(mood: PetMood, action: CareAction): PetSoundType {
  if (action === 'feed') return 'eat';
  if (action === 'water') return 'drink';
  if (action === 'rest') return 'sleep';
  if (action === 'play') return mood === 'upset' ? 'angry' : 'joy';
  if (action === 'heal') return mood === 'sick' ? 'sad' : 'happy';
  if (mood === 'tired') return 'sleep';
  if (mood === 'upset') return 'angry';
  if (mood === 'sick' || mood === 'hungry') return 'sad';
  if (mood === 'happy') return 'happy';
  return 'joy';
}

export function isPetSoundEnabled() {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(soundEnabledKey) !== 'false';
}

export function setPetSoundEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(soundEnabledKey, String(enabled));
  window.dispatchEvent(new CustomEvent(soundPreferenceEvent, { detail: { enabled } }));
}

export function subscribePetSoundPreference(listener: (enabled: boolean) => void) {
  if (typeof window === 'undefined') return () => undefined;

  const handlePreference = () => listener(isPetSoundEnabled());
  const handleStorage = (event: StorageEvent) => {
    if (event.key === soundEnabledKey) handlePreference();
  };

  window.addEventListener(soundPreferenceEvent, handlePreference);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener(soundPreferenceEvent, handlePreference);
    window.removeEventListener('storage', handleStorage);
  };
}

function cacheUserSoundClips(petId: string, clips: UserPetSoundClip[]) {
  const next: Partial<Record<PetSoundType, string>> = {};
  for (const clip of clips) {
    next[clip.soundType] = clip.url;
  }
  userSoundClipCache.set(petId, next);
}

export async function preloadUserPetSounds(petId: string) {
  if (!petId || typeof window === 'undefined') return;
  try {
    const { clips } = await listPetSoundClips(petId);
    cacheUserSoundClips(petId, clips);
    for (const clip of clips) {
      getCachedAudio(clip.url).load();
      void ensureDecodedAudio(clip.url);
    }
  } catch {
    userSoundClipCache.delete(petId);
  }
}

export function updateCachedUserPetSounds(petId: string, clips: UserPetSoundClip[]) {
  cacheUserSoundClips(petId, clips);
}

async function loadSoundManifest() {
  if (typeof window.fetch !== 'function') {
    return undefined;
  }

  if (!manifestPromise) {
    manifestPromise = window.fetch('/assets/sounds/manifest.json', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() as Promise<SoundManifest> : undefined))
      .then((manifest) => {
        manifestCache = manifest;
        return manifest;
      })
      .catch(() => undefined);
  }
  return manifestPromise;
}

function versionSoundPath(path: string) {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}v=${soundAssetVersion}`;
}

function getCachedAudio(path: string) {
  const cached = audioCache.get(path);
  if (cached) return cached;

  const audio = new Audio(path);
  audio.preload = 'auto';
  audioCache.set(path, audio);
  return audio;
}

function getAudioContext() {
  if (typeof window === 'undefined') return undefined;
  const AudioContextCtor = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextCtor) return undefined;
  audioContext ??= new AudioContextCtor();
  return audioContext;
}

function ensureDecodedAudio(path: string) {
  const decoded = decodedAudioBuffers.get(path);
  if (decoded) return Promise.resolve(decoded);

  const pending = decodedAudioPromises.get(path);
  if (pending) return pending;

  const context = getAudioContext();
  if (!context || typeof window.fetch !== 'function') {
    return Promise.resolve(undefined);
  }

  const promise = window.fetch(path)
    .then((response) => (response.ok ? response.arrayBuffer() : undefined))
    .then((bytes) => (bytes ? context.decodeAudioData(bytes.slice(0)) : undefined))
    .then((buffer) => {
      if (buffer) decodedAudioBuffers.set(path, buffer);
      return buffer;
    })
    .catch(() => undefined);

  decodedAudioPromises.set(path, promise);
  return promise;
}

function playDecodedAudio(path: string, volume: number) {
  const context = getAudioContext();
  const buffer = decodedAudioBuffers.get(path);
  if (!context || !buffer) return false;

  if (context.state === 'suspended') {
    void context.resume().catch(() => undefined);
  }

  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(context.destination);
  source.start();
  return true;
}

function playAudio(path: string, volume: number) {
  if (playDecodedAudio(path, volume)) return Promise.resolve();
  void ensureDecodedAudio(path);

  const baseAudio = getCachedAudio(path);
  const audio = baseAudio.cloneNode(true) as HTMLAudioElement;
  audio.volume = volume;
  audio.currentTime = 0;
  return audio.play();
}

export async function preloadPetSounds(animalId: string) {
  const manifest = await loadSoundManifest();
  const paths = manifest?.animals[animalId]?.clips
    ? Object.values(manifest.animals[animalId].clips).map((clip) => versionSoundPath(clip.path))
    : soundTypes.map((soundType) => versionSoundPath(`/assets/sounds/${animalId}/${soundType}.wav`));

  for (const path of paths) {
    getCachedAudio(path).load();
    void ensureDecodedAudio(path);
  }
}

export function playPetSound(input: { petId?: string; animalId: string; mood: PetMood; action: CareAction }): void;
export function playPetSound(animalId: string, mood: PetMood, action: CareAction): void;
export function playPetSound(input: { petId?: string; animalId: string; mood: PetMood; action: CareAction } | string, moodArg?: PetMood, actionArg?: CareAction) {
  if (!isPetSoundEnabled()) return;

  const { petId, animalId, mood, action } = typeof input === 'string'
    ? { petId: undefined, animalId: input, mood: moodArg!, action: actionArg! }
    : input;
  const soundType = getSoundType(mood, action);
  const userPath = petId ? userSoundClipCache.get(petId)?.[soundType] : undefined;
  const fallbackPath = `/assets/sounds/${animalId}/${soundType}.wav`;
  const systemPath = manifestCache?.animals[animalId]?.clips[soundType]?.path ?? fallbackPath;
  const immediatePath = userPath ?? versionSoundPath(systemPath);

  try {
    void playAudio(immediatePath, soundVolume[soundType]).catch(() => {
      if (userPath) {
        void playAudio(versionSoundPath(systemPath), soundVolume[soundType]).catch(() => undefined);
        return;
      }
      void loadSoundManifest().then((manifest) => {
        const manifestPath = manifest?.animals[animalId]?.clips[soundType]?.path
          ? versionSoundPath(manifest.animals[animalId].clips[soundType].path)
          : undefined;
        if (manifestPath && manifestPath !== immediatePath) {
          void playAudio(manifestPath, soundVolume[soundType]).catch(() => undefined);
        }
      });
    });
    void loadSoundManifest();
    if (petId && !userSoundClipCache.has(petId)) void preloadUserPetSounds(petId);
  } catch {
    void loadSoundManifest();
  }
}

export function playAnimalVoice(animalId: string) {
  if (!isPetSoundEnabled()) return;

  const fallbackPath = `/assets/sounds/${animalId}/joy.wav`;
  const immediatePath = versionSoundPath(manifestCache?.animals[animalId]?.clips.joy?.path ?? fallbackPath);

  try {
    void playAudio(immediatePath, soundVolume.joy).catch(() => {
      void loadSoundManifest().then((manifest) => {
        const manifestPath = manifest?.animals[animalId]?.clips.joy?.path
          ? versionSoundPath(manifest.animals[animalId].clips.joy.path)
          : undefined;
        if (manifestPath && manifestPath !== immediatePath) {
          void playAudio(manifestPath, soundVolume.joy).catch(() => undefined);
        }
      });
    });
    void loadSoundManifest();
  } catch {
    void loadSoundManifest();
  }
}

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

export function playQuizFeedbackSound(result: 'correct' | 'wrong') {
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
  masterGain.gain.exponentialRampToValueAtTime(result === 'correct' ? 0.16 : 0.11, now + 0.018);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, now + (result === 'correct' ? 0.42 : 0.24));

  const frequencies = result === 'correct' ? [523.25, 659.25, 783.99] : [220, 164.81];
  frequencies.forEach((frequency, index) => {
    const oscillator: OscillatorNode = context.createOscillator();
    const toneGain = context.createGain();
    const start = now + index * (result === 'correct' ? 0.075 : 0.065);
    oscillator.type = result === 'correct' ? 'sine' : 'triangle';
    oscillator.frequency.setValueAtTime(frequency, start);
    toneGain.gain.setValueAtTime(0.0001, start);
    toneGain.gain.exponentialRampToValueAtTime(0.7, start + 0.018);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, start + (result === 'correct' ? 0.18 : 0.16));
    oscillator.connect(toneGain);
    toneGain.connect(masterGain);
    oscillator.start(start);
    oscillator.stop(start + 0.22);
  });
}
