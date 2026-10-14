// Actual model tool calls -> installed semantic graph renderer -> conversation edits.
// Expected inventories remain in the evaluator and are not sent to the model.
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractCredentials,requestProvider,chooseModel,runPool,sanitize} from './test_deepseek_styles.mjs';
import {TASKS,facts} from './test_deepseek_showcase.mjs';
import {normalizeGraph,applyOperations,graphStyle,renderGraph} from '../skills/musedraw/scripts/render_graph.mjs';

const ROOT=path.resolve(import.meta.dirname,'..'),hash=s=>createHash('sha256').update(s).digest('hex');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const idSchema={type:'string',pattern:'^[A-Za-z][A-Za-z0-9_-]{0,63}$'};
const textSchema={type:'string',minLength:1,maxLength:160};
const nodeSchema={type:'object',additionalProperties:false,properties:{id:idSchema,label:textSchema,kind:{type:'string',enum:['service','store','client','queue']},parent:{type:['string','null']},focus:{type:'boolean'}},required:['id','label','kind']};
const edgeSchema={type:'object',additionalProperties:false,properties:{id:idSchema,from:idSchema,to:idSchema,label:textSchema,direction:{type:'string',enum:['forward','none']}},required:['from','to']};
export const TOOLS=[{
 type:'function',function:{name:'create_graph',description:'Draw a new architecture from semantic components, actual relationships and a visual composition. The installed MuseDraw package handles geometry and validation.',parameters:{type:'object',additionalProperties:false,properties:{scene:{type:'object',additionalProperties:false,properties:{title:textSchema,groups:{type:'array',maxItems:12,items:{type:'object',additionalProperties:false,properties:{id:idSchema,label:textSchema,role:{type:'string',enum:['control','data','domain']}},required:['id','label']}},nodes:{type:'array',minItems:1,maxItems:80,items:nodeSchema},edges:{type:'array',maxItems:160,items:edgeSchema}},required:['title','groups','nodes','edges']},presentation:{type:'object',additionalProperties:false,properties:{style:{type:'string',enum:['手绘线稿','终端色域']},composition:{type:'string',enum:['flow','planes']}},required:['style','composition']}},required:['scene','presentation']}}
},{
 type:'function',function:{name:'edit_graph',description:'Apply atomic edits to the current graph; unrelated objects and presentation are preserved by the host.',parameters:{type:'object',additionalProperties:false,properties:{operations:{type:'array',minItems:1,maxItems:30,items:{type:'object',properties:{op:{type:'string',enum:['rename_node','add_node','remove_node','add_edge','remove_edge']},id:idSchema,label:textSchema,node:nodeSchema,edge:edgeSchema},required:['op']}}},required:['operations']}}
}];
const HOLDOUTS=[{
 id:'appointment-holdout',style:'手绘线稿',prompts:['用 MuseDraw 手绘线稿画医院预约系统的通用参考图：患者门户访问预约服务，预约服务查询排班库并写预约库，还调用通知服务；通知服务读取预约库。'],
 states:[{nodes:['患者门户','预约服务','排班库','预约库','通知服务'],edges:[['患者门户','预约服务'],['预约服务','排班库'],['预约服务','预约库'],['预约服务','通知服务'],['通知服务','预约库']]}]
},{
 id:'publishing-holdout',style:'终端色域',prompts:['用 MuseDraw 终端色域画内容发布系统的通用参考图：控制平面有发布审核和发布配置，处理平面有构建服务和内容库。编辑台提交到发布审核，发布审核调用发布配置，发布配置触发构建服务，构建服务写内容库。'],
 states:[{nodes:['编辑台','发布审核','发布配置','构建服务','内容库'],edges:[['编辑台','发布审核'],['发布审核','发布配置'],['发布配置','构建服务'],['构建服务','内容库']]}],
 ownership:{'发布审核':'控制平面','发布配置':'控制平面','构建服务':'处理平面','内容库':'处理平面'}
}];
async function save(file,data){await fs.writeFile(file,JSON.stringify(data,null,2)+'\n',{flag:'wx'});}
export function checkPlan(task,round,scene,previous){
 // The holdout uses different group labels, not the device fixture's fixed names.
 const checked=facts(scene,task.states[round],previous,round,task.ownership?'custom':task.style);
 if(task.ownership){const groups=new Map(scene.groups.map(g=>[g.id,g.label]));for(const n of scene.nodes)if(task.ownership[n.label]&&groups.get(n.parent)!==task.ownership[n.label])checked.failures.push('ownership differs: '+n.label);checked.passed=!checked.failures.length;}
 return checked;
}
export function executeCall(name,args,current){
 if(!args||typeof args!=='object'||Array.isArray(args))throw Error('Tool input must be an object');
 if(name==='create_graph'){
  if(current)throw Error('Existing document must be edited, not recreated');
  if(Object.keys(args).some(k=>!['scene','presentation'].includes(k)))throw Error('Unknown create field');
  return {scene:normalizeGraph(args.scene),presentation:args.presentation};
 }
 if(name==='edit_graph'){
  if(!current)throw Error('No current document');
  if(Object.keys(args).some(k=>k!=='operations'))throw Error('Unknown edit field');
  return {...current,scene:applyOperations(current.scene,args.operations)};
 }
 throw Error('Tool not allowed');
}

async function review(run,summary){
 const sections=summary.results.map(task=>`<section><h2>${esc(task.style)} · ${esc(task.id)}</h2>${task.rounds.map(r=>`<article><h3>${r.round===0?'首次绘图':'修改 '+r.round} · ${r.passed?'检查通过':'未通过'}</h3><p>${esc(r.prompt)}</p>${r.attempts.map(a=>`<p>${a.attempt?'模型修正':'首次输出'} · ${a.passed?'通过':'失败'}${a.error?' · '+esc(a.error):''}</p>${a.rendered?`<a href="${a.directory}/render/diagram.png"><img src="${a.directory}/render/preview-1200.png" alt="DeepSeek 调用 MuseDraw 生成的图"></a><p><a href="${a.directory}/render/diagram.svg">SVG</a> · <a href="${a.directory}/render/content.json">内容</a> · <a href="${a.directory}/result.json">检查与用量</a></p>`:''}`).join('')}</article>`).join('')}</section>`).join('');
 await fs.writeFile(path.join(run,'index.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MuseDraw · 模型调用实测</title><style>body{margin:0;background:#fafaf8;color:#182b25;font:15px/1.7 Arial,"Noto Sans SC","Microsoft YaHei",sans-serif}main{max-width:1260px;margin:auto;padding:40px 24px}h1{font-size:36px}h2{margin-top:56px;font-size:26px}article{border-top:1px solid #d5dcd7;padding:20px 0}img{display:block;width:100%;height:auto;border:1px solid #dae0dc}a{color:#254a68}p{max-width:1050px}</style><main><h1>MuseDraw · DeepSeek 工具调用</h1><p>模型理解需求，MuseDraw 执行绘图和修改。这里展示真实输出，没有事后人工改图。</p><p>模型：${esc(summary.model)}；完成 ${summary.passedRounds}/${summary.plannedRounds} 个状态，首次检查通过 ${summary.firstAttemptPassed}/${summary.plannedRounds}。<a href="summary.json">完整记录</a> · <a href="frozen-plan.json">冻结需求与代码哈希</a></p><p>结构、排版和路由检查通过不等于设计验收。第三张交易图已退出候选，不在此页凑数。</p>${sections}</main></html>`);
}

export async function main(argv=process.argv.slice(2)){
 const get=k=>argv.includes(k)?argv[argv.indexOf(k)+1]:undefined;if(!argv.includes('--execute'))throw Error('Explicit --execute required');
 for(const k of ['--credentials','--output','--playwright','--browser'])if(!get(k))throw Error(k+' required');
 const tasks=argv.includes('--holdout-only')?HOLDOUTS:TASKS;
 const run=path.resolve(ROOT,get('--output'));if(!run.startsWith(path.join(ROOT,'output')+path.sep))throw Error('Use a new private output directory');await fs.mkdir(run,{recursive:false});
 const {apiKey}=extractCredentials(JSON.parse(await fs.readFile(get('--credentials'),'utf8')));
 const files=['skills/musedraw/SKILL.md','skills/musedraw/references/graph-workflow.md','skills/musedraw/references/graph-styles.json','skills/musedraw/scripts/render_graph.mjs','skills/musedraw/scripts/route_edges.mjs','skills/musedraw/scripts/preview.mjs'];
 const sources=[];let instructions='';for(const file of files){const source=await fs.readFile(path.join(ROOT,file),'utf8');sources.push({path:file,sha256:hash(source)});if(file.endsWith('SKILL.md')||file.endsWith('graph-workflow.md'))instructions+=`\n--- ${file} ---\n${source}\n`;}
 for(const file of ['scripts/test_deepseek_graph.mjs','scripts/test_deepseek_showcase.mjs','scripts/test_deepseek_styles.mjs'])sources.push({path:file,sha256:hash(await fs.readFile(path.join(ROOT,file)))});
 const system=`执行实际安装版 MuseDraw 的语义图工作流。读取以下 Skill 和图工作流。你负责理解用户自然需求，使用 create_graph 绘制新图，使用 edit_graph 修改当前图。不要写 SVG、坐标、颜色或程序，不从任何图库继承业务内容。仅使用用户指定的组件原名和有方向的关系，不加厂商、性能、协议、实例。保留已有节点、归属、关系的身份；只改名使用 rename_node，不创建整张新图。\n${instructions}\n运行 host 会检查事实和实际图形，返回规范化的当前文档；工具报错时只修正错误，不通过删掉事实来通过检查。每次响应调用一次指定工具。终端色域使用亮色画布的角色色域，不是暗色主题。控制和数据 role 必须从用户材料确定。没有明确归属时，groups 可以为空、parent 为 null，采用 flow。不得向用户询问坐标、色值、案例编号。`;
 await save(path.join(run,'frozen-plan.json'),{date:'2026-10-14',provider:'deepseek',tasks,sources,method:'real-function-calls-plus-installed-renderer',sampleImagesOrSvgSupplied:false,maxTokens:4096,maxCalls:tasks.reduce((n,t)=>n+t.prompts.length*2,0),repairLimitPerRound:1,gitHead:execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),harnessSha256:hash(await fs.readFile(import.meta.filename))});
 const discovery=await requestProvider({url:'https://api.deepseek.com/models',apiKey,execute:true,archive:r=>save(path.join(run,'discovery-'+r.attempt+'.json'),r)}),advertised=chooseModel(discovery.raw,get('--model'));await save(path.join(run,'model.json'),advertised);
 const {chromium}=await import(pathToFileURL(path.resolve(get('--playwright'))).href),browser=await chromium.launch({headless:true,executablePath:get('--browser')});let results;
 try{results=await runPool(tasks,2,async task=>{
  const record={id:task.id,style:task.style,rounds:[]},messages=[{role:'system',content:system}];let current=null;
  for(let round=0;round<task.prompts.length;round++){
   messages.push({role:'user',content:task.prompts[round]});const r={round,prompt:task.prompts[round],attempts:[],passed:false};
   for(let attempt=0;attempt<2;attempt++){
    const relative=task.id+`/round-${round}/attempt-${attempt}`,dir=path.join(run,relative);await fs.mkdir(dir,{recursive:true});
    const request={model:advertised.model,messages:[...messages],tools:TOOLS,tool_choice:{type:'function',function:{name:round===0?'create_graph':'edit_graph'}},temperature:0,thinking:{type:'disabled'},max_tokens:4096,stream:false};await save(path.join(dir,'request.json'),request);
    const a={attempt,directory:relative,passed:false,rendered:false};let toolCall;
    try{
     const response=await requestProvider({url:'https://api.deepseek.com/chat/completions',apiKey,body:request,execute:true,timeoutMs:120000,archive:x=>save(path.join(dir,'transport-'+x.attempt+'.json'),x)}),raw=JSON.parse(response.raw);await save(path.join(dir,'response.json'),raw);a.usage=raw.usage;a.responseId=raw.id;a.model=raw.model;
     const message=raw.choices?.[0]?.message;if(!message||raw.choices[0].finish_reason==='length')throw Error('Missing or truncated response');
     if(!Array.isArray(message.tool_calls)||message.tool_calls.length!==1)throw Error('Expected exactly one model tool call');
     toolCall=message.tool_calls[0];messages.push({role:'assistant',content:message.content??null,tool_calls:message.tool_calls,...(message.reasoning_content?{reasoning_content:message.reasoning_content}:{})});a.toolName=toolCall.function.name;
     const tentative=executeCall(toolCall.function.name,JSON.parse(toolCall.function.arguments),current);const chosen=await graphStyle(tentative.presentation.style),expectedStyle=await graphStyle(task.style);if(chosen.id!==expectedStyle.id)throw Error('User style changed');
     a.contentChecks=checkPlan(task,round,tentative.scene,current?.scene);if(!a.contentChecks.passed)throw Error('Semantic checks: '+a.contentChecks.failures.join('; '));
     const render=await renderGraph(browser,tentative.scene,tentative.presentation,path.join(dir,'render'));a.rendered=true;a.layoutChecks=render.checks;a.passed=true;r.passed=true;current={scene:render.scene,presentation:tentative.presentation};
     const result={ok:true,content:current.scene,presentation:current.presentation,checks:render.checks,artifacts:{svg:relative+'/render/diagram.svg',png:relative+'/render/diagram.png'}};await save(path.join(dir,'tool-result.json'),result);messages.push({role:'tool',tool_call_id:toolCall.id,content:JSON.stringify(result)});
    }catch(error){a.error=sanitize(error.message,apiKey);if(toolCall){const result={ok:false,error:a.error,currentDocument:current};await save(path.join(dir,'tool-result.json'),result);messages.push({role:'tool',tool_call_id:toolCall.id,content:JSON.stringify(result)});}else messages.push({role:'user',content:'返回格式错误：'+a.error});try{await fs.access(path.join(dir,'render/diagram.png'));a.rendered=true;}catch{}}
    r.attempts.push(a);await save(path.join(dir,'result.json'),a);console.log(JSON.stringify({id:task.id,round,attempt,passed:a.passed,tool:a.toolName,error:a.error,usage:a.usage}));if(r.passed)break;
   }
   record.rounds.push(r);await save(path.join(run,task.id+'-round-'+round+'.json'),r);if(!r.passed){record.stopped='Invalid document retained; later revisions not called';break;}
  }return record;
 });}finally{await browser.close();}
 const rounds=results.flatMap(r=>r.rounds),attempts=rounds.flatMap(r=>r.attempts),usage={prompt_tokens:0,completion_tokens:0,total_tokens:0};for(const a of attempts)for(const k of Object.keys(usage))usage[k]+=a.usage?.[k]||0;
 const summary={date:'2026-10-14',provider:'deepseek',model:advertised.model,plannedRounds:tasks.reduce((n,t)=>n+t.prompts.length,0),completedRounds:rounds.length,passedRounds:rounds.filter(r=>r.passed).length,firstAttemptPassed:rounds.filter(r=>r.attempts[0].passed).length,measuredCalls:attempts.filter(a=>a.responseId).length,usage,results,visualAcceptance:'pending',otherModelsTested:false};
 await save(path.join(run,'summary.json'),summary);await review(run,summary);console.log(JSON.stringify({run:path.relative(ROOT,run),passed:summary.passedRounds,planned:summary.plannedRounds,calls:summary.measuredCalls,usage}));if(summary.passedRounds!==summary.plannedRounds)process.exitCode=1;
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await main().catch(e=>{console.error(e.message);process.exitCode=1});
