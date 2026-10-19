// Real browser regression for nearest semantic text ownership in native modules.
// Uses existing runtime only; no PNG/native export or editor interaction needed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {render} from '../skills/musedraw/scripts/engine/render.mjs';
import {loadTheme} from '../skills/musedraw/scripts/musedraw.mjs';
import {resolveBrowser,withSystemFonts} from '../skills/musedraw/scripts/engine/environment.mjs';
import {loadPlaywrightInfo,exportScene} from '../skills/musedraw/scripts/engine/export.mjs';

const options={out:'output/text-owner-browser',svgs:[]};
for(let i=2;i<process.argv.length;i++){
  const flag=process.argv[i];
  if(flag==='--help'){console.log('node scripts/test_text_owner_browser.mjs [--out directory] [--svg existing.svg ...]');process.exit(0);}
  if(!['--out','--svg'].includes(flag)||!process.argv[i+1])throw Error(`Invalid option ${flag}`);
  const value=process.argv[++i];if(flag==='--out')options.out=value;else options.svgs.push(value);
}
const out=path.resolve(options.out);fs.mkdirSync(out,{recursive:true});
const theme=await loadTheme('journal'),{pw}=await loadPlaywrightInfo(),found=resolveBrowser(pw);
const browser=await pw.chromium.launch({executablePath:found.executablePath,headless:true});
const report={scope:'Real browser text ownership and genuine overlap checks; no images or draw.io emitted',cases:[]};
const base={theme:'journal',size:[600,400],header:false,footer:false,autoFit:false};
const child=(id,module)=>({id,nativeModule:module,label:id,x:80,y:120,w:140,h:50,size:20,overlap:true});
const direct=(y=80)=>({id:'direct',nativeModule:'m',x:150,y,text:'Direct',size:20,anchor:'middle'});
const cases=[
  ['module-label-and-child-clear',{...base,nativeModules:[{id:'m'}],nodes:[child('Child','m')],texts:[direct()]},0],
  ['module-direct-label-overlaps-child',{...base,nativeModules:[{id:'m'}],nodes:[child('Child','m')],texts:[direct(151.4)]},1],
  ['siblings-overlap',{...base,nativeModules:[{id:'m'}],nodes:[child('First','m'),child('Second','m')]},1],
  ['different-module-children-overlap',{...base,nativeModules:[{id:'m'},{id:'other'}],nodes:[child('First','m'),child('Second','other')]},1],
  ['grouped-scientific-object',{...base,blocks:[{type:'object-views',id:'states',x:50,y:50,w:500,h:260,headingH:0,
    entities:[{id:'object',label:'Shared object',extent:[.65,.65],scientific:{kind:'graph',points:[{id:'A',x:.2,y:.3,labelPos:'none'},{id:'B',x:.8,y:.6,labelPos:'none'}],links:[{from:'A',to:'B'}]}}],
    views:[{id:'only',items:[{entity:'object',at:[.5,.5]}]}]}]},0]
];
async function check(name,svg,expected){
  const dir=path.join(out,name);fs.mkdirSync(dir,{recursive:true});
  const checks=await exportScene({svg,outDir:dir,browser,fontDirs:[],fontMode:'system',images:false,drawio:false});
  fs.writeFileSync(path.join(dir,'checks.json'),JSON.stringify(checks,null,2)+'\n');
  const collisions=checks.warnings.filter(w=>w.type==='text-collision');
  assert.equal(collisions.length,expected,`${name}: ${JSON.stringify(checks.warnings)}`);
  assert.ok(collisions.every(w=>w.a!==w.b),`${name} must never collide a text with itself`);
  if(expected===0)assert.equal(checks.passed,true,JSON.stringify(checks));
  if(name==='module-direct-label-overlaps-child')assert.ok(collisions.some(w=>w.a.startsWith('scientific-m:')&&w.b.startsWith('Child:')||w.b.startsWith('scientific-m:')&&w.a.startsWith('Child:')));
  report.cases.push({name,expectedCollisions:expected,warnings:checks.warnings,passed:true});
}
try{
  for(const[name,scene,expected]of cases)await check(name,withSystemFonts(render(scene,theme)),expected);
  for(const[i,file]of options.svgs.entries())await check('existing-svg-'+i,fs.readFileSync(file,'utf8'),0);
  report.passed=true;console.log(JSON.stringify(report,null,2));
}finally{await browser.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');}
