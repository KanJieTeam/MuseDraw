import test from 'node:test';
import assert from 'node:assert/strict';
import starter from '../../assets/starters/representation.json' with {type:'json'};
import {composeRepresentation} from '../../scripts/engine/representation-view.mjs';
import {lintRepresentation} from '../../scripts/representation-lint.mjs';

const clone=structuredClone;
const codes=scene=>lintRepresentation(scene,{strict:true}).map(issue=>issue.code);
const make=()=>composeRepresentation(clone(starter));
const twentyFour=()=>{const input=clone(starter);input.source.shape=[4,6];input.source.elements=Array.from({length:24},(_,i)=>({id:'row-'+i,value:i%4,label:'记录 '+i}));input.target={shape:[6,4],order:input.source.elements.map(e=>e.id).reverse()};input.focusIds=['row-2'];return composeRepresentation(input)};

test('strict array profile validates both small and 24-element native compositions',()=>{
 for(const scene of [make(),twentyFour()]){assert.equal(scene.meta.representation,'array-reorder');assert.equal(typeof scene.meta.readerQuestion,'string');assert.deepEqual(lintRepresentation(scene,{strict:true}),[])}
 const source=clone(starter);source.width=800;source.source.elements=source.source.elements.slice(0,4).map(e=>({...e,label:'点'}));source.source.shape=[1,4];source.target={shape:[2,2],order:source.source.elements.map(e=>e.id)};source.focusIds=[];delete source.note;
 const stacked=composeRepresentation(source);assert.equal(stacked.meta.arrayRepresentation.layout,'stacked');assert.deepEqual(lintRepresentation(stacked,{strict:true}),[]);
 const unusual=clone(starter),names=['label','title','note','id','value','source'],idMap=new Map(unusual.source.elements.map((e,i)=>[e.id,names[i]]));unusual.source.elements.forEach((e,i)=>e.id=names[i]);unusual.target.order=unusual.target.order.map(id=>idMap.get(id));unusual.focusIds=[];assert.deepEqual(lintRepresentation(composeRepresentation(unusual),{strict:true}),[],'element IDs do not masquerade as view label prefixes');
});

test('strict array contract rejects missing, duplicated, changed and unsupported mapping assertions',()=>{
 for(const [name,edit] of [
  ['missing-metadata',s=>delete s.meta.arrayRepresentation],
  ['missing-mapping',s=>s.meta.arrayRepresentation.mapping.pop()],
  ['duplicate-id',s=>s.meta.arrayRepresentation.mapping[1].id=s.meta.arrayRepresentation.mapping[0].id],
  ['changed-value',s=>s.meta.arrayRepresentation.mapping[0].value=999],
  ['changed-label',s=>s.meta.arrayRepresentation.mapping[0].label='不是原标签'],
  ['shape-count',s=>s.meta.arrayRepresentation.targetShape=[1,5]],
  ['source-position-duplicate',s=>s.meta.arrayRepresentation.mapping[1].from=clone(s.meta.arrayRepresentation.mapping[0].from)],
  ['target-position-duplicate',s=>s.meta.arrayRepresentation.mapping[1].to=clone(s.meta.arrayRepresentation.mapping[0].to)],
  ['unsupported-map-field',s=>s.meta.arrayRepresentation.mapping[0].inferred=true],
  ['nonfinite-value',s=>s.meta.arrayRepresentation.mapping[0].value=Infinity],
  ['empty-reader-question',s=>s.meta.readerQuestion=' ']
 ]){const scene=make();edit(scene);assert(codes(scene).some(code=>code==='array-reorder-contract'||code==='reader-question-missing'),name)}
});

test('strict array contract checks native geometry, source and target texts rather than metadata alone',()=>{
 for(const [name,edit] of [
  ['missing-cell',s=>s.nodes.pop()],
  ['duplicate-geometry',s=>s.meta.arrayRepresentation.geometry[1]=clone(s.meta.arrayRepresentation.geometry[0])],
  ['unknown-element-geometry',s=>s.meta.arrayRepresentation.geometry[0].id='missing'],
  ['geometry-disagrees-with-cell',s=>s.meta.arrayRepresentation.geometry[0].x+=10],
  ['moved-cell-and-record',s=>{const g=s.meta.arrayRepresentation.geometry[1];g.x+=20;s.nodes.find(n=>n.id===g.nodeId).x+=20}],
  ['source-label-changed',s=>{const node=s.nodes[0].id;s.texts.find(t=>t.id.startsWith(node+'-label-')).text='替换来源标签'}],
  ['target-value-changed',s=>{const node=s.nodes.find(n=>n.id.startsWith('representation-target-')).id;s.texts.find(t=>t.id.startsWith(node+'-value-')).text='-9'}],
  ['missing-role-text',s=>s.texts.splice(s.texts.findIndex(t=>t.id.includes('-value-')),1)],
  ['duplicate-role-text',s=>s.texts.push(clone(s.texts.find(t=>t.id.includes('-value-'))))],
  ['off-cell-text',s=>s.texts.find(t=>t.id.includes('-value-')).x=-5],
  ['rotated-role-text',s=>s.texts.find(t=>t.id.includes('-value-')).rotate=90],
  ['visible-shape-changed',s=>s.texts.find(t=>t.id.startsWith('representation-target-label-')).text='目标表示  1 × 6'],
  ['wrong-layout',s=>s.meta.arrayRepresentation.layout='stacked'],
  ['extra-text',s=>s.texts.push({id:'unmapped-claim',x:20,y:20,text:'未登记断言',size:20})],
  ['extra-node',s=>s.nodes.push({...clone(s.nodes[0]),id:'extra'})],
  ['extra-edge',s=>s.edges=[{from:s.nodes[0].id,to:s.nodes[1].id,label:'未登记关系'}]]
 ]){const scene=make();edit(scene);assert(codes(scene).includes('array-reorder-contract'),name)}
});

test('a generic wall is still rejected even when it copies the array profile and metadata',()=>{
 const wall={size:[1800,1100],meta:{representation:'boundary-map',readerQuestion:'有哪些功能'},nodes:Array.from({length:32},(_,i)=>({id:'card-'+i,shape:'box',x:40+(i%8)*200,y:40+Math.floor(i/8)*200,w:180,h:160,label:'功能 '+i}))};
 for(const profile of ['boundary-map','array-reorder']){const scene=clone(wall);scene.meta.representation=profile;if(profile==='array-reorder')scene.meta.arrayRepresentation=clone(twentyFour().meta.arrayRepresentation);const result=codes(scene);assert(result.includes('equal-card-wall'));assert(result.includes('too-dense'));if(profile==='array-reorder')assert(result.includes('array-reorder-contract'))}
 const objectProfile=make();objectProfile.meta.representation={name:'array-reorder'};assert(codes(objectProfile).includes('representation-missing'));
});
