import test from 'node:test';
import assert from 'node:assert/strict';
import { materialFootprint, area, transformPoint } from '../../scripts/engine/material-footprint.mjs';

const source = () => ({
  id: 'notched-sheet',
  outer: [[0,0],[300,0],[300,70],[270,85],[300,100],[300,180],[0,180]],
  holes: [
    {id:'concave-opening',points:[[40,35],[105,35],[105,65],[75,65],[75,110],[40,110]]},
    {id:'small-opening',points:[[150,45],[185,45],[185,80],[150,80]]}
  ]
});
const parseRings = d => d.split(/\s*Z\s*/).filter(Boolean).map(s =>
  [...s.matchAll(/[ML]\s+(-?[\d.e+]+)\s+(-?[\d.e+]+)/gi)].map(m => [+m[1],+m[2]]));
// Nonzero winding of the emitted vertices, independent of the helper's validator.
function winding(point, ring) {
  let result = 0;
  for (let i=0;i<ring.length;i++) {
    const p=ring[i], q=ring[(i+1)%ring.length];
    const side=(q[0]-p[0])*(point[1]-p[1])-(point[0]-p[0])*(q[1]-p[1]);
    if (p[1]<=point[1] && q[1]>point[1] && side>0) result++;
    if (p[1]>point[1] && q[1]<=point[1] && side<0) result--;
  }
  return result;
}
const isFilled = (point,rings) => rings.reduce((sum,r) => sum+winding(point,r),0)!==0;

test('concave outline and hole retain actual material membership', () => {
  const f=materialFootprint(source(),[1,0,0,1,0,0]);
  const rings=parseRings(f.d);
  for (const p of [[55,50],[55,95],[165,60]]) assert.equal(isFilled(p,rings),false);
  // This point lies in the concave hole bounding box but outside its actual L shape.
  for (const p of [[90,95],[20,20],[240,140]]) assert.equal(isFilled(p,rings),true);
  for (const p of [[290,85],[-5,30],[310,130]]) assert.equal(isFilled(p,rings),false);
  assert.equal(f.fillRule,'nonzero');
});

test('reflection keeps opposite winding and real empty regions', () => {
  const matrix=[-1,.125,.25,.75,430,25];
  const f=materialFootprint(source(),matrix), rings=parseRings(f.d);
  assert.ok(area(rings[0])<0);
  for (const h of rings.slice(1)) assert.ok(area(h)>0);
  assert.equal(isFilled(transformPoint([55,50],matrix),rings),false);
  assert.equal(isFilled(transformPoint([90,95],matrix),rings),true);
  assert.equal(isFilled(transformPoint([290,85],matrix),rings),false);
});

test('caller ring orientation cannot turn holes into material', () => {
  const model=source();model.outer.reverse();model.holes[1].points.reverse();
  const f=materialFootprint(model,[1,0,0,1,0,0]), rings=parseRings(f.d);
  assert.ok(area(rings[0])<0);
  assert.ok(rings.slice(1).every(h=>area(h)>0));
  assert.equal(isFilled([55,50],rings),false);
  assert.equal(isFilled([165,60],rings),false);
  assert.deepEqual(f.vertices.holes[1].points,model.holes[1].points);
});

test('every view keeps IDs and exact transformed metadata vertices', () => {
  const model=source(), before=structuredClone(model);
  for (const matrix of [[1,.1,.2,.8,30,45],[-.8,0,.1,.9,420,30],[1,0,0,1,0,0]]) {
    const f=materialFootprint(model,matrix);
    assert.equal(f.id,model.id);assert.deepEqual(f.holeIds,model.holes.map(h=>h.id));
    assert.deepEqual(f.vertices.outer,model.outer.map(p=>transformPoint(p,matrix)));
    for (let i=0;i<model.holes.length;i++) assert.deepEqual(f.vertices.holes[i],{
      id:model.holes[i].id,points:model.holes[i].points.map(p=>transformPoint(p,matrix))
    });
  }
  assert.deepEqual(model,before);
});

test('one named source hole update reaches separated/contact views only where changed', () => {
  const model=source();
  const matrices=[[1,.1,.2,.8,30,40],[1,.1,.2,.8,30,180],[1,.1,.2,.8,420,180],[1,.1,.2,.8,420,188]];
  const before=matrices.map(m=>materialFootprint(model,m));
  const edited=structuredClone(model);
  edited.holes.find(h=>h.id==='small-opening').points=edited.holes.find(h=>h.id==='small-opening').points.map(([x,y])=>[x+15,y+10]);
  const after=matrices.map(m=>materialFootprint(edited,m));
  for (let i=0;i<matrices.length;i++) {
    assert.equal(after[i].id,before[i].id);assert.deepEqual(after[i].holeIds,before[i].holeIds);
    assert.deepEqual(after[i].vertices.outer,before[i].vertices.outer);
    assert.deepEqual(after[i].vertices.holes[0],before[i].vertices.holes[0]);
    assert.deepEqual(after[i].vertices.holes[1].points,edited.holes[1].points.map(p=>transformPoint(p,matrices[i])));
    const old=parseRings(before[i].d), next=parseRings(after[i].d);
    const point=transformPoint([155,50],matrices[i]);
    assert.equal(isFilled(point,old),false);assert.equal(isFilled(point,next),true);
    assert.equal(isFilled(transformPoint([180,75],matrices[i]),next),false);
  }
});

test('output uses bounded six-decimal drawing coordinates', () => {
  const f=materialFootprint(source(),[1/3,0,0,1/3,1/7,2/7]);
  assert.ok([...f.d.matchAll(/-?\d+(?:\.(\d+))?/g)].every(m=>!m[1]||m[1].length<=6));
  assert.equal(f.vertices.outer[0][0],1/7);
});

test('an explicitly empty hole list is valid and makes no opening', () => {
  const model=source();model.holes=[];
  const f=materialFootprint(model,[1,0,0,1,0,0]);
  assert.deepEqual(f.holeIds,[]);assert.equal(isFilled([55,50],parseRings(f.d)),true);
});

test('reject invalid identities, transforms and ring input', () => {
  const m=[1,0,0,1,0,0];
  for (const change of [
    model=>{model.id='';}, model=>{model.holes[1].id=model.holes[0].id;},
    model=>{model.holes[0].id='';}, model=>{model.outer=[[0,0],[1,0]];},
    model=>{model.outer=[[0,0],[1,1],[2,2]];},
    model=>{model.outer[1][0]=Infinity;}, model=>{model.holes=undefined;},
    model=>{model.outer=[[0,0],[300,180],[0,180],[300,0]];}
  ]) {const model=source();change(model);assert.throws(()=>materialFootprint(model,m));}
  for (const matrix of [undefined,[1,0,0,1,0],[1,0,1,0,0,0],[1,0,0,NaN,0,0]])
    assert.throws(()=>materialFootprint(source(),matrix));
});

test('reject external, crossing, touching, overlapping and nested holes', () => {
  const cases=[
    [{id:'outside',points:[[310,20],[330,20],[330,40],[310,40]]}],
    [{id:'crossing',points:[[280,60],[310,60],[310,110],[280,110]]}],
    [{id:'touching-outer',points:[[0,20],[20,20],[20,40],[0,40]]}],
    [{id:'a',points:[[20,20],[60,20],[60,60],[20,60]]},{id:'b',points:[[50,30],[80,30],[80,70],[50,70]]}],
    [{id:'a',points:[[20,20],[60,20],[60,60],[20,60]]},{id:'b',points:[[60,20],[80,20],[80,60],[60,60]]}],
    [{id:'a',points:[[20,20],[100,20],[100,120],[20,120]]},{id:'b',points:[[40,40],[60,40],[60,60],[40,60]]}]
  ];
  for (const holes of cases) assert.throws(()=>materialFootprint({...source(),holes},[1,0,0,1,0,0]));
});
