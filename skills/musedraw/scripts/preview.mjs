import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

// Defense in depth for a restricted static diagram format, not a security certification.
export const CSP = "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src 'none'; font-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-src 'none'; form-action 'none'";
export const previewDocument = svg => `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${CSP}"><style>body{margin:0}svg{display:block}</style></head><body>${svg}</body></html>`;

export async function protectedPage(browser) {
  const page = await browser.newPage({javaScriptEnabled:false,viewport:{width:300,height:160},deviceScaleFactor:1});
  await page.route('**/*', route => route.abort());
  await page.setContent(previewDocument(''));
  return page;
}

export async function validateSvg(page, source) {
  if (Buffer.byteLength(source, 'utf8') > 2 * 1024 * 1024 || /<!\s*(DOCTYPE|ENTITY)\b/i.test(source)) {
    throw new Error('SVG input exceeds policy limits or declares a DTD/entity');
  }
  // Parse in an inert XML document, never attach unvalidated source to the live page.
  // The browser context disables page scripts; automation evaluate still measures layout.
  return page.evaluate(svg => {
    const ns = 'http://www.w3.org/2000/svg';
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const root = doc.documentElement;
    if (doc.querySelector('parsererror') || root.localName !== 'svg' || root.namespaceURI !== ns) {
      throw new Error('Invalid SVG XML/namespace');
    }
    const box = (root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
    if (box.length !== 4 || !box.every(Number.isFinite) || box[0] !== 0 || box[1] !== 0 || box[2] <= 0 || box[3] <= 0 || box[2] > 8000 || box[3] > 8000) {
      throw new Error('Expected a bounded, positive, zero-origin SVG viewBox');
    }
    const [,, W, H] = box;
    for (const [key, expected] of [['width', W], ['height', H]]) {
      if (root.hasAttribute(key) && Number(root.getAttribute(key).replace(/px$/, '')) !== expected) {
        throw new Error('SVG pixel dimensions must match viewBox extents');
      }
    }
    const ids = new Set(), references = [];
    const supported = new Set(['svg', 'g', 'defs', 'rect', 'text', 'tspan', 'textpath', 'line', 'path', 'polyline', 'polygon', 'circle', 'ellipse', 'marker', 'title', 'desc', 'metadata', 'style', 'a', 'use', 'symbol', 'clippath', 'mask', 'pattern', 'lineargradient', 'radialgradient', 'stop']);
    for (const element of [root, ...root.querySelectorAll('*')]) {
      const tag = element.localName.toLowerCase();
      if (element.namespaceURI !== ns || !supported.has(tag)) throw new Error(`Unsupported SVG element: ${tag}`);
      if (['title', 'desc', 'style', 'metadata'].includes(tag) && element.children.length) throw new Error(`SVG ${tag} must contain only text`);
      if (element.hasAttribute('id')) {
        const id = element.getAttribute('id');
        if (!id || ids.has(id)) throw new Error('SVG ids must be nonempty and unique');
        ids.add(id);
      }
      const values = [];
      for (const attribute of element.attributes) {
        const key = attribute.localName.toLowerCase(), value = attribute.value.trim();
        if (key.startsWith('on')) throw new Error('SVG event attributes are prohibited');
        if (attribute.namespaceURI === 'http://www.w3.org/XML/1998/namespace' && key === 'base') throw new Error('SVG xml:base is prohibited');
        if (key === 'href' || key === 'src') {
          if (!value.startsWith('#') || value.length === 1) throw new Error('Non-local SVG references are prohibited');
          references.push(value.slice(1));
        }
        // CSS presentation attributes (e.g. fill) can escape keywords too.
        if (value.includes('\\')) throw new Error('Escaped SVG attributes are outside the supported static policy');
        values.push(value);
      }
      if (tag === 'style') {
        if (element.textContent.includes('\\')) throw new Error('Escaped SVG CSS is outside the supported static policy');
        values.push(element.textContent);
      }
      for (const raw of values) {
        const value = raw.replace(/\/\*[\s\S]*?\*\//g, '');
        if (/@import\b|@(?:-\w+-)?keyframes\b|(?:animation|transition)(?:-\w+)?\s*:|expression\s*\(|javascript\s*:/i.test(value)) throw new Error('Unsafe or dynamic SVG style');
        for (const match of value.matchAll(/url\s*\(([^)]*)\)/gi)) {
          const reference = match[1].trim().replace(/^['"]|['"]$/g, '');
          if (!reference.startsWith('#') || reference.length === 1) throw new Error('Non-local SVG URL references are prohibited');
          references.push(reference.slice(1));
        }
      }
    }
    if (references.some(id => !ids.has(id))) throw new Error('SVG fragment reference has no matching id');
    return {W, H, svg:new XMLSerializer().serializeToString(root)};
  }, source);
}

export async function measureLayout(page, W, H) {
  const checks = await page.evaluate(({W,H}) => {
    const raw = document.querySelector('#layout-metadata')?.textContent;
    const bounds = raw ? JSON.parse(raw).bounds : [];
    if (!Array.isArray(bounds)) throw new Error('layout-metadata.bounds must be an array');
    const texts = [...document.querySelectorAll('text')].map(el => {
      const r=el.getBoundingClientRect();return {id:el.id,text:el.textContent,x:r.x,y:r.y,w:r.width,h:r.height};
    });
    const outside=texts.filter(t=>t.x<0 || t.y<0 || t.x+t.w>W || t.y+t.h>H);
    const collisions=[];
    for(let i=0;i<texts.length;i++)for(let j=i+1;j<texts.length;j++){
      const a=texts[i],b=texts[j];
      if(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>2 && Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>2)collisions.push([a.id,b.id]);
    }
    const overflow=[];
    for(const {id,box:[x,y,w,h]} of bounds){
      const t=texts.find(t=>t.id===id);
      if(!t || t.x<x+3 || t.y<y+2 || t.x+t.w>x+w-3 || t.y+t.h>y+h-2)overflow.push(t||{id,missing:true});
    }
    const ids=[...document.querySelectorAll('[id]')].map(el=>el.id);
    return {textCount:texts.length,outside,collisions,overflow,containerBoundsChecked:bounds.length>0,
      uniqueIds:ids.length===new Set(ids).size,vectorOnly:!document.querySelector('image,foreignObject,script'),
      notChecked:['flow-line-text-intersections','semantic-relations','visual-quality','complete-security-certification'],
      warnings:bounds.length ? [] : ['Container overflow was not checked: include non-empty layout-metadata.bounds.']};
  }, {W,H});
  const basicPassed=!checks.outside.length&&!checks.collisions.length&&!checks.overflow.length&&checks.uniqueIds&&checks.vectorOnly;
  return {...checks, passed:basicPassed ? (checks.containerBoundsChecked ? true : null) : false,
    inputPolicy:'restricted-static-local-svg'};
}

async function main() {
  const [input, output, ...options] = process.argv.slice(2);
  const option = name => {
    const value = options[options.indexOf(name) + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${name}`);
    return value;
  };
  if (!input || !output || !options.includes('--playwright')) throw new Error('Usage: node preview.mjs input.svg output.png --playwright module/path [--browser executable]');
  for (const destination of [output, `${output}.checks.json`]) {
    try { await fs.access(destination); throw new Error('Output already exists; choose a new path'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if ((await fs.stat(input)).size > 2 * 1024 * 1024) throw new Error('SVG input exceeds policy size limit');
  const source = await fs.readFile(input, 'utf8');
  if (/<!\s*(DOCTYPE|ENTITY)\b/i.test(source)) throw new Error('SVG DTD/entity declarations are prohibited');
  const {chromium} = await import(pathToFileURL(path.resolve(option('--playwright'))).href);
  const browser = await chromium.launch({headless:true, ...(options.includes('--browser') ? {executablePath:option('--browser')} : {})});
  try {
    const page = await protectedPage(browser);
    const {W, H, svg} = await validateSvg(page, source);
    await page.setViewportSize({width:Math.ceil(W),height:Math.ceil(H)});
    await page.setContent(previewDocument(svg));
    await page.evaluate(() => document.fonts.ready);
    const checks = await measureLayout(page, W, H);
    await fs.mkdir(path.dirname(path.resolve(output)),{recursive:true});
    await page.screenshot({path:output});
    await fs.writeFile(`${output}.checks.json`,JSON.stringify(checks,null,2));
    console.log(JSON.stringify(checks));
    if(checks.passed===false)process.exitCode=1;
  } finally {await browser.close();}
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main().catch(error => { console.error(error.message); process.exitCode=1; });
}
