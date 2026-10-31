import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cap2ConvergenceModel} from '../../scripts/musecore/cap2-convergence-models.mjs';
const source=JSON.parse(fs.readFileSync(new URL('../../assets/musecore/cap2-protein-convergence.json',import.meta.url),'utf8'));
test('source has a single shared junction and forward suffix with all supplied facts',()=>{
 const m=cap2ConvergenceModel(source);
 assert.equal(m.junctionId,'s5');assert.deepEqual(m.common.stations,['s5','s15','s16']);assert.equal(m.branches.length,3);
 assert.equal(m.origins.find(o=>o.id==='s0').branchIds.length,2);assert.equal(m.stations.length,17);
 const expected=source.routes.flatMap(r=>r.segments.map(e=>[r.id,e.from,e.to].join(':'))).sort();
 assert.deepEqual(m.geometryEdges.map(e=>[e.routeId,e.from,e.to].join(':')).sort(),expected);
 assert.deepEqual(m.routes.map(r=>r.note),source.routes.map(r=>r.note));assert.deepEqual(m.stations.map(s=>s.label).sort(),source.stations.map(s=>s.label).sort());
});
test('identifier renaming and changed labels do not change topology',()=>{
 const b=structuredClone(source),rename=id=>'new-'+id;
 b.title='新内容标题';b.stations=b.stations.map(s=>({...s,id:rename(s.id),label:'改编：'+s.label,note:'逐项原样保留的调用者备注'}));
 b.routes=b.routes.map(r=>({...r,id:rename(r.id),stations:r.stations.map(rename),segments:r.segments.map(e=>({from:rename(e.from),to:rename(e.to)}))}));
 const m=cap2ConvergenceModel(b);assert.equal(m.junctionId,'new-s5');assert.ok(m.stations.every(s=>s.note==='逐项原样保留的调用者备注'));
});
test('a missing segment is rejected rather than silently filled',()=>{const b=structuredClone(source);b.routes[0].segments.pop();assert.throws(()=>cap2ConvergenceModel(b),/every consecutive segment/)});
test('unoriented links and unknown fields are rejected',()=>{const b=structuredClone(source);b.routes[0].direction='unoriented';assert.throws(()=>cap2ConvergenceModel(b),/forward/);assert.throws(()=>cap2ConvergenceModel({...source,estimatedDays:0}),/unsupported field/)});
test('inconsistent shared intermediate stations are rejected',()=>{const b=structuredClone(source);b.routes[1].stations.splice(2,0,'s2');b.routes[1].segments=b.routes[1].stations.slice(1).map((to,i)=>({from:b.routes[1].stations[i],to}));assert.throws(()=>cap2ConvergenceModel(b),/Shared intermediate/)});
test('nonadjacent shared origins are rejected instead of crossing another branch',()=>{const b=structuredClone(source);[b.routes[1],b.routes[2]]=[b.routes[2],b.routes[1]];assert.throws(()=>cap2ConvergenceModel(b),/adjacent/)});
test('query retains supplied endpoints and only uses declared segments',()=>{const m=cap2ConvergenceModel({...source,query:{from:'s0',to:'s16'}});assert.deepEqual(m.query.stationIds,['s0','s1','s2','s3','s4','s5','s15','s16']);assert.equal(m.query.hops,7);assert.equal(cap2ConvergenceModel({...source,query:{from:'s16',to:'s0'}}).query.reachable,false)});
