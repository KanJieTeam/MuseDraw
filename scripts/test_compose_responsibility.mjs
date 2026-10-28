import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {compose} from '../skills/musedraw/scripts/engine/compose.mjs';
import {validateScene} from '../skills/musedraw/scripts/engine/validate.mjs';
import {render} from '../skills/musedraw/scripts/engine/render.mjs';
import {loadTheme} from '../skills/musedraw/scripts/musedraw.mjs';
const example=JSON.parse(await fs.readFile(new URL('../examples/office-responsibility.json',import.meta.url),'utf8'));
const plain=t=>t.replaceAll('\n','');

test('responsibility composition preserves every supplied assignment without guessing blank roles',()=>{
 const b=structuredClone(example),saved=structuredClone(b);delete b.items[0].assignments.qa;saved.items[0]=structuredClone(b.items[0]);
 const s=compose(b);assert.deepEqual(b,saved);assert.deepEqual(validateScene(s),[]);
 for(const item of b.items)for(const role of b.roles){
  const cell=s.texts.find(t=>t.id===`assignment-${encodeURIComponent(item.id)}-${encodeURIComponent(role.id)}`);
  if(!item.assignments[role.id])assert.equal(cell,undefined);
  else assert.deepEqual(cell.text.split('/').sort(),[...item.assignments[role.id]].sort());
 }
 assert.equal(s.header,false);assert.equal(s.footer,false);
 const ids={method:'responsibility',roles:[{id:'__proto__',label:'执行人'},{id:'constructor',label:'拍板人'},{id:'toString',label:'未分配'}],items:[{id:'delivery',label:'交付',assignments:JSON.parse('{"__proto__":["R"],"constructor":["A"]}')}]};
 const special=compose(ids);
 assert.equal(special.texts.find(t=>t.id==='assignment-delivery-__proto__').text,'R');
 assert.equal(special.texts.some(t=>t.id==='assignment-delivery-toString'),false);
 assert.deepEqual(special.meta.items[0].assignments,ids.items[0].assignments);
});

test('long deliverables and role names wrap and grow the actual row/header, without deleting copy',()=>{
 const short=compose(example),b=structuredClone(example);
 b.roles[0].label='产品与业务需求协调负责人';b.items[0].label='核对本次发布的产品需求、验收范围及例外处理，不在排版时删除任何职责';
 const s=compose(b);assert.ok(s.size[1]>short.size[1]);
 assert.equal(plain(s.texts.find(t=>t.id==='role-product').text),b.roles[0].label);
 assert.equal(plain(s.texts.find(t=>t.id==='deliverable-scope').text),b.items[0].label);
 assert.equal(s.texts.find(t=>t.id==='deliverable-scope').size,short.texts.find(t=>t.id==='deliverable-scope').size);
 // The old two-pass wrapper retained every character but stranded a single
 // character between full lines. Exercise actual six-column office labels.
 b.roles.push({id:'security',label:'信息安全与合规评审负责人'});
 const six=compose(b);
 for(const id of ['role-product','role-security'])assert.ok(six.texts.find(t=>t.id===id).text.split('\n').every(line=>[...line].length>=2));
 assert.ok(six.texts.find(t=>t.id==='role-product').text.includes('业务'));
 assert.ok(six.texts.find(t=>t.id==='role-security').text.includes('评审'));
});

test('changes in task count, roles and theme retain valid geometry and unchanged semantics',async()=>{
 for(const roleCount of [2,4,6]){
  const b={method:'responsibility',roles:Array.from({length:roleCount},(_,i)=>({id:'r'+i,label:'协作角色'+i})),items:Array.from({length:7},(_,i)=>({id:'d'+i,label:'需要交接的产出'+i,assignments:{r0:['A'],r1:['R']}}))};
  const a=compose(b);assert.deepEqual(validateScene(a),[]);
  const wide=compose({...b,width:1800});assert.equal(wide.texts.find(t=>t.id==='deliverable-d0').size/a.texts.find(t=>t.id==='deliverable-d0').size,1.25);
  for(const theme of ['journal','enterprise','swiss']){const s=compose({...b,theme});assert.deepEqual(s.meta.items,a.meta.items);assert.ok(render(s,await loadTheme(theme)).includes('需要交接的产出'));}
 }
});

test('missing ownership, contradictory RACI, unknown roles and unsupported facts fail explicitly',()=>{
 for(const mutate of [
  b=>delete b.items[0].assignments.product,
  b=>b.items[1].assignments.engineering=['A','R'],
  b=>b.items[0].assignments.product=['A'],
  b=>b.items[0].assignments.unknown=['R'],
  b=>b.items[0].assignments.product=['A','R','C'],
  b=>b.items[0].assignments.product=['R','R','A'],
  b=>b.items[0].deadline='2027',b=>b.roles[1].id=b.roles[0].id,
  b=>b.items[1].id=b.items[0].id,b=>b.width=400,
 ]){const b=structuredClone(example);mutate(b);assert.throws(()=>compose(b),/Invalid composition/);}
});
