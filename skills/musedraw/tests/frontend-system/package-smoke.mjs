// Prove this feature runs from a copied installed Skill, with no repository root.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

const skill=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const args=process.argv.slice(2),option=key=>args.includes(key)?args[args.indexOf(key)+1]:undefined;
assert.ok(option('--out'),'Use --out NEW_DIRECTORY [--playwright EXISTING_MODULE --browser EXISTING_CHROME]');
const out=path.resolve(option('--out'));
try{await fs.lstat(out);throw Error('Output exists; choose a new directory to preserve evidence.');}catch(e){if(e.code!=='ENOENT')throw e;}
const relation=path.relative(skill,out);assert.ok(relation.startsWith('..'+path.sep)||relation==='..'||path.isAbsolute(relation),'Copy destination must be outside the installed Skill');
await fs.mkdir(out,{recursive:true});
const installed=path.join(out,'installed skill'),cwd=path.join(out,'unrelated working directory');
await fs.mkdir(cwd);
// Copy the complete distributable Skill tree. Local output/runtime is excluded;
// the CLI uses only Node builtins plus relative files in this installed copy.
await fs.cp(skill,installed,{recursive:true,filter:source=>{const r=path.relative(skill,source);return r!=='output'&&!r.startsWith('output'+path.sep);}});
const cli=path.join(installed,'scripts/frontend-system.mjs');
const report={scope:'Installed-package execution/path smoke; not a new aesthetic judgment',copiedPackage:'installed skill',cwd:'unrelated working directory',excluded:['output'],commands:[],browserChecks:[],failures:[]};
function command(argv){const result=spawnSync(process.execPath,[cli,...argv],{cwd,encoding:'utf8',timeout:30000,env:{...process.env,NODE_PATH:''}});assert.equal(result.status,0,result.stderr||result.stdout);const parsed=JSON.parse(result.stdout);report.commands.push({argv,result:parsed});return parsed;}
try{
  const list=command(['list']);assert.deepEqual(Object.keys(list.systems),['specimen','signal']);
  for(const [system,name]of[['specimen','tidemark'],['signal','night-signal']]){
    const input=path.relative(cwd,path.join(installed,'assets/frontend-system/examples',name+'.json'));
    const built=command(['build','--input',input,'--out',`generated/${system}`]);assert.equal(built.system,system);assert.equal(built.derived.count,5);
    assert.deepEqual(await fs.readFile(path.join(cwd,'generated',system,'source.json')),await fs.readFile(path.resolve(cwd,input)));
    const kit=command(['install','--system',system,'--out',`integration/${system}`]);assert.equal(kit.system,system);
    assert.deepEqual((await fs.readdir(path.join(cwd,'integration',system))).sort(),['README.txt','base.css','browser.mjs','model.mjs',system+'.css']);
  }
  // Loading the copied native ES module also resolves its sibling model locally.
  const native=await import(pathToFileURL(path.join(cwd,'integration/specimen/browser.mjs')).href);assert.equal(typeof native.mountFrontendSystem,'function');
  if(option('--playwright')||option('--browser')){
    assert.ok(option('--playwright')&&option('--browser'),'Provide both existing browser/runtime paths');
    const {chromium}=await import(pathToFileURL(path.resolve(option('--playwright'))).href);
    const browser=await chromium.launch({headless:true,executablePath:path.resolve(option('--browser'))});
    let server;
    try{
      for(const system of ['specimen','signal']){
        const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
        await page.goto(pathToFileURL(path.join(cwd,'generated',system,'index.html')).href);assert.equal(await page.locator('[data-item]').count(),5);assert.deepEqual(errors,[]);
        const search=page.locator('input[type=search]');await search.fill(system==='specimen'?'TM-26-01':'NS-01');assert.equal(await page.locator('[data-item]').count(),1);
        await page.locator('[data-action=save]').first().click();assert.equal(await page.locator('[data-count]').innerText(),'1');
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(await page.evaluate(()=>[...document.images].filter(i=>!i.complete||!i.naturalWidth).length),0);
        await page.screenshot({path:path.join(out,system+'-copied-package.png')});report.browserChecks.push(system+': copied-package offline load, asset, search, save, no overflow');await page.close();
      }
      await fs.writeFile(path.join(cwd,'integration.html'),`<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="integration/specimen/base.css"><link rel="stylesheet" href="integration/specimen/specimen.css"><link rel="stylesheet" href="integration/signal/signal.css">
<button id="host">Existing host action</button><output id="count">0</output><input type="hidden" id="mfs-1-query"><div id="mounts"></div>
<script type="module">
import {mountFrontendSystem as mountSpecimen} from './integration/specimen/browser.mjs';
import {mountFrontendSystem as mountSignal} from './integration/signal/browser.mjs';
let n=0;document.querySelector('#host').onclick=()=>document.querySelector('#count').textContent=++n;
const detached=[];
for(const [system,mount] of [['specimen',mountSpecimen],['signal',mountSignal]]){
  const content=await(await fetch('./generated/'+system+'/content.json')).json();
  content.image.src='./generated/'+system+'/'+content.image.src;
  const root=document.createElement('div');root.id=system;
  mount(root,content);detached.push(root);
}
window.detachedIds=detached.flatMap(root=>[...root.querySelectorAll('[id]')].map(el=>el.id));
document.querySelector('#mounts').append(...detached);window.ready=true;
</script>`);
      server=http.createServer(async(req,res)=>{try{const file=path.resolve(cwd,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));if(!file.startsWith(cwd+path.sep)){res.writeHead(403).end();return;}const body=await fs.readFile(file);const type={'.html':'text/html; charset=utf-8','.css':'text/css','.mjs':'application/javascript','.json':'application/json','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream';res.writeHead(200,{'Content-Type':type});res.end(body);}catch{res.writeHead(404).end();}});
      await new Promise(r=>server.listen(0,'127.0.0.1',r));const page=await browser.newPage({viewport:{width:1024,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}/integration.html`);await page.waitForFunction(()=>window.ready);assert.equal(await page.locator('[data-item]').count(),10);
      const browserCheck=(name,value)=>{assert.ok(value,name);report.browserChecks.push(name);};
      browserCheck('separate installed modules reserve distinct IDs while both roots are detached',await page.evaluate(()=>new Set(window.detachedIds).size===window.detachedIds.length));
      browserCheck('mounted IDs are unique beside pre-existing host IDs',await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(el=>el.id);return new Set(ids).size===ids.length;}));
      await page.locator('#signal label').first().click();
      browserCheck('second module search label focuses its own input',await page.evaluate(()=>document.activeElement===document.querySelector('#signal input[name=query]')));
      await page.locator('#signal .mfs-primary').click();
      browserCheck('second module anchor resolves to its own collection',await page.evaluate(()=>document.getElementById(decodeURIComponent(location.hash.slice(1)))===document.querySelector('#signal .mfs-collection')));
      // Keep the first dialog's title in the DOM before testing the second title.
      await page.locator('#specimen [data-action=detail]').first().click();await page.keyboard.press('Escape');
      await page.locator('#signal [data-action=detail]').first().click();
      browserCheck('second module dialog is labelled by its own complete title',await page.evaluate(()=>{const dialog=document.querySelector('#signal dialog'),title=document.getElementById(dialog.getAttribute('aria-labelledby'));return dialog.open&&title===dialog.querySelector('h2')&&title.textContent==='The city, with the volume turned down';}));
      browserCheck('both retained dialog title IDs stay unique',await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(el=>el.id);return new Set(ids).size===ids.length;}));
      await page.keyboard.press('Escape');await page.locator('#host').click();assert.equal(await page.locator('#count').innerText(),'1');assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>[...document.images].filter(i=>!i.complete||!i.naturalWidth).length),0);report.browserChecks.push('independently installed modules preserve host action and load local imagery');
      report.integrationIds=await page.evaluate(()=>[...document.querySelectorAll('[id]')].map(el=>el.id));await page.screenshot({path:path.join(out,'independent-module-integration.png')});await page.close();
    }finally{await browser.close();if(server)await new Promise(r=>server.close(r));}
  }
}catch(error){report.failures.push({message:error.message,stack:error.stack});throw error;}
finally{await fs.writeFile(path.join(out,'package-smoke-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({commands:report.commands.length,browserChecks:report.browserChecks.length,failures:report.failures,report:path.join(out,'package-smoke-report.json')}));}
