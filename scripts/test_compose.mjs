import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compose, composeStates } from '../skills/musedraw/scripts/engine/compose.mjs';
import { loadTheme } from '../skills/musedraw/scripts/musedraw.mjs';
import { render } from '../skills/musedraw/scripts/engine/render.mjs';
import { validateScene } from '../skills/musedraw/scripts/engine/validate.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { measure } from '../skills/musedraw/scripts/engine/text.mjs';

const brief = () => ({method:'states',entities:[
  {id:'base',label:'底座',extent:[.7,.2],role:'context'},
  {id:'lid',label:'盖板',extent:[.7,.12],role:'focus'},
  {id:'pin',label:'定位销',extent:[.04,.18],role:'constraint'}],views:[
  {id:'start',label:'分离',items:[{entity:'lid',place:{of:'base',relation:'above',gap:.25}},
    {entity:'pin',place:{of:'base',relation:'align',offset:[-.15,-.05]}},{entity:'base',at:[.5,.75]}]},
  {id:'aligned',label:'对齐',from:'start',items:[{entity:'lid',place:{of:'base',relation:'above',gap:.12}}]},
  {id:'assembled',label:'装配',from:'aligned',items:[{entity:'lid',place:{of:'base',relation:'above'}}]}]});

test('states resolve contact and persistent sizes without per-view size or page coordinates',()=>{
  const s=compose(brief());assert.equal(s.size[0],1200);assert.equal(s.header,false);assert.equal(s.footer,false);
  assert.deepEqual(validateScene(s),[]);
  const base=s.nodes.find(n=>n.id==='states-assembled-base'),lid=s.nodes.find(n=>n.id==='states-assembled-lid');
  assert.ok(Math.abs(lid.y+lid.h-base.y)<.02,'zero-gap surfaces must contact');
  assert.equal(base.x,lid.x);
  for(const id of ['base','lid','pin']){
    const appearances=s.nodes.filter(n=>n.id.startsWith('states-')&&n.id.endsWith('-'+id));
    assert.equal(appearances.length,3);assert.equal(new Set(appearances.map(n=>`${n.w},${n.h},${n.tone}`)).size,1);
  }
  assert.equal(s.nodes.filter(n=>n.labelPos!=='none').length,0,'part names have a readable key, not tiny overprinted type');
  assert.equal(s.texts.filter(t=>t.text==='定位销').length,1);
});

test('inherited attachment follows a moved reference; input order does not affect constraint resolution',()=>{
  const b=brief();b.views[1].items.push({entity:'base',at:[.55,.75]});
  const s=compose(b),pin=s.nodes.find(n=>n.id==='states-aligned-pin'),base=s.nodes.find(n=>n.id==='states-aligned-base');
  assert.ok(Math.abs((pin.x+pin.w/2)-(base.x+base.w/2)+(.15*((1200-84-128)/3)))<.03);
  const before=structuredClone(b);compose(b);assert.deepEqual(b,before,'compiler must not mutate the semantic source');
});

test('retitling a view or object preserves geometry and visual identity',()=>{
  const b=brief(),before=compose(b);b.entities[1].label='上盖';b.views[0].label='初始';const after=compose(b);
  const geometry=s=>s.nodes.filter(n=>n.id.startsWith('states-')).map(({id,x,y,w,h,tone})=>({id,x,y,w,h,tone}));
  assert.deepEqual(geometry(before),geometry(after));assert.ok(after.texts.some(t=>t.text==='上盖'));
});

test('placement rejects cycles, undefined visible references and objects that do not fit inside',()=>{
  for(const mutate of [
    b=>b.views[0].items[2]={entity:'base',place:{of:'lid',relation:'below'}},
    b=>b.views[0].items=b.views[0].items.filter(p=>p.entity!=='base'),
    b=>b.views[0].items[0]={entity:'lid',place:{of:'pin',relation:'inside'}},
    b=>b.views[0].items[0]={entity:'lid',at:[.5,.01]},
    b=>b.views[0].items[0].place.relation='insde',
  ]){const b=brief();mutate(b);assert.throws(()=>compose(b),/Invalid composition/);}
});

test('invalid structure or silently ignored fields fail with actionable paths',()=>{
  for(const mutate of [
    b=>b.entities[0].extent=[0,.1],b=>b.entities[0].extent=[NaN,.1],
    b=>b.entities[0].role='purple',b=>b.views[0].items[0].entity='missing',
    b=>b.views[1].from='future',b=>b.views[1].items.push(b.views[1].items[0]),
    b=>b.columns=4,b=>b.width=300,b=>b.views[1].items[0].at=[.5,.5],
    b=>b.entities.push({...b.entities[0]}),b=>b.views[0].arrows=[{from:[0,0],to:[0,0]}],
    b=>b.viewz=[],
  ]){const b=brief();mutate(b);assert.throws(()=>compose(b),/Invalid composition/);}
  assert.throws(()=>compose({method:'magic'}),/method/);
});

test('reading sizes scale with viewing width, and many views reflow rather than shrink type',()=>{
  const b=brief();b.width=1800;let s=compose(b);
  assert.ok(s.texts.every(t=>t.size*1200/s.size[0]>=17),'1200px preview stays readable');
  b.views.push({...structuredClone(b.views[2]),id:'four'});s=compose(b);
  assert.ok(s.size[1]>600);assert.deepEqual(validateScene(s),[]);
});

test('state labels and object names remain real editable text; motion uses native paths',async()=>{
  const b=brief();b.views[1].arrows=[{from:[.93,.2],to:[.93,.55],label:'落下'}];
  const s=compose(b),svg=render(s,await loadTheme(s.theme));
  for(const name of ['分离','对齐','装配','底座','盖板','定位销','落下'])assert.ok(svg.includes(name));
  assert.match(svg,/<g id="foreground"/);assert.doesNotMatch(svg,/data:image|foreignObject|<image/);
  assert.equal(s.paths.length,2);
});

test('long object names wrap without shrinking text or exceeding the right edge',()=>{
  const b=brief();b.entities[0].label='用于承载精密组件并保持稳定的底座结构'.repeat(5);
  const s=composeStates(b),name=s.texts.find(t=>t.id==='name-base');
  assert.ok(name.text.includes('\n'));assert.equal(name.size,18);assert.ok(s.size[1]>420);
});

test('inside rejects curved-container false positives and respects a frame opening',()=>{
  const b=brief();b.entities[0].shape='circle';b.views[0].items[0]={entity:'lid',place:{of:'base',relation:'inside'}};
  assert.throws(()=>compose(b),/rectangular/);
  b.entities[0].shape='frame';b.entities[1].extent=[.7,.18];
  assert.throws(()=>compose(b),/reference opening/);
});

test('edge motion labels choose the inward side, with bounded text and stable view identities',()=>{
  const b=brief();b.views[0].arrows=[{from:[.95,.1],to:[.95,.55],label:'向下移动到指定位置'}];
  const s=compose(b),label=s.texts.find(t=>t.id?.endsWith('-label'));
  assert.ok(label.x+label.w<=1200-42);assert.ok(label.x>42);
  const paths=s.paths.map(p=>p.id);b.views.unshift({id:'new',label:'新增',items:[{entity:'base',at:[.5,.5]}]});
  assert.deepEqual(compose(b).paths.map(p=>p.id),paths);
});

test('unbroken identifiers wrap without losing characters or overflowing the key',()=>{
  const b=brief(),name='VeryLongIdentifier'.repeat(15);b.entities[0].label=name;
  const s=compose(b),text=s.texts.find(t=>t.id==='name-base');
  assert.equal(text.text.replaceAll('\n',''),name);
  assert.ok(text.text.split('\n').every(line=>measure(line,text.size,'sans-serif')<=1200-84-34));
});

test('native object symbols stay recognizable in precise and hand-drawn themes',async()=>{
  for(const themeId of ['journal','whiteboard']){
    const b=brief();b.theme=themeId;b.entities[0].shape='frame';b.entities[1].shape='tray';b.entities[2].shape='folder';
    const s=compose(b),svg=render(s,await loadTheme(themeId));assert.deepEqual(validateScene(s),[]);
    for(const id of ['states-start-base','states-start-lid','states-start-pin'])assert.ok(svg.includes(`id="${id}"`));
    assert.match(svg,/<path/);assert.doesNotMatch(svg,/<image|data:image/);
  }
});

test('compose CLI preserves source files that alias reserved generated filenames',()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'musedraw-compose-source-'));
  try{
    const names=['scene.json','diagram.svg','checks.json',...(process.platform==='win32'?['Scene.json','CHECKS.JSON']:[])];
    for(const name of names){
      const file=path.join(folder,name),source=JSON.stringify(brief());fs.writeFileSync(file,source);
      const result=spawnSync(process.execPath,[new URL('../skills/musedraw/scripts/musedraw.mjs',import.meta.url).pathname.replace(/^\/(.:\/)/,'$1'), 'compose',file,'--out',folder,'--svg-only'],{encoding:'utf8'});
      assert.notEqual(result.status,0);assert.match(result.stderr,/conflicts with generated/);assert.equal(fs.readFileSync(file,'utf8'),source);
      fs.unlinkSync(file);
    }
  }finally{for(const file of fs.readdirSync(folder))fs.unlinkSync(path.join(folder,file));fs.rmdirSync(folder);}
});

test('documents keep visible identities when filed into a folder pocket',()=>{
  const b={method:'states',entities:[{id:'folder',label:'项目A',shape:'folder',extent:[.75,.6],role:'focus'},
    {id:'document',label:'A1',shape:'doc',extent:[.16,.18]}],views:[
    {id:'before',label:'归档前',items:[{entity:'folder',at:[.5,.6]},{entity:'document',at:[.5,.16]}]},
    {id:'after',label:'归档后',from:'before',items:[{entity:'document',place:{of:'folder',relation:'inside'}}]}]};
  const s=compose(b),folder=s.nodes.find(n=>n.id==='states-after-folder'),doc=s.nodes.find(n=>n.id==='states-after-document');
  assert.ok(doc.y>=folder.y+folder.h*.396);assert.ok(doc.y+doc.h<folder.y+folder.h);
  assert.equal(s.nodes.filter(n=>n.label==='A1'&&n.labelPos==='inside').length,2);
  assert.ok(!s.texts.some(t=>t.text==='A1'),'do not replace document identities by an ambiguous global key');
  b.entities[1].labelMode='key';assert.equal(compose(b).texts.filter(t=>t.text==='A1').length,1);
  b.entities[1].extent=[.16,.5];b.views[0].items[1].at=[.5,.4];assert.throws(()=>compose(b),/reference opening/);
});

test('open enclosures preserve their opening through every inherited pose and key',async()=>{
  for(const side of ['r','l','t','b']){
    const b=brief();b.entities[0].shape='frame';b.entities[0].openSide=side;
    const s=compose(b);assert.deepEqual(validateScene(s),[]);
    assert.equal(s.nodes.filter(n=>n.openSide===side).length,4);
    const svg=render(s,await loadTheme('journal'));assert.doesNotMatch(svg,/<image|foreignObject/);
  }
  const b=brief();b.entities[0].openSide='r';assert.throws(()=>compose(b),/only a frame/);
});

test('distinct folder identities attach to their bodies without covering stored documents',()=>{
  const b={method:'states',entities:[
    {id:'a',label:'项目A',shape:'folder',extent:[.4,.5]},
    {id:'b',label:'项目B',shape:'folder',extent:[.4,.5]},
    {id:'document',label:'A1',shape:'doc',extent:[.12,.16]}],
    views:[{id:'filed',label:'归档',items:[{entity:'a',at:[.25,.65]},
      {entity:'b',at:[.75,.65]},{entity:'document',place:{of:'a',relation:'inside'}}]}]};
  const s=compose(b);
  for(const name of ['项目A','项目B'])assert.ok(s.nodes.some(n=>n.label===name&&n.labelPos==='above'));
  assert.ok(s.nodes.some(n=>n.label==='A1'&&n.labelPos==='inside'));
  assert.ok(!s.texts.some(t=>['项目A','项目B','A1'].includes(t.text)));
  assert.deepEqual(validateScene(s),[]);
  b.entities[0].labelMode='key';assert.ok(compose(b).texts.some(t=>t.text==='项目A'),'explicit label choices remain authoritative');
});

test('automatic folder captions use the free side when documents occupy the upper label space',()=>{
  const b={method:'states',entities:[
    {id:'a',label:'项目A',shape:'folder',extent:[.4,.42]},
    {id:'b',label:'项目B',shape:'folder',extent:[.4,.42]},
    {id:'document',label:'A1',shape:'doc',extent:[.14,.16]}],
    views:[{id:'before',label:'混放',items:[{entity:'a',at:[.25,.77]},
      {entity:'b',at:[.75,.77]},{entity:'document',at:[.25,.42]}]},
      {id:'after',label:'归档',from:'before',items:[{entity:'document',place:{of:'a',relation:'inside'}}]}]};
  const s=compose(b);
  assert.equal(s.nodes.find(n=>n.id==='states-before-a').labelPos,'below');
  assert.equal(s.nodes.find(n=>n.id==='states-after-a').labelPos,'below');
  assert.equal(s.nodes.find(n=>n.id==='states-before-b').labelPos,'above');
});
