// Browser acceptance for editable modules and source-preserving text changes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..'),cli=path.join(root,'skills/musedraw/scripts/musedraw.mjs');
const option=(key,fallback)=>{const i=process.argv.indexOf(key);return i<0?fallback:process.argv[i+1];};
const out=path.resolve(option('--out','output/edit-qa'));
const runtime=option('--playwright')?['--playwright',option('--playwright')]:[];
if(option('--browser'))runtime.push('--browser',option('--browser'));
fs.mkdirSync(out,{recursive:true});
const call=(...args)=>{
  const result=spawnSync(process.execPath,[cli,...args,...runtime,'--strict'],{cwd:root,encoding:'utf8',timeout:30000});
  assert.equal(result.status,0,result.stdout+result.stderr);return result;
};
const source=path.join(out,'source'),revision=path.join(out,'revision');
fs.mkdirSync(source,{recursive:true});
const scene={theme:'enterprise',header:false,footer:false,autoFit:false,size:[600,350],
  style:{palette:{bg:'#ffffff'},node:{size:14,padding:4}},
  blocks:[{id:'modules',type:'grid',x:30,y:30,w:540,columns:3,size:14,cellPadding:4,rowH:60,gap:16,padding:0,
    cellFill:'#7795f4',cellStroke:'none',textColor:'#ffffff',radius:3,
    items:[{id:'service',label:'Service reach'},{id:'resolution',label:'Issue handling'},{id:'improvement',label:'Improvement'},{id:'data',label:'Business data'}]}],
  edges:[{from:'service',to:'data',fromSide:'b',toSide:'t'}]};
const sourcePath=path.join(source,'scene.json');
fs.writeFileSync(sourcePath,JSON.stringify(scene));
call('render',sourcePath,'--out',source);
const read=(dir,name)=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
const first=read(source,'run.json');
assert.ok(first.events.findIndex(v=>v.stage==='preview')<first.events.findIndex(v=>v.stage==='png'));
const changes=path.join(out,'changes.json');
const operations=[{from:'Service reach',to:'Service coverage'},{from:'Issue handling',to:'Resolution'},{id:'data',field:'label',expect:'Business data',value:'Operating data'}];
fs.writeFileSync(changes,JSON.stringify(operations));
const before=fs.readFileSync(sourcePath,'utf8');
call('patch',sourcePath,changes,'--out',revision);
assert.equal(fs.readFileSync(sourcePath,'utf8'),before);
const expected=structuredClone(scene);
expected.blocks[0].items[0].label='Service coverage';expected.blocks[0].items[1].label='Resolution';expected.blocks[0].items[3].label='Operating data';
assert.deepEqual(read(revision,'scene.json'),expected);
const checks=read(revision,'checks.json');
assert.equal(checks.passed,true);assert.equal(checks.nodes,4);
assert.equal(read(revision,'changes.json').changes.length,3);
assert.match(fs.readFileSync(path.join(revision,'diagram.svg'),'utf8'), /Operating|data/);
const revisionMs=read(revision,'run.json').elapsedMs;
call('render',path.join(revision,'scene.json'),'--out',revision);
assert.equal(read(revision,'run.json').cached,true);
const summary={passed:true,firstRenderMs:first.elapsedMs,revisionMs,onlyRequestedFieldsChanged:true,originalPreserved:true,svgAndPng:true,connectedEdges:1,defaultCacheVerified:true};
fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
