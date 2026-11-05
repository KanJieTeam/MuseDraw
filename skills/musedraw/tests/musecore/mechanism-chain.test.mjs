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
function eightStageInput(){
 const b=clone(demo);
 b.nodes.splice(4,0,
  {id:'carrier',label:'膜载体转运响应与缓冲',scale:'cellular',value:3.4,interval:{low:3.0,high:3.8},sourceIds:['assay'],role:'mediator',color:'#3C8C72'},
  {id:'starch',label:'叶肉碳库短时积累',scale:'cellular',value:3.7,interval:{low:3.2,high:4.1},sourceIds:['timecourse'],role:'mediator',color:'#3C8C72'},
  {id:'export',label:'同化产物向整株输出',scale:'organism',value:4.0,interval:{low:3.6,high:4.4},sourceIds:['synthesis'],role:'mediator',color:'#B16A35'}
 );
 b.links.splice(3,1,
  {from:'flux',to:'carrier',effect:'modulates',evidence:'direct-measurement',sourceIds:['assay']},
  {from:'carrier',to:'starch',effect:'activates',evidence:'temporal',sourceIds:['timecourse']},
  {from:'starch',to:'export',effect:'modulates',evidence:'inferred-link',sourceIds:['synthesis']},
  {from:'export',to:'carbon',effect:'modulates',evidence:'inferred-link',sourceIds:['synthesis','timecourse']}
 );
 return b;
}
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
 let fontBytes;for(const file of [process.env.MUSECORE_CJK_FONT,process.env.MUSECORE_NOTO_FONT].filter(Boolean)){try{fontBytes=await fs.readFile(file);break}catch{}}
 try{const page=await browser.newPage({viewport:{width:2600,height:1600}});if(fontBytes){await page.route('https://mc-font.invalid/face',r=>r.fulfill({status:200,contentType:'font/otf',body:fontBytes}));}
  const fontSetup=fontBytes?`<script>(async()=>{const b=await(await fetch('https://mc-font.invalid/face')).arrayBuffer();const f=new FontFace('MCActualCJK',b);await f.load();document.fonts.add(f);window.fontReady=true})()</script>`:'';
  const fontBundle=fontBytes?bundle.replaceAll('Arial','MCActualCJK').replaceAll('Microsoft YaHei','MCActualCJK').replaceAll('Noto Sans CJK SC','MCActualCJK'):bundle;
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#eee}#out{overflow:auto;background:white;width:max-content}</style><div id="out"></div>${fontSetup}<script>${fontBundle};window.ready=true</script>`);await page.waitForFunction(()=>window.ready===true);if(fontBytes)await page.waitForFunction(()=>window.fontReady===true);
  for(const [seed,expected] of [[demo,5],[eightStageInput(),8]])for(const pressure of [0,40]){
   const r=await page.evaluate(({seed,pressure})=>{let old;if(pressure){old=CanvasRenderingContext2D.prototype.measureText;CanvasRenderingContext2D.prototype.measureText=function(t){const m=old.call(this,t);return new Proxy(m,{get(o,k){if(k==='width')return Reflect.get(o,k,o)+pressure;if(k==='fontBoundingBoxAscent')return Reflect.get(o,k,o)+pressure;return Reflect.get(o,k,o)}})}};try{const svg=mechanismChainFigure(seed);document.querySelector('#out').replaceChildren(svg);const texts=[...svg.querySelectorAll('text')].map(e=>{const b=e.getBBox();return {text:e.textContent,x:b.x,y:b.y,w:b.width,h:b.height}});const boxes=[...svg.querySelectorAll('[data-role=mechanism-node]')].map(e=>{const q=e.getBBox();return {id:e.dataset.node,b:{x:q.x,y:q.y,width:q.width,height:q.height}}});const geometry=JSON.parse(svg.dataset.geometry);const marker=svg.querySelector('marker path');return {geometry,texts,boxes,svg:svg.outerHTML,links:svg.querySelectorAll('[data-role=mechanism-link]').length,intervals:svg.querySelectorAll('[data-role=uncertainty-interval]').length,markerPath:!!marker}}finally{if(pressure)CanvasRenderingContext2D.prototype.measureText=old}}, {seed:JSON.parse(JSON.stringify(seed)),pressure});
   assert.equal(r.links,expected-1);assert.equal(r.intervals,expected);assert.equal(r.geometry.order.length,expected);assert.equal(r.geometry.traceability.linkSources.length,expected-1);assert(r.markerPath,'arrow marker must contain a path');for(const t of r.texts){assert(t.x>=-0.5&&t.y>=-0.5&&t.x+t.w<=r.geometry.width+0.5,`text overflow: ${t.text}`);assert(t.y+t.h<=r.geometry.height+0.5,`text overflow: ${t.text}`)}for(const b of r.boxes){assert(b.b.x>=0&&b.b.y>=0&&b.b.x+b.b.width<=r.geometry.width&&b.b.y+b.b.height<=r.geometry.height,JSON.stringify(b))}
   for(const width of [1024,390]){await page.setViewportSize({width,height:1400});const n=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,svgWidth:document.querySelector('svg').viewBox.baseVal.width}));assert(n.scrollWidth>=n.svgWidth,`narrow viewport clipped the SVG at ${width}`);assert(n.clientWidth===width)}
   if(process.env.MUSECORE_MECHANISM_OUT){const dir=path.join(process.env.MUSECORE_MECHANISM_OUT,`${expected}-stage-${fontBytes?'cjk-':''}${pressure?'pressure':'normal'}`);await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'diagram.svg'),r.svg);await fs.writeFile(path.join(dir,'checks.json'),JSON.stringify({geometry:r.geometry,texts:r.texts,fontLoaded:!!fontBytes},null,2));await page.setViewportSize({width:r.geometry.width+30,height:1400});await page.locator('svg').screenshot({path:path.join(dir,'diagram.png')})}
  }
  await page.close();
 }finally{await browser.close()}
});
