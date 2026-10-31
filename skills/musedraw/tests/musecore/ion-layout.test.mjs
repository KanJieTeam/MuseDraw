function checkTransferAttachments(r,g,m){
 assert.equal(r.locators,0,'vacant anchors add no electron-like visible marks');
 assert.equal(g.vacantAnchors.length,m.transferredCount);
 const distance=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],d=dx*dx+dy*dy,t=d?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/d)):0;return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)};
 let branches=0;
 for(const mark of g.transferMarks){
  const edge=m.transferEdges.find(e=>e.from===mark.from&&e.to===mark.to),dom=r.transfers.find(e=>e.key===mark.from+'/'+mark.to);
  assert.deepEqual(mark.electrons,edge.electrons);assert.equal(mark.count,edge.count);assert.deepEqual(dom.points,mark.points);
  assert.equal(dom.sources.length,edge.count);assert.equal(dom.destinations.length,edge.count);
  for(const id of edge.electrons){
   branches++;const transfer=m.transfers.find(t=>t.id===id),source=g.electronMarks.find(e=>e.state==='before'&&e.atom===transfer.from&&e.shell===m.atoms.find(a=>a.id===transfer.from).shells.length-1&&e.index===transfer.fromElectron),anchor=g.vacantAnchors.find(a=>a.transferId===id),after=g.electronMarks.find(e=>e.transferred&&e.transferId===id),sourceLead=mark.sourceLeads.find(e=>e.transferId===id),targetLead=mark.targetLeads.find(e=>e.transferId===id),sourceDom=dom.sources.find(e=>e.id===id),targetDom=dom.destinations.find(e=>e.id===id),beforeAtom=g.atomMarks.find(a=>a.id===transfer.to&&a.state==='before'),afterAtom=g.atomMarks.find(a=>a.id===transfer.to&&a.state==='after');
   assert.equal(sourceLead.atom,transfer.from);assert.equal(sourceLead.index,transfer.fromElectron);assert.equal(anchor.atom,transfer.to);assert.equal(anchor.index,m.atoms.find(a=>a.id===transfer.to).shells.at(-1)+transfer.toElectron);
   assert.deepEqual(sourceDom.points,sourceLead.points);assert.deepEqual(targetDom.points,targetLead.points);
   near(Math.hypot(sourceDom.points[0][0]-source.x,sourceDom.points[0][1]-source.y),8);
   const sourceAtom=g.atomMarks.find(a=>a.id===transfer.from&&a.state==='before');assert(Math.hypot(sourceDom.points[0][0]-sourceAtom.x,sourceDom.points[0][1]-sourceAtom.y)>Math.hypot(source.x-sourceAtom.x,source.y-sourceAtom.y),'lead leaves the source electron outward');
   near(targetDom.points.at(-1)[0],anchor.x);near(targetDom.points.at(-1)[1],anchor.y);near(targetDom.head[0][0],anchor.x);near(targetDom.head[0][1],anchor.y);
   for(const e of g.electronMarks.filter(e=>e.state==='before'&&e.atom===transfer.to))assert(Math.hypot(e.x-anchor.x,e.y-anchor.y)>13,'destination must not point at an existing electron');
   near(anchor.x,after.x);near(anchor.y-beforeAtom.y,after.y-afterAtom.y);
   for(const e of g.electronMarks.filter(e=>e.state==='before'&&e.atom===transfer.to)){const same=g.electronMarks.find(a=>a.state==='after'&&a.atom===e.atom&&a.shell===e.shell&&a.index===e.index);near(e.x,same.x);near(e.y-beforeAtom.y,same.y-afterAtom.y)}
   for(const points of [sourceDom.points,targetDom.points,dom.points])for(const atom of g.atomMarks){if(atom.state==='before'&&(atom.id===transfer.from||atom.id===transfer.to))continue;const radius=Math.max(...g.shellMarks.filter(e=>e.state===atom.state&&e.atom===atom.id).map(e=>e.radius));for(let i=1;i<points.length;i++)assert(distance([atom.x,atom.y],points[i-1],points[i])>radius+7,'transfer route enters unrelated shell '+id+'/'+atom.id+'/'+atom.state)}
  }
 }
 assert.equal(branches,m.transferredCount);
}
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {editorHtml} from '../../scripts/musecore.mjs';
import {ionicTransferModel} from '../../scripts/musecore/ion-models.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const base=JSON.parse(await fs.readFile(new URL('../../assets/musecore/ionic-transfer.json',import.meta.url),'utf8'));
const near=(a,b)=>assert(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
function ionInputs(){
 const ionic=(element,count,anion,anionCount)=>({...structuredClone(base),note:'图中按明确给定的最简离子数量比核对电子与电荷；点和叉只区分电子来源，不表示固定的分子配对或实际晶格位置。',cation:{element,count,label:element},anion:{element:anion,count:anionCount,label:anion}});
 const cases=[{name:'default',input:structuredClone(base)}];
 for(const [name,input]of [['MgO',ionic('Mg',1,'O',1)],['CaCl2',ionic('Ca',1,'Cl',2)],['Al2O3',ionic('Al',2,'O',3)],['LiF',ionic('Li',1,'F',1)],['K2S',ionic('K',2,'S',1)]])cases.push({name,input});
 let input=ionic('Al',2,'O',3);input.title='电子来源、电子层和净电荷：在给定的最简离子数量比中逐个核对全部电子';input.subtitle='两种明确给定的简单主族元素，从中性原子到形成离子：电子均为同一种粒子，点和叉仅区别来源；图中位置、圆圈大小与箭头不表示电子轨迹或真实晶格。';input.cation.label='本例明确给定并可逐一核对电子层的金属铝';input.anion.label='本例明确给定并可逐一核对电子层的非金属氧';input.note='最简离子数量比由显式给定的离子个数与电荷共同决定。转移前后保持总电子数和总电荷守恒；点和叉用于区别电子的来源，而不是两类不同的粒子。本图不把化学式解释为独立分子，也不从二维排列推断真实固体中的离子间距或晶格空间位置。';cases.push({name:'long-five-atoms',input});
 for(const [name,source]of [['maximum-text-three',cases.find(c=>c.name==='CaCl2').input],['maximum-text-five',cases.find(c=>c.name==='Al2O3').input]]){const input=structuredClone(source);input.title='题'.repeat(72);input.subtitle='说明'.repeat(80);input.note='备注'.repeat(110);input.cation.label='甲'.repeat(32);input.anion.label='乙'.repeat(32);cases.push({name,input})}
 return cases;
}

test('electron-shell composition preserves every electron, transfer identity and supplied text',{timeout:180000},async t=>{
 const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({...resolveBrowser(pw),headless:true});
 try{
  const page=await browser.newPage();await page.route(/^https?:\/\//,r=>r.abort());await page.setContent(await editorHtml(base));await page.waitForFunction(()=>window.MUSECORE_READY===true);
  const draw=(input,pressure=0)=>page.evaluate(async({input,pressure})=>{
   const original=CanvasRenderingContext2D.prototype.measureText;
   if(pressure)CanvasRenderingContext2D.prototype.measureText=function(text){const m=original.call(this,text);return new Proxy(m,{get(o,k){return k==='fontBoundingBoxAscent'?Reflect.get(o,k,o)+pressure:Reflect.get(o,k,o)}})};
   try{
    const svg=MuseCore.render(input);document.getElementById('output').replaceChildren(svg);await document.fonts.ready;
    const points=e=>e.getAttribute('points').split(/\s+/).map(p=>p.split(',').map(Number));
    return {audit:MuseCore.audit(svg),text:svg.textContent,atoms:[...svg.querySelectorAll('[data-ion-state]')].map(g=>({id:g.getAttribute('data-ion-atom'),state:g.getAttribute('data-ion-state'),rings:[...g.querySelectorAll('[data-electron-shell]')].map(e=>({x:Number(e.getAttribute('cx')),y:Number(e.getAttribute('cy')),r:Number(e.getAttribute('r'))})),electrons:[...g.querySelectorAll('[data-electron]')].map(e=>e.tagName==='circle'?{type:'dot',x:Number(e.getAttribute('cx')),y:Number(e.getAttribute('cy')),r:Number(e.getAttribute('r'))}:{type:'cross',points:points(e),other:points(e.nextElementSibling)})})),transfers:[...svg.querySelectorAll('[data-ion-transfer]')].map(g=>({key:g.getAttribute('data-ion-transfer'),points:points(g.querySelector('polyline')),sources:[...g.querySelectorAll('[data-ion-source]')].map(e=>({id:e.getAttribute('data-ion-source'),points:points(e.querySelector('polyline'))})),destinations:[...g.querySelectorAll('[data-ion-destination]')].map(e=>({id:e.getAttribute('data-ion-destination'),points:points(e.querySelector('polyline')),head:points(e.querySelector('polygon'))}))})),locators:svg.querySelectorAll('[data-vacancy-locator]').length,boxes:[...svg.querySelectorAll('text')].map(e=>{const b=e.getBBox();return {text:e.textContent,x:b.x,y:b.y,w:b.width,h:b.height}})};
   }catch(e){return {error:e.message}}finally{CanvasRenderingContext2D.prototype.measureText=original}
  },{input,pressure});
  for(const c of ionInputs())for(const pressure of [0,40])await t.test(c.name+(pressure?'-plus40':''),async()=>{
   const snapshot=structuredClone(c.input),m=ionicTransferModel(c.input),r=await draw(c.input,pressure);assert.equal(r.error,undefined);assert.deepEqual(c.input,snapshot);assert.deepEqual(r.audit.findings,[]);const g=r.audit.geometry;
   for(const key of Object.keys(m))assert.deepEqual(g[key],m[key]);
   for(const text of [c.input.title,c.input.subtitle,c.input.note,c.input.cation.label,c.input.anion.label])assert(r.text.replace(/\s/g,'').includes(text.replace(/\s/g,'')),'complete supplied text');
   assert.equal(r.atoms.length,m.atoms.length*2);assert.equal(g.electronMarks.length,m.electronTotal*2);assert.equal(g.shellScale.maximumShellCount,Math.max(...m.atoms.map(a=>a.shells.length)));assert(g.shellScale.shellStep>=20);
   for(const state of ['before','after']){
    assert.equal(g.electronMarks.filter(e=>e.state===state).length,m.electronTotal);
    for(const a of m.atoms){
     const dom=r.atoms.find(z=>z.id===a.id&&z.state===state),atom=g.atomMarks.find(z=>z.id===a.id&&z.state===state),shells=state==='before'?a.shells:a.ionShells;
     assert.equal(dom.rings.length,shells.length);assert.equal(dom.electrons.length,shells.reduce((sum,n)=>sum+n,0));assert.equal(atom.nuclearCharge-atom.electrons,atom.charge);
     for(let i=0;i<shells.length;i++){const ring=dom.rings[i],marks=g.electronMarks.filter(e=>e.state===state&&e.atom===a.id&&e.shell===i);assert.equal(marks.length,shells[i]);near(ring.r,g.shellScale.firstRadius+i*g.shellScale.shellStep);near(ring.x,atom.x);near(ring.y,atom.y);for(const mark of marks)near(Math.hypot(mark.x-ring.x,mark.y-ring.y),ring.r)}
     for(const e of dom.electrons){
      const x=e.type==='dot'?e.x:(e.points[0][0]+e.points[1][0])/2,y=e.type==='dot'?e.y:(e.points[0][1]+e.points[1][1])/2,marks=g.electronMarks.filter(mark=>mark.state===state&&mark.atom===a.id&&Math.hypot(mark.x-x,mark.y-y)<1e-7);assert.equal(marks.length,1,'actual rendered particle matches one model electron');assert.equal(marks[0].transferred,e.type==='cross');
      if(e.type==='dot')assert.equal(e.r,6.5);else{assert.equal(e.points.length,2);assert.equal(e.other.length,2);near(e.points[0][0]+e.points[1][0],e.other[0][0]+e.other[1][0]);near(e.points[0][1]+e.points[1][1],e.other[0][1]+e.other[1][1])}
     }
     // Nuclear charge labels belong inside the nucleus; all other actual glyphs stay outside electron shells.
     const radius=dom.rings.at(-1).r;
     for(const q of r.boxes){if(m.atoms.some(a=>q.text==='+'+a.Z))continue;const x=Math.max(q.x,Math.min(atom.x,q.x+q.w)),y=Math.max(q.y,Math.min(atom.y,q.y+q.h));assert(Math.hypot(x-atom.x,y-atom.y)>radius+7,'glyph enters electron shell '+a.id+'/'+state+'/'+q.text)}
    }
   }
   assert.deepEqual(g.electronMarks.filter(e=>e.transferred).map(e=>e.transferId).sort(),m.transfers.map(e=>e.id).sort());assert.equal(g.transferMarks.length,m.transferEdges.length);assert.equal(r.transfers.length,m.transferEdges.length);
   checkTransferAttachments(r,g,m);
   assert.equal(g.proof.length,7);assert(g.proof[2].y+g.proof[2].plan.height<g.panels.after.top);assert(g.proof[3].y>=g.panels.after.top);assert(!r.text.includes('锂离子外层'));
   if(m.cation.element==='Li')assert(r.text.replace(/\s/g,'').includes('Li⁺为2个'),'Li input retains its calculated outer-shell count');
   if(c.name==='default'){assert.equal(g.shellMarks.find(e=>e.state==='before'&&e.shell===2).radius,150);assert.equal(g.formula,'NaCl')}
  });
  for(const [name,edit,pattern]of [['unbalanced-ratio',b=>b.anion.count=2,/conserve/],['not-simplest',b=>{b.cation.count=2;b.anion.count=2},/simplest/],['transition-metal',b=>b.cation.element='Fe',/unsupported/],['wrong-role',b=>b.cation.element='Cl',/unsupported/],['zero-count',b=>b.cation.count=0,/integer/],['null-count',b=>b.cation.count=null,/integer/],['shell-override',b=>b.cation.shells=[2,8,2],/unsupported field/],['charge-override',b=>b.cation.charge=2,/unsupported field/],['label-overflow',b=>b.anion.label='字'.repeat(33),/at most 32/]])await t.test('reject '+name,async()=>{const input=structuredClone(base);edit(input);assert.throws(()=>ionicTransferModel(input),pattern);assert.match((await draw(input)).error,pattern)});
 }finally{await browser.close()}
});
