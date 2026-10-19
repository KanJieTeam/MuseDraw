import assert from 'node:assert/strict';
import {test} from 'node:test';
import {objectViews, viewNodeId} from '../skills/musedraw/scripts/engine/object-views.mjs';
import {expandBlocks} from '../skills/musedraw/scripts/engine/layouts.mjs';
import {validateScene,prepareScene} from '../skills/musedraw/scripts/engine/validate.mjs';
import {patchScene} from '../skills/musedraw/scripts/engine/patch.mjs';

const round = n => Number(n.toFixed(7));
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const duplex = () => ({id:'dna',extent:[.8,.65],label:'DNA',scientific:{kind:'duplex',turns:1,
  amplitude:20,markerOffset:3,strands:[{id:'a',fill:'#3563C4'},{id:'b',fill:'#3563C4'}],
  sites:[{id:'one',at:.125,marks:['a'],fill:'#C65B59'},{id:'two',at:.625,marks:[]}]}});
const block = (entity=duplex()) => ({type:'object-views',id:'assembly',x:20,y:30,w:1100,h:360,columns:2,
  entities:[entity],views:[{id:'initial',items:[{entity:entity.id,at:[.5,.45]}]},
    {id:'changed',items:[{entity:entity.id,at:[.5,.45]}]}]});
const anchor = (out,id) => out.nodes.find(n=>n.id===id);
const localNumbers = (d,a) => (d.match(/[+-]?(?:\d*\.\d+|\d+\.?\d*)(?:e[+-]?\d+)?/gi)??[])
  .map((n,i)=>round(Number(n)-(i%2?a.y:a.x)));
const moduleParts = (out,id) => Object.fromEntries(['nodes','edges','paths','texts'].map(k=>[k,out[k].filter(p=>p.nativeModule===id)]));
const localPaths = (out,id) => {const a=anchor(out,id);return out.paths.filter(p=>p.nativeModule===id)
  .map(p=>({id:p.id.slice(id.length),d:localNumbers(p.d,a),fill:p.fill,stroke:p.stroke,width:p.width}));};
const localNodes = (out,id,predicate=()=>true) => {const a=anchor(out,id);return out.nodes.filter(n=>n.nativeModule===id&&n.id!==id&&predicate(n))
  .map(n=>({...n,id:n.id.slice(id.length),nativeModule:'module',x:round(n.x-a.x),y:round(n.y-a.y)}));};

test('duplex marks reuse exact local backbone, source identity and native ownership',()=>{
  const b=block();b.views[1].items[0].state={marks:{one:['a','b'],two:['b']}};
  const original=structuredClone(b),out=objectViews(freeze(b));
  const ids=b.views.map(v=>viewNodeId(b.id,v.id,'dna'));
  assert.deepEqual(b,original);
  assert.deepEqual(localPaths(out,ids[0]),localPaths(out,ids[1]),'marks cannot perturb backbone controls or colours');
  assert.equal(localNodes(out,ids[0]).length,1);assert.equal(localNodes(out,ids[1]).length,3);
  assert.equal(localNodes(out,ids[1]).find(n=>n.id==='-site-one-a').fill,'#C65B59');
  assert.deepEqual(localNodes(out,ids[0])[0],localNodes(out,ids[1])[0],'same explicit marker keeps geometry and colour');
  for(const [suffix,t,strand] of [['-site-one-b',.125,-1],['-site-two-b',.625,-1]]) {
    const n=out.nodes.find(n=>n.id===ids[1]+suffix),a=anchor(out,ids[1]);
    const sine=strand*Math.sin(2*Math.PI*t),margin=4+1.5;
    assert.equal(round(n.x+n.w/2-a.x),round(margin+(a.w-2*margin)*t));
    assert.equal(round(n.y+n.h/2-a.y),round(a.h/2+20*sine+3*Math.sign(sine)));
  }
  assert.deepEqual(out.nativeModules,ids.map(id=>({id})));
  for(const id of ids) {
    assert.ok(anchor(out,id),'ordinary edges have an actual native terminal');
    const parts=moduleParts(out,id);assert.ok(parts.paths.length===2&&parts.nodes.length>=2);
    for(const k of ['nodes','edges','paths','texts'])for(const p of parts[k])assert.equal(p.nativeModule,id);
  }
  assert.equal(anchor(out,ids[0]).label,'DNA');assert.equal(anchor(out,ids[0]).labelPos,'below');
  assert.equal(anchor(out,ids[1]).labelPos,'none');
});

test('editing one view never mutates or changes the other occurrence',()=>{
  const b=block(),before=objectViews(b),id=viewNodeId(b.id,'initial','dna');
  b.views[1].items[0].state={marks:{one:[],two:['b']}};
  const copy=structuredClone(b),after=objectViews(b);
  assert.deepEqual(b,copy);
  assert.deepEqual(moduleParts(before,id),moduleParts(after,id));
  assert.deepEqual(b.entities[0].scientific.sites[0].marks,['a']);
  assert.deepEqual(b.entities[0].scientific.sites[1].marks,[]);
});

// All laminate commands are absolute coordinate pairs. Keep each fixed end
// and pad corner, excluding the displaced middle and its interior controls.
const laminateEnds = numbers => [0,1,2,3,14,15,16,17,18,19,20,21,32,33,34,35].map(i=>numbers[i]);
test('laminate states preserve layers, endpoint geometry, electrodes and recovery',()=>{
  const e={id:'film',extent:[.85,.85],scientific:{kind:'laminate',layers:[
    {id:'skin',fill:'#88AABB',thickness:9},{id:'core',fill:'#DDAA66',thickness:12}],
    electrodes:{layer:1,width:20,fill:'#333333'},gap:2}};
  const b={...block(e),w:1800,h:400,columns:3,views:[
    {id:'flat',items:[{entity:'film',at:[.5,.5],state:{deflection:0}}]},
    {id:'pressed',items:[{entity:'film',at:[.5,.5],state:{deflection:.25,load:'F'}}]},
    {id:'restored',items:[{entity:'film',at:[.5,.5],state:{deflection:0}}]}]};
  const original=structuredClone(b),out=objectViews(freeze(b)),ids=b.views.map(v=>viewNodeId(b.id,v.id,'film'));
  assert.deepEqual(b,original);
  const layers=id=>localPaths(out,id).filter(p=>p.id.startsWith('-layer-'));
  assert.deepEqual(layers(ids[0]),layers(ids[2]),'recovery is the original material outline');
  assert.deepEqual(localNodes(out,ids[0]),localNodes(out,ids[1]),'electrodes stay fixed');
  assert.deepEqual(localNodes(out,ids[0]),localNodes(out,ids[2]));
  const flat=layers(ids[0]),pressed=layers(ids[1]);
  assert.equal(flat.length,2);assert.equal(pressed.length,2);
  for(let i=0;i<2;i++) {
    assert.equal(flat[i].id,pressed[i].id);assert.equal(flat[i].fill,pressed[i].fill);
    assert.equal(flat[i].stroke,pressed[i].stroke);assert.equal(flat[i].width,pressed[i].width);
    assert.deepEqual(laminateEnds(flat[i].d),laminateEnds(pressed[i].d));
    assert.notDeepEqual(flat[i].d,pressed[i].d,'explicit deflection changes the interior');
    assert.equal(round(pressed[i].d[7]-flat[i].d[7]),round(anchor(out,ids[1]).h*.25));
    assert.equal(round(flat[i].d[19]-flat[i].d[1]),[9,12][i],'specified thickness stays fixed');
    assert.equal(round(pressed[i].d[19]-pressed[i].d[1]),[9,12][i]);
    assert.equal(round(pressed[i].d[27]-pressed[i].d[9]),[9,12][i],'centre thickness also stays fixed');
  }
  assert.ok(out.paths.some(p=>p.id===ids[1]+'-load-arrow'));
  assert.ok(!out.paths.some(p=>p.id===ids[0]+'-load-arrow'));
  assert.equal(out.texts.filter(t=>t.text==='F').length,1);
});

test('load-only override leaves every material path and electrode unchanged',()=>{
  const e={id:'film',extent:[.85,.85],scientific:{kind:'laminate',layers:[{id:'a',fill:'#88AABB'},{id:'b',fill:'#DDAA66'}],electrodes:{layer:0}}};
  const b=block(e);b.views[1].items[0].state={load:'F'};
  const out=objectViews(b),a=viewNodeId(b.id,'initial','film'),c=viewNodeId(b.id,'changed','film');
  assert.deepEqual(localPaths(out,a),localPaths(out,c).filter(p=>!p.id.startsWith('-load-')));
  assert.deepEqual(localNodes(out,a),localNodes(out,c));
});

test('unchanged graph expands editable bonds and survives layout with external edge terminals',()=>{
  const e={id:'graph',extent:[.6,.5],scientific:{kind:'graph',points:[
    {id:'p',x:.2,y:.5},{id:'q',x:.8,y:.5}],links:[{from:'p',to:'q'}]}};
  const b=block(e),ids=b.views.map(v=>viewNodeId(b.id,v.id,e.id));
  const scene={size:[1400,600],header:false,footer:false,blocks:[b],edges:[{id:'compare',from:ids[0],to:ids[1]}]};
  const source=structuredClone(scene),out=expandBlocks(scene,{});delete out.blocks;
  assert.deepEqual(scene,source);
  assert.equal(out.nativeModules.length,2);assert.equal(out.edges.length,3);
  for(const id of ids)assert.ok(out.edges.some(e=>e.from===id+'-p'&&e.to===id+'-q'&&e.nativeModule===id));
  assert.deepEqual(out.edges[0],scene.edges[0]);
  assert.equal(anchor(out,ids[0]).label,'');assert.equal(anchor(out,ids[0]).labelPos,'none');
  assert.deepEqual(validateScene(out),[],'expanded native leaves should pass existing validation before source schema integration');
});

test('only explicit state keys and existing duplex identities are accepted',()=>{
  for(const state of [null,[],{phase:20},{marks:null},{marks:{missing:['a']}},
    {marks:{one:['missing']}},{marks:{one:['a','a']}},{marks:{one:'a'}},{marks:{one:['a']},fill:'red'}]) {
    const b=block();b.views[1].items[0].state=state;assert.throws(()=>objectViews(b),/state|marks|site|strand/i);
  }
  for(const state of [{gap:1},{layers:[]},{deflection:NaN},{deflection:.41},{deflection:undefined},{load:null},{load:'Force'},{load:undefined}]) {
    const b=block({id:'f',extent:[.8,.8],scientific:{kind:'laminate',layers:[{id:'a',fill:'red'},{id:'b',fill:'blue'}]}});
    b.views[1].items[0].state=state;assert.throws(()=>objectViews(b),/state|deflection|load/i);
  }
  const graph=block({id:'g',extent:[.5,.5],scientific:{kind:'graph',points:[{id:'a',x:.5,y:.5}]}});
  graph.views[1].items[0].state={};assert.throws(()=>objectViews(graph),/not supported/);
});

test('view overrides do not hide invalid canonical motifs, frame or metadata injection',()=>{
  for(const key of ['id','type','x','y','w','h','nativeModule','nativeModules','label','paths']) {
    const b=block();b.entities[0].scientific[key]=key==='x'?0:'override';
    assert.throws(()=>objectViews(b),/cannot own|unsupported field/);
  }
  for(const key of ['shape','nativeModule','x']) {const b=block();b.entities[0][key]='override';assert.throws(()=>objectViews(b),/unsupported scientific entity/);}
  const b=block();b.entities[0].scientific.sites[0].marks=['missing'];b.views[0].items[0].state={marks:{one:['a']}};
  assert.throws(()=>objectViews(b),/marks require distinct existing strand/);
  const bad=block();bad.entities[0].scientific.turns=99;assert.throws(()=>objectViews(bad),/turns/);
});

test('hyphenated and percent-containing view/entity names cannot alias anchors or modules',()=>{
  const b=block();b.entities=[{...duplex(),id:'b-c'},{...duplex(),id:'c'},{...duplex(),id:'b%2Dc'}];
  b.views=[{id:'a',items:[{entity:'b-c',at:[.25,.5],size:[.3,.6]},
    {entity:'b%2Dc',at:[.75,.5],size:[.3,.6]}]},
    {id:'a-b',items:[{entity:'c',at:[.5,.5]}]}];
  const out=objectViews(b),all=['nodes','edges','paths','texts'].flatMap(k=>out[k].map(p=>p.id).filter(Boolean));
  assert.equal(new Set(out.nativeModules.map(m=>m.id)).size,3);
  assert.equal(new Set(all).size,all.length);
});

test('primitive appearance, extent override, label behaviour and empty part arrays remain compatible',()=>{
  const b=block({id:'lid',extent:[.6,.12],shape:'parallelogram',tone:'blue',label:'Cover'});
  b.views[1].items[0].size=[.3,.12];
  const source=structuredClone(b),out=objectViews(b),[a,c]=out.nodes;
  assert.deepEqual(b,source);assert.equal(a.id,'assembly-initial-lid');assert.equal(c.id,'assembly-changed-lid');
  assert.equal(a.shape,c.shape);assert.equal(a.tone,c.tone);assert.equal(a.w,c.w*2);assert.equal(a.h,c.h);
  assert.equal(a.label,'Cover');assert.equal(a.labelPos,'below');assert.equal(c.label,'');assert.equal(c.labelPos,'none');
  for(const key of ['edges','paths','nativeModules'])assert.deepEqual(out[key],[]);
  b.views[0].items[0].state={};assert.throws(()=>objectViews(b),/primitive.*does not support state/);
});

test('source preflight accepts compound objects and rejects invalid sparse state before export',()=>{
  const b=block(),scene={theme:'journal',size:[1400,600],header:false,footer:false,blocks:[b]};
  b.views[1].items[0].state={marks:{two:['b']}};
  assert.deepEqual(validateScene(scene),[]);
  assert.equal(prepareScene(scene,{}).nativeModules.length,2);
  for(const state of [{phase:30},{marks:{unknown:['a']}},{marks:{one:['unknown']}}]){
    const invalid=structuredClone(scene);invalid.blocks[0].views[1].items[0].state=state;
    assert.ok(validateScene(invalid).length,'invalid state must fail source preflight');
  }
  const injected=structuredClone(scene);injected.blocks[0].entities[0].scientific.id='new-identity';
  assert.ok(validateScene(injected).some(i=>i.message.includes('cannot own id')));
});

test('named sites are anchored once by default and name-only patches preserve the object',()=>{
  const b=block();b.entities[0].scientific.sites[0].name='p';
  const scene={theme:'journal',size:[1400,600],blocks:[b]},before=prepareScene(scene,{});
  assert.equal(before.texts.filter(t=>t.text==='p').length,1);
  const renamed=patchScene(scene,[{id:'one',field:'name',expect:'p',value:'q'}]);
  const after=prepareScene(renamed.scene,{});
  for(const kind of ['paths','nodes','edges'])assert.deepEqual(before[kind],after[kind]);
  assert.equal(after.texts.filter(t=>t.text==='q').length,1);
  b.views[1].items[0].showSiteNames=true;
  assert.equal(prepareScene(scene,{}).texts.filter(t=>t.text==='p').length,2);
  b.entities[0].scientific.siteNames=false;delete b.views[1].items[0].showSiteNames;
  assert.equal(prepareScene(scene,{}).texts.filter(t=>t.text==='p').length,0);
  for(const value of ['false',null,0])for(const hidden of [false,true]){
    const invalid=structuredClone(scene);invalid.blocks[0].entities[0].scientific.siteNames=value;
    invalid.blocks[0].views[0].items[0].showSiteNames=!hidden;
    assert.throws(()=>objectViews(invalid.blocks[0]),/siteNames must be boolean/);
    assert.ok(validateScene(invalid).length,'a presentation override must not hide an invalid canonical switch');
  }
});
