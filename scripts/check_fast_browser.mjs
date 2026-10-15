// Real-browser acceptance and timings. No installs or network calls.
// Example: node scripts/check_fast_browser.mjs --playwright <module> --out output/fast-qa
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { rendererStamp } from '../skills/musedraw/scripts/engine/cache.mjs';

const root = path.resolve(import.meta.dirname, '..');
const argv = process.argv.slice(2);
const option = (key, fallback) => argv.includes(key) ? argv[argv.indexOf(key) + 1] : fallback;
const out = path.resolve(option('--out', 'output/fast-qa'));
const runs = Number(option('--runs', '3'));
const lang = option('--lang', 'zh');
assert.ok(Number.isInteger(runs) && runs >= 1 && runs <= 10);
assert.ok(['zh', 'en'].includes(lang));
fs.mkdirSync(out, { recursive: true });
const cli = path.join(root, 'skills/musedraw/scripts/musedraw.mjs');
const runtime = ['--playwright', option('--playwright')];
assert.ok(runtime[1], '--playwright is required to record the actual runtime');
if (option('--browser')) runtime.push('--browser', option('--browser'));

function command(args) {
  const start = performance.now();
  const result = spawnSync(process.execPath, [cli, ...args, ...runtime, '--strict'], { cwd: root, encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return Math.round(performance.now() - start);
}
const read = (dir, name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));

function jpegSize(file) {
  const data = fs.readFileSync(file);
  assert.equal(data.readUInt16BE(0), 0xffd8);
  let offset = 2;
  while (offset < data.length) {
    assert.equal(data[offset], 0xff);
    const marker = data[offset + 1], length = data.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2].includes(marker)) return { width: data.readUInt16BE(offset + 7), height: data.readUInt16BE(offset + 5) };
    offset += length + 2;
  }
  throw new Error('JPEG has no size marker');
}

function nativeCheck(dir) {
  const xml = fs.readFileSync(path.join(dir, 'diagram.drawio'), 'utf8');
  assert.doesNotMatch(xml, /shape=image|data:image|<image\b|foreignObject|<svg\b/i);
  const cells = [...xml.matchAll(/<mxCell\b([^>]*?)(?:\/>|>)/gs)].map((m) => Object.fromEntries([...m[1].matchAll(/([\w]+)="([^"]*)"/g)].map((a) => [a[1], a[2]])));
  const byId = new Map(cells.map((cell) => [cell.id, cell]));
  assert.equal(byId.size, cells.length, 'Native object IDs must be unique');
  const edges = cells.filter((cell) => cell.edge === '1');
  assert.equal(edges.length, 11);
  for (const edge of edges) for (const key of ['source', 'target']) assert.equal(byId.get(edge[key])?.vertex, '1');
  const textCells = cells.filter((cell) => cell.vertex === '1' && cell.value);
  assert.ok(textCells.length >= 40);
  assert.ok(cells.some((cell) => cell.style?.includes('shape=stencil(')));
  assert.ok(textCells.every((cell) => !/MuseDraw|Fig\. 01|图 01/.test(cell.value)), 'No visible attribution or figure number');
  return { cells: cells.length, textCells: textCells.length, connectedEdges: edges.length, embeddedImages: 0 };
}

const samples = [];
for (let i = 0; i < runs; i++) {
  const dir = path.join(out, `uncached-${i + 1}`);
  const wallMs = command(['quickstart', 'rag', '--lang', lang, '--out', dir, '--no-cache']);
  const run = read(dir, 'run.json'), checks = read(dir, 'checks.json');
  assert.equal(run.cached, false);
  assert.equal(checks.passed, true); assert.deepEqual(checks.warnings, []);
  assert.equal(checks.fontMode, 'system'); assert.deepEqual(checks.missingFonts, []);
  const preview = run.events.find((event) => event.stage === 'preview');
  const png = run.events.find((event) => event.stage === 'png');
  const drawio = run.events.find((event) => event.stage === 'drawio');
  assert.ok(preview.elapsedMs <= drawio.elapsedMs && drawio.elapsedMs <= png.elapsedMs);
  const dimensions = jpegSize(path.join(dir, 'preview.jpg'));
  assert.ok(dimensions.width <= 1200 && dimensions.height <= 1000);
  assert.ok(fs.statSync(path.join(dir, 'preview.jpg')).size < 512 * 1024);
  const scene = read(dir, 'scene.json');
  assert.equal(scene.header, false); assert.equal(scene.footer, false); assert.equal(scene.figure, undefined);
  const svg = fs.readFileSync(path.join(dir, 'diagram.svg'), 'utf8');
  assert.ok(svg.includes('<g id="header"></g>') && svg.includes('<g id="footer"></g>'));
  samples.push({ wallMs, previewMs: preview.elapsedMs, drawioMs: drawio.elapsedMs, pngMs: png.elapsedMs, previewBytes: fs.statSync(path.join(dir, 'preview.jpg')).size, dimensions, native: nativeCheck(dir) });
}

// Cache hits skip browser launch. Source edits and artifact edits must rerender.
const cachedDir = path.join(out, 'cached');
command(['quickstart', 'rag', '--lang', lang, '--out', cachedDir]);
const cacheWallMs = command(['quickstart', 'rag', '--out', cachedDir]);
const hit = read(cachedDir, 'run.json');
assert.equal(hit.cached, true);
assert.ok(!hit.events.some((event) => event.stage === 'browser-ready'));
const scene = read(cachedDir, 'scene.json');
const labels = lang === 'zh' ? ['项目原始文档', '更新后的文档'] : ['Project docs', 'Updated docs'];
scene.nodes[0].label = scene.nodes[0].label === labels[0] ? labels[1] : labels[0];
fs.writeFileSync(path.join(cachedDir, 'scene.json'), JSON.stringify(scene, null, 2));
command(['quickstart', 'rag', '--out', cachedDir]);
assert.equal(read(cachedDir, 'run.json').cached, false, 'Source edits invalidate cache');
fs.appendFileSync(path.join(cachedDir, 'diagram.drawio'), '\nchanged');
command(['quickstart', 'rag', '--out', cachedDir]);
assert.equal(read(cachedDir, 'run.json').cached, false, 'External artifact edits invalidate cache');
nativeCheck(cachedDir);

const median = (key) => samples.map((s) => s[key]).sort((a, b) => a - b)[Math.floor(samples.length / 2)];
const report = {
  scope: 'Local CLI with existing Playwright and browser; system-font mode loads no font packages. Excludes installation, model thinking and document reading. Uncached renders are not cold installations.',
  platform: process.platform, node: process.versions.node, lang, runs,
  rendererFingerprint: rendererStamp(),
  baseCommit: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout?.trim() || null,
  playwrightVersion: JSON.parse(fs.readFileSync(path.join(path.dirname(path.resolve(runtime[1])), 'package.json'), 'utf8')).version,
  skillFontPackagesInstalled: fs.existsSync(path.join(root, 'skills/musedraw/node_modules')),
  median: { previewMs: median('previewMs'), drawioMs: median('drawioMs'), pngMs: median('pngMs'), wallMs: median('wallMs') },
  cache: { wallMs: cacheWallMs, elapsedMs: hit.elapsedMs, sourceInvalidation: true, artifactInvalidation: true, verified: true },
  samples, passed: true,
};
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
