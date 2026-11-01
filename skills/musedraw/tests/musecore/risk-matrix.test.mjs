import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {riskMatrixModel} from '../../scripts/musecore/risk-matrix-models.mjs';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const source=JSON.parse(await fs.readFile(new URL('../../assets/musecore/risk-matrix-demo.json',import.meta.url),'utf8'));
const clone=()=>structuredClone(source);

test('risk matrix computes severity and preserves supplied status/actions',()=>{
 const m=riskMatrixModel(source);assert.deepEqual(m.items.map(i=>[i.id,i.severity,i.bandId]),[['r01',25,'act'],['r02',15,'act'],['r03',9,'watch'],['r04',3,'steady']]);assert.deepEqual(m.items.map(i=>i.status),['open','watch','contained','watch']);assert.equal(m.scope.includes('no probability'),true);
});

test('risk matrix rejects unsupported inference and malformed policy',()=>{
 for(const [mutate,pattern]of [[x=>x.items[0].likelihood='unknown',/undeclared level/],[x=>x.bands[1].min=6,/contiguous/],[x=>x.items[0].status='new',/status must be/],[x=>x.xAxis.levels[1].score=1,/unique/],[x=>x.items.push({...x.items[0],id:'r01'}),/duplicate item id/],[x=>x.items[0].response='x'.repeat(141),/exceeds 140/]]){const bad=clone();mutate(bad);assert.throws(()=>riskMatrixModel(bad),pattern)}
});

test('risk matrix renders without geometry findings at desktop and narrow viewports, including font pressure', {timeout:120000}, async()=>{
 const html=await editorHtml(source),{pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{const page=await browser.newPage({viewport:{width:1600,height:1400}});await page.setContent(html);await page.waitForFunction(()=>window.MUSECORE_READY===true);let result=await page.evaluate(()=>window.MUSECORE_RESULT);assert.deepEqual(result.findings,[]);assert.equal(result.geometry.family,'risk-matrix');assert.equal(result.geometry.items.length,4);
  await page.addStyleTag({content:`#output text{font-family:'Noto Sans','Microsoft YaHei',sans-serif !important}`});await page.click('#generate');await page.waitForFunction(()=>window.MUSECORE_READY===true);result=await page.evaluate(()=>window.MUSECORE_RESULT);assert.deepEqual(result.findings,[]);
  for(const width of [390,1024,1440]){await page.setViewportSize({width,height:1400});await page.waitForTimeout(25);const r=await page.evaluate(()=>({bodyOverflow:document.body.scrollWidth-document.documentElement.clientWidth,error:document.querySelector('#error')?.textContent,svg:document.querySelector('#output svg')?.getAttribute('viewBox')}));assert(r.bodyOverflow<=1,`horizontal overflow at ${width}px`);assert.equal(r.error,'');assert.match(r.svg,/^0 0 1600 /)}
  await page.close();
 }finally{await browser.close()}
});
