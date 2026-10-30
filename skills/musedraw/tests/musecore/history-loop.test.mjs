import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {gitHistoryModel} from '../../scripts/musecore/history-models.mjs';
import {loopTraceModel} from '../../scripts/musecore/loop-models.mjs';
import {browserBundle} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const read=async name=>JSON.parse(await fs.readFile(new URL('../../assets/musecore/'+name+'.json',import.meta.url),'utf8')),git=await read('git-history'),loop=await read('loop-trace'),clone=b=>structuredClone(b);
test('symbolic merge/rebase parents match a manually specified fork',()=>{
 const r=gitHistoryModel(git);assert.deepEqual(r.original.nodes.map(n=>[n.id,n.parents]),[['A',[]],['B',['A']],['E',['B']],['C',['B']],['D',['C']]]);assert.deepEqual(r.merge.nodes.at(-1).parents,['E','D']);assert.deepEqual(r.merge.refs,{main:'M',topic:'D'});assert.deepEqual(r.rebase.nodes.map(n=>[n.id,n.parents]),[['A',[]],['B',['A']],['E',['B']],['rebased:C',['E']],['rebased:D',['rebased:C']]]);assert.deepEqual(r.rebase.mapping.map(m=>[m.original,m.originalParents,m.replayed,m.parents]),[['C',['B'],'rebased:C',['E']],['D',['C'],'rebased:D',['rebased:C']]]);assert.deepEqual(r.rebase.refs,{main:'E',topic:'rebased:D'});
 const short=clone(git);short.common=short.common.slice(0,1);short.topic=short.topic.slice(0,1);assert.deepEqual(gitHistoryModel(short).merge.nodes.find(n=>n.id==='C').parents,['A']);assert.equal(new Set(r.rebase.nodes.map(n=>n.id)).size,r.rebase.nodes.length);
});
test('loop trace matches independent hand calculations and a final failed check',()=>{
 const r=loopTraceModel(loop);assert.deepEqual(r.iterations.map(row=>[row.i,row.term,row.before,row.after,row.next]),[[1,1,0,1,2],[2,2,1,3,3],[3,3,3,6,4],[4,4,6,10,5],[5,5,10,15,6]]);assert.equal(r.conditionCount,6);assert.equal(r.finalAccumulator,15);assert.deepEqual(r.events.slice(1,5).map(e=>e.phase),['condition','body','accumulate','update']);assert.deepEqual([r.events.at(-1).phase,r.events.at(-1).i,r.events.at(-1).result],['condition',6,false]);
 const down=clone(loop);Object.assign(down,{initial:7,step:-2,bound:0,comparison:'>'});down.accumulator.action='add-square';const d=loopTraceModel(down);assert.deepEqual(d.iterations.map(row=>[row.i,row.term,row.after]),[[7,49,49],[5,25,74],[3,9,83],[1,1,84]]);assert.equal(d.finalIndex,-1);
 const zero=clone(loop);zero.initial=6;assert.deepEqual(loopTraceModel(zero).iterations,[]);assert.equal(loopTraceModel(zero).conditionCount,1);assert.equal(loopTraceModel(zero).finalAccumulator,0);
 const fixed=clone(loop);fixed.accumulator={name:'count',initial:10,action:'add-constant',constant:-3};assert.equal(loopTraceModel(fixed).finalAccumulator,-5);
 const exclusive=clone(loop);exclusive.comparison='<';assert.deepEqual(loopTraceModel(exclusive).iterations.map(r=>r.i),[1,2,3,4]);
 const inclusiveDown=clone(loop);Object.assign(inclusiveDown,{initial:4,step:-2,bound:0,comparison:'>='});assert.deepEqual(loopTraceModel(inclusiveDown).iterations.map(r=>r.i),[4,2,0]);assert.equal(loopTraceModel(inclusiveDown).finalAccumulator,6);
});
test('reject unsupported graph shapes, code, nontermination and excessive numeric work',()=>{
 const gitBad=[b=>b.main=[],b=>b.topic[0].id='A',b=>b.topic[0].parents=['missing'],b=>b.mainBranch=b.topicBranch,b=>b.merge.id='D',b=>b.topic.push(...[1,2,3].map(i=>({id:'X'+i,label:'提交'}))),b=>b.topic[0].label='长'.repeat(65)];for(const mutate of gitBad){const b=clone(git);mutate(b);assert.throws(()=>gitHistoryModel(b))}
 const loopBad=[b=>b.step=0,b=>b.step=-1,b=>b.bound=13,b=>b.comparison='!=',b=>b.accumulator.action='eval',b=>b.accumulator.constant=8,b=>b.variable=b.accumulator.name,b=>b.variable='term',b=>b.accumulator.name='term',b=>b.step=0.1,b=>{b.initial=100000;b.bound=100000;b.accumulator.action='add-square'},b=>b.accumulator.initial=Infinity];for(const mutate of loopBad){const b=clone(loop);mutate(b);assert.throws(()=>loopTraceModel(b))}
});
test('browser uses real parent endpoints and recalculates layouts and terminal rows',async()=>{
 const bundle=await browserBundle();
 const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});try{const page=await browser.newPage({viewport:{width:2300,height:1700}});await page.route(/^https?:\/\//,r=>r.abort());await page.setContent('<!doctype html><meta charset="utf-8"><script>'+bundle+'\nwindow.draw=b=>{const svg=MuseCore.render(b);document.body.replaceChildren(svg);return MuseCore.audit(svg)};<\/script>');
  const larger=clone(git);larger.main.push({id:'F','label':'补充配置检查与更详细的失败提示'});larger.topic.push({id:'TOPICEND','label':'完成导出入口的数据验证、异常反馈和验收说明'});const small=clone(git);small.common=small.common.slice(0,1);small.topic=small.topic.slice(0,1);
  const gitResults=[];for(const input of [git,larger,small]){const r=await page.evaluate(b=>window.draw(b),input);assert.deepEqual(r.findings,[]);gitResults.push(r.geometry);for(const p of r.geometry.panels){const nodes=new Map(p.nodes.map(n=>[n.id,n]));for(const edge of p.edges){const child=nodes.get(edge.child),parent=nodes.get(edge.parent);assert.ok(child.parents.includes(parent.id));assert.deepEqual(edge.points[0],[child.x,child.y+20]);assert.deepEqual(edge.points.at(-1),[parent.x,parent.y-20]);assert.ok(child.y<parent.y)}}}assert.ok(gitResults[1].height>gitResults[0].height);assert.ok(gitResults[2].height<gitResults[0].height);
  const down=clone(loop);Object.assign(down,{initial:7,step:-2,bound:0,comparison:'>'});down.accumulator.action='add-square';const zero=clone(loop);zero.initial=6;const twelve=clone(loop);twelve.bound=12;
  const wide=clone(loop);Object.assign(wide,{variable:'counter123',initial:-1000000,step:1000000,bound:1000000});wide.accumulator.name='running123';
  const loopResults=[];for(const input of [loop,down,zero,twelve,wide]){const r=await page.evaluate(b=>window.draw(b),input);assert.deepEqual(r.findings,[]);loopResults.push(r.geometry);const last=r.geometry.rows.at(-1);assert.equal(last.condition,false);assert.equal(last.i,r.geometry.finalIndex);assert.equal(r.geometry.rows.length,r.geometry.iterationCount+1);assert.equal(r.geometry.events.filter(e=>e.phase==='body').length,r.geometry.iterationCount)}assert.equal(loopResults[0].rows[4].values[4],'10 → 15');assert.equal(loopResults[1].finalAccumulator,84);assert.equal(loopResults[2].rows.length,1);assert.ok(loopResults[2].codeSteps.filter(s=>s.index>=3).every(s=>!s.executed));assert.ok(loopResults[3].height>loopResults[0].height);assert.equal(loopResults[4].finalAccumulator,0);
 }finally{await browser.close()}
});
