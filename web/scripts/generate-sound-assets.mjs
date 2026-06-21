import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(__dirname, '..');
const outputRoot = resolve(webRoot, 'public/assets/sounds');

const animalIds = [
  'cat_orange',
  'dog_shiba',
  'rabbit_holland',
  'hamster_golden',
  'guinea_pig',
  'hedgehog_african',
  'butterfly_swallowtail',
  'beetle_hercules',
  'bee_honey',
  'horse_thoroughbred',
  'elephant_asian',
  'giraffe_reticulated',
  'lion_african',
  'panda_giant',
  'fox_arctic',
  'owl_barn',
  'parrot_macaw',
  'swift_common',
  'tree_frog',
  'salamander_fire',
  'toad_chinese',
  'tortoise_russian',
  'gecko_leopard',
  'chameleon_veiled',
  'clownfish',
  'turtle_green_sea',
  'dolphin_bottlenose',
  'chicken_hen',
  'goat_dwarf',
  'alpaca',
];

const soundTypes = ['joy', 'angry', 'sad', 'happy', 'eat', 'drink', 'sleep'];
const sampleRate = 22050;
const maxAmplitude = 0.58;

const animalProfiles = animalIds.reduce((profiles, id, index) => {
  const family = getAnimalFamily(id);
  profiles[id] = {
    family,
    base: familyBaseFrequency(family) + (index % 7) * 13,
    roughness: 0.12 + (index % 5) * 0.035,
    brightness: 0.55 + (index % 6) * 0.07,
    rhythmOffset: (index % 4) * 0.025,
  };
  return profiles;
}, {});

for (const animalId of animalIds) {
  const animalDir = resolve(outputRoot, animalId);
  mkdirSync(animalDir, { recursive: true });
  for (const soundType of soundTypes) {
    const samples = renderSound(animalProfiles[animalId], soundType);
    const filePath = resolve(animalDir, `${soundType}.wav`);
    writeFileSync(filePath, encodeWav(samples));
  }
}

console.log(`Generated ${animalIds.length * soundTypes.length} sound files in ${outputRoot}`);

function getAnimalFamily(id) {
  if (id.includes('cat') || id.includes('lion') || id.includes('fox')) return 'predator';
  if (id.includes('dog')) return 'canine';
  if (id.includes('rabbit') || id.includes('hamster') || id.includes('guinea') || id.includes('hedgehog')) return 'smallMammal';
  if (id.includes('butterfly') || id.includes('beetle') || id.includes('bee')) return 'insect';
  if (id.includes('horse') || id.includes('goat') || id.includes('alpaca') || id.includes('giraffe')) return 'hoofed';
  if (id.includes('elephant')) return 'giant';
  if (id.includes('owl') || id.includes('parrot') || id.includes('swift') || id.includes('chicken')) return 'bird';
  if (id.includes('frog') || id.includes('toad') || id.includes('salamander')) return 'amphibian';
  if (id.includes('tortoise') || id.includes('turtle') || id.includes('gecko') || id.includes('chameleon')) return 'reptile';
  if (id.includes('clownfish') || id.includes('dolphin')) return 'aquatic';
  return 'default';
}

function familyBaseFrequency(family) {
  return {
    predator: 240,
    canine: 300,
    smallMammal: 520,
    insect: 760,
    hoofed: 210,
    giant: 95,
    bird: 640,
    amphibian: 180,
    reptile: 160,
    aquatic: 430,
    default: 360,
  }[family];
}

function renderSound(profile, type) {
  const duration = {
    joy: 0.62,
    angry: 0.72,
    sad: 0.82,
    happy: 0.78,
    eat: 0.86,
    drink: 0.74,
    sleep: 1.18,
  }[type];
  const total = Math.floor(sampleRate * duration);
  const samples = new Float32Array(total);

  for (let i = 0; i < total; i += 1) {
    const t = i / sampleRate;
    const progress = t / duration;
    let value = 0;

    if (type === 'eat') {
      value = renderPulses(t, progress, profile, 8.5 + profile.rhythmOffset * 12, 0.28, 0.14, 0.26);
    } else if (type === 'drink') {
      value = renderPulses(t, progress, profile, 11.5 + profile.rhythmOffset * 10, 0.44, 0.22, 0.18);
    } else if (type === 'sleep') {
      const breath = Math.sin(Math.PI * progress * 5.5) ** 2;
      value = sine(profile.base * 0.42, t) * breath * envelope(progress, 0.18, 0.2) * 0.42;
      value += noise(i, profile.base) * breath * 0.035;
    } else if (type === 'angry') {
      const freq = profile.base * 0.75 + wobble(t, 22, 34);
      value = roughTone(freq, t, profile.roughness + 0.22) * envelope(progress, 0.04, 0.18) * 0.72;
      value += noise(i, profile.base) * 0.13 * envelope(progress, 0.02, 0.12);
    } else if (type === 'sad') {
      const freq = profile.base * (0.94 - progress * 0.36);
      value = sine(freq, t) * envelope(progress, 0.16, 0.3) * 0.48;
      value += sine(freq * 0.5, t) * envelope(progress, 0.2, 0.34) * 0.28;
    } else if (type === 'happy') {
      const chirp = Math.floor(progress * 5) % 2 === 0 ? 1.35 : 1.08;
      const freq = profile.base * chirp + wobble(t, 9, 18);
      value = brightTone(freq, t, profile.brightness) * envelope(progress, 0.05, 0.12) * 0.58;
    } else {
      const freq = profile.base * (1.05 + progress * 0.45) + wobble(t, 12, 22);
      value = brightTone(freq, t, profile.brightness) * envelope(progress, 0.04, 0.16) * 0.56;
    }

    samples[i] = clamp(value * maxAmplitude, -0.95, 0.95);
  }

  return samples;
}

function renderPulses(t, progress, profile, rate, toneRatio, noiseRatio, strength) {
  const pulse = Math.sin(Math.PI * ((t * rate) % 1)) ** 12;
  const freq = profile.base * toneRatio + wobble(t, rate * 1.7, 16);
  return (sine(freq, t) * toneRatio + noise(Math.floor(t * sampleRate), profile.base) * noiseRatio) * pulse * envelope(progress, 0.03, 0.14) * strength;
}

function sine(freq, t) {
  return Math.sin(2 * Math.PI * freq * t);
}

function brightTone(freq, t, brightness) {
  return sine(freq, t) * 0.72 + sine(freq * 2.01, t) * 0.18 * brightness + sine(freq * 3.02, t) * 0.08 * brightness;
}

function roughTone(freq, t, roughness) {
  const mod = 1 + Math.sin(2 * Math.PI * 37 * t) * roughness;
  return Math.tanh((sine(freq, t) + sine(freq * 0.51, t) * 0.45) * mod * 1.7);
}

function wobble(t, rate, amount) {
  return Math.sin(2 * Math.PI * rate * t) * amount;
}

function envelope(progress, attack, release) {
  const fadeIn = Math.min(1, progress / attack);
  const fadeOut = Math.min(1, (1 - progress) / release);
  return Math.max(0, Math.min(fadeIn, fadeOut));
}

function noise(index, seed) {
  const x = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function encodeWav(samples) {
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i += 1) {
    buffer.writeInt16LE(Math.round(samples[i] * 32767), 44 + i * bytesPerSample);
  }

  return buffer;
}
