// Import/edit/save/reopen native scene exports with the official mxGraph
// runtime supplied by the caller. This does not certify the remote editor UI.
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {inflateRawSync} from 'node:zlib';
import assert from 'node:assert/strict';
const args=process.argv.slice(2),get=k=>args[args.indexOf(k)+1];
for(const key of ['--runtime','--output','--documents'])if(!args.includes(key))throw Error(`${key} is required`);
const {loadPlaywright,fontStylesheets,FONT_PACKAGES}=await import('../skills/musedraw/scripts/engine/export.mjs');
const pw=await loadPlaywright(args.includes('--playwright')?get('--playwright'):undefined);
const browser=await pw.chromium.launch({headless:true,...(args.includes('--browser')?{executablePath:get('--browser')}:{})});
const output=path.resolve(get('--output'));await fs.mkdir(output,{recursive:true});
const directories=args.slice(args.indexOf('--documents')+1);
const report={scope:'Official mxGraph native import, edit, move, terminal binding, save and reopen; not the remote editor UI',results:[]};
try{
 const page=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://**/*',r=>r.abort());
 const fonts=fontStylesheets(`font-family="${Object.keys(FONT_PACKAGES).join(',')}"`,[path.resolve('skills/musedraw/node_modules')]);
 const fixture=path.join(output,'native.html');
 await fs.writeFile(fixture,`<!doctype html><meta charset="utf-8">${fonts.links.map(href=>`<link rel="stylesheet" href="${href}">`).join('')}<div id="graph" style="position:absolute;inset:0;background:white"></div>`);
 await page.goto(pathToFileURL(fixture).href);
 await page.evaluate(()=>{window.mxLoadResources=false;window.mxLoadStylesheets=false;window.mxBasePath='';window.mxImageBasePath='';});
 await page.addScriptTag({path:path.resolve(get('--runtime'))});
 await page.evaluate(()=>{
  window.graph=new mxGraph(document.getElementById('graph'));graph.setHtmlLabels(false);
  window.loadModel=xml=>{const doc=mxUtils.parseXml(xml);new mxCodec(doc).decode(doc.querySelector('mxGraphModel'),graph.model);graph.refresh();graph.fit(24);graph.center(true,true);};
 });
 for(const directory of directories){
  const xml=await fs.readFile(path.join(directory,'diagram.drawio'),'utf8');
  assert.doesNotMatch(xml,/data:image|<image\b|shape=image|image=/i);
  const stencils=Object.fromEntries([...xml.matchAll(/shape=stencil\(([^)]*)\)/g)].map(m=>['stencil('+m[1]+')',decodeURIComponent(inflateRawSync(Buffer.from(m[1],'base64')).toString())]));
  const checked=await page.evaluate(async ({xml,stencils})=>{
   for(const [name,definition] of Object.entries(stencils))mxStencilRegistry.addStencil(name,new mxStencil(mxUtils.parseXml(definition).documentElement));
   loadModel(xml);await document.fonts.ready;graph.refresh();graph.fit(24);graph.center(true,true);
   const cells=Object.values(graph.model.cells),vertices=cells.filter(c=>c.vertex),edges=cells.filter(c=>c.edge),texts=vertices.filter(c=>String(c.value||'').trim());
   const missing=cells.filter(c=>(c.vertex||c.edge)&&!graph.view.getState(c)).map(c=>c.id);
   const unrendered=texts.filter(c=>!graph.view.getState(c).text).map(c=>c.id);
   const badEdges=edges.filter(c=>!c.source?.vertex||!c.target?.vertex||graph.view.getState(c).absolutePoints.length<2).map(c=>c.id);
   const node=edges[0]?.source||vertices.find(c=>c.style.startsWith('group;'))||texts[0],text=texts[0];
   const before={x:node.geometry.x,y:node.geometry.y},edge=edges.find(c=>c.source===node||c.target===node),edgeBefore=edge&&JSON.stringify(graph.view.getState(edge).absolutePoints),source=edge?.source.id,target=edge?.target.id;
   const edited='编辑 & <校验> '+text.value;graph.labelChanged(text,edited,false);graph.moveCells([node],12,18);graph.refresh();
   const edgeMoved=!edge||edgeBefore!==JSON.stringify(graph.view.getState(edge).absolutePoints);
   const saved=mxUtils.getXml(new mxCodec().encode(graph.model));loadModel('<mxfile><diagram>'+saved+'</diagram></mxfile>');
   const reopened=graph.model.getCell(node.id),reopenedEdge=edge&&graph.model.getCell(edge.id);
   return {vertices:vertices.length,texts:texts.length,edges:edges.length,missing,unrendered,badEdges,edited:graph.model.getCell(text.id).value===edited,moved:reopened.geometry.x===before.x+12&&reopened.geometry.y===before.y+18,edgeMoved,endpoints:!edge||(reopenedEdge.source.id===source&&reopenedEdge.target.id===target)};
  },{xml,stencils});
  for(const key of ['missing','unrendered','badEdges'])assert.deepEqual(checked[key],[],`${directory}: ${key}`);
  for(const key of ['edited','moved','edgeMoved','endpoints'])assert.equal(checked[key],true,`${directory}: ${key}`);
  if(report.results.length<6){await page.evaluate(xml=>loadModel(xml),xml);await page.screenshot({path:path.join(output,`${path.basename(directory)}.png`)});}
  report.results.push({case:path.basename(directory),...checked,passed:true});console.log(JSON.stringify(report.results.at(-1)));
 }
 assert.deepEqual(errors,[]);report.passed=true;
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
}finally{await browser.close();}
