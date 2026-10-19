// Real browser regressions for measured graph captions and connected edges.
// Uses the existing runtime/browser; no downloads. Artifacts stay under output/.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {render} from '../skills/musedraw/scripts/engine/render.mjs';
import {prepareScene} from '../skills/musedraw/scripts/engine/validate.mjs';
import {loadTheme} from '../skills/musedraw/scripts/musedraw.mjs';
import {resolveBrowser,withSystemFonts} from '../skills/musedraw/scripts/engine/environment.mjs';
import {loadPlaywrightInfo,exportScene} from '../skills/musedraw/scripts/engine/export.mjs';

if(process.argv.includes('--help')){console.log('node scripts/test_point_caption_browser.mjs [--out directory]');process.exit(0);}
const index=process.argv.indexOf('--out');
const out=path.resolve(index<0?'output/point-caption-browser':process.argv[index+1]);
fs.mkdirSync(out,{recursive:true});
const {pw}=await loadPlaywrightInfo(),found=resolveBrowser(pw);
const browser=await pw.chromium.launch({executablePath:found.executablePath,headless:true});
const theme=await loadTheme('journal');
const block=(points,links=[])=>({type:'scientific',id:'graph',kind:'graph',x:80,y:70,w:360,h:260,diameter:20,size:20,points,links});
const scene=b=>({theme:'journal',size:[600,450],header:false,footer:false,autoFit:false,blocks:[b]});
const vertical=side=>scene(block([{id:'top',x:.5,y:.15,label:'A'},{id:'bottom',x:.5,y:.85,label:'B',...(side?{labelPos:side}:{})}],[{from:'top',to:'bottom'}]));
const base=vertical(),moved=vertical('right');
const a=prepareScene(base,theme),b=prepareScene(moved,theme);
assert.deepEqual(a.edges,b.edges,'caption placement must preserve topology and connection geometry');
assert.deepEqual(a.nodes,b.nodes,'caption placement must preserve node geometry');
const report={startedUTC:new Date().toISOString(),scope:'Real browser glyph bounds versus authored connector segments; not aesthetic or scientific certification.',cases:[]};
async function check(name,source,verify,alterSvg=x=>x){
  const dir=path.join(out,name);fs.mkdirSync(dir,{recursive:true});
  const svg=alterSvg(withSystemFonts(render(source,theme)));
  const result=await exportScene({svg,outDir:dir,browser,fontDirs:[],fontMode:'system',images:false});
  assert.equal(result.drawio.native,true);
  const xml=fs.readFileSync(path.join(dir,'diagram.drawio'),'utf8');
  assert.doesNotMatch(xml,/<image\b|data:image|shape=image/);
  assert.match(xml,/source="[^"]+" target="[^"]+"/,'edges keep native terminals');
  verify(result);
  report.cases.push({name,passed:true,warnings:result.warnings});
}
const collisions=r=>r.warnings.filter(w=>w.type==='text-edge-collision');
try{
  await check('incident-vertical',base,r=>{
    assert.equal(collisions(r).length,1);
    assert.equal(collisions(r)[0].point,'bottom');assert.equal(collisions(r)[0].edge,'graph-bond-0');
    assert.ok(collisions(r)[0].id,'caption identity is reported');assert.equal(r.passed,false);
  });
  await check('caption-right',moved,r=>{assert.deepEqual(r.warnings,[]);assert.equal(r.passed,true);});
  // The diagonal's broad bounds cover the caption, but its actual line does not.
  const diagonal=scene(block([{id:'a',x:0,y:0},{id:'b',x:1,y:1},{id:'label',x:.15,y:.8,label:'Safe',labelPos:'right'}],[{from:'a',to:'b'}]));
  await check('diagonal-clear',diagonal,r=>assert.deepEqual(r.warnings,[]));
  // Regression for captions in the same scientific module (previously skipped).
  const crowded=scene(block([{id:'a',x:.5,y:.5,label:'Repeated caption'},{id:'b',x:.51,y:.5,label:'Repeated caption'}],[{from:'a',to:'b'}]));
  await check('same-module-captions',crowded,r=>assert.ok(r.warnings.some(w=>w.type==='text-collision')));
  // A separate module's bond is not exempt from caption clearance.
  const cross=scene(block([{id:'label',x:.5,y:.5,label:'Caption',labelPos:'right'}]));
  cross.blocks.push({...block([{id:'a',x:.4,y:.5},{id:'b',x:.9,y:.5}],[{from:'a',to:'b'}]),id:'other'});
  await check('other-module-bond',cross,r=>assert.ok(collisions(r).some(w=>w.edge==='other-bond-0')));
  // Exercise cubic control points through real rendered curve metadata.
  const curve=structuredClone(cross);curve.blocks.pop();
  curve.nodes=[{id:'left',x:80,y:170,w:20,h:20,label:''},{id:'right',x:480,y:210,w:20,h:20,label:''}];
  curve.edges=[{id:'curve',from:'left',to:'right',route:'curve',arrow:'none',fromSide:'r',toSide:'l'}];
  await check('curved-connector',curve,r=>assert.ok(collisions(r).some(w=>w.edge==='curve')));
  // Rounded corners remove part of the native route's sharp turn. A caption
  // safely inside that removed corner must not collide with the visible path.
  const rounded={theme:'journal',size:[600,450],header:false,footer:false,autoFit:false,style:{edge:{radius:50}},
    nodes:[{id:'left',x:80,y:100,w:40,h:20,label:''},{id:'right',x:380,y:290,w:40,h:20,label:''}],
    edges:[{id:'rounded',from:'left',to:'right',route:'straight',via:[[200,110],[200,300]],fromSide:'r',toSide:'l',arrow:'none'}],
    blocks:[{id:'graph',type:'scientific',kind:'graph',x:0,y:0,w:500,h:400,diameter:20,size:14,
      points:[{id:'label',x:182/500,y:110/400,label:'I',labelPos:'right'}],links:[]}]};
  await check('rounded-corner-clear',rounded,r=>assert.deepEqual(r.warnings,[]));
  // Caption and connector transforms are resolved to root SVG coordinates.
  await check('translated-module',base,r=>assert.equal(collisions(r).length,1),svg=>svg.replace('id="scientific-graph"','id="scientific-graph" transform="translate(10 10)"'));
  const detail=vertical('right');detail.size=[1000,500];detail.blocks.push({type:'graph-view',id:'detail',source:'graph',select:['top','bottom'],x:620,y:60,w:290,h:370,padding:28,labelSize:24});
  await check('detail-side-captions',detail,r=>assert.deepEqual(r.warnings,[]));
  report.passed=true;
}finally{
  report.finishedUTC=new Date().toISOString();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();
}
console.log(JSON.stringify({passed:report.passed,cases:report.cases.length,report:path.join(out,'report.json')}));
