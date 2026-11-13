import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {deriveContent, validateContent, selectItems, selectionSummary, overlaps} from '../../assets/frontend-system/model.mjs';
import {prepareBuild, writeKit} from '../../scripts/frontend-system.mjs';

const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const examples = path.join(skill,'assets/frontend-system/examples');
const specimen = JSON.parse(await fs.readFile(path.join(examples,'tidemark.json'),'utf8'));
const signal = JSON.parse(await fs.readFile(path.join(examples,'night-signal.json'),'utf8'));
const clone = value => structuredClone(value);
const changed = (base, modify) => {const value=clone(base);modify(value);return value;};
const outputRoot = process.env.MFS_TEST_OUTPUT || path.join(os.tmpdir(),'musedraw-frontend-system-tests');
await fs.mkdir(outputRoot,{recursive:true});
const output = await fs.mkdtemp(path.join(outputRoot, 'model-'));

test('content derives taxonomy, year range, day bands and image framing without mutation', () => {
  const original = JSON.stringify(specimen), d=deriveContent(specimen), s=deriveContent(signal);
  assert.deepEqual(d.yearRange,[2023,2026]); assert.equal(d.count,5);assert.deepEqual(d.groups.map(g=>g.count),[2,2,1]);
  assert.equal(d.imageFrame,'panorama');assert.equal(s.groups.length,2);assert.deepEqual(s.groups.map(g=>g.count),[3,2]);
  assert.equal(JSON.stringify(specimen),original);
});
test('long CJK content changes title scale; density derives from actual item count', () => {
  const c=changed(specimen,c=>{c.page.title='把一段漫长而具体的近岸观察记录保留下来，让每一种尚未被概括的材料、声音与潮汐线索都能继续被看见和阅读，并在下一次访问时重新讨论';c.items=Array.from({length:24},(_,i)=>({...c.items[i%5],id:`X-${i}`}));c.image.width=400;c.image.height=700;});
  const d=deriveContent(c);assert.equal(d.titleMode,'extended');assert.equal(d.density,'dense');assert.equal(d.imageFrame,'portrait');assert.equal(d.count,24);
});
test('Unicode search, combined filters and saved-only scope keep exact supplied IDs', () => {
  assert.deepEqual(selectItems(specimen,{query:'ＴＭ－２５－０３'}).map(x=>x.id),['TM-25-03']);
  assert.equal(selectItems(specimen,{query:'shore-not-a-match'}).length,0);
  assert.deepEqual(selectItems(specimen,{category:'Field tools',savedOnly:true,saved:['TM-23-02','unknown']}).map(x=>x.id),['TM-23-02']);
});
test('selection removes stale/duplicate IDs and reports supplied time overlaps only', () => {
  const summary=selectionSummary(signal,['NS-01','NS-02','NS-01','missing']);
  assert.deepEqual(summary.ids,['NS-01','NS-02']);assert.deepEqual(summary.conflicts,[['NS-01','NS-02']]);
  assert.equal(overlaps(signal.items[0],{...signal.items[1],start:'19:10'}),false);
  assert.equal(overlaps(signal.items[0],{...signal.items[1],date:'2026-12-05'}),false);
});
for (const [name,base,modify,pattern] of [
  ['unbounded item count',specimen,c=>{c.items=Array.from({length:25},(_,i)=>({...c.items[0],id:`X${i}`}));},/1–24/],
  ['duplicate item identity',specimen,c=>{c.items[1].id=c.items[0].id;},/unique/],
  ['unsupported dashboard',specimen,c=>{c.system='dashboard';},/outside scope/],
  ['prototype name is not a system',specimen,c=>{c.system='__proto__';},/outside scope/],
  ['arbitrary sections',specimen,c=>{c.sections=[];},/unsupported field/],
  ['booking logic in content',signal,c=>{c.items[0].capacity=20;},/unsupported field/],
  ['missing provenance',specimen,c=>{delete c.items[0].source;},/source/],
  ['more than six categories',specimen,c=>{c.items=Array.from({length:7},(_,i)=>({...c.items[0],id:`X${i}`,category:`Subject ${i}`}));},/6 supplied categories/],
  ['signal without subject image',signal,c=>{delete c.image;},/needs a subject image/],
  ['impossible date',signal,c=>{c.items[0].date='2026-02-30';},/real YYYY-MM-DD/],
  ['invalid clock',signal,c=>{c.items[0].start='25:00';},/24-hour/],
  ['overnight event',signal,c=>{c.items[0].start='23:00';c.items[0].end='01:00';},/overnight/],
  ['eight civil days',signal,c=>{c.items=Array.from({length:8},(_,i)=>({...c.items[0],id:`X${i}`,date:`2026-12-${String(i+1).padStart(2,'0')}`}));},/7 civil days/],
  ['remote media',signal,c=>{c.image.src='https://example.test/asset.svg';},/local relative/],
  ['parent media traversal',signal,c=>{c.image.src='../asset.svg';},/parent traversal/],
  ['excessive headline',specimen,c=>{c.page.title='X'.repeat(181);},/at most 180/]
]) test(`rejects ${name} without silently dropping facts`,()=>assert.throws(()=>validateContent(changed(base,modify)),pattern));

test('build preserves exact structured source and image bytes, and refuses existing outputs',async()=>{
  const prepared=await prepareBuild(path.join(examples,'tidemark.json')), out=path.join(output,'roundtrip');
  await writeKit({out,system:'specimen',prepared});
  assert.deepEqual(await fs.readFile(path.join(out,'source.json')),await fs.readFile(path.join(examples,'tidemark.json')));
  assert.deepEqual(await fs.readFile(path.join(out,'media/subject.svg')),await fs.readFile(path.join(examples,'shore-study.svg')));
  const manifest=JSON.parse(await fs.readFile(path.join(out,'manifest.json'),'utf8'));assert.equal(manifest.experimental,true);assert.equal(manifest.derived.count,5);
  assert.ok((await fs.readFile(path.join(out,'index.html'),'utf8')).includes('frontend-content'));
  await assert.rejects(writeKit({out,system:'specimen',prepared}),/already exists/);
  assert.deepEqual(await fs.readFile(path.join(out,'source.json')),prepared.sourceBytes);
});
test('install copies only scoped integration assets and the chosen system',async()=>{
  const out=path.join(output,'install'); await writeKit({out,system:'signal'});
  assert.deepEqual((await fs.readdir(out)).sort(),['README.txt','base.css','browser.mjs','model.mjs','signal.css']);
});
test('active or externally loaded SVG is refused before an output directory is created',async()=>{
  const source=path.join(output,'untrusted');await fs.mkdir(source);
  const c=changed(signal,c=>{c.image.src='active.svg';});
  await fs.writeFile(path.join(source,'content.json'),JSON.stringify(c));
  for (const markup of ['<svg><script>alert(1)</script></svg>','<svg><image href="https://example.test/photo.png"/></svg>','<svg onload="alert(1)"/>',`<svg><rect fill="url('https://example.test/paint.svg#paint')"/></svg>`,`<svg><rect fill='url("data:image/svg+xml,external")'/></svg>`,'<svg><rect fill="url(https://example.test/paint.svg#paint)"/></svg>']) {
    await fs.writeFile(path.join(source,'active.svg'),markup);
    await assert.rejects(prepareBuild(path.join(source,'content.json')),/passive/);
  }
});

test('build accepts quoted and unquoted local SVG paint fragments and preserves their bytes',async()=>{
  const source=path.join(output,'local-fragments');await fs.mkdir(source);
  const c=changed(signal,c=>{c.image.src='local.svg';});
  const input=path.join(source,'content.json');await fs.writeFile(input,JSON.stringify(c));
  const fills=[`fill="url(#paint)"`,`fill="url('#paint')"`,`fill='url("#paint")'`,`fill="url( #paint )"`];
  for (const [index,fill] of fills.entries()) {
    const markup=`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><defs><linearGradient id="paint"><stop stop-color="#234"/><stop offset="1" stop-color="#fa5"/></linearGradient></defs><rect width="160" height="160" ${fill}/></svg>`;
    await fs.writeFile(path.join(source,'local.svg'),markup);
    const out=path.join(output,`fragment-build-${index}`);
    await writeKit({out,system:'signal',prepared:await prepareBuild(input)});
    assert.equal(await fs.readFile(path.join(out,'media/subject.svg'),'utf8'),markup);
  }
});
