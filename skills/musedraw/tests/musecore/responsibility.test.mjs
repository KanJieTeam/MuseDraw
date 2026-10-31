import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {daciAssignments,backupInventory} from '../../scripts/musecore/responsibility-models.mjs';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';
const fixture=async name=>JSON.parse(await fs.readFile(new URL('../../assets/musecore/'+name+'.json',import.meta.url),'utf8'));

test('actual browser: role alignment, changed assignments and counted inventory marks',async()=>{
 const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({...resolveBrowser(pw),headless:true});
 try{
  const page=await browser.newPage({viewport:{width:2100,height:1700}});
  await page.setContent(await editorHtml(await fixture('daci')));await page.waitForFunction(()=>window.MUSECORE_READY===true);
  const variants=[];
  const daci=await fixture('daci');variants.push(daci);
  const many=structuredClone(daci);many.assignments.contributors=many.people.map(p=>p.id);many.assignments.informed=[];many.inputs.contributors='整理不同业务部门提出的全部问题，并将仍需确认的意见分别汇总后再交给决策人。';variants.push(many);
  const minimal=structuredClone(daci);minimal.assignments.contributors=[];minimal.assignments.informed=[];delete minimal.status;variants.push(minimal);
  const backup=await fixture('backup-inventory');variants.push(backup);
  const planned=structuredClone(backup);planned.copies=planned.copies.map(c=>c.original?c:{...c,status:'planned'});variants.push(planned);
  const nine=structuredClone(backup);while(nine.copies.length<9)nine.copies.push({...nine.copies[1],id:'copy-'+nine.copies.length,label:'计划中的附加副本 '+nine.copies.length,status:'planned'});variants.push(nine);
  const rendered=[];
  for(const input of variants){
   const result=await page.evaluate(async b=>{
    const svg=MuseCore.render(b);document.getElementById('output').replaceChildren(svg);await document.fonts.ready;
    const marks=Object.fromEntries(['copies','media','offsite'].map(k=>[k,svg.querySelectorAll('[data-count-mark="'+k+'"]').length]));
    const planned=[...svg.querySelectorAll('[data-status="planned"]')].map(e=>({fill:e.getAttribute('fill'),dash:e.getAttribute('stroke-dasharray')}));
    return {audit:MuseCore.audit(svg),marks,planned,text:svg.textContent};
   },input);
   assert.deepEqual(result.audit.findings,[]);
   const g=result.audit.geometry;rendered.push(g);
   if(input.family==='daci'){
    const model=daciAssignments(input);assert.deepEqual(g.roles.map(r=>r.count),model.roles.map(r=>r.count));assert.equal(g.assignedPeople,model.assignedPeople);
    assert.equal(new Set(g.cards.map(c=>c.y)).size,1);assert.equal(new Set(g.cards.map(c=>c.width)).size,1);
   }else{
    const model=backupInventory(input);assert.deepEqual(g.counts,model.counts);assert.deepEqual(result.marks,model.counts);assert.equal(result.planned.length,model.plannedIds.length);
    for(const marker of result.planned){assert.equal(marker.fill,'none');assert(marker.dash)}
   }
  }
  assert(rendered[1].height>rendered[0].height,'longer role lists should grow the common cards');
  assert.equal(rendered[4].counts.copies,1);assert.equal(rendered[5].plannedIds.length,6);
 }finally{await browser.close()}
});
test('DACI counts actual people references and preserves cross-role identities',async()=>{const b=await fixture('daci'),r=daciAssignments(b);assert.deepEqual(r.roles.map(x=>x.count),[1,1,3,2]);assert.equal(r.assignedPeople,6);assert.equal(r.assignmentCount,7);assert.deepEqual(r.sharedIds,['wu']);assert.equal(r.status,'planned')});
test('DACI rejects cardinality, duplicate IDs and unresolved references',async()=>{const b=await fixture('daci');for(const mutate of [x=>x.assignments.driver.push('lin'),x=>x.assignments.approver=[],x=>x.assignments.contributors.push('lin'),x=>x.assignments.informed=['unknown'],x=>x.people.push(x.people[0]),x=>x.status='complete']){const x=structuredClone(b);mutate(x);assert.throws(()=>daciAssignments(x))}});
test('DACI unassigned optional roles and omitted status do not imply completion',async()=>{const b=await fixture('daci');b.assignments.contributors=[];b.assignments.informed=[];delete b.status;const r=daciAssignments(b);assert.deepEqual(r.roles.map(x=>x.count),[1,1,0,0]);assert.equal(r.status,null)});
test('backup counts present only, includes original, and hand-calculates ideal transfer',async()=>{const r=backupInventory(await fixture('backup-inventory'));assert.deepEqual(r.counts,{copies:3,media:2,offsite:1});assert.equal(r.meetsCountThresholds,true);assert.equal(r.originalId,'source');assert.deepEqual(r.plannedIds,['planned']);assert.equal(r.transfer.seconds,5000);assert.equal(r.transfer.seconds/60,83+1/3)});
test('backup one copy fails targets; ID media aliases retain distinct categories',async()=>{const b=await fixture('backup-inventory');b.copies=b.copies.slice(0,1);delete b.transfer;let r=backupInventory(b);assert.deepEqual(r.counts,{copies:1,media:1,offsite:0});assert.equal(r.meetsCountThresholds,false);b.media=[{id:'disk',label:'磁盘'}];b.copies[0].medium='disk';r=backupInventory(b);assert.equal(r.media[0].label,'磁盘')});
test('nine copies retain bounds, planned categories and offsite claims cannot inflate present totals',async()=>{const b=await fixture('backup-inventory');b.copies=Array.from({length:9},(_,i)=>({id:'c'+i,label:'副本 '+i,medium:'介质 '+i,location:'地点 '+i,offsite:i>0,status:i===0?'present':'planned',original:i===0}));let r=backupInventory(b);assert.deepEqual(r.counts,{copies:1,media:1,offsite:0});assert.equal(r.plannedIds.length,8);b.copies.forEach(c=>c.status='present');r=backupInventory(b);assert.deepEqual(r.counts,{copies:9,media:9,offsite:8})});
test('backup rejects missing/or planned originals, no medium, wrong status and implied fields',async()=>{const b=await fixture('backup-inventory');for(const mutate of [x=>x.copies[0].original=false,x=>x.copies[1].original=true,x=>x.copies[0].status='planned',x=>delete x.copies[1].medium,x=>x.copies[1].medium='',x=>x.copies[1].offsite='yes',x=>x.copies[1].status='complete',x=>x.media=[{id:'other',label:'类别'}],x=>x.transfer.bytesPerSecond=0,x=>x.rpo=3600,x=>x.copies=Array.from({length:10},(_,i)=>({...x.copies[0],id:String(i),original:i===0}))]){const x=structuredClone(b);mutate(x);assert.throws(()=>backupInventory(x))}});

test('backup counted geometry preserves exact member identities, source rows and caller note under font changes',async()=>{
 const base=await fixture('backup-inventory'),maximum=structuredClone(base);maximum.copies=Array.from({length:9},(_,i)=>({id:'copy-'+i,label:'给定副本 '+i,medium:'medium-'+i,location:'地点 '+i,offsite:i>0,status:'present',original:i===0}));
 const planned=structuredClone(maximum);planned.copies.forEach((c,i)=>{if(i)c.status='planned'});
 const zero=structuredClone(base);zero.copies=zero.copies.slice(0,1);delete zero.transfer;
 const long=structuredClone(base);long.copies.forEach(c=>{c.label+='及其完整业务名称';c.location+='与给定保管部门的说明'});long.note='用户原注：每一份计划和现有副本都应保留，数量达标不证明恢复成功。';
 const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({...resolveBrowser(pw),headless:true});try{const page=await browser.newPage();await page.route(/^https?:\/\//,r=>r.abort());for(const input of [base,maximum,planned,zero,long]){await page.setContent(await editorHtml(input));await page.waitForFunction(()=>window.MUSECORE_READY===true);const ordinary=await page.evaluate(()=>window.MUSECORE_RESULT);assert.equal(ordinary.error,undefined,ordinary.error);assert.deepEqual(ordinary.findings,[]);const expected=backupInventory(input),check=g=>{assert.deepEqual(g.counts,expected.counts);assert.deepEqual(g.thresholds,expected.thresholds);assert.equal(g.note,input.note);assert.deepEqual(g.copies,expected.copies);for(const key of ['copies','media','offsite']){const metric=g.countGeometry.find(m=>m.key===key),ids=key==='copies'?expected.presentIds:key==='media'?expected.mediumKeys:expected.offsiteIds;assert.equal(metric.count,ids.length);assert.deepEqual(metric.marks.map(m=>m.id),ids)}for(const [i,row]of g.rows.entries())for(const key of ['id','label','medium','location','offsite','status','original'])assert.deepEqual(row[key],input.copies[i][key])};check(ordinary.geometry);
 const stress=await page.evaluate(input=>{const original=CanvasRenderingContext2D.prototype.measureText;CanvasRenderingContext2D.prototype.measureText=function(t){const metrics=original.call(this,t);return new Proxy(metrics,{get(target,key){return key==='fontBoundingBoxAscent'?Reflect.get(target,key,target)+40:Reflect.get(target,key,target)}})};try{const svg=MuseCore.render(input);document.body.replaceChildren(svg);return MuseCore.audit(svg)}finally{CanvasRenderingContext2D.prototype.measureText=original}},input);assert.deepEqual(stress.findings,[]);assert(stress.geometry.height>ordinary.geometry.height);check(stress.geometry)}}finally{await browser.close()}
});
