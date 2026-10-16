#!/usr/bin/env node
// MuseDraw CLI
//
//   node scripts/musedraw.mjs render scene.json [more.json ...] [--theme id] [--out dir]
//   node scripts/musedraw.mjs themes
//   node scripts/musedraw.mjs validate scene.json [more.json ...] [--theme id]
//
// Writes diagram@2x.png, diagram.drawio, diagram.svg and checks.json next to each scene
// (or into --out). Needs `npm install` in this skill folder for fonts and
// Playwright; use --svg-only when no browser is available.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { render } from './engine/render.mjs';
import { exportScene, loadPlaywrightInfo, fontStylesheets } from './engine/export.mjs';
import { prepareScene, validateScene, SceneValidationError } from './engine/validate.mjs';
import { resolveBrowser, systemFontStacks, withSystemFonts, fileStamp, fontEnvironmentStamp } from './engine/environment.mjs';
import { renderKey, rendererStamp, readRenderCache, writeRenderCache } from './engine/cache.mjs';
import { patchScene } from './engine/patch.mjs';

const SKILL = path.resolve(import.meta.dirname, '..');
const THEMES = path.join(SKILL, 'themes');

export async function loadTheme(id, trail = []) {
  if (typeof id !== 'string' || !id.trim() || /[\\/.:\u0000-\u001f]/.test(id)) throw new Error('Use a named theme, not a filesystem path');
  if (trail.includes(id) || trail.length >= 20) throw new Error('Cyclic or excessive theme inheritance');
  const file = path.join(THEMES, `${id}.json`);
  if (!fs.existsSync(file)) {
    const ids = (await fsp.readdir(THEMES)).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
    const byName = [];
    for (const i of ids) { const t = JSON.parse(await fsp.readFile(path.join(THEMES, `${i}.json`), 'utf8')); if ([t.name, t.nameZh, ...(t.aliases ?? [])].some((n) => n && n.toLowerCase() === String(id).toLowerCase())) byName.push(i); }
    if (byName.length) return loadTheme(byName[0], [...trail, id]);
    throw new Error(`Unknown theme "${id}". Available: ${ids.join(', ')}`);
  }
  let theme = JSON.parse(await fsp.readFile(file, 'utf8'));
  if (theme.extends) {
    const base = await loadTheme(theme.extends, [...trail, id]);
    theme = merge(base, theme);
  }
  return scaleType(theme);
}

// Global type scale: readable at README width without touching scenes.
function scaleType(t) {
  if (t._scaled) return t;
  const k = t.typeScale ?? 1.08;
  const mul = (o, key) => { if (o && typeof o[key] === 'number') o[key] = Math.round(o[key] * k * 10) / 10; };
  ['size', 'subSize', 'tagSize'].forEach((key) => mul(t.node, key));
  mul(t.edge, 'labelSize'); mul(t.note, 'size'); mul(t.legend, 'size'); mul(t.zone, 'labelSize'); mul(t.zone, 'subSize'); mul(t.header, 'subSize');
  t._scaled = true;
  return t;
}

function merge(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k]) ? merge(a[k], v) : v;
  return out;
}

function args(argv) {
  const flags = {}, rest = [];
  const booleans = new Set(['svg-only', 'strict', 'cache', 'no-cache', 'preview-first', 'json', 'no-drawio']);
  const values = new Set(['theme', 'out', 'playwright', 'browser', 'fonts', 'font-mode', 'lang']);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      if (booleans.has(k)) flags[k] = true;
      else if (values.has(k)) {
        if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error(`--${k} requires a value`);
        flags[k] = argv[++i];
      } else throw new Error(`Unknown option --${k}`);
    }
    else rest.push(a);
  }
  return { flags, rest };
}

async function main() {
  const started = performance.now();
  const [cmd, ...argv] = process.argv.slice(2);
  const { flags, rest } = args(argv);
  const fontMode = flags['font-mode'] ?? 'system';
  if (!['system', 'bundled'].includes(fontMode)) throw new Error('--font-mode must be system or bundled');
  if (cmd === 'doctor') {
    const report = { node: process.versions.node, skillVersion: JSON.parse(await fsp.readFile(path.join(SKILL, 'package.json'), 'utf8')).version, engineFingerprint: rendererStamp(), capabilities: ['patch', 'grid', 'default-progress'], fontMode, fontsRequired: fontMode === 'bundled', ready: false };
    if (Number(process.versions.node.split('.')[0]) < 22) report.error = 'Node.js 22+ is required';
    else try {
      const { pw } = await loadPlaywrightInfo(flags.playwright);
      const found = resolveBrowser(pw, { browser: flags.browser });
      report.browser = found.source;
      report.browserPath = found.executablePath;
      report.ready = true;
    } catch (error) { report.error = error.message; }
    if (fontMode === 'bundled') {
      const theme = await loadTheme(flags.theme ?? 'editorial');
      const svg = Object.values(theme.fonts).map((family) => `font-family="${family}"`).join(' ');
      report.missingFonts = fontStylesheets(svg, [flags.fonts, path.join(SKILL, 'node_modules')].filter(Boolean)).missing;
      if (report.missingFonts.length) { report.ready = false; report.error ??= 'Theme fonts missing; use --font-mode system for an immediate preview, or install the theme fonts separately.'; }
    }
    report.elapsedMs = Math.round(performance.now() - started);
    report.setup = 'Reuse --playwright <module> and --browser <Chrome/Edge executable>. If needed: npm install --prefix output/runtime --no-save --ignore-scripts --fetch-timeout=15000 --fetch-retries=0 playwright@1.56.0';
    if (fontMode === 'system') report.fonts = systemFontStacks();
    console.log(flags.json ? JSON.stringify(report, null, 2) : `${report.ready ? 'READY' : 'NOT READY'} (${report.elapsedMs} ms)\n${report.error ?? `Browser: ${report.browser}\nFonts: ${fontMode}`}\n${report.setup}`);
    if (!report.ready) process.exitCode = 1;
    return;
  }
  if (cmd === 'themes') {
    for (const f of (await fsp.readdir(THEMES)).sort()) {
      if (!f.endsWith('.json')) continue;
      const t = JSON.parse(await fsp.readFile(path.join(THEMES, f), 'utf8'));
      console.log(`${t.id.padEnd(14)} ${t.name} / ${t.nameZh} — ${t.summary}`);
    }
    return;
  }
  let starter = null;
  let edit = null;
  if (cmd === 'patch') {
    if (rest.length !== 2 || !flags.out) throw new Error('Usage: musedraw.mjs patch source.json changes.json --out new-directory');
    const original = JSON.parse(await fsp.readFile(path.resolve(rest[0]), 'utf8'));
    const operations = JSON.parse(await fsp.readFile(path.resolve(rest[1]), 'utf8'));
    edit = patchScene(original, operations);
    starter = edit.scene;
    const target = path.resolve(flags.out, 'scene.json');
    if (target === path.resolve(rest[0]) || fs.existsSync(target)) throw new Error('Patch output must be a new scene path; the source and existing revisions are preserved');
    rest.splice(0, 2, target);
  }
  if (cmd === 'quickstart') {
    if (rest.length !== 1 || rest[0] !== 'rag') throw new Error('Usage: musedraw.mjs quickstart rag --out <directory> [--lang zh|en]');
    const lang = flags.lang ?? 'zh';
    if (!['zh', 'en'].includes(lang)) throw new Error('--lang must be zh or en');
    flags.out ??= 'output/rag';
    const sceneFile = path.resolve(flags.out, 'scene.json');
    if (!fs.existsSync(sceneFile)) starter = JSON.parse(await fsp.readFile(path.join(SKILL, `assets/starters/rag.${lang}.json`), 'utf8'));
    rest.splice(0, 1, sceneFile);
  }
  if (!['render', 'validate', 'quickstart', 'patch'].includes(cmd) || !rest.length) {
    console.log('Usage: musedraw.mjs quickstart rag --out <directory> [--lang zh|en]\n       musedraw.mjs patch source.json changes.json --out new-directory\n       musedraw.mjs doctor [--json]\n       musedraw.mjs render scene.json [...] [--font-mode system|bundled] [--no-cache] [--no-drawio] [--theme id] [--out dir] [--svg-only] [--playwright module] [--browser exe] [--fonts node_modules]\n       musedraw.mjs validate scene.json [...] [--theme id]\n       musedraw.mjs themes');
    process.exitCode = cmd ? 1 : 0;
    return;
  }
  const drawio = !flags['no-drawio'];
  const fontDirs = [flags.fonts, path.join(SKILL, 'node_modules'), path.join(process.cwd(), 'node_modules'), path.join(SKILL, '../../node_modules')].filter(Boolean).filter((d) => fs.existsSync(d));
  let browser = null;
  let runtime = null;
  const previewFirst = true;
  const useCache = !flags['no-cache'] && !flags['svg-only'] && fontMode === 'system';
  let cacheContext = null;
  let failed = 0;
  try {
    for (const file of rest) {
      try {
        const events = [];
        const progress = (stage, detail = {}) => {
          const event = { stage, elapsedMs: Math.round(performance.now() - started), ...detail };
          events.push(event);
          console.log(`[${(event.elapsedMs / 1000).toFixed(2)}s] ${stage}${detail.file ? `: ${path.join(path.resolve(flags.out ?? path.dirname(file)), detail.file)}` : ''}`);
        };
        const scene = starter ?? JSON.parse(await fsp.readFile(file, 'utf8'));
        const source = JSON.stringify(scene);
        const issues = validateScene(scene);
        if (issues.length) throw new SceneValidationError(issues);
        const themeId = flags.theme ?? scene.theme;
        if (!themeId) throw new Error('no theme (set "theme" in the scene or pass --theme)');
        const theme = await loadTheme(themeId);
        if (cmd === 'validate') {
          prepareScene(scene, merge(theme, scene.style ?? {}));
          console.log(`✓ ${file}  valid scene (browser layout and visual quality not checked)`);
          continue;
        }
        // Reject invalid scenes before launching a browser or writing artifacts.
        const drawing = structuredClone(scene);
        drawing.header ??= false;
        drawing.footer ??= false;
        let svg = render(drawing, theme);
        if (fontMode === 'system') svg = withSystemFonts(svg);
        progress('scene-ready');
        const outDir = path.resolve(flags.out ?? path.dirname(file));
        if (!flags['svg-only'] && !runtime) {
          const { pw, modulePath } = await loadPlaywrightInfo(flags.playwright);
          runtime = { pw, modulePath, ...resolveBrowser(pw, { browser: flags.browser }) };
          progress('runtime-ready', { browser: runtime.source, fontMode });
        }
        let key = null;
        if (useCache) {
          cacheContext ??= { renderer: rendererStamp(), browser: fileStamp(runtime.executablePath), fonts: fontEnvironmentStamp(), node: process.versions.node, platform: process.platform, playwright: fileStamp(runtime.modulePath), package: fs.existsSync(path.join(path.dirname(runtime.modulePath), 'package.json')) ? fileStamp(path.join(path.dirname(runtime.modulePath), 'package.json')) : null };
          key = renderKey({ source, svg, cacheContext, drawio });
          const cached = readRenderCache(outDir, key, { drawio });
          if (cached) {
            progress('cache-hit', { file: 'preview.jpg' });
            await fsp.writeFile(path.join(outDir, 'run.json'), JSON.stringify({ cached: true, fontMode, events, elapsedMs: Math.round(performance.now() - started) }, null, 2) + '\n');
            console.log(`✓ ${path.relative(process.cwd(), outDir) || '.'}  [${theme.id}] cached (artifacts verified)`);
            continue;
          }
        }
        if (!flags['svg-only'] && !browser) {
          browser = await runtime.pw.chromium.launch({ headless: true, executablePath: runtime.executablePath });
          progress('browser-ready');
        }
        await fsp.mkdir(outDir, { recursive: true });
        if (starter) await fsp.writeFile(file, JSON.stringify(starter, null, 2) + '\n', { flag: 'wx' });
        if (edit) await fsp.writeFile(path.join(outDir, 'changes.json'), JSON.stringify({ changes: edit.changes, unrelatedSceneFieldsChanged: false }, null, 2) + '\n');
        await fsp.writeFile(path.join(outDir, 'diagram.svg'), svg + '\n');
        let checks = { svgOnly: true };
        if (fontMode === 'system') checks.fontMode = 'system';
        if (browser) checks = await exportScene({ svg, outDir, browser, fontDirs, fontMode, drawio, previewFirst, onProgress: progress });
        checks.theme = theme.id;
        await fsp.writeFile(path.join(outDir, 'checks.json'), JSON.stringify(checks, null, 2) + '\n');
        if (key) writeRenderCache(outDir, key, checks, { drawio });
        if (previewFirst) await fsp.writeFile(path.join(outDir, 'run.json'), JSON.stringify({ cached: false, fontMode, events, elapsedMs: Math.round(performance.now() - started) }, null, 2) + '\n');
        const w = checks.warnings?.length ?? 0;
        if (checks.missingFonts?.length) console.warn(`  ! fonts not installed (falling back to system fonts): ${checks.missingFonts.join(', ')}`);
        console.log(`${w ? '△' : '✓'} ${path.relative(process.cwd(), outDir) || '.'}  [${theme.id}]${w ? `  ${w} layout warning(s) — see checks.json` : ''}`);
        if (w || checks.missingFonts?.length) failed++;
      } catch (error) {
        throw new Error(`${file}: ${error.message}`, { cause: error });
      }
    }
  } finally {
    if (browser) await browser.close();
  }
  if (failed && flags.strict) process.exitCode = 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  main().catch((e) => { console.error(e.message); process.exitCode = 1; });
}
