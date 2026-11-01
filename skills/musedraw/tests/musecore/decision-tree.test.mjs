import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {decisionTreeModel} from '../../scripts/musecore/decision-tree-models.mjs';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const source=JSON.parse(await fs.readFile(new URL('../../assets/musecore/decision-tree-demo.json',import.meta.url),'utf8'));
const clone=()=>structuredClone(source);

test('decision tree preserves explicit branches and computes reachable levels',()=>{
 const m=decisionTreeModel(source);
 assert.equal(m.rootId,'root');
 assert.deepEqual(m.leaves.map(n=>n.id),['missing','weak','approve','hold']);
 assert.deepEqual(m.levels,[['root'],['complete','missing'],['ready','weak'],['approve','hold']]);
 assert.equal(m.scope.includes('does not infer probabilities'),true);
});

test('decision tree rejects unsupported or ambiguous structure',()=>{
 for(const [mutate,pattern]of [
  [x=>x.nodes[1].level=3,/adjacent levels/],
  [x=>x.edges[1].from='missing',/outcome cannot branch|exactly one parent|self-reference/],
  [x=>x.edges.push({from:'root',to:'ready',label:'shortcut'}),/adjacent levels/],
  [x=>x.nodes[2].id='complete',/duplicate node id/],
  [x=>x.nodes[0].label='x'.repeat(101),/exceeds 100/],
  [x=>x.edges=x.edges.filter(e=>e.to!=='missing'),/exactly one parent|root requires/]
 ]){const bad=clone();mutate(bad);assert.throws(()=>decisionTreeModel(bad),pattern)}
});

test('decision tree renders cleanly at desktop, narrow viewports, and CJK font pressure',{timeout:120000},async()=>{
 const html=await editorHtml(source),{pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{const page=await browser.newPage({viewport:{width:1720,height:1300}});await page.setContent(html);await page.waitForFunction(()=>window.MUSECORE_READY===true);let result=await page.evaluate(()=>window.MUSECORE_RESULT);assert.deepEqual(result.findings,[]);assert.equal(result.geometry.family,'decision-tree');assert.equal(result.geometry.nodes.length,7);await page.addStyleTag({content:`#output text{font-family:'Noto Sans CJK SC','Microsoft YaHei',sans-serif !important}`});await page.click('#generate');await page.waitForFunction(()=>window.MUSECORE_READY===true);result=await page.evaluate(()=>window.MUSECORE_RESULT);assert.deepEqual(result.findings,[]);for(const width of [390,1024,1440]){await page.setViewportSize({width,height:1300});await page.waitForTimeout(30);const r=await page.evaluate(()=>({overflow:document.body.scrollWidth-document.documentElement.clientWidth,error:document.querySelector('#error')?.textContent,viewBox:document.querySelector('#output svg')?.getAttribute('viewBox')}));assert(r.overflow<=1,`horizontal overflow ${width}`);assert.equal(r.error,'');assert.match(r.viewBox,/^0 0 1720 /)}await page.close();}finally{await browser.close()}
});
