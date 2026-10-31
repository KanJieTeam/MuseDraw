import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const base=JSON.parse(await fs.readFile(new URL('../../assets/musecore/solids.json',import.meta.url),'utf8'));
const near=(a,b)=>assert(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-12*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`),norm=s=>s.replace(/\s/gu,'');
const cases=[['four',base]],add=(id,fn)=>{const input=structuredClone(base);fn(input);cases.push([id,input])};
add('three',b=>b.objects=b.objects.slice(0,3));
add('six',b=>b.objects.push({id:'wide',label:'第二个长方体',kind:'cuboid',width:8,depth:4,height:3},{id:'second-sphere',label:'第二个球',kind:'sphere',radius:.75}));
add('five',b=>b.objects.push({id:'fifth',label:'第五个圆柱',kind:'cylinder',radius:3,height:2}));
add('long',b=>{b.title='观察立体形状，让名称、尺寸与体积完整对应';b.subtitle='同一对象保留各轴尺寸比例；不同对象分别缩放，不按画面大小比较真实体积。';b.objects.forEach(o=>o.label+='：课堂观察与核对尺寸时使用的完整对象名称');b.note+=' 原始备注全文保留，图形不能替代实物测量，也不把虚线误记成棱。'});
add('aspect',b=>{Object.assign(b.objects[0],{width:10,depth:2,height:2});Object.assign(b.objects[2],{radius:1,height:8})});

add('six-long',b=>{b.objects.push({id:'wide',label:'新增宽长方体：保留可读的完整教学对象名称',kind:'cuboid',width:8,depth:4,height:3},{id:'small',label:'另一个球：保留半径与体积对应说明',kind:'sphere',radius:.75});b.objects.forEach(o=>o.label+='，供课堂对照与核对尺寸使用')});
add('tall',b=>{Object.assign(b.objects[0],{width:1,depth:1,height:16});Object.assign(b.objects[2],{radius:1,height:17})});
add('flat',b=>{Object.assign(b.objects[0],{width:12,depth:6,height:1});Object.assign(b.objects[2],{radius:6,height:1})});

await test('solid plates retain real dimensions, projected objects and readable attached captions',async t=>{
 const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({...resolveBrowser(pw),headless:true});
 try{for(const[id,input]of cases)for(const pressure of [0,40])await t.test(id+' ascent '+pressure,async()=>{
  const page=await browser.newPage();await page.route(/^https?:\/\//,r=>r.abort());await page.setContent(await editorHtml(input));await page.waitForFunction(()=>window.MUSECORE_READY===true);
  const r=await page.evaluate(async({input,pressure})=>{const old=CanvasRenderingContext2D.prototype.measureText;if(pressure)CanvasRenderingContext2D.prototype.measureText=function(v){const m=old.call(this,v);return new Proxy(m,{get(t,k){return k==='fontBoundingBoxAscent'?t.fontBoundingBoxAscent+pressure:Reflect.get(t,k,t)}})};try{const svg=MuseCore.render(input);document.getElementById('output').replaceChildren(svg);await document.fonts.ready;return {audit:MuseCore.audit(svg),text:svg.textContent,groups:[...svg.querySelectorAll('[data-solid-id]')].map(g=>({id:g.dataset.solidId,kind:g.dataset.solidKind,text:g.textContent,paths:[...g.querySelectorAll('path')].map(p=>p.getAttribute('d')),polygons:[...g.querySelectorAll('polygon')].map(p=>p.getAttribute('points').split(' ').map(q=>q.split(',').map(Number))),circles:[...g.querySelectorAll('circle')].map(c=>Object.fromEntries(['cx','cy','r'].map(k=>[k,+c.getAttribute(k)]))),ellipses:[...g.querySelectorAll('ellipse')].map(c=>Object.fromEntries(['cx','cy','rx','ry'].map(k=>[k,+c.getAttribute(k)]))),fonts:[...g.querySelectorAll('text')].map(n=>+n.getAttribute('font-size'))}))}}finally{CanvasRenderingContext2D.prototype.measureText=old}},{input,pressure});
  assert.deepEqual(r.audit.findings,[]);const g=r.audit.geometry;assert.equal(g.objects.length,input.objects.length);assert.deepEqual(r.groups.map(o=>o.id),input.objects.map(o=>o.id));assert.equal(g.sourceCase,undefined);assert.deepEqual(g.compositionReferences,['j09-liti-tuxing']);
  for(const value of[input.title,input.subtitle,input.note])assert(norm(r.text).includes(norm(value)),value);
  input.objects.forEach((o,i)=>{const drawn=r.groups[i],computed=g.objects[i],dims=o.kind==='cube'?[o.size,o.size,o.size]:o.kind==='cuboid'?[o.width,o.depth,o.height]:[2*o.radius,2*o.radius,o.kind==='cylinder'?o.height:2*o.radius],volume=o.kind==='cube'?o.size**3:o.kind==='cuboid'?o.width*o.depth*o.height:o.kind==='cylinder'?Math.PI*o.radius**2*o.height:4*Math.PI*o.radius**3/3;
   assert.equal(drawn.kind,o.kind);assert(norm(drawn.text).includes(norm(o.label)));assert.deepEqual(computed.dimensions,dims);near(computed.volume,volume);const displayed=Number(drawn.text.match(/体积\s*≈\s*([0-9.,eE+-]+)/u)[1].replaceAll(',',''));assert(Math.abs(displayed-volume)<=.00500001);assert.equal(computed.labelPlan.size,34);assert.equal(computed.dimensionsPlan.size,22);assert.equal(computed.volumePlan.size,23);assert(drawn.fonts.includes(34)&&drawn.fonts.includes(22)&&drawn.fonts.includes(23));
   if(o.kind==='cube'||o.kind==='cuboid'){assert.equal(drawn.polygons.length,3);const [top,right,front]=drawn.polygons,[w,d,h]=dims,length=(p,a,b)=>Math.hypot(p[a][0]-p[b][0],p[a][1]-p[b][1]),unit=length(top,0,1)/w;near(length(top,1,2)/d,unit);near(length(right,1,2)/h,unit);near(length(front,0,1)/w,unit);near(length(front,1,2)/h,unit);near(top[1][1]-top[0][1],w*unit/2);near(top[2][0]-top[1][0],-Math.sqrt(3)*d*unit/2);near(right[2][0],right[1][0]);near(unit,computed.scale)}
   if(o.kind==='sphere'){assert.equal(drawn.circles.length,1);const c=drawn.circles[0],e=drawn.ellipses[0];near(c.r/o.radius,computed.scale);near(e.cx,c.cx);near(e.cy,c.cy);near(e.rx,c.r*.96);near(e.ry,c.r*.4)}
   if(o.kind==='cylinder'){const e=drawn.ellipses[0],v=drawn.paths[0].match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/gi).map(Number),unit=e.rx/(o.radius*Math.sqrt(1.5));assert.equal(v.length,13);near(e.rx/e.ry,Math.sqrt(3));near(v[0],e.cx-e.rx);near(v[1],e.cy);near(v[4],e.rx);near(v[5],e.ry);near(v[9],e.cx+e.rx);near(v[10],v[3]);near(v[12],v[1]);near((v[3]-v[1])/unit,o.height);near(unit,computed.scale)}
   assert(computed.objectBounds.bottom<=computed.labelY-20);assert(computed.labelY+computed.labelPlan.height<computed.dimensionY);assert(computed.dimensionY+computed.dimensionsPlan.height<computed.volumeY);assert(computed.captionX>=computed.left);assert(computed.captionX+Math.max(computed.labelPlan.width,computed.dimensionsPlan.width,computed.volumePlan.width)<=computed.left+(g.width-144)/g.columns);assert(computed.scale>0);
  });
  if(input.objects.length===3)assert.equal(g.rows.length,1);for(let i=1;i<g.rows.length;i++)assert(g.rows[i].top>g.rows[i-1].bottom);assert(g.noteTop>g.rows.at(-1).bottom);await page.close();
 });
 await t.test('six malformed inputs are truly rejected',async()=>{const page=await browser.newPage();await page.setContent(await editorHtml(base));await page.waitForFunction(()=>window.MUSECORE_READY===true);for(const fn of[b=>b.objects=b.objects.slice(0,2),b=>b.objects=Array.from({length:7},(_,i)=>({...b.objects[0],id:'o'+i})),b=>b.objects[3].radius=0,b=>b.objects[0].kind='cone',b=>b.objects[1].id=b.objects[0].id,b=>b.objects[0].width=100000]){const input=structuredClone(base);fn(input);const error=await page.evaluate(input=>{try{MuseCore.render(input);return null}catch(e){return e.message}},input);assert.equal(typeof error,'string');assert(error.length)}await page.close()});
 }finally{await browser.close()}
});
