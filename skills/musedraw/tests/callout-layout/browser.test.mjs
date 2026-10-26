import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createBrowserMeasurer} from '../../scripts/engine/callout-measure.mjs';
import {layoutCallouts,appendCallouts} from '../../scripts/engine/callout-layout.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const runtime=process.env.MUSEDRAW_PLAYWRIGHT;
const testOutput=path.join(root,'output/callout-layout-tests');
if(runtime) await fs.mkdir(testOutput,{recursive:true});
test('real browser glyph boxes, full strings and native coordinates satisfy lane constraints',{skip:!runtime},async()=>{
  const scene=JSON.parse(await fs.readFile(path.join(root,'tests/callout-layout/fixtures/instrument.scene.json'),'utf8'));
  const plan=JSON.parse(await fs.readFile(path.join(root,'tests/callout-layout/fixtures/instrument.plan.json'),'utf8'));
  plan.annotations=plan.annotations.slice(0,4);
  plan.annotations[0].text='中文标签 English طويل 한국어 e\u0301 👩‍🔬';
  plan.annotations[1].text='Supercalifragilisticexpialidocious';
  plan.annotations[2].text='  exact  spaces\nand a second line\n';
  const adapter=await createBrowserMeasurer({playwright:runtime,fontSize:plan.fontSize,fontFamily:plan.fontFamily,scene,annotations:plan.annotations});
  let browser;
  try {
    const result=await layoutCallouts(scene.size,plan,adapter.measure), extended=appendCallouts(scene,result);
    assert.ok(extended.nativeSvg.startsWith(scene.nativeSvg.slice(0,-6)));
    const {chromium}=await import(pathToFileURL(path.resolve(runtime)).href);browser=await chromium.launch({headless:true});
    const page=await browser.newPage();await page.setContent(extended.nativeSvg);await page.evaluate(()=>document.fonts.ready);
    const actual=await page.evaluate(()=>[...document.querySelectorAll('#callouts text')].map(el=>{const b=el.getBBox();return{id:el.id,text:el.textContent,x:b.x,y:b.y,w:b.width,h:b.height,fontSize:getComputedStyle(el).fontSize};}));
    for(const a of result.labels) {
      const r=result.regions[a.side];
      for(let i=0;i<a.lines.length;i++) {
        const box=actual.find(b=>b.id===`callout-text-${a.id}-${i}`);
        assert.equal(box.text,a.lines[i].text);assert.equal(box.fontSize,`${plan.fontSize}px`);
        if(box.w || box.h) {
          assert.ok(box.x>=r.x-.05 && box.x+box.w<=r.x+r.w+.05,JSON.stringify(box));
          assert.ok(box.y>=a.y-.05 && box.y+box.h<=a.y+a.h+.05,JSON.stringify(box));
        }
      }
      assert.equal(a.lines.map(l=>l.text+l.breakAfter).join(''),plan.annotations.find(p=>p.id===a.id).text);
    }
    for(let i=0;i<actual.length;i++) for(let j=i+1;j<actual.length;j++) {
      const a=actual[i],b=actual[j];
      assert.ok(a.w===0||b.w===0||a.x+a.w<=b.x+.05||b.x+b.w<=a.x+.05||a.y+a.h<=b.y+.05||b.y+b.h<=a.y+.05,`glyph boxes overlap: ${a.id}, ${b.id}`);
    }
    await fs.mkdir(path.join(testOutput,'browser-stress'),{recursive:true});
    await fs.writeFile(path.join(testOutput,'browser-stress/scene.json'),JSON.stringify(extended,null,2)+'\n');
    await fs.writeFile(path.join(testOutput,'browser-stress/report.json'),JSON.stringify({passed:true,measuredGlyphBoxes:actual,layout:result},null,2)+'\n');
  } finally {await adapter.close();await browser?.close();}
});
test('CLI capacity failure in a fresh directory returns nonzero and produces no scene',{skip:!runtime},async()=>{
  const regression=await fs.mkdtemp(path.join(testOutput,'cli-regression-')),output=path.join(regression,'capacity');
  const plan=JSON.parse(await fs.readFile(path.join(root,'tests/callout-layout/fixtures/instrument.plan.json'),'utf8'));
  plan.annotations=Array.from({length:25},(_,i)=>({id:`stress${i}`,text:'An intentionally overfull long annotation for capacity testing',anchor:[250,200+i],side:'left'}));
  const input=path.join(regression,'input.plan.json');await fs.writeFile(input,JSON.stringify(plan,null,2));
  const run=spawnSync(process.execPath,[path.join(root,'scripts/layout-callouts.mjs'),path.join(root,'tests/callout-layout/fixtures/instrument.scene.json'),input,'--out',output,'--playwright',runtime],{encoding:'utf8'});
  assert.equal(run.status,1);const report=JSON.parse(await fs.readFile(path.join(output,'report.json'),'utf8'));
  assert.equal(report.passed,false);assert.equal(report.code,'CAPACITY');assert.ok(report.details.required>report.details.available);
  await assert.rejects(fs.access(path.join(output,'scene.json')));
  await fs.writeFile(path.join(output,'stderr.txt'),run.stderr);
});
test('CLI protects source scene when source and output directory coincide',{skip:!runtime},async()=>{
  const output=await fs.mkdtemp(path.join(testOutput,'source-protection-'));
  const source=await fs.readFile(path.join(root,'tests/callout-layout/fixtures/instrument.scene.json'),'utf8');
  await fs.writeFile(path.join(output,'scene.json'),source);
  const run=spawnSync(process.execPath,[path.join(root,'scripts/layout-callouts.mjs'),path.join(output,'scene.json'),path.join(root,'tests/callout-layout/fixtures/instrument.plan.json'),'--out',output,'--playwright',runtime],{encoding:'utf8'});
  assert.equal(run.status,1);assert.equal(JSON.parse(run.stderr).code,'OUTPUT_EXISTS');
  assert.equal(await fs.readFile(path.join(output,'scene.json'),'utf8'),source);
  await assert.rejects(fs.access(path.join(output,'report.json')));
});
test('CLI preserves a previous successful output byte-for-byte when a later input is invalid',{skip:!runtime},async()=>{
  const regression=await fs.mkdtemp(path.join(testOutput,'success-protection-')),output=path.join(regression,'success');
  const cli=[path.join(root,'scripts/layout-callouts.mjs')],scene=path.join(root,'tests/callout-layout/fixtures/instrument.scene.json'),plan=path.join(root,'tests/callout-layout/fixtures/instrument.plan.json');
  const first=spawnSync(process.execPath,[...cli,scene,plan,'--out',output,'--playwright',runtime],{encoding:'utf8'});assert.equal(first.status,0,first.stderr);
  const before=await Promise.all(['scene.json','report.json'].map(f=>fs.readFile(path.join(output,f))));
  const second=spawnSync(process.execPath,[...cli,scene,path.join(regression,'missing-plan.json'),'--out',output,'--playwright',runtime],{encoding:'utf8'});
  assert.equal(second.status,1);assert.equal(JSON.parse(second.stderr).code,'OUTPUT_EXISTS');
  for(let i=0;i<2;i++) assert.deepEqual(await fs.readFile(path.join(output,['scene.json','report.json'][i])),before[i]);
});
test('CLI accepts a non-dot relative Playwright file path and UTF-8 BOM scene/plan',{skip:!runtime},async()=>{
  const fixture=await fs.mkdtemp(path.join(testOutput,'bom-relative-')),workspace=path.dirname(path.resolve(runtime));
  const relativeRuntime=path.relative(workspace,path.resolve(runtime)).replaceAll('\\','/');
  assert.ok(!relativeRuntime.startsWith('.'));
  const sceneFile=path.join(fixture,'source.scene.json'),planFile=path.join(fixture,'source.plan.json'),output=path.join(fixture,'result');
  await fs.writeFile(sceneFile,'\uFEFF'+await fs.readFile(path.join(root,'tests/callout-layout/fixtures/instrument.scene.json'),'utf8'));
  await fs.writeFile(planFile,'\uFEFF'+await fs.readFile(path.join(root,'tests/callout-layout/fixtures/instrument.plan.json'),'utf8'));
  const run=spawnSync(process.execPath,[path.join(root,'scripts/layout-callouts.mjs'),sceneFile,planFile,'--out',output,'--playwright',relativeRuntime],{encoding:'utf8',cwd:workspace});
  assert.equal(run.status,0,run.stderr);
  const report=JSON.parse(await fs.readFile(path.join(output,'report.json'),'utf8'));assert.equal(report.passed,true);assert.equal(report.labels.length,8);
});
test('ported CLI output renders through the existing engine to PNG and SVG',{skip:!runtime},async()=>{
  const fixture=await fs.mkdtemp(path.join(testOutput,'engine-render-')),output=path.join(fixture,'layout'),render=path.join(output,'render');
  const preprocess=spawnSync(process.execPath,[path.join(root,'scripts/layout-callouts.mjs'),path.join(root,'tests/callout-layout/fixtures/instrument.scene.json'),path.join(root,'tests/callout-layout/fixtures/instrument.plan.json'),'--out',output,'--playwright',runtime],{encoding:'utf8'});
  assert.equal(preprocess.status,0,preprocess.stderr);
  const run=spawnSync(process.execPath,[path.join(root,'scripts/musedraw.mjs'),'render',path.join(output,'scene.json'),'--out',render,'--playwright',runtime,'--strict'],{encoding:'utf8',cwd:root});
  assert.equal(run.status,0,run.stdout+'\n'+run.stderr);
  const checks=JSON.parse(await fs.readFile(path.join(render,'checks.json'),'utf8'));
  assert.equal(checks.passed,true);assert.ok(checks.texts>0);assert.deepEqual(checks.warnings,[]);
  const png=await fs.readFile(path.join(render,'diagram@2x.png'));assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.ok((await fs.stat(path.join(render,'diagram.svg'))).size>0);
  console.log(JSON.stringify({calloutEngineArtifacts:path.relative(root,render).replaceAll('\\','/'),checksPassed:checks.passed,formats:['png','svg']}));
});
