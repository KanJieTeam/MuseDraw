import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {evidenceMatrixModel} from '../../scripts/musecore/evidence-matrix-models.mjs';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';
const source=JSON.parse(await fs.readFile(new URL('../../assets/musecore/evidence-matrix.json',import.meta.url),'utf8'));
const clone=()=>structuredClone(source);
test('evidence matrix keeps explicit statuses without deriving a score',()=>{
 const m=evidenceMatrixModel(source);assert.equal(m.rows.length,5);assert.equal(m.columns.length,3);assert.equal(m.rows[0].values[0].status,'confirmed');assert.equal(m.rows[3].values[0].status,'not-applicable');
});
test('evidence matrix rejects unsupported status, shape and overlong input',()=>{
 for(const [mutate,pattern] of [[x=>x.rows[0].values[0].status='high',/status unsupported/],[x=>x.columns.push({id:'delta',label:'第四方案'}),/must match columns/],[x=>x.rows[0].values[0].note='x'.repeat(49),/exceeds 48/],[x=>x.rows.push(...Array.from({length:6},(_,i)=>({id:'extra'+i,label:'超出范围 '+i,values:x.columns.map(()=>({status:'missing'}))}))),/rows requires 3–10/],[x=>x.legend[1].status=x.legend[0].status,/duplicate status/]]){const bad=clone();mutate(bad);assert.throws(()=>evidenceMatrixModel(bad),pattern)}});
test('evidence matrix renders at desktop, narrow viewport and ascent pressure',{timeout:120000},async()=>{
 const html=await editorHtml(source),{pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{const page=await browser.newPage({viewport:{width:1800,height:1600}});await page.setContent(html);await page.waitForFunction(()=>window.MUSECORE_READY===true);let result=await page.evaluate(()=>window.MUSECORE_RESULT);assert.equal(result.error,undefined);assert.deepEqual(result.findings,[]);assert.equal(result.geometry.family,'evidence-matrix');assert.equal(result.geometry.cells.length,15);
  for(const width of [390,1024,1440]){await page.setViewportSize({width,height:1600});await page.waitForTimeout(20);const r=await page.evaluate(()=>({overflow:document.body.scrollWidth-document.documentElement.clientWidth,error:document.querySelector('#error')?.textContent,viewBox:document.querySelector('#output svg')?.getAttribute('viewBox')}));assert(r.overflow<=1,`horizontal overflow ${width}`);assert.equal(r.error,'');assert.match(r.viewBox,/^0 0 1500 /)}
  const tall=await page.evaluate(()=>{const old=CanvasRenderingContext2D.prototype.measureText;CanvasRenderingContext2D.prototype.measureText=function(value){const m=old.call(this,value);return new Proxy(m,{get(target,key){return key==='fontBoundingBoxAscent'?(target.fontBoundingBoxAscent??0)+42:Reflect.get(target,key,target)}})};try{const svg=MuseCore.render(JSON.parse(document.querySelector('#input').value));document.querySelector('#output').replaceChildren(svg);return MuseCore.audit(svg)}finally{CanvasRenderingContext2D.prototype.measureText=old}});assert.deepEqual(tall.findings,[]);assert(tall.geometry.height>=result.geometry.height);
 }finally{await browser.close()}
});



