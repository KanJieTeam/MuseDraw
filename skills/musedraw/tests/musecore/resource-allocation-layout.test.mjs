import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import fixture from '../../assets/musecore/resource-allocation-demo.json' with {type:'json'};
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const copy=()=>structuredClone(fixture);
function maximum(){
 const b=copy();
 b.resources=Array.from({length:8},(_,i)=>({id:`r${i}`,label:`资源${i+1}`,capacity:100+i*10,source:`登记资源${i+1}`}));
 b.workstreams=Array.from({length:8},(_,i)=>({id:`w${i}`,label:`工作流${i+1}`,source:`登记工作流${i+1}`,allocations:b.resources.map((r,j)=>({resourceId:r.id,amount:2+i+j,source:`登记分配${i+1}-${j+1}`}))}));
 return b;
}
function longLabels(){
 const b=maximum();b.title='跨部门联合项目的资源分配与登记容量核对视图'.repeat(3);
 b.subtitle='跨部门协同中的资源登记、工作流负载与容量核查。'.repeat(6);
 b.dataStatus='全部数值为合成测试数据，不能作为实际排程依据。'.repeat(4);
 b.note='这是一项中文长标签压力检查，所有登记事实必须完整保留，不通过缩字号或删字换取通过。'.repeat(8);
 b.resources.forEach((r,i)=>r.label=`第${i+1}类资源的跨部门联合复核与成果编制支持工时`);
 b.workstreams.forEach((w,i)=>w.label=`第${i+1}项工作流的多来源资料复核与成果一致性检查任务`);
 return b;
}
const variants=[
 {id:'minimum',make:()=>{const b=copy();b.resources=b.resources.slice(0,2);b.workstreams=b.workstreams.slice(0,2);b.workstreams.forEach(w=>w.allocations=w.allocations.slice(0,2));return b}},
 {id:'reordered',make:()=>{const b=copy();b.workstreams.forEach(w=>w.allocations.reverse());return b}},
 {id:'eight-by-eight',make:maximum},
 {id:'long-cjk',make:longLabels},
 {id:'zero-and-overload',make:()=>{const b=copy();b.resources[0].capacity=0;b.workstreams[0].allocations[1].amount=1000;return b}},
 {id:'all-zero-capacity',make:()=>{const b=copy();b.resources.forEach(r=>r.capacity=0);return b}},
 {id:'all-zero-allocations',make:()=>{const b=copy();b.workstreams.forEach(w=>w.allocations.forEach(c=>c.amount=0));return b}},
 {id:'numeric-extremes',make:()=>{const b=copy();b.resources[0].capacity=0.000001;b.workstreams.forEach(w=>w.allocations[0].amount=0.000002);b.resources[1].capacity=1000000;b.workstreams[0].allocations[1].amount=999999.123456789;return b}}
];

for(const variant of variants)test(`resource layout retains identities and bounds: ${variant.id}`,{timeout:120000},async()=>{
 const input=variant.make(),{pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{
  for(const pressure of variant.id==='long-cjk'?[0,34]:[0]){
   const p=await browser.newPage({viewport:{width:2400,height:1800}});
   await p.route(/^https?:\/\//,r=>r.abort());
   let html=await editorHtml(input),prelude='';
   if(process.env.MUSECORE_NOTO_FONT){
    const font=(await fs.readFile(process.env.MUSECORE_NOTO_FONT)).toString('base64');
    html=html.replace('</style>',`@font-face{font-family:ResourceTestCJK;src:url(data:font/otf;base64,${font})}</style>`).replace('sans:"Arial,','sans:"ResourceTestCJK, Arial,');
    prelude+='await document.fonts.load(\'22px ResourceTestCJK\');';
   }
   if(pressure)prelude+=`const oldMeasure=CanvasRenderingContext2D.prototype.measureText;CanvasRenderingContext2D.prototype.measureText=function(v){const m=oldMeasure.call(this,v);return new Proxy(m,{get(t,k){if(k==='fontBoundingBoxAscent')return (Reflect.get(t,k,t)??0)+${pressure};return Reflect.get(t,k,t)}})};`;
   html=html.replace('<script>(()=>{','<script>(async()=>{'+prelude);
   await p.setContent(html);await p.waitForFunction(()=>window.MUSECORE_READY===true);
   const r=await p.evaluate(()=>{
    const svg=document.querySelector('#output svg'),result=window.MUSECORE_RESULT;
    if(!svg)return {result};
    const bounds=n=>{const b=n.getBBox();return {x:b.x,y:b.y,w:b.width,h:b.height}};
    return {result,svg:svg.outerHTML,text:svg.textContent,
     content:[...svg.querySelectorAll('text,rect')].map(n=>({tag:n.tagName,text:n.textContent,...bounds(n)})),
     marks:[...svg.querySelectorAll('[data-role="allocation-mark"]')].map(n=>({resourceId:n.dataset.resource,workstreamId:n.dataset.workstream,...bounds(n)})),
     tracks:[...svg.querySelectorAll('[data-role="allocation-track"]')].map(n=>({resourceId:n.dataset.resource,workstreamId:n.dataset.workstream,...bounds(n)})),
     values:[...svg.querySelectorAll('[data-role="allocation-value"]')].map(n=>({resourceId:n.dataset.resource,workstreamId:n.dataset.workstream,text:n.textContent})),
     workstreamMarks:svg.querySelectorAll('[data-role="workstream-load"]').length,
     font:svg.querySelector('text')?.getAttribute('font-family')};
   });
   if(process.env.MUSECORE_RESOURCE_OUT){
    const dir=path.join(process.env.MUSECORE_RESOURCE_OUT,`${variant.id}-${pressure?'plus34':'normal'}`);
    await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'input.json'),JSON.stringify(input,null,2));await fs.writeFile(path.join(dir,'checks.json'),JSON.stringify(r,null,2));
    if(r.svg){await fs.writeFile(path.join(dir,'diagram.svg'),r.svg);await p.locator('#output svg').screenshot({path:path.join(dir,'diagram.png')})}
   }
   assert.equal(r.result.error,undefined,`${variant.id}: ${r.result.error}`);
   assert.deepEqual(r.result.findings,[],`${variant.id} audit`);
   const g=r.result.geometry;
   assert.equal(g.cells.length,input.resources.length*input.workstreams.length);
   for(const cell of g.cells){
    const ri=input.resources.findIndex(x=>x.id===cell.resourceId),w=input.workstreams.find(x=>x.id===cell.workstreamId),given=w.allocations.find(x=>x.resourceId===cell.resourceId);
    assert.equal(cell.amount,given.amount,`correct column for ${w.id}/${cell.resourceId}`);
    assert.equal(cell.source,given.source,'cell provenance follows resource identity');
    assert.equal(cell.capacity,input.resources[ri].capacity);
    assert.equal(r.values.find(v=>v.resourceId===cell.resourceId&&v.workstreamId===w.id).text,String(given.amount),'visible value matches the supplied fact');
    if(ri){const prior=g.cells.find(c=>c.workstreamId===w.id&&c.resourceId===input.resources[ri-1].id);assert(prior.x+prior.width<=cell.x+.1,'columns follow resource order')}
   }
   for(const n of r.content)assert(n.x>=-.1&&n.y>=-.1&&n.x+n.w<=g.width+.1&&n.y+n.h<=g.height+.1,`content outside SVG: ${JSON.stringify(n)}`);
   for(const mark of r.marks){
    const cell=g.cells.find(c=>c.resourceId===mark.resourceId&&c.workstreamId===mark.workstreamId),track=r.tracks.find(c=>c.resourceId===mark.resourceId&&c.workstreamId===mark.workstreamId);
    assert(track,'bar has an explicit comparison track');
    assert(mark.x>=cell.x&&mark.x+mark.w<=cell.x+cell.width,'bar stays in its resource column');
    assert(mark.w<=track.w+.01,'overload never spills beyond its capacity track');
    assert(cell.capacity>0,'no fictitious ratio for zero capacity');
    assert(Math.abs(mark.w/track.w-Math.min(1,cell.amount/cell.capacity))<1e-6,'bar proportional to supplied capacity');
   }
   if(input.resources.some(r=>r.capacity>0))assert.equal(r.workstreamMarks,input.workstreams.length,'workstream bars are actually attached to SVG');
   if(input.resources.every(r=>r.capacity===0))assert(!r.text.includes('0%'),'zero denominator is not a 0% allocation');
   if(input.resources.every(r=>r.capacity===0)){assert.equal(r.marks.length,0);assert.equal(r.workstreamMarks,0);assert(r.text.includes('不计算比例'))}
   if(variant.id==='long-cjk')for(const text of [input.title,input.subtitle,input.dataStatus,input.note,...input.resources.map(r=>r.label),...input.workstreams.map(w=>w.label)])assert(r.text.includes(text),`full text retained: ${text}`);
   if(process.env.MUSECORE_NOTO_FONT)assert.match(r.font,/ResourceTestCJK/);
   for(const width of [390,1024,1440]){
    await p.setViewportSize({width,height:1800});
    const narrow=await p.evaluate(()=>{const out=document.querySelector('#output');out.scrollLeft=out.scrollWidth;return {pageOverflow:document.body.scrollWidth-document.documentElement.clientWidth,reachable:out.scrollWidth-out.clientWidth-out.scrollLeft<2}});
    assert(narrow.pageOverflow<=1,`no document overflow at ${width}`);assert(narrow.reachable,`far-right content reachable at ${width}`);
   }
   await p.close();
  }
 }finally{await browser.close()}
});

test('resource layout refuses excessive explicit lines without shrinking or truncating text',{timeout:120000},async()=>{
 const input=copy();input.resources[0].label=Array(9).fill('资源').join('\n');
 const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{
  const page=await browser.newPage();await page.setContent(await editorHtml(input));await page.waitForFunction(()=>window.MUSECORE_READY===true);
  const r=await page.evaluate(()=>({error:window.MUSECORE_RESULT.error,svg:document.querySelector('#output svg')!==null,input:JSON.parse(document.querySelector('#input').value)}));
  assert.match(r.error,/exceeds 8 lines/);assert.equal(r.svg,false);assert.deepEqual(r.input,input);
 }finally{await browser.close()}
});
