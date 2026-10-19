// Metadata-only coverage of standalone scientific module text, using real glyphs
// and the existing semantic-connector checks. No screenshots or hand-built XML.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {render} from '../skills/musedraw/scripts/engine/render.mjs';
import {prepareScene} from '../skills/musedraw/scripts/engine/validate.mjs';
import {loadTheme} from '../skills/musedraw/scripts/musedraw.mjs';
import {resolveBrowser,withSystemFonts} from '../skills/musedraw/scripts/engine/environment.mjs';
import {loadPlaywrightInfo,exportScene} from '../skills/musedraw/scripts/engine/export.mjs';

if(process.argv.includes('--help')){console.log('node scripts/test_module_callout_checks_browser.mjs [--out directory] [--failed-svg file --repaired-svg file --source-scene file]');process.exit(0);}
const option=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1];};
const out=path.resolve(option('--out','output/module-callout-checks-browser'));fs.mkdirSync(out,{recursive:true});
const theme=await loadTheme('journal'),{pw}=await loadPlaywrightInfo(),found=resolveBrowser(pw);
const browser=await pw.chromium.launch({headless:true,executablePath:found.executablePath});
const report={scope:'Module standalone freeText metadata only; existing transformed glyph/semantic connector checks. No new author API or PNG.',cases:[],failures:[]};
const collisions=r=>r.warnings.filter(w=>w.type==='text-edge-collision');
const base={theme:'journal',size:[600,420],header:false,footer:false,autoFit:false};
// Public scientific sequence route: its track name is standalone text, whereas
// its domain name is node-owned text and must never receive a second marker.
const original={...base,blocks:[{type:'scientific',kind:'sequence',id:'binding',x:250,y:100,w:200,h:100,size:20,bandHeight:40,
  tracks:[{label:'Binding callout',segments:[{start:.2,end:.8,label:'Domain'}]}]}],
  nodes:[{id:'source',x:40,y:140,w:20,h:20,label:''},{id:'readout',x:270,y:140,w:20,h:20,label:''}],
  edges:[{id:'readout-wire',from:'source',to:'readout',fromSide:'r',toSide:'l',route:'straight',arrow:'none',width:2}]};
const expanded=prepareScene(structuredClone(original),theme);expanded.blocks=[];
const callout=expanded.texts.find(t=>t.text==='Binding callout');assert.ok(callout?.nativeModule);
const fixture=(change={},edgeChange={})=>({...structuredClone(expanded),texts:expanded.texts.map(t=>t===callout?{...t,...change}:{...t}),edges:expanded.edges.map(e=>({...e,...edgeChange}))});
async function stripMetadata(svg){const page=await browser.newPage();try{await page.setContent(svg);return await page.evaluate(()=>{for(const g of document.querySelectorAll('[data-md-free-text]'))g.replaceWith(...g.childNodes);return document.querySelector('svg').outerHTML;});}finally{await page.close();}}
async function inspectPaint(svg){const page=await browser.newPage();try{await page.setContent(svg);await page.evaluate(async()=>await document.fonts.ready);return await page.evaluate(()=>[...document.querySelectorAll('svg *')].filter(e=>!['g','defs','title','desc'].includes(e.localName)&&!e.closest('defs')).map(e=>{const attrs=[...e.attributes].map(a=>[a.name,a.value]).sort(),s=getComputedStyle(e),b=e.getBBox?.(),m=e.getCTM?.();return {tag:e.localName,attrs,text:e.localName==='text'?e.textContent:undefined,box:b?[b.x,b.y,b.width,b.height]:null,matrix:m?[m.a,m.b,m.c,m.d,m.e,m.f]:null,paint:[s.fill,s.stroke,s.strokeWidth,s.opacity,s.fontSize,s.fontFamily,s.display,s.visibility]};}));}finally{await page.close();}}
async function run(name,svg,verify){const dir=path.join(out,name);fs.mkdirSync(dir,{recursive:true});const checks=await exportScene({svg,outDir:dir,browser,fontDirs:[],fontMode:'system',images:false});fs.writeFileSync(path.join(dir,'checks.json'),JSON.stringify(checks,null,2)+'\n');const xml=fs.readFileSync(path.join(dir,'diagram.drawio'),'utf8');const item={name,warnings:checks.warnings,native:checks.drawio};report.cases.push(item);try{verify(checks,xml);item.passed=true;}catch(e){item.passed=false;item.error=e.message;report.failures.push({name,error:e.message});}return {checks,xml};}
async function check(name,source,expected,alter=x=>x){const svg=alter(withSystemFonts(render(source,theme))),prior=await stripMetadata(svg);const first=await run(name,svg,(r,xml)=>{assert.equal(collisions(r).length,expected);assert.equal(r.drawio.native,true);assert.match(xml,/source="[^"]+" target="[^"]+"/);});const before=await run(name+'-without-free-markers',prior,()=>{});assert.equal(first.xml,before.xml,'metadata must preserve native paths, text, grouping, source and target');assert.deepEqual(await inspectPaint(svg),await inspectPaint(prior),'metadata must preserve actual paint, transform and glyph geometry');return svg;}
try{
 const svg=await check('scientific-sequence-callout',original,1);
 const page=await browser.newPage();await page.setContent(svg);const markers=await page.evaluate(()=>({free:[...document.querySelectorAll('[data-md-free-text]')].map(g=>g.dataset.mdFreeText),inside:document.querySelectorAll('g[data-md="node"] [data-md-free-text]').length,point:document.querySelectorAll('[data-md-point-label] [data-md-free-text]').length}));await page.close();
 try{assert.deepEqual(markers,{free:[callout.id],inside:0,point:0});}catch(e){report.failures.push({name:'stable-marker-identity',error:e.message});}
 await check('transparent-module-callout',fixture({opacity:0}),0);
 await check('hidden-module-callout',fixture(),0,s=>s.replace('<g id="scientific-binding"','<g visibility="hidden" id="scientific-binding"'));
 await check('transparent-connector',fixture(),0,s=>s.replace('<g data-md-connector-path="1">','<g data-md-connector-path="1" opacity="0">'));
 await check('rotated-module-crossing',fixture({x:150,y:150,text:'Rotation',anchor:'start',rotate:45}),1,s=>s.replace(/(<g data-md-connector-path="1"><path d=")[^"]+/, '$1M175 175L215 175'));
 await check('rotated-module-bounds-clear',fixture({x:150,y:150,text:'Rotation',anchor:'start',rotate:45}),0,s=>s.replace(/(<g data-md-connector-path="1"><path d=")[^"]+/, '$1M146 195L164 195'));
 await check('wrapped-module-row-crossing',fixture({x:120,y:120,text:'Longer label wraps here',w:90,anchor:'start',lineHeight:3}),1,s=>s.replace(/(<g data-md-connector-path="1"><path d=")[^"]+/, '$1M125 170L185 170'));
 await check('wrapped-module-gap-clear',fixture({x:120,y:120,text:'Longer label wraps here',w:90,anchor:'start',lineHeight:3}),0,s=>s.replace(/(<g data-md-connector-path="1"><path d=")[^"]+/, '$1M125 145L185 145'));
 const artwork=fixture();artwork.edges=[];artwork.paths.push({id:'binding-own-leader',nativeModule:'binding',d:'M60 150H270',fill:'none',stroke:'#333333',width:2});
 await run('own-leader-artwork-excluded',withSystemFonts(render(artwork,theme)),r=>assert.equal(collisions(r).length,0));
 const point=fixture({pointLabel:'site'});await check('point-label-precedence',point,1);const pointSvg=render(point,theme);assert.match(pointSvg,/data-md-point-label="site"/);assert.doesNotMatch(pointSvg,/data-md-free-text/);
 const failed=option('--failed-svg'),repaired=option('--repaired-svg'),source=option('--source-scene');assert.equal([failed,repaired,source].filter(Boolean).length,failed?3:0,'provide all frozen fixture arguments');
 if(failed){
  const scene=JSON.parse(fs.readFileSync(source,'utf8').replace(/^\uFEFF/,''));
  // Borrow only stable checker IDs from the production renderer. Existing SVG
  // glyph/path positions remain frozen; no scene regeneration or PNG rerender.
  const production=withSystemFonts(render(scene,theme)),page=await browser.newPage();await page.setContent(production);
  const ids=await page.evaluate(()=>[...document.querySelectorAll('g[data-md="module"]')].map(g=>({module:g.id,labels:[...g.querySelectorAll('[data-md-free-text]')].map(w=>({id:w.dataset.mdFreeText,text:w.textContent}))})));await page.close();
  for(const [name,file,expected]of [['frozen-after',failed,2],['frozen-repair02',repaired,0]]){
   const old=fs.readFileSync(file,'utf8');await run(name+'-original-markers',old,r=>assert.equal(collisions(r).length,0));
   const page=await browser.newPage();await page.setContent(old);
   const annotated=await page.evaluate(modules=>{for(const module of modules){const g=document.getElementById(module.module);if(!g)continue;const standalone=[...g.querySelectorAll('text')].filter(t=>!t.closest('g[data-md="node"],g[data-md="edge-label"],[data-md-point-label]'));for(const [i,t]of standalone.entries()){const identity=module.labels[i];if(!identity)continue;if(identity.text!==t.textContent)throw Error('Frozen text order differs');let outer=t;while(outer.parentElement!==g)outer=outer.parentElement;const wrap=document.createElementNS('http://www.w3.org/2000/svg','g');wrap.setAttribute('data-md-free-text',identity.id);outer.replaceWith(wrap);wrap.append(outer);}}return document.querySelector('svg').outerHTML;},ids);await page.close();
   assert.deepEqual(await inspectPaint(annotated),await inspectPaint(old));
   const a=await run(name+'-module-markers',annotated,r=>{assert.equal(collisions(r).length,expected);if(expected)assert.ok(collisions(r).every(w=>w.id.endsWith('-sensitive-label')&&w.edge.includes('right')));});
   const oldXML=fs.readFileSync(path.join(out,name+'-original-markers','diagram.drawio'),'utf8');assert.equal(a.xml,oldXML);fs.writeFileSync(path.join(out,name+'-metadata-only.svg'),annotated);
  }
 }
 report.passed=!report.failures.length;
}finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
assert.deepEqual(report.failures,[]);console.log(JSON.stringify({passed:report.passed,cases:report.cases.length,out}));
