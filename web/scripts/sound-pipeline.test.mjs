import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { animalSoundCatalog, quietCuteSoundAnimalIds, soundTypes } from './sound-source-catalog.mjs';

test('sound catalog covers every app animal with seven sound types', () => {
  assert.equal(soundTypes.length, 7);
  assert.equal(animalSoundCatalog.length, 31);

  for (const animal of animalSoundCatalog) {
    assert.equal(typeof animal.id, 'string');
    assert.ok(animal.id.length > 0);
    assert.ok(animal.displayName.length > 0);
    assert.ok(animal.searchTerms.length > 0);
    assert.match(animal.soundStrategy, /real-vocal|related-cute-design/);
  }
});

test('generated manifest and wav files are complete when assets have been built', { skip: !existsSync(resolve(import.meta.dirname, '../public/assets/sounds/manifest.json')) }, () => {
  const soundsRoot = resolve(import.meta.dirname, '../public/assets/sounds');
  const manifest = JSON.parse(readFileSync(resolve(soundsRoot, 'manifest.json'), 'utf8'));

  assert.deepEqual(manifest.soundTypes, soundTypes);
  assert.equal(Object.keys(manifest.animals).length, animalSoundCatalog.length);

  for (const animal of animalSoundCatalog) {
    const files = readdirSync(resolve(soundsRoot, animal.id)).filter((file) => file.endsWith('.wav')).sort();
    assert.deepEqual(files, soundTypes.map((soundType) => `${soundType}.wav`).sort());
    assert.equal(Object.keys(manifest.animals[animal.id].clips).length, soundTypes.length);
  }
});

test('generated manifest records traceable child-friendly source metadata', { skip: !existsSync(resolve(import.meta.dirname, '../public/assets/sounds/manifest.json')) }, () => {
  const soundsRoot = resolve(import.meta.dirname, '../public/assets/sounds');
  const manifest = JSON.parse(readFileSync(resolve(soundsRoot, 'manifest.json'), 'utf8'));
  const clipKinds = new Map();
  let realBackedAnimals = 0;
  let animalsWithActionLayers = 0;

  for (const animal of animalSoundCatalog) {
    const animalManifest = manifest.animals[animal.id];
    assert.ok(animalManifest.source.provider);
    assert.ok(animalManifest.source.license);
    assert.ok(animalManifest.source.usageTerms);
    assert.match(animalManifest.source.kind, /real-recording|real-layered|procedural-fallback|related-cute-design/);
    if (animalManifest.source.kind !== 'procedural-fallback') realBackedAnimals += 1;
    if (['eat', 'drink', 'sleep'].every((soundType) => {
      const kind = animalManifest.clips[soundType]?.kind;
      return kind === 'real-action-layer' || kind === 'procedural-action-layer';
    })) {
      animalsWithActionLayers += 1;
    }

    for (const soundType of soundTypes) {
      const clip = animalManifest.clips[soundType];
      assert.ok(clip.path.endsWith(`/${animal.id}/${soundType}.wav`));
      assert.ok(clip.provider);
      assert.ok(clip.license);
      assert.ok(clip.usageTerms);
      assert.ok(clip.sourceClass);
      clipKinds.set(clip.kind, (clipKinds.get(clip.kind) ?? 0) + 1);
    }
  }

  assert.ok(realBackedAnimals >= 20, `expected at least 20 real-backed animals with Freesound access, got ${realBackedAnimals}`);
  assert.equal(animalsWithActionLayers, animalSoundCatalog.length);
  assert.ok((clipKinds.get('real-recording') ?? 0) + (clipKinds.get('derived-real-recording') ?? 0) > 0);
  assert.equal((clipKinds.get('procedural-action-layer') ?? 0) + (clipKinds.get('real-action-layer') ?? 0), animalSoundCatalog.length * 3);
});

test('sound catalog separates vocal animals from quiet cute-designed animals', () => {
  assert.deepEqual(new Set(quietCuteSoundAnimalIds), new Set([
    'butterfly_swallowtail',
    'beetle_hercules',
    'woodlouse_pillbug',
    'chameleon_veiled',
    'clownfish',
    'turtle_green_sea',
    'tortoise_russian',
    'salamander_fire',
  ]));

  for (const animal of animalSoundCatalog) {
    if (quietCuteSoundAnimalIds.includes(animal.id)) {
      assert.equal(animal.soundStrategy, 'related-cute-design', `${animal.id} should use related cute sound design`);
      assert.ok(animal.cuteSoundDesign?.moodTexture, `${animal.id} needs a mood texture`);
      assert.ok(animal.cuteSoundDesign?.movementTexture, `${animal.id} needs a movement texture`);
    } else {
      assert.equal(animal.soundStrategy, 'real-vocal', `${animal.id} should prefer real vocal sounds`);
    }
  }
});

test('generated sound pack uses the right real-vocal or cute-designed strategy', { skip: !existsSync(resolve(import.meta.dirname, '../public/assets/sounds/manifest.json')) }, () => {
  const manifest = JSON.parse(readFileSync(resolve(import.meta.dirname, '../public/assets/sounds/manifest.json'), 'utf8'));

  for (const [animalId, animal] of Object.entries(manifest.animals)) {
    assert.match(animal.soundStrategy, /real-vocal|related-cute-design/);

    if (quietCuteSoundAnimalIds.includes(animalId)) {
      assert.equal(animal.soundStrategy, 'related-cute-design');
      assert.match(animal.source.kind, /related-cute-design|real-layered/);
      for (const soundType of ['joy', 'angry', 'sad', 'happy']) {
        const clip = animal.clips[soundType];
        assert.match(clip.kind, /generated-related-cute|related-cute-design/, `${animalId}/${soundType} should be designed, not fake vocal`);
        assert.equal(clip.provider, 'PetPet child-friendly sound design');
        assert.ok(clip.designedFor);
        assert.match(clip.sourceClass, /cute|flutter|bubble|steps|shell|leaf|moss|reptile/);
      }
      continue;
    }

    assert.equal(animal.soundStrategy, 'real-vocal');
    assert.notEqual(animal.source.kind, 'procedural-fallback', `${animalId} should use a real source recording`);
    assert.notEqual(animal.source.provider, 'PetPet procedural audio', `${animalId} should not use generated procedural source audio`);

    for (const soundType of ['joy', 'angry', 'sad', 'happy']) {
      const clip = animal.clips[soundType];
      assert.doesNotMatch(clip.kind, /procedural|generated/, `${animalId}/${soundType} should use a real animal voice`);
      assert.notEqual(clip.provider, 'PetPet procedural audio', `${animalId}/${soundType} should be backed by a real recording`);
    }
  }
});

test('all vocal animals keep real identifiable mood recordings', { skip: !existsSync(resolve(import.meta.dirname, '../public/assets/sounds/manifest.json')) }, () => {
  const manifest = JSON.parse(readFileSync(resolve(import.meta.dirname, '../public/assets/sounds/manifest.json'), 'utf8'));

  for (const animal of animalSoundCatalog) {
    if (quietCuteSoundAnimalIds.includes(animal.id)) continue;

    const animalManifest = manifest.animals[animal.id];
    assert.equal(animalManifest.source.kind, 'real-recording', `${animal.id} should keep a real source recording`);
    for (const soundType of ['joy', 'angry', 'sad', 'happy']) {
      assert.equal(animalManifest.clips[soundType].kind, 'derived-real-recording', `${animal.id}/${soundType} should be derived from a real recording`);
    }
  }
});

test('shiba play and sound safari use a clearly recognizable dog bark', { skip: !existsSync(resolve(import.meta.dirname, '../public/assets/sounds/manifest.json')) }, () => {
  const manifest = JSON.parse(readFileSync(resolve(import.meta.dirname, '../public/assets/sounds/manifest.json'), 'utf8'));
  const dog = manifest.animals.dog_shiba;

  assert.ok(dog);
  const sourceText = [
    dog.source.title,
    dog.source.displayTitle,
    dog.source.credit,
    dog.source.sourceClass,
    dog.clips.joy.title,
    dog.clips.joy.credit,
  ].join(' ').toLowerCase();

  assert.doesNotMatch(sourceText, /stray dog/, 'shiba should not keep the old ambiguous stray dog source');
  assert.doesNotMatch(sourceText, /pigeon|bird|ocyphaps|xeno-canto/, 'shiba should never resolve to bird recordings');
  assert.match(sourceText, /bark|barking|puppy|perrito|dog/, 'shiba recognition voice should be an obvious dog bark');
  assert.equal(dog.clips.joy.kind, 'derived-real-recording');
  assert.equal(dog.clips.happy.kind, 'derived-real-recording');
});

test('sound builder denoises and polishes real recordings before playback', () => {
  const builderSource = readFileSync(resolve(import.meta.dirname, './build-real-sound-assets.mjs'), 'utf8');

  assert.match(builderSource, /const denoiseFilterChain = /, 'source conversion should use an ffmpeg denoise filter chain');
  assert.match(builderSource, /afftdn=nf=/, 'source conversion should apply frequency-domain denoising when ffmpeg supports it');
  assert.match(builderSource, /function polishClipForPlayback/, 'generated clips should receive final playback polish');
  assert.match(builderSource, /function gentleNoiseGate/, 'generated clips should suppress background noise between animal sounds');
  assert.match(builderSource, /function highPassFilter/, 'generated clips should reduce low-frequency rumble');
  assert.match(builderSource, /function lowPassFilter/, 'generated clips should reduce harsh high-frequency hiss');
});

test('real animal sources avoid known non-animal false matches', { skip: !existsSync(resolve(import.meta.dirname, '../public/assets/sounds/manifest.json')) }, () => {
  const manifest = JSON.parse(readFileSync(resolve(import.meta.dirname, '../public/assets/sounds/manifest.json'), 'utf8'));
  const unsafeTerms = [
    'toaster',
    'shaker',
    'gateway',
    'flute',
    'concert',
    'interview',
    'inleiding',
    'emmanuel',
    'pahud',
    'electric hum',
    'alien',
    'snake',
  ];

  for (const [animalId, animal] of Object.entries(manifest.animals)) {
    const sourceText = [
      animal.source.title,
      animal.source.displayTitle,
      animal.source.credit,
      animal.source.sourceClass,
    ].join(' ').toLowerCase();
    for (const term of unsafeTerms) {
      assert.equal(sourceText.includes(term), false, `${animalId} source contains non-animal term "${term}"`);
    }
  }
});

test('care action layers are varied and child-appropriate', { skip: !existsSync(resolve(import.meta.dirname, '../public/assets/sounds/manifest.json')) }, () => {
  const manifest = JSON.parse(readFileSync(resolve(import.meta.dirname, '../public/assets/sounds/manifest.json'), 'utf8'));
  const unsafeCareTerms = ['toilet', 'bathroom', 'flush', 'gun', 'weapon', 'horror', 'monster', 'alien'];

  for (const soundType of ['eat', 'drink', 'sleep']) {
    const sourceCounts = new Map();
    let realActionLayers = 0;

    for (const [animalId, animal] of Object.entries(manifest.animals)) {
      const clip = animal.clips[soundType];
      if (clip.kind === 'real-action-layer') realActionLayers += 1;
      const sourceText = [clip.title, clip.credit, clip.sourceClass, clip.derivedFrom].join(' ').toLowerCase();
      for (const term of unsafeCareTerms) {
        assert.equal(sourceText.includes(term), false, `${animalId}/${soundType} source contains child-inappropriate term "${term}"`);
      }

      const key = `${clip.kind}|${clip.provider}|${clip.title}|${clip.sourceClass}`;
      sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1);
    }

    assert.ok(realActionLayers >= 24, `${soundType} should use mostly real action recordings, got ${realActionLayers}`);
    assert.ok(sourceCounts.size >= 4, `${soundType} should use at least 4 different care sources, got ${sourceCounts.size}`);
    assert.ok(Math.max(...sourceCounts.values()) <= 12, `${soundType} overuses one care source across too many animals`);
  }
});

test('pet sound playback starts from a concrete wav path before manifest fallback work', () => {
  const source = readFileSync(resolve(import.meta.dirname, '../src/utils/petSounds.ts'), 'utf8');

  assert.match(source, /let manifestCache:/, 'playback should keep a resolved manifest cache');
  assert.match(source, /const systemPath = manifestCache\?\.animals\[animalId\]\?\.clips\[soundType\]\?\.path \?\? fallbackPath;/, 'system playback should resolve a concrete wav fallback path without waiting');
  assert.match(source, /const immediatePath = userPath \?\? versionSoundPath\(systemPath\);/, 'first click should immediately try either a user clip or a versioned wav asset path');
  assert.match(source, /if \(userPath\) \{[\s\S]*playAudio\(versionSoundPath\(systemPath\),/s, 'custom user clips should fall back to the system wav if playback fails');
  assert.match(source, /const soundAssetVersion = /, 'sound URLs should include an app-controlled version to avoid stale browser audio cache');
  assert.doesNotMatch(source, /loadSoundManifest\(\)\s*\.then\(\(manifest\)\s*=>\s*{[\s\S]*?return playAudio/s, 'first click should not wait for a manifest fetch before starting audio');
});

test('star buddy UI sounds respect the shared sound preference', () => {
  const source = readFileSync(resolve(import.meta.dirname, '../src/utils/petSounds.ts'), 'utf8');

  assert.match(source, /export function playStarBuddySound/);
  assert.match(source, /type StarBuddyUiSound = 'tap' \| 'open' \| 'reward' \| 'correct' \| 'gentle'/);
  assert.match(source, /if \(!isPetSoundEnabled\(\)\) return;/);
  assert.match(source, /kind === 'reward'/);
});

test('sound assets avoid stale browser caching for regenerated wav files', () => {
  const playerSource = readFileSync(resolve(import.meta.dirname, '../src/utils/petSounds.ts'), 'utf8');
  const nginxSource = readFileSync(resolve(import.meta.dirname, '../nginx.conf'), 'utf8');

  assert.match(playerSource, /window\.fetch\('\/assets\/sounds\/manifest\.json',\s*\{\s*cache:\s*'no-store'\s*\}\)/s, 'manifest fetch should bypass stale browser cache');
  assert.match(nginxSource, /location = \/assets\/sounds\/manifest\.json\s*{[^}]*Cache-Control "no-store"/s, 'manifest should never be served as immutable');
});

test('orange cat vocalization is refreshed instead of retained from an older local build', { skip: !existsSync(resolve(import.meta.dirname, '../public/assets/sounds/manifest.json')) }, () => {
  const manifest = JSON.parse(readFileSync(resolve(import.meta.dirname, '../public/assets/sounds/manifest.json'), 'utf8'));
  const cat = manifest.animals.cat_orange;

  assert.ok(cat);
  assert.notEqual(cat.source.sourceClass, 'retained-animal-vocalization');
  assert.notEqual(cat.source.title, 'File:Meow of a Siamese cat - freemaster2.wav');
});

test('generated wav files are audible, short, and softly limited', { skip: !existsSync(resolve(import.meta.dirname, '../public/assets/sounds/manifest.json')) }, () => {
  const soundsRoot = resolve(import.meta.dirname, '../public/assets/sounds');

  for (const animal of animalSoundCatalog) {
    for (const soundType of soundTypes) {
      const wav = readWavMetrics(resolve(soundsRoot, animal.id, `${soundType}.wav`));
      assert.equal(wav.sampleRate, 22050);
      assert.equal(wav.channels, 1);
      assert.ok(wav.durationSeconds >= 0.45, `${animal.id}/${soundType} is too short`);
      assert.ok(wav.durationSeconds <= 2.4, `${animal.id}/${soundType} is too long`);
      assert.ok(wav.peak >= 0.03, `${animal.id}/${soundType} is too quiet`);
      assert.ok(wav.peak <= 0.9, `${animal.id}/${soundType} clips too loudly`);
      assert.ok(wav.rms >= 0.012, `${animal.id}/${soundType} is too quiet or noisy after cleanup`);
      const maxSparseRatio = soundType === 'sleep'
        ? 0.88
        : ['eat', 'drink'].includes(soundType)
          ? 0.72
          : quietCuteSoundAnimalIds.includes(animal.id)
            ? 0.75
            : 0.86;
      assert.ok(wav.zeroishRatio <= maxSparseRatio, `${animal.id}/${soundType} has too much near-silence or gated noise`);
    }
  }
});

function readWavMetrics(path) {
  const buffer = readFileSync(path);
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF');
  assert.equal(buffer.toString('ascii', 8, 12), 'WAVE');

  let cursor = 12;
  let channels = 0;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let dataStart = -1;
  let dataSize = 0;

  while (cursor + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', cursor, cursor + 4);
    const chunkSize = buffer.readUInt32LE(cursor + 4);
    const chunkStart = cursor + 8;

    if (chunkId === 'fmt ') {
      channels = buffer.readUInt16LE(chunkStart + 2);
      sampleRate = buffer.readUInt32LE(chunkStart + 4);
      bitsPerSample = buffer.readUInt16LE(chunkStart + 14);
    } else if (chunkId === 'data') {
      dataStart = chunkStart;
      dataSize = chunkSize;
      break;
    }

    cursor = chunkStart + chunkSize + (chunkSize % 2);
  }

  assert.equal(bitsPerSample, 16);
  assert.ok(dataStart > 0);

  const sampleCount = dataSize / 2;
  let peak = 0;
  let sumSquares = 0;
  let zeroishCount = 0;
  for (let index = 0; index < sampleCount; index += 1) {
    const sample = buffer.readInt16LE(dataStart + index * 2) / 32768;
    peak = Math.max(peak, Math.abs(sample));
    sumSquares += sample * sample;
    if (Math.abs(sample) < 0.003) zeroishCount += 1;
  }

  return {
    channels,
    sampleRate,
    durationSeconds: sampleCount / channels / sampleRate,
    peak,
    rms: Math.sqrt(sumSquares / sampleCount),
    zeroishRatio: zeroishCount / sampleCount,
  };
}
