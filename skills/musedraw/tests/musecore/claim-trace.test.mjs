import test from 'node:test';
import assert from 'node:assert/strict';
import fixtureJson from '../../assets/musecore/claim-trace-demo.json' with {type:'json'};
import {claimTraceModel} from '../../scripts/musecore/claim-trace-models.mjs';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const fixture=()=>structuredClone(fixtureJson),bad=(edit)=>{const b=fixture();edit(b);return b};

test('claim trace preserves declared levels, statuses and relation traceability',()=>{
 const m=claimTraceModel(fixture());
 assert.equal(m.claims.length,4);assert.equal(m.sources.length,5);assert.equal(m.links.length,7);
 assert.equal(m.claims[0].level,'observed');assert.equal(m.sources[4].status,'missing');
 assert.deepEqual(m.traceability.claims[1].sourceIds,['o1','o2']);
 assert(m.scope.includes('no score'));assert(m.scope.includes('causality'));assert.deepEqual(fixture(),fixtureJson);
});

test('claim trace renders with normal, narrow and font-pressure geometry audits', {timeout:240000}, async()=>{
 const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{const page=await browser.newPage({viewport:{width:2100,height:1800}});await page.route(/^https?:\/\//,r=>r.abort());await page.setContent(await editorHtml(fixture()));await page.waitForFunction(()=>window.MUSECORE_READY===true);
  for(const [width,pressure] of [[2100,0],[1024,0],[390,0],[390,24]]){
   const result=await page.evaluate(({input,pressure})=>{const old=CanvasRenderingContext2D.prototype.measureText;if(pressure)CanvasRenderingContext2D.prototype.measureText=function(v){const m=old.call(this,v);return new Proxy(m,{get(o,k){if(k==='width')return m.width+pressure;return Reflect.get(o,k,o)}})};try{const svg=MuseCore.render(input);document.getElementById('output').replaceChildren(svg);const audit=MuseCore.audit(svg);return {findings:audit.findings,text:svg.textContent,claims:svg.querySelectorAll('[data-claim]').length,sources:svg.querySelectorAll('[data-source]').length,links:svg.querySelectorAll('[data-claim-link]').length,geometry:audit.geometry}}finally{CanvasRenderingContext2D.prototype.measureText=old}},{input:fixture(),pressure});
   assert.deepEqual(result.findings,[],`width ${width} pressure ${pressure}`);assert.equal(result.claims,4);assert.equal(result.sources,5);assert.equal(result.links,7);assert(!/NaN|Infinity|undefined/.test(result.text));assert(result.geometry.width>=2100);
  }
 }finally{await browser.close()}
});

test('claim trace rejects unsupported inference and incomplete source declarations',()=>{
 for(const [name,edit,match] of [
  ['too-few-claims',x=>x.claims=x.claims.slice(0,2),/claims requires 3–8/],
  ['unknown-relation',x=>x.links[0].relation='causes',/relation unsupported/],
  ['missing-claim-link',x=>x.links=x.links.filter(l=>l.claimId!=='c4'),/requires at least one source relation/],
  ['observed-without-direct',x=>{x.sources.find(s=>s.id==='o1').status='indirect';x.sources.find(s=>s.id==='o2').status='indirect'},/observed claim c1 requires/],
  ['unsupported-score',x=>x.score=0.8,/unsupported field/],
  ['unknown-source',x=>x.links[0].sourceId='s9',/sourceId unknown/]
 ])assert.throws(()=>claimTraceModel(bad(edit)),match,name);
});
