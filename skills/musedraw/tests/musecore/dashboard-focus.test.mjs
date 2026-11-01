import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {dashboardFocusModel} from '../../scripts/musecore/dashboard-focus-models.mjs';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const fixture=()=>fs.readFile(new URL('../../assets/musecore/dashboard-focus-demo.json',import.meta.url),'utf8').then(JSON.parse);
function variants(base){
 const process=structuredClone(base);process.operationalQuestion='capacity';process.heroRelation='process';process.title='装配线产能瓶颈';process.summary=[{label:'日产出',value:'1284',unit:'件/日'},{label:'阻塞工位',value:'2',unit:'个'},{label:'完成率',value:'86',unit:'%'}];process.hero={kind:'process',stages:[{label:'来料',value:198},{label:'加工',value:176},{label:'装配',value:143},{label:'检验',value:132},{label:'包装',value:121},{label:'出库',value:118}]};
 const comparison=structuredClone(base);comparison.operationalQuestion='comparison';comparison.heroRelation='comparison';comparison.title='四区域交付效率对比';comparison.freshness='2026-10 月';comparison.summary=[{label:'最高区域',value:'华东',unit:'区域'},{label:'平均交付',value:'3.8',unit:'天'}];comparison.hero={kind:'comparison',series:[{label:'华东',value:92},{label:'华南',value:86},{label:'华北',value:79},{label:'西部',value:71}]};
 const inventory=structuredClone(base);inventory.operationalQuestion='inventory';inventory.heroRelation='inventory';inventory.title='园区设备资产清单';inventory.summary=[{label:'设备总数',value:'24',unit:'台'},{label:'在线',value:'21',unit:'台'},{label:'待维护',value:'3',unit:'台'}];inventory.hero={kind:'inventory',assets:[{id:'AHU-04',status:'due'},{id:'P-11',status:'online'},{id:'CH-02',status:'online'},{id:'FCU-08',status:'online'},{id:'P-12',status:'online'},{id:'AHU-03',status:'online'},{id:'FCU-09',status:'online'},{id:'P-15',status:'due'}]};
 return [base,process,comparison,inventory];
}

test('dashboard focus accepts four operational routes and records three viewport targets',async()=>{
 const base=await fixture();for(const input of variants(base)){const model=dashboardFocusModel(input);assert.deepEqual(model.summary.map(x=>x.unit).length,input.summary.length);assert.deepEqual(model.scope.includes('freshness'),true);assert.deepEqual(model.heroRelation,input.heroRelation)}
 const html=await editorHtml(base),{pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{const page=await browser.newPage({viewport:{width:1440,height:900}});await page.setContent(html);await page.waitForFunction(()=>window.MUSECORE_READY===true);for(const input of variants(base)){
   const result=await page.evaluate(input=>{try{const svg=MuseCore.render(input);document.getElementById('output').replaceChildren(svg);const audit=MuseCore.audit(svg);return {error:null,audit,svg:svg.outerHTML}}catch(e){return {error:e.message}}},input);
   assert.equal(result.error,null);assert.deepEqual(result.audit.findings,[]);assert.equal(result.audit.geometry.viewports.join(','),'390,1024,1440');assert(result.svg.includes('data-hero'));assert(result.svg.length>2000);
   for(const width of [390,1024,1440]){await page.setViewportSize({width,height:900});await page.screenshot({fullPage:true});}
 }
  const stress=await browser.newPage({viewport:{width:390,height:900}});await stress.setContent(await editorHtml(base));await stress.waitForFunction(()=>window.MUSECORE_READY===true);
  const tall=await stress.evaluate(()=>{const old=CanvasRenderingContext2D.prototype.measureText;CanvasRenderingContext2D.prototype.measureText=function(value){const m=old.call(this,value);return new Proxy(m,{get(target,key){return key==='fontBoundingBoxAscent'?(target.fontBoundingBoxAscent??20)+40:Reflect.get(target,key,target)}})};try{const svg=MuseCore.renderResponsive(JSON.parse(document.getElementById('input').value),390);document.getElementById('output').replaceChildren(svg);return {audit:MuseCore.audit(svg),geometry:JSON.parse(svg.dataset.geometry)}}finally{CanvasRenderingContext2D.prototype.measureText=old}});
  assert.deepEqual(tall.audit.findings,[]);assert.equal(tall.geometry.viewport,390);await stress.close();
 }finally{await browser.close()}
});

test('dashboard focus refuses five unsafe contract boundaries',async()=>{
 const base=await fixture();const invalid=[
  [x=>x.operationalQuestion='unsupported',/unsupported operationalQuestion/],
  [x=>x.summary[0].unit='',/summary\[0\]\.unit/],
  [x=>x.summary=[...x.summary,...x.summary],/summary metrics exceed 4/],
  [x=>x.support[0].relation=null,/unnamed relation/],
  [x=>{x.claims={realtime:true};x.freshness='';},/freshness/],
  [x=>{x.heroRelation='comparison';x.operationalQuestion='comparison';x.hero={kind:'map',points:[]}},/comparison hero requires/],
 ];
 for(const [change,re] of invalid){const input=structuredClone(base);change(input);assert.throws(()=>dashboardFocusModel(input),re)}
});

test('dashboard focus responsive composition reflows at phone and tablet widths',async()=>{
 const base=await fixture(),{pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{const page=await browser.newPage({viewport:{width:1440,height:900}});await page.setContent(await editorHtml(base));await page.waitForFunction(()=>window.MUSECORE_READY===true);
  for(const width of [390,1024,1440]){
   const result=await page.evaluate(width=>{try{const svg=MuseCore.renderResponsive(window.__dashboardSeed||JSON.parse(document.getElementById('input').value),width);document.getElementById('output').replaceChildren(svg);return {error:null,audit:MuseCore.audit(svg),svg:svg.outerHTML,geometry:JSON.parse(svg.dataset.geometry)}}catch(e){return {error:e.message}}},width);
   assert.equal(result.error,null);assert.deepEqual(result.audit.findings,[]);assert.equal(result.geometry.viewport,width);assert.equal(result.geometry.responsive,width<1440);
   assert.deepEqual(result.geometry.readingOrder,['hero','support','metrics']);assert(result.geometry.hero.width<=width-36);assert(result.geometry.support.every(x=>x.name));
   await page.setViewportSize({width,height:900});const overflow=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));assert(overflow.scrollWidth<=overflow.clientWidth+1,`${width}px responsive wrapper overflow`);
  }
 }finally{await browser.close()}
});
