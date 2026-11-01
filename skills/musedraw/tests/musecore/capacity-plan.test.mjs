import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {capacityPlanModel} from '../../scripts/musecore/capacity-plan-models.mjs';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const source=JSON.parse(await fs.readFile(new URL('../../assets/musecore/capacity-plan-demo.json',import.meta.url),'utf8'));
const clone=()=>structuredClone(source);

test('capacity plan computes gap and explicit state per stream-period cell',()=>{
 const m=capacityPlanModel(source);assert.equal(m.streams.length,3);assert.equal(m.periods.length,4);
 const values=m.streams.flatMap(s=>s.values);assert.equal(values.filter(v=>v.state==='over').length,4);assert.equal(values.filter(v=>v.state==='balanced').length,1);assert.equal(values[0].gap,8);assert.equal(values[4].state,'over');
});

test('capacity plan rejects unsupported, mismatched and unsafe inputs',()=>{
 for(const [mutate,pattern] of [
  [x=>x.periods.push({id:'p5',label:'第5周'}),/values must match periods/],
  [x=>x.streams[0].values[0].demand=-1,/0..1000000/],
  [x=>x.streams[0].values[0].capacity=1000001,/0..1000000/],
  [x=>x.streams[0].id=x.streams[1].id,/duplicate stream id/],
  [x=>x.streams[0].values[0].note='x'.repeat(46),/exceeds 45/],
  [x=>x.periods=Array.from({length:9},(_,i)=>({id:'p'+i,label:'周期'+i})),/periods requires 2–8/]
 ]){const bad=clone();mutate(bad);assert.throws(()=>capacityPlanModel(bad),pattern)}
});

test('capacity plan renders SVG/PNG at desktop, narrow viewports and CJK ascent pressure',{timeout:120000},async()=>{
 const html=await editorHtml(source),{pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{const page=await browser.newPage({viewport:{width:1800,height:1800}});await page.setContent(html);await page.waitForFunction(()=>window.MUSECORE_READY===true);
  const initial=await page.evaluate(()=>window.MUSECORE_RESULT);assert.equal(initial.error,undefined);assert.deepEqual(initial.findings,[]);assert.equal(initial.geometry.family,'capacity-plan');assert.equal(initial.geometry.cells.length,12);
  for(const width of [390,1024,1440]){await page.setViewportSize({width,height:1800});await page.waitForTimeout(20);const r=await page.evaluate(()=>({overflow:document.body.scrollWidth-document.documentElement.clientWidth,error:document.querySelector('#error')?.textContent,viewBox:document.querySelector('#output svg')?.getAttribute('viewBox')}));assert(r.overflow<=1,`horizontal overflow ${width}`);assert.equal(r.error,'');assert.match(r.viewBox,/^0 0 1900 /)}
  const tall=await page.evaluate(()=>{const old=CanvasRenderingContext2D.prototype.measureText;CanvasRenderingContext2D.prototype.measureText=function(value){const m=old.call(this,value);return new Proxy(m,{get(target,key){return key==='fontBoundingBoxAscent'?(target.fontBoundingBoxAscent??0)+42:Reflect.get(target,key,target)}})};try{const svg=MuseCore.render(JSON.parse(document.querySelector('#input').value));document.querySelector('#output').replaceChildren(svg);return MuseCore.audit(svg)}finally{CanvasRenderingContext2D.prototype.measureText=old}});assert.deepEqual(tall.findings,[]);assert(tall.geometry.height>=initial.geometry.height);
  const rendered=await page.locator('#output svg').evaluate(svg=>({cells:[...svg.querySelectorAll('[data-capacity-cell]')].map(g=>g.dataset.capacityCell),rails:svg.querySelectorAll('[data-role="capacity-rail"]').length,demands:svg.querySelectorAll('[data-role="demand-mark"]').length}));assert.equal(rendered.cells.length,12);assert.equal(rendered.rails,12);assert.equal(rendered.demands,12);
  await page.close();
 }finally{await browser.close()}
});

