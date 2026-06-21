import { readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.resolve(root, process.argv[2] ?? 'dist');
const animalsDir = path.join(target, 'assets', 'animals');

async function pruneOriginalPngs(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  let removed = 0;

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      removed += await pruneOriginalPngs(entryPath);
    } else if (entry.isFile() && /^age-\d{2}\.png$/i.test(entry.name)) {
      await rm(entryPath);
      removed += 1;
    }
  }

  return removed;
}

const removed = await pruneOriginalPngs(animalsDir);
console.log(`Pruned ${removed} original animal PNG files from ${path.relative(root, target)}.`);
