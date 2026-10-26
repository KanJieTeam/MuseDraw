import assert from 'node:assert/strict';
import test from 'node:test';
import {composeFlow} from '../skills/musedraw/scripts/engine/compose-flow.mjs';
import {validateScene,prepareScene} from '../skills/musedraw/scripts/engine/validate.mjs';
import {detailLink} from '../skills/musedraw/scripts/engine/detail-link.mjs';
const longFlow=()=>({method:'flow',lanes:[{id:'requester',label:'申请方'},{id:'owner',label:'管理方'},{id:'carrier',label:'运输方'}],
  nodes:['提交清单','核对状态','修改清单','确认交接','安排取件','送回物品','验收物品','处理损伤','登记入库','关闭记录'].map((label,i)=>({id:`n${i}`,label,lane:i===0||i===2?'requester':i===4||i===5?'carrier':'owner',...([1,6].includes(i)?{shape:'diamond'}:{})})),
  links:[[0,1],[1,2,'不可用'],[2,0,'重新提交',true],[1,3,'可用'],[3,4],[4,5],[5,6],[6,7,'有损伤'],[6,8,'无损伤'],[7,8,'处理完成'],[8,9]].map(([a,b,label,feedback])=>({from:`n${a}`,to:`n${b}`,...(label?{label}:{}),...(feedback?{feedback}:{})}))});

test('long process keeps every declared action and relation in readable responsibility columns',()=>{
  const input=longFlow(),original=structuredClone(input),scene=composeFlow(input);
  assert.deepEqual(input,original);assert.equal(scene.meta.orientation,'vertical');assert.equal(scene.nodes.length,10);assert.equal(scene.edges.length,11);
  assert.ok(scene.size[1]<=1070);assert.deepEqual(validateScene(scene),[]);
  assert.equal(new Set(scene.nodes.filter(n=>['n4','n5'].includes(n.id)).map(n=>n.x)).size,1);
  assert.ok(scene.nodes.find(n=>n.id==='n4').x>scene.nodes.find(n=>n.id==='n1').x);
  assert.ok(scene.nodes.every(n=>n.size===18&&n.w>=180));
  const ids=new Map(scene.nodes.map(n=>[n.id,n]));
  for(const e of scene.edges){
    const a=ids.get(e.from),b=ids.get(e.to);
    const port=(n,side)=>side==='l'?[n.x,n.y+n.h/2]:side==='r'?[n.x+n.w,n.y+n.h/2]:side==='b'?[n.x+n.w/2,n.y+n.h]:[n.x+n.w/2,n.y];
    const p=[port(a,e.fromSide),...e.via,port(b,e.toSide)];
    for(let i=1;i<p.length;i++)for(const n of scene.nodes){
      if([e.from,e.to].includes(n.id))continue;
      const [u,v]=[p[i-1],p[i]];
      assert.ok(Math.abs(u[0]-v[0])<.02||Math.abs(u[1]-v[1])<.02);
      const hit=Math.abs(u[0]-v[0])<.02?u[0]>n.x+.02&&u[0]<n.x+n.w-.02&&Math.max(u[1],v[1])>n.y+.02&&Math.min(u[1],v[1])<n.y+n.h-.02:u[1]>n.y+.02&&u[1]<n.y+n.h-.02&&Math.max(u[0],v[0])>n.x+.02&&Math.min(u[0],v[0])<n.x+n.w-.02;
      assert.equal(hit,false,`${e.from}->${e.to} crosses ${n.id}`);
    }
  }
});

test('contract rejects role drift, omitted or invented edges and changed conditions',()=>{
  const source=composeFlow(longFlow());
  for(const mutate of [s=>s.nodes[4].x=s.nodes[0].x,s=>s.edges.pop(),s=>s.edges.push({from:'n3',to:'n8'}),s=>s.edges[1].label='始终可用',s=>s.nodes[0].label='新事实',s=>s.nodes.pop()]){
    const scene=structuredClone(source);mutate(scene);assert.ok(validateScene(scene).some(i=>i.path==='/meta/flowContract'));
  }
  const styled=structuredClone(source);styled.nodes[0].label='提交\n清单';styled.nodes[0].x+=3;
  assert.deepEqual(validateScene(styled),[]);
});

test('another explicit handoff fits without dropping an action or reducing reading type',()=>{
  const input=longFlow();input.nodes.push({id:'handoff',label:'确认收件',lane:'carrier'});
  input.links=input.links.filter(l=>!(l.from==='n5'&&l.to==='n6'));
  input.links.push({from:'n5',to:'handoff'},{from:'handoff',to:'n6'});
  const scene=composeFlow(input);assert.equal(scene.nodes.length,11);assert.equal(scene.edges.length,12);
  assert.ok(scene.size[1]<=1070);assert.ok(scene.nodes.every(n=>n.size===18));assert.equal(scene.style.edge.labelSize,15);
  assert.deepEqual(validateScene(scene),[]);
});

test('contract scales with output resolution and also protects horizontal flows',()=>{
  const input=longFlow();input.width=2400;assert.deepEqual(validateScene(composeFlow(input)),[]);
  const small={method:'flow',nodes:[{id:'a',label:'A'},{id:'b',label:'B'}],links:[{from:'a',to:'b'}]};
  const scene=composeFlow(small);assert.deepEqual(validateScene(scene),[]);scene.edges=[];assert.ok(validateScene(scene).length);
});

test('detail annotations attach to declared ROI, own foreground painting and never invent contents',()=>{
  const b={id:'zoom',roi:[120,90,80,40],detail:[320,240,240,140],side:'b'};
  const out=detailLink(b);assert.equal(out.lines.length,4);assert.ok(out.lines.every(l=>l.layer==='foreground'));
  assert.deepEqual(out.lines[0].points,[[120,130],[320,240]]);assert.deepEqual(out.lines[1].points,[[200,130],[560,240]]);
  assert.equal(out.nodes,undefined);assert.equal(out.paths,undefined);
  const scene={size:[640,440],blocks:[{...b,type:'detail-link'}]};assert.deepEqual(validateScene(scene),[]);assert.equal(prepareScene(scene,{}).lines.length,4);
  assert.throws(()=>detailLink({...b,roi:[0,0,0,20]}),/positive/);assert.throws(()=>detailLink({...b,detail:[130,100,20,20]}),/overlap/);
  assert.ok(validateScene({blocks:[{...b,type:'detail-link',roi:[0,0,'wide',5]}]}).length);
});
