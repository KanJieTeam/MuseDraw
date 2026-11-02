import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import demo from '../../assets/musecore/pareto-analysis-demo.json' with {type:'json'};
import {paretoAnalysisModel} from '../../scripts/musecore/pareto-models.mjs';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const clone=o=>structuredClone(o);

test('pareto model keeps source rows and calculates cumulative shares exactly',()=>{
 const m=paretoAnalysisModel(demo);assert.equal(m.total,88);assert.deepEqual(m.items.map(x=>x.cumulative),[28/88,49/88,65/88,76/88,83/88,1]);assert.equal(m.crossing,3);assert.deepEqual(m.sourceTraceability.map(x=>x.id),demo.items.map(x=>x.id));assert.deepEqual(demo,clone(demo));
});

test('production renders actual SVG at 390/1024/1440 widths and under font pressure',{timeout:240000},async()=>{
 const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{for(const width of [390,1024,1440])for(const pressure of [0,40]){const page=await browser.newPage({viewport:{width,height:1800}});await page.route(/^https?:\/\//,r=>r.abort());await page.setContent(await editorHtml(demo));await page.waitForFunction(()=>window.MUSECORE_READY===true);const got=await page.evaluate(({input,pressure})=>{const old=CanvasRenderingContext2D.prototype.measureText;if(pressure)CanvasRenderingContext2D.prototype.measureText=function(t){const m=old.call(this,t);return new Proxy(m,{get(o,k){if(k==='width')return m.width+pressure;return Reflect.get(o,k,o)}})};try{const svg=MuseCore.render(input);document.getElementById('output').replaceChildren(svg);const a=MuseCore.audit(svg);return {findings:a.findings,text:svg.textContent,bars:svg.querySelectorAll('[data-pareto-bar]').length,points:svg.querySelectorAll('[data-pareto-point]').length,target:svg.querySelectorAll('[data-pareto-target]').length,height:a.geometry.height,width:a.geometry.width}}finally{CanvasRenderingContext2D.prototype.measureText=old}},{input:demo,pressure});assert.deepEqual(got.findings,[],`width ${width} pressure ${pressure}`);assert.equal(got.bars,6);assert.equal(got.points,6);assert.equal(got.target,1);assert(!/NaN|Infinity|undefined/.test(got.text));assert(got.width===1900&&got.height>900);await page.close();}}
 finally{await browser.close()}
});

test('pareto refuses negative, zero-total, duplicate, unsupported, missing-source and out-of-range inputs',()=>{
 const cases=[
  [x=>x.items[0].value=-1,/item.value/],
  [x=>x.items=x.items.map(i=>({...i,value:0})),/positive total/],
  [x=>x.items[1].id=x.items[0].id,/duplicate item id/],
  [x=>x.items[0].source=undefined,/item.source/],
  [x=>x.targetShare=1,/targetShare/],
  [x=>x.items=Array.from({length:17},(_,i)=>({id:'x'+i,label:'项'+i,value:1,source:'行'})),/3–16/],
  [x=>x.extra='not allowed',/unsupported field/]
 ];for(const [edit,match] of cases){const b=clone(demo);edit(b);assert.throws(()=>paretoAnalysisModel(b),match)}
});

test('demo is self-contained and contains no external references',async()=>{const raw=await fs.readFile(new URL('../../assets/musecore/pareto-analysis-demo.json',import.meta.url),'utf8');assert(!/https?:\/\//i.test(raw));assert(!/[A-Za-z]:[\\/]/i.test(raw));});
