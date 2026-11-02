import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import demo from '../../assets/musecore/rank-shift-demo.json' with {type:'json'};
import {rankShiftModel} from '../../scripts/musecore/rank-shift-models.mjs';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const clone=o=>structuredClone(o);

test('rank model keeps supplied ranks and derives movement only from rank numbers',()=>{
 const m=rankShiftModel(demo);assert.deepEqual(m.items.map(x=>x.direction),['up','up','down','down','same']);assert.deepEqual(m.items.map(x=>x.change),[3,1,-3,-1,0]);assert.deepEqual(m.counts,{up:2,down:2,same:1});assert.deepEqual(m.sourceTraceability.map(x=>x.id),demo.items.map(x=>x.id));assert.deepEqual(demo,clone(demo));
});

test('production renders SVG at 390/1024/1440 widths and under font pressure',{timeout:240000},async()=>{
 const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{for(const width of [390,1024,1440])for(const pressure of [0,40]){const page=await browser.newPage({viewport:{width,height:1800}});await page.route(/^https?:\/\//,r=>r.abort());await page.setContent(await editorHtml(demo));await page.waitForFunction(()=>window.MUSECORE_READY===true);const got=await page.evaluate(({input,pressure})=>{const old=CanvasRenderingContext2D.prototype.measureText;if(pressure)CanvasRenderingContext2D.prototype.measureText=function(t){const m=old.call(this,t);return new Proxy(m,{get(o,k){if(k==='width')return m.width+pressure;return Reflect.get(o,k,o)}})};try{const svg=MuseCore.render(input);document.getElementById('output').replaceChildren(svg);const a=MuseCore.audit(svg);return {findings:a.findings,text:svg.textContent,lines:svg.querySelectorAll('[data-rank-shift-line]').length,before:svg.querySelectorAll('[data-rank-shift-before]').length,after:svg.querySelectorAll('[data-rank-shift-after]').length,width:a.geometry.width,height:a.geometry.height}}finally{CanvasRenderingContext2D.prototype.measureText=old}},{input:demo,pressure});assert.deepEqual(got.findings,[],`width ${width} pressure ${pressure}`);assert.equal(got.lines,5);assert.equal(got.before,5);assert.equal(got.after,5);assert(!/NaN|Infinity|undefined/.test(got.text));assert.equal(got.width,1900);assert(got.height>900);await page.close();}}
 finally{await browser.close()}
});

test('rank model rejects ties, missing source, unsupported fields and out-of-range ranks',()=>{
 const cases=[
  [x=>x.items[1].afterRank=x.items[0].afterRank,/afterRank values must be unique/],
  [x=>x.items[0].source=undefined,/item.source/],
  [x=>x.items[0].beforeRank=0,/beforeRank/],
  [x=>x.periods=[x.periods[0]],/exactly two/],
  [x=>x.items=Array.from({length:13},(_,i)=>({id:'x'+i,label:'项'+i,beforeRank:i+1,afterRank:i+1,source:'行'})),/3–12/],
  [x=>x.extra='not allowed',/unsupported field/]
 ];for(const [edit,match] of cases){const b=clone(demo);edit(b);assert.throws(()=>rankShiftModel(b),match)}
});

test('demo is self-contained and contains no external references',async()=>{const raw=await fs.readFile(new URL('../../assets/musecore/rank-shift-demo.json',import.meta.url),'utf8');assert(!/https?:\/\//i.test(raw));assert(!/[A-Za-z]:[\\/]/i.test(raw));});
