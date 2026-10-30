#!/usr/bin/env node
// Local executable report compositions. Uses the existing browser runtime.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {loadPlaywrightInfo} from './engine/export.mjs';
import {resolveBrowser} from './engine/environment.mjs';
import {editorialHtml} from './musecore/editorial.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ASSETS=path.resolve(HERE,'../assets/musecore');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeJson=o=>JSON.stringify(o).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');

export async function browserBundle(){
  const parts=[];
  for(const file of ['../../assets/musecore/artwork/leaf-specimens.mjs','svg.mjs','visual-tools.mjs','quantitative.mjs','graphs.mjs','time-windows.mjs','calculation.mjs','state-trace.mjs','teaching-objects.mjs','solid-objects.mjs','office-analysis.mjs','system-models.mjs','math-models.mjs','chemistry-models.mjs','ion-models.mjs','move-models.mjs','escalation-models.mjs','compartment-models.mjs','oscillator-models.mjs','friction-models.mjs','germination-models.mjs','incident-models.mjs','tier-models.mjs','spectrum-models.mjs','lattice-models.mjs','elements-models.mjs','decimals-models.mjs','scheduling-models.mjs','gitops-models.mjs','foodweb-models.mjs','insect-models.mjs','windtunnel-models.mjs','lightsheet-models.mjs','shadowheight-models.mjs','sunshadow-models.mjs','bayes-models.mjs','phylogeny-models.mjs','election-models.mjs','sharding-models.mjs','search-models.mjs','latency-models.mjs','uncertainty-models.mjs','scales-models.mjs','transit-models.mjs','velocity-models.mjs','square-models.mjs','angle-models.mjs','calendar-models.mjs','daytime-models.mjs','pathway-models.mjs','spacing-models.mjs','map-models.mjs','approval-models.mjs','handoff-models.mjs','field-models.mjs','runoff-models.mjs','priority-models.mjs','benefit-models.mjs','circuit-models.mjs','force-models.mjs','equation-models.mjs','quantity-models.mjs','history-models.mjs','loop-models.mjs','workforce-models.mjs','leave-models.mjs','orbit-models.mjs','phase-models.mjs','category-models.mjs','sample-models.mjs','architecture-models.mjs','sequence-models.mjs','responsibility-models.mjs','report-families.mjs','visual-families.mjs','data-visuals.mjs','spatial-families.mjs','comparison-families.mjs','distribution-families.mjs','flow-amounts.mjs','workflow-structures.mjs','office-time.mjs','collaboration.mjs','formula.mjs','states.mjs','deployment.mjs','chalk-figures.mjs','blueprint-figures.mjs','solid-figures.mjs','magnitude.mjs','office-cost.mjs','office-objectives.mjs','office-audits.mjs','reliability-figures.mjs','request-figures.mjs','hash-figures.mjs','math-shapes.mjs','binary-figures.mjs','probability-figures.mjs','priority-figures.mjs','benefit-figures.mjs','circuit-figures.mjs','force-figures.mjs','equation-figures.mjs','quantity-figures.mjs','chemistry-figures.mjs','ion-figures.mjs','move-figures.mjs','escalation-figures.mjs','compartment-figures.mjs','oscillator-figures.mjs','friction-figures.mjs','germination-figures.mjs','incident-figures.mjs','tier-figures.mjs','spectrum-figures.mjs','lattice-figures.mjs','elements-figures.mjs','decimals-figures.mjs','scheduling-figures.mjs','gitops-figures.mjs','foodweb-figures.mjs','insect-figures.mjs','windtunnel-figures.mjs','lightsheet-figures.mjs','shadowheight-figures.mjs','sunshadow-figures.mjs','bayes-figures.mjs','phylogeny-figures.mjs','election-figures.mjs','sharding-figures.mjs','search-figures.mjs','latency-figures.mjs','uncertainty-figures.mjs','scales-figures.mjs','transit-figures.mjs','velocity-figures.mjs','square-figures.mjs','angle-figures.mjs','calendar-figures.mjs','daytime-figures.mjs','pathway-figures.mjs','spacing-figures.mjs','map-figures.mjs','approval-figures.mjs','handoff-figures.mjs','field-figures.mjs','runoff-figures.mjs','history-figures.mjs','loop-figures.mjs','workforce-figures.mjs','leave-figures.mjs','orbit-figures.mjs','phase-figures.mjs','category-figures.mjs','sample-figures.mjs','architecture-figures.mjs','sequence-figures.mjs','responsibility-figures.mjs','backup-figures.mjs','runtime.mjs']){
    const code=await fs.readFile(path.join(HERE,'musecore',file),'utf8');
    parts.push(code.replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,''));
  }
  return parts.join('\n');
}
export async function editorHtml(input){
  if(input?.family==='editorial-page')return editorialHtml(input);
  const code=await browserBundle();
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>MuseCore · 内容与构成</title><style>body{margin:24px;color:#222;background:#f5f5f5;font:15px/1.6 'Microsoft YaHei',sans-serif}header,details,nav,#error{max-width:1000px;margin:16px auto}h1{font-size:24px;margin-bottom:4px}textarea{box-sizing:border-box;width:100%;height:320px;font:14px/1.5 monospace}button{padding:8px 18px;margin:8px 10px 8px 0;cursor:pointer}#output{overflow:auto;background:white;width:fit-content;max-width:100%;margin:24px auto}svg{display:block}#error{white-space:pre-wrap;color:#a02020}a{color:#24528a}@media print{header,details,nav,#error{display:none}body{margin:0;background:white}#output{margin:0}}</style><header><h1>MuseCore · 内容与构成</h1><p>修改内容后生成。文件在本地处理；SVG 保留可编辑的文字与线条。</p></header><details><summary>编辑内容</summary><textarea id="input" spellcheck="false"></textarea></details><nav><button id="generate">生成</button><button id="download">下载 SVG</button></nav><pre id="error"></pre><div id="output"></div><script>(()=>{${code}
const seed=${safeJson(input)};
const field=document.getElementById('input'),output=document.getElementById('output'),error=document.getElementById('error');
field.value=JSON.stringify(seed,null,2);window.MuseCore=MuseCore;
async function generate(){window.MUSECORE_READY=false;window.MUSECORE_RESULT=null;try{const input=JSON.parse(field.value);const svg=MuseCore.render(input);output.replaceChildren(svg);await document.fonts.ready;const result=MuseCore.audit(svg);window.MUSECORE_RESULT=result;error.textContent=result.findings.length?JSON.stringify(result.findings,null,2):'';window.MUSECORE_READY=true}catch(e){output.replaceChildren();error.textContent=e.message;window.MUSECORE_RESULT={error:e.message};window.MUSECORE_READY=true}}
document.getElementById('generate').onclick=generate;
document.getElementById('download').onclick=()=>{if(!output.firstChild)return;const url=URL.createObjectURL(new Blob([output.innerHTML],{type:'image/svg+xml'}));const a=document.createElement('a');a.href=url;a.download='diagram.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
generate();})();</script></html>`;
}
export async function renderContent(input,{out,browser,playwright}={}){
  if(!out)throw Error('Output directory required');
  const html=await editorHtml(input);
  const {pw}=await loadPlaywrightInfo(playwright),instance=await pw.chromium.launch({...resolveBrowser(pw,{browser}),headless:true});
  try{
    const page=await instance.newPage({viewport:{width:1600,height:1200},deviceScaleFactor:2});
    await page.route(/^https?:\/\//,route=>route.abort());
    await page.setContent(html,{waitUntil:'load'});await page.waitForFunction(()=>window.MUSECORE_READY===true);
    const result=await page.evaluate(()=>window.MUSECORE_RESULT);
    if(result.error)throw Error(result.error);
    if(result.findings.length)throw Error('Rendered geometry failed: '+JSON.stringify(result.findings));
    const htmlMedium=input.family==='editorial-page';
    // The editor is scrollable. Export at the artifact's native width so that
    // its overflow container cannot clip the right edge of wide figures.
    if(!htmlMedium)await page.setViewportSize({width:Math.ceil(result.geometry.width)+64,height:1200});
    const svg=htmlMedium?null:await page.locator('#output svg').evaluate(e=>e.outerHTML);
    // Export the artwork outside the editor's scroll container. A screenshot
    // can have the correct dimensions while its rightmost pixels are clipped.
    if(svg){await page.setContent('<!doctype html><meta charset="utf-8"><style>body{margin:0}svg{display:block}</style>'+svg);await page.evaluate(()=>document.fonts.ready)}
    // Validate before touching outputs, so an invalid input cannot replace a
    // previously accepted rendering with a broken one.
    await fs.mkdir(out,{recursive:true});
    await fs.writeFile(path.join(out,'input.json'),JSON.stringify(input,null,2)+'\n');
    if(svg)await fs.writeFile(path.join(out,'diagram.svg'),svg);
    if(htmlMedium)await fs.writeFile(path.join(out,'diagram.html'),html);
    await fs.writeFile(path.join(out,'editor.html'),html);
    await page.locator(htmlMedium?'#work':'svg').screenshot({path:path.join(out,'diagram.png')});
    const checks={status:'geometry-passed',aestheticApproval:'not-assessed',outputs:htmlMedium?['input.json','diagram.html','diagram.png','editor.html']:['input.json','diagram.svg','diagram.png','editor.html'],...result};
    await fs.writeFile(path.join(out,'checks.json'),JSON.stringify(checks,null,2)+'\n');
    return checks;
  }finally{await instance.close()}
}

export async function main(argv=process.argv.slice(2)){
  const [cmd,...args]=argv,pos=[],flags={};
  for(let i=0;i<args.length;i++){const a=args[i];if(a==='--compact'&&cmd==='list'){flags.compact=true;continue}if(a.startsWith('--')){if(!['--out','--browser','--playwright'].includes(a))throw Error('Unknown option '+a);if(!args[i+1]||args[i+1].startsWith('--'))throw Error(a+' requires a value');flags[a.slice(2)]=args[++i]}else pos.push(a)}
  const catalog=JSON.parse(await fs.readFile(path.join(ASSETS,'index.json'),'utf8'));
  if(cmd==='list'){if(pos.length)throw Error('Use list [--compact]');console.log(JSON.stringify(flags.compact?{version:catalog.version,status:catalog.status,examples:catalog.examples.map(e=>({id:e.id,family:e.family,reference:catalog.groups?.find(g=>g.ids.includes(e.family))?.reference}))}:catalog,null,2));return}
  if(cmd==='example'){
    const entry=catalog.examples.find(e=>e.id===pos[0]);if(!entry||pos.length!==1||!flags.out)throw Error('Use example <id> --out <new-input.json>; use list for available examples');
    await fs.mkdir(path.dirname(path.resolve(flags.out)),{recursive:true});await fs.copyFile(path.join(ASSETS,entry.file),path.resolve(flags.out),1);console.log(path.resolve(flags.out));return;
  }
  if(cmd!=='render'||pos.length!==1||!flags.out)throw Error('Usage: musecore.mjs list [--compact] | example <id> --out <new-input.json> | render <input.json> --out <directory> [--playwright MODULE] [--browser EXECUTABLE]');
  const source=await fs.realpath(pos[0]),target=path.resolve(flags.out);
  for(const filename of ['input.json','diagram.svg','diagram.html','diagram.png','editor.html','checks.json']){
    const file=path.join(target,filename);let exists;try{exists=await fs.realpath(file)}catch{}
    if((exists??file).toLowerCase()===source.toLowerCase())throw Error('Output would overwrite source input; choose a different directory');
    try{const a=await fs.stat(source,{bigint:true}),z=await fs.stat(file,{bigint:true});if(a.ino!==0n&&a.dev===z.dev&&a.ino===z.ino)throw Error('Output aliases source input')}catch(e){if(e.code!=='ENOENT')throw e}
  }
  const checks=await renderContent(JSON.parse(await fs.readFile(source,'utf8')),{...flags,out:target});
  console.log(JSON.stringify({family:checks.geometry.family,output:target,status:checks.status},null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1});
