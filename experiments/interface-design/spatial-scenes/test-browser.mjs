import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const out=path.dirname(fileURLToPath(import.meta.url)),results=[];
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');const file=path.resolve(out,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));const rel=path.relative(out,file);if(rel.startsWith('..')||path.isAbsolute(rel))throw new Error('Outside root');const data=await fs.readFile(file);res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.json')?'application/json':'text/javascript');res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
function overlap(a,b){return a.x<b.x+b.w-1&&a.x+a.w-1>b.x&&a.y<b.y+b.h-1&&a.y+a.h-1>b.y;}
try{
 for(const name of ['harbor','water'])for(const [width,height] of [[1920,1080],[1440,900],[1024,768],[390,844]]){
  const p=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'}),errors=[],remote=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',r=>{const u=new URL(r.request().url());if(/^https?:/.test(u.protocol)&&u.hostname!=='127.0.0.1'){remote.push(u.href);return r.abort();}return r.continue();});
  await p.goto(`${origin}/?case=${name}`,{waitUntil:'networkidle'});await p.waitForFunction(()=>document.body.dataset.renderReady==='true',{timeout:30000});
  const statusStyles=()=>p.locator('.scene-pin.attention').evaluateAll(es=>es.map(e=>({id:e.dataset.select,color:getComputedStyle(e).color,border:getComputedStyle(e).borderColor})));
  const stableStatus=await statusStyles();
  const expectedAttention=await p.evaluate(()=>Object.entries(spatialDemo.config.objects).filter(([,o])=>o.alert).map(([id])=>id));
  assert.deepEqual(stableStatus.map(s=>s.id).sort(),expectedAttention.sort());
  let count=0;
  for(const camera of ['reset-view','top-view']){
   await p.locator('#'+camera).click();
   for(const id of (name==='harbor'?['B01','B02','B03','B02']:['W01','W02','W03','W02'])){
    const button=p.locator(`#selector [data-select="${id}"]`);await button.focus();await p.keyboard.press('Enter');
    const snap=await p.evaluate(()=>{const d=spatialDemo,o=d.config.objects[d.selected];return{selected:d.selected,expectedName:o.name,name:document.getElementById('object-name').textContent,expectedValue:o.value,value:document.querySelector('#figure-value').childNodes[0].textContent,focused:document.activeElement.dataset.select,pressed:[...document.querySelectorAll('.scene-pin[aria-pressed=true]')].map(e=>e.dataset.select),finite:[...d.stage.camera.matrixWorld.elements,...d.stage.camera.projectionMatrix.elements].every(Number.isFinite),labels:[...document.querySelectorAll('.scene-pin')].map(e=>{const r=e.getBoundingClientRect();return{id:e.dataset.select,x:r.x,y:r.y,w:r.width,h:r.height};}),host:(()=>{const r=document.getElementById('scene-host').getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})()};});
    assert.equal(snap.selected,id);assert.equal(snap.name,snap.expectedName);assert.equal(snap.value,snap.expectedValue);assert.equal(snap.focused,id);assert.deepEqual(snap.pressed,[id]);assert.equal(snap.finite,true);
    for(const l of snap.labels){assert(l.x>=snap.host.x-1&&l.x+l.w<=snap.host.x+snap.host.w+1,`${name}/${width}/${camera} ${l.id} horizontal bounds`);assert(l.y>=snap.host.y-1&&l.y+l.h<=snap.host.y+snap.host.h+1,`${name}/${width}/${camera} ${l.id} vertical bounds`);}
    for(let a=0;a<snap.labels.length;a++)for(let b=a+1;b<snap.labels.length;b++)assert(!overlap(snap.labels[a],snap.labels[b]),`${name}/${width}/${camera} callout overlap`);
    assert.deepEqual(await statusStyles(),stableStatus,`${name}/${width}/${camera}: selection must preserve status colors`);
    count++;
   }
   const pin=p.locator('.scene-pin').first();await pin.focus();await p.keyboard.press('Space');assert.equal(await pin.evaluate(e=>e===document.activeElement),true);
  }
  const noOverflow=await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);assert(noOverflow);assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  results.push({name,width,height,entityCameraStateChecks:count,checks:['selection and details','physical scene pin state','status color invariant across selection','stable keyboard focus','finite scene projection','all three labels in bounds','no pairwise label overlaps','no horizontal page overflow','no external requests','no script errors'],pass:true});await p.close();
 }
 const report={testedAt:new Date().toISOString(),stateCount:results.reduce((n,r)=>n+r.entityCameraStateChecks,0),results,scope:'Functional and layout robustness only. These tests do not score aesthetic excellence or engineering accuracy.'};
 await fs.writeFile(path.join(out,'regression-local.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
