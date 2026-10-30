// Run explicitly with the existing Playwright/Chromium. No installs or network.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const skill=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const load=async id=>JSON.parse(await fs.readFile(path.join(skill,'assets/musecore',id+'.json'),'utf8'));
const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({...resolveBrowser(pw),headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1200}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'musecore-browser-'));
const tests=[];
async function render(input){return page.evaluate(async input=>{try{const svg=MuseCore.render(input);document.getElementById('output').replaceChildren(svg);await document.fonts.ready;return {audit:MuseCore.audit(svg),text:svg.textContent,svg:svg.outerHTML}}catch(e){return {error:e.message}}},input)}
try{
  const flow=await load('flow');await page.setContent(await editorHtml(flow));await page.waitForFunction(()=>window.MUSECORE_READY===true);
  for(const id of ['layers','association','flow','assembly','lanes','schedule','report']){
    const result=await render(await load(id));assert.equal(result.error,undefined,id);assert.deepEqual(result.audit.findings,[],id);tests.push(id+' renders with measured geometry');
  }
  const independent=await render(flow);assert(!independent.audit.geometry.edges.some(e=>e.from.startsWith('check-')));tests.push('independent checks do not invent a sequence');
  const ordered=structuredClone(flow);ordered.checkLinks=[{from:'verify',to:'calculate'},{from:'calculate',to:'result'}];const linked=await render(ordered);assert.equal(linked.audit.geometry.edges.filter(e=>e.from.startsWith('check-')).length,2);assert.deepEqual(linked.audit.findings,[]);tests.push('only explicit checkLinks add checking arrows');
  const noReturn=structuredClone(flow);delete noReturn.decision;delete noReturn.checks;const plain=await render(noReturn);assert.equal(plain.audit.geometry.decision,undefined);assert(plain.audit.geometry.height<independent.audit.geometry.height);tests.push('removed decision removes branch and height');
  const duplicate=structuredClone(flow);duplicate.checks.push(duplicate.checks[0]);assert.match((await render(duplicate)).error,/duplicate/);tests.push('duplicate checking associations rejected');
  const nonlocal=await load('layers');nonlocal.links[0]={from:'data',to:'service'};assert.match((await render(nonlocal)).error,/neighbouring/);tests.push('nonlocal layer relation rejected without losing content');
  const schedule=await load('schedule');schedule.groups[0].tasks[0].end=20;assert.match((await render(schedule)).error,/invalid interval/);tests.push('out-of-range time rejected');
  const report=await load('report');report.sections[0].content=await load('report');assert.match((await render(report)).error,/nested/);tests.push('nested report rejected');
  const assembly=await load('assembly');delete assembly.review;const withoutReview=await render(assembly);assert.equal(withoutReview.error,undefined);assert(!withoutReview.audit.geometry.edges.some(e=>e.from==='review'||e.to==='review'));assert.deepEqual(withoutReview.audit.findings,[]);tests.push('assembly without review has no invented revision loop');
  const literal=await load('lanes');literal.stages=literal.stages.slice(0,2);literal.nodes=literal.nodes.filter(n=>literal.stages.some(s=>s.id===n.stage));const literalIds=new Set(literal.nodes.map(n=>n.id));literal.links=literal.links.filter(e=>literalIds.has(e.from)&&literalIds.has(e.to));literal.nodes[0].lines=['</script><script>window.UNEXPECTED=1</script>'];
  await page.setContent(await editorHtml(literal));await page.waitForFunction(()=>window.MUSECORE_READY===true);assert.equal(await page.evaluate(()=>window.UNEXPECTED),undefined);assert.equal(await page.locator('#output svg').count(),1,await page.locator('#error').innerText());assert((await page.locator('#output svg').textContent()).includes('</script>'));tests.push('input stays literal text in offline HTML');
  await page.click('summary');await page.locator('#input').fill('{');await page.click('#generate');await page.waitForFunction(()=>window.MUSECORE_READY===true);assert.equal(await page.locator('#output svg').count(),0);assert((await page.locator('#error').innerText()).length>0);tests.push('invalid editor content clears stale drawing');
  await page.setContent(await editorHtml(flow));await page.waitForFunction(()=>window.MUSECORE_READY===true);
  const download=page.waitForEvent('download');await page.click('#download');await (await download).saveAs(path.join(tmp,'download.svg'));assert((await fs.readFile(path.join(tmp,'download.svg'),'utf8')).includes('条件是否满足'));tests.push('offline SVG download works');
  const inputPath=path.join(tmp,'input.json');await fs.writeFile(inputPath,JSON.stringify(flow));
  const alias=spawnSync(process.execPath,[path.join(skill,'scripts/musecore.mjs'),'render',inputPath,'--out',tmp],{encoding:'utf8'});assert.equal(alias.status,1);assert.match(alias.stderr,/overwrite source/);tests.push('CLI refuses its source as output');
  const example=spawnSync(process.execPath,[path.join(skill,'scripts/musecore.mjs'),'example','flow','--out',inputPath],{encoding:'utf8'});assert.equal(example.status,1);assert.equal(JSON.parse(await fs.readFile(inputPath,'utf8')).family,'flow');tests.push('example refuses an existing input');
  const badPath=path.join(tmp,'bad.json'),out=path.join(tmp,'accepted');await fs.mkdir(out);await fs.writeFile(path.join(out,'diagram.svg'),'accepted');await fs.writeFile(badPath,JSON.stringify(schedule));
  const refused=spawnSync(process.execPath,[path.join(skill,'scripts/musecore.mjs'),'render',badPath,'--out',out],{encoding:'utf8'});assert.equal(refused.status,1);assert.match(refused.stderr,/invalid interval/);assert.equal(await fs.readFile(path.join(out,'diagram.svg'),'utf8'),'accepted');tests.push('failed render preserves the accepted output');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:tests.length,tests,pageErrors:errors},null,2));
}finally{await browser.close();await fs.rm(tmp,{recursive:true,force:true})}
