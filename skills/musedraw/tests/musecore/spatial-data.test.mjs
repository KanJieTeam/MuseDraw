import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {editorHtml,renderContent} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const skill=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const load=async id=>JSON.parse(await fs.readFile(path.join(skill,'assets/musecore',id+'.json'),'utf8'));
const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({...resolveBrowser(pw),headless:true});
const page=await browser.newPage({viewport:{width:1900,height:1300}}),tests=[];
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
async function draw(input){return page.evaluate(async input=>{try{const svg=MuseCore.render(input);document.getElementById('output').replaceChildren(svg);await document.fonts.ready;return {audit:MuseCore.audit(svg),text:svg.textContent}}catch(e){return {error:e.message}}},input)}
async function valid(input,name){const r=await draw(input);assert.equal(r.error,undefined,name);assert.deepEqual(r.audit.findings,[],name);tests.push(name);return r.audit.geometry}
async function reject(input,pattern,name){assert.match((await draw(input)).error,pattern);tests.push(name)}
try{
 await page.setContent(await editorHtml(await load('blueprint')));await page.waitForFunction(()=>window.MUSECORE_READY===true);
 for(const id of ['blueprint','constellation','scroll','dumbbell','waterfall','funnel','survey','cohort'])await valid(await load(id),id+' measured drawing');

 const blueprint=await load('blueprint'),bp=await draw(blueprint),bg=bp.audit.geometry;
 assert.equal(bg.total,blueprint.layers.reduce((s,l)=>s+l.value,0));for(const l of bg.layers)near(l.h/l.value,bg.scale);assert.equal(bg.excluded.length,blueprint.excluded.length);tests.push('layer thickness is proportional; excluded amount is outside total');
 const tiny=structuredClone(blueprint);tiny.layers[0].value=.00001;await reject(tiny,/visible resolution/,'invisible layer rejected instead of assigning fake thickness');

 const graph=await load('constellation'),gg=(await draw(graph)).audit.geometry;
 assert.deepEqual(gg.edges.map(e=>[e.from,e.to]),graph.edges.map(e=>[e.from,e.to]));for(const n of gg.nodes)near(n.r*n.r/n.value,gg.nodes[0].r**2/gg.nodes[0].value);tests.push('graph preserves directed edges and proportional node areas');
 for(const e of gg.edges){const a=gg.nodes.find(n=>n.id===e.from),b=gg.nodes.find(n=>n.id===e.to);near(Math.hypot(e.points[0][0]-a.x,e.points[0][1]-a.y),a.r+7);near(Math.hypot(e.points[1][0]-b.x,e.points[1][1]-b.y),b.r+9)}tests.push('directed edges terminate at their actual source and destination objects');
 const noEdge=structuredClone(graph);noEdge.edges[0].to='unknown';await reject(noEdge,/endpoint/,'unknown graph endpoint rejected');
 const dupEdge=structuredClone(graph);dupEdge.edges.push({...dupEdge.edges[0]});await reject(dupEdge,/duplicate/,'duplicate directed edge rejected');
 const threshold=structuredClone(graph);threshold.criticalAt=1.01;await reject(threshold,/threshold/,'rate threshold outside 0–1 rejected');

 const scroll=await load('scroll'),sg=(await draw(scroll)).audit.geometry;
 for(let i=1;i<sg.points.length;i++)near((sg.points[i].x-sg.points[0].x)/(sg.points.at(-1).x-sg.points[0].x),(sg.points[i].year-sg.points[0].year)/(sg.points.at(-1).year-sg.points[0].year));tests.push('irregular year intervals preserve numeric horizontal spacing');
 const zeroTimeline=structuredClone(scroll);zeroTimeline.points.forEach(p=>p.value=0);await valid(zeroTimeline,'all-zero timeline retains a valid zero baseline');
 const wrongYears=structuredClone(scroll);wrongYears.points[1].year=wrongYears.points[0].year;await reject(wrongYears,/strictly/,'duplicate year cannot become a made-up interval');

 const dumbbell=await load('dumbbell'),dg=(await draw(dumbbell)).audit.geometry;
 assert(dg.items.every((it,i)=>!i||it.delta<=dg.items[i-1].delta));for(const it of dg.items){near(it.delta,it.after-it.before);assert.equal(Math.sign(it.xAfter-it.xBefore),Math.sign(it.delta))}tests.push('paired comparison orders actual changes and keeps direction');
 const tied=structuredClone(dumbbell);tied.items.forEach(it=>{it.before=10;it.after=10});const tg=await valid(tied,'equal paired values render without fabricated change');assert.deepEqual(tg.items.map(it=>it.id),tied.items.map(it=>it.id));tests.push('equal changes retain source order');

 const waterfall=await load('waterfall'),wg=(await draw(waterfall)).audit.geometry;
 let total=waterfall.start;for(const it of wg.bars.filter(b=>b.kind==='change')){near(it.from,total);total+=it.value;near(it.to,total)}near(wg.end,total);tests.push('waterfall every step reconciles with preceding total');
 const negative=structuredClone(waterfall);negative.start=30;negative.changes=[{id:'loss',label:'减少',delta:-70},{id:'gain',label:'恢复',delta:55},{id:'more',label:'其他',delta:20}];negative.expectedEnd=35;const ng=await valid(negative,'waterfall crosses below zero and returns');assert(ng.domain[0]<0&&ng.domain[1]>0);assert.equal(ng.end,35);
 const wrongTotal=structuredClone(waterfall);wrongTotal.expectedEnd+=1;await reject(wrongTotal,/reconcile/,'inconsistent waterfall end rejected');

 const funnel=await load('funnel');funnel.scale='linear';const fg=await valid(funnel,'linear funnel computed from common starting cohort');for(const s of fg.stages)near(s.width/fg.stages[0].width,s.value/funnel.stages[0].value);tests.push('linear funnel widths preserve count ratios');
 const zeroTail=structuredClone(funnel);zeroTail.stages.at(-2).value=0;zeroTail.stages.at(-1).value=0;const zg=await valid(zeroTail,'funnel accepts observed zero at tail');assert.equal(zg.stages.at(-1).width,0);assert.equal(zg.stages.at(-1).conversion,null);tests.push('zero-over-zero conversion is undefined rather than invented');
 const growing=structuredClone(funnel);growing.stages[1].value=growing.stages[0].value+1;await reject(growing,/cannot grow/,'non-nested stages rejected as a funnel');
 const logZero=structuredClone(zeroTail);logZero.scale='log';await reject(logZero,/positive/,'zero cannot be hidden in logarithmic funnel');

 const survey=await load('survey');survey.items[0].counts=[1,3,2,4,0];const qg=await valid(survey,'survey normalizes each question using its own sample size');
 for(const it of qg.items){assert.equal(it.n,it.counts.reduce((s,v)=>s+v,0));near(it.p.reduce((s,v)=>s+v,0),1);near(it.agree,(it.counts[3]+it.counts[4])/it.n);near(it.segments[2].x+it.segments[2].w/2,920)}tests.push('survey sample sizes, agreement and centered neutral segment agree');
 const extreme=structuredClone(survey);extreme.items[0].counts=[100,0,0,0,0];extreme.items[1].counts=[0,0,100,0,0];extreme.items[2].counts=[0,0,0,0,100];await valid(extreme,'survey supports fully negative, neutral and positive responses');

 const cohort=await load('cohort'),cg=(await draw(cohort)).audit.geometry;
 for(const g of cg.groups)for(const p of g.periods){const rows=cohort.cohorts.filter(c=>c.group===g.id&&c.counts[p.period]!==null);const den=rows.reduce((s,c)=>s+c.size,0),num=rows.reduce((s,c)=>s+c.counts[p.period],0);assert.equal(p.denominator,den);assert.equal(p.numerator,num);if(den)near(p.value,num/den);else assert.equal(p.value,null)}tests.push('cohort curves pool observed counts and denominators separately per period');
 const observed=cohort.cohorts.find(c=>c.counts.includes(null)),cell=cg.cells.find(c=>c.cohort===observed.id&&c.count===null);assert.equal(cell.value,null);tests.push('not-yet-observed cohort cell stays missing instead of zero');
 const equal=structuredClone(cohort);equal.cohorts.forEach(c=>c.counts=c.counts.map((n,i)=>n===null?null:i===0?c.size:Math.round(c.size*.5)));await valid(equal,'identical curve endpoints do not stack endpoint labels');
 const hole=structuredClone(cohort);hole.cohorts[0].counts[1]=null;await reject(hole,/trailing suffix/,'internal hole cannot masquerade as cohort maturity');
 const initial=structuredClone(cohort);initial.cohorts[0].counts[0]-=1;await reject(initial,/period zero/,'cohort initial count must equal its denominator');
 const periods=structuredClone(cohort);periods.periods[1]=periods.periods[0];await reject(periods,/duplicate/,'duplicate period labels rejected');

 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'musecore-wide-'));
 try{const check=await renderContent(scroll,{out:directory});const png=await fs.readFile(path.join(directory,'diagram.png'));assert.equal(png.readUInt32BE(16),check.geometry.width*2);assert(png.readUInt32BE(20)>=check.geometry.height*2);
  const reference=await browser.newPage({viewport:{width:check.geometry.width+64,height:1200},deviceScaleFactor:2});
  try{const svg=await fs.readFile(path.join(directory,'diagram.svg'),'utf8');await reference.setContent('<!doctype html><meta charset="utf-8"><style>body{margin:0}svg{display:block}</style>'+svg);await reference.evaluate(()=>document.fonts.ready);const expected=await reference.locator('svg').screenshot();assert(png.equals(expected),'PNG must equal the independently mounted unclipped SVG, not merely have a wide header')}finally{await reference.close()}
  tests.push('production PNG matches a standalone unclipped 1800px-wide SVG at 2×')
 }finally{await fs.rm(directory,{recursive:true,force:true})}
 console.log(JSON.stringify({passed:tests.length,tests},null,2));
}finally{await browser.close()}
