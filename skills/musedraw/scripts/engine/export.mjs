// Browser export: load the open-source fonts, render the SVG, run layout
// checks on the real glyphs and write a 2× PNG.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { assertStaticSvg } from './safety.mjs';
import { collectEditableScene, toDrawio } from './drawio.mjs';

// Family -> npm package and stylesheet files (all OFL-licensed fonts).
export const FONT_PACKAGES = {
  'Inter': ['@fontsource/inter', ['400.css', '500.css', '600.css', '700.css', '800.css', '400-italic.css']],
  'Noto Sans SC': ['@fontsource/noto-sans-sc', ['400.css', '500.css', '700.css', '900.css']],
  'Noto Serif SC': ['@fontsource/noto-serif-sc', ['400.css', '600.css', '700.css', '900.css']],
  'LXGW WenKai': ['lxgw-wenkai-webfont', ['lxgwwenkai-regular.css', 'lxgwwenkai-bold.css']],
  'JetBrains Mono': ['@fontsource/jetbrains-mono', ['400.css', '500.css', '700.css']],
  'Space Grotesk': ['@fontsource/space-grotesk', ['400.css', '500.css', '700.css']],
  'Fraunces': ['@fontsource/fraunces', ['400.css', '600.css', '700.css', '400-italic.css', '600-italic.css']],
  'Caveat': ['@fontsource/caveat', ['400.css', '600.css', '700.css']],
  'IBM Plex Mono': ['@fontsource/ibm-plex-mono', ['400.css', '500.css', '600.css', '700.css', '400-italic.css']],
  'Instrument Serif': ['@fontsource/instrument-serif', ['400.css', '400-italic.css']],
  'Ma Shan Zheng': ['@fontsource/ma-shan-zheng', ['400.css']],
  'Archivo': ['@fontsource/archivo', ['400.css', '500.css', '700.css', '800.css', '900.css']],
  'Space Mono': ['@fontsource/space-mono', ['400.css', '700.css']],
};

function findModuleDirs(start) {
  const dirs = [];
  let d = path.resolve(start);
  for (;;) { const nm = path.join(d, 'node_modules'); if (fs.existsSync(nm)) dirs.push(nm); const up = path.dirname(d); if (up === d) break; d = up; }
  return dirs;
}

export function fontStylesheets(svg, fontDirs) {
  const families = new Set();
  for (const m of svg.matchAll(/font-family="([^"]+)"/g)) for (const f of m[1].replace(/&apos;|'/g, '').split(',')) families.add(f.trim());
  const links = [], missing = [];
  for (const fam of families) {
    const pkg = FONT_PACKAGES[fam];
    if (!pkg) continue;
    const dir = fontDirs.map((d) => path.join(d, pkg[0])).find((d) => fs.existsSync(d));
    if (!dir) { missing.push(`${fam} (${pkg[0]})`); continue; }
    for (const css of pkg[1]) { const p = path.join(dir, css); if (fs.existsSync(p)) links.push(pathToFileURL(p).href); }
  }
  return { links, missing, families: [...families] };
}

export async function loadPlaywrightInfo(explicit) {
  const candidates = [];
  if (explicit) candidates.push(path.resolve(explicit));
  if (process.env.MUSEDRAW_PLAYWRIGHT) candidates.push(path.resolve(process.env.MUSEDRAW_PLAYWRIGHT));
  // A minimal runtime install avoids the full font dependency tree.
  for (const base of [process.cwd(), path.resolve(import.meta.dirname, '../..')]) candidates.push(path.join(base, 'output/runtime/node_modules/playwright/index.mjs'));
  for (const base of [process.cwd(), path.join(import.meta.dirname, '../..'), path.dirname(process.execPath)]) {
    try { candidates.push(createRequire(path.join(base, 'x.js')).resolve('playwright')); } catch { /* not installed here */ }
  }
  for (const c of candidates) {
    try {
      const m = await import(pathToFileURL(c).href), pw = m.chromium ? m : m.default;
      if (pw?.chromium) return { pw, modulePath: c };
    } catch { /* try next */ }
  }
  throw new Error('Playwright not found. Reuse an installed module with --playwright, or install only playwright in output/runtime with --ignore-scripts. Run musedraw.mjs doctor for setup instructions.');
}

export async function loadPlaywright(explicit) { return (await loadPlaywrightInfo(explicit)).pw; }

export async function exportScene({ svg, outDir, browser, fontDirs, scale = 2, name = 'diagram', images = true, drawio = true, fontMode = 'bundled', previewFirst = false, readingProfile = null, onProgress = () => {} }) {
  assertStaticSvg(svg);
  const { links, missing } = fontMode === 'system' ? { links: [], missing: [] } : fontStylesheets(svg, fontDirs);
  const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'musedraw-'));
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline' file:; font-src file: data:; img-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-src 'none'; form-action 'none'">${links.map((l) => `<link rel="stylesheet" href="${l}">`).join('')}<style>html,body{margin:0;padding:0;background:transparent}svg{display:block}</style></head><body>${svg}</body></html>`;
  const htmlPath = path.join(tmp, 'page.html');
  await fsp.writeFile(htmlPath, html);
  const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const [W, H] = [Number(m[1]), Number(m[2])];
  const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width: Math.ceil(W), height: Math.ceil(H) }, deviceScaleFactor: scale });
  await page.route(/^https?:\/\//, route => route.abort());
  try {
    await page.goto(pathToFileURL(htmlPath).href);
    await page.evaluate(async () => { await document.fonts.ready; });
    // Force every used face to load, then wait again (unicode-range chunks load lazily).
    const fontLoads = await page.evaluate(async () => {
      const seen = new Set();
      const loads = [];
      for (const t of document.querySelectorAll('text')) {
        const cs = getComputedStyle(t);
        const key = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        if (!seen.has(key + t.textContent)) { seen.add(key + t.textContent); loads.push(document.fonts.load(key, t.textContent).catch(() => [])); }
      }
      await Promise.all(loads);
      await document.fonts.ready;
      return loads.length;
    });
    const checks = await page.evaluate(runChecks, { W, H, readingProfile });
    checks.missingFonts = missing;
    if (fontMode === 'system') checks.fontMode = 'system';
    onProgress('checked', { warnings: checks.warnings.length, fontLoads });
    if (previewFirst && images) {
      // Keep the first view small enough for chat/file previews. Restore CSS
      // before collecting native geometry and making the full-size PNG.
      const style = await page.evaluate(({ W, H }) => {
        const svg = document.querySelector('svg'), previous = svg.getAttribute('style');
        const ratio = Math.min(1, 1200 / W, 1000 / H);
        svg.style.width = `${W * ratio}px`; svg.style.height = `${H * ratio}px`;
        return previous;
      }, { W, H });
      try {
        await page.locator('svg').first().screenshot({ path: path.join(outDir, 'preview.jpg'), type: 'jpeg', quality: 85, scale: 'css' });
      } finally {
        await page.evaluate((style) => { const svg = document.querySelector('svg'); if (style === null) svg.removeAttribute('style'); else svg.setAttribute('style', style); }, style);
      }
      onProgress('preview', { file: 'preview.jpg', passed: checks.passed });
    }
    if (drawio) {
      const started = performance.now();
      const editable = await page.evaluate(collectEditableScene);
      await fsp.writeFile(path.join(outDir, `${name}.drawio`), toDrawio(editable));
      checks.drawio = { native: true, nodes: editable.groups.filter(g => g.kind === 'node').length, edges: editable.edges.length, texts: editable.texts.length, visualEffects: editable.visualEffects, durationMs: Math.round(performance.now() - started) };
      onProgress('drawio', { file: `${name}.drawio`, durationMs: checks.drawio.durationMs });
    } else checks.drawio = { skipped: true, reason: 'requested' };
    if (images) {
      const shot = path.join(outDir, `${name}@${scale}x.png`);
      await page.locator('svg').first().screenshot({ path: shot, omitBackground: false });
      // Lightweight preview for READMEs and galleries (grain textures make PNGs large).
      if (!previewFirst) await page.locator('svg').first().screenshot({ path: path.join(outDir, 'preview.jpg'), type: 'jpeg', quality: 82, scale: 'css' });
      onProgress('png', { file: `${name}@${scale}x.png` });
    }
    return checks;
  } finally {
    await page.close();
    await fsp.rm(tmp, { recursive: true, force: true });
  }
}

// Runs inside the page. Measures real glyph boxes.
function runChecks({ W, H, readingProfile }) {
  const warnings = [];
  const box = (el) => { const b = el.getBBox(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
  const inter = (a, b, pad = 0) => a.x < b.x + b.w - pad && b.x < a.x + a.w - pad && a.y < b.y + b.h - pad && b.y < a.y + a.h - pad;
  const textItems = [];
  for (const g of document.querySelectorAll('g[data-md]')) {
    for (const t of g.querySelectorAll(':scope > text, :scope > g > text')) {
      if (!t.textContent.trim()) continue;
      textItems.push({ owner: g.id, kind: g.dataset.md, b: box(t), pointCaption: !!t.closest('[data-md-point-label]'), text: t.textContent.slice(0, 40) });
    }
  }
  // Text inside its node.
  const nodeBoxes = [];
  for (const g of document.querySelectorAll('g[data-md="node"]')) {
    const [x, y, w, h] = g.dataset.box.split(',').map(Number);
    if (g.dataset.shape === 'text' || w === 0) continue;
    nodeBoxes.push({ id: g.id, b: { x, y, w, h }, shape: g.dataset.shape, overlap: g.dataset.overlap === '1' });
    if (g.dataset.label !== 'inside') continue;
    for (const t of g.querySelectorAll('text:not(.md-step)')) {
      if (!t.textContent.trim()) continue;
      const b = box(t);
      const tol = 1.5;
      if (b.x < x - tol || b.y < y - tol || b.x + b.w > x + w + tol || b.y + b.h > y + h + tol) warnings.push({ type: 'text-overflow', id: g.id, text: t.textContent.slice(0, 40) });
    }
  }
  // Text collisions between different elements.
  for (let i = 0; i < textItems.length; i++) for (let j = i + 1; j < textItems.length; j++) {
    const a = textItems[i], b = textItems[j];
    if (a.owner === b.owner && !a.pointCaption && !b.pointCaption) continue;
    if (inter(a.b, b.b, 1)) warnings.push({ type: 'text-collision', a: `${a.owner}: ${a.text}`, b: `${b.owner}: ${b.text}` });
  }
  // Edge labels sitting on nodes.
  for (const t of textItems.filter((t) => t.kind === 'edge-label' || t.kind === 'note')) for (const n of nodeBoxes) if (inter(t.b, n.b, 2)) warnings.push({ type: `${t.kind}-on-node`, label: t.text, node: n.id });
  // Scientific graph captions are outside their nodes. A caption can cross an
  // incident bond despite every node and caption having separate valid boxes.
  // Test connector segments, not their bounding boxes (diagonals would produce
  // many false positives). Work in root SVG units, including group transforms.
  const svg = document.querySelector('svg'), rootInverse = svg.getCTM().inverse();
  const matrix = el => rootInverse.multiply(el.getCTM());
  const point = (m, p) => ({ x:m.a*p[0]+m.c*p[1]+m.e, y:m.b*p[0]+m.d*p[1]+m.f });
  const hits = (a,b,r) => {
    let lo=0,hi=1;
    for (const [v,d,min,max] of [[a.x,b.x-a.x,r.x,r.x+r.w],[a.y,b.y-a.y,r.y,r.y+r.h]]) {
      if (Math.abs(d)<1e-9) { if(v<min || v>max)return false; }
      else { const s=(min-v)/d,t=(max-v)/d;lo=Math.max(lo,Math.min(s,t));hi=Math.min(hi,Math.max(s,t));if(lo>hi)return false; }
    }
    return true;
  };
  const captions=[...document.querySelectorAll('[data-md-point-label]')];
  const connectors=captions.length ? [...document.querySelectorAll('g[data-md="edge"][data-connection]')].flatMap(g=>{
    const e=JSON.parse(g.dataset.connection);
    if(e.opacity===0 || e.color==='none')return [];
    const paths=[...g.querySelectorAll('[data-md-connector-path] path')];
    // Older/static SVG can lack the marker. Its first path is the centerline;
    // later paths may be arrowheads and are intentionally not included.
    if(!paths.length && g.querySelector('path'))paths.push(g.querySelector('path'));
    return paths.flatMap(path=>{
      const style=getComputedStyle(path);
      if(style.stroke==='none' || Number(style.opacity)===0 || Number(style.strokeOpacity)===0)return [];
      const m=matrix(path),sum=m.a*m.a+m.b*m.b+m.c*m.c+m.d*m.d,det=m.a*m.d-m.b*m.c;
      const scale=Math.sqrt((sum+Math.sqrt(Math.max(0,sum*sum-4*det*det)))/2),length=path.getTotalLength();
      // At most one root SVG unit of arc per sample. Any curve-to-chord
      // discrepancy is bounded by half that arc, included in the clearance.
      // This follows actual rounded/curved geometry, not native route corners.
      const steps=Math.max(1,Math.ceil(length*scale)),parts=[];
      let previous;
      for(let i=0;i<=steps;i++){
        const p=path.getPointAtLength(length*i/steps),current=point(m,[p.x,p.y]);
        if(previous)parts.push([previous,current]);previous=current;
      }
      return [{id:g.id,parts,pad:2+(parseFloat(style.strokeWidth)||e.width||1)*scale/2}];
    });
  }) : [];
  for(const caption of captions) {
    const rectangles=[...caption.querySelectorAll('text')].filter(t=>t.textContent.trim()).map(t=>{
      const b=t.getBBox(),m=matrix(t),corners=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(p=>point(m,p));
      const x=Math.min(...corners.map(p=>p.x)),y=Math.min(...corners.map(p=>p.y));
      return {x,y,w:Math.max(...corners.map(p=>p.x))-x,h:Math.max(...corners.map(p=>p.y))-y};
    });
    const seen=new Set();
    for(const e of connectors)if(!seen.has(e.id) && rectangles.some(b=>e.parts.some(([a,c])=>hits(a,c,{x:b.x-e.pad,y:b.y-e.pad,w:b.w+2*e.pad,h:b.h+2*e.pad})))){
      seen.add(e.id);warnings.push({type:'text-edge-collision',id:caption.dataset.captionId,point:caption.dataset.mdPointLabel,edge:e.id,text:caption.textContent.slice(0,40)});
    }
  }
  // Header and free text must stay inside the canvas too.
  for (const t of document.querySelectorAll('#header text, #texts text, #legend text')) { const b = box(t); if (b.x < 0 || b.x + b.w > W - 8 || b.y + b.h > H) warnings.push({ type: 'outside-canvas', owner: 'header/text', text: t.textContent.slice(0, 40) }); }
  // Outside the canvas.
  for (const t of textItems) if (t.b.x < 0 || t.b.y < 0 || t.b.x + t.b.w > W || t.b.y + t.b.h > H) warnings.push({ type: 'outside-canvas', owner: t.owner, text: t.text });
  for (const n of nodeBoxes) if (n.b.y + n.b.h > H || n.b.x + n.b.w > W) warnings.push({ type: 'outside-canvas', owner: n.id, text: 'node extends past the canvas; enlarge size' });
  // Overlapping nodes (excluding deliberate containment).
  for (let i = 0; i < nodeBoxes.length; i++) for (let j = i + 1; j < nodeBoxes.length; j++) if (!nodeBoxes[i].overlap && !nodeBoxes[j].overlap && !['chevron'].includes(nodeBoxes[i].shape) && !['chevron'].includes(nodeBoxes[j].shape) && inter(nodeBoxes[i].b, nodeBoxes[j].b, 1)) warnings.push({ type: 'node-overlap', a: nodeBoxes[i].id, b: nodeBoxes[j].id });
  let readability;
  if(readingProfile) {
    const previewScale=Math.min(1,readingProfile.maxWidth/W,readingProfile.maxHeight/H), sizes=[];
    for(const text of document.querySelectorAll('text')) {
      if(!text.textContent.trim())continue;
      const px=parseFloat(getComputedStyle(text).fontSize)*previewScale;sizes.push(px);
      if(px+.05<readingProfile.min)warnings.push({type:'text-too-small',text:text.textContent.slice(0,40),previewPx:Math.round(px*100)/100,minimumPx:readingProfile.min});
    }
    readability={preview:[Math.round(W*previewScale),Math.round(H*previewScale)],minimumPx:readingProfile.min,smallestTextPx:sizes.length?Math.round(Math.min(...sizes)*100)/100:null};
  }
  return { size: [W, H], nodes: nodeBoxes.length, texts: textItems.length, ...(readability?{readability}:{}), warnings, passed: warnings.length === 0 };
}
