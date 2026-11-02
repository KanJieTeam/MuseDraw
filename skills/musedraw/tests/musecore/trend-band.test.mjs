import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {trendBandModel} from '../../scripts/musecore/trend-band-models.mjs';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const fixture=JSON.parse(await fs.readFile(new URL('../../assets/musecore/trend-band-demo.json',import.meta.url),'utf8'));
const clone=()=>structuredClone(fixture);

test('trend band preserves supplied periods, values and optional target without inference',()=>{
 const m=trendBandModel(fixture);assert.equal(m.periods.length,7);assert.equal(m.series.length,3);assert.deepEqual(m.series[0].values,fixture.series[0].values);assert.deepEqual(m.target,fixture.target);assert(m.scope.includes('No forecast'));assert.deepEqual(fixture,JSON.parse(JSON.stringify(fixture)));
});

test('trend band rejects malformed or out-of-scope inputs',()=>{
 for(const [edit,pattern]of [
  [x=>x.periods=x.periods.slice(0,2),/3–16/],
  [x=>x.series[0].values=x.series[0].values.slice(0,6),/match periods/],
  [x=>x.series.push({...x.series[0],id:'active'}),/duplicate series id/],
  [x=>x.series[0].color='red',/must be #RRGGBB/],
  [x=>x.target.min=60,/min must be <= max/],
  [x=>x.series[0].values[1]=Infinity,/finite number/],
  [x=>x.series[0].label='字'.repeat(49),/exceeds 48/]
 ]){const bad=clone();edit(bad);assert.throws(()=>trendBandModel(bad),pattern)}
});

test('trend band renders SVG and PNG at desktop, narrow widths and CJK font pressure',{timeout:240000},async()=>{
 const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{const page=await browser.newPage({viewport:{width:1800,height:1400}});await page.route(/^https?:\/\//,r=>r.abort());await page.setContent(await editorHtml(fixture));await page.waitForFunction(()=>window.MUSECORE_READY===true);
  for(const width of [1800,1440,1024,390])for(const pressure of [0,34]){
   const result=await page.evaluate(({input,pressure})=>{const old=CanvasRenderingContext2D.prototype.measureText;if(pressure)CanvasRenderingContext2D.prototype.measureText=function(v){const m=old.call(this,v);return new Proxy(m,{get(target,key){if(key==='width')return m.width+pressure;return Reflect.get(target,key,target)}})};try{const svg=MuseCore.render(input);document.querySelector('#output').replaceChildren(svg);const audit=MuseCore.audit(svg);return {findings:audit.findings,family:audit.geometry.family,lines:svg.querySelectorAll('[data-trend-series]').length,points:svg.querySelectorAll('[data-trend-point]').length,target:svg.querySelectorAll('[data-trend-target-band]').length,viewBox:svg.getAttribute('viewBox'),text:svg.textContent}}finally{CanvasRenderingContext2D.prototype.measureText=old}},{input:fixture,pressure});
   assert.deepEqual(result.findings,[],`width ${width} pressure ${pressure}`);assert.equal(result.family,'trend-band');assert.equal(result.lines,3);assert.equal(result.points,21);assert.equal(result.target,1);assert(!/NaN|Infinity|undefined/.test(result.text));assert.match(result.viewBox,/^0 0 1800 /);
   await page.setViewportSize({width,height:1400});const overflow=await page.evaluate(()=>document.body.scrollWidth-document.documentElement.clientWidth);assert(overflow<=1,`horizontal overflow ${width}`);
  }
  const png=await page.locator('#output svg').screenshot();assert.equal(png[0],0x89);assert.equal(png[1],0x50);assert.equal(png[2],0x4e);assert.equal(png[3],0x47);
  await page.close();
 }finally{await browser.close()}
});
