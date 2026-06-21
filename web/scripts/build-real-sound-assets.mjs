import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import ffmpegPath from 'ffmpeg-static';

import {
  actionSoundCatalog,
  animalSoundCatalog,
  excludedSourceKeywords,
  familyActionPreferences,
  quietCuteSoundAnimalIds,
  soundTypes,
} from './sound-source-catalog.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(__dirname, '..');
const outputRoot = resolve(webRoot, 'public/assets/sounds');
const cacheRoot = resolve(webRoot, '.cache/animal-sounds');
const sampleRate = 22050;
const channels = 1;
const maxDownloadBytes = 24 * 1024 * 1024;
const requestDelayMs = 1800;
const manualSourceDelayMs = 1400;
const userAgent = 'petpet-local-demo/0.1 (local demo sound asset builder)';
const freesoundApiKey = process.env.FREESOUND_API_KEY ?? process.env.FREESOUND_TOKEN ?? '';
const sourceFilterVersion = '2026-06-06-real-clean-sounds-v1';
const denoiseFilterChain = 'highpass=f=70,lowpass=f=9000,afftdn=nf=-28,volume=0.82';
const fallbackCleanupFilterChain = 'highpass=f=70,lowpass=f=9000,volume=0.82';
const actionSoundTypes = new Set(['eat', 'drink', 'sleep']);
const moodSoundTypes = new Set(['joy', 'angry', 'sad', 'happy']);
const actionLayerCache = new Map();
const actionSourceUsage = new Map();
const maxActionSourceReuse = 6;
const existingManifestPath = resolve(outputRoot, 'manifest.json');
const existingManifest = existsSync(existingManifestPath)
  ? JSON.parse(readFileSync(existingManifestPath, 'utf8'))
  : undefined;
const distManifestPath = resolve(webRoot, 'dist/assets/sounds/manifest.json');
const distManifest = existsSync(distManifestPath)
  ? JSON.parse(readFileSync(distManifestPath, 'utf8'))
  : undefined;
const retainManifestPath = process.env.PETPET_RETAIN_SOUND_MANIFEST
  ? resolve(process.env.PETPET_RETAIN_SOUND_MANIFEST)
  : undefined;
const retainManifest = retainManifestPath && existsSync(retainManifestPath)
  ? JSON.parse(readFileSync(retainManifestPath, 'utf8'))
  : undefined;

const derivationProfiles = {
  joy: { duration: 1.25, speed: 1.08, volume: 1.05, attack: 0.025, release: 0.15, texture: 'bright' },
  angry: { duration: 1.05, speed: 0.9, volume: 1.22, attack: 0.015, release: 0.15, texture: 'rough' },
  sad: { duration: 1.45, speed: 0.86, volume: 0.82, attack: 0.08, release: 0.27, texture: 'soft' },
  happy: { duration: 1.2, speed: 1.12, volume: 1.08, attack: 0.025, release: 0.17, texture: 'bright' },
  eat: { duration: 0.95, speed: 1.02, volume: 0.92, attack: 0.02, release: 0.15, texture: 'pulse' },
  drink: { duration: 0.86, speed: 1.06, volume: 0.82, attack: 0.02, release: 0.14, texture: 'ripple' },
  sleep: { duration: 1.65, speed: 0.82, volume: 0.58, attack: 0.18, release: 0.37, texture: 'breath' },
};

mkdirSync(outputRoot, { recursive: true });
mkdirSync(cacheRoot, { recursive: true });

const manifest = {
  generatedAt: new Date().toISOString(),
  intendedUse: 'local-demo',
  note: 'Audio files are child-friendly local demo clips. Mood clips prefer real animal recordings. Eat, drink, and sleep clips prefer real action/environment layers. Freesound API resources are used only when a token is supplied and must be reviewed before commercial use.',
  soundTypes,
  animals: {},
};

for (const animal of animalSoundCatalog) {
  console.log(`Resolving ${animal.id}...`);
  const animalDir = resolve(outputRoot, animal.id);
  mkdirSync(animalDir, { recursive: true });

  const source = await resolveAnimalSource(animal);
  const animalManifest = {
    displayName: animal.displayName,
    fallbackFamily: animal.fallbackFamily,
    soundStrategy: animal.soundStrategy ?? 'real-vocal',
    cuteSoundDesign: animal.cuteSoundDesign,
    source: sourceMetadata(source),
    clips: {},
  };

  for (const soundType of soundTypes) {
    const outputPath = resolve(animalDir, `${soundType}.wav`);
    const actionLayer = actionSoundTypes.has(soundType) ? await resolveActionLayer(animal, soundType) : undefined;

    if (actionLayer) {
      const clipSamples = deriveActionClip(actionLayer.samples, source.samples, soundType, animal.id);
      writeClip(outputPath, clipSamples, soundType);
      animalManifest.clips[soundType] = clipMetadata({
        animal,
        soundType,
        kind: 'real-action-layer',
        source: actionLayer,
        derivedFrom: actionLayer.pageUrl,
      });
    } else if (actionSoundTypes.has(soundType)) {
      writeClip(outputPath, renderProceduralActionClip(animal, soundType, source.samples), soundType);
      animalManifest.clips[soundType] = proceduralActionClipMetadata(animal, soundType);
    } else if (isQuietCuteAnimal(animal) && moodSoundTypes.has(soundType)) {
      writeClip(outputPath, renderRelatedCuteMoodClip(animal, soundType), soundType);
      animalManifest.clips[soundType] = relatedCuteClipMetadata(animal, soundType);
    } else if (source.kind === 'real-recording') {
      writeClip(outputPath, deriveRealClip(source.samples, soundType, animal.id), soundType);
      animalManifest.clips[soundType] = {
        ...clipMetadata({
          animal,
          soundType,
          kind: 'derived-real-recording',
          source,
          derivedFrom: source.pageUrl,
        }),
        path: `/assets/sounds/${animal.id}/${soundType}.wav`,
      };
    } else {
      writeClip(outputPath, renderProceduralClip(animal, soundType), soundType);
      animalManifest.clips[soundType] = fallbackClipMetadata(animal, soundType);
    }
  }

  manifest.animals[animal.id] = animalManifest;
  const label = source.kind === 'real-recording' ? source.title : source.reason;
  console.log(`${animal.id}: ${source.kind} (${label})`);
}

writeFileSync(resolve(outputRoot, 'manifest.json'), `${JSON.stringify(stripLocalPaths(manifest), null, 2)}\n`);
console.log(`Wrote ${animalSoundCatalog.length * soundTypes.length} clips and manifest to ${outputRoot}`);

async function resolveAnimalSource(animal) {
  if (isQuietCuteAnimal(animal)) {
    return relatedCuteDesignSource(animal);
  }

  if (!animal.refreshExistingSource) {
    const retained = retainExistingRealSource(animal);
    if (retained) return retained;
  }

  for (const candidate of animal.manualSources ?? []) {
    const source = await materializeCandidate(candidate, 'manual-source');
    if (source) return source;
  }

  for (const searchTerm of animal.searchTerms) {
    const freesoundCandidates = (await searchFreesoundAudio(searchTerm, animal.includeKeywords, animal.excludeKeywords))
      .filter((candidate) => isRelevantCandidate(candidate, animal));
    for (const candidate of freesoundCandidates) {
      const source = await materializeCandidate(candidate, searchTerm);
      if (source) return source;
    }

    const candidates = (await searchCommonsAudio(searchTerm)).filter((candidate) => isRelevantCandidate(candidate, animal));
    for (const candidate of candidates) {
      const source = await materializeCandidate(candidate, searchTerm);
      if (source) return source;
    }
  }

  return {
    kind: 'procedural-fallback',
    provider: 'PetPet procedural audio',
    title: `${animal.displayName} procedural fallback`,
    pageUrl: '',
    sourceUrl: '',
    author: 'PetPet local demo',
    credit: animal.fallbackFamily,
    license: 'Generated for local demo',
    usageTerms: 'Generated fallback; replace with reviewed real recording before production use.',
    attributionRequired: false,
    reason: `No compatible downloadable recording found; using ${animal.fallbackFamily}.`,
  };
}

function isQuietCuteAnimal(animal) {
  return animal.soundStrategy === 'related-cute-design' || quietCuteSoundAnimalIds.includes(animal.id);
}

function relatedCuteDesignSource(animal) {
  const design = animal.cuteSoundDesign ?? {};
  return {
    kind: 'related-cute-design',
    provider: 'PetPet child-friendly sound design',
    title: `${animal.displayName} related cute sound design`,
    displayTitle: design.moodTexture,
    pageUrl: '',
    sourceUrl: '',
    author: 'PetPet local demo',
    credit: design.movementTexture ?? animal.fallbackFamily,
    license: 'Generated for local demo',
    usageTerms: 'Generated related child-friendly sound design for quiet animals; replace with reviewed production audio before commercial use.',
    attributionRequired: false,
    sourceClass: design.sourceClass ?? 'related-cute-design',
    designedFor: design.moodTexture ?? design.movementTexture ?? animal.fallbackFamily,
    reason: `Quiet animal uses related cute sound design: ${design.movementTexture ?? animal.fallbackFamily}.`,
    samples: renderRelatedCuteMoodClip(animal, 'happy'),
  };
}

function retainExistingRealSource(animal) {
  const previous = [retainManifest, existingManifest, distManifest]
    .map((candidate) => candidate?.animals?.[animal.id])
    .find((candidate) => candidate?.source?.kind === 'real-recording' && isRelevantCandidate(candidate.source, animal));
  if (!previous) return undefined;

  for (const soundType of ['joy', 'happy', 'sad', 'angry']) {
    const candidatePaths = [
      resolve(outputRoot, animal.id, `${soundType}.wav`),
      resolve(webRoot, 'dist/assets/sounds', animal.id, `${soundType}.wav`),
    ];
    const path = candidatePaths.find((candidatePath) => existsSync(candidatePath));
    if (!path) continue;
    try {
      const samples = prepareSourceSamples(polishClipForPlayback(readWavSamples(path), 'happy'));
      if (!hasUsefulAudio(samples)) continue;
      return {
        ...previous.source,
        kind: 'real-recording',
        searchTerm: previous.source.searchTerm ?? 'retained-existing-asset',
        sourceClass: previous.source.sourceClass ?? 'retained-animal-vocalization',
        localPath: path,
        samples,
      };
    } catch {
      continue;
    }
  }

  return undefined;
}

function retainExistingActionLayer(animal, soundType) {
  const previous = [retainManifest, existingManifest, distManifest]
    .map((candidate) => candidate?.animals?.[animal.id]?.clips?.[soundType])
    .find((candidate) => candidate?.kind === 'real-action-layer');
  if (!previous) return undefined;

  const candidatePaths = [
    resolve(outputRoot, animal.id, `${soundType}.wav`),
    resolve(webRoot, 'dist/assets/sounds', animal.id, `${soundType}.wav`),
  ];
  const path = candidatePaths.find((candidatePath) => existsSync(candidatePath));
  if (!path) return undefined;

  try {
    const samples = prepareSourceSamples(readWavSamples(path));
    if (!hasUsefulAudio(samples, previous)) return undefined;
    return {
      kind: 'real-recording',
      provider: previous.provider,
      searchTerm: previous.sourceClass ?? 'retained-action-layer',
      title: previous.title,
      displayTitle: previous.displayTitle,
      pageUrl: previous.pageUrl,
      sourceUrl: previous.sourceUrl,
      author: previous.author,
      credit: previous.credit,
      license: previous.license,
      usageTerms: previous.usageTerms,
      attributionRequired: previous.attributionRequired,
      sourceClass: previous.sourceClass ?? `${soundType}-action-layer`,
      localPath: path,
      samples,
    };
  } catch {
    return undefined;
  }
}

async function materializeCandidate(candidate, searchTerm) {
  const resolvedCandidate = await resolveDownloadableCandidate(candidate);
  if (!resolvedCandidate) return undefined;
  const sourceUrl = resolvedCandidate.sourceUrl ?? resolvedCandidate.url;
  if (!sourceUrl) return undefined;
  const downloaded = await downloadCandidate(resolvedCandidate, resolvedCandidate.provider === 'Wikimedia Commons' && searchTerm === 'manual-source');
  if (!downloaded) return undefined;
  const wavPath = resolve(cacheRoot, `${cacheKey(`${sourceFilterVersion}:denoise:${sourceUrl}`)}.wav`);
  if (!convertToWav(downloaded, wavPath, resolvedCandidate)) return undefined;

  let samples;
  try {
    samples = readWavSamples(wavPath);
  } catch (error) {
    console.warn(`Skipping ${candidate.title}: ${error.message}`);
    return undefined;
  }

  samples = prepareSourceSamples(samples);
  if (!hasUsefulAudio(samples, resolvedCandidate)) {
    console.warn(`Skipping ${candidate.title}: near-silent or clipped source`);
    return undefined;
  }

  return {
    kind: 'real-recording',
    provider: resolvedCandidate.provider,
    searchTerm,
    title: resolvedCandidate.title,
    displayTitle: resolvedCandidate.displayTitle,
    pageUrl: resolvedCandidate.pageUrl,
    sourceUrl,
    author: resolvedCandidate.author,
    credit: resolvedCandidate.credit,
    license: resolvedCandidate.license,
    usageTerms: resolvedCandidate.usageTerms,
    attributionRequired: resolvedCandidate.attributionRequired,
    sourceClass: resolvedCandidate.sourceClass ?? 'animal-vocalization',
    localPath: wavPath,
    samples,
  };
}

async function resolveDownloadableCandidate(candidate) {
  if (!candidate.freesoundId) return candidate;

  const detail = await fetchFreesoundSound(candidate.freesoundId);
  if (!detail) {
    return candidate.sourceUrl || candidate.url ? candidate : undefined;
  }
  const previewUrl = detail?.previews?.['preview-hq-mp3']
    ?? detail?.previews?.['preview-lq-mp3']
    ?? detail?.previews?.['preview-hq-ogg']
    ?? detail?.previews?.['preview-lq-ogg'];
  if (!previewUrl) return undefined;

  const tags = Array.isArray(detail.tags) ? detail.tags.join(' ') : candidate.categories;
  return {
    ...candidate,
    title: detail.name ?? candidate.title,
    displayTitle: candidate.displayTitle ?? detail.name ?? candidate.displayTitle,
    pageUrl: detail.url ?? candidate.pageUrl,
    sourceUrl: previewUrl,
    url: previewUrl,
    mime: previewUrl.endsWith('.ogg') ? 'audio/ogg' : 'audio/mpeg',
    size: detail.filesize ?? candidate.size ?? 0,
    author: detail.username ?? candidate.author,
    credit: `${detail.name ?? candidate.title} by ${detail.username ?? candidate.author}`,
    license: detail.license ?? candidate.license,
    usageTerms: detail.license ?? candidate.usageTerms,
    description: detail.description ?? candidate.description,
    categories: tags,
    attributionRequired: isAttributionRequiredLicense(detail.license ?? candidate.license),
  };
}

async function fetchFreesoundSound(id) {
  const cachePath = resolve(cacheRoot, `${cacheKey(`freesound-detail:${id}`)}.json`);
  if (existsSync(cachePath)) {
    return JSON.parse(readFileSync(cachePath, 'utf8'));
  }
  if (!freesoundApiKey) return undefined;

  await delay(requestDelayMs);
  const params = new URLSearchParams({
    fields: 'id,name,url,previews,license,username,duration,tags,description,filesize',
  });
  let response;
  try {
    response = await fetch(`https://freesound.org/apiv2/sounds/${id}/?${params}`, {
      headers: {
        Authorization: `Token ${freesoundApiKey}`,
        'User-Agent': userAgent,
      },
    });
  } catch (error) {
    console.warn(`Skipping Freesound sound ${id}: ${error.message}`);
    return undefined;
  }
  const text = await response.text();
  if (!response.ok || !text.trim().startsWith('{')) {
    console.warn(`Skipping Freesound sound ${id}: ${text.slice(0, 120)}`);
    return undefined;
  }
  writeFileSync(cachePath, `${text}\n`);
  return JSON.parse(text);
}

async function resolveActionLayer(animal, soundType) {
  const family = familyFor(animal.id);

  const animalIndex = animalSoundCatalog.findIndex((item) => item.id === animal.id);
  const preferences = familyActionPreferences[family]?.[soundType]
    ?? familyActionPreferences.default[soundType]
    ?? [];

  const catalog = actionSoundCatalog[soundType] ?? [];
  const orderedProfiles = [
    ...preferences.flatMap((sourceClass) => catalog.filter((profile) => profile.sourceClass === sourceClass)),
    ...catalog.filter((profile) => !preferences.includes(profile.sourceClass)),
  ];
  const rotatedProfiles = rotateActionProfiles(orderedProfiles, animalIndex);

  for (let profileIndex = 0; profileIndex < rotatedProfiles.length; profileIndex += 1) {
    const profile = rotatedProfiles[profileIndex];
    const key = `${soundType}:${family}:${profile.sourceClass}:${profile.query}:${animalIndex}`;
    if (actionLayerCache.has(key)) {
      const cached = actionLayerCache.get(key);
      if (cached) return cached;
      continue;
    }

    const freesoundCandidates = await searchFreesoundAudio(profile.query, profile.includeKeywords, profile.excludeKeywords ?? []);
    const offset = freesoundCandidates.length ? (animalIndex + profileIndex) % freesoundCandidates.length : 0;
    const orderedCandidates = [
      ...freesoundCandidates.slice(offset),
      ...freesoundCandidates.slice(0, offset),
    ];
    for (const candidate of orderedCandidates) {
      const usageKey = actionCandidateUsageKey(soundType, candidate);
      if ((actionSourceUsage.get(usageKey) ?? 0) >= maxActionSourceReuse) continue;
      const source = await materializeCandidate({ ...candidate, sourceClass: profile.sourceClass }, profile.query);
      if (source) {
        actionSourceUsage.set(usageKey, (actionSourceUsage.get(usageKey) ?? 0) + 1);
        actionLayerCache.set(key, source);
        return source;
      }
    }

    actionLayerCache.set(key, undefined);
  }

  return retainExistingActionLayer(animal, soundType);
}

function rotateActionProfiles(profiles, animalIndex) {
  if (profiles.length <= 1) return profiles;
  const offset = animalIndex % profiles.length;
  return [
    ...profiles.slice(offset),
    ...profiles.slice(0, offset),
  ];
}

function actionCandidateUsageKey(soundType, candidate) {
  return [
    soundType,
    candidate.sourceUrl ?? candidate.url ?? candidate.pageUrl ?? '',
    candidate.title ?? candidate.displayTitle ?? '',
  ].join('|');
}

async function searchCommonsAudio(searchTerm) {
  const cachePath = resolve(cacheRoot, `${cacheKey(`commons:${searchTerm}`)}.json`);
  if (existsSync(cachePath)) {
    return JSON.parse(readFileSync(cachePath, 'utf8'));
  }

  await delay(requestDelayMs);
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `${searchTerm} filetype:audio`,
    gsrnamespace: '6',
    gsrlimit: '8',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|mime|size',
    format: 'json',
    origin: '*',
  });

  let response;
  try {
    response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
      headers: { 'User-Agent': userAgent },
    });
  } catch (error) {
    console.warn(`Skipping Commons search for "${searchTerm}": ${error.message}`);
    return [];
  }
  const text = await response.text();
  if (response.status === 429) await delay(4500);
  if (!response.ok || !text.trim().startsWith('{')) {
    console.warn(`Skipping Commons search for "${searchTerm}": ${text.slice(0, 90)}`);
    return [];
  }

  const data = JSON.parse(text);
  const pages = Object.values(data.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const candidates = pages
    .map((page) => {
      const info = page.imageinfo?.[0];
      const meta = info?.extmetadata ?? {};
      return {
        title: page.title,
        provider: 'Wikimedia Commons',
        url: info?.url,
        pageUrl: info?.descriptionurl,
        mime: info?.mime,
        size: info?.size,
        author: cleanHtml(meta.Artist?.value ?? ''),
        credit: cleanHtml(meta.Credit?.value ?? ''),
        license: cleanHtml(meta.LicenseShortName?.value ?? meta.License?.value ?? ''),
        usageTerms: cleanHtml(meta.UsageTerms?.value ?? ''),
        description: cleanHtml(meta.ImageDescription?.value ?? ''),
        categories: cleanHtml(meta.Categories?.value ?? ''),
        attributionRequired: meta.AttributionRequired?.value === 'true',
      };
    })
    .filter((candidate) => candidate.url && candidate.mime?.startsWith('audio/') && candidate.size <= maxDownloadBytes);

  writeFileSync(cachePath, `${JSON.stringify(candidates, null, 2)}\n`);
  return candidates;
}

async function searchFreesoundAudio(searchTerm, includeKeywords = [], excludeKeywords = []) {
  const cachePath = resolve(cacheRoot, `${cacheKey(`freesound:${sourceFilterVersion}:${searchTerm}:${includeKeywords.join(',')}:${excludeKeywords.join(',')}`)}.json`);
  if (existsSync(cachePath)) {
    return JSON.parse(readFileSync(cachePath, 'utf8'));
  }
  if (!freesoundApiKey) return [];

  await delay(requestDelayMs);
  const params = new URLSearchParams({
    query: searchTerm,
    fields: 'id,name,url,previews,license,username,duration,tags,description,filesize',
    filter: 'duration:[0.25 TO 8]',
    sort: 'rating_desc',
    page_size: '12',
  });

  let response;
  try {
    response = await fetch(`https://freesound.org/apiv2/search/text/?${params}`, {
      headers: {
        Authorization: `Token ${freesoundApiKey}`,
        'User-Agent': userAgent,
      },
    });
  } catch (error) {
    console.warn(`Skipping Freesound search for "${searchTerm}": ${error.message}`);
    return [];
  }

  const text = await response.text();
  if (!response.ok || !text.trim().startsWith('{')) {
    console.warn(`Skipping Freesound search for "${searchTerm}": ${text.slice(0, 120)}`);
    return [];
  }

  const data = JSON.parse(text);
  const candidates = (data.results ?? [])
    .map((item) => {
      const tags = Array.isArray(item.tags) ? item.tags.join(' ') : '';
      const previewUrl = item.previews?.['preview-hq-mp3']
        ?? item.previews?.['preview-lq-mp3']
        ?? item.previews?.['preview-hq-ogg']
        ?? item.previews?.['preview-lq-ogg'];
      return {
        title: item.name,
        displayTitle: item.name,
        provider: 'Freesound',
        url: previewUrl,
        pageUrl: item.url,
        sourceUrl: previewUrl,
        mime: previewUrl?.endsWith('.ogg') ? 'audio/ogg' : 'audio/mpeg',
        size: item.filesize ?? 0,
        author: item.username ?? 'Freesound contributor',
        credit: `${item.name} by ${item.username ?? 'Freesound contributor'}`,
        license: item.license ?? 'Freesound preview license',
        usageTerms: item.license ?? 'Freesound preview; review source page before reuse.',
        description: item.description ?? '',
        categories: tags,
        attributionRequired: !/public domain|cc0/i.test(item.license ?? ''),
      };
    })
    .filter((candidate) => candidate.url && candidate.size <= maxDownloadBytes)
    .filter((candidate) => isTextRelevant(candidate, includeKeywords, excludeKeywords));

  writeFileSync(cachePath, `${JSON.stringify(candidates, null, 2)}\n`);
  return candidates;
}

function isRelevantCandidate(candidate, animal) {
  return isTextRelevant(candidate, animal.includeKeywords, animal.excludeKeywords ?? []);
}

function isTextRelevant(candidate, includeKeywords, extraExcludeKeywords = []) {
  const titleText = (candidate.title ?? '').toLowerCase();
  const fullText = `${candidate.title ?? ''} ${candidate.description ?? ''} ${candidate.categories ?? ''}`.toLowerCase();
  const excludeKeywords = [...excludedSourceKeywords, ...extraExcludeKeywords].map((keyword) => keyword.toLowerCase());
  if (excludeKeywords.some((keyword) => fullText.includes(keyword))) return false;
  const keywords = includeKeywords.map((keyword) => keyword.toLowerCase());
  return keywords.some((keyword) => titleText.includes(keyword) || fullText.includes(keyword));
}

async function downloadCandidate(candidate, isManualSource = false) {
  const sourceUrl = candidate.sourceUrl ?? candidate.url;
  const extension = extensionFromUrl(sourceUrl);
  const path = resolve(cacheRoot, `${cacheKey(sourceUrl)}${extension}`);
  if (candidate.archiveMember && existsSync(path) && looksLikeCachedArchive(path)) {
    return extractArchiveMember(path, candidate.archiveMember, sourceUrl);
  }
  if (existsSync(path) && looksLikeCachedAudio(path)) return path;
  if (existsSync(path)) rmSync(path, { force: true });

  await delay(isManualSource ? manualSourceDelayMs : 650);
  try {
    const response = await fetch(sourceUrl, { headers: { 'User-Agent': userAgent } });
    if (response.status === 429) return undefined;
    if (!response.ok) return undefined;
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType && !isAllowedDownloadContentType(contentType, candidate)) {
      console.warn(`Skipping ${candidate.title}: expected audio, got ${contentType}`);
      return undefined;
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > maxDownloadBytes) return undefined;
    if (candidate.archiveMember) {
      if (!looksLikeArchiveBytes(bytes)) {
        console.warn(`Skipping ${candidate.title}: downloaded archive is not a zip file`);
        return undefined;
      }
      writeFileSync(path, bytes);
      return extractArchiveMember(path, candidate.archiveMember, sourceUrl);
    }
    if (!looksLikeAudioBytes(bytes)) {
      console.warn(`Skipping ${candidate.title}: downloaded file is not audio`);
      return undefined;
    }
    writeFileSync(path, bytes);
    return path;
  } catch (error) {
    console.warn(`Download failed for ${candidate.title}: ${error.message}`);
    return undefined;
  }
}

function isAllowedDownloadContentType(contentType, candidate) {
  const normalized = contentType.toLowerCase();
  return normalized.startsWith('audio/')
    || normalized.startsWith('video/')
    || normalized.includes('application/ogg')
    || normalized.includes('application/octet-stream')
    || (candidate.archiveMember && (normalized.includes('zip') || normalized.includes('application/octet-stream')));
}

function extractArchiveMember(archivePath, archiveMember, sourceUrl) {
  const extension = extensionFromUrl(archiveMember);
  const outputPath = resolve(cacheRoot, `${cacheKey(`${sourceUrl}:${archiveMember}`)}${extension}`);
  if (existsSync(outputPath) && looksLikeCachedAudio(outputPath)) return outputPath;
  if (existsSync(outputPath)) rmSync(outputPath, { force: true });

  const result = spawnSync('unzip', ['-p', archivePath, archiveMember], {
    encoding: 'buffer',
    maxBuffer: maxDownloadBytes,
    timeout: 8_000,
  });
  if (result.status !== 0 || !result.stdout?.length || !looksLikeAudioBytes(result.stdout)) {
    rmSync(outputPath, { force: true });
    return undefined;
  }
  writeFileSync(outputPath, result.stdout);
  return outputPath;
}

function looksLikeCachedAudio(path) {
  try {
    return looksLikeAudioBytes(readFileSync(path));
  } catch {
    return false;
  }
}

function looksLikeCachedArchive(path) {
  try {
    return looksLikeArchiveBytes(readFileSync(path));
  } catch {
    return false;
  }
}

function looksLikeAudioBytes(bytes) {
  if (bytes.length < 16) return false;
  const head4 = bytes.toString('ascii', 0, 4);
  const head3 = bytes.toString('ascii', 0, 3);
  const ogg = bytes.toString('ascii', 0, 4) === 'OggS';
  const riff = head4 === 'RIFF';
  const id3 = head3 === 'ID3';
  const flac = head4 === 'fLaC';
  const ebml = bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  const mp3Frame = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
  return ogg || riff || id3 || flac || ebml || mp3Frame;
}

function looksLikeArchiveBytes(bytes) {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

function convertToWav(inputPath, outputPath, source) {
  if (existsSync(outputPath) && looksLikeUsefulWav(outputPath, source)) return true;
  if (existsSync(outputPath)) rmSync(outputPath, { force: true });

  if (runFfmpegConversion(inputPath, outputPath, denoiseFilterChain, source)) return true;
  if (runFfmpegConversion(inputPath, outputPath, fallbackCleanupFilterChain, source)) return true;
  rmSync(outputPath, { force: true });
  return false;
}

function runFfmpegConversion(inputPath, outputPath, filterChain, source) {
  const result = spawnSync(ffmpegPath, [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    inputPath,
    '-vn',
    '-af',
    filterChain,
    '-ac',
    String(channels),
    '-ar',
    String(sampleRate),
    '-acodec',
    'pcm_s16le',
    '-t',
    '3',
    outputPath,
  ], { timeout: 8_000 });

  if (result.status === 0 && existsSync(outputPath) && looksLikeUsefulWav(outputPath, source)) return true;
  rmSync(outputPath, { force: true });
  return false;
}

function looksLikeUsefulWav(path, source) {
  try {
    const samples = readWavSamples(path);
    return hasUsefulAudio(samples, source);
  } catch {
    return false;
  }
}

function writeClip(outputPath, samples, soundType) {
  writeFileSync(outputPath, encodeWav(polishClipForPlayback(samples, soundType)));
}

function polishClipForPlayback(samples, soundType) {
  const filtered = lowPassFilter(highPassFilter(samples, 55), soundType === 'sleep' ? 5200 : 7600);
  const gated = gentleNoiseGate(filtered, noiseGateThresholdFor(soundType));
  const softened = smoothTransients(gated);
  return normalizeForKids(softened, targetRmsFor(soundType), soundType === 'sleep' ? 0.5 : 0.68);
}

function gentleNoiseGate(samples, threshold) {
  const output = new Float32Array(samples.length);
  let envelopeLevel = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index];
    const absolute = Math.abs(sample);
    envelopeLevel = Math.max(absolute, envelopeLevel * 0.992);
    const gate = envelopeLevel <= threshold
      ? 0.38
      : envelopeLevel >= threshold * 3.2
        ? 1
        : 0.38 + (envelopeLevel - threshold) / (threshold * 2.2) * 0.62;
    output[index] = sample * gate;
  }
  return output;
}

function noiseGateThresholdFor(soundType) {
  return {
    eat: 0.004,
    drink: 0.004,
    sleep: 0.0035,
  }[soundType] ?? 0.0065;
}

function highPassFilter(samples, cutoffHz) {
  const output = new Float32Array(samples.length);
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const dt = 1 / sampleRate;
  const alpha = rc / (rc + dt);
  let previousOutput = 0;
  let previousInput = samples[0] ?? 0;

  for (let index = 0; index < samples.length; index += 1) {
    const input = samples[index];
    const value = alpha * (previousOutput + input - previousInput);
    output[index] = value;
    previousOutput = value;
    previousInput = input;
  }
  return output;
}

function lowPassFilter(samples, cutoffHz) {
  const output = new Float32Array(samples.length);
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const dt = 1 / sampleRate;
  const alpha = dt / (rc + dt);
  let value = samples[0] ?? 0;

  for (let index = 0; index < samples.length; index += 1) {
    value += alpha * (samples[index] - value);
    output[index] = value;
  }
  return output;
}

function smoothTransients(samples) {
  const output = new Float32Array(samples.length);
  for (let index = 0; index < samples.length; index += 1) {
    const previous = samples[Math.max(0, index - 1)];
    const current = samples[index];
    const next = samples[Math.min(samples.length - 1, index + 1)];
    output[index] = previous * 0.16 + current * 0.68 + next * 0.16;
  }
  return output;
}

function renderProceduralClip(animal, type) {
  const profile = proceduralProfile(animal);
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

    samples[i] = clamp(value * 0.58, -0.95, 0.95);
  }

  return normalizeForKids(samples, targetRmsFor(type), 0.68);
}

function renderProceduralActionClip(animal, type, identitySamples) {
  const profile = proceduralProfile(animal);
  const duration = {
    eat: 1.05,
    drink: 0.92,
    sleep: 1.72,
  }[type];
  const total = Math.floor(sampleRate * duration);
  const samples = new Float32Array(total);
  const seed = numericSeed(`${animal.id}:${type}:procedural-action`);
  const family = familyFor(animal.id);

  for (let i = 0; i < total; i += 1) {
    const t = i / sampleRate;
    const progress = t / duration;
    let value = 0;

    if (type === 'eat') {
      const rate = family === 'hoofed' || family === 'giant' ? 5.8 : family === 'bird' ? 10.5 : 7.4;
      const bite = Math.sin(Math.PI * ((t * rate + (seed % 9) * 0.013) % 1)) ** 10;
      const crunch = noise(i, seed) * 0.22 + noise(i * 3, seed + 17) * 0.08;
      const softTone = sine(profile.base * 0.18 + wobble(t, 3, 6), t) * 0.035;
      value = (crunch + softTone) * bite;
    } else if (type === 'drink') {
      const rate = family === 'canine' || family === 'predator' ? 9.5 : family === 'aquatic' ? 4.2 : 6.8;
      const lap = Math.sin(Math.PI * ((t * rate + (seed % 5) * 0.021) % 1)) ** 8;
      const water = sine(360 + (seed % 110), t) * 0.028 + noise(i, seed + 31) * 0.075;
      value = water * (0.25 + lap * 0.95);
      if (family === 'aquatic') value += sine(170 + wobble(t, 2, 30), t) * 0.035;
    } else {
      const breath = Math.sin(Math.PI * progress * (family === 'giant' ? 3.2 : 4.4)) ** 2;
      const low = sine(profile.base * 0.22 + wobble(t, 1.2, 4), t) * 0.045;
      const air = noise(i, seed + 59) * 0.026;
      value = (low + air) * (0.18 + breath * 0.74);
    }

    if (identitySamples && identitySamples.length > 32) {
      const identity = interpolate(identitySamples, i * (type === 'sleep' ? 0.65 : 0.92));
      value += identity * (type === 'sleep' ? 0.025 : 0.035);
    }

    samples[i] = value * envelopeSeconds(t, duration, type === 'sleep' ? 0.18 : 0.035, type === 'sleep' ? 0.32 : 0.14);
  }

  return normalizeForKids(samples, targetRmsFor(type), type === 'sleep' ? 0.5 : 0.6);
}

function renderRelatedCuteMoodClip(animal, type) {
  const design = animal.cuteSoundDesign ?? {};
  const sourceClass = design.sourceClass ?? 'related-cute-design';
  const duration = {
    joy: 0.92,
    happy: 1.02,
    sad: 1.15,
    angry: 0.86,
  }[type] ?? 0.96;
  const total = Math.floor(sampleRate * duration);
  const samples = new Float32Array(total);
  const seed = numericSeed(`${animal.id}:${type}:${sourceClass}`);
  const family = familyFor(animal.id);
  const profile = proceduralProfile(animal);

  for (let i = 0; i < total; i += 1) {
    const t = i / sampleRate;
    const progress = t / duration;
    let value = 0;

    if (sourceClass.includes('flutter')) {
      value = cuteFlutter(t, i, seed, progress, type);
    } else if (sourceClass.includes('bubble')) {
      value = cuteBubbles(t, i, seed, progress, type);
    } else if (sourceClass.includes('shell')) {
      value = cuteShellSteps(t, i, seed, progress, type);
    } else if (sourceClass.includes('moss')) {
      value = cuteMossSteps(t, i, seed, progress, type);
    } else if (sourceClass.includes('reptile')) {
      value = cuteReptileLeaf(t, i, seed, progress, type);
    } else {
      value = brightTone(profile.base * 0.72 + wobble(t, 5, 24), t, 0.52) * 0.18;
      value += noise(i, seed) * 0.035;
    }

    const moodShape = {
      joy: 1.1 + Math.sin(progress * Math.PI * 3) * 0.18,
      happy: 1 + Math.sin(progress * Math.PI * 4) * 0.12,
      sad: 0.68 * (1 - progress * 0.16),
      angry: 1.16 + (Math.sin(progress * Math.PI * 9) > 0 ? 0.18 : -0.08),
    }[type] ?? 1;

    const familyTone = family === 'aquatic'
      ? sine(260 + wobble(t, 2.2, 24), t) * 0.035
      : family === 'insect'
        ? sine(930 + wobble(t, 18, 70), t) * 0.025
        : sine(Math.max(120, profile.base * 0.32) + wobble(t, 3, 14), t) * 0.026;

    samples[i] = (value * moodShape + familyTone) * envelopeSeconds(t, duration, type === 'sad' ? 0.08 : 0.035, type === 'sad' ? 0.24 : 0.14);
  }

  return normalizeForKids(samples, targetRmsFor(type) * 1.08, 0.62);
}

function cuteFlutter(t, index, seed, progress, type) {
  const rate = type === 'sad' ? 8.5 : type === 'angry' ? 18 : 13;
  const wing = Math.sin(Math.PI * ((t * rate + (seed % 13) * 0.017) % 1)) ** 2;
  const sparkle = sine(760 + wobble(t, 11, 95), t) * 0.055 + sine(1260 + wobble(t, 7, 120), t) * 0.028;
  return sparkle * wing + noise(index, seed) * wing * 0.045;
}

function cuteBubbles(t, index, seed, progress, type) {
  const rate = type === 'sad' ? 3.7 : type === 'angry' ? 7.2 : 5.4;
  const bubble = Math.sin(Math.PI * ((t * rate + (seed % 17) * 0.011) % 1)) ** 12;
  const pop = sine(390 + (seed % 90) + wobble(t, 4, 40), t) * 0.08;
  const water = lowNoise(index, seed) * 0.055 + sine(160 + wobble(t, 2, 26), t) * 0.032;
  return water * 0.75 + pop * bubble;
}

function cuteShellSteps(t, index, seed, progress, type) {
  const rate = type === 'sad' ? 2.8 : type === 'angry' ? 6.4 : 4.2;
  const step = Math.sin(Math.PI * ((t * rate + (seed % 5) * 0.037) % 1)) ** 16;
  const tap = sine(520 + (seed % 130), t) * 0.072 + sine(780 + (seed % 110), t) * 0.026;
  const rub = lowNoise(index, seed + 31) * 0.052;
  return tap * step + rub * (0.28 + step);
}

function cuteMossSteps(t, index, seed, progress, type) {
  const rate = type === 'sad' ? 3.2 : type === 'angry' ? 7.4 : 5.1;
  const step = Math.sin(Math.PI * ((t * rate + (seed % 7) * 0.025) % 1)) ** 10;
  const leaf = bandNoise(index, seed, 0.62) * 0.08;
  const droplet = sine(620 + wobble(t, 5, 65), t) * step * 0.034;
  return leaf * (0.34 + step) + droplet;
}

function cuteReptileLeaf(t, index, seed, progress, type) {
  const rate = type === 'sad' ? 3.8 : type === 'angry' ? 8.5 : 5.8;
  const foot = Math.sin(Math.PI * ((t * rate + (seed % 11) * 0.019) % 1)) ** 12;
  const leaf = bandNoise(index, seed + 17, 0.48) * 0.064;
  const pop = sine(700 + (seed % 160), t) * foot * (type === 'angry' ? 0.068 : 0.04);
  return leaf * (0.45 + foot) + pop;
}

function lowNoise(index, seed) {
  return (noise(index, seed) * 0.5 + noise(Math.floor(index / 3), seed + 9) * 0.5);
}

function bandNoise(index, seed, smooth = 0.5) {
  return noise(index, seed) * (1 - smooth) + noise(Math.floor(index / 5), seed + 23) * smooth;
}

function readWavSamples(path) {
  const buffer = readFileSync(path);
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`Unsupported WAV file: ${path}`);
  }

  let cursor = 12;
  let audioFormat = 1;
  let bitsPerSample = 16;
  let dataStart = -1;
  let dataSize = 0;

  while (cursor + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', cursor, cursor + 4);
    const chunkSize = buffer.readUInt32LE(cursor + 4);
    const chunkStart = cursor + 8;

    if (chunkId === 'fmt ') {
      audioFormat = buffer.readUInt16LE(chunkStart);
      bitsPerSample = buffer.readUInt16LE(chunkStart + 14);
    } else if (chunkId === 'data') {
      dataStart = chunkStart;
      dataSize = chunkSize;
      break;
    }

    cursor = chunkStart + chunkSize + (chunkSize % 2);
  }

  if (dataStart < 0 || !((audioFormat === 1 && bitsPerSample === 16) || (audioFormat === 3 && bitsPerSample === 32))) {
    throw new Error(`Unsupported WAV encoding in ${path}`);
  }

  const bytesPerSample = bitsPerSample / 8;
  const samples = new Float32Array(dataSize / bytesPerSample);
  for (let i = 0; i < samples.length; i += 1) {
    samples[i] = audioFormat === 3
      ? buffer.readFloatLE(dataStart + i * bytesPerSample)
      : buffer.readInt16LE(dataStart + i * bytesPerSample) / 32768;
  }
  return samples;
}

function deriveRealClip(sourceSamples, type, seedText) {
  if (seedText === 'dog_shiba') {
    return deriveShortBarkClip(sourceSamples, type, seedText);
  }

  const profile = derivationProfiles[type];
  const outputLength = Math.floor(sampleRate * profile.duration);
  const output = new Float32Array(outputLength);
  const seed = numericSeed(seedText);
  const sourceOffset = sourceSamples.length > outputLength
    ? Math.floor((seed % 997) / 997 * Math.max(1, sourceSamples.length - outputLength))
    : 0;

  for (let i = 0; i < output.length; i += 1) {
    const progress = i / output.length;
    const sourceIndex = (sourceOffset + i * profile.speed) % sourceSamples.length;
    const sample = interpolate(sourceSamples, sourceIndex);
    let value = sample * profile.volume;

    if (profile.texture === 'rough') {
      value = Math.tanh(value * 2.4) + noise(i, seed) * 0.018;
    } else if (profile.texture === 'bright') {
      value += interpolate(sourceSamples, sourceIndex + 7) * 0.12;
    } else if (profile.texture === 'soft') {
      value = value * 0.78 + interpolate(sourceSamples, sourceIndex - 9) * 0.18;
    } else if (profile.texture === 'pulse') {
      const pulse = 0.45 + Math.sin(Math.PI * ((i / sampleRate) * 8.5 % 1)) ** 10;
      value = value * pulse + noise(i, seed) * pulse * 0.025;
    } else if (profile.texture === 'ripple') {
      const ripple = 0.42 + Math.sin(Math.PI * ((i / sampleRate) * 12 % 1)) ** 8;
      value = value * ripple + sine(420 + (seed % 120), i / sampleRate) * ripple * 0.018;
    } else if (profile.texture === 'breath') {
      const breath = 0.22 + Math.sin(Math.PI * progress * 4.5) ** 2 * 0.6;
      value *= breath;
    }

    output[i] = clamp(value * envelopeSeconds(i / sampleRate, profile.duration, profile.attack, profile.release), -0.95, 0.95);
  }

  return normalizeForKids(output, targetRmsFor(type), 0.72);
}

function deriveShortBarkClip(sourceSamples, type, seedText) {
  const profile = derivationProfiles[type];
  const outputLength = Math.floor(sampleRate * profile.duration);
  const output = new Float32Array(outputLength);
  const seed = numericSeed(`${seedText}:${type}:short-bark`);
  const segmentLength = Math.min(sourceSamples.length, Math.floor(sampleRate * (type === 'sad' ? 0.42 : 0.34)));
  const sourceOffset = loudestWindowOffset(sourceSamples, segmentLength);
  const repeatCount = type === 'angry' ? 3 : 2;
  const spacing = outputLength / (repeatCount + 0.7);

  for (let repeat = 0; repeat < repeatCount; repeat += 1) {
    const start = Math.floor(spacing * (repeat + 0.28 + (seed % 7) * 0.006));
    const speed = type === 'sad' ? 0.88 : type === 'angry' ? 1.08 : 1;
    const gain = type === 'sad' ? 0.78 : type === 'angry' ? 1.15 : 1;
    for (let i = 0; i < segmentLength; i += 1) {
      const outIndex = start + i;
      if (outIndex >= output.length) break;
      const progress = i / segmentLength;
      let value = interpolate(sourceSamples, sourceOffset + i * speed) * gain;
      if (type === 'angry') value = Math.tanh(value * 2.15);
      if (type === 'happy' || type === 'joy') value += interpolate(sourceSamples, sourceOffset + i * speed + 5) * 0.1;
      output[outIndex] += value * envelope(progress, 0.04, 0.28);
    }
  }

  return normalizeForKids(output, targetRmsFor(type), 0.72);
}

function loudestWindowOffset(samples, windowLength) {
  if (samples.length <= windowLength) return 0;
  const stride = Math.max(1, Math.floor(windowLength / 16));
  let bestOffset = 0;
  let bestEnergy = -Infinity;

  for (let offset = 0; offset + windowLength < samples.length; offset += stride) {
    let energy = 0;
    for (let index = 0; index < windowLength; index += stride) {
      const sample = samples[offset + index] ?? 0;
      energy += sample * sample;
    }
    if (energy > bestEnergy) {
      bestEnergy = energy;
      bestOffset = offset;
    }
  }

  return bestOffset;
}

function deriveActionClip(actionSamples, identitySamples, type, seedText) {
  const profile = derivationProfiles[type];
  const duration = {
    eat: 1.05,
    drink: 0.92,
    sleep: 1.72,
  }[type] ?? profile.duration;
  const outputLength = Math.floor(sampleRate * duration);
  const output = new Float32Array(outputLength);
  const seed = numericSeed(`${seedText}:${type}:action`);
  const actionOffset = actionSamples.length > outputLength
    ? Math.floor((seed % 997) / 997 * Math.max(1, actionSamples.length - outputLength))
    : 0;
  const identityAvailable = identitySamples && identitySamples.length > 32;
  const identityOffset = identityAvailable && identitySamples.length > outputLength
    ? Math.floor(((seed >>> 8) % 997) / 997 * Math.max(1, identitySamples.length - outputLength))
    : 0;

  for (let i = 0; i < output.length; i += 1) {
    const t = i / sampleRate;
    const progress = i / output.length;
    let action = interpolate(actionSamples, actionOffset + i * (type === 'sleep' ? 0.82 : 1.02));
    const identity = identityAvailable
      ? interpolate(identitySamples, identityOffset + i * (type === 'sleep' ? 0.72 : 0.95))
      : 0;

    if (type === 'eat') {
      const bitePulse = 0.34 + Math.sin(Math.PI * ((t * 7.5 + (seed % 11) * 0.03) % 1)) ** 8 * 0.78;
      action = action * bitePulse + noise(i, seed) * bitePulse * 0.022;
      output[i] = action * 0.94 + identity * 0.04;
    } else if (type === 'drink') {
      const lapPulse = 0.28 + Math.sin(Math.PI * ((t * 10.8 + (seed % 7) * 0.04) % 1)) ** 10 * 0.72;
      action = action * lapPulse + sine(390 + (seed % 90), t) * lapPulse * 0.012;
      output[i] = action * 0.9 + identity * 0.03;
    } else {
      const breath = 0.22 + Math.sin(Math.PI * progress * 4.25) ** 2 * 0.7;
      output[i] = action * breath * 0.75 + identity * breath * 0.025 + noise(i, seed) * breath * 0.006;
    }

    output[i] *= envelopeSeconds(t, duration, profile.attack, profile.release);
  }

  return normalizeForKids(output, targetRmsFor(type), type === 'sleep' ? 0.52 : 0.62);
}

function interpolate(samples, index) {
  const length = samples.length;
  const wrapped = ((index % length) + length) % length;
  const left = Math.floor(wrapped);
  const right = (left + 1) % length;
  const amount = wrapped - left;
  return samples[left] * (1 - amount) + samples[right] * amount;
}

function prepareSourceSamples(samples) {
  const trimmed = trimSilence(samples, 0.012, Math.floor(sampleRate * 0.08));
  const minimumLength = Math.floor(sampleRate * 0.5);
  if (trimmed.length >= minimumLength) return normalizeForKids(trimmed, 0.045, 0.72);

  const padded = new Float32Array(minimumLength);
  for (let i = 0; i < padded.length; i += 1) {
    padded[i] = trimmed[i % Math.max(1, trimmed.length)] ?? 0;
  }
  return normalizeForKids(padded, 0.04, 0.68);
}

function hasUsefulAudio(samples, source) {
  const metrics = sampleMetrics(samples);
  const sourceText = [
    source?.sourceClass,
    source?.title,
    source?.displayTitle,
    source?.description,
    source?.categories,
  ].join(' ').toLowerCase();
  const quietRealEnvironment = /\b(underwater|hydrophone|ocean|aquarium|bubble|water|breathing)\b/.test(sourceText);
  const minPeak = quietRealEnvironment ? 0.00025 : 0.025;
  const minRms = quietRealEnvironment ? 0.000015 : 0.004;
  return metrics.peak >= minPeak && metrics.rms >= minRms && metrics.peak <= 1.02;
}

function normalizeForKids(samples, targetRms = 0.055, peakLimit = 0.72) {
  const output = new Float32Array(samples.length);
  let metrics = sampleMetrics(samples);
  if (metrics.peak < 0.001 || metrics.rms < 0.0005) return renderQuietNoise(samples.length);

  const rmsGain = Math.min(4.5, targetRms / metrics.rms);
  const peakGain = peakLimit / metrics.peak;
  const gain = Math.min(rmsGain, peakGain);
  for (let i = 0; i < samples.length; i += 1) {
    output[i] = softLimit(samples[i] * gain, peakLimit);
  }

  metrics = sampleMetrics(output);
  if (metrics.rms < 0.006) {
    const rescueGain = Math.min(peakLimit / Math.max(metrics.peak, 0.001), 0.018 / Math.max(metrics.rms, 0.001));
    for (let i = 0; i < output.length; i += 1) {
      output[i] = softLimit(output[i] * rescueGain, peakLimit);
    }
  }

  return output;
}

function trimSilence(samples, threshold, padding) {
  let start = 0;
  let end = samples.length - 1;

  while (start < samples.length && Math.abs(samples[start]) < threshold) start += 1;
  while (end > start && Math.abs(samples[end]) < threshold) end -= 1;

  start = Math.max(0, start - padding);
  end = Math.min(samples.length - 1, end + padding);
  return samples.slice(start, end + 1);
}

function sampleMetrics(samples) {
  let peak = 0;
  let sumSquares = 0;
  for (const sample of samples) {
    peak = Math.max(peak, Math.abs(sample));
    sumSquares += sample * sample;
  }
  return {
    peak,
    rms: Math.sqrt(sumSquares / Math.max(1, samples.length)),
  };
}

function targetRmsFor(type) {
  return {
    joy: 0.062,
    angry: 0.066,
    sad: 0.047,
    happy: 0.06,
    eat: 0.045,
    drink: 0.038,
    sleep: 0.026,
  }[type] ?? 0.052;
}

function softLimit(value, peakLimit) {
  return Math.tanh(value / peakLimit) * peakLimit;
}

function renderQuietNoise(length) {
  const output = new Float32Array(length);
  for (let i = 0; i < output.length; i += 1) {
    const t = i / sampleRate;
    output[i] = noise(i, 173) * 0.012 * envelopeSeconds(t, output.length / sampleRate, 0.06, 0.12);
  }
  return output;
}

function envelopeSeconds(t, duration, attack, release) {
  const fadeIn = Math.min(1, t / attack);
  const fadeOut = Math.min(1, (duration - t) / release);
  return Math.max(0, Math.min(fadeIn, fadeOut));
}

function proceduralProfile(animal) {
  const index = animalSoundCatalog.findIndex((item) => item.id === animal.id);
  const family = familyFor(animal.id);
  return {
    family,
    base: familyBaseFrequency(family) + (index % 7) * 13,
    roughness: 0.12 + (index % 5) * 0.035,
    brightness: 0.55 + (index % 6) * 0.07,
    rhythmOffset: (index % 4) * 0.025,
  };
}

function familyFor(id) {
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

function encodeWav(samples) {
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample * channels;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
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

function sourceMetadata(source) {
  return {
    kind: source.kind,
    provider: source.provider ?? providerFromUrl(source.pageUrl ?? source.sourceUrl),
    searchTerm: source.searchTerm,
    title: source.title ?? source.reason,
    displayTitle: source.displayTitle,
    pageUrl: source.pageUrl,
    sourceUrl: source.sourceUrl,
    author: source.author,
    credit: source.credit,
    license: source.license,
    usageTerms: source.usageTerms,
    attributionRequired: Boolean(source.attributionRequired),
    sourceClass: source.sourceClass ?? (source.kind === 'procedural-fallback' ? 'procedural-fallback' : 'animal-vocalization'),
    reason: source.reason,
    designedFor: source.designedFor,
  };
}

function clipMetadata({ animal, soundType, kind, source, derivedFrom }) {
  return {
    path: `/assets/sounds/${animal.id}/${soundType}.wav`,
    kind,
    provider: source.provider ?? providerFromUrl(source.pageUrl ?? source.sourceUrl),
    title: source.title,
    pageUrl: source.pageUrl,
    sourceUrl: source.sourceUrl,
    author: source.author,
    credit: source.credit,
    license: source.license,
    usageTerms: source.usageTerms,
    attributionRequired: Boolean(source.attributionRequired),
    sourceClass: source.sourceClass ?? (kind === 'real-action-layer' ? `${soundType}-action-layer` : 'animal-vocalization'),
    derivedFrom,
  };
}

function fallbackClipMetadata(animal, soundType) {
  return {
    path: `/assets/sounds/${animal.id}/${soundType}.wav`,
    kind: 'procedural-fallback',
    provider: 'PetPet procedural audio',
    title: `${animal.displayName} ${soundType} procedural fallback`,
    pageUrl: '',
    sourceUrl: '',
    author: 'PetPet local demo',
    credit: animal.fallbackFamily,
    license: 'Generated for local demo',
    usageTerms: 'Generated fallback; replace with reviewed real recording before production use.',
    attributionRequired: false,
    sourceClass: 'procedural-fallback',
    derivedFrom: animal.fallbackFamily,
  };
}

function proceduralActionClipMetadata(animal, soundType) {
  return {
    path: `/assets/sounds/${animal.id}/${soundType}.wav`,
    kind: 'procedural-action-layer',
    provider: 'PetPet child-friendly sound design',
    title: `${animal.displayName} ${soundType} action layer`,
    pageUrl: '',
    sourceUrl: '',
    author: 'PetPet local demo',
    credit: `${soundType} action texture for ${animal.fallbackFamily}`,
    license: 'Generated for local demo',
    usageTerms: 'Generated child-friendly action layer; replace with reviewed real foley before production use.',
    attributionRequired: false,
    sourceClass: `${soundType}-procedural-action-layer`,
    derivedFrom: animal.fallbackFamily,
  };
}

function relatedCuteClipMetadata(animal, soundType) {
  const design = animal.cuteSoundDesign ?? {};
  return {
    path: `/assets/sounds/${animal.id}/${soundType}.wav`,
    kind: 'generated-related-cute',
    provider: 'PetPet child-friendly sound design',
    title: `${animal.displayName} ${soundType} related cute sound`,
    pageUrl: '',
    sourceUrl: '',
    author: 'PetPet local demo',
    credit: design.movementTexture ?? animal.fallbackFamily,
    license: 'Generated for local demo',
    usageTerms: 'Generated child-friendly related sound for quiet animals; replace with reviewed production audio before commercial use.',
    attributionRequired: false,
    sourceClass: design.sourceClass ?? 'related-cute-design',
    derivedFrom: animal.fallbackFamily,
    designedFor: design.moodTexture ?? design.movementTexture ?? animal.fallbackFamily,
  };
}

function providerFromUrl(url = '') {
  if (url.includes('commons.wikimedia.org') || url.includes('upload.wikimedia.org')) return 'Wikimedia Commons';
  if (url.includes('freesound.org')) return 'Freesound';
  return 'PetPet local demo';
}

function stripLocalPaths(value) {
  return JSON.parse(JSON.stringify(value, (key, nestedValue) => (key === 'localPath' || key === 'samples' ? undefined : nestedValue)));
}

function cleanHtml(value) {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function extensionFromUrl(url) {
  const pathname = /^[a-z][a-z0-9+.-]*:/i.test(url) ? new URL(url).pathname : url;
  const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
  return match ? `.${match[1].toLowerCase()}` : '.audio';
}

function isAttributionRequiredLicense(license = '') {
  return !/public domain|cc0/i.test(license);
}

function cacheKey(value) {
  return createHash('sha1').update(value).digest('hex').slice(0, 18);
}

function numericSeed(value) {
  const digest = createHash('sha1').update(value).digest();
  return digest.readUInt32LE(0);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}
