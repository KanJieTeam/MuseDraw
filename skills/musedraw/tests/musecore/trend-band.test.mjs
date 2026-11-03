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
 const before=structuredClone(fixture),m=trendBandModel(fixture);assert.equal(m.periods.length,7);assert.equal(m.series.length,3);assert.deepEqual(m.series[0].values,fixture.series[0].values);assert.deepEqual(m.target,fixture.target);assert(m.scope.includes('No forecast'));assert.deepEqual(fixture,before);
});

test('trend band rejects malformed or out-of-scope inputs',()=>{
 for(const [edit,pattern]of [
  [x=>x.periods=x.periods.slice(0,2),/3–16/],
  [x=>x.series[0].values=x.series[0].values.slice(0,6),/match periods/],
  [x=>x.series.push({...x.series[0],id:'active'}),/duplicate series id/],
  [x=>x.series[0].color='red',/must be #RRGGBB/],
  [x=>x.target.min=60,/min must be <= max/],
  [x=>x.series[0].values[1]=Infinity,/finite number/],
  [x=>x.series[0].label='字'.repeat(49),/exceeds 48/],
  [x=>x.target={label:'unbounded',min:-1e308,max:1e308},/outside/],
  [x=>x.unit='',/unit/],
  [x=>x.periods[1]=x.periods[0],/unique/],
  [x=>x.series[0].values[0]=null,/finite/],
  [x=>x.elapsedHours=[0,2,7],/unsupported/]
 ]){const bad=clone();edit(bad);assert.throws(()=>trendBandModel(bad),pattern)}
});

test('trend band default editor exports a PNG',async()=>{
 const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{const page=await browser.newPage({viewport:{width:1900,height:1400}});await page.route(/^https?:\/\//,r=>r.abort());await page.setContent(await editorHtml(fixture));await page.waitForFunction(()=>window.MUSECORE_READY===true);
  assert.deepEqual(await page.evaluate(()=>window.MUSECORE_RESULT.findings),[]);
  const png=await page.locator('#output svg').screenshot();assert.deepEqual([...png.subarray(0,4)],[0x89,0x50,0x4e,0x47]);
 }finally{await browser.close()}
});

// These checks inspect actual SVG ink and independently recompute coordinates;
// audit.findings and element counts alone cannot establish a sound chart.
test('trend band reflows measured text and retains encodings across content and font changes',{timeout:240000},async()=>{
 const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 const out=process.env.MUSECORE_TREND_OUT,noto=process.env.MUSECORE_TREND_NOTO_DIR;
 const variants=[{id:'default',input:clone()}];
 let b=clone();b.title='十六个登记批次与五条长名称序列的目标区间对照';b.unit='mg L⁻¹';b.periods=Array.from({length:16},(_,i)=>`批次${i+1}的完整中文名称与登记条件`);b.series=Array.from({length:5},(_,i)=>({id:'s'+i,label:`第${i+1}条需要完整保留的中文测量序列与条件标签说明`,color:fixture.series[i%3].color,values:b.periods.map((_,j)=>5+i+j/3)}));b.target={label:'完整保留的参考区间名称与声明条件不代表统计显著性',min:8,max:12};variants.push({id:'dense-long',input:b});
 b=clone();b.unit='s';b.series.forEach((s,i)=>s.values=s.values.map((_,j)=>1e-9*(1+i+j)));b.target={label:'微量范围',min:2e-9,max:5e-9};variants.push({id:'tiny',input:b});
 b=clone();b.series.forEach(s=>s.values=s.values.map(()=>1e9));delete b.target;variants.push({id:'constant-large',input:b});
 b=clone();b.series=b.series.slice(0,1);b.series[0].values=b.periods.map((_,i)=>1e9-i*1e-6);delete b.target;variants.push({id:'close-large',input:b});
 b=clone();b.series=b.series.slice(0,1);b.series[0].values=[-20,-10,0,10,20,0,-10];b.target={label:'同值参考线',min:0,max:0};variants.push({id:'signed-zero-band',input:b});
 let fontSetup='';
 if(noto){const {default:path}=await import('node:path');const files=JSON.parse(await fs.readFile(path.join(noto,'font-sources.json'),'utf8'));const {createHash}=await import('node:crypto');for(const f of files.filter(f=>f.family==='Sans')){const bytes=await fs.readFile(path.join(noto,f.file));assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256,'pinned font checksum');fontSetup+=`{const f=new FontFace('PinnedTrendSans','url(data:font/otf;base64,${bytes.toString('base64')})',{weight:'${f.weight==='Bold'?'700':'400'}'});await f.load();document.fonts.add(f);}`}}
 const results=[];
 try{
  for(const row of variants)for(const pressure of [0,40]){
   const page=await browser.newPage({viewport:{width:1800,height:1400}});
   try{
    await page.route(/^https?:\/\//,r=>r.abort());
    let html=await editorHtml(row.input);
    if(noto)for(const family of ['Arial','Microsoft YaHei','Noto Sans CJK SC'])html=html.replaceAll(family,'PinnedTrendSans');
    const stress=pressure?`{const old=CanvasRenderingContext2D.prototype.measureText;CanvasRenderingContext2D.prototype.measureText=function(text){const metrics=old.call(this,text);return new Proxy(metrics,{get(m,key){if(key==='width')return Reflect.get(m,key,m)*1.25;if(key==='fontBoundingBoxAscent')return Reflect.get(m,key,m)+40;return Reflect.get(m,key,m)}})}}`:'';
    html=html.replace('<script>(()=>{','<script>(async()=>{'+fontSetup+stress);
    await page.setContent(html);await page.waitForFunction(()=>window.MUSECORE_READY===true);
    const r=await page.evaluate(()=>{const audit=window.MUSECORE_RESULT,svg=document.querySelector('#output svg');if(!svg)throw Error(JSON.stringify(audit));const g=audit.geometry,texts=[...svg.querySelectorAll('text')].map(e=>{const b=e.getBBox();return {text:e.textContent,x:b.x,y:b.y,width:b.width,height:b.height,font:getComputedStyle(e).fontFamily}}),collisions=[];for(let i=0;i<texts.length;i++)for(let j=i+1;j<texts.length;j++){const a=texts[i],b=texts[j];if(Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>.5&&Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>.5)collisions.push([a.text,b.text])}return {audit,texts,collisions,svg:svg.outerHTML,ticks:[...svg.querySelectorAll('[data-trend-tick]')].map(e=>({value:+e.dataset.trendTick,label:e.textContent})),paths:[...svg.querySelectorAll('[data-trend-series]')].map(e=>({id:e.dataset.trendSeries,points:e.getAttribute('points'),dash:e.getAttribute('stroke-dasharray')})),points:[...svg.querySelectorAll('[data-trend-point]')].map(e=>({id:e.dataset.trendPoint,tag:e.tagName})),target:(()=>{const e=svg.querySelector('[data-trend-target-band]');return e?{y:+e.getAttribute('y'),height:+e.getAttribute('height')}:null})()}});
    const label=row.id+(pressure?'-plus40':'');
    assert.deepEqual(r.audit.findings,[],label);assert.deepEqual(r.collisions,[],label+' actual ink overlap');
    const g=r.audit.geometry,p=g.plot,eps=1e-5;
    for(const t of r.texts){assert(t.x>=-eps&&t.y>=-eps&&t.x+t.width<=g.width+eps&&t.y+t.height<=g.height+eps,label+' text inside canvas: '+t.text);if(noto)assert(t.font.includes('PinnedTrendSans'))}
    assert.equal(new Set(r.ticks.map(t=>t.label)).size,5,label+' readable distinct tick labels');
    assert.equal(r.points.length,row.input.series.length*row.input.periods.length);
    for(const [i,series] of row.input.series.entries()){
     const actual=r.paths.find(v=>v.id===series.id).points.split(' ').map(v=>v.split(',').map(Number));
     for(const [j,value] of series.values.entries()){
      const expectedX=p.x+p.w*j/(row.input.periods.length-1),expectedY=p.y+p.h-(value-p.yDomain[0])/(p.yDomain[1]-p.yDomain[0])*p.h;
      assert(Math.abs(actual[j][0]-expectedX)<eps);assert(Math.abs(actual[j][1]-expectedY)<eps);assert(actual[j].every(Number.isFinite));
     }
     if(i)assert(r.paths[i].dash,'series remains distinguishable without colour');
    }
    if(row.input.target){const y=v=>p.y+p.h-(v-p.yDomain[0])/(p.yDomain[1]-p.yDomain[0])*p.h;assert(Math.abs(r.target.y-y(row.input.target.max))<eps);assert(Math.abs(r.target.height-(y(row.input.target.min)-y(row.input.target.max)))<eps)}else assert.equal(r.target,null);
    const displayed=r.texts.map(t=>t.text).join('').replace(/\s/gu,'');
    for(const s of row.input.series)assert(displayed.includes(s.label.replace(/\s/gu,'')),label+' full series label');
    for(const period of row.input.periods)assert(displayed.includes(period.replace(/\s/gu,'')),label+' full period label');
    assert(displayed.includes(row.input.unit?'给定值/'+row.input.unit.replace(/\s/gu,''):'单位未声明'));
    for(const width of [1440,1024,390]){await page.setViewportSize({width,height:1400});assert(await page.evaluate(()=>document.body.scrollWidth-document.documentElement.clientWidth)<=1,label+' viewport '+width)}
    if(out){const {default:path}=await import('node:path');const dir=path.join(out,label);await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'input.json'),JSON.stringify(row.input,null,2));await fs.writeFile(path.join(dir,'diagram.svg'),r.svg);await fs.writeFile(path.join(dir,'checks.json'),JSON.stringify({audit:r.audit,collisions:r.collisions,ticks:r.ticks,texts:r.texts},null,2));await page.setViewportSize({width:g.width+64,height:1400});await page.locator('#output svg').screenshot({path:path.join(dir,'diagram.png')})}
    results.push({id:label,width:g.width,height:g.height,actualInkOverlap:r.collisions.length,ticks:r.ticks});
   }finally{await page.close()}
  }
  if(out){const {default:path}=await import('node:path');await fs.writeFile(path.join(out,'results.json'),JSON.stringify({fontProfile:noto?'pinned Noto CJK':'native',results},null,2))}
 }finally{await browser.close()}
});
