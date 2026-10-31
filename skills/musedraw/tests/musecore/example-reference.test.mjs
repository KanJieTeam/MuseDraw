import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
test('normal CLI discovery directs optional inputs to their declared workflow and keeps legacy fallback',()=>{
 const root=fileURLToPath(new URL('../../',import.meta.url));
 const c=JSON.parse(fs.readFileSync(path.join(root,'assets/musecore/index.json'),'utf8'));
 const result=JSON.parse(execFileSync(process.execPath,[path.join(root,'scripts/musedraw.mjs'),'core','list','--compact'],{encoding:'utf8'}));
 for(const id of ['plate-robust-screen','seeded-lb-load-scan','cap2-office-collective-daci-source','cap2-leave-thresholds']){
  const input=c.examples.find(e=>e.id===id),entry=result.examples.find(e=>e.id===id);
  assert.equal(entry.reference,input.reference,id+' must select the variant workflow');
  assert(fs.statSync(path.join(root,entry.reference)).isFile());
 }
 const legacy=c.examples.find(e=>e.id==='plate');assert.equal(legacy.reference,undefined);
 assert.equal(result.examples.find(e=>e.id==='plate').reference,c.groups.find(g=>g.ids.includes(legacy.family)).reference);
});
