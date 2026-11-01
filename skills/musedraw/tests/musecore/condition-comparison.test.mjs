import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {conditionComparisonModel} from '../../scripts/musecore/condition-comparison-models.mjs';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const source=JSON.parse(await fs.readFile(new URL('../../assets/musecore/condition-comparison-demo.json',import.meta.url),'utf8'));
const clone=()=>structuredClone(source);

test('condition comparison preserves one substrate, one scale, explicit states and source traceability',()=>{
 const m=conditionComparisonModel(source); assert.equal(m.baseline.substrateId,m.substrate.id); assert.deepEqual(m.conditions.map(c=>c.status),['measured','measured','missing','planned']); assert.equal(m.conditions[0].changedSegmentId,'s2');
 for(const sourceText of [m.substrate.source,m.baseline.source,...m.conditions.map(c=>c.source)]) assert(sourceText.length>0);
});

test('condition comparison rejects unsupported inference and incomplete evidence',()=>{
 for(const [mutate,pattern] of [
  [x=>delete x.baseline,/baseline: object required/],
  [x=>x.conditions[0].substrateId='other',/does not share/],
  [x=>x.conditions[0].source='',/source: nonempty/],
  [x=>x.conditions[0].status='unknown',/must be measured/],
  [x=>x.conditions[0].value=null,/finite number/],
  [x=>{x.conditions[0].status='conditional';x.conditions[0].value=null;delete x.conditions[0].range},/conditional range/],
  [x=>x.conditions.splice(0,3),/requires 2–4/],
  [x=>x.substrate.segments[0].id='s2',/duplicate substrate/]
 ]) {const bad=clone();mutate(bad);assert.throws(()=>conditionComparisonModel(bad),pattern)}
});

test('condition comparison renders in desktop and narrow viewports with actual SVG audit', {timeout:120000}, async()=>{
 const html=await editorHtml(source),{pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try {const page=await browser.newPage({viewport:{width:1600,height:1200}});await page.setContent(html);await page.waitForFunction(()=>window.MUSECORE_READY===true);const first=await page.evaluate(()=>window.MUSECORE_RESULT);assert.deepEqual(first.findings,[]);assert.equal(first.geometry.family,'condition-comparison');assert.equal(first.geometry.conditions.length,4);assert(first.geometry.sourceTraceability.conditions.length===4);for(const width of [1600,390]){await page.setViewportSize({width,height:1200});await page.waitForTimeout(25);const r=await page.evaluate(()=>({bodyOverflow:document.body.scrollWidth-document.documentElement.clientWidth,svg:document.querySelector('#output svg')?.getAttribute('viewBox'),error:document.querySelector('#error')?.textContent}));assert(r.bodyOverflow<=1,`horizontal page overflow at ${width}px`);assert.equal(r.error,'');assert.match(r.svg,/^0 0 1600 /)}await page.close();} finally {await browser.close()}
});
