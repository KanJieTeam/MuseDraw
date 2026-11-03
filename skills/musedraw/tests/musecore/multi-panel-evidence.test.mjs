import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {multiPanelEvidenceModel} from '../../scripts/musecore/multi-panel-evidence-models.mjs';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const base=()=>fs.readFile(new URL('../../assets/musecore/multi-panel-evidence-demo.json',import.meta.url),'utf8').then(JSON.parse);

test('multi-panel evidence keeps roles, shared scale and traceability',async()=>{
 const b=await base(),m=multiPanelEvidenceModel(b);
 assert.deepEqual(m.panels.map(p=>p.role),['overview','comparison','detail','validation']);
 assert.deepEqual(m.sharedDomain,[0,72]);
 assert.deepEqual(m.traceability.panelSources[3],{panelId:'validation',role:'validation',sourceIds:['review-log','method-record']});
 assert.equal(m.panels.find(p=>p.id==='detail').series[0].uncertainty.high[2],79);
});

test('multi-panel evidence rejects unsupported inference and unaligned panels',async()=>{
 const b=await base();
 for(const [mutate,pattern] of [
  [x=>x.scalePolicy='independent',/shared-zero/],
  [x=>x.panels[1].categories[0]='另一个起点',/share category identities/],
  [x=>x.panels[3].rows[0].cells[0].status='high',/status unsupported/],
  [x=>x.panels[0].series[0].uncertainty={low:[1],high:[2]},/match categories/],
  [x=>x.panels[0].sourceIds=['unknown'],/unknown source/],
  [x=>x.panels[0].role='detail',/role detail must appear once/],
  [x=>x.panels[3].weight=4,/weight must be integer/]
 ]){const c=structuredClone(b);mutate(c);assert.throws(()=>multiPanelEvidenceModel(c),pattern)}
});

test('multi-panel evidence renders desktop, narrow viewport and font ascent pressure',{timeout:120000},async()=>{
 const b=await base(),html=await editorHtml(b),{pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{
  const page=await browser.newPage({viewport:{width:1900,height:1800}});await page.route(/^https?:\/\//,r=>r.abort());await page.setContent(html);await page.waitForFunction(()=>window.MUSECORE_READY===true);
  const initial=await page.evaluate(()=>window.MUSECORE_RESULT);assert.equal(initial.error,undefined);assert.deepEqual(initial.findings,[]);assert.equal(initial.geometry.family,'multi-panel-evidence');assert.equal(initial.geometry.panels.length,4);assert.deepEqual(initial.geometry.sharedDomain,[0,72]);
  for(const width of [390,1024,1440]){await page.setViewportSize({width,height:1800});await page.waitForTimeout(20);const result=await page.evaluate(()=>({error:document.querySelector('#error')?.textContent??'',scroll:document.documentElement.scrollWidth-document.documentElement.clientWidth,viewBox:document.querySelector('#output svg')?.getAttribute('viewBox')}));assert.equal(result.error,'');assert(result.scroll<=1,`horizontal overflow ${width}`);assert.match(result.viewBox,/^0 0 1800 /)}
  const pressure=await page.evaluate(()=>{const old=CanvasRenderingContext2D.prototype.measureText;CanvasRenderingContext2D.prototype.measureText=function(value){const m=old.call(this,value);return new Proxy(m,{get(target,key){return key==='fontBoundingBoxAscent'?(target.fontBoundingBoxAscent??0)+36:Reflect.get(target,key,target)}})};try{const svg=MuseCore.render(JSON.parse(document.querySelector('#input').value));document.querySelector('#output').replaceChildren(svg);return MuseCore.audit(svg)}finally{CanvasRenderingContext2D.prototype.measureText=old}});assert.deepEqual(pressure.findings,[]);assert(pressure.geometry.height>=initial.geometry.height);
 }finally{await browser.close()}
});
