import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {Sheet} from '../assets/style-kits/marks.mjs';
const skill=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('native artwork retains its actual family, Unicode and literal text',()=>{
 const d=new Sheet('swiss',{width:900,height:700,title:'图 & 文'});
 d.text(50,80,'<script>中文 & 3 > 2');
 const scene=d.scene();assert.equal(scene.theme,'swiss');assert.deepEqual(scene.size,[900,700]);
 assert.match(scene.nativeSvg,/data-theme="swiss"/);assert.match(scene.nativeSvg,/&lt;script&gt;中文 &amp; 3 &gt; 2/);
 assert.doesNotMatch(scene.nativeSvg,/<script>/);
});
test('paragraph makes growing copy consume additional lines without smaller type',()=>{
 const d=new Sheet('ink-wash');
 const short=d.paragraph(50,100,'原始记录',{width:160,size:30});
 const longer=d.paragraph(50,300,'原始记录保持只读，修正写入副本并保留日志。',{width:160,size:30});
 assert.ok(longer.lines>short.lines);assert.ok(longer.height>short.height);
 assert.ok([...d.svg().matchAll(/font-size="(\d+)"/g)].every(m=>m[1]==='30'));
});
test('invalid objects, nonfinite coordinates and unsafe path text are rejected',()=>{
 const d=new Sheet('swiss');assert.throws(()=>d.tool('unknown'));
 assert.throws(()=>d.record({width:50}));assert.throws(()=>d.text(NaN,0,'x'));
 assert.throws(()=>d.path('M0 0" onclick="x'));
 assert.throws(()=>d.brush([[0,0],[1,1]],{width:-1}));
});
test('record headings reserve a region before content rules',()=>{
 const d=new Sheet('ink-wash');d.record({kind:'copy',heading:'修正记录'});
 const svg=d.svg();assert.match(svg,/修正记录/);assert.doesNotMatch(svg,/M22 55H/);assert.match(svg,/M22 105H/);
});
test('short screwdriver uses its own handle length',()=>{
 const d=new Sheet('ink-wash');d.tool('screwdriver');
 const svg=d.svg();assert.match(svg,/M84 134L87 245/);assert.doesNotMatch(svg,/L87 321/);
});
test('kit is self-contained and refuses to overwrite an existing job',async()=>{
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'musedraw-style-kit-'));
 try{
  const out=path.join(tmp,'job'),cli=path.join(skill,'scripts/style-kit.mjs');
  let r=spawnSync(process.execPath,[cli,'--style','swiss','--out',out],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
  await fs.writeFile(path.join(out,'user-note.txt'),'preserve');
  r=spawnSync(process.execPath,[path.join(out,'make.mjs')],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
  assert.equal(JSON.parse(await fs.readFile(path.join(out,'scene.json'),'utf8')).theme,'swiss');
  r=spawnSync(process.execPath,[cli,'--style','swiss','--out',out],{encoding:'utf8'});assert.notEqual(r.status,0);
  assert.equal(await fs.readFile(path.join(out,'user-note.txt'),'utf8'),'preserve');
 }finally{await fs.rm(tmp,{recursive:true,force:true});}
});
