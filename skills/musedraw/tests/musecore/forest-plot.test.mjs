import test from 'node:test';
import assert from 'node:assert/strict';
import fixtureJson from '../../assets/musecore/forest-plot-demo.json' with {type:'json'};
import {forestPlotModel} from '../../scripts/musecore/forest-plot-models.mjs';
import {numericDisplay} from '../../scripts/musecore/quantitative.mjs';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const fixture=()=>structuredClone(fixtureJson),bad=(base,edit)=>{const b=structuredClone(base);edit(b);return b};

test('forest model keeps interval facts, reference and source traceability without pooling',()=>{
 const m=forestPlotModel(fixture());assert.equal(m.rows.length,6);assert.equal(m.rows[0].estimate,.42);assert.equal(m.rows[0].low,.12);assert.equal(m.rows[0].high,.71);assert.deepEqual(m.sourceTraceability.map(x=>x.id),fixtureJson.rows.map(x=>x.id));assert(m.scope.includes('no pooled estimate'));assert.deepEqual(fixture(),fixtureJson);
});

test('forest production renders real SVG at narrow widths and with font pressure', {timeout:240000}, async()=>{
 const b=fixture(),{pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{const page=await browser.newPage({viewport:{width:2200,height:1800}});await page.route(/^https?:\/\//,r=>r.abort());await page.setContent(await editorHtml(b));await page.waitForFunction(()=>window.MUSECORE_READY===true,null,{timeout:120000});
  let normalHeight=0;
  for(const width of [2200,1024,390])for(const pressure of [0,40]){
   const result=await page.evaluate(({input,pressure})=>{const old=CanvasRenderingContext2D.prototype.measureText;if(pressure)CanvasRenderingContext2D.prototype.measureText=function(v){const m=old.call(this,v);return new Proxy(m,{get(o,k){if(k==='width')return m.width+pressure;return Reflect.get(o,k,o)}})};try{const svg=MuseCore.render(input);document.getElementById('output').replaceChildren(svg);const audit=MuseCore.audit(svg);return {findings:audit.findings,text:svg.textContent,marks:svg.querySelectorAll('[data-forest-estimate]').length,intervals:svg.querySelectorAll('[data-forest-interval]').length,reference:svg.querySelectorAll('[data-reference-line]').length,height:audit.geometry.height}}finally{CanvasRenderingContext2D.prototype.measureText=old}},{input:b,pressure});
   assert.deepEqual(result.findings,[],`width ${width} pressure ${pressure}`);assert.equal(result.marks,6);assert.equal(result.intervals,6);assert.equal(result.reference,1);assert(!/NaN|Infinity|undefined/.test(result.text));if(!pressure)normalHeight=Math.max(normalHeight,result.height);
  }
  assert(normalHeight>0);
 }finally{await browser.close()}
});

test('forest rejects unsupported, ambiguous and out-of-scope inputs',()=>{
 const b=fixture();for(const [name,edit,match] of [
  ['too-few',x=>x.rows=x.rows.slice(0,3),/4–24/],
  ['inverted',x=>x.rows[0].low=.8,/contain estimate/],
  ['missing-source',x=>delete x.rows[0].source,/row.source/],
  ['duplicate-id',x=>x.rows[1].id=x.rows[0].id,/duplicate row id/],
  ['unsupported-claim',x=>x.claim='causal',/unsupported field/],
  ['long-label',x=>x.rows[0].label='字'.repeat(49),/at most 48/],
  ['bad-weight',x=>x.rows[0].weight=-1,/row.weight/],
  ['non-finite',x=>x.rows[0].estimate=Number.NaN,/finite number/]
 ])assert.throws(()=>forestPlotModel(bad(b,edit)),match,name);
});

const scaled=(scale,offset=0)=>{const b=fixture();b.reference=b.reference*scale+offset;for(const row of b.rows){row.estimate=row.estimate*scale+offset;row.low=row.low*scale+offset;row.high=row.high*scale+offset}return b};
const near=(actual,expected,label)=>assert(Math.abs(actual-expected)<=1e-6*Math.max(1,Math.abs(expected)),`${label}: ${actual} != ${expected}`);
const linePoints=polyline=>polyline.getAttribute('points').trim().split(/\s+/u).map(p=>p.split(',').map(Number));

test('forest preserves micro and offset scales with dynamic labels, exact coordinates, CJK pressure and narrow viewports',{timeout:240000},async()=>{
 const cases=[
  {id:'default',input:fixture()},
  {id:'micro',input:scaled(1e-120)},
  {id:'small',input:scaled(1e-9)},
  {id:'offset',input:scaled(1e-6,1e5)},
  {id:'negative',input:scaled(1,-20)},
  {id:'constant',input:(()=>{const b=fixture();b.reference=5e-6;for(const row of b.rows){row.estimate=5e-6;row.low=5e-6;row.high=5e-6}return b})()},
  {id:'cjk',input:(()=>{const b=fixture();b.rows.forEach((row,i)=>{row.label=`第${i+1}项实验组的完整中文说明标签`;row.source=`数据来源中文记录 ${i+1}`});return b})()}
 ];
 const out=process.env.MUSECORE_FOREST_OUT;
 const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{for(const c of cases)for(const pressure of [0,40]){
  const page=await browser.newPage({viewport:{width:2200,height:2200}});
  try{
   await page.route(/^https?:\/\//,r=>r.abort());
   let html=await editorHtml(c.input);
   if(pressure){const patch=`const __m=CanvasRenderingContext2D.prototype.measureText;CanvasRenderingContext2D.prototype.measureText=function(v){const m=__m.call(this,v);return new Proxy(m,{get(o,k){if(k==='width')return Reflect.get(o,k,o)+40;if(k==='fontBoundingBoxAscent')return Reflect.get(o,k,o)+40;return Reflect.get(o,k,o)}})};`;html=html.replace('<script>(()=>{',`<script>(()=>{${patch}`)}
   await page.setContent(html);await page.waitForFunction(()=>window.MUSECORE_READY===true,null,{timeout:120000});
   const result=await page.evaluate(()=>{const svg=document.querySelector('#output svg');const a=window.MUSECORE_RESULT;return {audit:a,svg:svg?.outerHTML??'',text:svg?.textContent??'',ticks:[...svg.querySelectorAll('[data-forest-x-tick]')].map(n=>n.textContent),marks:[...svg.querySelectorAll('[data-forest-estimate]')].map(n=>({id:n.dataset.forestEstimate,x:+n.getAttribute('x'),width:+n.getAttribute('width')})),intervals:[...svg.querySelectorAll('[data-forest-interval]')].map(n=>({id:n.dataset.forestInterval,points:n.getAttribute('points')})),texts:[...svg.querySelectorAll('text')].map(n=>{const b=n.getBBox();return {text:n.textContent,x:b.x,y:b.y,width:b.width,height:b.height}})}});
   assert.deepEqual(result.audit.findings,[],`${c.id} pressure ${pressure} audit`);assert.equal(result.ticks.length,5);assert.equal(new Set(result.ticks).size,5,`${c.id} distinct ticks`);assert.equal(result.marks.length,c.input.rows.length);assert.equal(result.intervals.length,c.input.rows.length);assert(!/NaN|Infinity|undefined/u.test(result.text));
   const g=result.audit.geometry,m=forestPlotModel(c.input),X=value=>g.plot.x+(value-m.domain.min)/(m.domain.max-m.domain.min)*g.plot.w;
   for(const row of c.input.rows){const interval=result.intervals.find(x=>x.id===row.id),points=interval.points.trim().split(/\s+/u).map(p=>p.split(',').map(Number));near(points[0][0],X(row.low),`${c.id} low`);near(points[1][0],X(row.high),`${c.id} high`);const mark=result.marks.find(x=>x.id===row.id);near(mark.x+mark.width/2,X(row.estimate),`${c.id} estimate`);assert(result.text.replace(/\s/gu,'').includes(row.label.replace(/\s/gu,'')),`${c.id} label retained`)}
   if(c.id==='micro'||c.id==='small'){const xs=result.intervals.flatMap(i=>linePoints({getAttribute:()=>i.points}).map(p=>p[0]));assert(Math.max(...xs)-Math.min(...xs)>g.plot.w*.7,`${c.id} uses micro numeric scale`)}
   if(c.id==='offset'){const xs=result.intervals.flatMap(i=>linePoints({getAttribute:()=>i.points}).map(p=>p[0]));assert(Math.max(...xs)-Math.min(...xs)>g.plot.w*.7,'offset uses relative micro scale')}
   for(const t of result.texts){assert(t.x>=-.01&&t.y>=-.01&&t.x+t.width<=g.width+.01&&t.y+t.height<=g.height+.01,`${c.id} text inside canvas: ${t.text}`)}
   for(const width of [1440,1024,390]){await page.setViewportSize({width,height:2200});assert.equal(await page.evaluate(()=>innerWidth),width);assert(await page.evaluate(()=>document.body.scrollWidth-document.documentElement.clientWidth)<=1,`${c.id} no overflow ${width}`)}
   if(out){const dir=path.join(out,`${c.id}-${pressure?'plus40':'normal'}`);await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'input.json'),JSON.stringify(c.input,null,2));await fs.writeFile(path.join(dir,'diagram.svg'),result.svg);await fs.writeFile(path.join(dir,'checks.json'),JSON.stringify({audit:result.audit,ticks:result.ticks,marks:result.marks,intervals:result.intervals,texts:result.texts},null,2));await page.setViewportSize({width:2200,height:2200});await page.locator('#output svg').screenshot({path:path.join(dir,'diagram.png')})}
  }finally{await page.close()}
 }}finally{await browser.close()}
});
