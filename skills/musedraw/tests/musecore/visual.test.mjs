import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';
const skill=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const load=async id=>JSON.parse(await fs.readFile(path.join(skill,'assets/musecore',id+'.json'),'utf8'));
const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({...resolveBrowser(pw),headless:true}),page=await browser.newPage({viewport:{width:1700,height:1300}}),tests=[];
async function draw(input){return page.evaluate(async input=>{try{const svg=MuseCore.render(input);document.getElementById('output').replaceChildren(svg);await document.fonts.ready;return {audit:MuseCore.audit(svg),text:svg.textContent,svg:svg.outerHTML}}catch(e){return {error:e.message}}},input)}
async function reject(input,pattern,name){assert.match((await draw(input)).error,pattern);tests.push(name)}
try{
 await page.setContent(await editorHtml(await load('rhythm')));await page.waitForFunction(()=>window.MUSECORE_READY===true);
 for(const id of ['rhythm','specimen','metro','colour','calendar','plate','riso']){const r=await draw(await load(id));assert.equal(r.error,undefined,id);assert.deepEqual(r.audit.findings,[],id);tests.push(id+' measured rendering')}
 const rhythm=await load('rhythm'),rr=await draw(rhythm),dots=rr.audit.geometry.dots;
 assert.equal(dots.length,rhythm.patterns.reduce((sum,r)=>sum+r.length,0));assert(dots.every(d=>d.accent===rhythm.accentBeats.includes(d.at)));tests.push('rhythm notes and accent positions exactly match input');
 const row=structuredClone(rhythm);row.patterns=row.patterns.slice(0,3);const r3=await draw(row);assert.equal(r3.error,undefined);assert.equal(r3.audit.geometry.dots.length,row.patterns.flat().length);tests.push('three rows preserve actual note count');
 const bad=structuredClone(rhythm);bad.patterns[0][0].at=4;await reject(bad,/outside/,'out-of-measure notes rejected');
 const specimen=await load('specimen');specimen.species=['salix','ginkgo','acer','triadica'];specimen.columns=2;const sr=await draw(specimen);assert.equal(sr.error,undefined);assert.deepEqual(sr.audit.geometry.objects.map(o=>o.id),specimen.species);assert(sr.text.includes('Ginkgo biloba')&&sr.text.includes('银杏'));tests.push('leaf drawing, supplied order, Chinese name and scientific label stay bound');
 specimen.species[0]='invented';await reject(specimen,/Unknown specimen/,'new species cannot reuse the wrong drawing');
 const metro=await load('metro'),mr=await draw(metro),mg=mr.audit.geometry;assert.equal(mr.error,undefined);for(let i=0;i<metro.routes.length;i++){const line=mg.lines[i];assert.equal(line.id,metro.routes[i].id);assert.equal(line.color,metro.routes[i].color);assert.deepEqual(line.events.map(e=>e.stage),metro.routes[i].events.map(e=>e.stage));for(const ev of line.events)assert.equal(ev.y,mg.normalY[i])}tests.push('route identity, event identity and supplied stations persist');
 const four=structuredClone(metro);four.routes.push({id:'reviewer',label:'用户判断',color:'#C58A20',events:[{stage:'draft',label:'查看方向'}]});const fr=await draw(four);assert.equal(fr.error,undefined);assert.deepEqual(fr.audit.findings,[]);assert.equal(fr.audit.geometry.lines.length,4);tests.push('four routes retain separate tracks and shared stations');
 const dates=await load('calendar'),cr=await draw(dates),cg=cr.audit.geometry;
 assert.equal(cg.days.length,366);assert(cg.days.some(d=>d.date==='2028-02-29'));assert.equal(cg.total,dates.records.reduce((s,d)=>s+d.value,0));assert.equal(cg.months.reduce((s,d)=>s+d,0),cg.total);assert.equal(cg.days.find(d=>d.date==='2028-01-01').weekday,5);tests.push('leap day, Monday-based weekdays and daily/monthly/annual totals agree');
 for(const year of [2026,2027,2032]){const one=structuredClone(dates);one.year=year;one.records=[{date:`${year}-01-01`,value:7}];one.missing='zero';const dr=await draw(one);assert.equal(dr.error,undefined);assert.equal(dr.audit.geometry.days.length,year===2032?366:365);assert.equal(dr.audit.geometry.total,7);tests.push(year+' calendar computes a supplied year instead of reusing dates')}
 const zero=structuredClone(dates);zero.records=[{date:'2028-01-01',value:0}];zero.missing='zero';const zr=await draw(zero);assert.equal(zr.error,undefined);assert.equal(zr.audit.geometry.weekendShare,null);assert.equal(zr.audit.geometry.total,0);assert.deepEqual(zr.audit.findings,[]);tests.push('zero data has no invented share or invalid bars');
 const missing=structuredClone(dates);missing.records.pop();await reject(missing,/missing daily/,'missing values rejected unless zero is explicitly chosen');
 const impossible=structuredClone(dates);impossible.records=[{date:'2027-02-29',value:1}];impossible.year=2027;impossible.missing='zero';await reject(impossible,/invalid calendar/,'nonexistent February 29 rejected');
 const plate=await load('plate'),pr=await draw(plate),pg=pr.audit.geometry;assert.equal(pr.error,undefined);assert.equal(pg.wells.length,384);
 const expected=plate.values.map((value,i)=>({value,id:plate.rows[Math.floor(i/plate.columns)]+(i%plate.columns+1),column:i%plate.columns+1})).filter(w=>![...plate.controls.positiveColumns,...plate.controls.negativeColumns].includes(w.column)&&w.value>=plate.threshold).sort((a,b)=>b.value-a.value);
 assert.deepEqual(pg.hitIds,expected.map(x=>x.id));assert.equal(pg.histogram.reduce((s,n)=>s+n,0),pg.wells.filter(w=>!w.control).length);tests.push('384 well identities, hit list and sample histogram agree');
 const altered=structuredClone(plate);altered.threshold=80;const ar=await draw(altered);assert.equal(ar.error,undefined);assert(ar.audit.geometry.hitIds.every(id=>pg.hitIds.includes(id)));assert.deepEqual(ar.audit.geometry.wells.map(w=>w.value),pg.wells.map(w=>w.value));tests.push('threshold changes hit identities without changing measurements');
 const below=structuredClone(plate);below.direction='below';below.threshold=10;const br=await draw(below);assert.equal(br.error,undefined);assert(br.audit.geometry.wells.filter(w=>w.hit).every(w=>!w.control&&w.value<=10));tests.push('lower-is-hit direction is computed and excludes controls');
 const flat=structuredClone(plate);flat.values.fill(50);const flatR=await draw(flat);assert.equal(flatR.error,undefined);assert.equal(flatR.audit.geometry.zPrime,null);tests.push('equal control means report undefined Z-prime');
 const mix=await load('colour'),mx=await draw(mix);assert.equal(mx.error,undefined);assert.deepEqual(mx.audit.geometry.mixes.map(m=>m.color),mix.mixes.map(m=>m.color));tests.push('mixed colours are explicit examples rather than an invented physical calculation');
 const long=structuredClone(mix);long.title='很长的标题'.repeat(100);await reject(long,/exceeds/,'overlong heading is rejected at the family reading size');
 const report=await load('report');report.sections[0].content=await load('rhythm');await reject(report,/720px/,'technical report does not shrink a poster into its diagram slot');
 const riso=await load('riso'),rs=await draw(riso);assert.equal(rs.error,undefined);assert.deepEqual(rs.audit.geometry.peaks.map(p=>p.at),[[17],[13]]);assert.deepEqual(rs.audit.geometry.yDomain,[0,70]);tests.push('two series share a zero baseline and compute their actual peak positions');
 riso.series[0].values=[60,60,50,40,30,20,10,5,4,3,2,1];const tied=await draw(riso);assert.equal(tied.error,undefined);assert.deepEqual(tied.audit.geometry.peaks[0].at,[9,10]);tests.push('tied peaks retained rather than inventing one peak');
 const editorial=await load('editorial-page');
 for(const style of ['terracotta','ink-wash','swiss']){
   const item=structuredClone(editorial);item.style=style;
   await page.setViewportSize({width:1600,height:1100});await page.setContent(await editorHtml(item));await page.waitForFunction(()=>window.MUSECORE_READY===true);
   const desktop=await page.evaluate(()=>window.MUSECORE_RESULT);assert.deepEqual(desktop.findings,[]);assert.equal(desktop.geometry.medium,'html with original generated raster asset');assert.equal(desktop.imageLoaded,true);assert.equal(await page.locator('svg').count(),0);tests.push(style+' produces real HTML and an embedded raster image');
   await page.setViewportSize({width:390,height:1000});
   const small=await page.evaluate(()=>{const w=document.getElementById('work'),a=w.querySelector('.story').getBoundingClientRect(),b=w.querySelector('.picture').getBoundingClientRect();return {scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,stacked:b.top>=a.bottom-1,text:w.innerText}});assert(small.scroll<=small.client+1);assert(small.stacked);assert(small.text.includes(editorial.description));tests.push(style+' narrow page stacks instead of shrinking desktop type');
 }
 const malformed=structuredClone(editorial);malformed.style='../outside';await assert.rejects(()=>editorHtml(malformed),/Unknown editorial/);tests.push('editorial asset selection is limited to its registered subjects');
 console.log(JSON.stringify({passed:tests.length,tests},null,2));
}finally{await browser.close()}
