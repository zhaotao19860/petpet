import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

import { animals } from '../src/data/animals.ts';

test('animal image metadata uses full WebP images with thumbnail variants', () => {
  for (const animal of animals) {
    assert.match(animal.media.coverImage, /\.webp$/, `${animal.id} cover should use full WebP`);
    assert.match(animal.media.coverThumbnail ?? '', /\/thumbs\/age-01\.webp$/, `${animal.id} cover should expose a thumbnail`);

    assert.equal(animal.media.ageImages.length, 30, `${animal.id} should keep 30 growth images`);
    for (const image of animal.media.ageImages) {
      const ageName = `age-${String(image.age).padStart(2, '0')}`;
      assert.match(image.url, new RegExp(`/${ageName}\\.webp$`), `${animal.id} ${ageName} should use full WebP`);
      assert.match(image.thumbnailUrl ?? '', new RegExp(`/thumbs/${ageName}\\.webp$`), `${animal.id} ${ageName} should expose a thumbnail`);
      assert.match(image.fallbackUrl ?? '', new RegExp(`/${ageName}\\.png$`), `${animal.id} ${ageName} should keep the original fallback path`);
    }
  }
});

test('animal WebP assets and thumbnails exist for every growth image', async () => {
  for (const animal of animals) {
    for (const image of animal.media.ageImages) {
      await access(new URL(`../public${image.url}`, import.meta.url));
      await access(new URL(`../public${image.thumbnailUrl}`, import.meta.url));
    }
  }
});

test('small animal cards load thumbnail images instead of full hero assets', async () => {
  const sources = await Promise.all([
    readFile(new URL('../src/pages/SelectionPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/UserHubPage.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/PlanetMap.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/games/SoundSafari.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/StoryLearnPage.tsx', import.meta.url), 'utf8'),
  ]);

  for (const source of sources) {
    assert.match(source, /thumbnailUrl|coverThumbnail/, 'card and strip images should prefer thumbnails');
  }
});

test('safe image component can fall back from thumbnails to full WebP and original sources', async () => {
  const source = await readFile(new URL('../src/components/SafeImage.tsx', import.meta.url), 'utf8');

  assert.match(source, /buildImageFallbacks/, 'fallback chain should be explicit and testable by source');
  assert.match(source, /\/thumbs\//, 'thumbnail URLs should be able to fall back to full-size assets');
  assert.match(source, /\.webp/, 'WebP assets should have a fallback branch');
  assert.match(source, /\.png/, 'original PNG path should remain as a fallback');
  assert.match(source, /\.svg/, 'legacy SVG and generic fallback should remain available');
});

test('image asset build script produces full-quality WebP and smaller thumbnails', async () => {
  const source = await readFile(new URL('../scripts/build-image-assets.mjs', import.meta.url), 'utf8');

  assert.match(source, /from 'sharp'/, 'image build script should use sharp');
  assert.match(source, /fullQuality/, 'script should expose full WebP quality');
  assert.match(source, /thumbQuality/, 'script should expose thumbnail WebP quality');
  assert.match(source, /withoutEnlargement:\s*true/, 'thumbnails should never upscale images');
  assert.match(source, /thumbs/, 'script should write thumbnail assets into thumbs folders');
});

test('production build prunes original animal PNG files after copying public assets', async () => {
  const packageJson = await readFile(new URL('../package.json', import.meta.url), 'utf8');
  const pruneSource = await readFile(new URL('../scripts/prune-original-animal-images.mjs', import.meta.url), 'utf8');

  assert.match(packageJson, /prune-original-animal-images\.mjs dist/, 'build should prune original animal PNGs from production dist');
  assert.match(pruneSource, /assets['"],\s*['"]animals/, 'prune script should only target animal assets');
  assert.match(pruneSource, /age-\\d\{2\}\\\.png/, 'prune script should remove only original growth PNG files');
  assert.doesNotMatch(pruneSource, /\.webp/, 'prune script must not remove generated WebP assets');
});
