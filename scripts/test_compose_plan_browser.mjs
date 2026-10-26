// Optional actual-browser regressions for failures invisible to schema checks.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {compose} from '../skills/musedraw/scripts/engine/compose.mjs';
import {render} from '../skills/musedraw/scripts/engine/render.mjs';
import {loadTheme} from '../skills/musedraw/scripts/musedraw.mjs';
const args=process.argv.slice(2),value=k=>args[args.indexOf(k)+1];
if(!args.includes('--playwright'))throw new Error('Pass existing --playwright MODULE and optional --browser EXECUTABLE');
const {chromium}=await import(pathToFileURL(value('--playwright')).href);
const browser=await chromium.launch({headless:true,...(args.includes('--browser')?{executablePath:value('--browser')}:{})});
try{
 const page=await browser.newPage();
 for(const theme of ['journal','editorial','swiss','enterprise']){
  const scene=compose({method:'plan',theme,title:'开放服务计划',periods:['2027','2028','2029'],metrics:[{id:'sites',label:'开放服务点目标',unit:'个',values:[6,4,14]}],work:[{id:'catalogue',label:'档案整理',actions:['保留原始题名','记录检索反馈']},{id:'access',label:'服务协作',actions:['统一交接清单','开展岗位培训']}],support:['目录台账','服务手册']});
  await page.setContent(render(scene,await loadTheme(theme)));await page.evaluate(()=>document.fonts.ready);
  const report=await page.evaluate(()=>{
   const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number),lum=a=>a.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
   const bg=lum(rgb(getComputedStyle(document.querySelector('#canvas')).fill));
   const contrast=[...document.querySelectorAll('text')].map(el=>{const s=getComputedStyle(el),l=lum(rgb(s.fill));return {text:el.textContent,ratio:(Math.max(l,bg)+.05)/(Math.min(l,bg)+.05),min:parseFloat(s.fontSize)>=24?3:4.5};});
   const work=[...document.querySelectorAll('[data-md="node"]')].filter(el=>el.id.startsWith('work-'));
   const support=document.querySelector('#shared-support'),box=support.getAttribute('data-box').split(',').map(Number);
   return {contrast,bg,supportFill:getComputedStyle(support.querySelector('rect,path')).fill,workFurniture:work.map(el=>el.querySelectorAll(':scope > rect,:scope > path').length),connections:[...document.querySelectorAll('[data-connection]')].map(el=>JSON.parse(el.getAttribute('data-connection'))),supportCenter:box[0]+box[2]/2};
  });
  assert.deepEqual(report.workFurniture,[0,0],`${theme}: text-only work has no inherited plates/top bars`);
  assert.equal(report.supportFill,'none',`${theme}: missing background tokens cannot paint a black support box`);
  for(const t of report.contrast)assert.ok(t.ratio>=t.min,`${theme}: ${t.text} contrast ${t.ratio.toFixed(2)} < ${t.min}`);
  for(const e of report.connections)assert.ok(Math.abs(e.points[0][0]-report.supportCenter)<.02,`${theme}: explicit common trunk must survive rendering`);
  console.log(`PASS plan browser: ${theme}, text contrast, furniture, shared connection`);
 }
}finally{await browser.close();}
