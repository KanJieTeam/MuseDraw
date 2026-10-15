#!/usr/bin/env node
// MuseDraw CLI
//
//   node scripts/musedraw.mjs render scene.json [more.json ...] [--theme id] [--out dir]
//   node scripts/musedraw.mjs themes
//
// Writes diagram.svg, diagram@2x.png and checks.json next to each scene
// (or into --out). Needs `npm install` in this skill folder for fonts and
// Playwright; use --svg-only when no browser is available.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { render } from './engine/render.mjs';
import { exportScene, loadPlaywright } from './engine/export.mjs';

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
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); if (['svg-only'].includes(k)) flags[k] = true; else flags[k] = argv[++i]; }
    else rest.push(a);
  }
  return { flags, rest };
}

async function main() {
  const [cmd, ...argv] = process.argv.slice(2);
  const { flags, rest } = args(argv);
  if (cmd === 'themes') {
    for (const f of (await fsp.readdir(THEMES)).sort()) {
      if (!f.endsWith('.json')) continue;
      const t = JSON.parse(await fsp.readFile(path.join(THEMES, f), 'utf8'));
      console.log(`${t.id.padEnd(14)} ${t.name} / ${t.nameZh} — ${t.summary}`);
    }
    return;
  }
  if (cmd !== 'render' || !rest.length) {
    console.log('Usage: musedraw.mjs render scene.json [...] [--theme id] [--out dir] [--svg-only] [--playwright module] [--browser exe] [--fonts node_modules]\n       musedraw.mjs themes');
    process.exitCode = cmd ? 1 : 0;
    return;
  }
  const fontDirs = [flags.fonts, path.join(SKILL, 'node_modules'), path.join(process.cwd(), 'node_modules'), path.join(SKILL, '../../node_modules')].filter(Boolean).filter((d) => fs.existsSync(d));
  let browser = null;
  if (!flags['svg-only']) {
    const pw = await loadPlaywright(flags.playwright);
    browser = await pw.chromium.launch({ headless: true, ...(flags.browser || process.env.MUSEDRAW_BROWSER ? { executablePath: flags.browser || process.env.MUSEDRAW_BROWSER } : {}) });
  }
  let failed = 0;
  try {
    for (const file of rest) {
      const scene = JSON.parse(await fsp.readFile(file, 'utf8'));
      const themeId = flags.theme ?? scene.theme;
      if (!themeId) throw new Error(`${file}: no theme (set "theme" in the scene or pass --theme)`);
      const theme = await loadTheme(themeId);
      const outDir = path.resolve(flags.out ?? path.dirname(file));
      await fsp.mkdir(outDir, { recursive: true });
      const svg = render(scene, theme);
      await fsp.writeFile(path.join(outDir, 'diagram.svg'), svg + '\n');
      let checks = { svgOnly: true };
      if (browser) checks = await exportScene({ svg, outDir, browser, fontDirs });
      checks.theme = theme.id;
      await fsp.writeFile(path.join(outDir, 'checks.json'), JSON.stringify(checks, null, 2) + '\n');
      const w = checks.warnings?.length ?? 0;
      if (checks.missingFonts?.length) console.warn(`  ! fonts not installed (falling back to system fonts): ${checks.missingFonts.join(', ')}`);
      console.log(`${w ? '△' : '✓'} ${path.relative(process.cwd(), outDir) || '.'}  [${theme.id}]${w ? `  ${w} layout warning(s) — see checks.json` : ''}`);
      if (w) failed++;
    }
  } finally {
    if (browser) await browser.close();
  }
  if (failed && flags.strict) process.exitCode = 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  main().catch((e) => { console.error(e.message); process.exitCode = 1; });
}
