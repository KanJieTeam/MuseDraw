#!/usr/bin/env node
// Additive development CLI. Shared MuseCore entrypoints are intentionally untouched.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {editorHtml} from './musecore.mjs';
import {loadPlaywrightInfo} from './engine/export.mjs';
import {resolveBrowser} from './engine/environment.mjs';
import {cap2ValueIterationModel} from './musecore/cap2-value-iteration-models.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
export async function cap2RenderValueIteration(input,{out,browser,playwright}={}){
 cap2ValueIterationModel(input);if(!out)throw Error('Output directory required');
 let html=await editorHtml(input),extra='';
 for(const [file,marker] of [['cap2-value-iteration-models.mjs','function cap2ValueIterationModel('],['cap2-value-iteration-figures.mjs','function cap2ValueIterationFamilies(']])if(!html.includes(marker))extra+=(await fs.readFile(path.join(here,'musecore',file),'utf8')).replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'')+'\n';
 if(!html.includes('const families={lanes,schedule,'))throw Error('Shared runtime registry changed; review integration before rendering');
 if(!html.includes('...cap2ValueIterationFamilies('))html=html.replace('const families={lanes,schedule,','const families={lanes,schedule,...cap2ValueIterationFamilies(),');
 html=html.replace('<script>(()=>{','<script>(()=>{'+extra+'\n');
 const {pw}=await loadPlaywrightInfo(playwright),instance=await pw.chromium.launch({...resolveBrowser(pw,{browser}),headless:true});
 try{
  const page=await instance.newPage({viewport:{width:1600,height:1200},deviceScaleFactor:2});await page.route(/^https?:\/\//,route=>route.abort());
  await page.setContent(html,{waitUntil:'load'});await page.waitForFunction(()=>window.MUSECORE_READY===true);const result=await page.evaluate(()=>window.MUSECORE_RESULT);
  if(result.error)throw Error(result.error);if(result.findings.length)throw Error('Rendered geometry failed: '+JSON.stringify(result.findings));
  const svg=await page.locator('#output svg').evaluate(e=>e.outerHTML);await page.setViewportSize({width:Math.ceil(result.geometry.width)+64,height:1200});
  await page.setContent('<!doctype html><meta charset="utf-8"><style>body{margin:0}svg{display:block}</style>'+svg);await page.evaluate(()=>document.fonts.ready);
  await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'input.json'),JSON.stringify(input,null,2)+'\n');await fs.writeFile(path.join(out,'diagram.svg'),svg);await fs.writeFile(path.join(out,'editor.html'),html);await page.locator('svg').screenshot({path:path.join(out,'diagram.png')});
  const checks={status:'geometry-passed',aestheticApproval:'not-assessed',...result};await fs.writeFile(path.join(out,'checks.json'),JSON.stringify(checks,null,2)+'\n');return checks;
 }finally{await instance.close()}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [file,...rest]=process.argv.slice(2),options={};
 for(let i=0;i<rest.length;i+=2){if(!['--out','--browser','--playwright'].includes(rest[i])||!rest[i+1])throw Error('Usage: cap2-value-iteration.mjs input.json --out directory [--browser executable] [--playwright module]');options[rest[i].slice(2)]=rest[i+1]}
 try{if(!file)throw Error('Input required');const source=await fs.realpath(file),target=path.resolve(options.out??'');for(const name of ['input.json','diagram.svg','diagram.png','editor.html','checks.json']){let dest=path.join(target,name);try{dest=await fs.realpath(dest)}catch{}if(source.toLowerCase()===dest.toLowerCase())throw Error('Output would overwrite source input')};const result=await cap2RenderValueIteration(JSON.parse(await fs.readFile(source,'utf8')),options);console.log(JSON.stringify({family:result.geometry.family,out:options.out,status:result.status}))}catch(error){console.error(error.message);process.exitCode=1}
}
