import test from 'node:test';
import assert from 'node:assert/strict';
import fixtureJson from '../../assets/musecore/forest-plot-demo.json' with {type:'json'};
import {forestPlotModel} from '../../scripts/musecore/forest-plot-models.mjs';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const fixture=()=>structuredClone(fixtureJson),bad=(base,edit)=>{const b=structuredClone(base);edit(b);return b};

test('forest model keeps interval facts, reference and source traceability without pooling',()=>{
 const m=forestPlotModel(fixture());assert.equal(m.rows.length,6);assert.equal(m.rows[0].estimate,.42);assert.equal(m.rows[0].low,.12);assert.equal(m.rows[0].high,.71);assert.deepEqual(m.sourceTraceability.map(x=>x.id),fixtureJson.rows.map(x=>x.id));assert(m.scope.includes('no pooled estimate'));assert.deepEqual(fixture(),fixtureJson);
});

test('forest production renders real SVG at narrow widths and with font pressure', {timeout:240000}, async()=>{
 const b=fixture(),{pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{const page=await browser.newPage({viewport:{width:2200,height:1800}});await page.route(/^https?:\/\//,r=>r.abort());await page.setContent(await editorHtml(b));await page.waitForFunction(()=>window.MUSECORE_READY===true);
  let normalHeight=0;
  for(const width of [2200,1024,390])for(const pressure of [0,40]){
   const result=await page.evaluate(({input,pressure})=>{const old=CanvasRenderingContext2D.prototype.measureText;if(pressure)CanvasRenderingContext2D.prototype.measureText=function(v){const m=old.call(this,v);return new Proxy(m,{get(o,k){if(k==='width')return m.width+pressure;return Reflect.get(o,k,o)}})};try{const svg=MuseCore.render(input);document.getElementById('output').replaceChildren(svg);const audit=MuseCore.audit(svg);return {findings:audit.findings,text:svg.textContent,marks:svg.querySelectorAll('[data-forest-estimate]').length,intervals:svg.querySelectorAll('[data-forest-interval]').length,reference:svg.querySelectorAll('[data-reference-line]').length,height:audit.geometry.height}}finally{CanvasRenderingContext2D.prototype.measureText=old}},{input:b,pressure});
   assert.deepEqual(result.findings,[],`width ${width} pressure ${pressure}`);assert.equal(result.marks,6);assert.equal(result.intervals,6);assert.equal(result.reference,1);assert(!/NaN|Infinity|undefined/.test(result.text));if(!pressure)normalHeight=Math.max(normalHeight,result.height);
  }
  assert(normalHeight>0);
 }finally{await browser.close()}
});

test('forest rejects unsupported, ambiguous and out-of-scope inputs',()=>{
 const b=fixture();for(const [name,edit,match] of [
  ['too-few',x=>x.rows=x.rows.slice(0,3),/4–24/],
  ['inverted',x=>x.rows[0].low=.8,/contain estimate/],
  ['missing-source',x=>delete x.rows[0].source,/row.source/],
  ['duplicate-id',x=>x.rows[1].id=x.rows[0].id,/duplicate row id/],
  ['unsupported-claim',x=>x.claim='causal',/unsupported field/],
  ['long-label',x=>x.rows[0].label='字'.repeat(49),/at most 48/],
  ['bad-weight',x=>x.rows[0].weight=-1,/row.weight/]
 ])assert.throws(()=>forestPlotModel(bad(b,edit)),match,name);
});
