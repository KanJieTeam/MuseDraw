import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {normalizeGraph,applyOperations,graphRanks,graphStyle,composeGraph,renderGraph} from '../skills/musedraw/scripts/render_graph.mjs';
import {TASKS} from './test_deepseek_showcase.mjs';
const test=(name,fn)=>{fn();console.log('PASS '+name);};
const base={title:'Example',nodes:[{id:'a',label:'Portal',kind:'client'},{id:'b',label:'Service',kind:'service'},{id:'c',label:'Records',kind:'store'}],edges:[{from:'a',to:'b'},{from:'b',to:'c'}]};
test('coordinates rejected',()=>assert.throws(()=>normalizeGraph({...base,x:200})));
test('unknown parents rejected',()=>assert.throws(()=>normalizeGraph({...base,nodes:[{id:'a',label:'a',parent:'missing'}]})));
test('missing edges rejected',()=>assert.throws(()=>normalizeGraph({...base,edges:[{from:'a',to:'missing'}]})));
test('duplicate ids and ambiguous endpoint pairs rejected',()=>{assert.throws(()=>normalizeGraph({...base,nodes:[base.nodes[0],base.nodes[0]]}));assert.throws(()=>normalizeGraph({...base,edges:[base.edges[0],base.edges[0]]}));});
test('generated SVG id collisions rejected',()=>assert.throws(()=>normalizeGraph({...base,nodes:[{id:'a',label:'a'},{id:'a-label',label:'b'}],edges:[]})));
test('empty groups rejected',()=>assert.throws(()=>normalizeGraph({...base,groups:[{id:'empty',label:'Empty'}]})));
test('rename preserves IDs and all unrelated content',()=>{const before=normalizeGraph(base),after=applyOperations(before,[{op:'rename_node',id:'b',label:'Intake'}]);assert.equal(after.nodes[1].id,'b');assert.deepEqual(after.nodes[0],before.nodes[0]);assert.deepEqual(after.edges,before.edges);assert.equal(before.nodes[1].label,'Service');});
test('delete removes only incident relations',()=>{const after=applyOperations(base,[{op:'remove_node',id:'c'}]);assert.equal(after.nodes.length,2);assert.equal(after.edges.length,1);assert.equal(after.edges[0].from,'a');});
test('failed edit is atomic',()=>{const original=JSON.stringify(base);assert.throws(()=>applyOperations(base,[{op:'rename_node',id:'b',label:'Changed'},{op:'add_edge',edge:{from:'a',to:'unknown'}}]));assert.equal(JSON.stringify(base),original);});
test('cycles survive ranking',()=>{const ranks=graphRanks([{id:'a'},{id:'b'},{id:'c'}],[{from:'a',to:'b'},{from:'b',to:'a'},{from:'b',to:'c'}]);assert.equal(ranks.get('a'),ranks.get('b'));assert.equal(ranks.get('c'),ranks.get('a')+1);});
const measure=(s,size)=>[...s].reduce((w,c)=>w+(c.charCodeAt(0)>127?size:size*.6),0);
const sketch=await graphStyle('手绘线稿'),terminal=await graphStyle('终端色域');
test('flow cannot visually claim unrelated nodes as group members',()=>{const scene=normalizeGraph({title:'Ownership',groups:[{id:'g',label:'Actual group'}],nodes:[{id:'a',label:'A',parent:'g'},{id:'b',label:'External',parent:null},{id:'c',label:'C',parent:'g'}],edges:[]});assert.throws(()=>composeGraph(scene,terminal,measure,'flow',192),/unrelated node/);});
test('unknown style rejected',()=>assert.notEqual(sketch.outline,terminal.outline));
await assert.rejects(()=>graphStyle('missing'));
test('deterministic native source',()=>{const scene=normalizeGraph(base);assert.equal(composeGraph(scene,sketch,measure,'flow',192).svg,composeGraph(scene,sketch,measure,'flow',192).svg);});
test('same content supports different role glyphs without imported gallery',()=>{const scene=normalizeGraph(base),a=composeGraph(scene,sketch,measure,'flow',192),b=composeGraph(scene,terminal,measure,'flow',192);assert.notEqual(a.svg,b.svg);assert.deepEqual(a.metadata.nodes.map(n=>n.label),b.metadata.nodes.map(n=>n.label));assert.equal(a.metadata.paths.length,2);assert.ok(!a.svg.includes('<image'));});
const argv=process.argv.slice(2),get=k=>argv.includes(k)?argv[argv.indexOf(k)+1]:undefined;
if(get('--playwright')){
 const {chromium}=await import(pathToFileURL(path.resolve(get('--playwright'))).href);
 const browser=await chromium.launch({headless:true,executablePath:get('--browser')});
 const root=path.resolve(get('--output'));await fs.mkdir(root,{recursive:false});const reports=[];
 try{
  for(const task of TASKS)for(const [round,state] of task.states.entries()){
   const nodeIds=new Map(state.nodes.map((s,i)=>[s,'n'+i])),groups=task.style==='终端色域'?[{id:'control',label:'控制平面',role:'control'},{id:'data',label:'数据平面',role:'data'}]:[];
   const scene={title:task.style==='终端色域'?'设备数据平台':'项目资料归档架构',groups,nodes:state.nodes.map(s=>({id:nodeIds.get(s),label:s,kind:s.endsWith('库')?'store':s.endsWith('端')||s.includes('工作台')||s==='运维台'?'client':'service',parent:task.style!=='终端色域'?null:['设备管理','配置服务'].includes(s)?'control':['接入服务','数据处理','时序库','运行日志库'].includes(s)?'data':null})),edges:state.edges.map(([a,b])=>({from:nodeIds.get(a),to:nodeIds.get(b)}))};
   const destination=path.join(root,task.id+'-'+round);
   try{const result=await renderGraph(browser,scene,{style:task.style,composition:task.style==='终端色域'?'planes':'flow'},destination);reports.push({id:task.id,round,passed:true,...result.checks});console.log(JSON.stringify({id:task.id,round,passed:true}));}
   catch(e){reports.push({id:task.id,round,passed:false,error:e.message});console.log(JSON.stringify({id:task.id,round,passed:false,error:e.message}));}
  }
 }finally{await browser.close();}
 await fs.writeFile(path.join(root,'report.json'),JSON.stringify({passed:reports.every(r=>r.passed),reports},null,2)+'\n');
 if(reports.some(r=>!r.passed))process.exitCode=1;
}
