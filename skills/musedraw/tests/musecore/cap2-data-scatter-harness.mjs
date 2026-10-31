// Candidate-only wiring: exercise new files without changing the shared runtime.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

export async function cap2DataScatterEditor(input){
 let html=await editorHtml(input),parts=[];
 for(const name of ['models','figures'])parts.push((await fs.readFile(new URL('../../scripts/musecore/cap2-data-scatter-'+name+'.mjs',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,''));
 const anchor='const MuseCore=(()=>{';if(!html.includes(anchor))throw Error('Candidate runtime anchor changed');
 html=html.replace(anchor,parts.join('\n')+'\n'+anchor);
 const registry='...distributionFamilies(helpers),';if(!html.includes(registry))throw Error('Candidate registry anchor changed');
 return html.replace(registry,registry+'...cap2DataScatterFamilies(helpers),');
}
export async function cap2DataScatterRender(input,out){
 const html=await cap2DataScatterEditor(input),{pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{const page=await browser.newPage({viewport:{width:1900,height:1200},deviceScaleFactor:1});await page.route(/^https?:\/\//,r=>r.abort());await page.setContent(html);await page.waitForFunction(()=>window.MUSECORE_READY===true);const result=await page.evaluate(()=>window.MUSECORE_RESULT);if(result.error)throw Error(result.error);if(result.findings.length)throw Error(JSON.stringify(result.findings));const svg=await page.locator('#output svg').evaluate(n=>n.outerHTML);await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'input.json'),JSON.stringify(input,null,2)+'\n');await fs.writeFile(path.join(out,'editor.html'),html);await fs.writeFile(path.join(out,'diagram.svg'),svg);await fs.writeFile(path.join(out,'checks.json'),JSON.stringify({status:'geometry-passed',aestheticApproval:'not-assessed',candidateHarness:true,...result},null,2)+'\n');await page.setContent('<!doctype html><style>body{margin:0}svg{display:block}</style>'+svg);await page.setViewportSize({width:result.geometry.width+32,height:1200});await page.locator('svg').screenshot({path:path.join(out,'diagram.png')});return result;
 }finally{await browser.close()}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [input,out]=process.argv.slice(2);if(!input||!out)throw Error('Usage: cap2-data-scatter-harness.mjs input.json output-directory');
 const result=await cap2DataScatterRender(JSON.parse(await fs.readFile(input,'utf8')),out);console.log(JSON.stringify({status:'geometry-passed',width:result.geometry.width,height:result.geometry.height,candidateHarness:true}));
}
