import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {sampleSummaryModel} from '../../scripts/musecore/sample-models.mjs';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';
const source=JSON.parse(await fs.readFile(new URL('../../assets/musecore/rope-skipping-average.json',import.meta.url),'utf8')),clone=x=>structuredClone(x),near=(a,b)=>assert(Math.abs(a-b)<1e-8);

test('source keeps five named teaching observations and does not replace the existing asset',async()=>{
 assert.equal(source.family,'sample-summary');assert.equal(source.presentation,'balance');assert.equal(source.unit,'下');assert.deepEqual(source.groups[0].observations.map(o=>[o.label,o.value]),[['小明',128],['小红',142],['小刚',116],['小丽',150],['小军',134]]);assert.match(source.subtitle,/原稿给定示例/);assert.match(source.note,/不改变各人的原记录/);
 const old=JSON.parse(await fs.readFile(new URL('../../assets/musecore/sample-summary.json',import.meta.url),'utf8'));assert.deepEqual(old.groups[0].observations.map(x=>x.value),[8,14,10,16,12]);
});
test('source arithmetic and a feasible redistribution match independent hand calculations',()=>{
 const before=clone(source),r=sampleSummaryModel(source),g=r.groups[0];assert.deepEqual([g.n,g.missing,g.sum,g.mean,g.median,g.minimum,g.maximum,g.range,g.surplus,g.deficit],[5,0,670,134,134,116,150,34,24,24]);assert.deepEqual(source,before);
 const final=new Map(g.observations.map(o=>[o.id,o.value])),delta=new Map(g.observations.map(o=>[o.id,o.value-134]));let moved=0;
 for(const t of r.transfers){assert(t.amount>0);assert(delta.get(t.from)>0);assert(delta.get(t.to)<0);final.set(t.from,final.get(t.from)-t.amount);final.set(t.to,final.get(t.to)+t.amount);moved+=t.amount}assert.equal(moved,24);assert.deepEqual([...final.values()],[134,134,134,134,134]);assert.equal([...final.values()].reduce((s,x)=>s+x,0),670);
 const reversed=clone(source);reversed.groups[0].observations.reverse();const reverse=sampleSummaryModel(reversed);assert.equal(reverse.groups[0].mean,134);assert.equal(reverse.transfers.reduce((s,x)=>s+x.amount,0),24);
});
test('source route refuses supplied aggregate overrides and malformed observations',()=>{
 for(const [mutate,pattern]of [[b=>b.groups[0].mean=134,/unsupported/],[b=>b.groups[0].observations[0].weight=2,/unsupported/],[b=>b.groups[0].observations[1].id=b.groups[0].observations[0].id,/duplicate/],[b=>b.groups[0].observations[0].value='128',/finite/],[b=>b.groups[0].observations.forEach(o=>o.value=null),/observed/],[b=>b.groups[0].observations[0].value=-1,/nonnegative/]]){const b=clone(source);mutate(b);assert.throws(()=>sampleSummaryModel(b),pattern)}
});
test('production browser keeps source records, complete notes and a true zero baseline at normal and +40 metrics',async()=>{
 const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({...resolveBrowser(pw),headless:true});try{const page=await browser.newPage();await page.setContent(await editorHtml(source));await page.waitForFunction(()=>window.MUSECORE_READY===true);
  const long=clone(source);long.title='平均数：同一组给定跳绳成绩的两种算术读法';long.note='成绩为原稿给定示例；移多补少演示数量的等量分配，不改变各人的原记录。橙色实块和虚线框表示相对平均数的盈缺，右侧记录一份可行的算术移补清单。';
  for(const input of [source,long])for(const pressure of [0,40]){const r=await page.evaluate(({input,pressure})=>{const old=CanvasRenderingContext2D.prototype.measureText;if(pressure)CanvasRenderingContext2D.prototype.measureText=function(t){const m=old.call(this,t);return new Proxy(m,{get(o,k){return k==='fontBoundingBoxAscent'?Reflect.get(o,k,o)+pressure:Reflect.get(o,k,o)}})};try{const svg=MuseCore.render(input);document.getElementById('output').replaceChildren(svg);return {audit:MuseCore.audit(svg),text:svg.textContent}}finally{CanvasRenderingContext2D.prototype.measureText=old}},{input,pressure});assert.deepEqual(r.audit.findings,[]);const g=r.audit.geometry;assert.equal(g.domain[0],0);assert.equal(g.marks.length,5);for(const [i,mark]of g.marks.entries()){assert.equal(mark.value,input.groups[0].observations[i].value);assert.equal(mark.label,input.groups[0].observations[i].label);near(mark.height/mark.value,(g.plot.bottom-g.plot.top)/(g.domain[1]-g.domain[0]));near(mark.y+mark.height,g.plot.bottom);near(mark.meanY,g.meanY);assert.equal(mark.delta,mark.value-134)}for(const text of [input.title,input.subtitle,input.note,...input.groups[0].observations.map(o=>o.label)])assert(r.text.replace(/\s/g,'').includes(text.replace(/\s/g,'')));assert.equal(g.groups[0].sum,670);assert.equal(g.groups[0].mean,134);assert.equal(g.transfers.reduce((s,x)=>s+x.amount,0),24)}
 }finally{await browser.close()}
});
