import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';
const read=async name=>JSON.parse(await fs.readFile(new URL('../../assets/musecore/'+name+'.json',import.meta.url),'utf8'));

test('metric rows and spectrum guides remain separate from actual CJK ink',{timeout:180000},async()=>{
 const candidates=[process.env.MUSECORE_CJK_FONT,process.env.MUSECORE_NOTO_FONT,'/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',...(process.env.WINDIR?[path.join(process.env.WINDIR,'Fonts','msyh.ttc')]:[])].filter(Boolean);
 let bytes;for(const file of candidates){try{bytes=await fs.readFile(file);break}catch{}}
 assert(bytes,'A CJK font is required; set MUSECORE_CJK_FONT');
 const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 const out=process.env.MUSECORE_CI_FONT_OUT,results=[];
 try{for(const id of ['dashboard-focus-demo','electromagnetic-spectrum'])for(const pressure of [0,40]){
  const input=await read(id),page=await browser.newPage({viewport:{width:2400,height:1800}});
  try{
   await page.route(/^https?:\/\//,r=>r.abort());
   await page.route('https://ci-font.invalid/face',r=>r.fulfill({status:200,contentType:'font/otf',body:bytes}));
   let html=await editorHtml(input);
   for(const name of ['Arial','Microsoft YaHei','Noto Sans CJK SC'])html=html.replaceAll(name,'CiFontMetrics');
   const init=`{const bytes=await(await fetch('https://ci-font.invalid/face')).arrayBuffer(),font=new FontFace('CiFontMetrics',bytes);await font.load();document.fonts.add(font);const old=CanvasRenderingContext2D.prototype.measureText;if(${pressure})CanvasRenderingContext2D.prototype.measureText=function(text){const m=old.call(this,text);return new Proxy(m,{get(o,k){return k==='fontBoundingBoxAscent'?Reflect.get(o,k,o)+${pressure}:Reflect.get(o,k,o)}})}}`;
   html=html.replace('<script>(()=>{','<script>(async()=>{'+init);await page.setContent(html);await page.waitForFunction(()=>window.MUSECORE_READY===true);
   for(const width of id==='dashboard-focus-demo'?[1800,1024,390]:[2040]){
    await page.setViewportSize({width:width+64,height:1800});
    const r=await page.evaluate(({input,width})=>{
     const svg=input.family==='dashboard-focus'&&width<1800?MuseCore.renderResponsive(input,width):MuseCore.render(input);document.getElementById('output').replaceChildren(svg);
     const box=e=>{const b=e.getBBox();return {x:b.x,y:b.y,w:b.width,h:b.height}},texts=[...svg.querySelectorAll('text')].map(e=>({text:e.textContent,...box(e)}));
     const metrics=[...svg.querySelectorAll('[data-metric]')].map(e=>({label:e.dataset.metric,...box(e)}));
     return {audit:MuseCore.audit(svg),texts,metrics,svg:svg.outerHTML};
    },{input,width});
    assert.deepEqual(r.audit.findings,[],id+'/'+pressure+'/'+width);
    if(input.heroRelation==='spatial'){
     const heading=r.texts.find(t=>t.text==='空间分布'),caption=r.texts.find(t=>t.text.includes('归一化位置示意'));
     assert(heading&&caption,'keep both spatial heading and coordinate disclaimer visible');
     assert(caption.y>=heading.y+heading.h+8,`measured hero heading needs its own height before the chart at ${pressure}/${width}`);
    }
    if(input.support){const text=r.texts.map(t=>t.text).join('').replace(/\s/gu,'');for(const panel of input.support)for(const row of panel.rows??[])assert(text.includes(row.replace(/\s/gu,'')),'all supplied support rows remain visible at '+width)}
    for(const metric of r.metrics){const matching=r.texts.filter(t=>t.x>=metric.x&&t.x+t.w<=metric.x+metric.w&&t.y>=metric.y&&t.y+t.h<=metric.y+metric.h);assert(matching.length>=2,'value and label fit own metric');const expected=input.summary.find(k=>k.label===metric.label);assert(matching.some(t=>t.text===expected.value));assert(matching.map(t=>t.text).join('').includes(expected.label));for(let i=0;i<matching.length;i++)for(const t of matching.slice(i+1)){const a=matching[i];assert(!(Math.min(a.x+a.w,t.x+t.w)>Math.max(a.x,t.x)&&Math.min(a.y+a.h,t.y+t.h)>Math.max(a.y,t.y)),'metric ink is separated')}}
    if(out){const dir=path.join(out,id+'-'+pressure+'-'+width);await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'diagram.svg'),r.svg);await fs.writeFile(path.join(dir,'checks.json'),JSON.stringify(r,null,2));await page.setViewportSize({width:Math.ceil(r.audit.geometry.width)+64,height:1800});await page.locator('#output svg').screenshot({path:path.join(dir,'diagram.png')})}
    results.push({id,pressure,width,findings:r.audit.findings});
   }
  }finally{await page.close()}
 }}finally{await browser.close()}
 if(out)await fs.writeFile(path.join(out,'results.json'),JSON.stringify(results,null,2));
});
