#!/usr/bin/env node
// Original bounded frontend composition kit. No installs, network or model calls.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {SYSTEMS, deriveContent} from '../assets/frontend-system/model.mjs';

const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(skill, 'assets/frontend-system');
const help = `Experimental MuseDraw frontend systems (version 1)
  node <skill>/scripts/frontend-system.mjs list
  node <skill>/scripts/frontend-system.mjs validate --input content.json
  node <skill>/scripts/frontend-system.mjs build --input content.json --out NEW_DIRECTORY
  node <skill>/scripts/frontend-system.mjs install --system specimen|signal --out NEW_DIRECTORY
Build creates an editable offline demonstration from structured local content.
Install copies scoped assets for integration into a dedicated existing-app root.
Neither command overwrites a directory. These systems are not a general website generator.`;

export async function prepareBuild(input) {
  const sourceBytes = await fs.readFile(input);
  const content = JSON.parse(sourceBytes.toString('utf8').replace(/^\uFEFF/, ''));
  const derived = deriveContent(content), imageFiles = [];
  if (content.image) {
    const sourceRoot = await fs.realpath(path.dirname(input));
    const file = await fs.realpath(path.resolve(path.dirname(input), content.image.src));
    if (!file.startsWith(sourceRoot + path.sep)) throw new Error('image.src resolves outside its input directory (including symlinks)');
    const bytes = await fs.readFile(file);
    if (bytes.length > 16 * 1024 * 1024) throw new Error('image.src exceeds the 16 MiB local asset limit');
    if (path.extname(file).toLowerCase() === '.svg') {
      const svg = bytes.toString('utf8');
      // Extract a whole URL target before checking it. An optional-quote
      // lookahead can backtrack and mistake url('#paint') for an external URL.
      const urls = [...svg.matchAll(/\burl\s*\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi)];
      const invalidUrl = urls.length !== (svg.match(/\burl\s*\(/gi) || []).length || urls.some(match => !/^#[^\s"'()]+$/.test((match[1] ?? match[2] ?? match[3]).trim()));
      if (!/<svg\b/i.test(svg) || invalidUrl || /<(?:script|foreignObject|iframe|object|embed)\b|\bon[a-z]+\s*=|(?:href|src)\s*=\s*["']\s*(?!#)[^"']+|<!ENTITY|<!DOCTYPE|@import/i.test(svg)) throw new Error('image.src SVG must be passive, self-contained geometry/text; scripts, events, external references and embedded documents are unsupported');
    }
    const name = `media/subject${path.extname(file).toLowerCase()}`;
    imageFiles.push({name, bytes}); content.image.src = name;
  }
  return {content, derived, imageFiles, sourceBytes};
}

export async function writeKit({out, system, prepared}) {
  if (!Object.hasOwn(SYSTEMS, system)) throw new Error('Choose specimen or signal');
  const files = new Map();
  for (const name of ['base.css', `${system}.css`, 'model.mjs', 'browser.mjs']) files.set(name, await fs.readFile(path.join(assets, name)));
  files.set('README.txt', `Experimental MuseDraw ${system} system, version 1.\nTask: ${SYSTEMS[system].task}.\n\nExisting app: link base.css and ${system}.css, then import {mountFrontendSystem} from './browser.mjs'.\nCall mountFrontendSystem(dedicatedRoot, validatedContent, {onSelectionChange, storage, storageKey}).\nOnly that root is rendered. It emits mfs:selection-change with IDs and explicit time conflicts.\nThe return value has derived, getSelection(), setSelection(ids), destroy().\nThe host retains routing, authentication, backend, business rules and real submissions.\nDo not remount your whole app to apply this kit; use the CSS roles or a dedicated content root.\nUse a local HTTP server for ES module integration. A built demo also opens directly as index.html.\n\nScope: 1–24 catalogue records or 1–24 timed same-day sessions over at most 7 civil days; at most 6 categories.\nNo checkout, booking, inventory mutation, arbitrary sections, geographic maps, charts, timezone conversion or long-form publishing.\nType uses installed system stacks; no remote fonts. Browser checks establish function/layout, not aesthetic approval.\nSee the installed Skill reference references/frontend-system.md for schema and actual commands.\n`);
  if (prepared) {
    const {content, derived, imageFiles, sourceBytes} = prepared;
    const model = files.get('model.mjs').toString().replace(/^export /gm, '');
    const browser = files.get('browser.mjs').toString().replace(/^import .* from '\.\/model\.mjs';\r?\n/, '').replace(/^export /gm, '');
    files.set('browser.js', `// Local classic-script bundle of the adjacent editable modules.\n(()=>{\n${model}\n${browser}\nwindow.MuseFrontendSystem={mountFrontendSystem};\n})();\n`);
    const json = JSON.stringify(content).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
    const title = content.page.title.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    files.set('index.html', `<!doctype html>\n<html lang="${content.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><link rel="stylesheet" href="base.css"><link rel="stylesheet" href="${system}.css"><style>body{margin:0}</style></head><body><div id="frontend-system"></div><script type="application/json" id="frontend-content">${json}</script><script src="browser.js"></script><script>window.frontendSystem=MuseFrontendSystem.mountFrontendSystem(document.getElementById('frontend-system'),JSON.parse(document.getElementById('frontend-content').textContent));</script></body></html>\n`);
    files.set('source.json', sourceBytes);
    files.set('content.json', JSON.stringify(content, null, 2)+'\n');
    files.set('manifest.json', JSON.stringify({version:1, experimental:true, system, sourceSha256:createHash('sha256').update(sourceBytes).digest('hex'), derived, scope:SYSTEMS[system].task, limits:'A bounded local demonstration, not a backend or aesthetic approval. Source facts are preserved in source.json; image references in content.json are relocated locally.'},null,2)+'\n');
    for (const {name,bytes} of imageFiles) files.set(name,bytes);
  }
  // Resolve/read/validate everything first. A new output is required, even if empty.
  try { await fs.lstat(out); throw new Error('Output already exists; nothing was overwritten. Choose a new directory.'); } catch(error) {if (error.code !== 'ENOENT') throw error;}
  const relative = path.relative(assets, out);
  if (!relative || (!relative.startsWith('..'+path.sep) && relative !== '..' && !path.isAbsolute(relative))) throw new Error('Keep generated work outside the installed assets directory');
  await fs.mkdir(path.dirname(out), {recursive:true}); await fs.mkdir(out);
  for (const [name,bytes] of files) {await fs.mkdir(path.dirname(path.join(out,name)),{recursive:true}); await fs.writeFile(path.join(out,name),bytes,{flag:'wx'});}
  return {system, output:out, files:[...files.keys()], experimental:true, derived:prepared?.derived};
}

export async function main(args = process.argv.slice(2)) {
  if (!args.length || args.includes('--help')) {console.log(help); return;}
  const [command,...rest] = args;
  if (command === 'list') {if(rest.length) throw new Error('list takes no arguments'); console.log(JSON.stringify({experimental:true, systems:SYSTEMS},null,2)); return;}
  if (!['validate','build','install'].includes(command)) throw new Error(help);
  const allowed = command === 'install' ? ['--system','--out'] : command === 'validate' ? ['--input'] : ['--input','--out'];
  const options = {};
  for (let i=0;i<rest.length;i++) {const key=rest[i]; if (!allowed.includes(key) || !rest[i+1] || rest[i+1].startsWith('--') || options[key]) throw new Error(`Invalid/repeated option ${key}\n${help}`); options[key]=rest[++i];}
  for (const key of allowed) if (!options[key]) throw new Error(`Missing ${key}\n${help}`);
  if (command === 'install') console.log(JSON.stringify(await writeKit({out:path.resolve(options['--out']),system:options['--system']}),null,2));
  else {
    const prepared = await prepareBuild(path.resolve(options['--input']));
    if (command === 'validate') console.log(JSON.stringify({valid:true,experimental:true,derived:prepared.derived},null,2));
    else console.log(JSON.stringify(await writeKit({out:path.resolve(options['--out']),system:prepared.content.system,prepared}),null,2));
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => {console.error(error.message);process.exitCode=1;});
