import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {operationsBoardModel} from '../../scripts/musecore/operations-board-models.mjs';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const source=JSON.parse(await fs.readFile(new URL('../../assets/musecore/operations-board-demo.json',import.meta.url),'utf8'));
const clone=()=>structuredClone(source);

test('operations board keeps the three regions bounded and explicit',()=>{
 const m=operationsBoardModel(source);assert.equal(m.signals.length,3);assert.equal(m.trend.values.length,m.trend.labels.length);assert.equal(m.queue.length,4);assert.match(m.scope,/No inferred realtime/);
});

test('operations board rejects unsupported or under-specified content',()=>{
 for(const [mutate,pattern] of [[x=>x.signals.push(x.signals[0],x.signals[1]),/signals requires 2–4/],[x=>x.trend.labels.pop(),/aligned points/],[x=>x.queue[0].owner='',/queue\[0\]\.owner/],[x=>x.queue[0].state='done',/state unsupported/],[x=>x.headlineState='live',/headlineState/],[x=>x.trend.values[0]='x',/finite number/]]){const bad=clone();mutate(bad);assert.throws(()=>operationsBoardModel(bad),pattern)}
});

test('operations board renders with no geometry findings and no horizontal overflow', {timeout:120000}, async()=>{
 const html=await editorHtml(source),{pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{const page=await browser.newPage({viewport:{width:1800,height:1200}});await page.setContent(html);await page.waitForFunction(()=>window.MUSECORE_READY===true);let result=await page.evaluate(()=>window.MUSECORE_RESULT);assert.deepEqual(result.findings,[]);assert.equal(result.geometry.family,'operations-board');assert.equal(result.geometry.queue.length,4);for(const width of [390,1024,1440]){await page.setViewportSize({width,height:1200});await page.waitForTimeout(20);const r=await page.evaluate(()=>({overflow:document.body.scrollWidth-document.documentElement.clientWidth,error:document.querySelector('#error')?.textContent}));assert(r.overflow<=1,`horizontal overflow at ${width}px`);assert.equal(r.error,'')}await page.close()}finally{await browser.close()}
});

test('operations board recomputes an eight-item CJK queue under real font pressure', {timeout:120000}, async()=>{
 const long=clone();
 long.title='跨部门交付运行总览与今日处置台账';
 long.subtitle='在一条阅读路径上同时查看当前态势、变化方向、责任归属与下一动作';
 long.queue=Array.from({length:8},(_,i)=>({
  id:`Q-${String(i+1).padStart(2,'0')}`,
  label:`第${i+1}项跨部门交付事项的完整名称与验收说明，需在今日完成确认`,
  owner:`第${i+1}责任小组`,
  due:i===7?'已逾期':`明日 ${10+i}:30`,
  state:i===7?'held':i===0?'now':'next'
 }));
 const html=await editorHtml(long),{pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 let fontBytes;for(const file of [process.env.MUSECORE_CJK_FONT,process.env.MUSECORE_NOTO_FONT].filter(Boolean)){try{fontBytes=await fs.readFile(file);break}catch{}}
 try{
  const page=await browser.newPage({viewport:{width:2200,height:1800}});
  if(fontBytes)await page.route('https://board-font.invalid/face',r=>r.fulfill({status:200,contentType:'font/otf',body:fontBytes}));
  await page.setContent(html.replaceAll('Microsoft YaHei','PinnedBoardSans').replaceAll('Arial','PinnedBoardSans').replaceAll('Noto Sans CJK SC','PinnedBoardSans'));
  if(fontBytes){await page.evaluate(async()=>{const b=await(await fetch('https://board-font.invalid/face')).arrayBuffer();const f=new FontFace('PinnedBoardSans',b);await f.load();document.fonts.add(f);await document.fonts.ready});}
  for(const pressure of [0,40]){
   await page.evaluate(({pressure})=>{window.MUSECORE_READY=false;if(pressure&&!window.__boardPressure){const old=CanvasRenderingContext2D.prototype.measureText;CanvasRenderingContext2D.prototype.measureText=function(t){const m=old.call(this,t);return new Proxy(m,{get(o,k){if(k==='width'||k==='fontBoundingBoxAscent')return Reflect.get(o,k,o)+pressure;return Reflect.get(o,k,o)}})};window.__boardPressure=true;}document.getElementById('generate').click()},{pressure});
   await page.waitForFunction(()=>window.MUSECORE_READY===true);const result=await page.evaluate(()=>window.MUSECORE_RESULT);assert.deepEqual(result.findings,[],`pressure ${pressure}`);assert.equal(result.geometry.family,'operations-board');assert.equal(result.geometry.queue.length,8);assert(result.geometry.height>1120,'queue height must be content-sized');
   const facts=await page.evaluate(()=>{const svg=document.querySelector('#output svg'),g=JSON.parse(svg.dataset.geometry);const texts=[...svg.querySelectorAll('text')].map(e=>{const b=e.getBBox();return {text:e.textContent,x:b.x,y:b.y,w:b.width,h:b.height}});return {svgW:g.width,svgH:g.height,texts,queueMarks:svg.querySelectorAll('[data-queue-state]').length,scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}});
   assert.equal(facts.queueMarks,8);for(const t of facts.texts){assert(t.x>=-.5&&t.y>=-.5&&t.x+t.w<=result.geometry.width+.5,`text width overflow: ${t.text}`);assert(t.y+t.h<=result.geometry.height+.5,`text height overflow: ${t.text}`)}
   for(const width of [1024,390]){await page.setViewportSize({width,height:1800});const narrow=await page.evaluate(()=>({bodyScrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,outputScrollWidth:document.querySelector('#output').scrollWidth,svgWidth:document.querySelector('#output svg').viewBox.baseVal.width}));assert.equal(narrow.clientWidth,width);assert(narrow.bodyScrollWidth<=width+1,`body overflow at ${width}px`);assert(narrow.outputScrollWidth>=narrow.svgWidth,`narrow viewport clipped board at ${width}px`)}
  }
  await page.close();
 }finally{await browser.close()}
});
