import test from 'node:test';
import assert from 'node:assert/strict';
import fixtureJson from '../../assets/musecore/raincloud-demo.json' with {type:'json'};
import {raincloudModel} from '../../scripts/musecore/raincloud-models.mjs';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const fixture=()=>structuredClone(fixtureJson),bad=(base,edit)=>{const b=structuredClone(base);edit(b);return b};

test('raincloud model computes quartiles and preserves raw source groups',()=>{
 const m=raincloudModel(fixture());assert.equal(m.groups.length,3);assert.equal(m.groups[0].n,9);assert.equal(m.groups[0].min,2.1);assert.equal(m.groups[0].median,3);assert.equal(m.groups[0].q1,2.6);assert.equal(m.groups[0].q3,3.3);assert.equal(m.groups[1].max,5.2);assert.equal(m.sourceTraceability[2].source,'记录表 C · 行 2–10');assert(m.scope.includes('no group test'));assert.deepEqual(fixture(),fixtureJson);
});

// Multi-content/font/viewport assertions live in scientific-scale-layout.test.mjs.
test('raincloud default production SVG retains the supplied objects',async()=>{
 const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{const page=await browser.newPage({viewport:{width:2400,height:1800}});await page.route(/^https?:\/\//,r=>r.abort());await page.setContent(await editorHtml(fixture()));await page.waitForFunction(()=>window.MUSECORE_READY===true);
  const result=await page.evaluate(()=>{const svg=document.querySelector('#output svg');return {findings:window.MUSECORE_RESULT.findings,groups:svg.querySelectorAll('[data-raincloud-density]').length,boxes:svg.querySelectorAll('[data-raincloud-box]').length,points:svg.querySelectorAll('[data-raincloud-point]').length}});
  assert.deepEqual(result.findings,[]);assert.equal(result.groups,3);assert.equal(result.boxes,3);assert.equal(result.points,27);
 }finally{await browser.close()}
});

test('raincloud rejects unsupported, ambiguous and out-of-scope inputs',()=>{
 const b=fixture();for(const [name,edit,match] of [
  ['too-few-groups',x=>x.groups=x.groups.slice(0,1),/2–6/],
  ['too-few-values',x=>x.groups[0].values=x.groups[0].values.slice(0,4),/5–200/],
  ['missing-source',x=>delete x.groups[0].source,/group.source/],
  ['duplicate-id',x=>x.groups[1].id=x.groups[0].id,/duplicate group id/],
  ['unsupported-claim',x=>x.claim='causal',/unsupported field/],
  ['long-label',x=>x.groups[0].label='字'.repeat(41),/at most 40/],
  ['non-finite',x=>x.groups[0].values[0]=Number.NaN,/finite number/]
 ])assert.throws(()=>raincloudModel(bad(b,edit)),match,name);
});
