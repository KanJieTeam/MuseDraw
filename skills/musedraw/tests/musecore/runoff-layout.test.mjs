import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {editorHtml} from '../../scripts/musecore.mjs';
import {runoffResponseModel} from '../../scripts/musecore/runoff-models.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const base=JSON.parse(await fs.readFile(new URL('../../assets/musecore/runoff-response.json',import.meta.url),'utf8'));
const near=(a,b)=>assert(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
function inputs(){
 const clone=()=>structuredClone(base),cases=[{name:'default',input:clone()}];
 let input=clone();input.areaKm2=1;input.effectiveRainMm=[10];input.responsePerHour=[0,.25,.5,.25];cases.push({name:'pulse',input});
 input=structuredClone(input);input.dtHours=.5;input.responsePerHour=input.responsePerHour.map(v=>v*2);cases.push({name:'half-hour',input});
 input=clone();input.effectiveRainMm=[10];input.responsePerHour=[0,0,0,1];cases.push({name:'complete-terminal-tail',input});
 input=clone();input.effectiveRainMm=[0,0,0];cases.push({name:'zero-rain',input});
 input=clone();input.effectiveRainMm=[10];input.responsePerHour=[.5,.5];cases.push({name:'tied-peaks',input});
 input=clone();input.dtHours=.5;input.effectiveRainMm=Array.from({length:16},(_,i)=>i%5);input.responsePerHour=Array(16).fill(.125);cases.push({name:'maximum-thirty-one-flow-bins',input});
 const network=(pairs)=>pairs.map(([id,downstream],i)=>({id,downstream,label:'明确输入节点 '+(i+1)}));
 input=clone();input.network.nodes=network([['out',null],['a','out'],['b','out'],['a1','a'],['a2','a'],['a3','a'],['b1','b'],['b2','b'],['x1','a1'],['x2','a1'],['x3','a2'],['x4','b1']]);cases.push({name:'twelve-nodes-six-sources',input});
 input=clone();input.network.nodes=network([['out',null],['a','out'],['b','out'],['a1','a'],['a2','a1'],['a3','a2']]);cases.push({name:'five-level-asymmetric',input});
 input=clone();input.network.nodes=network([['out',null],['a','out'],['b','out'],['c','out']]);cases.push({name:'three-way-junction',input});
 input=clone();input.dtHours=.1;input.effectiveRainMm=[1,2,3];input.responsePerHour=[10,0];cases.push({name:'instantaneous-kernel-zero-lag',input});
 input=structuredClone(input);input.responsePerHour=[10*(1+5e-10),0];cases.push({name:'accepted-kernel-integral-roundoff',input});
 input=structuredClone(input);input.responsePerHour=[10-1e-8,1e-8];cases.push({name:'subpixel-positive-lag',input});
 input=structuredClone(cases.find(c=>c.name==='twelve-nodes-six-sources').input);input.title='给定有效降雨与完整离散单位响应共同决定的示意流域出口径流过程：逐一核对全部输入时格、总体积和给定支流连接';input.network.outletLabel='输入明确指定的唯一出口断面位置';input.network.nodes.forEach((n,i)=>n.label='这是输入明确给定并可逐一核对的第'+(i+1)+'个河网连接节点');input.note='有效雨量已经由输入明确给出，本图不根据总降雨量猜测蒸发、下渗或其他损失，也不把河网形状自动换算成汇流时间。全部输入雨格和响应核都保留在完整卷积时轴中，末尾非零响应不能为了缩短图面而删除。左侧河网是明确给定的拓扑示意，线宽说明河级，不表示真实河流宽度或地理边界；右侧流量是时间格内平均值，不能当作实际流域预报。';cases.push({name:'long-twelve-nodes',input});
 return cases;
}
function sampleCurve(points){return Array.from({length:81},(_,i)=>{const t=i/80,u=1-t;return [0,1].map(k=>u*u*u*points[0][k]+3*u*u*t*points[1][k]+3*u*t*t*points[2][k]+t*t*t*points[3][k])})}
function distanceToSegment(p,a,z){const dx=z[0]-a[0],dy=z[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(p[0]-a[0]-u*dx,p[1]-a[1]-u*dy)}
const cross=(a,z,p)=>(z[0]-a[0])*(p[1]-a[1])-(z[1]-a[1])*(p[0]-a[0]);
const properHit=(a,z,b,q)=>cross(a,z,b)*cross(a,z,q)<-1e-6&&cross(b,q,a)*cross(b,q,z)<-1e-6;

test('runoff drawing preserves supplied topology and complete time series with explicit centroid anchors',{timeout:180000},async t=>{
 const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({...resolveBrowser(pw),headless:true});
 try{
  const page=await browser.newPage();await page.route(/^https?:\/\//,r=>r.abort());await page.setContent(await editorHtml(base));await page.waitForFunction(()=>window.MUSECORE_READY===true);
  const draw=(input,pressure=0)=>page.evaluate(async({input,pressure})=>{
   const original=CanvasRenderingContext2D.prototype.measureText;
   if(pressure)CanvasRenderingContext2D.prototype.measureText=function(text){const metrics=original.call(this,text);return new Proxy(metrics,{get(o,k){return k==='fontBoundingBoxAscent'?Reflect.get(o,k,o)+pressure:Reflect.get(o,k,o)}})};
   try{const svg=MuseCore.render(input);document.getElementById('output').replaceChildren(svg);await document.fonts.ready;return {audit:MuseCore.audit(svg),text:svg.textContent,edges:[...svg.querySelectorAll('[data-river-edge]')].map(p=>p.getAttribute('d')),guides:[...svg.querySelectorAll('[data-runoff-centroid-guide]')].map(p=>({kind:p.getAttribute('data-runoff-centroid-guide'),points:p.getAttribute('points')}))}}catch(e){return {error:e.message}}finally{CanvasRenderingContext2D.prototype.measureText=original}
  },{input,pressure});
  for(const c of inputs())for(const pressure of [0,40])await t.test(c.name+(pressure?'-plus40':''),async()=>{
   const snapshot=structuredClone(c.input),model=runoffResponseModel(c.input),r=await draw(c.input,pressure);assert.equal(r.error,undefined);assert.deepEqual(c.input,snapshot);assert.deepEqual(r.audit.findings,[]);const g=r.audit.geometry;
   assert.deepEqual(g.flow,model.flow);assert.deepEqual(g.rain,model.rain);assert.deepEqual(g.network,model.network);near(g.inputVolumeM3,g.outputVolumeM3);assert.equal(g.flowSteps.length,2*model.flow.length+2);assert.equal(g.flowSteps.at(-1)[0],g.plot.x+g.plot.w);
   for(const text of [c.input.title,c.input.subtitle,c.input.note,c.input.network.outletLabel,...c.input.network.nodes.map(n=>n.label)])assert(r.text.replace(/\s/g,'').includes(text.replace(/\s/g,'')),'supplied text retained');
   assert(r.text.replace(/\s/g,'').includes('出口节点河级'+model.network.maxOrder));assert.equal(g.riverEdges.length,model.network.nodes.length-1);assert.equal(g.riverNodes.length,model.network.nodes.length);assert.deepEqual(r.edges,g.riverEdges.map(e=>e.path));
   const curves=[];for(const edge of g.riverEdges){const node=model.network.nodes.find(n=>n.id===edge.from),a=g.riverNodes.find(n=>n.id===edge.from),z=g.riverNodes.find(n=>n.id===edge.to);assert.equal(edge.to,node.downstream);assert.equal(edge.order,node.order);assert.deepEqual(edge.controlPoints[0],[a.x,a.y]);assert.deepEqual(edge.controlPoints[3],[z.x,z.y]);const points=sampleCurve(edge.controlPoints);for(const other of g.riverNodes.filter(n=>n.id!==edge.from&&n.id!==edge.to))for(let j=1;j<points.length;j++)assert(distanceToSegment([other.x,other.y],points[j-1],points[j])>5,'river crosses unrelated junction '+other.id);curves.push({...edge,points})}
   for(let i=0;i<curves.length;i++)for(let j=i+1;j<curves.length;j++){const a=curves[i],z=curves[j];if([a.from,a.to].some(id=>id===z.from||id===z.to))continue;for(let q=1;q<a.points.length;q++)for(let k=1;k<z.points.length;k++)assert(!properHit(a.points[q-1],a.points[q],z.points[k-1],z.points[k]),'nonincident river segments cross')}
   for(const item of g.riverOrderLegend){const edges=g.riverEdges.filter(e=>e.order===item.order);assert.equal(item.count,edges.length);assert(edges.every(e=>e.width===item.width))}assert.equal(g.riverOrderLegend.reduce((sum,o)=>sum+o.count,0),g.riverEdges.length);
   if(model.centroidLagHours===null){assert.equal(g.centroidMarkers,null);assert.deepEqual(r.guides,[])}else{
    assert.deepEqual(r.guides.map(p=>p.kind),['rain','response']);const markers=g.centroidMarkers;near(markers.lag,model.kernelMeanLagHours/model.kernelIntegral);assert.equal(markers.rawLagHours,model.centroidLagHours);
    // Weighted-centroid subtraction and the independent kernel first moment differ only by floating arithmetic.
    assert(Math.abs(markers.rawResidualHours)<=Number.EPSILON*256*Math.max(1,model.durationHours));
    for(const kind of ['rain','response']){const time=kind==='rain'?model.rainCentroidHour:model.flowCentroidHour,x=g.plot.x+time/model.durationHours*g.plot.w;near(markers[kind].x,x);const points=r.guides.find(p=>p.kind===kind).points.split(/[,\s]+/).map(Number);near(points[0],x);near(points[2],x)}
    if(c.name.includes('zero-lag')||c.name.includes('integral-roundoff')){assert.equal(markers.lag,0);assert(r.text.includes('质心滞后 0 h'));assert(r.text.includes('雨量与响应质心重合'))}
   }
   if(c.name==='subpixel-positive-lag'){assert(g.centroidMarkers.lag>0);assert(!r.text.includes('雨量与响应质心重合'));assert(g.centroidMarkers.response.x>g.centroidMarkers.rain.x)}
   if(c.name==='default'){assert.deepEqual(g.riverOrderLegend.map(o=>[o.order,o.count]),[[1,4],[2,2]]);assert(!g.riverEdges.some(e=>e.order===3));assert.equal(g.centroidMarkers.lag,3.6)}
  });
  for(const [name,change,pattern]of [['missing-endpoint',b=>b.network.nodes[1].downstream='absent',/unknown/],['detached-cycle',b=>{b.network.nodes[1].downstream='b';b.network.nodes[2].downstream='a'},/disconnected|cyclic/],['nonunit-kernel',b=>b.responsePerHour=[.2,.2],/sum/],['null-rain',b=>b.effectiveRainMm=[null],/finite/],['tail-truncation',b=>b.durationHours=1,/unknown field/],['measured-flow',b=>b.measuredFlowM3s=[10],/unknown field/]])await t.test('reject '+name,async()=>{const input=structuredClone(base);change(input);assert.throws(()=>runoffResponseModel(input),pattern);assert.match((await draw(input)).error,pattern)});
 }finally{await browser.close()}
});
