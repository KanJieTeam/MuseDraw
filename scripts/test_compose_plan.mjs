import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compose} from '../skills/musedraw/scripts/engine/compose.mjs';
import {validateScene} from '../skills/musedraw/scripts/engine/validate.mjs';
import {render} from '../skills/musedraw/scripts/engine/render.mjs';
import {loadTheme} from '../skills/musedraw/scripts/musedraw.mjs';

const brief=()=>({method:'plan',title:'档案服务计划',periods:['2027','2028','2029'],metrics:[
 {id:'sites',label:'开放服务点目标',unit:'个',values:[6,4,14]},
 {id:'visits',label:'月服务目标',unit:'人次',values:[0,1200,3200]}],
 work:[{id:'catalogue',label:'档案整理',actions:['保持题名与分类对应','记录检索反馈']},{id:'access',label:'服务协作',actions:['统一交接清单','开展岗位培训']}],support:['目录台账','服务手册']});

test('plan preserves supplied facts, independent work membership and source immutability',()=>{
 const b=brief(),original=structuredClone(b),s=compose(b);assert.deepEqual(b,original);assert.deepEqual(validateScene(s),[]);
 assert.equal(s.header,false);assert.equal(s.title,b.title);assert.deepEqual(s.meta.periods,b.periods);assert.deepEqual(s.meta.undatedWork,['catalogue','access']);
 assert.deepEqual(s.edges.map(e=>[e.from,e.to]),[['shared-support','work-catalogue'],['shared-support','work-access']]);
 for(const m of b.metrics)for(const [i,v]of m.values.entries())assert.equal(s.texts.find(t=>t.id===`metric-${m.id}-value-${b.periods[i]}`).text,String(v));
 assert.equal(s.nodes.find(n=>n.id==='work-catalogue').sub,'保持题名与分类对应\n记录检索反馈');
 const targetBottom=Math.max(...s.texts.filter(t=>t.id.startsWith('metric-')).map(t=>t.y));
 assert.ok(s.nodes.filter(n=>n.id.startsWith('work-')).every(n=>n.y>targetBottom));
});
test('bar targets use proportional zero-based geometry, separate units, and no completion tracks',()=>{
 const b=brief();b.encoding='bars';const s=compose(b);
 const small=s.nodes.find(n=>n.id==='metric-sites-bar-2027'),large=s.nodes.find(n=>n.id==='metric-sites-bar-2029');
 assert.ok(Math.abs(small.w/large.w-6/14)<.001);assert.equal(small.x,large.x);assert.equal(small.h,large.h);
 assert.equal(s.nodes.some(n=>n.id==='metric-visits-bar-2027'),false);
 assert.ok(s.nodes.filter(n=>n.id.includes('-bar-')).every(n=>n.label===''));
 assert.deepEqual(validateScene(s),[]);assert.equal(s.lines.filter(l=>l.id==='metric-sites-base').length,1);
});
test('content edits keep work identities and native label ownership while recomputing support',()=>{
 const b=brief(),first=compose(b);b.work[0].label='目录与检索协作';b.support.push('问题反馈记录');const after=compose(b);
 assert.deepEqual(first.nodes.map(n=>n.id),after.nodes.map(n=>n.id));assert.deepEqual(first.edges,after.edges);
 assert.equal(after.nodes.find(n=>n.id==='work-catalogue').label,'目录与检索协作');assert.match(after.nodes.find(n=>n.id==='shared-support').sub,/问题反馈记录/);
 assert.deepEqual(after.texts,first.texts); // Target region unaffected by this edit.
});
test('long exact values stay on one line in comparison panels',()=>{
 const b=brief();b.encoding='bars';b.metrics[1].values=[90000,180000,240000];const s=compose(b);
 for(const m of b.metrics)for(const [i,v]of m.values.entries())assert.equal(s.texts.find(t=>t.id===`metric-${m.id}-value-${b.periods[i]}`).text,String(v));
});
test('width scales coordinates and both text roles together, without shrinking copy to fit',()=>{
 const b=brief();b.width=1200;const a=compose(b);b.width=1800;const c=compose(b);
 assert.equal(c.size[0],1800);assert.equal(c.nodes.find(n=>n.id==='work-access').subSize,a.nodes.find(n=>n.id==='work-access').subSize*1.5);
 const long=brief();long.work[0].actions=['把完整的读者需求与检索反馈记录在同一份工作台账中，不删除原始分类名称。保留每一次交接的事实与责任人，并把后续处理结果与原始记录关联，方便接班人员继续处理。'];const s=compose(long);
 assert.ok(s.nodes.find(n=>n.id==='work-catalogue').h>a.nodes.find(n=>n.id==='work-catalogue').h*1.2);
 assert.equal(s.nodes.find(n=>n.id==='work-catalogue').sub.replaceAll('\n',''),long.work[0].actions[0]);
});
test('invalid or misleading inputs fail instead of silently inventing or dropping facts',()=>{
 for(const mutate of [b=>b.metrics[0].values.push(9),b=>b.metrics[0].values[0]=-1,b=>b.metrics[0].values[0]=NaN,b=>b.metrics[0].values[0]='6',b=>b.periods[1]=b.periods[0],b=>b.work[0].year='2027',b=>b.work[0].id=b.metrics[0].id,b=>b.encoding='progress',b=>b.support=[],b=>b.width=200]){const b=brief();mutate(b);assert.throws(()=>compose(b),/Invalid composition/);}
});
test('named themes remain usable without changing user facts or method geometry',async()=>{
 const b=brief(),first=compose(b);
 for(const theme of ['journal','editorial','swiss','enterprise']){
   const s=compose({...b,theme});assert.deepEqual(s.nodes,first.nodes);const svg=render(s,await loadTheme(theme));assert.ok(svg.includes('档案服务计划'));assert.ok(!svg.includes('undefined'));
 }
});
