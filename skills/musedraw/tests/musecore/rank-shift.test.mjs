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

// Multi-content/font/viewport assertions live in scientific-scale-layout.test.mjs.
test('rank default production SVG retains the supplied objects',async()=>{
 const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{const page=await browser.newPage({viewport:{width:2400,height:1800}});await page.route(/^https?:\/\//,r=>r.abort());await page.setContent(await editorHtml(demo));await page.waitForFunction(()=>window.MUSECORE_READY===true);
  const result=await page.evaluate(()=>{const svg=document.querySelector('#output svg');return {findings:window.MUSECORE_RESULT.findings,lines:svg.querySelectorAll('[data-rank-shift-line]').length,before:svg.querySelectorAll('[data-rank-shift-before]').length,after:svg.querySelectorAll('[data-rank-shift-after]').length}});
  assert.deepEqual(result.findings,[]);assert.equal(result.lines,5);assert.equal(result.before,5);assert.equal(result.after,5);
 }finally{await browser.close()}
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
