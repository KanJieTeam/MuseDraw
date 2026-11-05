import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {multiPanelEvidenceModel} from '../../scripts/musecore/multi-panel-evidence-models.mjs';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const base=()=>fs.readFile(new URL('../../assets/musecore/multi-panel-evidence-demo.json',import.meta.url),'utf8').then(JSON.parse);

test('multi-panel evidence keeps roles, shared scale and traceability',async()=>{
 const b=await base(),m=multiPanelEvidenceModel(b);
 assert.deepEqual(m.panels.map(p=>p.role),['overview','comparison','detail','validation']);
 assert.deepEqual(m.sharedDomain,[0,79]);
 assert.deepEqual(m.traceability.panelSources[3],{panelId:'validation',role:'validation',sourceIds:['review-log','method-record']});
 assert.equal(m.panels.find(p=>p.id==='detail').series[0].uncertainty.high[2],79);
});

test('multi-panel evidence preserves actual ink, notes and interval geometry with CJK fonts',{timeout:180000},async()=>{
 const candidates=[process.env.MUSECORE_CJK_FONT,process.env.MUSECORE_NOTO_FONT,'/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',...(process.env.WINDIR?[path.join(process.env.WINDIR,'Fonts','msyh.ttc')]:[])].filter(Boolean);
 let bytes;for(const file of candidates){try{bytes=await fs.readFile(file);break}catch{}}
 assert(bytes,'A CJK font is required; set MUSECORE_CJK_FONT');
 const b=await base(),long=structuredClone(b);
 long.panels[3].rows[1].cells[1].note='第二次重复尚未完成，需要补充独立观测';
 long.panels[3].columns[0].label='原始记录与复核结果';
 long.panels[1].title='比较｜这是明显更长的中文标题，用来检验共同比例尺';
 const three=structuredClone(b);three.panels.splice(1,1);
 const mixed=structuredClone(b),p=mixed.panels[1];delete p.series;delete p.categories;p.kind='text';
 p.blocks=[{id:'long',label:'长段证据说明',text:'这段说明只记录调用者提供的条件与限制，不能把它解释成因果结论。'.repeat(4)},{id:'short',label:'短说明',text:'仍待补充独立记录。'},{id:'last',label:'后续工作',text:'下一次观测保留相同样本定义。'}];
 const small=structuredClone(b),large=structuredClone(b);
 for(const [input,factor]of [[small,1e-8],[large,1e80]])for(const p of input.panels.filter(p=>p.kind==='plot'))for(const s of p.series){s.values=s.values.map(v=>v*factor);if(s.uncertainty)for(const key of ['low','high'])s.uncertainty[key]=s.uncertainty[key].map(v=>v*factor)}
 const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)}),out=process.env.MUSECORE_MULTI_PANEL_OUT,summary=[];
 try{for(const [name,input]of [['base',b],['long-notes',long],['three-panels',three],['unequal-text',mixed],['micro-values',small],['large-values',large]])for(const pressure of [0,40]){
  const page=await browser.newPage({viewport:{width:1900,height:1800}});
  try{
   await page.route(/^https?:\/\//,r=>r.abort());await page.route('https://mpe-font.invalid/face',r=>r.fulfill({status:200,contentType:'font/otf',body:bytes}));
   let html=await editorHtml(input);for(const font of ['Arial','Microsoft YaHei','Noto Sans CJK SC'])html=html.replaceAll(font,'MpeCjkTest');
   const init=`{const bytes=await(await fetch('https://mpe-font.invalid/face')).arrayBuffer(),font=new FontFace('MpeCjkTest',bytes);await font.load();document.fonts.add(font);const old=CanvasRenderingContext2D.prototype.measureText;if(${pressure})CanvasRenderingContext2D.prototype.measureText=function(text){const m=old.call(this,text);return new Proxy(m,{get(o,k){return k==='fontBoundingBoxAscent'?Reflect.get(o,k,o)+${pressure}:Reflect.get(o,k,o)}})}}`;
   html=html.replace('<script>(()=>{','<script>(async()=>{'+init);await page.setContent(html);await page.waitForFunction(()=>window.MUSECORE_READY===true);
   const r=await page.evaluate(()=>{const svg=document.querySelector('#output svg'),box=e=>{const b=e.getBBox();return {x:b.x,y:b.y,w:b.width,h:b.height}};return {audit:window.MUSECORE_RESULT,svg:svg?.outerHTML,texts:svg?[...svg.querySelectorAll('text')].map(e=>({text:e.textContent,...box(e)})):[],whiskers:svg?[...svg.querySelectorAll('[data-role=uncertainty-whisker]')].map(e=>({panel:e.dataset.panel,group:e.dataset.group,category:e.dataset.category,points:[...e.points].map(p=>({x:p.x,y:p.y}))})):[],ticks:svg?[...svg.querySelectorAll('[data-role=panel-tick]')].map(e=>({panel:e.dataset.panel,value:+e.dataset.value,text:e.textContent})):[],notes:svg?[...svg.querySelectorAll('[data-role=cell-note]')].map(e=>({text:e.textContent,row:e.dataset.row,column:e.dataset.column,...box(e)})):[]}});
   assert.equal(r.audit.error,undefined,name+'/'+pressure+': '+r.audit.error);assert.deepEqual(r.audit.findings,[]);
   const g=r.audit.geometry;
   for(const t of r.texts)assert(t.x>=0&&t.y>=0&&t.x+t.w<=g.width+.1&&t.y+t.h<=g.height+.1,'text outside canvas: '+t.text);
   for(let i=0;i<r.texts.length;i++)for(const other of r.texts.slice(i+1)){const t=r.texts[i];assert(!(Math.min(t.x+t.w,other.x+other.w)-Math.max(t.x,other.x)>.5&&Math.min(t.y+t.h,other.y+other.h)-Math.max(t.y,other.y)>.5),'overlapping ink: '+t.text+' / '+other.text)}
   const plots=g.panels.filter(p=>p.kind==='plot');assert.equal(new Set(plots.map(p=>p.content.plot.height)).size,1);
   if(input.panels.length===4&&input.panels[1].kind==='plot')assert.equal(plots[0].content.plot.top,plots[1].content.plot.top,'shared row top despite wrapped header');
   for(const p of plots){
    const c=p.content,source=input.panels.find(s=>s.id===p.id);
    for(const bar of c.bars)assert(Math.abs(bar.height-bar.value/g.sharedDomain[1]*c.plot.height)<1e-8,'data-to-pixel scale');
    for(const [i,category]of source.categories.entries())for(const s of source.series.filter(s=>s.uncertainty)){
     const actual=r.whiskers.find(w=>w.panel===p.id&&w.group===s.groupId&&w.category===category);assert(actual,'whisker exists');
     for(const [j,key]of ['high','low'].entries()){const yy=c.plot.bottom-s.uncertainty[key][i]/g.sharedDomain[1]*c.plot.height;assert(Math.abs(actual.points[j].y-yy)<.002,'actual SVG uncertainty coordinates');assert(actual.points[j].y>=c.plot.top-.002&&actual.points[j].y<=c.plot.bottom+.002,'interval within plot')}
    }
    const ticks=r.ticks.filter(t=>t.panel===p.id);assert.equal(new Set(ticks.map(t=>t.text)).size,2,'zero and max remain distinct');
   }
   for(const p of input.panels.filter(p=>p.kind==='table'))for(const row of p.rows)for(const [i,cell]of row.cells.entries())if(cell.note){const lines=r.notes.filter(t=>t.row===row.id&&t.column===p.columns[i].id);assert.equal(lines.map(t=>t.text).join(''),cell.note);const cg=g.panels.find(v=>v.id===p.id).content.cells.find(c=>c.row===row.id&&c.column===p.columns[i].id);for(const line of lines)assert(line.x>=cg.x&&line.x+line.w<=cg.x+cg.width+.1&&line.y>=cg.y&&line.y+line.h<=cg.y+cg.height+.1,'note fits its own cell')}
   for(const p of input.panels.filter(p=>p.kind==='text'))for(const block of p.blocks)assert(r.texts.map(t=>t.text).join('').includes(block.text),'text retained');
   for(const width of [390,1024]){await page.setViewportSize({width,height:1800});const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,texts:document.querySelectorAll('#output svg text').length}));assert(state.overflow<=1);assert.equal(state.texts,r.texts.length)}
   if(out){const dir=path.join(out,name+'-'+pressure);await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'diagram.svg'),r.svg.replaceAll('MpeCjkTest',"Noto Sans CJK SC, Microsoft YaHei, sans-serif"));await fs.writeFile(path.join(dir,'checks.json'),JSON.stringify(r,null,2));await page.setViewportSize({width:1900,height:1800});await page.locator('#output svg').screenshot({path:path.join(dir,'diagram.png')})}
   summary.push({name,pressure,panels:g.panels.length,sharedDomain:g.sharedDomain,actualTextBoxes:r.texts.length,passed:true});
  }finally{await page.close()}
 }}finally{await browser.close()}
 if(out)await fs.writeFile(path.join(out,'results.json'),JSON.stringify(summary,null,2));
});

test('multi-panel evidence rejects unsupported inference and unaligned panels',async()=>{
 const b=await base();
 for(const [mutate,pattern] of [
  [x=>x.scalePolicy='independent',/shared-zero/],
  [x=>x.panels[1].categories[0]='另一个起点',/share category identities/],
  [x=>x.panels[3].rows[0].cells[0].status='high',/status unsupported/],
  [x=>x.panels[0].series[0].uncertainty={low:[1],high:[2]},/match categories/],
  [x=>x.panels[0].sourceIds=['unknown'],/unknown source/],
  [x=>x.panels[0].role='detail',/role detail must appear once/],
  [x=>x.panels[3].weight=4,/weight must be integer/],
  [x=>x.panels[0].blocks=[{id:'ignored',label:'Important',text:'Must not disappear'}],/blocks: unsupported field/],
  [x=>x.panels.filter(p=>p.kind==='plot').forEach(p=>p.series.forEach(s=>{s.values.fill(0);delete s.uncertainty})),/positive plot observation/]
 ]){const c=structuredClone(b);mutate(c);assert.throws(()=>multiPanelEvidenceModel(c),pattern)}
});

test('multi-panel evidence renders desktop, narrow viewport and font ascent pressure',{timeout:120000},async()=>{
 const b=await base(),html=await editorHtml(b),{pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{
  const page=await browser.newPage({viewport:{width:1900,height:1800}});await page.route(/^https?:\/\//,r=>r.abort());await page.setContent(html);await page.waitForFunction(()=>window.MUSECORE_READY===true);
  const initial=await page.evaluate(()=>window.MUSECORE_RESULT);assert.equal(initial.error,undefined);assert.deepEqual(initial.findings,[]);assert.equal(initial.geometry.family,'multi-panel-evidence');assert.equal(initial.geometry.panels.length,4);assert.deepEqual(initial.geometry.sharedDomain,[0,79]);
  for(const width of [390,1024,1440]){await page.setViewportSize({width,height:1800});await page.waitForTimeout(20);const result=await page.evaluate(()=>({error:document.querySelector('#error')?.textContent??'',scroll:document.documentElement.scrollWidth-document.documentElement.clientWidth,viewBox:document.querySelector('#output svg')?.getAttribute('viewBox')}));assert.equal(result.error,'');assert(result.scroll<=1,`horizontal overflow ${width}`);assert.match(result.viewBox,/^0 0 1800 /)}
  const pressure=await page.evaluate(()=>{const old=CanvasRenderingContext2D.prototype.measureText;CanvasRenderingContext2D.prototype.measureText=function(value){const m=old.call(this,value);return new Proxy(m,{get(target,key){return key==='fontBoundingBoxAscent'?(target.fontBoundingBoxAscent??0)+36:Reflect.get(target,key,target)}})};try{const svg=MuseCore.render(JSON.parse(document.querySelector('#input').value));document.querySelector('#output').replaceChildren(svg);return MuseCore.audit(svg)}finally{CanvasRenderingContext2D.prototype.measureText=old}});assert.deepEqual(pressure.findings,[]);assert(pressure.geometry.height>=initial.geometry.height);
 }finally{await browser.close()}
});
