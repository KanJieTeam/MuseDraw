// Native hierarchy regressions. The optional Chromium case exercises the real
// SVG collector; these checks do not claim an official draw.io editor roundtrip.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import {toDrawio,collectEditableScene} from '../skills/musedraw/scripts/engine/drawio.mjs';

const attrs=text=>Object.fromEntries([...text.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
const cells=xml=>new Map([...xml.matchAll(/<mxCell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/mxCell>)/g)].map(m=>{const a=attrs(m[1]);return [a.id,{...a,body:m[2]??''}];}));
const fixture=()=>({size:[800,500],title:'Native module',groups:[
  {id:'module',kind:'module',sourceId:'scientific-graph',box:[100,80,300,200]},
  {id:'node-a',kind:'node',sourceId:'a',parent:'module',box:[120,100,20,20]},
  {id:'node-b',kind:'node',sourceId:'b',parent:'module',box:[330,220,20,20]},
  {id:'node-out',kind:'node',sourceId:'out',box:[600,220,40,40]},
  {id:'internal-label',kind:'edge-label',edgeParent:'inside',parent:'module',box:[210,140,60,20]},
  {id:'ordinary-label',kind:'edge-label',edgeParent:'outside',box:[420,250,70,20]},
  {id:'foreground',kind:'foreground',box:[0,0,800,500]}],shapes:[],texts:[],edges:[
  {id:'inside',parent:'module',from:'a',to:'b',points:[[140,110],[230,110],[230,230],[330,230]],color:'#334455',width:1,opacity:1},
  {id:'outside',from:'b',to:'out',points:[[350,230],[470,230],[470,240],[600,240]],color:'#334455',width:1,opacity:1}]});

test('internal connectors are module children, with local waypoints and unchanged terminals',()=>{
  const source=fixture(),before=structuredClone(source),map=cells(toDrawio(source));
  assert.deepEqual(source,before);
  const edge=map.get('connector-1');assert.equal(edge.parent,'module');
  assert.equal(edge.source,'node-a');assert.equal(edge.target,'node-b');
  assert.equal(map.get('internal-label').parent,'connector-1');
  assert.match(edge.body,/<mxPoint x="130" y="30"\/><mxPoint x="130" y="150"\/>/);
  assert.match(edge.style,/exitX=1;exitY=0.5;/);assert.match(edge.style,/entryX=0;entryY=0.5;/);
  // A cloned module's descendant set contains its topology as well as actors.
  const descendants=new Set(['module']);let changed=true;
  while(changed){changed=false;for(const c of map.values())if(descendants.has(c.parent)&&!descendants.has(c.id)){descendants.add(c.id);changed=true;}}
  assert.ok(descendants.has('connector-1'));assert.ok(descendants.has('node-a'));assert.ok(descendants.has('node-b'));
  assert.ok(!descendants.has('connector-2'),'external relationship stays outside the copied component');
  const moved=structuredClone(source);for(const g of moved.groups)if(g.id==='module'||g.parent==='module'){g.box[0]+=37;g.box[1]+=19;}
  for(const e of moved.edges)if(e.parent==='module')e.points=e.points.map(([x,y])=>[x+37,y+19]);
  assert.equal(cells(toDrawio(moved)).get('connector-1').body,edge.body,'moving the module leaves local routing unchanged');
  assert.equal(cells(toDrawio(moved)).get('internal-label').body,map.get('internal-label').body,'attached label offsets are independent of module position');
});

test('ordinary edges and attached labels keep their ownership with unrelated foreground objects',()=>{
  const source=fixture(),map=cells(toDrawio(source));
  const edge=map.get('connector-2');assert.equal(edge.parent,'1');
  assert.match(edge.body,/<mxPoint x="470" y="230"\/><mxPoint x="470" y="240"\/>/);
  assert.equal(map.get('ordinary-label').parent,'connector-2');
  assert.match(map.get('ordinary-label').body,/relative="1"/);
  source.edges.push({id:'force',from:'a',to:'out',points:[[140,110],[600,240]],color:'#334455',width:1,opacity:1,layer:'foreground'});
  source.groups.push({id:'force-label',kind:'edge-label',edgeParent:'force',box:[350,160,40,20]});
  const mixed=cells(toDrawio(source));
  assert.equal(mixed.get('ordinary-label').parent,'connector-2');
  assert.equal(mixed.get('force-label').parent,'1','explicit foreground labels retain their existing overlay contract');
});

test('unresolved connector parents fail instead of serializing an orphan edge',()=>{
  const source=fixture();source.edges[0].parent='missing';assert.throws(()=>toDrawio(source),/connector parent/);
});

test('Chromium collector keeps real scientific bonds within the module and labels on ordinary edges',{
  skip:!process.env.MUSEDRAW_NATIVE_BROWSER_EVIDENCE
},async()=>{
  const [{render},{loadTheme},{loadPlaywrightInfo},{resolveBrowser,withSystemFonts}]=await Promise.all([
    import('../skills/musedraw/scripts/engine/render.mjs'),import('../skills/musedraw/scripts/musedraw.mjs'),
    import('../skills/musedraw/scripts/engine/export.mjs'),import('../skills/musedraw/scripts/engine/environment.mjs')]);
  const {pw}=await loadPlaywrightInfo(),found=resolveBrowser(pw,{}),browser=await pw.chromium.launch({headless:true,executablePath:found.executablePath});
  const dir=path.resolve(process.env.MUSEDRAW_NATIVE_BROWSER_EVIDENCE);fs.mkdirSync(dir,{recursive:true});
  try{
    const theme=await loadTheme('journal'),scene={theme:'journal',size:[800,500],header:false,footer:false,autoFit:false,
      blocks:[{type:'scientific',kind:'graph',id:'graph',x:100,y:100,w:250,h:180,
        points:[{id:'a',x:.1,y:.3},{id:'b',x:.8,y:.7}],links:[{from:'a',to:'b'}]}],
      nodes:[{id:'out',x:580,y:150,w:120,h:60,label:'Output'}],edges:[{id:'readout',from:'graph',to:'out',label:'Readout'}],
      lines:[{points:[[500,320],[600,320]],color:'#334455',layer:'foreground'}]};
    const svg=withSystemFonts(render(scene,theme)),page=await browser.newPage();
    await page.route(/^https?:\/\//,route=>route.abort());await page.setContent(`<html><body>${svg}</body></html>`);await page.evaluate(()=>document.fonts.ready);
    const native=await page.evaluate(collectEditableScene),map=cells(toDrawio(native));
    const module=native.groups.find(g=>g.kind==='module');assert.ok(module);
    const internal=native.edges.find(e=>e.id==='graph-bond-0');assert.equal(internal.parent,module.id);
    const internalIndex=native.edges.indexOf(internal)+1;assert.equal(map.get(`connector-${internalIndex}`).parent,module.id);
    const ordinary=native.edges.find(e=>e.id==='readout');assert.equal(ordinary.parent,undefined);
    const ordinaryIndex=native.edges.indexOf(ordinary)+1,label=native.groups.find(g=>g.kind==='edge-label'&&g.edgeParent==='readout');
    assert.ok(label);assert.equal(map.get(label.id).parent,`connector-${ordinaryIndex}`);
    fs.writeFileSync(path.join(dir,'native.json'),JSON.stringify(native,null,2));fs.writeFileSync(path.join(dir,'diagram.drawio'),toDrawio(native));
    fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify({passed:true,scope:'Chromium collector and native XML ownership; no official draw.io editor roundtrip',internalEdges:1,ordinaryAttachedLabels:1},null,2));
  }finally{await browser.close();}
});
