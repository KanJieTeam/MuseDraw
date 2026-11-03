import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import rain from '../../assets/musecore/raincloud-demo.json' with {type:'json'};
import agreement from '../../assets/musecore/agreement-plot-demo.json' with {type:'json'};
import rank from '../../assets/musecore/rank-shift-demo.json' with {type:'json'};
import {paddedNumericExtent,distinctNumericTicks} from '../../scripts/musecore/quantitative.mjs';
import {raincloudModel} from '../../scripts/musecore/raincloud-models.mjs';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const clone=structuredClone;
const scaledRain=(scale,offset=0)=>{const b=clone(rain);b.groups.forEach(g=>g.values=g.values.map(v=>v*scale+offset));return b};
const scaledAgreement=(scale,offset=0)=>{const b=clone(agreement);b.pairs.forEach(p=>{p.first=p.first*scale+offset;p.second=p.second*scale+offset});for(const k of ['lowerLimit','upperLimit','referenceDifference'])b[k]*=scale;return b};
const near=(actual,expected,label)=>assert(Math.abs(actual-expected)<=1e-6*Math.max(1,Math.abs(expected)),`${label}: ${actual} != ${expected}`);

test('scientific extents and density bandwidth respect value scale without unit-sized padding',()=>{
 for(const scale of [1e-120,1e-9,1,1e4]){const d=paddedNumericExtent([1,2,3].map(v=>v*scale));near((d.max-d.min)/scale,2.32,'relative extent');const ticks=distinctNumericTicks(d.min,d.max);assert.equal(new Set(ticks.map(t=>t.label)).size,6);assert(ticks.every(t=>Number.isFinite(t.value)))}
 const normal=raincloudModel(rain),tiny=raincloudModel(scaledRain(1e-9));near(tiny.groups[0].bandwidth/normal.groups[0].bandwidth,1e-9,'kernel bandwidth scales');assert(tiny.domain.max-tiny.domain.min<1e-7);
 for(const values of [[0,0],[1e-120,1e-120],[1e5,1e5+1e-8],[-3,-2]]){const d=paddedNumericExtent(values);assert(d.min<d.max);assert.equal(new Set(distinctNumericTicks(d.min,d.max).map(t=>t.label)).size,6)}
});

test('scientific charts retain actual coordinates, complete labels and readable measured text',{timeout:240000},async()=>{
 const cases=[];
 for(const [id,scale,offset] of [['default',1,0],['micro',1e-9,0],['tiny',1e-120,0],['offset',1e-6,1e5],['negative',1,-20]]){cases.push({id:'rain-'+id,input:scaledRain(scale,offset)});cases.push({id:'agreement-'+id,input:scaledAgreement(scale,offset)})}
 let b=clone(rain);b.groups.forEach(g=>g.values=g.values.map(()=>5e-6));cases.push({id:'rain-constant',input:b});
 b=clone(agreement);b.pairs.forEach(p=>{p.first=5e-6;p.second=5e-6});b.lowerLimit=-1e-8;b.upperLimit=1e-8;cases.push({id:'agreement-constant',input:b});
 b=clone(rain);b.groups.forEach((g,i)=>g.label=`组${i+1}的完整中文标签用于检查长文本是否仍然保留并和对应观测保持关联`);cases.push({id:'rain-long',input:b});
 b=clone(rank);b.items.forEach((item,i)=>item.label=`事项${i+1}的完整中文标签用于检查两端名次与对象是否仍然保持同一对应关系`);cases.push({id:'rank-long',input:b});
 b=clone(rank);b.items=Array.from({length:12},(_,i)=>({id:'r'+i,label:`第${i+1}项跨部门工作安排和里程碑验收的完整名称`,beforeRank:i+1,afterRank:12-i,source:'synthetic boundary row '+i}));cases.push({id:'rank-twelve',input:b});
 const noto=process.env.MUSECORE_SCALE_NOTO_DIR,out=process.env.MUSECORE_SCALE_OUT,fonts=[];
 if(noto){const manifest=JSON.parse(await fs.readFile(path.join(noto,'font-sources.json'),'utf8'));for(const f of manifest.filter(f=>f.family==='Sans')){const bytes=await fs.readFile(path.join(noto,f.file));assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256);fonts.push({weight:f.weight==='Bold'?'700':'400',bytes})}}
 const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)}),results=[];
 try{for(const c of cases)for(const pressure of [0,40]){
  const page=await browser.newPage({viewport:{width:2400,height:1800}}),id=c.id+(pressure?'-plus40':'');
  try{
   await page.route(/^https?:\/\//,r=>r.abort());
   if(noto)await page.route('https://musecore-font.invalid/*',r=>{const f=fonts.find(f=>r.request().url().endsWith(f.weight));return r.fulfill({status:200,contentType:'font/otf',body:f.bytes})});
   let html=await editorHtml(c.input);
   if(noto)for(const name of ['Arial','Microsoft YaHei','Noto Sans CJK SC'])html=html.replaceAll(name,'PinnedScaleSans');
   const fontSetup=fonts.map(f=>`{const bytes=await(await fetch('https://musecore-font.invalid/${f.weight}')).arrayBuffer();const font=new FontFace('PinnedScaleSans',bytes,{weight:'${f.weight}'});await font.load();document.fonts.add(font);}`).join('');
   const stress=pressure?`{const nativeMeasure=CanvasRenderingContext2D.prototype.measureText;CanvasRenderingContext2D.prototype.measureText=function(t){const m=nativeMeasure.call(this,t);return new Proxy(m,{get(o,k){if(k==='width')return Reflect.get(o,k,o)+40;if(k==='fontBoundingBoxAscent')return Reflect.get(o,k,o)+40;return Reflect.get(o,k,o)}})}}`:'';
   html=html.replace('<script>(()=>{','<script>(async()=>{'+fontSetup+stress);
   await page.setContent(html);await page.waitForFunction(()=>window.MUSECORE_READY===true);
   const r=await page.evaluate(()=>{
    const a=window.MUSECORE_RESULT,s=document.querySelector('#output svg');if(!s)throw Error(JSON.stringify(a));
    const box=e=>{const b=e.getBBox();return {x:b.x,y:b.y,width:b.width,height:b.height}},texts=[...s.querySelectorAll('text')].map(e=>({text:e.textContent,font:getComputedStyle(e).fontFamily,...box(e)})),overlaps=[];
    for(let i=0;i<texts.length;i++)for(let j=i+1;j<texts.length;j++){const p=texts[i],q=texts[j];if(Math.min(p.x+p.width,q.x+q.width)-Math.max(p.x,q.x)>.5&&Math.min(p.y+p.height,q.y+q.height)-Math.max(p.y,q.y)>.5)overlaps.push([p.text,q.text])}
    return {audit:a,texts,overlaps,svg:s.outerHTML,rainPoints:[...s.querySelectorAll('[data-raincloud-point]')].map(e=>({id:e.dataset.raincloudPoint,x:+e.getAttribute('cx')})),rainBoxes:[...s.querySelectorAll('[data-raincloud-box]')].map(e=>({id:e.dataset.raincloudBox,x:+e.getAttribute('x'),width:+e.getAttribute('width')})),rainTicks:[...s.querySelectorAll('[data-raincloud-tick]')].map(e=>e.textContent),agreementPoints:[...s.querySelectorAll('[data-agreement-point]')].map(e=>({id:e.dataset.agreementPoint,x:+e.getAttribute('cx'),y:+e.getAttribute('cy')})),agreementLines:[...s.querySelectorAll('[data-agreement-line]')].map(e=>({id:e.dataset.agreementLine,points:e.getAttribute('points')})),xTicks:[...s.querySelectorAll('[data-agreement-x-tick]')].map(e=>e.textContent),yTicks:[...s.querySelectorAll('[data-agreement-y-tick]')].map(e=>e.textContent),rankLabels:[...s.querySelectorAll('[data-rank-label-before]')].map(e=>({id:e.dataset.rankLabelBefore,text:e.textContent})),rankLines:[...s.querySelectorAll('[data-rank-shift-line]')].map(e=>({id:e.dataset.rankShiftLine,points:e.getAttribute('points')}))};
   });
   assert.deepEqual(r.audit.findings,[],id+' audit');assert.deepEqual(r.overlaps,[],id+' actual text overlap');const g=r.audit.geometry;
   for(const t of r.texts){assert(t.x>=-.01&&t.y>=-.01&&t.x+t.width<=g.width+.01&&t.y+t.height<=g.height+.01,id+' text inside canvas: '+t.text);if(noto)assert(t.font.includes('PinnedScaleSans'))}
   if(c.input.family==='raincloud'){
    const m=raincloudModel(c.input),X=value=>g.plot.x+(value-m.domain.min)/(m.domain.max-m.domain.min)*g.plot.w;
    assert.equal(new Set(r.rainTicks).size,6,id+' distinct ticks');assert.equal(r.rainPoints.length,c.input.groups.reduce((n,v)=>n+v.values.length,0));
    for(const group of m.groups){const actual=r.rainPoints.filter(p=>p.id===group.id);actual.forEach((p,i)=>near(p.x,X(group.values[i]),id+' raw point'));const rect=r.rainBoxes.find(p=>p.id===group.id);near(rect.x,X(group.q1),'quartile anchor');near(rect.width,X(group.q3)-X(group.q1),'true IQR width');const displayed=r.texts.map(t=>t.text).join('').replace(/\s/gu,'');assert(displayed.includes(group.label.replace(/\s/gu,'')))}
    const all=m.groups.flatMap(g=>g.values),spread=Math.max(...all)-Math.min(...all);if(spread&&c.id.includes('micro')){const xs=r.rainPoints.map(p=>p.x);assert(Math.max(...xs)-Math.min(...xs)>g.plot.w*.8,'micro data uses numeric scale')}
   }else if(c.input.family==='agreement-plot'){
    const d=g.plot.domain,X=value=>g.plot.x+(value-d.xMin)/(d.xMax-d.xMin)*g.plot.w,Y=value=>g.plot.y+g.plot.h-(value-d.yMin)/(d.yMax-d.yMin)*g.plot.h;
    assert.equal(new Set(r.xTicks).size,6);assert.equal(new Set(r.yTicks).size,5);
    for(const p of c.input.pairs){const actual=r.agreementPoints.find(v=>v.id===p.id);near(actual.x,X((p.first+p.second)/2),id+' mean');near(actual.y,Y(p.second-p.first),id+' difference')}
    for(const [key,value] of [['lower',c.input.lowerLimit],['upper',c.input.upperLimit],['reference',c.input.referenceDifference]]){const points=r.agreementLines.find(p=>p.id===key).points.split(' ').map(v=>v.split(',').map(Number));near(points[0][1],Y(value),id+' line');near(points[1][1],Y(value),id+' line')}
    if(c.id==='agreement-micro')assert(Math.abs(Y(c.input.lowerLimit)-Y(c.input.upperLimit))>g.plot.h*.7,'micro limits stay separated');
   }else{
    for(const item of c.input.items){assert.equal(r.rankLabels.filter(p=>p.id===item.id).map(p=>p.text).join(''),item.label);const points=r.rankLines.find(p=>p.id===item.id).points.split(' ').map(v=>v.split(',').map(Number));near(points[0][1],g.plot.y+(item.beforeRank-.5)*g.plot.rowStep,'before rank');near(points[1][1],g.plot.y+(item.afterRank-.5)*g.plot.rowStep,'after rank')}
   }
   for(const width of [1440,1024,390]){await page.setViewportSize({width,height:1800});assert.equal(await page.evaluate(()=>innerWidth),width);assert(await page.evaluate(()=>document.body.scrollWidth-document.documentElement.clientWidth)<=1,id+' no page overflow')}
   if(out){const dir=path.join(out,id);await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'input.json'),JSON.stringify(c.input,null,2));await fs.writeFile(path.join(dir,'diagram.svg'),r.svg);await fs.writeFile(path.join(dir,'checks.json'),JSON.stringify({audit:r.audit,texts:r.texts,overlaps:r.overlaps},null,2));await page.setViewportSize({width:g.width+64,height:1800});await page.locator('#output svg').screenshot({path:path.join(dir,'diagram.png')})}
   results.push({id,width:g.width,height:g.height,overlaps:r.overlaps.length});
  }finally{await page.close()}
 }}finally{await browser.close()}
 if(out)await fs.writeFile(path.join(out,'results.json'),JSON.stringify({fontProfile:noto?'pinned Noto CJK':'native',results},null,2));
});
