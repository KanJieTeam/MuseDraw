import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {messageSequenceModel} from '../../scripts/musecore/sequence-models.mjs';
import {browserBundle} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const seed=JSON.parse(await fs.readFile(new URL('../../assets/musecore/message-sequence.json',import.meta.url),'utf8'));
const clone=value=>structuredClone(value);
function simple(){return {family:'message-sequence',title:'预约确认',subtitle:'消息按输入顺序展示',note:'状态由输入明确给出。',panels:[{id:'one',title:'确认片段',participants:[{id:'a',label:'申请人'},{id:'b',label:'协调员'},{id:'c',label:'管理员'}],initialStates:[{participant:'a',label:'等待'}],messages:[{id:'m1',from:'a',to:'c',label:'询问可用时段'},{id:'m2',from:'c',to:'a',label:'该时段可用',replyTo:'m1',states:[{participant:'a',label:'已知可用'}]},{id:'m3',from:'a',to:'b',label:'请办理预约'}]}]}}
test('message relations match an independently specified ordered trace',()=>{
 const result=messageSequenceModel(simple());assert.equal(result.messageCount,3);assert.equal(result.stateCount,2);assert.deepEqual(result.panels[0].messages.map(m=>[m.id,m.fromIndex,m.toIndex,m.ordinal,m.replyIndex]),[['m1',0,2,1,null],['m2',2,0,2,0],['m3',0,1,3,null]]);assert.deepEqual(result.panels[0].messages[2].states,[]);assert.equal(result.panels[0].initialStates[0].participantIndex,0);
 const changed=simple();changed.panels[0].participants.reverse();assert.deepEqual(messageSequenceModel(changed).panels[0].messages.map(m=>[m.fromIndex,m.toIndex]),[[2,0],[0,2],[2,1]]);
 const deleted=simple();deleted.panels[0].messages.pop();assert.equal(messageSequenceModel(deleted).messageCount,2);
});
test('reject invented endpoints, states, reply relations, durations and excessive content',()=>{
 const cases=[b=>b.panels[0].messages[0].to='missing',b=>b.panels[0].messages[0].to='a',b=>b.panels[0].messages[0].replyTo='m2',b=>b.panels[0].messages[2].replyTo='m1',b=>b.panels[0].messages[1].replyTo='m2',b=>b.panels[0].messages[1].states[0].participant='missing',b=>b.panels[0].messages[1].states.push({participant:'a',label:'重复'}),b=>b.panels[0].messages[0].duration=7,b=>b.panels[0].messages[0].label='长'.repeat(121),b=>b.panels[0].participants.push({id:'a',label:'重复'}),b=>b.panels[0].messages.push(clone(b.panels[0].messages[0])),b=>b.panels[0].messages[0].states=[{participant:'a',label:'长'.repeat(65)}],b=>b.panels[0].participants=b.panels[0].participants.slice(0,1)];
 for(const mutate of cases){const b=simple();mutate(b);assert.throws(()=>messageSequenceModel(b))}
});
test('actual browser: changed participants, long labels, removed branch and cross-lifeline backing',async()=>{
 const bundle=await browserBundle();
 const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{const page=await browser.newPage({viewport:{width:2100,height:1500}});await page.route(/^https?:\/\//,r=>r.abort());await page.setContent('<!doctype html><meta charset="utf-8"><body><script>'+bundle+'\nwindow.drawSequence=b=>{const svg=MuseCore.render(b);document.body.replaceChildren(svg);return MuseCore.audit(svg)};<\/script>');
  const long=simple();long.panels[0].participants.push({id:'d',label:'项目联络人',role:'只接收最终通知'},{id:'e',label:'复核人'});long.panels[0].messages[0].label='请核对周五下午的会场、投影设备与接待安排，并逐项告诉我哪些事项仍需要补充确认。';long.panels[0].messages.push({id:'m4',from:'b',to:'e',label:'请复核申请中附带的无障碍通行要求与来访者接待细节',states:[{participant:'e',label:'等待资料补充，尚未形成最终意见'}]},{id:'m5',from:'e',to:'d',label:'复核资料已收到'});
  const removed=simple();removed.panels[0].messages.pop();removed.panels[0].participants.splice(1,1);
  const stacked=clone(long);stacked.panels.push({...clone(long.panels[0]),id:'second'});
  const results=[];for(const input of [seed,simple(),long,removed,stacked]){const r=await page.evaluate(b=>window.drawSequence(b),input);assert.deepEqual(r.findings,[]);assert.equal(r.geometry.messageCount,messageSequenceModel(input).messageCount);for(const panel of r.geometry.panels)for(const m of panel.messages){assert.equal(m.points[0][0],panel.participants[m.fromIndex].globalX);assert.equal(m.points[1][0],panel.participants[m.toIndex].globalX);assert.equal(m.points[0][1],m.points[1][1]);assert.ok(m.statePlan.top>m.arrowY)}results.push(r.geometry)}
  assert.ok(results[2].height>results[1].height);assert.equal(results[3].panels[0].participants.length,2);assert.equal(results[4].arrangement,'stacked');assert.ok(results[4].panels[1].y>results[4].panels[0].y+results[4].panels[0].height);
  const tooManyLines=clone(long);tooManyLines.panels[0].messages=[{id:'overBudget',from:'a',to:'b',label:'长'.repeat(120)}];await assert.rejects(page.evaluate(b=>window.drawSequence(b),tooManyLines),/exceeds 8 lines/);
  await page.evaluate(b=>window.drawSequence(b),simple());const backing=await page.locator('[data-role="label-backing"]').count();assert.ok(backing>0);
  await page.evaluate(()=>{const svg=document.querySelector('svg');for(const r of svg.querySelectorAll('[data-role="label-backing"]'))r.remove();window.withoutMasks=MuseCore.audit(svg)});assert.ok((await page.evaluate(()=>window.withoutMasks.findings)).some(f=>f.type==='line-through-text'));
 }finally{await browser.close()}
});
