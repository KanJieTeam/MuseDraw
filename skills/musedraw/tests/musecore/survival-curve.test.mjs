import test from 'node:test';
import assert from 'node:assert/strict';
import fixtureJson from '../../assets/musecore/survival-curve-demo.json' with {type:'json'};
import {survivalCurveModel} from '../../scripts/musecore/survival-curve-models.mjs';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';
const fixture=()=>structuredClone(fixtureJson);
function variants(base){
 const out=[{id:'default',input:structuredClone(base)}];
 const add=(id,f)=>{const b=structuredClone(base);f(b);out.push({id,input:b})};
 add('two-groups',b=>{b.groups=b.groups.slice(0,2);b.title='两组时间到事件：删失标记保留'});
 add('long-labels',b=>{b.groups.forEach(g=>g.label+='（完整观察队列）');b.subtitle='较长副标题用于检查同一时间轴上的阶梯、删失与风险表是否仍能分开阅读。'});
 add('same-time',b=>{b.groups.forEach(g=>{g.records.push({time:4,event:true},{time:4,event:false})});b.title='同一时间点多个状态：事件先更新风险集'});
 return out;
}
function rejects(base){
 const edits=[
  ['too-few-groups',b=>{b.groups=b.groups.slice(0,1)}],
  ['too-many-groups',b=>{b.groups=[...b.groups,{id:'four',label:'四',records:b.groups[0].records},{id:'five',label:'五',records:b.groups[0].records}]}],
  ['bad-family',b=>{b.family='sample-summary'}],
  ['unknown-field',b=>{b.extra=1}],
  ['short-records',b=>{b.groups[0].records=b.groups[0].records.slice(0,3)}],
  ['negative-time',b=>{b.groups[0].records[0].time=-1}],
  ['bad-event',b=>{b.groups[0].records[0].event='yes'}],
  ['duplicate-id',b=>{b.groups[1].id=b.groups[0].id}],
  ['empty-unit',b=>{b.unit=''}],
  ['long-label',b=>{b.groups[0].label='字'.repeat(41)}],
  ['unsupported-claim',b=>{b.claim='hazard ratio'}]
 ];
 return edits.map(([id,fn])=>{const input=structuredClone(base);fn(input);return {id,input}});
}
test('survival model computes explicit events, right censoring, median and risk sets',()=>{
 const b=fixture(),m=survivalCurveModel(b);assert.equal(m.family,'survival-curve');assert.equal(m.groups.length,3);
 assert.deepEqual(m.groups.map(g=>[g.events,g.censored,g.n,g.median,g.risk]),[[6,4,10,10,[10,8,4,1,0]],[5,5,10,14,[10,9,6,4,1]],[4,6,10,14,[10,9,6,3,0]]]);
 assert.deepEqual(m.ticks,[0,4,8,12,16]);assert(m.scope.includes('right-censored'));
 for(const v of variants(b))assert.doesNotThrow(()=>survivalCurveModel(v.input),v.id);
});
test('production survival curve renders at normal and +40 font pressure with no geometry findings',{timeout:240000},async()=>{
 const b=fixture(),{pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{
  const page=await browser.newPage({viewport:{width:1900,height:1600}});await page.route(/^https?:\/\//,r=>r.abort());await page.setContent(await editorHtml(b));await page.waitForFunction(()=>window.MUSECORE_READY===true);
  for(const width of [1900,390])for(const v of variants(b))for(const pressure of [0,40]){
   await page.setViewportSize({width,height:1600});
   const result=await page.evaluate(({input,pressure})=>{const old=CanvasRenderingContext2D.prototype.measureText;if(pressure)CanvasRenderingContext2D.prototype.measureText=function(v){const m=old.call(this,v);return new Proxy(m,{get(o,k){if(k==='width')return m.width+pressure;return Reflect.get(o,k,o)}})};try{const svg=MuseCore.render(input);document.getElementById('output').replaceChildren(svg);return {audit:MuseCore.audit(svg),text:svg.textContent,curves:[...svg.querySelectorAll('[data-survival-curve]')].map(e=>e.getAttribute('d')),risk:[...svg.querySelectorAll('[data-risk-group]')].length}}finally{CanvasRenderingContext2D.prototype.measureText=old}},{input:v.input,pressure});
   assert.deepEqual(result.audit.findings,[],v.id+' viewport '+width+' pressure '+pressure);assert.equal(result.curves.length,v.input.groups.length);assert.equal(result.risk,v.input.groups.length*5);assert(!/NaN|Infinity|undefined/.test(result.text));
  }
 }finally{await browser.close()}
});







