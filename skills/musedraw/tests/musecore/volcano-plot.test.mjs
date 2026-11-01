import test from 'node:test';
import assert from 'node:assert/strict';
import fixtureJson from '../../assets/musecore/volcano-plot-demo.json' with {type:'json'};
import {volcanoPlotModel} from '../../scripts/musecore/volcano-models.mjs';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';
const fixture=()=>structuredClone(fixtureJson);
function bad(base,edit){const b=structuredClone(base);edit(b);return b}
test('volcano model computes transformed scores and threshold counts without inventing claims',()=>{
 const m=volcanoPlotModel(fixture());assert.equal(m.points.length,16);assert.equal(m.counts.up,2);assert.equal(m.counts.down,2);assert.equal(m.counts.other,12);assert.equal(m.points.find(p=>p.id==='g01').score, -Math.log10(.0004));assert(m.scope.includes('does not assert biological importance'));assert.deepEqual(fixture(),fixtureJson);
});
test('volcano production renders normal, narrow and +40 font pressure', {timeout:240000}, async()=>{
 const b=fixture(),{pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{const page=await browser.newPage({viewport:{width:2200,height:1500}});await page.route(/^https?:\/\//,r=>r.abort());await page.setContent(await editorHtml(b));await page.waitForFunction(()=>window.MUSECORE_READY===true);
  for(const width of [2200,1024,390])for(const pressure of [0,40]){const result=await page.evaluate(({input,pressure})=>{const old=CanvasRenderingContext2D.prototype.measureText;if(pressure)CanvasRenderingContext2D.prototype.measureText=function(v){const m=old.call(this,v);return new Proxy(m,{get(o,k){if(k==='width')return m.width+pressure;return Reflect.get(o,k,o)}})};try{const svg=MuseCore.render(input);document.getElementById('output').replaceChildren(svg);const audit=MuseCore.audit(svg);return {findings:audit.findings,text:svg.textContent,dots:svg.querySelectorAll('[data-volcano-point]').length,thresholds:svg.querySelectorAll('[stroke-dasharray]').length,geometry:audit.geometry}}finally{CanvasRenderingContext2D.prototype.measureText=old}},{input:b,pressure});assert.deepEqual(result.findings,[],`width ${width} pressure ${pressure}`);assert.equal(result.dots,16);assert(result.thresholds>=3);assert(!/NaN|Infinity|undefined/.test(result.text));}
 }finally{await browser.close()}
});
test('volcano rejects unsupported, ambiguous or out-of-scope inputs',()=>{
 const b=fixture();for(const [name,edit,match] of [['too-few',x=>x.points=x.points.slice(0,7),/8–160/],['bad-p',x=>x.points[0].pValue=0,/point.pValue/],['one-sided',x=>x.points.forEach(p=>p.effect=Math.abs(p.effect)),/both effect directions/],['unknown',x=>x.claim='causal',/unsupported field/],['long-label',x=>x.points[0].label='字'.repeat(29),/at most 28/],['bad-threshold',x=>x.thresholdP=.9,/thresholdP/]])assert.throws(()=>volcanoPlotModel(bad(b,edit)),match,name);
});
