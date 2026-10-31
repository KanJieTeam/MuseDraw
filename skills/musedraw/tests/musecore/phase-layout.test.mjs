import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {editorHtml} from '../../scripts/musecore.mjs';
import {moonPhasesModel} from '../../scripts/musecore/phase-models.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const base=JSON.parse(await fs.readFile(new URL('../../assets/musecore/moon-phases.json',import.meta.url),'utf8'));
const near=(a,b,tolerance=1e-8)=>assert(Math.abs(a-b)<tolerance,`${a} != ${b}`);
function phaseLayoutInputs(){
 const clone=()=>structuredClone(base),cases=[{name:'default',input:base}];
 for(const count of [2,3,4,5,6,7]){const input=clone();input.phases=input.phases.slice(0,count);cases.push({name:count+'-phases',input})}
 let input=clone();input.observerHemisphere='south';input.view='south-up';cases.push({name:'south-up',input});
 input=clone();input.phases=input.phases.map((p,i)=>({...p,label:'给定相位 '+i*25+'°',detail:'仅按给定几何计算亮面',elongationDegrees:i*25}));cases.push({name:'eight-minimum-gap-cluster',input});
 input=clone();input.phases=[{id:'zero',label:'给定零度条件',detail:'明确给定的几何相位',elongationDegrees:0},{id:'wrap',label:'给定三百三十五度条件',detail:'明确给定的几何相位',elongationDegrees:335}];cases.push({name:'across-zero-minimum-gap',input});
 input=clone();input.phases=[{id:'a',label:'给定相位三十度',detail:'明确给定的几何相位',elongationDegrees:30},{id:'b',label:'给定相位一百五十度',detail:'明确给定的几何相位',elongationDegrees:150},{id:'c',label:'给定相位二百六十度',detail:'明确给定的几何相位',elongationDegrees:260}];cases.push({name:'noncanonical-phases',input});
 input=clone();input.title='同一轮月亮与可见亮面的几何对应关系：完整保留调用方文字与明确的观察方向';input.subtitle='较长副标题用于检查整页重排：月亮在轨道上的受光半球与地球观察者可见的月面并非同一张投影图，不从相位推断真实活动日期、天气、月出时间或天空旋转。';input.phases.forEach((p,i)=>{p.label='第'+(i+1)+'个完整保留的相位名称与教学说明';p.detail='由太阳、地球、月亮的给定几何计算明暗交界线；朝向地球的受光投影面积由相位角确定，文字不应被截断。'});input.note=base.note.repeat(3);cases.push({name:'long-eight',input});
 return cases;
}

test('moon-phase composition preserves geometry and complete text without intruding into lunar discs',{timeout:180000},async t=>{
 const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({...resolveBrowser(pw),headless:true});
 try{
  const page=await browser.newPage();await page.route(/^https?:\/\//,r=>r.abort());await page.setContent(await editorHtml(base));await page.waitForFunction(()=>window.MUSECORE_READY===true);
  const draw=(input,pressure=0)=>page.evaluate(async({input,pressure})=>{
   const original=CanvasRenderingContext2D.prototype.measureText;
   if(pressure)CanvasRenderingContext2D.prototype.measureText=function(v){const m=original.call(this,v);return new Proxy(m,{get(t,k){return k==='fontBoundingBoxAscent'?t.fontBoundingBoxAscent+pressure:Reflect.get(t,k,t)}})};
   try{
    const svg=MuseCore.render(input);document.getElementById('output').replaceChildren(svg);await document.fonts.ready;const audit=MuseCore.audit(svg),g=audit.geometry;
    const boxes=[...svg.querySelectorAll('text')].map(e=>{const q=e.getBBox();return {text:e.textContent,x:q.x,y:q.y,w:q.width,h:q.height}}),areas=[];
    // Integrate the rendered SVG silhouette, independently of model metadata.
    for(const d of g.specimens){const path=svg.querySelector('[data-phase-lit="phase-visible-'+d.index+'"]');if(!path){areas.push({id:d.id,fraction:0});continue}let disk=0,lit=0;const point=svg.createSVGPoint(),N=100;for(let yi=0;yi<N;yi++)for(let xi=0;xi<N;xi++){const x=-1+(xi+.5)*2/N,y=-1+(yi+.5)*2/N;if(x*x+y*y>1)continue;disk++;point.x=d.cx+x*d.r;point.y=d.cy+y*d.r;if(path.isPointInFill(point))lit++}areas.push({id:d.id,fraction:lit/disk})}
    return {audit,boxes,areas,text:svg.textContent,fonts:[...svg.querySelectorAll('text')].map(e=>Number(e.getAttribute('font-size'))),hatch:!!svg.querySelector('#phase-shadow-hatch'),moonCount:svg.querySelectorAll('[data-phase-disc^="phase-visible-"]').length};
   }catch(e){return {error:e.message}}finally{CanvasRenderingContext2D.prototype.measureText=original}
  },{input,pressure});
  for(const c of phaseLayoutInputs())for(const pressure of [0,40])await t.test(c.name+(pressure?'-plus40':''),async()=>{
   const snapshot=structuredClone(c.input),model=moonPhasesModel(c.input),r=await draw(c.input,pressure);assert.equal(r.error,undefined);assert.deepEqual(c.input,snapshot);assert.deepEqual(r.audit.findings,[]);const g=r.audit.geometry;
   assert.equal(g.material.startsWith('warm paper'),true);assert(r.hatch);assert.equal(r.moonCount,model.phases.length);assert.deepEqual(g.phases,model.phases);assert.deepEqual(g.orbitNodes.map(n=>n.id),g.specimens.map(n=>n.id));
   for(const text of [c.input.title,c.input.subtitle,c.input.note,...c.input.phases.flatMap(p=>[p.label,p.detail])])assert(r.text.replace(/\s/g,'').includes(text.replace(/\s/g,'')),'complete supplied text');
   for(const size of [47,27,24,22,21,20,19,18])assert(r.fonts.includes(size),'existing type size '+size);
   for(const p of model.phases){const node=g.orbitNodes.find(n=>n.id===p.id),disc=g.specimens.find(n=>n.id===p.id);near(node.x,g.orbit.cx+p.orbit.x*g.orbit.r);near(node.y,g.orbit.cy-p.orbit.y*g.orbit.r);assert.equal(node.litSide,'right');assert.equal(disc.litSide,p.litSide);near(disc.terminatorCoefficient,p.terminatorCoefficient);near(r.areas.find(a=>a.id===p.id).fraction,p.illuminatedFraction,.006)}
   // The revolution marker must remain visible when caller-supplied angles move.
   for(const node of g.orbitNodes)for(let i=1;i<g.orbit.directionMarker.points.length;i++){const a=g.orbit.directionMarker.points[i-1],z=g.orbit.directionMarker.points[i],dx=z[0]-a[0],dy=z[1]-a[1],u=Math.max(0,Math.min(1,((node.x-a[0])*dx+(node.y-a[1])*dy)/(dx*dx+dy*dy)));assert(Math.hypot(node.x-a[0]-u*dx,node.y-a[1]-u*dy)>node.r+3,'revolution marker invades a supplied orbit Moon')}
   for(const disc of [...g.specimens.map(p=>({id:p.id,x:p.cx,y:p.cy,r:p.r})),...g.orbitNodes.map(p=>({id:p.id,x:p.x,y:p.y,r:p.r}))])for(const q of r.boxes){const distance=Math.hypot(disc.x-Math.max(q.x,Math.min(disc.x,q.x+q.w)),disc.y-Math.max(q.y,Math.min(disc.y,q.y+q.h)));assert(distance>=disc.r-1,'actual glyphs invade lunar disc '+disc.id+' / '+q.text)}
   if(c.name==='default'&&!pressure){assert(g.width/g.height>1.7);assert(g.specimens.every(p=>p.r>53));assert(g.orbit.r>235)}
  });
  for(const [name,change,pattern]of [['calendar-date',b=>b.date='2026-10-31',/unknown field date/],['single-phase',b=>b.phases=b.phases.slice(0,1),/2..8/],['duplicate-angle',b=>b.phases[1].elongationDegrees=0,/separation/],['angle-too-close',b=>b.phases[1].elongationDegrees=24.99,/separation/],['wrong-view',b=>b.view='south-up',/hemisphere/],['null-angle',b=>b.phases[0].elongationDegrees=null,/elongationDegrees/]])await t.test('reject '+name,async()=>{const b=structuredClone(base);change(b);assert.throws(()=>moonPhasesModel(b),pattern);assert.match((await draw(b)).error,pattern)});
 }finally{await browser.close()}
});
