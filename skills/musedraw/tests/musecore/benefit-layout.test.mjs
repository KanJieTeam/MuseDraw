import test from 'node:test';

import assert from 'node:assert/strict';

import fs from 'node:fs/promises';

import {benefitWalletModel} from '../../scripts/musecore/benefit-models.mjs';

import {editorHtml} from '../../scripts/musecore.mjs';

import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';

import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const fixture=async()=>JSON.parse(await fs.readFile(new URL('../../assets/musecore/benefit-wallet.json',import.meta.url),'utf8'));

const norm=s=>s.replace(/\s/gu,'');

function maximum(base){const b=structuredClone(base);
b.categories=Array.from({length:6},(_,i)=>({id:'c'+i,label:'个人支持与长期能力发展类别 '+(i+1)}));
b.options=Array.from({length:16},(_,i)=>({id:'o'+i,label:'涵盖业务技能学习、家庭支持或日常服务的明确登记选项 '+(i+1),category:'c'+i%6,unit:'points',unitPrice:10+i}));
b.selections=Array.from({length:24},(_,i)=>({id:'s'+i,option:'o'+i%16,quantity:i%5,status:i%2?'planned':'confirmed'}));
return b}
// A full-turn SVG sector uses the existing 1e-8 endpoint gap; other angles retain 1e-12 checks.
function actualSector(path,ring){const q=path.d.match(/-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi).map(Number),a=Math.atan2(q[1]-ring.cy,q[0]-ring.cx),b=Math.atan2(q[8]-ring.cy,q[7]-ring.cx),sweep=(b-a+2*Math.PI)%(2*Math.PI);
return {sweep,r0:q[11],r1:q[2]}}
test('benefit overview binds actual category sectors and option keys to complete financial records',{timeout:120000},async t=>{const base=await fixture(),negative=structuredClone(base),zero=structuredClone(base),long=structuredClone(base);
negative.budget=1000;
zero.budget=0;
zero.selections=[{id:'zero',option:'fitness',quantity:0,status:'confirmed'}];
for(const category of long.categories)category.label+='、家庭生活与个人长期能力支持的完整分类名称';
for(const option of long.options)option.label+='：保留这项个人服务或学习支持的完整登记文案';
long.note='调用方原始完整备注：'+base.note;
const big=maximum(base),tiny=structuredClone(base);big.budget=1000000000;for(const option of big.options)option.unitPrice=1000000;for(const row of big.selections)row.quantity=10000;tiny.budget=1000000000;for(const option of tiny.options)option.unitPrice=1;for(const row of tiny.selections)row.quantity=1;const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({...resolveBrowser(pw),headless:true});
try{const page=await browser.newPage({viewport:{width:2000,height:2400}});
await page.route(/^https?:\/\//,r=>r.abort());
await page.setContent(await editorHtml(base));
await page.waitForFunction(()=>window.MUSECORE_READY===true);

async function render(input,pressure){const r=await page.evaluate(async({input,pressure})=>{const original=CanvasRenderingContext2D.prototype.measureText;
if(pressure)CanvasRenderingContext2D.prototype.measureText=function(v){const m=original.call(this,v);
return new Proxy(m,{get(target,key){return key==='fontBoundingBoxAscent'?target.fontBoundingBoxAscent+pressure:Reflect.get(target,key,target)}})};
try{const svg=MuseCore.render(input);
document.getElementById('output').replaceChildren(svg);
await document.fonts.ready;
return {audit:MuseCore.audit(svg),text:svg.textContent,paths:[...svg.querySelectorAll('path')].map(n=>({d:n.getAttribute('d'),option:n.dataset.option,category:n.dataset.category,status:n.dataset.status,fill:n.getAttribute('fill')})),categories:[...svg.querySelectorAll('[data-benefit-category]')].map(n=>({id:n.dataset.benefitCategory,index:Number(n.dataset.categoryIndex),text:n.textContent})),callouts:[...svg.querySelectorAll('[data-benefit-callout]')].map(n=>({id:n.dataset.benefitCallout,index:Number(n.dataset.categoryIndex),text:n.textContent,points:n.querySelector('polyline').getAttribute('points')})),ledger:[...svg.querySelectorAll('[data-benefit-selection]')].map(n=>({id:n.dataset.benefitSelection,option:n.dataset.optionRef,status:n.dataset.selectionStatus,text:n.textContent})),markers:[...svg.querySelectorAll('[data-benefit-option-marker]')].map(n=>({id:n.dataset.benefitOptionMarker,key:n.dataset.optionKey,status:n.dataset.status,text:n.textContent})),fonts:[...svg.querySelectorAll('text')].map(n=>Number(n.getAttribute('font-size')))}}finally{CanvasRenderingContext2D.prototype.measureText=original}},{input,pressure});
assert.deepEqual(r.audit.findings,[]);
const g=r.audit.geometry,m=benefitWalletModel(input);
for(const key of Object.keys(m))assert.deepEqual(g[key],m[key],key);
assert.equal(g.sourceCase,undefined);
assert.deepEqual(g.compositionReferences,['196-flexible-benefits']);
assert.equal(r.ledger.length,input.selections.length);
assert.equal(r.categories.length,input.categories.length);
assert(g.layout.ledgerColumns>=1&&g.layout.ledgerColumns<=3);
for(const row of m.selections){const shown=r.ledger.find(n=>n.id===row.id),key=String.fromCharCode(97+m.optionTotals.findIndex(n=>n.id===row.option));
assert.equal(shown.option,row.option);
assert.equal(shown.status,row.status);
assert(norm(shown.text).includes(norm(key+' · '+row.label)));
assert(norm(shown.text).includes(norm(row.id)));
assert(norm(shown.text).includes(norm(row.unitPrice.toLocaleString('en-US')+' × '+row.quantity+' = '+row.points.toLocaleString('en-US')+' 积分')))}
for(const category of m.categoryTotals){const shown=r.categories.find(n=>n.id===category.id);
assert(norm(shown.text).includes(norm(category.label)));
const order=m.optionTotals.filter(option=>option.category===category.id&&option.confirmed+option.planned>0).map(option=>String.fromCharCode(97+m.optionTotals.findIndex(row=>row.id===option.id)));assert(norm(shown.text).includes(norm('外圈：'+(order.join(' → ')||'无分配'))));
const value=category.confirmed+category.planned,arc=g.arcs.find(n=>n.categoryId===category.id),path=r.paths.find(n=>n.category===category.id);
if(!value){assert.equal(arc,undefined);
assert.equal(path,undefined);
continue}assert(Math.abs(arc.sweep-value/m.denominator*2*Math.PI)<1e-12);
const actual=actualSector(path,g.ring);
assert(Math.abs(actual.sweep-arc.sweep)<(Math.abs(arc.sweep-2*Math.PI)<1e-12?1.1e-8:1e-12));
assert.equal(actual.r0,g.ring.inner);
assert.equal(actual.r1,g.ring.categoryOuter);
const label=r.callouts.find(n=>n.id===category.id),geometry=g.callouts.find(n=>n.categoryId===category.id),start=label.points.split(' ')[0].split(',').map(Number);
assert.equal(label.index,shown.index);
assert(label.text.startsWith(String(shown.index)));
assert(Math.abs(Math.hypot(start[0]-g.ring.cx,start[1]-g.ring.cy)-(g.ring.outer+3))<1e-9);
const vertices=label.points.split(' ').map(p=>p.split(',').map(Number));for(let i=1;i<vertices.length;i++){const a=vertices[i-1],b=vertices[i];for(let n=0;n<=20;n++){const x=a[0]+(b[0]-a[0])*n/20,y=a[1]+(b[1]-a[1])*n/20;assert(Math.hypot(x-g.ring.cx,y-g.ring.cy)>=g.ring.outer+2.9,'category leader stays outside ring')}}const angle=Math.atan2(start[1]-g.ring.cy,start[0]-g.ring.cx),mid=(arc.startAngle+arc.endAngle)/2;
assert(Math.abs(Math.sin(angle-mid))<1e-12);
assert(Math.cos(angle-mid)>0);
if(geometry.fullLabelVisible)assert(norm(label.text).includes(norm(category.label)))}const expected=[];
for(const option of m.optionTotals)for(const status of['confirmed','planned'])if(option[status])expected.push({id:option.id,status,points:option[status]});
assert.equal(r.paths.filter(n=>n.option).length,expected.length);
for(const row of expected){const path=r.paths.find(n=>n.option===row.id&&n.status===row.status),actual=actualSector(path,g.ring);
assert(Math.abs(actual.sweep-row.points/m.denominator*2*Math.PI)<(row.points===m.denominator?1.1e-8:1e-12));
assert.equal(actual.r0,g.ring.optionInner);
assert.equal(actual.r1,g.ring.outer);
if(row.status==='planned')assert(path.fill.startsWith('url(#benefit-plan-'))}
for(const marker of r.markers){assert.equal(marker.key,String.fromCharCode(97+m.optionTotals.findIndex(n=>n.id===marker.id)));
assert.equal(marker.text,marker.key);
assert(expected.some(n=>n.id===marker.id&&n.status===marker.status))}assert.equal(m.confirmed+m.planned+m.remainingIfPlanned,m.budget);
for(const value of[input.title,input.subtitle,input.note])assert(norm(r.text).includes(norm(value)));
for(const size of[57,43,45,27,25,26,23,22,21,18])assert(r.fonts.includes(size));
return r}
for(const[id,input]of[['default',base],['negative',negative],['zeroQuantity',zero],['maximum',maximum(base)],['long',long],['maximumMoney',big],['tinyAmounts',tiny]])for(const pressure of[0,40])await t.test(id+' +'+pressure,async()=>{const r=await render(input,pressure);
if(id==='negative'){assert.equal(r.audit.geometry.remainingIfPlanned,-870);
assert(r.text.includes('-870'));
assert.equal(r.paths.filter(n=>n.status==='unallocated').length,0)}if(id==='zeroQuantity'){assert.equal(r.paths.length,0);
assert.equal(r.audit.geometry.committed,0);
assert(r.text.includes('预算为零'))}if(id==='tinyAmounts')assert(r.text.includes('<0.01%'));if(id==='maximum'){assert.equal(r.ledger.length,24);
assert.equal(r.audit.geometry.optionTotals.length,16);
assert.equal(r.categories.length,6)}});

}finally{await browser.close()}});
