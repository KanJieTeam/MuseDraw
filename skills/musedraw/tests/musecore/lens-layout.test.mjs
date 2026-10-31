import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {editorHtml} from '../../scripts/musecore.mjs';
import {thinLens} from '../../scripts/musecore/teaching-objects.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const base=JSON.parse(await fs.readFile(new URL('../../assets/musecore/lens.json',import.meta.url),'utf8'));
const near=(a,b)=>assert(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const collinear=(a,z,p)=>near((z[0]-a[0])*(p[1]-a[1]),(z[1]-a[1])*(p[0]-a[0]));
function lensInputs(){
 const cases=[{name:'default',input:structuredClone(base)}];
 for(const objectDistance of [20,15,10,5,9.2,10.8,40])cases.push({name:'u-'+objectDistance,input:{...structuredClone(base),objectDistance}});
 const input=structuredClone(base);input.title='同一组给定条件下的三条特殊光线、物距像距与放大率：在共同坐标中检查物体与像的方向';input.subtitle='给定正焦距、物距和物高，采用近轴薄透镜关系计算图中的像点；数值为明确输入的理想教学条件，虚像使用反向延长线定位。';input.comparisons=[40,30,20,15,10,5];input.note=base.note.repeat(3);cases.push({name:'long-six-comparisons',input});
 return cases;
}

test('lens special rays, dimensions and comparison rows use the same supplied thin-lens conditions',{timeout:180000},async t=>{
 const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({...resolveBrowser(pw),headless:true});
 try{
  const page=await browser.newPage();await page.route(/^https?:\/\//,r=>r.abort());await page.setContent(await editorHtml(base));await page.waitForFunction(()=>window.MUSECORE_READY===true);
  const draw=(input,pressure=0)=>page.evaluate(async({input,pressure})=>{
   const original=CanvasRenderingContext2D.prototype.measureText;
   if(pressure)CanvasRenderingContext2D.prototype.measureText=function(text){const m=original.call(this,text);return new Proxy(m,{get(o,k){return k==='fontBoundingBoxAscent'?Reflect.get(o,k,o)+pressure:Reflect.get(o,k,o)}})};
   try{
    const svg=MuseCore.render(input);document.getElementById('output').replaceChildren(svg);await document.fonts.ready;
    const points=e=>e.getAttribute('points').trim().split(/\s+/).map(p=>p.split(',').map(Number));
    return {audit:MuseCore.audit(svg),text:svg.textContent,rays:[...svg.querySelectorAll('[data-lens-ray]')].map(g=>({id:g.getAttribute('data-lens-ray'),lines:[...g.querySelectorAll('polyline')].map(e=>({points:points(e),dash:e.getAttribute('stroke-dasharray')})),heads:[...g.querySelectorAll('polygon')].flatMap(points)})),polylines:[...svg.querySelectorAll('polyline')].map(points),labelMasks:[...svg.querySelectorAll('text')].filter(e=>['物','像'].includes(e.textContent)).map(e=>{const q=e.previousElementSibling;if(q?.tagName!=='rect')throw Error('missing object/image label backing');return {kind:e.textContent==='物'?'object':'image',x:Number(q.getAttribute('x')),y:Number(q.getAttribute('y')),w:Number(q.getAttribute('width')),h:Number(q.getAttribute('height'))}})};
   }catch(e){return {error:e.message}}finally{CanvasRenderingContext2D.prototype.measureText=original}
  },{input,pressure});
  for(const c of lensInputs())for(const pressure of [0,40])await t.test(c.name+(pressure?'-plus40':''),async()=>{
   const snapshot=structuredClone(c.input),r=await draw(c.input,pressure),m=thinLens(c.input.focalLength,c.input.objectDistance,c.input.objectHeight);assert.equal(r.error,undefined);assert.deepEqual(c.input,snapshot);assert.deepEqual(r.audit.findings,[]);const g=r.audit.geometry,X=x=>g.cx+x*g.scale,Y=y=>g.y0-y*g.scale;
   for(const key of Object.keys(m))assert.deepEqual(g[key],m[key]);
   for(const text of [c.input.title,c.input.subtitle,c.input.note,c.input.unit])assert(r.text.replace(/\s/g,'').includes(text.replace(/\s/g,'')),'complete supplied text');
   const f=c.input.focalLength,d=c.input.objectDistance,h=c.input.objectHeight,lo=Math.min(-d,m.imageDistance??0,-2*f)*1.18,up=Math.max(2*f,m.imageDistance??0)*1.18;
   near(g.scale,Math.min(1600/(up-lo),540/(2*Math.max(h,Math.abs(m.imageHeight??0))*1.45))); // Preserve the previous common-scale readability range.
   assert.equal(r.rays.length,m.imageDistance===null?2:3);assert.equal(g.rayPaths.length,r.rays.length);
   for(const ray of g.rayPaths){
    assert.deepEqual(ray.incident[0],g.rays.objectTip);assert.equal(ray.incident[1][0],g.cx);assert(ray.outgoing[1][0]>ray.outgoing[0][0]);assert(ray.visibleOutgoing[1][0]>ray.visibleOutgoing[0][0]);collinear(...ray.outgoing,ray.visibleOutgoing[1]);
    const drawn=r.rays.find(p=>p.id===ray.id);assert.deepEqual(drawn.lines[0].points,ray.incident);assert.deepEqual(drawn.lines[1].points,ray.visibleOutgoing);assert.equal(drawn.lines[0].dash,null);assert.equal(drawn.lines[1].dash,null);
    if(m.imageDistance!==null){collinear(...ray.outgoing,[X(m.imageDistance),Y(m.imageHeight)]);if(m.imageDistance<0){assert.deepEqual(ray.backExtension[1],[X(m.imageDistance),Y(m.imageHeight)]);assert(ray.backExtension[1][0]<ray.backExtension[0][0]);assert.deepEqual(drawn.lines[2].points,ray.backExtension);assert(drawn.lines[2].dash)}else assert.equal(drawn.lines.length,2)}
    // Check the actual rendered arrowheads, including steep rays clipped by the panel.
    for(const [x,y]of drawn.heads){assert(x>=g.plot.x&&x<=g.plot.x+g.plot.w);assert(y>=g.plot.y&&y<=g.plot.y+g.plot.h)}
   }
   const first=g.rayPaths[0],center=g.rayPaths[1];near(first.incident[0][1],first.incident[1][1]);collinear(...first.outgoing,[X(f),g.y0]);collinear(...center.incident,center.outgoing[1]);
   if(m.imageDistance===null){const slope=p=>(p[1][1]-p[0][1])/(p[1][0]-p[0][0]);near(slope(first.outgoing),slope(center.outgoing));assert(r.text.includes('两束出射光平行'))}else{const third=g.rayPaths[2];near(third.outgoing[0][1],third.outgoing[1][1]);collinear(...third.incident,[X(-f),g.y0])}
   assert.equal(r.labelMasks.length,m.imageDistance===null?1:2);
   for(const mask of r.labelMasks){const x=mask.kind==='object'?X(-d):X(m.imageDistance),height=mask.kind==='object'?h:m.imageHeight,tip=Y(height),above=height>0;assert(above?mask.y+mask.h<=tip-9:mask.y>=tip+9,'label backing invades arrow tip');assert(mask.y>=g.plot.y&&mask.y+mask.h<=g.plot.y+g.plot.h);assert(r.polylines.some(points=>points.length===2&&points[0][0]===x&&points[1][0]===x&&points[0][1]===g.y0&&points[1][1]===tip),'actual object/image arrow stem retained')}
   for(const mark of g.focalMarks)near(mark.x,X(mark.value));for(const tick of g.coordinateTicks)near(tick.x,X(tick.value));near(g.dimensions[0].start,X(-d));near(g.dimensions[0].end,X(0));assert.equal(g.dimensions[1].end,m.imageDistance===null?null:X(m.imageDistance));assert.equal(g.comparisonRows.filter(row=>row.selected).length,c.input.comparisons.filter(q=>q===d).length);
  });
  for(const [name,edit,pattern]of [['null-focal-length',b=>b.focalLength=null,/positive/],['negative-object',b=>b.objectDistance=-1,/positive/],['null-height',b=>b.objectHeight=null,/positive/],['one-comparison',b=>b.comparisons=[30],/2.*6/],['claimed-measurement',b=>b.measuredImageDistance=15,/unsupported field/],['too-near-focus-below',b=>b.objectDistance=9.5,/unreadable/],['too-near-focus-above',b=>b.objectDistance=10.5,/unreadable/]])await t.test('reject '+name,async()=>{const input=structuredClone(base);edit(input);assert.match((await draw(input)).error,pattern)});
 }finally{await browser.close()}
});
