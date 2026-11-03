import test from 'node:test';
import assert from 'node:assert/strict';
import fixtureJson from '../../assets/musecore/roc-pr-curve-demo.json' with {type:'json'};
import {rocPrCurveModel,demoRocPrCurve} from '../../scripts/musecore/roc-pr-models.mjs';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const fixture=()=>structuredClone(fixtureJson),bad=(base,edit)=>{const b=structuredClone(base);edit(b);return b};

test('ROC–PR model preserves explicit rates, computes bounded areas and source traceability',()=>{
 const m=rocPrCurveModel(fixture());
 assert.equal(m.points.length,9);assert.equal(m.points[0].fpr,0);assert.equal(m.points.at(-1).recall,1);
 assert.equal(Number(m.aucRoc.toFixed(6)),0.8537);assert.equal(Number(m.aucPr.toFixed(6)),0.808662);
 assert.equal(m.sourceTraceability.length,9);assert.deepEqual(fixture(),demoRocPrCurve);
 for(const p of m.points){assert.equal(p.tpr,p.recall);if(p.fpr||p.tpr)assert.ok(Math.abs(p.precision-.37*p.tpr/(.37*p.tpr+.63*p.fpr))<1e-12)}assert(m.scope.includes('no classifier fitting'));assert.deepEqual(fixture(),fixtureJson);
});

test('ROC–PR production renders real SVG at narrow widths and font pressure', {timeout:240000}, async()=>{
 const b=fixture(),{pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{
  for(const width of [2200,1024,390])for(const pressure of [0,40]){
   // A fresh document installs pressure before the first measurement so the
   // visual-tools cache cannot turn the pressure run into a no-op.
   const page=await browser.newPage({viewport:{width,height:1800}});
   try{
    await page.route(/^https?:\/\//,r=>r.abort());
    await page.evaluate(pressure=>{
     const nativeMeasure=CanvasRenderingContext2D.prototype.measureText;
     window.__rocNativeMeasure=nativeMeasure;
     if(pressure)CanvasRenderingContext2D.prototype.measureText=function(v){const m=nativeMeasure.call(this,v);return new Proxy(m,{get(o,k){if(k==='width')return m.width+pressure;return Reflect.get(o,k,o)}})};
    },pressure);
    await page.setContent(await editorHtml(b));await page.waitForFunction(()=>window.MUSECORE_READY===true);
    const result=await page.evaluate(input=>{
     const svg=MuseCore.render(input);document.getElementById('output').replaceChildren(svg);const audit=MuseCore.audit(svg);
     const ctx=document.createElement('canvas').getContext('2d'),probe='宽度基准';
     return {viewport:innerWidth,pressureDelta:ctx.measureText(probe).width-window.__rocNativeMeasure.call(ctx,probe).width,findings:audit.findings,text:svg.textContent,points:svg.querySelectorAll('[data-roc-point]').length,curves:svg.querySelectorAll('[data-roc-curve]').length,panels:svg.querySelectorAll('[data-roc-panel]').length,height:audit.geometry.height,textNodes:[...svg.querySelectorAll('text')].map(e=>e.textContent)};
    },b);
    assert.equal(result.viewport,width);assert.equal(result.pressureDelta,pressure);assert(result.textNodes.includes('0.854'));assert(result.textNodes.includes('0.809'));
    assert.deepEqual(result.findings,[],`width ${width} pressure ${pressure}`);assert.equal(result.points,18);assert.equal(result.curves,2);assert.equal(result.panels,2);assert(!/NaN|Infinity|undefined/.test(result.text));assert(result.height>0);
   }finally{await page.close()}
  }
 }finally{await browser.close()}
});

test('ROC–PR rejects unsupported, ambiguous and out-of-scope inputs',()=>{
 const b=fixture();for(const [name,edit,match] of [
  ['too-few',x=>x.points=x.points.slice(0,5),/6–60/],
  ['non-monotonic-threshold',x=>x.points[2].threshold=1,/thresholds must be non-increasing/],
  ['non-monotonic-rate',x=>{x.points[3].tpr=.1;x.points[3].recall=.1},/true-positive rate must be non-decreasing/],
  ['inconsistent-recall',x=>x.points[1].recall=.12,/tpr and point.recall must agree/],
  ['missing-source',x=>delete x.points[0].source,/point.source/],
  ['unsupported-claim',x=>x.claim='causal',/unsupported field/],
  ['long-label',x=>x.points[0].label='字'.repeat(37),/at most 36/],
  ['bad-rate',x=>x.points[0].tpr=1.2,/point.tpr/],
  ['bad-endpoint',x=>x.points[0].fpr=.01,/first operating point/]
 ])assert.throws(()=>rocPrCurveModel(bad(b,edit)),match,name);
});
