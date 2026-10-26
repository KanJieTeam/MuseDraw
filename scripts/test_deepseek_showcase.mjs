// Real DeepSeek native-SVG generation and three conversation revisions.
// No gallery SVG, screenshot or fixed coordinates are sent to the model.
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractCredentials,requestProvider,chooseModel,runPool,sanitize} from './test_deepseek_styles.mjs';
import {protectedPage,validateSvg,previewDocument,measureLayout} from '../skills/musedraw/scripts/preview.mjs';

const ROOT=path.resolve(import.meta.dirname,'..');
const sha=s=>createHash('sha256').update(s).digest('hex');
const normalized=s=>String(s).replace(/\s/g,'');
export const TASKS=[{
 id:'archive-sketch',style:'手绘线稿',
 prompts:[
  '用 MuseDraw 手绘线稿风格画项目资料归档架构的通用参考图：现场端和审核端提交到资料服务，资料服务写档案库和附件库，审核端还访问审核服务，审核服务读取档案库。',
  '把资料服务改名为资料接入，其他内容与风格不变。',
  '增加归档检索服务，审核端访问它，它读取档案库。其他内容和风格不变。',
  '去掉附件库及资料接入到附件库的线。其他内容与风格不变。'],
 states:[
  {nodes:['现场端','审核端','资料服务','审核服务','档案库','附件库'],edges:[['现场端','资料服务'],['审核端','资料服务'],['资料服务','档案库'],['资料服务','附件库'],['审核端','审核服务'],['审核服务','档案库']]},
  {nodes:['现场端','审核端','资料接入','审核服务','档案库','附件库'],edges:[['现场端','资料接入'],['审核端','资料接入'],['资料接入','档案库'],['资料接入','附件库'],['审核端','审核服务'],['审核服务','档案库']]},
  {nodes:['现场端','审核端','资料接入','审核服务','档案库','附件库','归档检索服务'],edges:[['现场端','资料接入'],['审核端','资料接入'],['资料接入','档案库'],['资料接入','附件库'],['审核端','审核服务'],['审核服务','档案库'],['审核端','归档检索服务'],['归档检索服务','档案库']]},
  {nodes:['现场端','审核端','资料接入','审核服务','档案库','归档检索服务'],edges:[['现场端','资料接入'],['审核端','资料接入'],['资料接入','档案库'],['审核端','审核服务'],['审核服务','档案库'],['审核端','归档检索服务'],['归档检索服务','档案库']]}]
},{
 id:'device-planes',style:'终端色域',
 prompts:[
  '用 MuseDraw 终端色域风格画设备数据平台通用参考图。控制平面有设备管理和配置服务，数据平面有接入服务、数据处理和时序库。运维台访问设备管理，设备管理调用配置服务，配置服务下发配置给接入服务；设备端送数据给接入服务，接入服务调用数据处理，数据处理写入时序库。',
  '把运维台改成运维工作台，其他内容与风格不变。',
  '增加运行日志库，数据处理把日志写入它，放在数据平面里。其他内容和风格不变。',
  '设备端改走新设备网关再到接入服务，其他内容与风格不变。'],
 states:[
  {nodes:['运维台','设备端','设备管理','配置服务','接入服务','数据处理','时序库'],edges:[['运维台','设备管理'],['设备管理','配置服务'],['配置服务','接入服务'],['设备端','接入服务'],['接入服务','数据处理'],['数据处理','时序库']]},
  {nodes:['运维工作台','设备端','设备管理','配置服务','接入服务','数据处理','时序库'],edges:[['运维工作台','设备管理'],['设备管理','配置服务'],['配置服务','接入服务'],['设备端','接入服务'],['接入服务','数据处理'],['数据处理','时序库']]},
  {nodes:['运维工作台','设备端','设备管理','配置服务','接入服务','数据处理','时序库','运行日志库'],edges:[['运维工作台','设备管理'],['设备管理','配置服务'],['配置服务','接入服务'],['设备端','接入服务'],['接入服务','数据处理'],['数据处理','时序库'],['数据处理','运行日志库']]},
  {nodes:['运维工作台','设备端','设备管理','配置服务','接入服务','数据处理','时序库','运行日志库','设备网关'],edges:[['运维工作台','设备管理'],['设备管理','配置服务'],['配置服务','接入服务'],['设备端','设备网关'],['设备网关','接入服务'],['接入服务','数据处理'],['数据处理','时序库'],['数据处理','运行日志库']]}]
}];

export function facts(scene,expected,previous,round,style){
 const failures=[],nodes=scene?.nodes,edges=scene?.edges;
 if(!Array.isArray(nodes)||!Array.isArray(edges)||!Array.isArray(scene.groups))return {passed:false,failures:['scene requires nodes, groups and edges arrays']};
 const labels=nodes.map(n=>normalized(n.label)),gold=expected.nodes.map(normalized);
 if(new Set(nodes.map(n=>n.id)).size!==nodes.length||nodes.some(n=>typeof n.id!=='string'||!n.id))failures.push('node IDs must be unique nonempty strings');
 if(JSON.stringify(labels.toSorted())!==JSON.stringify(gold.toSorted()))failures.push('component inventory differs from the user request: '+JSON.stringify(labels));
 const map=new Map(nodes.map(n=>[n.id,normalized(n.label)]));
 const actual=edges.map(e=>[map.get(e.from),map.get(e.to)].join(' -> ')).toSorted();
 const wanted=expected.edges.map(e=>e.map(normalized).join(' -> ')).toSorted();
 if(JSON.stringify(actual)!==JSON.stringify(wanted))failures.push('directed relationships differ: '+JSON.stringify(actual));
 if(edges.some(e=>(e.direction??'forward')!=='forward'))failures.push('requested directed relationship lost its arrow');
 if(edges.some(e=>!map.has(e.from)||!map.has(e.to)))failures.push('edge endpoint missing');
 if(previous){
  for(const old of previous.edges){
   const next=edges.find(e=>e.from===old.from&&e.to===old.to);
   if(next&&(next.id!==old.id||(next.direction??'forward')!==(old.direction??'forward')||next.label!==old.label))failures.push('unchanged relationship identity or attributes changed: '+old.id);
  }
  for(const old of previous.nodes){
   const name=normalized(old.label);
   if(!gold.includes(name))continue;
   const next=nodes.find(n=>normalized(n.label)===name);
   if(next?.id!==old.id)failures.push('unchanged node ID changed: '+name);
   if(next?.parent!==old.parent)failures.push('unchanged ownership changed: '+name);
  }
  if(round===1){
   const before=previous.nodes.find(n=>['资料服务','运维台'].includes(n.label));
   const after=nodes.find(n=>['资料接入','运维工作台'].includes(n.label));
   if(before&&after&&before.id!==after.id)failures.push('renamed node ID changed');
  }
 }
 if(style==='终端色域'){
  const groups=new Map(scene.groups.map(g=>[g.id,normalized(g.label)]));
  for(const n of nodes){
   const name=normalized(n.label),parent=groups.get(n.parent);
   if(['设备管理','配置服务'].includes(name)&&parent!=='控制平面')failures.push('control ownership wrong: '+name);
   if(['接入服务','数据处理','时序库','运行日志库'].includes(name)&&parent!=='数据平面')failures.push('data ownership wrong: '+name);
  }
 }
 return {passed:!failures.length,failures,nodeCount:nodes.length,edgeCount:edges.length};
}

async function json(file,value){await fs.writeFile(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});}
async function checkArtifact(page,plan,expected,previous,round,style,dir){
 if(typeof plan.svg!=='string'||!plan.scene||Buffer.byteLength(plan.svg)>1024*1024)throw Error('Expected bounded JSON {scene,svg}');
 await fs.writeFile(path.join(dir,'diagram.svg'),plan.svg,{flag:'wx'});
 await json(path.join(dir,'scene.json'),plan.scene);
 const content=facts(plan.scene,expected,previous,round,style);
 const {W,H,svg}=await validateSvg(page,plan.svg);
 await page.setViewportSize({width:Math.ceil(W),height:Math.ceil(H)});
 await page.setContent(previewDocument(svg));await page.evaluate(()=>document.fonts.ready);
 const layout=await measureLayout(page,W,H);
 const geometry=await page.evaluate(()=>{
  const meta=JSON.parse(document.querySelector('#layout-metadata')?.textContent||'null');
  const ids=[...document.querySelectorAll('[id]')].map(el=>el.id);
  const texts=[...document.querySelectorAll('text')].map(el=>{const r=el.getBoundingClientRect();return {id:el.id,text:el.textContent,box:[r.x,r.y,r.width,r.height]}});
  return {meta,ids,texts};
 });
 const failures=[];
 if(!geometry.meta?.nodes?.length||!geometry.meta?.bounds?.length||!Array.isArray(geometry.meta.paths))failures.push('actual SVG requires nodes, paths and nonempty text bounds metadata');
 else{
  const meta=geometry.meta,names=new Map(plan.scene.nodes.map(n=>[n.id,normalized(n.label)]));
  if(JSON.stringify(meta.nodes.map(n=>[n.id,normalized(n.label)]).toSorted())!==JSON.stringify([...names.entries()].toSorted()))failures.push('SVG metadata node inventory differs from the semantic scene');
  if(JSON.stringify(meta.paths.map(e=>[e.from,e.to]).toSorted())!==JSON.stringify(plan.scene.edges.map(e=>[e.from,e.to]).toSorted()))failures.push('SVG metadata relationship endpoints differ from the semantic scene');
  if(geometry.texts.some(t=>!meta.bounds.some(b=>b.id===t.id)))failures.push('some SVG text lacks a declared checking box');
  for(const n of meta.nodes){
   if(!geometry.ids.includes(n.id))failures.push('declared node has no native SVG element: '+n.id);
   if(!Array.isArray(n.box)||n.box.length!==4||n.box.some(v=>!Number.isFinite(v)))failures.push('node needs a finite geometry box: '+n.id);
   if(!geometry.texts.some(t=>normalized(t.text)===normalized(n.label)))failures.push('declared node label is not visible as native text: '+n.label);
  }
  function intersects(a,b,box){
   const [x,y,w,h]=box;
   if(a[0]===b[0])return a[0]>x+2&&a[0]<x+w-2&&Math.max(a[1],b[1])>y+2&&Math.min(a[1],b[1])<y+h-2;
   if(a[1]===b[1])return a[1]>y+2&&a[1]<y+h-2&&Math.max(a[0],b[0])>x+2&&Math.min(a[0],b[0])<x+w-2;
   // Segment versus an inset rectangle, including diagonal edges.
   const dx=b[0]-a[0],dy=b[1]-a[1],p=[-dx,dx,-dy,dy],q=[a[0]-x-2,x+w-2-a[0],a[1]-y-2,y+h-2-a[1]];
   let lo=0,hi=1;
   for(let i=0;i<4;i++){if(p[i]===0){if(q[i]<0)return false;}else{const t=q[i]/p[i];if(p[i]<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return false;}}
   return lo<hi;
  }
  for(const e of meta.paths){
   const element=e.id||e.vectorId;
   if(!element||!geometry.ids.includes(element))failures.push('relation metadata needs the actual SVG path ID');
   if(!Array.isArray(e.points)||e.points.length<2||e.points.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v)))){failures.push('invalid declared route');continue;}
   for(let i=1;i<e.points.length;i++){
    const a=e.points[i-1],b=e.points[i];
    for(const t of geometry.texts)if(intersects(a,b,t.box))failures.push('connector crosses text: '+e.from+' -> '+e.to+' / '+t.text);
    for(const n of meta.nodes)if(![e.from,e.to].includes(n.id)&&intersects(a,b,n.box))failures.push('connector crosses unrelated node: '+n.id);
   }
  }
 }
 await page.screenshot({path:path.join(dir,'diagram.png')});
 await page.setViewportSize({width:1200,height:Math.ceil(H*1200/W)});
 await page.evaluate(({h})=>{const el=document.querySelector('svg');el.style.width='1200px';el.style.height=h+'px'},{h:Math.ceil(H*1200/W)});
 await page.screenshot({path:path.join(dir,'preview-1200.png')});
 const report={content,layout,geometry:{passed:!failures.length,failures},passed:content.passed&&layout.passed===true&&!failures.length,
  visualAcceptance:'pending-human-review',notChecked:['cross-model performance','pixel-perfect style transfer','all SVG path geometry matches its metadata']};
 await json(path.join(dir,'checks.json'),report);return report;
}

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function review(run,summary){
 const cards=summary.results.map(task=>`<section><h2>${esc(task.style)} · ${esc(task.id)}</h2>${task.rounds.map(r=>`<article><h3>${r.round===0?'首次生成':'修改 '+r.round} · ${r.passed?'客观检查通过':'未通过'}</h3><p>${esc(r.prompt)}</p>${r.attempts.map(a=>`<div><p>${a.attempt===0?'原始输出':'模型修复输出'} · ${a.passed?'检查通过':'检查未通过'}</p>${a.rendered?`<a href="${a.directory}/diagram.png"><img src="${a.directory}/preview-1200.png" alt="DeepSeek 实际生成的图"></a>`:''}<p>${esc(a.error||a.failures?.join('；')||'')}</p><a href="${a.directory}/response.json">模型响应</a>${a.rendered?` · <a href="${a.directory}/diagram.svg">SVG</a> · <a href="${a.directory}/checks.json">检查记录</a>`:''}</div>`).join('')}</article>`).join('')}</section>`).join('');
 await fs.writeFile(path.join(run,'index.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MuseDraw · DeepSeek 实测</title><style>body{margin:0;background:#f9f9f7;color:#202b31;font:15px/1.7 Arial,"Noto Sans SC","Microsoft YaHei",sans-serif}main{max-width:1240px;margin:auto;padding:36px 24px}h1{font-size:36px}h2{margin:55px 0 20px;font-size:27px}article{border-top:1px solid #ccd3d0;padding:22px 0}img{width:100%;height:auto;border:1px solid #d8dedb}a{color:#203e54}article div{margin:28px 0}p{max-width:1050px}code{font-family:Consolas,monospace}</style><main><h1>MuseDraw · DeepSeek 实际输出</h1><p>使用 ${esc(summary.model)}。两种表达各首次生成＋三轮修改；未提供成品 SVG 或图库坐标。保留首次失败和模型修复结果，不由人工改图。</p><p>客观检查 ${summary.passedRounds}/${summary.totalRounds}；这是结构与排版检查，不是审美通过。<a href="summary.json">完整结果与用量</a> · <a href="frozen-plan.json">冻结需求与 Skill 哈希</a></p>${cards}</main></html>`);
}

export async function main(argv=process.argv.slice(2)){
 const get=k=>argv.includes(k)?argv[argv.indexOf(k)+1]:undefined;
 if(!argv.includes('--execute'))throw Error('Explicit --execute required for paid model calls');
 for(const k of ['--credentials','--playwright','--browser','--output'])if(!get(k))throw Error(k+' required');
 const run=path.resolve(ROOT,get('--output'));
 if(!run.startsWith(path.join(ROOT,'output')+path.sep))throw Error('Use a new private output directory');
 await fs.mkdir(run,{recursive:false});
 const config=JSON.parse(await fs.readFile(get('--credentials'),'utf8')), {apiKey}=extractCredentials(config);
 const roles=['SKILL.md','references/architecture-views.md','references/visual-decisions.md','references/style-families.md'];
 if(get('--extra-guide'))roles.push(get('--extra-guide'));
 const sources=[];let rules='';
 for(const relative of roles){const file=path.join(ROOT,'skills/musedraw',relative),source=await fs.readFile(file,'utf8');sources.push({path:'skills/musedraw/'+relative,sha256:sha(source)});rules+=`\n--- ${relative} ---\n${source}\n`;}
 const system=`你是执行 MuseDraw Skill 的绘图智能体。读取下列实际 Skill 与相关设计指南，按用户短需求完成原生 SVG。不要调用旧的固定卡片渲染器，也没有可复制的图库 SVG。只保留用户明确给出的组件和方向；不凭空增加协议、厂商、实例、性能或额外业务模块。风格由用户选择，你自行决定构图和几何。\n${rules}\n执行宿主支持安全原生 SVG 并自动渲染检查，不能执行你的程序代码。请输出一个 JSON 对象 {"scene":{"title":"图标题","groups":[{"id":"group-id","label":"分组名"}],"nodes":[{"id":"稳定ID","label":"用户组件原名","kind":"service或store或client","parent":"group-id或null"}],"edges":[{"from":"node-id","to":"node-id"}]},"svg":"完整原生SVG字符串"}，无代码围栏。每条请求给出的关系都必须绘制，不多不少。修改保持原有节点 ID；只改名称不改变其他组件或关系。\nSVG 有标准命名空间、数字 width/height、零起点 viewBox，只用本地原生文字和几何；不要 script、foreignObject、外部图片字体或网络资源。每个 text 有唯一 ID。用 Noto Sans SC 作为中文字体回退，不把中文写成逐字竖排。图内仅有真实内容、图标题和小 MuseDraw 标记。\n必须有 metadata id="layout-metadata"，文本是 JSON（正确 XML 转义），包括 nodes:[{id,label,parent,box:[x,y,w,h]}]、groups:[{id,title,box:[x,y,w,h]}]、paths:[{id,from,to,points:[[x,y],...],direction:"forward"}] 和 bounds:[{id:"实际text的ID",box:[x,y,w,h]}]。nodes 对应有同 ID 的可见原生元素；paths 的 id 对应实际连线路径。metadata 与实际图形一致，所有 text 的 bounds 应代表真实文字区而不是整张画布；文字区留至少左右4px上下3px余量。元数据不决定风格，不算用户提示。请为字和线预留空间，不要线穿文字或无关节点。完整输出不超过8192tokens。`;
 await json(path.join(run,'frozen-plan.json'),{date:'2026-10-14',provider:'deepseek',tasks:TASKS,sources,maxCompletionTokens:8192,maxCompletionRequests:16,repairLimitPerRound:1,concurrency:2,sampleSourcesSupplied:false,evaluation:'native SVG generation, not a full client integration or aesthetic certification',harnessSha256:sha(await fs.readFile(import.meta.filename)),gitHead:execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),workingTreeSkillHashesRecorded:true});
 const discovery=await requestProvider({url:'https://api.deepseek.com/models',apiKey,execute:true,archive:r=>json(path.join(run,`discovery-${r.attempt}.json`),r)});
 const advertised=chooseModel(discovery.raw,get('--model'));await json(path.join(run,'model.json'),advertised);
 const {chromium}=await import(pathToFileURL(path.resolve(get('--playwright'))).href);
 const browser=await chromium.launch({headless:true,executablePath:get('--browser')});
 let results;
 try{results=await runPool(TASKS,2,async task=>{
  const page=await protectedPage(browser),messages=[{role:'system',content:system}],record={id:task.id,style:task.style,rounds:[]};let previous=null;
  for(let round=0;round<task.prompts.length;round++){
   messages.push({role:'user',content:task.prompts[round]});const r={round,prompt:task.prompts[round],attempts:[],passed:false};
   for(let attempt=0;attempt<2;attempt++){
    const relative=`${task.id}/round-${round}/attempt-${attempt}`,dir=path.join(run,relative);await fs.mkdir(dir,{recursive:true});
    const request={model:advertised.model,messages:[...messages],temperature:0,thinking:{type:'disabled'},max_tokens:8192,response_format:{type:'json_object'},stream:false};
    await json(path.join(dir,'request.json'),request);
    const a={attempt,directory:relative,passed:false,rendered:false};
    try{
     const response=await requestProvider({url:'https://api.deepseek.com/chat/completions',apiKey,body:request,execute:true,timeoutMs:180000,archive:x=>json(path.join(dir,`transport-${x.attempt}.json`),x)});
     const raw=JSON.parse(response.raw);a.usage=raw.usage;a.model=raw.model;a.responseId=raw.id;await json(path.join(dir,'response.json'),raw);
     if(raw.choices?.[0]?.finish_reason==='length')throw Error('Model completion exceeded configured token budget');
     const content=raw.choices?.[0]?.message?.content;if(typeof content!=='string')throw Error('Model response has no content');
     const plan=JSON.parse(content);messages.push({role:'assistant',content});
     const checked=await checkArtifact(page,plan,task.states[round],previous,round,task.style,dir);a.rendered=true;a.passed=checked.passed;a.failures=[...checked.content.failures,...checked.geometry.failures,...(checked.layout.passed===true?[]:['text layout needs correction: '+JSON.stringify(checked.layout)])];
     if(checked.passed){previous=plan.scene;r.passed=true;}
    }catch(error){a.error=sanitize(error.message,apiKey);try{await fs.access(path.join(dir,'diagram.png'));a.rendered=true;}catch{}}
    r.attempts.push(a);await json(path.join(dir,'result.json'),a);console.log(JSON.stringify({id:task.id,round,attempt,passed:a.passed,rendered:a.rendered,error:a.error||a.failures,usage:a.usage}));
    if(r.passed)break;
    if(attempt===0)messages.push({role:'user',content:'宿主检查发现以下客观错误。只修复这些错误，不改变已明确的组件、归属、关系与用户选定风格，仍输出完整 scene 与 SVG JSON：'+JSON.stringify(a.error||a.failures)});
   }
   record.rounds.push(r);await json(path.join(run,`${task.id}-round-${round}.json`),r);
   if(!r.passed){record.stopped='Failed round retained; later revisions not called on an invalid state.';break;}
  }
  await page.close();return record;
 });}finally{await browser.close();}
 const rounds=results.flatMap(r=>r.rounds),attempts=rounds.flatMap(r=>r.attempts),totals={prompt_tokens:0,completion_tokens:0,total_tokens:0};
 for(const a of attempts)for(const key of Object.keys(totals))totals[key]+=a.usage?.[key]||0;
 const summary={date:'2026-10-14',provider:'deepseek',model:advertised.model,plannedRounds:8,totalRounds:rounds.length,passedRounds:rounds.filter(r=>r.passed).length,firstAttemptPassed:rounds.filter(r=>r.attempts[0].passed).length,measuredCompletionResponses:attempts.filter(a=>a.responseId).length,usage:totals,results,visualAcceptance:'pending',crossModelTested:false};
 await json(path.join(run,'summary.json'),summary);await review(run,summary);console.log(JSON.stringify({run:path.relative(ROOT,run),model:summary.model,rounds:summary.totalRounds,passed:summary.passedRounds,calls:summary.measuredCompletionResponses,usage:totals}));
 if(summary.passedRounds!==8)process.exitCode=1;
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await main().catch(e=>{console.error(e.message);process.exitCode=1});
