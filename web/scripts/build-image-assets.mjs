import { mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const animalsDir = path.join(root, 'public', 'assets', 'animals');
const fullQuality = 92;
const thumbQuality = 86;
const thumbWidth = 640;
const concurrency = 4;
const force = process.argv.includes('--force');

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function isFresh(inputPath, outputPath) {
  if (force || !(await exists(outputPath))) {
    return false;
  }
  const [input, output] = await Promise.all([stat(inputPath), stat(outputPath)]);
  return output.mtimeMs >= input.mtimeMs;
}

async function collectInputs() {
  const animalDirs = await readdir(animalsDir, { withFileTypes: true });
  const inputs = [];
  for (const animalDir of animalDirs) {
    if (!animalDir.isDirectory()) continue;
    const animalPath = path.join(animalsDir, animalDir.name);
    const entries = await readdir(animalPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && /^age-\d{2}\.png$/i.test(entry.name)) {
        inputs.push(path.join(animalPath, entry.name));
      }
    }
  }
  return inputs.sort();
}

async function convertOne(inputPath) {
  const animalPath = path.dirname(inputPath);
  const baseName = path.basename(inputPath, '.png');
  const fullOutput = path.join(animalPath, `${baseName}.webp`);
  const thumbDir = path.join(animalPath, 'thumbs');
  const thumbOutput = path.join(thumbDir, `${baseName}.webp`);

  const fullFresh = await isFresh(inputPath, fullOutput);
  const thumbFresh = await isFresh(inputPath, thumbOutput);
  if (fullFresh && thumbFresh) {
    return { skipped: true, inputPath, fullOutput, thumbOutput };
  }

  const image = sharp(inputPath, { failOn: 'none' }).rotate();
  const tasks = [];
  if (!fullFresh) {
    tasks.push(image.clone().webp({ quality: fullQuality, effort: 5, smartSubsample: true }).toFile(fullOutput));
  }
  if (!thumbFresh) {
    await mkdir(thumbDir, { recursive: true });
    tasks.push(
      image
        .clone()
        .resize({ width: thumbWidth, withoutEnlargement: true })
        .webp({ quality: thumbQuality, effort: 5, smartSubsample: true })
        .toFile(thumbOutput),
    );
  }
  await Promise.all(tasks);
  return { skipped: false, inputPath, fullOutput, thumbOutput };
}

async function runPool(items, worker) {
  let nextIndex = 0;
  const results = [];
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

const inputs = await collectInputs();
let converted = 0;
let skipped = 0;
const startedAt = Date.now();

await runPool(inputs, async (inputPath, index) => {
  const result = await convertOne(inputPath);
  if (result.skipped) {
    skipped += 1;
  } else {
    converted += 1;
  }
  if ((index + 1) % 50 === 0 || index + 1 === inputs.length) {
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(`images ${index + 1}/${inputs.length} converted=${converted} skipped=${skipped} elapsed=${elapsed}s`);
  }
  return result;
});

console.log(`Built animal image assets: ${converted} converted, ${skipped} already fresh, ${inputs.length} total.`);
