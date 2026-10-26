import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {scientificMotif} from '../skills/musedraw/scripts/engine/scientific-motifs.mjs';
import {prepareScene,validateScene} from '../skills/musedraw/scripts/engine/validate.mjs';
import {loadTheme} from '../skills/musedraw/scripts/musedraw.mjs';
import {render} from '../skills/musedraw/scripts/engine/render.mjs';
import {pathCommands} from '../skills/musedraw/scripts/engine/svg-path.mjs';
import {patchScene} from '../skills/musedraw/scripts/engine/patch.mjs';
const theme=await loadTheme('journal');
const base={type:'scientific',id:'object',x:50,y:50,w:260,h:160};
const examples=[
  {kind:'graph',points:[{id:'a',x:.2,y:.3},{id:'b',x:.8,y:.6}],links:[{from:'a',to:'b'}]},
  {kind:'network',layers:[2,3,1]},
  {kind:'tensor',cells:[['soft','warm'],['focus','soft']],depth:3},
  {kind:'sequence',tracks:[{segments:[{start:.1,end:.4}]},{segments:[{start:.3,end:.9}]}],links:[{from:[0,.4],to:[1,.3]}]},
  {kind:'layers',layers:[{label:'Top',fill:'#0F4D92'},{label:'Base',fill:'#D9E9E7'}]},
  {kind:'cycle',steps:['Select','Label','Train','Update'].map(label=>({label}))},
  {kind:'manifold',points:[{id:'a',x:.3,y:.4},{id:'b',x:.6,y:.7}],links:[{from:'a',to:'b'}]},
  {kind:'formula',runs:[{text:'v',sub:'i',sup:'l'},{text:' ∈ '},{text:'ℝ',sup:[{text:'d',sub:'v'}]},{text:'γ',vector:true,sub:[{text:'α',sub:'2'}]}]},
  {kind:'laminate',layers:[{id:'skin',fill:'soft'},{id:'mesh',fill:'warm'},{id:'base',fill:'neutral'}],electrodes:{layer:1},deflection:.2}
];
test('scientific objects expand into native groups, live labels and independently editable geometry',()=>{
  for(const example of examples){
    const input={...base,...example},saved=structuredClone(input),s=scientificMotif(input,theme);
    assert.deepEqual(input,saved);assert.deepEqual(s.nativeModules,[{id:'object'}]);
    for(const kind of ['nodes','edges','paths','texts'])assert.ok(s[kind].every(p=>p.nativeModule==='object'));
    for(const p of s.paths)assert.doesNotThrow(()=>pathCommands(p.d));
    const scene={theme:'journal',size:[650,420],header:false,footer:false,autoFit:false,blocks:[input]};
    assert.deepEqual(validateScene(scene),[]);const svg=render(scene,theme);
    assert.match(svg,/id="scientific-object" data-md="module"/);assert.doesNotMatch(svg,/<image|foreignObject|data:image/);
  }
});
test('laminate state rows preserve endpoint and electrode positions in each local frame',()=>{
  const b={...base,...examples[8],id:'sample',w:900,h:240};delete b.deflection;
  b.states=[{id:'rest',label:'Rest',deflection:0},{id:'load',label:'Loaded',deflection:.3},{id:'release',label:'Released',deflection:0}];
  const saved=structuredClone(b),s=scientificMotif(b,theme);assert.deepEqual(b,saved);
  const a=s.nodes.find(n=>n.id==='sample-state-rest-electrode-left'),c=s.nodes.find(n=>n.id==='sample-state-load-electrode-left');
  assert.equal(a.y,c.y);assert.equal(a.h,c.h);assert.equal(a.w,c.w);assert.equal(s.paths.filter(p=>p.id.includes('-layer-')).length,9);
  assert.deepEqual(s.texts.map(t=>t.text),['Rest','Loaded','Released']);
  assert.ok(s.paths.every(p=>p.nativeModule==='sample'));assert.doesNotMatch(render({theme:'journal',size:[1000,400],blocks:[b],header:false,footer:false},theme),/<image|foreignObject/);
  assert.throws(()=>scientificMotif({...b,deflection:0},theme),/no top-level deflection/);
  assert.throws(()=>scientificMotif({...b,states:[b.states[0],b.states[0]]},theme),/unique IDs/);
  const loaded=structuredClone(b);loaded.states[1].load='F';
  const loadedGeometry=scientificMotif(loaded,theme);assert.deepEqual(loadedGeometry.nodes,s.nodes);
  assert.equal(loadedGeometry.paths.filter(p=>p.id.endsWith('-load-arrow')).length,1);
  assert.equal(loadedGeometry.texts.filter(t=>t.text==='F').length,1);assert.ok(loadedGeometry.paths.every(p=>p.nativeModule==='sample'));
});
test('graph topology and endpoints survive a label or palette edit',()=>{
  const b={...base,...examples[0]},a=scientificMotif(b,theme);
  b.palette={focus:'#B64951',soft:'#F0D6D3'};b.points[0].label='Renamed';
  const c=scientificMotif(b,theme);
  assert.deepEqual(c.edges,a.edges);
  assert.deepEqual(c.nodes.map(n=>[n.id,n.x,n.y,n.w,n.h]),a.nodes.map(n=>[n.id,n.x,n.y,n.w,n.h]));
  assert.equal(c.edges[0].from,'object-a');assert.equal(c.edges[0].to,'object-b');
});

test('graph point captions support explicit sides and gaps without changing topology',()=>{
  const source={...base,kind:'graph',diameter:20,size:16,
    points:[{id:'upper',x:.5,y:.25,label:'Upper'},{id:'lower',x:.5,y:.75,label:'Lower'}],
    links:[{from:'upper',to:'lower'}]};
  const original=scientificMotif(source,theme),before=structuredClone(source);
  const point=original.nodes.find(n=>n.id==='object-lower'),cx=point.x+point.w/2,cy=point.y+point.h/2;
  assert.deepEqual(original.texts[1],{id:'object-label-2',x:cx,y:cy-10-6,text:'Lower',size:16,color:'#3C4749',anchor:'middle',pointLabel:'lower',nativeModule:'object'});
  for(const [labelPos,anchor] of [['above','middle'],['below','middle'],['left','end'],['right','start']]){
    const input=structuredClone(source);Object.assign(input.points[1],{labelPos,labelGap:9});
    const out=scientificMotif(input,theme),caption=out.texts.find(t=>t.pointLabel==='lower');
    assert.equal(caption.anchor,anchor);assert.equal(caption.id,'object-label-2');
    if(labelPos==='above')assert.equal(caption.y,cy-19);
    if(labelPos==='below')assert.equal(caption.y,Math.round((cy+19+16*.82)*100)/100);
    if(labelPos==='left'||labelPos==='right'){
      assert.equal(caption.x,cx+(labelPos==='left'?-19:19));assert.equal(caption.y,cy+5.6);
    }
    assert.deepEqual(out.nodes,original.nodes);assert.deepEqual(out.edges,original.edges);
  }
  const hidden=structuredClone(source);hidden.points[0].labelPos='none';
  const out=scientificMotif(hidden,theme);assert.deepEqual(out.texts.map(t=>t.pointLabel),['lower']);
  assert.deepEqual(out.nodes,original.nodes);assert.deepEqual(out.edges,original.edges);
  const multiline=structuredClone(source);Object.assign(multiline.points[1],{label:'Two\nlines',labelPos:'right',labelGap:0});
  const caption=scientificMotif(multiline,theme).texts[1];assert.equal(caption.x,cx+10);assert.equal(caption.y,cy-4.8);
  assert.deepEqual(source,before);
});

test('invalid graph point caption settings fail rather than silently using defaults',()=>{
  for(const props of [{labelPos:'inside'},{labelPos:null},{labelGap:-1},{labelGap:NaN},{labelGap:Infinity},{labelGap:'8'},{labelGap:null}]){
    assert.throws(()=>scientificMotif({...base,kind:'graph',points:[{id:'a',x:.5,y:.5,label:'A',...props}]},theme),/point labelPos|point labelGap/);
  }
});
test('cell count, network topology and interval lengths are explicit input facts',()=>{
  const tensor=scientificMotif({...base,...examples[2]},theme);assert.equal(tensor.nodes.length-1,12);
  const network=scientificMotif({...base,...examples[1]},theme);assert.equal(network.nodes.length-1,6);assert.equal(network.edges.length,9);
  const seq=scientificMotif({...base,...examples[3]},theme);
  assert.equal(seq.nodes.find(n=>n.id==='object-track-0-segment-0').w,78);
});
test('invalid or unsupported object specifications fail before a browser render',()=>{
  for(const example of [
    {kind:'graph',points:[{id:'a',x:2,y:.1}]},
    {kind:'graph',points:[{id:'a',x:.1,y:.1}],links:[{from:'a',to:'missing'}]},
    {kind:'network',layers:[3,0]},
    {kind:'tensor',cells:[['soft'],[]]},
    {kind:'sequence',tracks:[{segments:[{start:.7,end:.2}]}]},
    {kind:'sequence',tracks:[{segments:[{start:.1,end:.2}]}],links:[{from:[5,.2],to:[0,.3]}]},
    {kind:'layers',layers:[{}],projection:[1000,1000]},
    {kind:'cycle',steps:['A','B']},
    {kind:'manifold',points:[{id:'a',x:0,y:0}]},
    {...examples[0],poitns:[]},
    {...examples[0],size:-1},
    {kind:'formula',runs:[{text:'v',suup:'l'}]},
    {kind:'formula',runs:[{text:'v',sup:[]}]},
    {kind:'formula',runs:[{text:'v',vector:'yes'}]},
    {kind:'formula',runs:[{text:'x'.repeat(200)}]},
    {kind:'formula',h:2,runs:[{text:'v',sub:'i',sup:'l'}]},
  ])assert.throws(()=>scientificMotif({...base,...example},theme),/Scientific motif/);
  assert.throws(()=>prepareScene({theme:'journal',nodes:[{id:'lost',x:0,y:0,w:10,h:10,nativeModule:'missing'}]},theme),/unknown native module/);
});
test('formula scripts preserve variables and nested script positions without Unicode substitutions',()=>{
  const s=scientificMotif({...base,...examples[7],size:24},theme),v=s.texts.find(t=>t.text==='v'),i=s.texts.find(t=>t.text==='i'),l=s.texts.find(t=>t.text==='l'),d=s.texts.find(t=>t.text==='d'),dimension=s.texts.filter(t=>t.text==='v')[1];
  assert.ok(i.y>v.y&&l.y<v.y);assert.equal(i.x,l.x);assert.ok(d.y<v.y&&dimension.y>d.y);assert.ok(dimension.size<d.size);
  assert.equal(s.paths.length,1);assert.equal(s.texts.filter(t=>t.text==='γ').length,1);assert.equal(s.texts.filter(t=>t.text==='2').length,1);
  assert.ok(s.texts.every(t=>t.nativeModule==='object'));assert.doesNotMatch(s.texts.map(t=>t.text).join(''),/ᵀ|̃|ᵢ/);
  const state=scientificMotif({...base,kind:'formula',w:44,h:44,size:20,enclosure:'circle',runs:[{text:'v',sub:'i',sup:'l'}]},theme);
  assert.equal(state.nodes[0].shape,'circle');assert.equal(state.nodes[0].id,'object');assert.ok(state.texts.every(t=>t.nativeModule==='object'));
});
test('a formula script edit addresses its module and leaves all topology and other symbols intact',()=>{
  const source={theme:'journal',blocks:[{...base,kind:'formula',runs:[{text:'v',sub:'i',sup:'T'}]}]},saved=structuredClone(source);
  const {scene,changes}=patchScene(source,[{id:'object',field:'sup',expect:'T',value:'l'}]);
  assert.deepEqual(source,saved);assert.equal(changes[0].path,'/blocks/0/runs/0/sup');
  const expected=structuredClone(source);expected.blocks[0].runs[0].sup='l';assert.deepEqual(scene,expected);
  assert.throws(()=>patchScene(scene,[{id:'object',field:'sup',expect:'T',value:'j'}]),/source changed/);
});
test('scientific recipes retain actual connected edges and safe native geometry',()=>{
  for(const id of ['graph-learning','shared-trunk']){
    const source=new URL(`../skills/musedraw/assets/design-examples/scientific/${id}/scene.json`,import.meta.url);
    const s=JSON.parse(fs.readFileSync(source,'utf8')),e=prepareScene(s,theme);
    assert.ok(e.edges.length>15);assert.ok(e.nativeModules.length>=2);
    assert.ok(e.nodes.some(n=>n.shape==='circle'));assert.doesNotMatch(render(s,theme),/<image|foreignObject/);
  }
});
test('design lookup is local and replay preserves the user-adapted scene',()=>{
  const cli=fileURLToPath(new URL('../skills/musedraw/scripts/musedraw.mjs',import.meta.url));
  const listing=spawnSync(process.execPath,[cli,'designs','shared-trunk','--json'],{encoding:'utf8'});
  assert.equal(listing.status,0,listing.stderr);assert.equal(JSON.parse(listing.stdout).examples[0].id,'shared-trunk');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'musedraw-design-'));
  try{
    const first=spawnSync(process.execPath,[cli,'design','graph-learning','--out',dir,'--svg-only'],{encoding:'utf8'});
    assert.equal(first.status,0,first.stderr);
    const target=path.join(dir,'scene.json'),s=JSON.parse(fs.readFileSync(target,'utf8'));s.title='User revision';fs.writeFileSync(target,JSON.stringify(s));
    const bytes=fs.readFileSync(target,'utf8');
    const second=spawnSync(process.execPath,[cli,'design','shared-trunk','--out',dir,'--svg-only'],{encoding:'utf8'});
    assert.equal(second.status,0,second.stderr);assert.equal(fs.readFileSync(target,'utf8'),bytes);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
