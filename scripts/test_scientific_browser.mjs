// Actual Chromium regressions for scientific motifs and measured SVG geometry.
// Uses existing Playwright/browser only; no installation or download.
// node scripts/test_scientific_browser.mjs [--out <dir>] [--playwright <module>] [--browser <executable>]
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {render} from '../skills/musedraw/scripts/engine/render.mjs';
import {prepareScene} from '../skills/musedraw/scripts/engine/validate.mjs';
import {loadTheme} from '../skills/musedraw/scripts/musedraw.mjs';
import {resolveBrowser,withSystemFonts} from '../skills/musedraw/scripts/engine/environment.mjs';
import {loadPlaywrightInfo} from '../skills/musedraw/scripts/engine/export.mjs';
import {collectMeasuredScene} from './measure_svg.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),options={};
for(let i=2;i<process.argv.length;i++){
  const flag=process.argv[i];
  if(flag==='--help'){
    console.log('Usage: node scripts/test_scientific_browser.mjs [--out <dir>] [--playwright <module>] [--browser <executable>]\nDefault: output/scientific-browser/<runid>. Existing runtime only; no downloads.');process.exit(0);
  }
  if(!['--out','--playwright','--browser'].includes(flag))throw new Error(`Unknown option: ${flag}`);
  if(!process.argv[i+1]||process.argv[i+1].startsWith('--'))throw new Error(`${flag} requires a value`);
  options[flag.slice(2)]=process.argv[++i];
}
const evidenceRoot=path.join(root,'output','scientific-browser');
let out;
if(options.out){out=path.resolve(options.out);fs.mkdirSync(out,{recursive:true});}
else{fs.mkdirSync(evidenceRoot,{recursive:true});out=fs.mkdtempSync(path.join(evidenceRoot,new Date().toISOString().replace(/[:.]/g,'-')+'-'));}
const report={scope:'Actual Chromium SVG rendering, module ownership, path geometry and source-preserving edits.',startedUTC:new Date().toISOString(),cases:[]};
const specs=[
  {kind:'graph',points:[{id:'a',x:.1,y:.3,label:'A'},{id:'b',x:.45,y:.6,label:'B'},{id:'c',x:.85,y:.2,label:'C'}],links:[{from:'a',to:'b'},{from:'b',to:'c',directed:true},{from:'a',to:'c'}]},
  {kind:'network',layers:[3,4,2]},
  {kind:'tensor',cells:[['soft','focus','warm'],['focus','warm','soft']],depth:3},
  {kind:'sequence',tracks:[{label:'RNA',segments:[{start:.05,end:.3,label:'Exon'},{start:.5,end:.95,label:'Exon'}]},{label:'DNA',segments:[{start:.1,end:.4},{start:.6,end:.9}]}],links:[{from:[0,.3],to:[1,.4]}]},
  {kind:'layers',layers:[{label:'Top',fill:'soft'},{label:'Middle',fill:'focus',pattern:'grid'},{label:'Base',fill:'warm'}]},
  {kind:'cycle',steps:['Select','Train','Review','Update'].map(label=>({label}))},
  {kind:'manifold',points:[{id:'a',x:.2,y:.35},{id:'b',x:.7,y:.2},{id:'c',x:.8,y:.65},{id:'d',x:.4,y:.8}],links:[{from:'a',to:'b'},{from:'b',to:'c'},{from:'c',to:'d'},{from:'d',to:'a'}]},
  {kind:'formula',size:32,runs:[{text:'v',sub:'i',sup:'l'},{text:' ∈ ',italic:false},{text:'ℝ',sup:[{text:'d',sub:'v'}]},{text:'γ',vector:true,sub:[{text:'α',sub:'2'}]}]},
  {kind:'laminate',size:12,layers:[{id:'film',fill:'soft'},{id:'mesh',fill:'warm'},{id:'base',fill:'neutral'}],electrodes:{layer:1},states:[{id:'rest',label:'Rest',deflection:0},{id:'load',label:'Loaded',deflection:.3,load:'F'},{id:'release',label:'Released',deflection:0}]},
  {kind:'duplex',turns:2.5,phase:17,amplitude:22,rungs:9,markerRadius:9,markerOffset:6,strands:[{id:'a',fill:'#405BB7'},{id:'b',fill:'#405BB7'}],sites:[{id:'CG1',at:.08,marks:['a'],label:'Me'},{id:'CG2',at:.42,marks:['a','b']},{id:'CG3',at:.7,marks:[]}]}
];
function motif(spec,id=spec.kind,x=130,y=110,w=280,h=190){return {type:'scientific',id,x,y,w,h,...structuredClone(spec)};}
function sceneFor(spec){
  if(spec.kind==='laminate')return {theme:'journal',size:[1000,420],header:false,footer:false,autoFit:false,blocks:[motif(spec,'laminate',70,110,860,200)],texts:[{id:'editable-name',nativeModule:'laminate',x:70,y:65,text:'laminate name',size:20}]};
  return {theme:'journal',size:[700,430],header:false,footer:false,autoFit:false,blocks:[motif(spec)],texts:[{id:'editable-name',nativeModule:spec.kind,x:130,y:65,text:`${spec.kind} name`,size:20}]};
}
function combined(){
  return {theme:'journal',size:[1080,620],header:false,footer:false,autoFit:false,
    blocks:[motif(specs[0],'left',100,100,300,200),motif(specs[2],'right',650,100,280,200),motif({kind:'formula',size:24,enclosure:'circle',runs:[{text:'v',sub:'i',sup:'l'}]},'state',460,170,62,62)],
    nodes:[{id:'ordinary-source',x:150,y:440,w:200,h:65,label:'Raw observations'},{id:'ordinary-target',x:700,y:440,w:200,h:65,label:'Retained result'}],
    edges:[{id:'ordinary-link',from:'ordinary-source',to:'ordinary-target',label:'Regular connection'},{id:'motif-link',from:'left',to:'right',label:'Between motifs',route:'straight'}],
    texts:[{id:'left-name',nativeModule:'left',x:100,y:65,text:'Graph name',size:20},{id:'right-name',nativeModule:'right',x:650,y:65,text:'Tensor name',size:20},{id:'ordinary-label',x:150,y:560,text:'Ordinary annotation',size:18}]};
}
function comparison(kind){
  const scientific = kind==='duplex'
    ? {kind,turns:1,phase:0,amplitude:18,markerRadius:7,markerOffset:3,
       strands:[{id:'a',fill:'#435D72'},{id:'b',fill:'#A7BBC9'}],
       sites:[{id:'p',name:'p',at:.125,marks:['a']},{id:'q',name:'q',at:.625,marks:[]}]}
    : {kind,layers:[{id:'film',fill:'#91B7C1'},{id:'core',fill:'#D0A174'}],electrodes:{layer:1}};
  const states=kind==='duplex'?[undefined,{marks:{q:['a','b']}},{marks:{p:[],q:['b']}}]
    :[{deflection:0},{deflection:.25,load:'F'},{deflection:0}];
  return {theme:'journal',size:[1200,430],header:false,footer:false,autoFit:false,
    blocks:[{type:'object-views',id:'states',x:45,y:75,w:1110,h:270,gap:35,
      entities:[{id:'object',label:'Shared object',extent:[.95,.75],scientific}],
      views:states.map((state,i)=>({id:'v'+i,label:['Initial','Changed','Final'][i],
        items:[{entity:'object',at:[.5,.55],showLabel:true,...(state?{state}:{})}]}))}],
    texts:[{id:'editable-name',nativeModule:'states-v0-object',x:45,y:40,text:kind+' comparison',size:20}]};
}
const comparisonCases=['duplex','laminate'].map(kind=>[kind+'-comparison',comparison(kind)]);
function graphDetail(){
  return {theme:'journal',size:[1200,600],header:false,footer:false,autoFit:false,
    blocks:[{type:'graph-view',id:'detail',source:'overview',select:['a','b','c'],x:740,y:220,w:370,h:300,padding:36,guidePoints:['b','c'],labelSize:20},
      motif({...specs[0],diameter:16,points:[...specs[0].points,{id:'outside',x:.9,y:.9,label:'Outside'}],links:[...specs[0].links,{from:'c',to:'outside'}]},'overview',65,90,500,340)],
    texts:[{id:'editable-name',nativeModule:'overview',x:65,y:50,text:'Graph overview',size:20}]};
}
const detailCases=[['graph-detail',graphDetail()]];
function near(a,b,message,tolerance=.002){assert.equal(a.length,b.length,message);a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<=tolerance,`${message}: ${v} != ${b[i]} at ${i}`));}
function moduleOf(item,native){const groups=new Map(native.groups.map(g=>[g.id,g]));let p=item.kind?item.id:item.parent;while(p){const g=groups.get(p);if(g.kind==='module')return g.sourceId;p=g.parent;}return null;}
let browser;
try{
  const {pw}=await loadPlaywrightInfo(options.playwright),found=resolveBrowser(pw,{browser:options.browser});
  report.runtime={browserSource:found.source,fontMode:'system'};
  browser=await pw.chromium.launch({headless:true,executablePath:found.executablePath});
  const page=await browser.newPage();await page.route(/^https?:\/\//,route=>route.abort());
  const theme=await loadTheme('journal');
  async function load(source){const svg=withSystemFonts(render(source,theme));await page.setViewportSize({width:source.size[0],height:source.size[1]});await page.setContent(`<html><head><meta charset="utf-8"><style>body{margin:0}svg{display:block}</style></head><body>${svg}</body></html>`);await page.evaluate(()=>document.fonts.ready);return svg;}
  for(const [name,source] of [...specs.map(s=>[s.kind,sceneFor(s)]),['combined',combined()],...comparisonCases,...detailCases]){
    const dir=path.join(out,name);fs.mkdirSync(dir,{recursive:true});const result={name,passed:false};report.cases.push(result);
    try{
      fs.writeFileSync(path.join(dir,'scene.json'),JSON.stringify(source,null,2));
      const prepared=prepareScene(source,theme),svg=await load(source);fs.writeFileSync(path.join(dir,'diagram.svg'),svg);
      await page.screenshot({path:path.join(dir,'diagram.png')});await page.screenshot({path:path.join(dir,'preview.jpg'),type:'jpeg',quality:85});
      const native=await page.evaluate(collectMeasuredScene);
      assert.doesNotMatch(svg,/<image\b|foreignObject|data:image|shape=image/i);
      assert.equal(native.edges.length,prepared.edges.length,'every scene edge must survive exactly once');
      result.modules=[];
      for(const module of prepared.nativeModules){
        const sourceId=`scientific-${module.id}`,group=native.groups.find(g=>g.sourceId===sourceId&&g.kind==='module');assert.ok(group,`missing module ${module.id}`);
        const expectedNodes=prepared.nodes.filter(n=>n.nativeModule===module.id);
        for(const n of expectedNodes){const g=native.groups.find(g=>g.sourceId===n.id&&g.kind==='node');assert.ok(g,`missing node ${n.id}`);assert.equal(moduleOf(g,native),sourceId,`node ${n.id} escaped module`);}
        const dom=await page.evaluate(id=>{const m=document.getElementById(id);return {nodeIds:[...m.querySelectorAll('g[data-md="node"]')].map(e=>e.id),texts:[...m.querySelectorAll('text')].filter(e=>e.textContent.trim()).length,shapes:[...m.querySelectorAll('rect,circle,ellipse,path,line,polygon,polyline')].filter(e=>!e.closest('[data-md="edge"]')).filter(e=>{const s=getComputedStyle(e);return s.fill!=='none'||s.stroke!=='none';}).length,bounds:JSON.parse(JSON.stringify(m.getBoundingClientRect()))};},sourceId);
        assert.deepEqual(new Set(dom.nodeIds),new Set(expectedNodes.map(n=>n.id)));
        const shapes=native.shapes.filter(s=>moduleOf(s,native)===sourceId),texts=native.texts.filter(t=>moduleOf(t,native)===sourceId);
        assert.equal(shapes.length,dom.shapes,`${module.id}: every painted primitive must stay in module`);assert.equal(texts.length,dom.texts,`${module.id}: every text must stay in module`);
        assert.ok(shapes.length>0&&texts.length>0);assert.ok(dom.bounds.width>0&&dom.bounds.height>0);
        if(expectedNodes.some(n=>n.id.includes('-sheet-'))){assert.equal(expectedNodes.length,19,'3-depth 2x3 tensor needs 18 cells and anchor');assert.equal(shapes.length,18);}
        if(name==='manifold'){
          assert.equal(expectedNodes.length,5,'manifold needs four explicit point nodes and anchor');
          const wireframe=shapes.filter(s=>s.tag==='path');assert.equal(wireframe.length,3,'manifold needs three real ellipse paths');
          assert.ok(wireframe.every(s=>s.fill==='none'&&s.stroke!=='none'&&s.width>0));
          assert.ok(wireframe.some(s=>s.box[2]>s.box[3]*3),'horizontal ellipse must have actual flattened bounds');
          assert.ok(wireframe.some(s=>s.box[3]>s.box[2]*3),'vertical ellipse must have actual flattened bounds');
          assert.equal(shapes.length,7,'native manifold must retain three wireframe paths and four point shapes');
          result.wireframe={ellipses:wireframe.length,points:4,bounds:wireframe.map(s=>s.box)};
        }
        if(name==='duplex'){
          assert.equal(expectedNodes.length,4,'duplex needs three marked sites and one module anchor');
          assert.equal(shapes.filter(s=>s.tag==='path').length,11,'two backbones and nine explicit rungs must survive');
          assert.equal(shapes.filter(s=>s.tag==='circle'||s.tag==='ellipse').length,3,'all three independent markers must survive');
          assert.equal(texts.filter(t=>t.value==='Me').length,1,'site label must remain live native text');
          result.duplex={backbones:2,rungs:9,markers:3};
        }
        const edges=prepared.edges.filter(e=>e.nativeModule===module.id);assert.equal(native.edges.filter(e=>edges.some(p=>p.id===e.id)).length,edges.length);
        result.modules.push({id:module.id,nodes:expectedNodes.length,shapes:shapes.length,texts:texts.length,edges:edges.length});
      }
      if(name==='graph-detail'){
        const guides=native.edges.filter(e=>e.id.startsWith('detail/guide/'));
        assert.equal(guides.length,2);assert.ok(guides.every(e=>!e.parent),'guides must remain outside both native modules');
        assert.equal(prepared.edges.filter(e=>e.nativeModule==='detail').length,3);
        assert.ok(!native.groups.some(g=>g.sourceId==='detail-outside'));
        const overflow=await page.evaluate(()=>[...document.querySelectorAll('#scientific-detail text')].map(e=>e.getBoundingClientRect()).some(b=>b.left<740||b.top<220||b.right>1110||b.bottom>520));
        assert.equal(overflow,false,'real browser glyph bounds fit detail frame');
        result.detail={sourceOrderIndependent:true,inducedEdges:3,excludedOutsideNode:true,rootGuides:2,realGlyphsFit:true};
      }
      if(name==='combined'){
        for(const id of ['ordinary-source','ordinary-target']){const g=native.groups.find(g=>g.sourceId===id);assert.ok(g);assert.equal(moduleOf(g,native),null);}
        for(const id of ['ordinary-link','motif-link'])assert.ok(native.edges.some(e=>e.id===id),`ordinary edge ${id} missing`);
        for(const value of ['Raw observations','Retained result','Regular connection','Between motifs','Ordinary annotation']){const t=native.texts.find(t=>t.value===value);assert.ok(t,`ordinary label ${value} missing`);assert.equal(moduleOf(t,native),null);}
      }
      const renamed=structuredClone(source);renamed.texts[0].text='Independently renamed module';
      await load(renamed);const after=await page.evaluate(collectMeasuredScene);
      assert.deepEqual(after.shapes.map(s=>[s.box,s.matrix,s.attributes]),native.shapes.map(s=>[s.box,s.matrix,s.attributes]),'changing one module name must not move or change a shape');
      assert.deepEqual(after.edges,native.edges,'changing one name must not change edge geometry/topology');
      assert.deepEqual(after.groups.filter(g=>g.kind==='node').map(g=>[g.sourceId,g.box]),native.groups.filter(g=>g.kind==='node').map(g=>[g.sourceId,g.box]),'changing one name must not move nodes');
      assert.equal(after.texts.filter(t=>t.value==='Independently renamed module').length,1);
      result.rename={sourceNameEditKeepsShapes:true};result.passed=true;
    }catch(error){result.error=error.stack;fs.writeFileSync(path.join(dir,'failure.txt'),error.stack);}
    console.log(`${result.passed?'PASS':'FAIL'} ${name}`);
  }
}catch(error){report.error=error.stack;}
finally{if(browser)await browser.close();report.passed=!report.error&&report.cases.length===specs.length+1+comparisonCases.length+detailCases.length&&report.cases.every(c=>c.passed);report.finishedUTC=new Date().toISOString();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(`Evidence: ${out}`);if(!report.passed)process.exitCode=1;}
