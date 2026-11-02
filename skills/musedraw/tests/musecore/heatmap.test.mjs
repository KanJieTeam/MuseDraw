import test from 'node:test';
import assert from 'node:assert/strict';
import fixtureJson from '../../assets/musecore/heatmap-demo.json' with {type:'json'};
import {heatmapModel} from '../../scripts/musecore/heatmap-models.mjs';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const fixture=()=>structuredClone(fixtureJson),bad=(edit)=>{const b=fixture();edit(b);return b};

test('heatmap model preserves rectangular values and cell-level provenance',()=>{
 const m=heatmapModel(fixture());assert.equal(m.rows.length,5);assert.equal(m.columns.length,5);assert.equal(m.rows[1].values[2].value,1.6);assert.equal(m.sourceTraceability.length,25);assert(m.scope.includes('no clustering'));assert.deepEqual(fixture(),fixtureJson);
});

test('heatmap production renders at narrow viewports and +40 font pressure',{timeout:240000},async()=>{
 const b=fixture(),{pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{const page=await browser.newPage({viewport:{width:2200,height:1800}});await page.route(/^https?:\/\//,r=>r.abort());await page.setContent(await editorHtml(b));await page.waitForFunction(()=>window.MUSECORE_READY===true);
  for(const width of [2200,1024,390])for(const pressure of [0,40]){await page.setViewportSize({width,height:1800});const result=await page.evaluate(async({input,pressure})=>{const old=CanvasRenderingContext2D.prototype.measureText;if(pressure)CanvasRenderingContext2D.prototype.measureText=function(v){const m=old.call(this,v);return new Proxy(m,{get(o,k){if(k==='width')return m.width+pressure;return Reflect.get(o,k,o)}})};try{const svg=MuseCore.render(input);document.getElementById('output').replaceChildren(svg);await document.fonts.ready;const audit=MuseCore.audit(svg);return {findings:audit.findings,text:svg.textContent,cells:svg.querySelectorAll('[data-heatmap-cell]').length,geometry:audit.geometry}}finally{CanvasRenderingContext2D.prototype.measureText=old}},{input:b,pressure});assert.deepEqual(result.findings,[],`width ${width} pressure ${pressure}`);assert.equal(result.cells,25);assert(!/NaN|Infinity|undefined/.test(result.text));assert.equal(result.geometry.sourceTraceability.length,25)}
 }finally{await browser.close()}
});

test('heatmap rejects unsupported, ambiguous and out-of-scope inputs',()=>{
 for(const [name,edit,match] of [
  ['too-few-columns',x=>x.columns=x.columns.slice(0,2),/3–18/],
  ['ragged-row',x=>x.rows[0].values=x.rows[0].values.slice(0,4),/match column count/],
  ['missing-source',x=>delete x.rows[0].values[0].source,/source/],
  ['duplicate-column',x=>x.columns[1].id=x.columns[0].id,/duplicate column id/],
  ['invalid-range',x=>x.min=x.max,/min must be smaller/],
  ['unsupported-claim',x=>x.claim='clustered',/unsupported field/],
  ['non-finite',x=>x.rows[0].values[0].value=NaN,/finite number/]
 ])assert.throws(()=>heatmapModel(bad(edit)),match,name);
});
