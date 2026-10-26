// Actual browser regression for folder body labels and measured overflow.
// Reuse a runtime: node scripts/test_folder_browser.mjs --playwright <module>
// Optional --browser <executable>, --out <evidence directory>. No downloads.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {loadTheme} from '../skills/musedraw/scripts/musedraw.mjs';
import {render} from '../skills/musedraw/scripts/engine/render.mjs';
import {withSystemFonts,resolveBrowser} from '../skills/musedraw/scripts/engine/environment.mjs';
import {loadPlaywrightInfo,exportScene} from '../skills/musedraw/scripts/engine/export.mjs';
const options={};
for(let i=2;i<process.argv.length;i+=2){
 const flag=process.argv[i];
 if(!['--playwright','--browser','--out'].includes(flag)||!process.argv[i+1])throw Error('Expected --playwright, --browser or --out followed by a value');
 options[flag.slice(2)]=process.argv[i+1];
}
const out=options.out?path.resolve(options.out):fs.mkdtempSync(path.join(os.tmpdir(),'musedraw-folder-'));
fs.mkdirSync(out,{recursive:true});
const {pw}=await loadPlaywrightInfo(options.playwright),found=resolveBrowser(pw,{browser:options.browser});
const browser=await pw.chromium.launch({headless:true,executablePath:found.executablePath});
const report={scope:'Measured folder body labels; no screenshot scoring or remote editor',cases:[]};
try{
 const theme=await loadTheme('journal');
 for(const [name,height,expectOverflow]of [['body-fit',180,false],['short-body',64,true]]){
  const dir=path.join(out,name);fs.mkdirSync(dir,{recursive:true});
  const scene={header:false,footer:false,autoFit:false,size:[600,400],nodes:[{id:'folder',shape:'folder',x:100,y:100,w:360,h:height,label:'正文必须留在分隔线下',size:20,tag:'目录',tagSize:10,sub:'状态需继续核对',subSize:12}],edges:[]};
  const svg=withSystemFonts(render(scene,theme));fs.writeFileSync(path.join(dir,'diagram.svg'),svg);
  const checks=await exportScene({svg,outDir:dir,browser,fontDirs:[],images:false,fontMode:'system'});
  const overflow=checks.warnings.filter(w=>w.type==='text-overflow'&&w.id==='folder');
  assert.equal(overflow.length>0,expectOverflow,JSON.stringify(checks));
  if(!expectOverflow)assert.equal(checks.passed,true,JSON.stringify(checks));
  fs.writeFileSync(path.join(dir,'checks.json'),JSON.stringify(checks,null,2));
  report.cases.push({name,expectedOverflow:expectOverflow,actualOverflow:overflow.length,passed:true});
 }
 report.passed=true;console.log(JSON.stringify(report));
}finally{await browser.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2))}
