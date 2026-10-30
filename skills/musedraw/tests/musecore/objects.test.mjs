import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';
import {clockGeometry,planeReflection,thinLens,leverBalance} from '../../scripts/musecore/teaching-objects.mjs';
import {isometricPoint,solidMeasure,columnSolid} from '../../scripts/musecore/solid-objects.mjs';
const skill=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),load=async id=>JSON.parse(await fs.readFile(path.join(skill,'assets/musecore',id+'.json'),'utf8'));
const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({...resolveBrowser(pw),headless:true}),page=await browser.newPage({viewport:{width:2000,height:1600}}),tests=[];
const near=(a,b)=>assert(Math.abs(a-b)<1e-7*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
async function draw(input){return page.evaluate(async input=>{try{const svg=MuseCore.render(input);document.getElementById('output').replaceChildren(svg);await document.fonts.ready;return {audit:MuseCore.audit(svg),text:svg.textContent}}catch(e){return {error:e.message}}},input)}
async function valid(input,name){const r=await draw(input);assert.equal(r.error,undefined,name);assert.deepEqual(r.audit.findings,[],name);tests.push(name);return r.audit.geometry}
async function reject(input,pattern,name){assert.match((await draw(input)).error,pattern);tests.push(name)}
try{
 await page.setContent(await editorHtml(await load('clock')));await page.waitForFunction(()=>window.MUSECORE_READY===true);
 for(const id of ['clock','reflection','lever','lens','ruler','magnitudes','solids','orthoview'])await valid(await load(id),id+' measured rendering');
 const time=clockGeometry(3,45,300);near(time.hourDegrees,112.5);near(time.minuteDegrees,270);assert(time.hourEnd[0]>0&&time.hourEnd[1]>0);tests.push('3:45 puts the short hand between 3 and 4, not on 3');
 for(let minute=0;minute<59;minute++)near(clockGeometry(7,minute+1,300).hourDegrees-clockGeometry(7,minute,300).hourDegrees,.5);tests.push('hour hand advances continuously by half a degree per minute');
 const midnight=await load('clock');Object.assign(midnight,{hour:23,minute:55,afterMinutes:20,title:'跨过午夜'});const mg=await valid(midnight,'clock comparison crosses midnight without hand or numeral collision');assert.equal(mg.dayCarry,1);assert.equal(mg.clocks[1].hour,0);assert.equal(mg.clocks[1].minute,15);
 for(const g of mg.clocks)assert(Math.hypot(...g.minuteEnd)>Math.hypot(...g.hourEnd));tests.push('hand roles use length as well as colour');
 const badTime=await load('clock');badTime.minute=60;await reject(badTime,/minute/,'invalid clock minute rejected');

 const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];for(const angle of [0,5,25,40,60,80])for(const tilt of [-20,0,20]){const r=planeReflection(angle,tilt);near(dot(r.normal,r.tangent),0);near(dot(r.incident,r.incident),1);near(dot(r.reflected,r.reflected),1);near(dot(r.reflected,r.normal),-dot(r.incident,r.normal));near(dot(r.reflected,r.tangent),dot(r.incident,r.tangent));near(Math.acos(Math.max(-1,Math.min(1,dot(r.reflected,r.normal))))*180/Math.PI,angle)}tests.push('reflection obeys equal normal angles and retains the tangent component for 18 conditions');
 const reflection=await load('reflection');for(const angle of [0,5,80]){const r=structuredClone(reflection);r.angleDegrees=angle;await valid(r,angle+' degree reflection keeps labels separated')}
 reflection.angleDegrees=60;reflection.tiltDegrees=20;const rf=await valid(reflection,'tilted mirror changes the normal and both ray directions');near(dot(rf.normal,rf.tangent),0);
 reflection.angleDegrees=90;await reject(reflection,/supports/,'grazing ray outside the bounded view is refused');

 near(leverBalance('first',.8,.2,100).effortForce,25);near(leverBalance('second',.8,.4,100).effortForce,50);near(leverBalance('third',.3,1,100).effortForce,100/.3);tests.push('three lever classes use their actual perpendicular arms');
 const lever=await load('lever'),lg=(await draw(lever)).audit.geometry;for(const e of lg.examples)near(e.effortMoment,e.loadMoment);assert(lg.examples[0].effortPosition<0&&lg.examples[1].effortPosition>lg.examples[1].loadPosition&&lg.examples[2].effortPosition<lg.examples[2].loadPosition);tests.push('lever placement and moments agree with its declared class');
 assert((await draw(lever)).text.includes('333.33 × 0.3 ≈'));tests.push('rounded factors use approximation instead of an incorrect exact equality');
 const wrongClass=structuredClone(lever);wrongClass.examples[1].effortArm=.2;await reject(wrongClass,/contradicts/,'class label cannot contradict lever geometry');

 const textbook=thinLens(.5,.75,.03);near(textbook.imageDistance,1.5);near(textbook.magnification,-2);near(textbook.imageHeight,-.06);tests.push('thin-lens helper reproduces the cited textbook example');
 const virtual=thinLens(10,5,4);assert.equal(virtual.imageDistance,-10);assert.equal(virtual.imageHeight,8);assert.equal(virtual.kind,'virtual upright');tests.push('virtual image retains negative image distance and upright height');
 const focus=thinLens(10,10,4);assert.equal(focus.imageDistance,null);assert.equal(focus.magnification,null);tests.push('exact focal placement has no fabricated finite image');
 assert(thinLens(10,10.0000001,4).imageDistance>0);tests.push('a near-focus finite input is not silently changed into exact focus');
 for(const d of [5,15,20,30,50]){const r=thinLens(10,d,4);near(1/10,1/d+1/r.imageDistance);near(4-4/10*r.imageDistance,r.imageHeight);near(-4/d*r.imageDistance,r.imageHeight)}tests.push('both principal rays and the equation meet at the computed image for five distances');
 const lens=await load('lens');lens.objectDistance=5;await valid(lens,'virtual-image ray view uses backward extensions');lens.objectDistance=10;await valid(lens,'focal ray view keeps the outgoing rays parallel');lens.objectDistance=10.00001;await reject(lens,/unreadable/,'near-focus geometry refuses unreadable scaling rather than faking the image');

 const ruler=await load('ruler'),rg=(await draw(ruler)).audit.geometry;assert.equal(rg.millimetres,45);assert.equal(rg.conversions.find(c=>c.unit==='m').value,.045);assert((await draw(ruler)).text.includes('0.045'));tests.push('unit conversion retains 0.045 metres instead of rounding to 0.05');
 assert.equal(rg.ticks.length,101);near((rg.object.end-rg.object.start)/(rg.ticks.at(-1).x-rg.ticks[0].x),.45);tests.push('ruler endpoint and all 101 graduations use the same scale');
 ruler.quantity=45;ruler.inputUnit='mm';const equiv=await valid(ruler,'equivalent millimetre input preserves the geometry');near(equiv.object.end,rg.object.end);ruler.quantity=150;await reject(ruler,/exceeds/,'length beyond the displayed ruler is refused');

 const magnitude=await load('magnitudes'),mag=(await draw(magnitude)).audit.geometry;near(mag.logDomain[1]-mag.logDomain[0],12);const a=mag.items.find(x=>x.id==='cm'),b=mag.items.find(x=>x.id==='mm'),c=mag.items.find(x=>x.id==='m');near(a.pointY-b.pointY,(c.pointY-a.pointY)/2);tests.push('tenfold quantities have equal log-space distance');
 const close=structuredClone(magnitude);close.items[0].value=.001;close.items[1].value=.0011;close.items[2].value=.0012;const cg=await valid(close,'nearby magnitude labels move without changing numeric points');assert(cg.items.some(it=>it.labelY!==it.pointY));for(const it of cg.items)near(it.logValue,Math.log10(it.value));
 magnitude.items[0].value=0;await reject(magnitude,/positive/,'zero cannot acquire a fabricated logarithmic position');

 near(solidMeasure({kind:'cuboid',width:6,depth:3,height:4}).volume,72);near(solidMeasure({kind:'cube',size:4}).volume,64);near(solidMeasure({kind:'cylinder',radius:2,height:5}).volume,20*Math.PI);near(solidMeasure({kind:'sphere',radius:2}).volume,32*Math.PI/3);tests.push('solid dimensions and four volume formulas remain attached');
 for(const axis of [[1,0,0],[0,1,0],[0,0,1]])near(Math.hypot(...isometricPoint(...axis,70)),70);tests.push('isometric projection applies one common unit scale to each axis');
 const solids=await load('solids');solids.objects=solids.objects.slice(0,3);const three=await valid(solids,'three objects reflow into one row');assert.equal(three.objects.length,3);

 const orth=await load('orthoview'),og=(await draw(orth)).audit.geometry;assert.equal(og.solid.count,9);assert.deepEqual(og.solid.front,[3,1,1]);assert.deepEqual(og.solid.side,[1,2,3]);assert.deepEqual(og.solid.top,[[true,true,true],[true,true,false],[true,false,false]]);tests.push('known nine-cube solid produces independent expected orthographic projections');
 assert.equal(og.views.front.length,5);assert.equal(og.views.side.length,6);assert.equal(og.views.top.length,6);tests.push('2D cell counts represent silhouettes, not summed cube heights');
 const block=columnSolid([[2,2],[2,2]]);assert.equal(block.count,8);assert.equal(block.faces.length,12);tests.push('internal cube faces are omitted while exterior unit divisions remain');
 for(const f of og.solid.faces){const {x,y,z}=f.cube;assert(z<orth.heights[y][x]);if(f.kind==='top')assert.equal(z,orth.heights[y][x]-1);if(f.kind==='right')assert((orth.heights[y][x+1]??0)<=z);if(f.kind==='front')assert((orth.heights[y+1]?.[x]??0)<=z)}tests.push('every displayed cube face belongs to the supplied height map and is exposed');
 const one=structuredClone(orth);one.heights=[[1,0],[0,0]];await valid(one,'one-cube solid retains all three projections');const ragged=structuredClone(orth);ragged.heights[0].pop();await reject(ragged,/Rectangular/,'ragged grid is not padded with invented cubes');
 console.log(JSON.stringify({passed:tests.length,tests},null,2));
}finally{await browser.close()}
