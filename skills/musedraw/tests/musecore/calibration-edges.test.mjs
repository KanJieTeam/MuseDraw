import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import fixtureJson from '../../assets/musecore/calibration-plot-demo.json' with {type:'json'};
import {calibrationPlotModel} from '../../scripts/musecore/calibration-models.mjs';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const fixture=()=>structuredClone(fixtureJson);

test('calibration rejects declared conditions without observations instead of producing undefined summaries',()=>{
 const b=fixture();b.conditions.push({id:'unsampled',label:'尚未采样',color:'#345678',source:'自制边界记录'});
 assert.throws(()=>calibrationPlotModel(b),/condition unsampled: at least one observation required/);
 const mapped=fixture();mapped.rows.forEach(r=>r.condition='control');
 assert.throws(()=>calibrationPlotModel(mapped),/condition treated: at least one observation required/);
});

test('calibration retains distinct measured axis labels under long text, font pressure and narrow viewports',{timeout:240000},async()=>{
 const b=fixture();b.xLabel='观测浓度对应的完整采样测量记录';b.yLabel='预测浓度对应的完整模型输出记录'.repeat(3);b.unit='每升的毫摩尔浓度单位';
 const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 const out=process.env.MUSECORE_CALIBRATION_OUT;
 try{for(const pressure of [0,32]){
  const page=await browser.newPage({viewport:{width:2400,height:1800}});
  try{
   await page.route(/^https?:\/\//,r=>r.abort());let html=await editorHtml(b);
   if(pressure){const patch=`const __m=CanvasRenderingContext2D.prototype.measureText;CanvasRenderingContext2D.prototype.measureText=function(v){const m=__m.call(this,v);return new Proxy(m,{get(o,k){if(k==='width')return Reflect.get(o,k,o)+32;if(k==='fontBoundingBoxAscent')return Reflect.get(o,k,o)+16;return Reflect.get(o,k,o)}})};`;html=html.replace('<script>(()=>{',`<script>(()=>{${patch}`)}
   await page.setContent(html);await page.waitForFunction(()=>window.MUSECORE_READY===true,null,{timeout:120000});
   const result=await page.evaluate(()=>{const svg=document.querySelector('#output svg'),audit=MuseCore.audit(svg);return {findings:audit.findings,geometry:audit.geometry,svg:svg.outerHTML,axes:Object.fromEntries(['x','y'].map(axis=>[axis,[...svg.querySelectorAll(`[data-calibration-axis="${axis}"]`)].map(n=>n.textContent).join('')])),yBottom:Math.max(...[...svg.querySelectorAll('[data-calibration-axis="y"]')].map(n=>{const box=n.getBBox();return box.y+box.height})),points:svg.querySelectorAll('[data-calibration-point]').length}});
   assert.deepEqual(result.findings,[],`pressure ${pressure}`);assert.equal(result.points,b.rows.length);
   assert.equal(result.axes.x,`${b.xLabel} · ${b.unit}`);assert.equal(result.axes.y,`${b.yLabel} · ${b.unit}`);assert(result.yBottom<result.geometry.plot.y,'wrapped y label must sit above plotting marks');
   for(const width of [1440,1024,390]){await page.setViewportSize({width,height:1800});assert.equal(await page.evaluate(()=>innerWidth),width);assert(await page.evaluate(()=>document.body.scrollWidth-document.documentElement.clientWidth)<=1,`no page overflow at ${width}`)}
   if(out){const dir=path.join(out,pressure?'font-pressure':'normal');await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'diagram.svg'),result.svg);await fs.writeFile(path.join(dir,'checks.json'),JSON.stringify(result,null,2));await page.setViewportSize({width:2400,height:1800});await page.locator('#output svg').screenshot({path:path.join(dir,'diagram.png')})}
  }finally{await page.close()}
 }}finally{await browser.close()}
});
