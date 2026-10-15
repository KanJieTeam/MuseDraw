import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { resolveBrowser, withSystemFonts, fontEnvironmentStamp } from '../skills/musedraw/scripts/engine/environment.mjs';
import { renderKey, rendererStamp, writeRenderCache, readRenderCache } from '../skills/musedraw/scripts/engine/cache.mjs';
import { loadTheme } from '../skills/musedraw/scripts/musedraw.mjs';
import { render } from '../skills/musedraw/scripts/engine/render.mjs';

const root = path.resolve(import.meta.dirname, '..');
const cli = path.join(root, 'skills/musedraw/scripts/musedraw.mjs');
const scratch = (run) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'musedraw-fast-'));
  try { return run(dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
};
const invoke = (cwd, ...args) => spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8', timeout: 10000 });

test('browser discovery reuses bundled or installed Chrome without launching it', () => scratch((dir) => {
  const bundled = path.join(dir, 'chromium'); fs.writeFileSync(bundled, '');
  const pw = { chromium: { executablePath: () => bundled } };
  assert.equal(resolveBrowser(pw, { env: {}, platform: 'win32' }).source, 'playwright');
  fs.unlinkSync(bundled);
  const chrome = path.join(dir, 'Google/Chrome/Application/chrome.exe'); fs.mkdirSync(path.dirname(chrome), { recursive: true }); fs.writeFileSync(chrome, '');
  const found = resolveBrowser(pw, { env: { PROGRAMFILES: dir }, platform: 'win32' });
  assert.equal(found.source, 'system'); assert.equal(found.executablePath, chrome);
}));

test('an invalid explicit browser fails instead of silently choosing another', () => scratch((dir) => {
  const bundled = path.join(dir, 'chromium'); fs.writeFileSync(bundled, '');
  const pw = { chromium: { executablePath: () => bundled } };
  assert.throws(() => resolveBrowser(pw, { browser: path.join(dir, 'missing'), env: {} }), /Configured browser/);
  fs.unlinkSync(bundled);
  assert.throws(() => resolveBrowser(pw, { env: {}, platform: 'win32' }), /No Chromium browser found/);
}));

test('system font mode preserves the text and vector geometry', () => {
  const source = '<svg><text font-family="Fraunces, Noto Serif SC, serif">检索</text><text font-family="Inter, sans-serif">匹配</text><text font-family="JetBrains Mono, monospace">RAG</text><path d="M0 0L10 10"/></svg>';
  const result = withSystemFonts(source, 'win32');
  assert.match(result, /Georgia, SimSun, serif/);
  assert.match(result, /Segoe UI, Microsoft YaHei, sans-serif/);
  assert.match(result, /Consolas, Microsoft YaHei, monospace/);
  assert.equal(result.replace(/font-family="[^"]*"/g, ''), source.replace(/font-family="[^"]*"/g, ''));
});

test('system font environment changes invalidate the fingerprint', () => scratch((dir) => {
  const fonts = path.join(dir, 'Fonts'); fs.mkdirSync(fonts);
  const config = { platform: 'win32', env: { WINDIR: dir }, home: dir };
  const before = renderKey(fontEnvironmentStamp(config));
  fs.writeFileSync(path.join(fonts, 'test.ttf'), 'font');
  assert.notEqual(renderKey(fontEnvironmentStamp(config)), before);
}));

test('cache rejects changed inputs, missing or modified artifacts and failed checks', () => scratch((dir) => {
  const files = ['diagram.svg', 'diagram@2x.png', 'diagram.drawio', 'preview.jpg'];
  files.forEach((file) => fs.writeFileSync(path.join(dir, file), file));
  const checks = { passed: true, missingFonts: [], warnings: [] };
  fs.writeFileSync(path.join(dir, 'checks.json'), JSON.stringify(checks));
  const key = renderKey({ source: 'a', theme: 'editorial' });
  writeRenderCache(dir, key, checks);
  assert.deepEqual(readRenderCache(dir, key), checks);
  assert.equal(readRenderCache(dir, renderKey({ source: 'b' })), null);
  fs.writeFileSync(path.join(dir, 'diagram.drawio'), 'edited externally');
  assert.equal(readRenderCache(dir, key), null);
  fs.writeFileSync(path.join(dir, 'diagram.drawio'), 'diagram.drawio');
  assert.deepEqual(readRenderCache(dir, key), checks);
  fs.unlinkSync(path.join(dir, 'preview.jpg'));
  assert.equal(readRenderCache(dir, key), null);
  fs.unlinkSync(path.join(dir, '.musedraw-cache.json'));
  writeRenderCache(dir, key, { passed: false, warnings: [{}] });
  assert.equal(fs.existsSync(path.join(dir, '.musedraw-cache.json')), false);
}));

test('renderer code changes invalidate cached results', () => scratch((dir) => {
  fs.writeFileSync(path.join(dir, 'render.mjs'), 'export const version=1;');
  const first = rendererStamp(dir);
  fs.writeFileSync(path.join(dir, 'render.mjs'), 'export const version=2;');
  assert.notEqual(rendererStamp(dir), first);
}));

for (const lang of ['zh', 'en']) test(`${lang} starter has valid structure and no inherited example metrics`, async () => {
  const scene = JSON.parse(fs.readFileSync(path.join(root, `skills/musedraw/assets/starters/rag.${lang}.json`)));
  assert.equal(scene.bars, undefined);
  assert.equal(scene.figure, undefined);
  assert.equal(scene.footer, false);
  assert.equal(scene.header, false);
  const svg = render(scene, await loadTheme('editorial'));
  assert.ok(svg.includes('<svg'));
  assert.ok(svg.includes('<g id="header"></g>'));
  assert.doesNotMatch(svg, />MuseDraw|Fig\. 01|图 01/);
  assert.doesNotMatch(JSON.stringify(scene), /1024|512|900 ms|top 20|pgvector|key-rotation/);
  assert.ok(scene.edges.some((e) => e.from === 'embed-docs' && e.to === 'index'));
  assert.ok(scene.edges.some((e) => e.from === 'retrieve' && e.to === 'index'));
});

test('headerless output removes page furniture and closes the top gap', async () => {
  const scene = { size: [1600, 1000], title: 'Title', subtitle: 'Subtitle', kicker: 'Kicker', figure: 'Fig. 01', header: false, footer: false, nodes: [{ id: 'n', label: 'Diagram content', x: 64, y: 400 }] };
  const svg = render(scene, await loadTheme('editorial'));
  assert.ok(svg.includes('<g id="header"></g>'));
  assert.ok(svg.includes('<g id="footer"></g>'));
  assert.match(svg, /data-box="64,60,/);
  assert.ok(svg.includes('Diagram') && svg.includes('content'));
  const height = Number(svg.match(/viewBox="0 0 1600 ([\d.]+)"/)[1]);
  assert.ok(height < 1000);
});

test('quickstart works from a directory without the gallery or installed dependencies', () => scratch((dir) => {
  const out = path.join(dir, 'rag');
  const first = invoke(dir, 'quickstart', 'rag', '--out', out, '--svg-only');
  assert.equal(first.status, 0, first.stderr);
  const scene = JSON.parse(fs.readFileSync(path.join(out, 'scene.json')));
  assert.equal(scene.title, '端到端检索增强生成');
  assert.match(fs.readFileSync(path.join(out, 'diagram.svg'), 'utf8'), /Microsoft YaHei|PingFang SC|Noto Sans CJK SC/);
  scene.title = '用户已经修改的标题'; fs.writeFileSync(path.join(out, 'scene.json'), JSON.stringify(scene));
  const second = invoke(dir, 'quickstart', 'rag', '--out', out, '--svg-only');
  assert.equal(second.status, 0, second.stderr);
  assert.equal(JSON.parse(fs.readFileSync(path.join(out, 'scene.json'))).title, scene.title);
  assert.ok(fs.readFileSync(path.join(out, 'diagram.svg'), 'utf8').includes(scene.title));
}));

test('CLI omits unsolicited theme footer while preserving explicit attribution', () => scratch((dir) => {
  const file = path.join(dir, 'scene.json');
  const scene = { theme: 'editorial', title: '用户的图' };
  fs.writeFileSync(file, JSON.stringify(scene));
  let result = invoke(dir, 'render', file, '--svg-only');
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(fs.readFileSync(path.join(dir, 'diagram.svg'), 'utf8'), />MuseDraw/);
  scene.footer = '用户要求的署名'; scene.figure = '图 2';
  fs.writeFileSync(file, JSON.stringify(scene));
  result = invoke(dir, 'render', file, '--svg-only');
  assert.equal(result.status, 0, result.stderr);
  const svg = fs.readFileSync(path.join(dir, 'diagram.svg'), 'utf8');
  assert.ok(svg.includes('用户要求的署名')); assert.ok(svg.includes('图 2'));
}));

for (const args of [
  ['quickstart', '../outside'], ['quickstart', 'rag', '--lang', '../outside'],
  ['quickstart', 'rag', '--out'], ['quickstart', 'rag', '--font-mode', 'missing'],
  ['render', 'scene.json', '--unknown'],
]) test(`invalid command fails before output or installation: ${args.join(' ')}`, () => scratch((dir) => {
  const result = invoke(dir, ...args);
  assert.equal(result.status, 1);
  assert.deepEqual(fs.readdirSync(dir), []);
}));

test('doctor detects reusable runtime and diagnoses a missing browser without installation', () => scratch((dir) => {
  const browser = path.join(dir, 'chrome'); fs.writeFileSync(browser, '');
  const module = path.join(dir, 'pw.mjs');
  fs.writeFileSync(module, `export const chromium={executablePath:()=>${JSON.stringify(browser)}};`);
  let result = invoke(dir, 'doctor', '--json', '--playwright', module);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ready, true); assert.equal(report.fontsRequired, false);
  fs.unlinkSync(browser);
  result = invoke(dir, 'doctor', '--json', '--playwright', module, '--browser', browser);
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).ready, false);
  assert.deepEqual(fs.readdirSync(dir), ['pw.mjs']);
}));

test('minimal runtime under output/runtime is discovered without full skill installation', () => scratch((dir) => {
  const runtime = path.join(dir, 'output/runtime/node_modules/playwright'); fs.mkdirSync(runtime, { recursive: true });
  const browser = path.join(dir, 'chrome'); fs.writeFileSync(browser, '');
  fs.writeFileSync(path.join(runtime, 'index.mjs'), `export const chromium={executablePath:()=>${JSON.stringify(browser)}};`);
  const result = invoke(dir, 'doctor', '--json');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).ready, true);
}));
