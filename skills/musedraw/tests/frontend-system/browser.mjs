// Real Chrome evidence. Runtime paths are supplied, never installed by this test.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {prepareBuild,writeKit} from '../../scripts/frontend-system.mjs';
import {stressContent} from './stress.mjs';

const skill=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const args=process.argv.slice(2), option=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const out=path.resolve(option('--out','output/frontend-system-browser'));
const runtime=option('--playwright'), executablePath=option('--browser');
assert.ok(runtime&&executablePath,'Use --playwright EXISTING_MODULE --browser EXISTING_CHROME --out NEW_DIRECTORY');
try{await fs.lstat(out);throw Error('Evidence directory already exists; preserve it and choose a new output.');}catch(e){if(e.code!=='ENOENT')throw e;}
await fs.mkdir(out,{recursive:true});
const examples=path.join(skill,'assets/frontend-system/examples'), cases=[];
for(const [system,name] of [['specimen','tidemark'],['signal','night-signal']]){
  const base=JSON.parse(await fs.readFile(path.join(examples,name+'.json'),'utf8'));
  for(const stress of [false,true]){
    const id=system+(stress?'-cjk':'');const inputDir=path.join(out,'inputs',id);await fs.mkdir(inputDir,{recursive:true});
    const c=stress?stressContent(base):structuredClone(base);
    if(stress&&system==='specimen'){c.image={...c.image,src:'portrait.svg',width:480,height:720,credit:'原创竖版几何插图 / 虚构观察纸',alt:'一张竖版观察纸上的植物形态插图',fit:'contain'};await fs.copyFile(path.join(skill,'tests/frontend-system/portrait.svg'),path.join(inputDir,c.image.src));}
    else await fs.copyFile(path.join(examples,base.image.src),path.join(inputDir,c.image.src));
    const input=path.join(inputDir,'content.json');await fs.writeFile(input,JSON.stringify(c,null,2));
    await writeKit({out:path.join(out,id),system,prepared:await prepareBuild(input)});cases.push({id,system,stress,content:c});
  }
}
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.mjs':'application/javascript','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer(async(req,res)=>{try{const p=path.resolve(out,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));if(!p.startsWith(out+path.sep)){res.writeHead(403).end();return;}const body=await fs.readFile(p);res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const {chromium}=await import(pathToFileURL(path.resolve(runtime)).href);
const browser=await chromium.launch({headless:true,executablePath});
const report={scope:'Measured browser function/layout, not an aesthetic rating or ship approval',runtime:path.resolve(runtime),browser:executablePath,views:[],checks:[],failures:[]};
const check=(name,value)=>{assert.ok(value,name);report.checks.push(name);};
try{
  for(const c of cases){
    const capture=path.join(out,c.id,'evidence');await fs.mkdir(capture);
    for(const width of [1440,1024,390,320]){
      const page=await browser.newPage({viewport:{width,height:width<700?844:900},reducedMotion:'reduce'});const errors=[];page.on('pageerror',error=>errors.push(error.message));
      await page.goto(`${origin}/${c.id}/index.html`,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
      const layout=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,brokenImages:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),title:document.querySelector('h1').textContent,renderedItems:document.querySelectorAll('[data-item]').length,titleMode:document.querySelector('.mfs').dataset.title,imageFrame:document.querySelector('.mfs').dataset.frame,minTapHeight:Math.min(...[...document.querySelectorAll('button,input,select')].filter(e=>e.getClientRects().length).map(e=>e.getBoundingClientRect().height))}));
      check(`${c.id}/${width}: no horizontal overflow`,layout.scrollWidth<=width+1);check(`${c.id}/${width}: all assets load`,layout.brokenImages.length===0);check(`${c.id}/${width}: no page errors`,errors.length===0);check(`${c.id}/${width}: no dropped records`,layout.renderedItems===c.content.items.length);check(`${c.id}/${width}: 44px controls`,layout.minTapHeight>=43.9);check(`${c.id}/${width}: exact supplied title`,layout.title===c.content.page.title);
      if(c.stress)check(`${c.id}/${width}: content-sensitive title scale`,layout.titleMode==='extended');
      await page.screenshot({path:path.join(capture,`${width}.png`)});
      await page.locator('.mfs-collection').evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(capture,`${width}-collection.png`)});
      if(width===390&&!c.stress)await page.screenshot({path:path.join(capture,`${width}-full.png`),fullPage:true});
      report.views.push({case:c.id,...layout,errors});await page.close();
    }
  }
  for(const c of cases){
    const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
    await page.goto(`${origin}/${c.id}/index.html`);const first=c.content.items[0],second=c.content.items[1],root=page.locator('.mfs'),query=page.locator('input[type=search]');
    await page.locator('.mfs-primary').click();check(`${c.id}: primary action reaches collection`,(await page.evaluate(()=>location.hash)).includes('collection'));
    await query.fill(first.id);check(`${c.id}: exact ID search`,await page.locator('[data-item]').count()===1);
    await page.locator('button[type=reset]').click();await page.locator('select').selectOption(first.category);check(`${c.id}: category filter`,await page.locator('[data-item]').count()===c.content.items.filter(i=>i.category===first.category).length);
    await page.locator('button[type=reset]').click();await query.fill('no-such-record-zzzz');check(`${c.id}: truthful empty state`,await page.locator('[data-item]').count()===0&&await page.locator('.mfs-empty').isVisible());await page.locator('.mfs-empty button').click();
    await page.locator(`[data-action=detail][data-id="${first.id}"]`).click();check(`${c.id}: complete source in detail`,(await page.locator('dialog .mfs-source').innerText()).includes(first.source));check(`${c.id}: text cannot become active markup`,await page.locator('dialog script').count()===0);
    await page.locator(`dialog [data-action=save][data-id="${first.id}"]`).focus();await page.keyboard.press('Enter');check(`${c.id}: keyboard save`,await page.locator('[data-count]').innerText()==='1');check(`${c.id}: focus follows replaced save control`,await page.evaluate(()=>document.activeElement?.dataset.action==='save'));
    check(`${c.id}: close remains in view after saving long detail`,await page.locator('dialog [data-action=close]').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}));await page.screenshot({path:path.join(out,c.id,'evidence','detail-saved.png')});await page.keyboard.press('Escape');check(`${c.id}: modal closes and focus returns to record`,await page.evaluate(id=>!document.querySelector('dialog').open&&document.activeElement?.dataset.id===id,first.id));
    await page.reload();check(`${c.id}: local selection survives reload`,await page.locator('[data-count]').innerText()==='1');
    if(c.system==='signal'){
      await page.locator(`[data-action=save][data-id="${second.id}"]`).click();await page.locator('[data-action=selection]').click();check(`${c.id}: overlap is reported`,await page.locator('.mfs-conflicts.has-conflicts').count()===1);check(`${c.id}: selection does not mutate programme facts`,await page.evaluate(expected=>JSON.stringify(JSON.parse(document.querySelector('#frontend-content').textContent).items)===JSON.stringify(expected),c.content.items));await page.screenshot({path:path.join(out,c.id,'evidence','conflict.png')});await page.keyboard.press('Escape');
    }
    await page.locator('[data-action=savedOnly]').click();check(`${c.id}: saved-only filter`,await page.locator('[data-item]').count()===(c.system==='signal'?2:1));
    await page.locator('[data-action=selection]').click();await page.locator('[data-action=clear]').click();check(`${c.id}: clear leaves an honest empty list`,await page.locator('[data-count]').innerText()==='0'&&await page.locator('.mfs-selection-list').count()===0);await page.keyboard.press('Escape');await page.reload();check(`${c.id}: cleared state survives reload`,await page.locator('[data-count]').innerText()==='0');
    await page.close();
  }
  // Integrate the installed modules beside existing host UI, including blocked storage.
  const integration=path.join(out,'integration');await fs.mkdir(integration);await writeKit({out:path.join(integration,'kit'),system:'specimen'});
  const content=JSON.parse(await fs.readFile(path.join(out,'specimen/content.json'),'utf8'));delete content.image;
  await fs.writeFile(path.join(integration,'content.json'),JSON.stringify(content));
  await fs.writeFile(path.join(integration,'index.html'),`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="kit/base.css"><link rel="stylesheet" href="kit/specimen.css"><style>body{margin:0}#host{color:rgb(11,22,33);font-size:27px}</style></head><body><div id="host"><h1>Existing host application</h1><button id="host-button">Host action</button><span id="host-count">0</span></div><div id="kit-root"></div><script type="module">import {mountFrontendSystem} from './kit/browser.mjs';const content=await(await fetch('./content.json')).json();let n=0;document.querySelector('#host-button').onclick=()=>document.querySelector('#host-count').textContent=++n;window.events=[];window.hostKit=mountFrontendSystem(document.querySelector('#kit-root'),content,{storage:{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}},onSelectionChange:detail=>window.events.push(detail)});</script></body></html>`);
  const page=await browser.newPage({viewport:{width:1024,height:900}});await page.goto(`${origin}/integration/index.html`);await page.waitForFunction(()=>!!window.hostKit);await page.locator('#host-button').click();check('integration: existing host action survives',await page.locator('#host-count').innerText()==='1');
  check('integration: host typography is unaffected',await page.locator('#host').evaluate(el=>getComputedStyle(el).fontSize)==='27px');await page.locator('[data-action=save]').first().click();check('integration: blocked storage has an explicit message',(await page.locator('[data-notice]').innerText()).includes('unavailable'));check('integration: host receives exact selected ID',await page.evaluate(()=>window.events[0].ids[0]==='TM-26-01'));
  await page.evaluate(()=>window.hostKit.destroy());await page.locator('#host-button').click();check('integration: destroy removes only the kit content',await page.locator('#kit-root > *').count()===0&&await page.locator('#host-count').innerText()==='2');await page.close();
  const offline=await browser.newPage({viewport:{width:1024,height:900}});const offlineErrors=[];offline.on('pageerror',error=>offlineErrors.push(error.message));await offline.goto(pathToFileURL(path.join(out,'specimen/index.html')).href);check('offline: classic bundle opens directly from the filesystem',await offline.locator('[data-item]').count()===5&&offlineErrors.length===0);await offline.locator('[data-action=save]').first().click();check('offline: local action works without an HTTP server',await offline.locator('[data-count]').innerText()==='1');await offline.close();
}catch(error){report.failures.push({message:error.message,stack:error.stack});throw error;}
finally{await browser.close();await new Promise(r=>server.close(r));await fs.writeFile(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({views:report.views.length,checks:report.checks.length,failures:report.failures,report:path.join(out,'browser-report.json')}));}
