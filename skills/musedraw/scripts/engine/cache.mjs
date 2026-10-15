// Optional, content-verified cache for the explicit system-font mode.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const filesFor = (drawio) => ['diagram.svg', 'diagram@2x.png', ...(drawio ? ['diagram.drawio'] : []), 'preview.jpg', 'checks.json'];
const hash = (value) => createHash('sha256').update(value).digest('hex');

export function renderKey(input) { return hash(JSON.stringify(input)); }

export function rendererStamp(directory = path.resolve(import.meta.dirname, '..')) {
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.(?:mjs|js)$/.test(entry.name)) files.push([path.relative(directory, file), hash(fs.readFileSync(file))]);
    }
  }
  walk(directory);
  return hash(JSON.stringify(files));
}

export function readRenderCache(outDir, key, { drawio = true } = {}) {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(outDir, '.musedraw-cache.json'), 'utf8'));
    if (manifest.version !== 1 || manifest.key !== key) return null;
    if ((manifest.drawio ?? true) !== drawio) return null;
    for (const file of filesFor(drawio)) if (manifest.files[file] !== hash(fs.readFileSync(path.join(outDir, file)))) return null;
    const checks = JSON.parse(fs.readFileSync(path.join(outDir, 'checks.json'), 'utf8'));
    return checks.passed && checks.missingFonts?.length === 0 ? checks : null;
  } catch { return null; }
}

export function writeRenderCache(outDir, key, checks, { drawio = true } = {}) {
  if (!checks.passed || checks.missingFonts?.length) return;
  const files = Object.fromEntries(filesFor(drawio).map((file) => [file, hash(fs.readFileSync(path.join(outDir, file)))]));
  fs.writeFileSync(path.join(outDir, '.musedraw-cache.json'), JSON.stringify({ version: 1, key, drawio, files }, null, 2) + '\n');
}
