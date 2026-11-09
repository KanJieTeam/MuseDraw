import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';
import {composeRepresentation} from '../../scripts/engine/representation-view.mjs';
import {render} from '../../scripts/engine/render.mjs';
import {loadTheme} from '../../scripts/musedraw.mjs';
import {lintRepresentation} from '../../scripts/representation-lint.mjs';

const run=promisify(execFile),skill=fileURLToPath(new URL('../../',import.meta.url));

test('representation composition is usable through the production CLI with strict preview checks',{timeout:120000},async()=>{
 const source=path.join(skill,'assets/starters/representation.json'),input=JSON.parse(await fs.readFile(source,'utf8'));
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'musedraw-representation-'));
 try{
  const {pw,modulePath}=await loadPlaywrightInfo(),browser=resolveBrowser(pw).executablePath;
  await run(process.execPath,[path.join(skill,'scripts/musedraw.mjs'),'compose',source,
   '--out',temporary,'--strict','--font-mode','system','--playwright',modulePath,'--browser',browser],{timeout:110000,windowsHide:true});
  const checks=JSON.parse(await fs.readFile(path.join(temporary,'checks.json'),'utf8'));
  assert.equal(checks.passed,true);
  assert.deepEqual(checks.warnings,[],'readability must pass the normal exporter, not a test-only font adapter');
  assert(checks.readability.smallestTextPx>=checks.readability.minimumPx);
  const scene=JSON.parse(await fs.readFile(path.join(temporary,'scene.json'),'utf8'));
  assert.equal(scene.meta.composition,'representation');
  assert.equal(scene.meta.representation,'array-reorder');
  assert.deepEqual(lintRepresentation(scene,{strict:true}),[],'production output passes the same strict representation contract');
  assert.deepEqual(scene.meta.arrayRepresentation.mapping.map(row=>row.id),input.target.order);
  for(const row of scene.meta.arrayRepresentation.mapping){
   const given=input.source.elements.find(element=>element.id===row.id);
   assert.equal(row.value,given.value);assert.equal(row.label,given.label);
  }
  const png=await fs.readFile(path.join(temporary,'diagram@2x.png'));
  assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert((await fs.stat(path.join(temporary,'diagram.svg'))).size>0);
  assert((await fs.stat(path.join(temporary,'preview.jpg'))).size>0);
  assert.deepEqual(JSON.parse(await fs.readFile(source,'utf8')),input,'render preserves the source');
 }finally{
  const absolute=path.resolve(temporary),tempRoot=path.resolve(os.tmpdir())+path.sep;
  assert(absolute.startsWith(tempRoot)&&path.basename(absolute).startsWith('musedraw-representation-'));
  await fs.rm(absolute,{recursive:true,force:true});
 }
});

test('array views can omit unrelated sheet reference labels without changing default themes',async()=>{
 const input=JSON.parse(await fs.readFile(path.join(skill,'assets/starters/representation.json'),'utf8')),
  scene=composeRepresentation(input),theme=await loadTheme('blueprint');
 const implicit=structuredClone(scene);delete implicit.style.canvas.frameLabels;
 const explicit=structuredClone(scene);explicit.style.canvas.frameLabels=true;
 const ordinary=render(implicit,theme);
 assert.equal(render(explicit,theme),ordinary,'ordinary sheet rendering retains its exact default output');
 const adapted=render(scene,theme);
 const background=svg=>svg.match(/<g id="background">([\s\S]*?)<\/g>/)[1];
 assert.equal((background(ordinary).match(/<text /g)??[]).length,14);
 assert.equal((background(adapted).match(/<text /g)??[]).length,0);
 assert.equal(background(adapted),background(ordinary).replace(/<text [\s\S]*?<\/text>/g,''),'sheet frame, ticks and texture remain');
 for(const text of scene.texts)assert(adapted.includes(text.text),'all content labels remain');
});
