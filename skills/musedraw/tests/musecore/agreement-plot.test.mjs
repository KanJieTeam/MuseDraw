import test from 'node:test';
import assert from 'node:assert/strict';
import fixtureJson from '../../assets/musecore/agreement-plot-demo.json' with {type:'json'};
import {agreementPlotModel} from '../../scripts/musecore/agreement-models.mjs';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const fixture=()=>structuredClone(fixtureJson),bad=(base,edit)=>{const b=structuredClone(base);edit(b);return b};

test('agreement model computes paired means/differences and preserves sources',()=>{
 const m=agreementPlotModel(fixture());assert.equal(m.pairs.length,8);assert.equal(m.pairs[0].mean,2.05);assert.ok(Math.abs(m.pairs[0].difference+.1)<1e-12);assert.equal(Number(m.meanDifference.toFixed(6)),0);assert.equal(m.sourceTraceability.at(-1).source,'配对表 A · 行 9');assert(m.scope.includes('no agreement test'));assert.deepEqual(fixture(),fixtureJson);
});

// Multi-content/font/viewport assertions live in scientific-scale-layout.test.mjs.
test('agreement default production SVG retains the supplied objects',async()=>{
 const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{const page=await browser.newPage({viewport:{width:2400,height:1800}});await page.route(/^https?:\/\//,r=>r.abort());await page.setContent(await editorHtml(fixture()));await page.waitForFunction(()=>window.MUSECORE_READY===true);
  const result=await page.evaluate(()=>{const svg=document.querySelector('#output svg');return {findings:window.MUSECORE_RESULT.findings,points:svg.querySelectorAll('[data-agreement-point]').length,lines:svg.querySelectorAll('[data-agreement-line]').length}});
  assert.deepEqual(result.findings,[]);assert.equal(result.points,8);assert.equal(result.lines,3);
 }finally{await browser.close()}
});

test('agreement model rejects unsupported, ambiguous and out-of-scope inputs',()=>{
 const b=fixture();for(const [name,edit,match] of [['too-few',x=>x.pairs=x.pairs.slice(0,4),/5–120/],['missing-source',x=>delete x.pairs[0].source,/pair.source/],['duplicate-id',x=>x.pairs[1].id=x.pairs[0].id,/duplicate pair id/],['unsupported-claim',x=>x.claim='causal',/unsupported field/],['long-label',x=>x.pairs[0].label='字'.repeat(37),/at most 36/],['bad-limit',x=>x.lowerLimit=0,/limits must bracket/],['non-finite',x=>x.pairs[0].first=Number.NaN,/finite number/]])assert.throws(()=>agreementPlotModel(bad(b,edit)),match,name);
});
