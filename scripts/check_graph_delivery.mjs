// Explicit browser check for a generated offline review page; no model calls.
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const [directory,modulePath,executablePath]=process.argv.slice(2);
if(!directory||!modulePath||!executablePath)throw Error('Usage: node check_graph_delivery.mjs REVIEW_DIR PLAYWRIGHT_MODULE BROWSER');
const {chromium}=await import(pathToFileURL(path.resolve(modulePath)).href);
const browser=await chromium.launch({headless:true,executablePath});
const errors=[];
try{
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:960}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve(directory,'index.html')).href);
  await page.evaluate(()=>document.querySelectorAll('img').forEach(img=>img.loading='eager'));
  await page.waitForFunction(()=>[...document.images].every(img=>img.complete&&img.naturalWidth>0));
  const result=await page.evaluate(()=>({images:document.images.length,overflow:document.documentElement.scrollWidth>innerWidth+1}));
  assert.equal(result.images,10);assert.equal(result.overflow,false);
  await page.screenshot({path:path.resolve(directory,`page-${width}.png`),fullPage:true});
  console.log(JSON.stringify({width,...result,passed:true}));
  await page.close();
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
