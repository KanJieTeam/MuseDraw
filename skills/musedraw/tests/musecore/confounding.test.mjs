import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {confoundingModel} from '../../scripts/musecore/confounding-models.mjs';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';
const base=JSON.parse(await fs.readFile(new URL('../../assets/musecore/confounding-panel.json',import.meta.url),'utf8'));
const mutate=f=>{const b=structuredClone(base);f(b);return b};
const inputs=[
 {id:'confounding-default',input:base},
 {id:'confounding-no-hypothesis',input:mutate(b=>b.hypothesis=null)},
 {id:'confounding-fork',input:mutate(b=>b.hypothesis.mediator=null)},
 {id:'confounding-missing',input:mutate(b=>{b.records[3].x=null;b.records[8].y=null})},
 {id:'confounding-zero',input:mutate(b=>b.records.forEach(r=>r.x=0))},
 {id:'confounding-negative',input:mutate(b=>{b.title='一个反向变化的合成示例';b.hypothesis=null;b.records=[{label:'甲',x:0,y:2},{label:'乙',x:1,y:1},{label:'丙',x:2,y:0}]})},
 {id:'confounding-no-complete-pairs',input:mutate(b=>{b.hypothesis=null;b.records=[{label:'甲',x:1,y:null},{label:'乙',x:2,y:null},{label:'丙',x:null,y:1},{label:'丁',x:null,y:2}]})},
 {id:'confounding-long',input:mutate(b=>{b.title='把同步变化的观察与另行提出的解释分开阅读';b.periodLabel='给定次序，不代表真实等长时间';b.series[0].label='明确给定的第一项长名称指标';b.series[1].label='明确给定的第二项长名称指标';b.hypothesis.commonCause='调用者明确提出、尚未在这些记录中测量的共同因素';b.hypothesis.mediator='调用者提出的中介环节及其长名称';b.hypothesis.explanation='右侧每一条实线都是调用者给定的假设关系，不是由左侧的数值自动识别。即使相关系数很高，也没有据此进行控制变量、干预、因果识别或效果估计。';b.records=Array.from({length:24},(_,i)=>({label:'时段'+(i+1),x:i%5===0?null:i+3,y:i%7===0?null:30-i}));b.note='明确保留所有给定周期、空缺值及假设身份。每一列按自身观测最大值显示百分比；原始量纲不同，不能拿同高来比较原始大小。'})}
];
for(const [id,x,y] of [['tiny-perfect',[0,1e-100,2e-100],[0,1e-100,2e-100]],['tiny-zero',[0,1e-100,2e-100],[1e-100,0,1e-100]],['tiny-varying',[0,1e-200,2e-200],[0,1e-200,2e-200]]])inputs.push({id:'confounding-'+id,input:mutate(b=>{b.hypothesis=null;b.title='微小数值的描述性相关回归';b.records=x.map((v,i)=>({label:'时段'+i,x:v,y:y[i]}))})});
inputs.push({id:'confounding-max-hypothesis-text',input:mutate(b=>{b.hypothesis.commonCause='共同因素'.repeat(16);b.hypothesis.mediator='假设环节'.repeat(16)})});
inputs.push({id:'confounding-max-no-hypothesis-text',input:mutate(b=>{b.hypothesis=null;b.title='题'.repeat(80);b.subtitle='说明'.repeat(130)})});
for(const c of inputs)if(c.input.hypothesis===null&&c.input.subtitle===base.subtitle)c.input.subtitle='只对给定记录计算描述性相关，不由相关推出因果。';
const bad=[b=>b.dataKind='verified-effect',b=>b.records.pop()&&b.records.splice(1),b=>b.records[1].label=b.records[0].label,b=>b.records[0].x=-1,b=>b.records[0].y='unknown',b=>b.records.forEach(r=>r.x=null),b=>b.records.push(...structuredClone(b.records),...structuredClone(b.records)),b=>b.series.reverse(),b=>b.hypothesis.status='proved',b=>b.hypothesis.adjustedEffect=0,b=>b.hypothesis.commonCause='',b=>b.hypothesis.mediator=17].map((f,i)=>({id:'confounding-reject-'+(i+1),input:mutate(f)}));
test('correlation uses complete pairs and never creates a causal or adjustment result',()=>{
 const m=confoundingModel(base);assert.equal(m.pairedCount,12);assert(Math.abs(m.correlation-.978)<.0005);assert.equal(m.hypothesis.edges.length,3);assert.equal(m.hypothesis.directClaim.status,'not-established-by-these-records');assert(!Object.hasOwn(m,'adjustedEffect'));
 const b=structuredClone(base);b.records=[{label:'a',x:0,y:0},{label:'b',x:1,y:1},{label:'c',x:2,y:2}];assert(Math.abs(confoundingModel(b).correlation-1)<1e-12);b.records[0].y=2;b.records[2].y=0;assert(Math.abs(confoundingModel(b).correlation+1)<1e-12);b.records[0].y=1;b.records[1].y=0;b.records[2].y=1;assert.equal(confoundingModel(b).correlation,0);
 const missing=confoundingModel(inputs[3].input);assert.equal(missing.pairedCount,10);assert.equal(missing.series[0].segments.length,2);assert.equal(missing.series[1].segments.length,2);assert.equal(confoundingModel(inputs[4].input).correlationStatus,'zero-variance');assert.equal(confoundingModel(inputs[6].input).correlationStatus,'insufficient-pairs');
 for(const [id,expected] of [['tiny-perfect',1],['tiny-zero',0],['tiny-varying',1]]){const r=confoundingModel(inputs.find(c=>c.id==='confounding-'+id).input);assert(Number.isFinite(r.correlation));assert(Math.abs(r.correlation-expected)<1e-12);assert.equal(r.correlationStatus,'descriptive-pairwise-Pearson')}
});
test('normalisation is explicit, per series, and retains zeros and every known raw value',()=>{
 const m=confoundingModel(base);assert.equal(m.series[0].maximum,100);assert.equal(m.series[1].maximum,18);assert.equal(m.series[0].segments[0][0].relativePercent,20);assert(Math.abs(m.series[1].segments[0][0].relativePercent-100/9)<1e-12);
 const zero=confoundingModel(inputs[4].input);assert(zero.series[0].allZero);assert(zero.series[0].segments.flat().every(v=>v.relativePercent===0));assert.equal(confoundingModel(inputs[2].input).hypothesis.nodes.length,3);
});
test('unsupported causal conclusions, missingness errors and input contradictions reject',()=>{for(const c of bad)assert.throws(()=>confoundingModel(c.input),/confounding-panel:/)});
test('actual production browser preserves records, measured typography and separate causal status',{timeout:180000},async()=>{
 const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({...resolveBrowser(pw),headless:true});const out=process.env.MUSECORE_CONFOUNDING_OUT;
 try{const page=await browser.newPage({viewport:{width:3000,height:2200}});await page.route(/^https?:\/\//,r=>r.abort());await page.setContent(await editorHtml(base));await page.waitForFunction(()=>window.MUSECORE_READY===true);
  async function draw(input,pressure=0){return page.evaluate(async({input,pressure})=>{const original=CanvasRenderingContext2D.prototype.measureText;if(pressure)CanvasRenderingContext2D.prototype.measureText=function(t){const m=original.call(this,t);return new Proxy(m,{get(o,k){return k==='fontBoundingBoxAscent'?Reflect.get(o,k,o)+pressure:Reflect.get(o,k,o)}})};try{const svg=MuseCore.render(input);document.getElementById('output').replaceChildren(svg);await document.fonts.ready;return {audit:MuseCore.audit(svg),svg:svg.outerHTML,fontSizes:[...svg.querySelectorAll('text')].map(t=>+t.getAttribute('font-size')),text:svg.textContent}}catch(e){return {error:e.message}}finally{CanvasRenderingContext2D.prototype.measureText=original}},{input,pressure})}
  for(const c of inputs){const r=await draw(c.input);assert.equal(r.error,undefined,c.id);assert.deepEqual(r.audit.findings,[],c.id);const g=r.audit.geometry,m=confoundingModel(c.input);assert.deepEqual(g.input,c.input);assert.deepEqual(g.records,m.records);assert.equal(g.pairedCount,m.pairedCount);if(m.correlation===null)assert.equal(g.correlation,null);else assert(Number.isFinite(g.correlation)&&Math.abs(g.correlation-m.correlation)<1e-12);assert.equal(g.nodeGeometry.length,m.hypothesis?.nodes.length??0);assert.equal(g.edgeGeometry.length,m.hypothesis?.edges.length??0);assert.equal(g.curveGeometry.reduce((n,v)=>n+v.points.length,0),m.series.reduce((n,v)=>n+v.knownCount,0));assert(r.text.includes('尚不能建立')===Boolean(m.hypothesis));if(out){const d=path.join(out,'production',c.id);await fs.mkdir(d,{recursive:true});await fs.writeFile(d+'/diagram.svg',r.svg);await fs.writeFile(d+'/checks.json',JSON.stringify(r.audit,null,2));await page.setViewportSize({width:Math.ceil(g.width)+40,height:2200});await page.locator('#output svg').screenshot({path:d+'/diagram.png'})}}
  for(const c of [inputs[0],inputs[7],inputs.at(-2),inputs.at(-1)]){const a=await draw(c.input),r=await draw(c.input,40);assert.equal(r.error,undefined);assert.deepEqual(r.audit.findings,[]);assert(r.audit.geometry.height>a.audit.geometry.height);assert.deepEqual([...new Set(r.fontSizes)].sort(),[...new Set(a.fontSizes)].sort());if(out){const d=path.join(out,'stress',c.id);await fs.mkdir(d,{recursive:true});await fs.writeFile(d+'/checks.json',JSON.stringify(r.audit,null,2));await page.setViewportSize({width:Math.ceil(r.audit.geometry.width)+40,height:2200});await page.locator('#output svg').screenshot({path:d+'/diagram.png'})}}
  for(const c of bad)assert.match((await draw(c.input)).error,/confounding-panel:/);
  if(out){await fs.writeFile(path.join(out,'cases.json'),JSON.stringify(inputs,null,2));await fs.writeFile(path.join(out,'reject-cases.json'),JSON.stringify(bad.map(c=>({id:c.id,input:JSON.parse(JSON.stringify(c.input))})),null,2));}
 }finally{await browser.close()}
});
