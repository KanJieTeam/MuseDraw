import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {cohortBranchRejoinModel as model} from '../../scripts/musecore/cohort-branch-rejoin-models.mjs';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const base=JSON.parse(await fs.readFile(new URL('../../assets/musecore/cohort-branch-rejoin-demo.json',import.meta.url),'utf8'));
test('branch/rejoin conserves explicit counts and rejects inferred or cyclic flow',()=>{
 const m=model(base);assert.equal(m.maxLevel,4);assert.deepEqual(m.nodes.map(n=>n.count),[240,240,180,60,240,240]);
 assert.equal(m.links.filter(l=>l.kind==='split').reduce((s,l)=>s+l.amount,0),240);
 for(const change of [x=>x.links[2].amount=61,x=>x.links.push({...x.links[0],id:'cycle',from:'exit',to:'entry'}),x=>x.nodes.find(n=>n.id==='review').sourceIds=['unknown'],x=>x.nodes.find(n=>n.id==='screen').role='stage']){const x=structuredClone(base);change(x);assert.throws(()=>model(x))}
});
test('production render passes normal, long labels and measurement pressure at narrow viewport',{timeout:120000},async()=>{
 const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{const page=await browser.newPage({viewport:{width:390,height:900}});await page.route(/^https?:\/\//,r=>r.abort());
  for(const pressure of [0,36]){const input=structuredClone(base);if(pressure)input.title='一个更长的队列分支与复核路径标题用于字体压力';await page.setContent(await editorHtml(input));await page.waitForFunction(()=>window.MUSECORE_READY===true);const result=await page.evaluate(({pressure})=>{const old=CanvasRenderingContext2D.prototype.measureText;if(pressure)CanvasRenderingContext2D.prototype.measureText=function(v){const m=old.call(this,v);return new Proxy(m,{get(t,k){return k==='fontBoundingBoxAscent'?t.fontBoundingBoxAscent+pressure:Reflect.get(t,k,t)}})};try{const svg=MuseCore.render(JSON.parse(document.getElementById('input').value));document.getElementById('output').replaceChildren(svg);return{audit:MuseCore.audit(svg),width:+svg.getAttribute('width'),height:+svg.getAttribute('height'),nodes:[...svg.querySelectorAll('[data-role=cohort-flow-node]')].length,links:[...svg.querySelectorAll('[data-role=cohort-flow-link]')].length,text:svg.textContent}}finally{CanvasRenderingContext2D.prototype.measureText=old}},{pressure});assert.deepEqual(result.audit.findings,[]);assert.equal(result.nodes,6);assert.equal(result.links,6);assert(result.width>=1500);assert(result.text.includes('入组队列'));}
 }finally{await browser.close()}
});
