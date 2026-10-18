import assert from 'node:assert/strict';
import { test } from 'node:test';
import { prepareScene, validateScene } from '../skills/musedraw/scripts/engine/validate.mjs';
import { loadTheme } from '../skills/musedraw/scripts/musedraw.mjs';
import { patchScene } from '../skills/musedraw/scripts/engine/patch.mjs';
import { render } from '../skills/musedraw/scripts/engine/render.mjs';
import { toDrawio } from '../skills/musedraw/scripts/engine/drawio.mjs';
import { viewNodeId } from '../skills/musedraw/scripts/engine/object-views.mjs';

const theme = await loadTheme('journal');
const scene = () => ({theme:'journal',size:[1100,500],header:false,footer:false,autoFit:false,
  blocks:[{type:'object-views',id:'assembly',x:50,y:40,w:1000,h:380,columns:2,
    entities:[{id:'base',label:'底座',shape:'box',tone:'gray'},
      {id:'lid',label:'盖板',shape:'parallelogram',tone:'blue'}],
    views:[{id:'separated',label:'分离',items:[
      {entity:'base',at:[.5,.7],size:[.6,.12]},
      {entity:'lid',at:[.5,.25],size:[.6,.12]}]},
    {id:'aligned',label:'对齐',items:[
      {entity:'base',at:[.5,.7],size:[.6,.12]},
      {entity:'lid',at:[.5,.5],size:[.6,.12]}]}]}]});

test('shared entity edit updates every appearance without changing geometry or IDs',()=>{
  const s=scene(), before=prepareScene(s,theme);
  const result=patchScene(s,[{id:'lid',field:'label',expect:'盖板',value:'上盖'}]);
  const after=prepareScene(result.scene,theme);
  assert.equal(result.changes.length,1);
  const geometry=nodes=>nodes.map(({id,x,y,w,h,shape,tone})=>({id,x,y,w,h,shape,tone}));
  assert.deepEqual(geometry(before.nodes),geometry(after.nodes));
  assert.equal(after.nodes.find(n=>n.id==='assembly-separated-lid').label,'上盖');
  assert.equal(after.nodes.find(n=>n.id==='assembly-aligned-lid').labelPos,'none');
  assert.equal(after.edges.length,0,'comparison views must not invent process arrows');
});

test('entity geometry and encoding stay shared while poses change',()=>{
  const out=prepareScene(scene(),theme), lids=out.nodes.filter(n=>n.id.endsWith('-lid'));
  assert.equal(lids.length,2);
  assert.equal(lids[0].shape,lids[1].shape);assert.equal(lids[0].tone,lids[1].tone);
  assert.equal(lids[0].w,lids[1].w);assert.equal(lids[0].h,lids[1].h);
  assert.notEqual(lids[0].y,lids[1].y);
});

test('canonical entity extent reuses physical dimensions across views and supports a deliberate override',()=>{
  const s=scene(),b=s.blocks[0];
  for(const entity of b.entities){entity.extent=b.views[0].items.find(p=>p.entity===entity.id).size;}
  for(const view of b.views)for(const pose of view.items)delete pose.size;
  const out=prepareScene(s,theme),lids=out.nodes.filter(n=>n.id.endsWith('-lid'));
  assert.equal(lids[0].w,lids[1].w);assert.equal(lids[0].h,lids[1].h);
  assert.equal(lids[0].size,undefined,'extent must not become font size');
  b.views[1].items[1].size=[.3,.12];
  const changed=prepareScene(s,theme).nodes.filter(n=>n.id.endsWith('-lid'));
  assert.equal(changed[1].w,changed[0].w/2);
  delete b.entities[1].extent;delete b.views[1].items[1].size;
  assert.ok(validateScene(s).some(e=>e.path==='/blocks/0/views/0/items/1/size'));
});

test('explicit view identities survive insertion and support native edge targets',()=>{
  const s=scene();s.blocks[0].views.unshift({id:'new',items:[{entity:'base',at:[.5,.5],size:[.5,.1]}]});
  s.edges=[{from:'assembly-separated-lid',to:'assembly-aligned-lid',label:'对齐'}];
  const out=prepareScene(s,theme);
  assert.ok(out.nodes.some(n=>n.id==='assembly-separated-lid'));
  assert.equal(out.edges[0].to,'assembly-aligned-lid');
});

test('unknown/duplicate entity references and out-of-view poses fail preflight',()=>{
  for(const change of [
    s=>s.blocks[0].views[0].items[0].entity='missing',
    s=>s.blocks[0].entities.push({...s.blocks[0].entities[0]}),
    s=>s.blocks[0].views[0].items.push({...s.blocks[0].views[0].items[0]}),
    s=>s.blocks[0].views[0].items[0].at=[.95,.7],
    s=>s.blocks[0].views[0].items[0].size=[0,.1],
  ]) {const s=scene();change(s);assert.ok(validateScene(s).length);}
});

test('separator-containing identities have unambiguous generated IDs',()=>{
  assert.notEqual(viewNodeId('demo','a','b-c'),viewNodeId('demo','a-b','c'));
  assert.notEqual(viewNodeId('demo','a','b%2Dc'),viewNodeId('demo','a','b-c'));
  const s=scene();s.blocks[0].entities=[{id:'b-c',label:'B',shape:'box'},{id:'c',label:'C',shape:'box'}];
  s.blocks[0].views=[{id:'a',items:[{entity:'b-c',at:[.5,.5],size:[.3,.3]}]},
    {id:'a-b',items:[{entity:'c',at:[.5,.5],size:[.3,.3]}]}];
  const out=prepareScene(s,theme);assert.equal(new Set(out.nodes.map(n=>n.id)).size,2);
});

test('labelPos none suppresses actual text, not only the geometry-check flag',()=>{
  const s={theme:'journal',size:[300,200],header:false,footer:false,autoFit:false,
    nodes:[{id:'pin',label:'MUST_NOT_APPEAR',sub:'NOR_SUB',tag:'NOR_TAG',labelPos:'none',shape:'circle',x:100,y:80,w:30,h:30}]};
  const svg=render(s,theme);
  assert.doesNotMatch(svg,/MUST_NOT_APPEAR|NOR_SUB|NOR_TAG/);
});

test('outside person labels use canvas ink rather than white text from filled tones',async()=>{
  const t=await loadTheme('enterprise');
  const s={theme:'enterprise',size:[400,300],header:false,footer:false,autoFit:false,
    nodes:[{id:'employee',label:'Employee',sub:'Owner',shape:'person',tone:'blue',x:50,y:50,w:100,h:130}]};
  const svg=render(s,t);
  assert.ok(svg.includes(`fill="${t.palette.ink}" text-anchor="middle"`));
  assert.ok(svg.includes(`fill="${t.palette.muted}" text-anchor="middle"`));
  s.nodes[0].labelColor='#123456';assert.match(render(s,t),/fill="#123456"[^>]*><tspan[^>]*>Employee/);
});

test('foreground opt-in paints after filled nodes; defaults retain old layering',()=>{
  const s={theme:'journal',size:[400,300],header:false,footer:false,autoFit:false,
    nodes:[{id:'object',label:'',x:30,y:30,w:300,h:200}],
    lines:[{points:[[50,70],[300,70]],color:'#ff0000'}, {points:[[50,100],[300,100]],color:'#00ff00',layer:'foreground'}],
    paths:[{d:'M50 150H300',stroke:'#0000ff',layer:'foreground'}]};
  const svg=render(s,theme), object=svg.indexOf('id="object"'), front=svg.indexOf('id="foreground"');
  assert.ok(svg.indexOf('id="line-1"')<object);
  assert.ok(object<front&&front<svg.indexOf('id="line-2"'));
  assert.ok(front<svg.indexOf('id="path-1"'));
  assert.equal((svg.match(/id="line-2"/g)||[]).length,1);
  s.lines[1].layer='foregroun';assert.ok(validateScene(s).length);
});

test('foreground drawio connector retains native terminals and paints after object groups',()=>{
  const native={size:[600,400],title:'Section',groups:[
    {id:'a',sourceId:'a',kind:'node',box:[10,10,100,50]},
    {id:'b',sourceId:'b',kind:'node',box:[200,10,100,50]},
    {id:'foreground',kind:'foreground',box:[0,0,300,100]},
    {id:'edge-label',kind:'edge-label',edgeParent:'route',box:[100,30,80,20]},
    {id:'annotations',kind:'texts',box:[0,0,300,100]}],shapes:[],texts:[],edges:[
    {id:'route',from:'a',to:'b',points:[[110,35],[200,35]],color:'#123456',width:1,opacity:1,layer:'foreground'}]};
  const xml=toDrawio(native);
  assert.match(xml,/source="a" target="b"/);
  assert.ok(xml.indexOf('id="connector-1"')>xml.indexOf('id="b"'));
  assert.ok(xml.indexOf('id="connector-1"')>xml.indexOf('id="foreground"'));
  assert.ok(xml.indexOf('id="connector-1"')<xml.indexOf('id="annotations"'));
  assert.ok(xml.indexOf('id="connector-1"')<xml.indexOf('id="edge-label"'));
  assert.match(xml,/<mxCell id="edge-label"[^>]*parent="1"/);
  const ordinary=structuredClone(native);
  ordinary.groups=ordinary.groups.filter(g=>g.kind!=='foreground');
  ordinary.edges[0].layer='background';
  assert.match(toDrawio(ordinary),/<mxCell id="edge-label"[^>]*parent="connector-1"/);
  assert.doesNotMatch(xml,/shape=image|data:image|foreignObject/);
});
