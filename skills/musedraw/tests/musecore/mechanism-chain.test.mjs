import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import demo from '../../assets/musecore/mechanism-chain-demo.json' with {type:'json'};
import {mechanismChainModel} from '../../scripts/musecore/mechanism-chain-models.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const clone=structuredClone;
async function browserBundle(){
 const dir=path.resolve(here,'../../scripts/musecore');
 const files=['svg.mjs','visual-tools.mjs','mechanism-chain-models.mjs','mechanism-chain-figures.mjs'];
 const parts=[];for(const f of files){let code=await fs.readFile(path.join(dir,f),'utf8');code=code.replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');parts.push(code)}return parts.join('\n');
}
function bad(change,rx){const b=clone(demo);change(b);assert.throws(()=>mechanismChainModel(b),rx)}

test('mechanism chain preserves ordered scales, intervals and source lineage',()=>{
 const m=mechanismChainModel(demo);assert.deepEqual(m.order,['light','kinase','stoma','flux','carbon']);assert.equal(m.head,'light');assert.equal(m.tail,'carbon');assert.deepEqual(m.scales.map(s=>s.id),['molecular','cellular','organism']);assert.deepEqual(m.nodes[2].interval,{low:2,high:2.8});assert.equal(m.traceability.linkSources.at(-1).evidence,'inferred-link');
});

test('mechanism chain rejects unsupported inference and broken topology',()=>{
 bad(b=>b.nodes[2].interval.low=3,/bracket value/);
 bad(b=>b.links.pop(),/nodes-1/);
 bad(b=>b.links[1].to='light',/scale|single chain|cycle|input must/);
 bad(b=>b.links[2].evidence='statistically-significant',/unsupported/);
 bad(b=>b.nodes[0].sourceIds=['missing'],/unknown source/);
 bad(b=>b.nodes[0].scale='organism',/move from|input must/);
 bad(b=>b.nodes[0].role='mediator',/exactly one input/);
 bad(b=>b.nodes[1].value=-1,/nonnegative/);
 bad(b=>b.scales[1].id='molecular',/ordered/);
});

test('mechanism chain renders in a real browser under narrow viewport and font pressure',{timeout:120000},async()=>{
 const bundle=await browserBundle(),{pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{const page=await browser.newPage({viewport:{width:2300,height:1400}});await page.setContent(`<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#eee}#out{overflow:auto;background:white;width:max-content}</style><div id="out"></div><script>${bundle};window.ready=true</script>`);await page.waitForFunction(()=>window.ready===true);
  for(const pressure of [0,40]){
   const r=await page.evaluate(({seed,pressure})=>{let old;if(pressure){old=CanvasRenderingContext2D.prototype.measureText;CanvasRenderingContext2D.prototype.measureText=function(t){const m=old.call(this,t);return new Proxy(m,{get(o,k){if(k==='width')return Reflect.get(o,k,o)+pressure;if(k==='fontBoundingBoxAscent')return Reflect.get(o,k,o)+pressure;return Reflect.get(o,k,o)}})}};try{const svg=mechanismChainFigure(seed);document.querySelector('#out').replaceChildren(svg);const texts=[...svg.querySelectorAll('text')].map(e=>{const b=e.getBBox();return {text:e.textContent,x:b.x,y:b.y,w:b.width,h:b.height}});const boxes=[...svg.querySelectorAll('[data-role=mechanism-node]')].map(e=>{const q=e.getBBox();return {id:e.dataset.node,b:{x:q.x,y:q.y,width:q.width,height:q.height}}});const geometry=JSON.parse(svg.dataset.geometry);return {geometry,texts,boxes,svg:svg.outerHTML,links:svg.querySelectorAll('[data-role=mechanism-link]').length,intervals:svg.querySelectorAll('[data-role=uncertainty-interval]').length}}finally{if(pressure)CanvasRenderingContext2D.prototype.measureText=old}}, {seed:JSON.parse(JSON.stringify(demo)),pressure});
   assert.equal(r.links,4);assert.equal(r.intervals,5);assert.equal(r.geometry.order.length,5);assert.equal(r.geometry.traceability.linkSources.length,4);for(const t of r.texts){assert(t.x>=-0.5&&t.y>=-0.5&&t.x+t.w<=r.geometry.width+0.5&&t.y+t.h<=r.geometry.height+0.5,`text overflow: ${t.text}`)}for(const b of r.boxes){assert(b.b.x>=0&&b.b.y>=0&&b.b.x+b.b.width<=r.geometry.width&&b.b.y+b.b.height<=r.geometry.height,JSON.stringify(b))}
   for(const width of [1024,390]){await page.setViewportSize({width,height:1400});const n=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,svgWidth:document.querySelector('svg').viewBox.baseVal.width}));assert(n.scrollWidth>=n.svgWidth,`narrow viewport clipped the SVG at ${width}`);assert(n.clientWidth===width)}
   if(process.env.MUSECORE_MECHANISM_OUT){const dir=path.join(process.env.MUSECORE_MECHANISM_OUT,pressure?'font-pressure':'desktop');await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'diagram.svg'),r.svg);await fs.writeFile(path.join(dir,'checks.json'),JSON.stringify({geometry:r.geometry,texts:r.texts},null,2));await page.setViewportSize({width:r.geometry.width+30,height:1400});await page.locator('svg').screenshot({path:path.join(dir,'diagram.png')})}
  }
  await page.close();
 }finally{await browser.close()}
});
