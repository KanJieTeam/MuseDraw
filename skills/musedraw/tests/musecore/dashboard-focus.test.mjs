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
 const trend=structuredClone(base);trend.operationalQuestion='trend';trend.heroRelation='trend';trend.title='响应队列变化';trend.hero={kind:'trend',unit:'起',period:'近6小时',emphasis:'活跃警情',series:[{label:'活跃警情',values:[2,4,3,5,3,3]},{label:'待响应',values:[5,6,8,7,7,6]}]};
 const inventory=structuredClone(base);inventory.operationalQuestion='inventory';inventory.heroRelation='inventory';inventory.title='园区设备资产清单';inventory.summary=[{label:'设备总数',value:'24',unit:'台'},{label:'在线',value:'21',unit:'台'},{label:'待维护',value:'3',unit:'台'}];inventory.hero={kind:'inventory',assets:[{id:'AHU-04',status:'due'},{id:'P-11',status:'online'},{id:'CH-02',status:'online'},{id:'FCU-08',status:'online'},{id:'P-12',status:'online'},{id:'AHU-03',status:'online'},{id:'FCU-09',status:'online'},{id:'P-15',status:'due'}]};
 return [base,process,comparison,trend,inventory];
}

test('dashboard focus accepts five operational routes and records three viewport targets',async()=>{
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
  [x=>{x.claims={realtime:true,mode:'snapshot',source:'file.csv'}},/live mode/],
  [x=>{x.claims={realtime:true,mode:'live',source:''}},/realtime source/],
  [x=>{x.support[0].bindsTo[1]='UNKNOWN'},/does not match a hero point/],
  [x=>{x.support[0].bindsTo=x.support[0].bindsTo.slice(0,2)},/bindsTo must align/],
  [x=>{x.heroRelation='comparison';x.operationalQuestion='comparison';x.hero={kind:'map',points:[]}},/comparison hero requires/],
 ];
 for(const [change,re] of invalid){const input=structuredClone(base);change(input);assert.throws(()=>dashboardFocusModel(input),re)}
});

test('dashboard focus responsive composition reflows at phone and tablet widths',async()=>{
 const base=await fixture(),{pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{const page=await browser.newPage({viewport:{width:1440,height:900}});await page.setContent(await editorHtml(base));await page.waitForFunction(()=>window.MUSECORE_READY===true);
  for(const width of [390,1024,1440]){
   const result=await page.evaluate(width=>{try{const svg=MuseCore.renderResponsive(window.__dashboardSeed||JSON.parse(document.getElementById('input').value),width);document.getElementById('output').replaceChildren(svg);return {error:null,audit:MuseCore.audit(svg),svg:svg.outerHTML,geometry:JSON.parse(svg.dataset.geometry)}}catch(e){return {error:e.message}}},width);
   assert.equal(result.error,null);assert.deepEqual(result.audit.findings,[]);assert.equal(result.geometry.viewport,width);assert.equal(result.geometry.responsive,width<1800);
   assert.deepEqual(result.geometry.readingOrder,['hero','support','metrics']);assert(result.geometry.hero.width<=width-36);assert(result.geometry.support.every(x=>x.name));
   await page.setViewportSize({width,height:900});const overflow=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));assert(overflow.scrollWidth<=overflow.clientWidth+1,`${width}px responsive wrapper overflow`);
  }
 }finally{await browser.close()}
});

test('dashboard focus preserves zero values as zero-length marks',async()=>{
 const base=await fixture(),{pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{const page=await browser.newPage({viewport:{width:390,height:900}});await page.setContent(await editorHtml(base));await page.waitForFunction(()=>window.MUSECORE_READY===true);
  const result=await page.evaluate(()=>{const input=JSON.parse(document.getElementById('input').value);input.operationalQuestion='capacity';input.heroRelation='process';input.hero={kind:'process',stages:[{label:'来料',value:0},{label:'装配',value:12}]};input.support[1].values=[0,0,0];const svg=MuseCore.renderResponsive(input,390);document.getElementById('output').replaceChildren(svg);return {hero:[...svg.querySelectorAll('[data-role="hero-stage"]')].map(node=>Number(node.getAttribute('height'))),support:[...svg.querySelectorAll('[data-role="support-observation"]')].map(node=>Number(node.getAttribute('height')))}});
  assert.deepEqual(result.hero[0],0);assert.deepEqual(result.support,[0,0,0]);
 }finally{await browser.close()}
});

test('dashboard trend rejects ambiguous shared-axis inputs and accepts supplied time labels',async()=>{
 const input=variants(await fixture())[3];input.hero.periods=['08:00','09:00','10:00','11:00','12:00','13:00'];
 assert.deepEqual(dashboardFocusModel(input).hero.periods,input.hero.periods);
 for(const [change,message] of [
  [x=>x.hero.series[1].values.pop(),/matching observation counts/],
  [x=>x.hero.series[1].label=x.hero.series[0].label,/labels must be unique/],
  [x=>x.hero.periods.pop(),/periods must match/],
  [x=>x.hero.periods[1]=x.hero.periods[0],/periods must be unique/],
  [x=>x.hero.periods[0]='',/nonempty/]
 ]){const bad=structuredClone(input);change(bad);assert.throws(()=>dashboardFocusModel(bad),message)}
});

test('dashboard trend exposes numeric scale, every time and every series at actual export and responsive sizes',{timeout:120000},async()=>{
 const input=variants(await fixture())[3];input.title='维修队列 · 合成测试快照';input.hero.periods=['08:00','09:00','10:00','11:00','12:00','13:00'];
 const dense=structuredClone(input);dense.hero.periods=Array.from({length:18},(_,i)=>`批次${i+1}：给定记录条件与较长的时间标签`);dense.hero.series.forEach((s,i)=>s.values=Array.from({length:18},(_,j)=>i?18-j:2+j));
 const indexed=structuredClone(input);delete indexed.hero.periods;
 const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)}),out=process.env.MUSECORE_DASHBOARD_OUT;
 try{for(const [name,seed] of [['times',input],['dense',dense],['indices',indexed]])for(const width of [390,1024,1440,1800])for(const stress of [false,true]){
  const page=await browser.newPage({viewport:{width,height:1200}});
  try{
   let html=await editorHtml(seed);
   if(stress)html=html.replace('<script>(()=>{',`<script>(()=>{const baseMeasure=CanvasRenderingContext2D.prototype.measureText;CanvasRenderingContext2D.prototype.measureText=function(t){const m=baseMeasure.call(this,t);return new Proxy(m,{get(o,k){if(k==='width')return Reflect.get(o,k,o)*1.25;if(k==='fontBoundingBoxAscent')return (Reflect.get(o,k,o)||20)+40;return Reflect.get(o,k,o)}})};`);
   await page.route(/^https?:\/\//,r=>r.abort());await page.setContent(html);await page.waitForFunction(()=>window.MUSECORE_READY===true);
   const r=await page.evaluate(({seed,width})=>{const svg=width===1800?MuseCore.render(seed):MuseCore.renderResponsive(seed,width);document.getElementById('output').replaceChildren(svg);const texts=[...svg.querySelectorAll('text')].map(e=>{const b=e.getBBox();return {text:e.textContent,x:b.x,y:b.y,w:b.width,h:b.height}}),collisions=[];for(let i=0;i<texts.length;i++)for(let j=i+1;j<texts.length;j++){const a=texts[i],b=texts[j];if(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>.5&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>.5)collisions.push([a.text,b.text])}return {audit:MuseCore.audit(svg),svg:svg.outerHTML,texts,collisions,ticks:[...svg.querySelectorAll('[data-trend-tick]')].map(e=>({value:+e.dataset.trendTick,label:e.textContent})),periods:[...svg.querySelectorAll('[data-trend-period]')].map(e=>e.textContent),series:[...svg.querySelectorAll('polyline[data-trend-series]')].map(e=>({label:e.dataset.trendSeries,dash:e.getAttribute('stroke-dasharray'),points:e.getAttribute('points').split(' ').map(p=>p.split(',').map(Number))}))}}, {seed,width});
   const label=`${name}-${width}${stress?'-font-pressure':''}`,g=r.audit.geometry,p=g.trend;
   assert.deepEqual(r.audit.findings,[],label);assert.deepEqual(r.collisions,[],label+' actual text ink');
   assert.equal(g.width,width);assert.equal(g.hero.width,width===1800?1076:width-(width<700?36:64));
   assert.equal(new Set(r.ticks.map(t=>t.label)).size,5,label+' numeric tick labels');assert.equal(r.periods.length,seed.hero.series[0].values.length,label+' per-observation horizontal key');
   const displayed=r.texts.map(t=>t.text).join('').replace(/\s/gu,'');
   assert(!r.texts.some(t=>/^(?:主视图\s*·\s*trend|RECORD|TREND)$/.test(t.text)),label+' internal route identifiers stay out of the delivered dashboard');
   assert(displayed.includes('趋势变化'),label+' viewer-facing heading');
   for(const series of seed.hero.series)assert(displayed.includes(series.label),label+' all series visible');
   for(const period of seed.hero.periods??[])assert(displayed.includes(period.replace(/\s/gu,'')),label+' given period visible');
   if(!seed.hero.periods)assert(displayed.includes('未提供逐点时间'),label+' no invented time');
   for(const [i,s] of seed.hero.series.entries())for(const [j,v] of s.values.entries()){
    const [x,y]=r.series[i].points[j];assert(Math.abs(x-(p.x+p.w*j/(s.values.length-1)))<1e-7);assert(Math.abs(y-(p.y+p.h-v/p.yDomain[1]*p.h))<1e-7);
   }
   assert(r.series[1].dash,label+' secondary series remains identifiable without colour');
   for(const t of r.texts)assert(t.x>=-.5&&t.y>=-.5&&t.x+t.w<=g.width+.5&&t.y+t.h<=g.height+.5,label+' text inside canvas '+t.text);
   if(out&&!stress&&name==='times'){const {default:path}=await import('node:path'),dir=path.join(out,label);await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'diagram.svg'),r.svg);await fs.writeFile(path.join(dir,'checks.json'),JSON.stringify(r.audit,null,2));await page.setContent(`<style>body{margin:0}</style>${r.svg}`);const png=await page.locator('svg').screenshot({path:path.join(dir,'diagram.png')});assert.equal(png.readUInt32BE(16),width,'export must include the full responsive SVG')}
  }finally{await page.close()}
 }}finally{await browser.close()}
});

test('dashboard trend keeps finite scales and distinct ticks at floating-point boundaries',async()=>{
 const input=variants(await fixture())[3],{pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{const page=await browser.newPage();await page.setContent(await editorHtml(input));await page.waitForFunction(()=>window.MUSECORE_READY===true);
  for(const values of [[0,1e308],[0,Number.MIN_VALUE],[0,0]])for(const width of [390,1800]){
   const seed=structuredClone(input);seed.hero.series=[{label:'给定边界观测',values}];seed.hero.emphasis='给定边界观测';
   const r=await page.evaluate(({seed,width})=>{const svg=width===1800?MuseCore.render(seed):MuseCore.renderResponsive(seed,width);document.getElementById('output').replaceChildren(svg);return {audit:MuseCore.audit(svg),ticks:[...svg.querySelectorAll('[data-trend-tick]')].map(e=>({value:Number(e.dataset.trendTick),label:e.textContent})),points:svg.querySelector('polyline[data-trend-series]').getAttribute('points').split(' ').map(p=>p.split(',').map(Number))}},{seed,width});
   assert.deepEqual(r.audit.findings,[]);assert(r.ticks.length>=2);assert.equal(new Set(r.ticks.map(t=>t.value)).size,r.ticks.length);assert.equal(new Set(r.ticks.map(t=>t.label)).size,r.ticks.length);assert(r.ticks.every(t=>Number.isFinite(t.value)));assert(r.points.flat().every(Number.isFinite));
   const p=r.audit.geometry.trend;assert.equal(r.points[0][1],p.y+p.h);assert.equal(r.points[1][1],values[1]===0?p.y+p.h:p.y);
  }
 }finally{await browser.close()}
});
