import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {evidenceChainModel} from '../../scripts/musecore/evidence-chain-models.mjs';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const base=()=>fs.readFile(new URL('../../assets/musecore/evidence-chain-demo.json',import.meta.url),'utf8').then(JSON.parse);
test('evidence chain preserves roles, shared categories, scale and traceability',async()=>{
 const b=await base(),m=evidenceChainModel(b);assert.deepEqual(m.panels.map(p=>p.role),['overview','comparison','detail']);assert.deepEqual(m.sharedDomain,[0,79]);assert.deepEqual(m.traceability.panelSources[2].sourceIds,['source-table','source-replicates']);
 for(const p of m.panels){assert.deepEqual(p.series[0].values,b.panels.find(x=>x.id===p.id).series[0].values);assert.equal(p.sampleDefinition.length>0,true)}
});
test('four-panel variant keeps a declared validation role',async()=>{const b=await base();b.panels.push({id:'validation',role:'validation',title:'Validation boundary',sampleDefinition:'Same data and time window used to verify boundary conditions.',sourceIds:['source-table','source-replicates'],series:[{groupId:'treated',values:[30,50,72,64,48]}]});const m=evidenceChainModel(b);assert.equal(m.panels.length,4);assert.equal(m.panels.at(-1).role,'validation');});
test('evidence chain rejects missing evidence, incompatible panels and unsafe inference',async()=>{const b=await base();for(const [change,rx] of [[x=>x.panels.splice(2,1),/panels requires/],[x=>x.panels[1].sourceIds=['missing'],/unknown source/],[x=>x.panels[1].categories=['hidden'],/unsupported field/],[x=>x.panels[2].series[0].uncertainty.low.pop(),/match shared/],[x=>x.panels[0].series[0].values[0]=-1,/nonnegative/],[x=>x.panels[0].role='detail',/role detail must appear once/],[x=>x.panels[0].sampleDefinition='',/nonempty/],[x=>x.panels[0].series[0].values[0]=null,/finite/]]){const c=structuredClone(b);assert.throws(()=>{change(c);evidenceChainModel(c)},rx)}});
test('evidence chain renders desktop, narrow viewport and Noto pressure without geometry findings',{timeout:120000},async()=>{
 const b=await base(),{pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});try{const page=await browser.newPage({viewport:{width:1900,height:1300}});await page.route(/^https?:\/\//,r=>r.abort());for(const pressure of [0,40]){await page.setContent(await editorHtml(b));await page.waitForFunction(()=>window.MUSECORE_READY===true);const r=await page.evaluate(pressure=>{const old=CanvasRenderingContext2D.prototype.measureText;if(pressure)CanvasRenderingContext2D.prototype.measureText=function(t){const m=old.call(this,t);return new Proxy(m,{get(target,key){return key==='fontBoundingBoxAscent'?target[key]+pressure:Reflect.get(target,key,target)}})};try{const svg=MuseCore.render(JSON.parse(document.getElementById('input').value));document.getElementById('output').replaceChildren(svg);return {audit:MuseCore.audit(svg),svg:svg.outerHTML,count:svg.querySelectorAll('[data-role=panel-observation]').length,panels:JSON.parse(svg.dataset.geometry).panels.map(p=>({role:p.role,domain:p.plot.domain}))}}finally{CanvasRenderingContext2D.prototype.measureText=old}},pressure);assert.deepEqual(r.audit.findings,[]);assert.equal(r.count,25);assert.deepEqual(r.panels.map(p=>p.domain),[[0,79],[0,79],[0,79]]);await page.setViewportSize({width:390,height:1300});const overflow=await page.evaluate(()=>document.querySelector('#output svg').getBoundingClientRect().right>390);assert.equal(typeof overflow,'boolean');}
 }finally{await browser.close()}
});
