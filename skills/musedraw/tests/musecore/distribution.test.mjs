import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';
import {labelTrack,pairedStats,binObservations} from '../../scripts/musecore/quantitative.mjs';
const skill=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),load=async id=>JSON.parse(await fs.readFile(path.join(skill,'assets/musecore',id+'.json'),'utf8'));
const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({...resolveBrowser(pw),headless:true}),page=await browser.newPage({viewport:{width:1900,height:1400}}),tests=[];
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
async function draw(input){return page.evaluate(async input=>{try{const s=MuseCore.render(input);document.getElementById('output').replaceChildren(s);await document.fonts.ready;return {audit:MuseCore.audit(s),text:s.textContent}}catch(e){return {error:e.message}}},input)}
async function valid(input,name){const r=await draw(input);assert.equal(r.error,undefined,name);assert.deepEqual(r.audit.findings,[],name);tests.push(name);return r.audit.geometry}
async function reject(input,pattern,name){assert.match((await draw(input)).error,pattern);tests.push(name)}
try{
 const registry=JSON.parse(execFileSync(process.execPath,[path.join(skill,'scripts/case-library.mjs'),'--search','d06-sangji-shouzhi'],{encoding:'utf8'}));assert.equal(registry.items[0].contentDriven.family,'sankey');tests.push('case discovery exposes a matching executable family before loading source artwork');
 const allSources=JSON.parse(await fs.readFile(path.join(skill,'assets/case-library/index.json'),'utf8')).items,examples=JSON.parse(await fs.readFile(path.join(skill,'assets/musecore/index.json'),'utf8')).examples,registered=new Set(examples.flatMap(e=>[e.source?.case,...(e.sourceCases??[]).map(s=>s.id)])),unconverted=allSources.find(s=>!registered.has(s.id));
 if(unconverted){const unmapped=JSON.parse(execFileSync(process.execPath,[path.join(skill,'scripts/case-library.mjs'),'--search',unconverted.id],{encoding:'utf8'}));assert.equal(unmapped.items[0].contentDriven,undefined)}tests.push('only registered source links are declared content-driven');
 await page.setContent(await editorHtml(await load('slope')));await page.waitForFunction(()=>window.MUSECORE_READY===true);
 for(const id of ['slope','small-multiples','pyramid','scatter-panels','bump','unit-chart','histogram','sankey'])await valid(await load(id),id+' measured rendering');
 const tr=labelTrack([{id:'a',desired:50},{id:'b',desired:51},{id:'c',desired:52}],{top:0,bottom:100,gap:35});assert(tr[1].placed-tr[0].placed>=35&&tr[2].placed-tr[1].placed>=35);assert.deepEqual(tr.map(x=>x.desired),[50,51,52]);tests.push('label track separates labels without changing point positions');
 assert.throws(()=>labelTrack([{desired:2},{desired:3},{desired:4}],{top:0,bottom:30,gap:20}),/dense/);tests.push('impossible label track refuses instead of shrinking');
 const slope=await load('slope'),sg=(await draw(slope)).audit.geometry;assert.deepEqual(sg.items.map(x=>x.id),slope.items.map(x=>x.id));for(const it of sg.items){near(it.delta,it.after-it.before);assert.equal(Math.sign(it.yBefore-it.yAfter),Math.sign(it.after-it.before))}tests.push('slope labels remain bound to actual numeric endpoints');
 const close=structuredClone(slope);close.items.forEach((it,i)=>{it.before=60+i*.1;it.after=61+i*.1});const cg=await valid(close,'close scores use an explicitly disclosed fitted common axis');assert(cg.domain[0]>0);assert((await draw(close)).text.includes('共同纵轴'));tests.push('truncated slope axis is visible in the artwork');
 const unknown=structuredClone(slope);unknown.highlight=['unknown'];await reject(unknown,/unknown/,'slope cannot highlight a fabricated object');

 const small=await load('small-multiples'),mg=(await draw(small)).audit.geometry;for(const p of mg.panels){near(p.total,p.values.reduce((s,v)=>s+v,0));for(const m of p.marks)if(m.value)near(m.h/m.value,mg.panels[0].marks.find(x=>x.value).h/mg.panels[0].marks.find(x=>x.value).value)}tests.push('all small multiples share one value-to-height scale');
 small.series[0].values.fill(7);const multi=await valid(small,'small multiples preserve tied peaks');assert.equal(multi.panels[0].peaks.length,small.categories.length);tests.push('tied maxima are not reduced to one selected month');
 const two=structuredClone(small);two.series=two.series.slice(0,2);const twoG=await valid(two,'two panels reallocate width');assert.equal(twoG.columns,2);

 const pyramid=await load('pyramid'),pg=(await draw(pyramid)).audit.geometry;assert.deepEqual(pg.bands.map(b=>b.id),pyramid.bands.map(b=>b.id).reverse());for(const b of pg.bands)near(b.leftWidth/b.left,b.rightWidth/b.right);tests.push('pyramid reverses declared age order and preserves a common left-right scale');
 const z=structuredClone(pyramid);z.bands.forEach(b=>{b.left=0;b.right=0});const zg=await valid(z,'empty population bands remain zero length');assert.equal(zg.leftTotal+zg.rightTotal,0);

 const scatter=await load('scatter-panels'),scg=(await draw(scatter)).audit.geometry;assert.equal(scg.groups.at(-1).stats.slope,null);assert.equal(scg.groups.at(-1).fitShown,false);assert.equal(scg.groups.at(-1).stats.correlation,null);tests.push('constant-x observations have no fabricated fit or correlation');
 const exact=pairedStats([{x:1,y:3},{x:2,y:5},{x:3,y:7}]);near(exact.slope,2);near(exact.intercept,1);near(exact.correlation,1);tests.push('paired statistics reproduce an independently specified exact line');
 const noFit=structuredClone(scatter);noFit.fit=false;const nf=await valid(noFit,'explicit no-fit request removes every regression line');assert(nf.groups.every(g=>!g.fitShown));assert.equal(nf.groups.reduce((s,g)=>s+g.points.length,0),scatter.groups.reduce((s,g)=>s+g.points.length,0));tests.push('removing fits retains every original observation');

 const bump=await load('bump'),bg=(await draw(bump)).audit.geometry;for(const it of bg.items)assert.deepEqual(it.ranks,bump.items.find(x=>x.id===it.id).ranks);tests.push('rank paths use supplied categorical positions without recomputing rank');
 const ties=structuredClone(bump);ties.items[1].ranks[0]=ties.items[0].ranks[0];await reject(ties,/tied/,'ranking ties trigger a scope exit');

 const unit=await load('unit-chart'),ug=(await draw(unit)).audit.geometry;assert.equal(ug.marks.length,100);assert.equal(ug.total,100);for(const it of unit.items)assert.equal(ug.marks.filter(m=>m.id===it.id).length,it.value);tests.push('unit chart has exactly one symbol per supplied person');
 const pair=structuredClone(unit);pair.perSymbol=2;pair.items.forEach(it=>it.value*=2);const up=await valid(pair,'exact two-person symbol unit is disclosed');assert.equal(up.marks.length,100);assert.equal(up.total,200);assert(up.marks.every(m=>m.value===2));tests.push('per-symbol value changes without rounding category totals');
 const wrap=structuredClone(unit);wrap.items[0].value=110;wrap.items[0].label='需要换成两行显示的通勤方式';const wr=await valid(wrap,'unit symbols and long category text allocate their own row height');assert(wr.items[0].rows===3);assert(wr.items[1].y>wr.items[0].y+3*42);
 const fractional=structuredClone(unit);fractional.perSymbol=3;await reject(fractional,/fractional/,'fractional people are not silently rounded');

 const hist=await load('histogram'),hg=(await draw(hist)).audit.geometry;assert.equal(hg.bins.reduce((s,b)=>s+b.count,0),hist.values.length);near(hg.mean,hist.values.reduce((s,v)=>s+v,0)/hist.values.length);const sorted=[...hist.values].sort((a,b)=>a-b);near(hg.median,(sorted[24]+sorted[25])/2);tests.push('histogram counts, mean and median come from raw observations');
 assert.deepEqual(binObservations([0,1,2,3,4,5,6],[0,2,4,6]).map(b=>b.count),[2,2,3]);tests.push('histogram bins are left-closed; final bin includes final boundary');
 const density=structuredClone(hist);density.edges=[40,50,70,100];density.density=true;const hd=await valid(density,'unequal bins use density');near(hd.bins.reduce((s,b)=>s+b.heightValue*(b.right-b.left),0),1);tests.push('unequal-bin density integrates to one');
 const densityText=(await draw(density)).text;assert(densityText.includes('0.005')&&densityText.includes('0.015'));tests.push('density ticks retain enough precision to distinguish adjacent levels');
 density.density=false;await reject(density,/density/,'unequal count-height bins are refused');
 const outside=structuredClone(hist);outside.values.push(101);await reject(outside,/outside/,'out-of-range observation is not dropped');

 const flow=await load('sankey'),fg=(await draw(flow)).audit.geometry;assert.equal(fg.total,1500);assert(fg.columnTotals.every(n=>n===1500));assert.deepEqual(new Set(fg.nodes.map(n=>n.id)),new Set(flow.nodes.map(n=>n.id)));for(const l of fg.links)near(l.height/l.value,fg.scale);tests.push('Sankey identity, conserved totals and global band scale agree');
 for(const n of fg.nodes.filter(n=>n.column>0&&n.column<flow.columns.length-1))near(n.incoming,n.outgoing);tests.push('every internal Sankey node conserves its amounts');
 for(const n of fg.nodes){const outgoing=fg.links.filter(l=>l.from===n.id);for(let i=1;i<outgoing.length;i++)assert(outgoing[i].sourceY>=outgoing[i-1].sourceY+outgoing[i-1].height-1e-8)}tests.push('outgoing band ports partition each node instead of overlapping');
 const unbalanced=structuredClone(flow);unbalanced.links[2].value+=1;await reject(unbalanced,/conserve/,'unbalanced amount is refused instead of hidden in Other');
 const backwards=structuredClone(flow);backwards.links.push({from:'pool',to:'salary',value:1});await reject(backwards,/adjacent/,'Sankey cycle or backward edge requires another view');
 console.log(JSON.stringify({passed:tests.length,tests},null,2));
}finally{await browser.close()}
