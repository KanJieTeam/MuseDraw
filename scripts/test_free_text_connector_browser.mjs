// Real browser regressions for explicit free text versus connector centerlines.
// Original fixtures only. Optional external scenes are read unchanged.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {render} from '../skills/musedraw/scripts/engine/render.mjs';
import {loadTheme} from '../skills/musedraw/scripts/musedraw.mjs';
import {resolveBrowser,withSystemFonts} from '../skills/musedraw/scripts/engine/environment.mjs';
import {loadPlaywrightInfo,exportScene} from '../skills/musedraw/scripts/engine/export.mjs';

if(process.argv.includes('--help')){
  console.log('node scripts/test_free_text_connector_browser.mjs [--out directory] [--failed-scene scene.json --repaired-scene scene.json]');
  process.exit(0);
}
function option(name,fallback){const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1];}
const out=path.resolve(option('--out','output/free-text-connector-browser'));
fs.mkdirSync(out,{recursive:true});
const {pw}=await loadPlaywrightInfo(),found=resolveBrowser(pw);
const browser=await pw.chromium.launch({executablePath:found.executablePath,headless:true});
const theme=await loadTheme('journal');
const base={theme:'journal',size:[500,350],header:false,footer:false,autoFit:false};
const text={id:'caption',x:140,y:150,text:'Measured label',size:20};
const line={id:'branch',points:[[50,142],[400,142]],color:'#333333',width:1};
const scene=(t=text,l=line)=>({...base,texts:[t],lines:[l]});
const collisions=r=>r.warnings.filter(w=>w.type==='text-edge-collision');
const report={scope:'Measured font boxes versus semantic connector/scene.lines centerlines; decorative scene.paths excluded.',cases:[]};
// Count actual browser sampling calls, without adding production telemetry.
let samples=0;
const measuredBrowser={newPage:async options=>{
  const page=await browser.newPage(options),evaluate=page.evaluate.bind(page);
  page.evaluate=async (fn,arg)=>{
    if(fn.name!=='runChecks')return evaluate(fn,arg);
    await evaluate(()=>{
      const original=SVGPathElement.prototype.getPointAtLength;
      window.mdSamples=0;
      SVGPathElement.prototype.getPointAtLength=function(...args){window.mdSamples++;return original.apply(this,args);};
    });
    const result=await evaluate(fn,arg);
    samples=await evaluate(()=>window.mdSamples);
    return result;
  };
  return page;
}};
async function check(name,source,verify,alterSvg=x=>x){
  const dir=path.join(out,name);fs.mkdirSync(dir,{recursive:true});
  const usedTheme=source.theme==='journal'?theme:await loadTheme(source.theme??'journal');
  const svg=alterSvg(withSystemFonts(render(source,usedTheme)));
  const start=performance.now();
  const result=await exportScene({svg,outDir:dir,browser:measuredBrowser,fontDirs:[],fontMode:'system',images:false});
  assert.equal(result.drawio.native,true);
  const native=fs.readFileSync(path.join(dir,'diagram.drawio'),'utf8');
  assert.doesNotMatch(native,/<image\b|data:image|shape=image/);
  verify(result,native);
  report.cases.push({name,passed:true,durationMs:Math.round(performance.now()-start),samples,warnings:result.warnings});
  return native;
}
const clear=r=>assert.deepEqual(r.warnings,[]);
try{
  const native=await check('line-crosses-label',scene(),r=>{
    assert.deepEqual(collisions(r).map(w=>[w.id,w.edge,w.connector]),[['caption','branch','line']]);
    assert.equal(r.passed,false);
  });
  // Metadata wrappers must not change native geometry, text or grouping.
  const prior=await check('metadata-native-equivalence',scene(),clear,svg=>svg.replace(/ data-md-line="[^"]*"/g,'').replace(/<g data-md-free-text="[^"]*">([\s\S]*?)<\/g>/g,'$1'));
  assert.equal(native,prior);
  await check('line-clear-label',scene(text,{...line,points:[[50,180],[400,180]]}),clear);
  await check('foreground-line',scene(text,{...line,layer:'foreground'}),r=>assert.equal(collisions(r).length,1));
  await check('fallback-identities',scene({...text,id:undefined},{...line,id:undefined}),r=>{
    assert.deepEqual(collisions(r).map(w=>[w.id,w.edge]),[['free-text-1','line-1']]);
  });
  // Actual cubic is far above this text although its bounds cover the text.
  await check('curve-bounds-clear',scene({...text,x:180,y:200,text:'Safe'}),clear,svg=>svg.replace(/(data-md-line="branch" d=")[^"]+/, '$1M50 250 C50 30 350 30 350 250'));
  await check('curve-crosses-label',scene({...text,x:180,y:95,text:'Cross'}),r=>assert.equal(collisions(r).length,1),svg=>svg.replace(/(data-md-line="branch" d=")[^"]+/, '$1M50 250 C50 30 350 30 350 250'));
  await check('rotated-bounds-clear',scene({...text,x:150,y:150,text:'Rotation',rotate:45},{...line,points:[[146,195],[164,195]]}),clear);
  await check('rotated-crossing',scene({...text,x:150,y:150,text:'Rotation',rotate:45},{...line,points:[[175,175],[215,175]]}),r=>assert.equal(collisions(r).length,1));
  await check('wrapped-gap-clear',scene({...text,x:120,y:120,text:'Longer label wraps here',w:90,lineHeight:3},{...line,points:[[125,145],[185,145]]}),clear);
  await check('wrapped-second-row-crossing',scene({...text,x:120,y:120,text:'Longer label wraps here',w:90,lineHeight:3},{...line,points:[[125,170],[185,170]]}),r=>assert.equal(collisions(r).length,1));
  await check('decorative-artwork-excluded',{...base,texts:[text],paths:[{id:'art',d:'M50 142 H400',fill:'none',stroke:'#333333',width:1}]},clear);
  await check('transparent-text-excluded',scene({...text,opacity:0}),clear);
  await check('transparent-connector-excluded',scene(),clear,svg=>svg.replace('data-md-line="branch"','data-md-line="branch" opacity="0"'));
  await check('no-relevant-text',{...base,lines:[line]},r=>{clear(r);assert.equal(samples,0);});
  await check('distant-path-skips-sampling',scene({...text,y:300}),r=>{clear(r);assert.equal(samples,0);});
  const gantt={...base,blocks:[{type:'gantt',x:50,y:70,w:380,labelW:120,columns:['Jan','Feb'],tasks:[{label:'Delivery',start:0,end:1}]}]};
  assert.doesNotMatch(render(gantt,theme),/data-md-free-text|data-md-line=/,'block-generated axes and captions are outside the authored annotation check');
  await check('generated-block-annotations-excluded',{...gantt,lines:[{...line,points:[[50,107],[420,107]]}]},r=>{clear(r);assert.equal(samples,0);});
  // Open arrowhead arms touch this label, but its centerline ends above it.
  const edgeScene={...base,texts:[{...text,x:255,y:105,text:'I',size:10}],nodes:[{id:'a',x:50,y:90,w:20,h:20,label:''},{id:'b',x:250,y:90,w:20,h:20,label:''}],edges:[{id:'semantic',from:'a',to:'b',fromSide:'r',toSide:'l',route:'straight',arrow:'open'}]};
  await check('semantic-edge-crossing',{...edgeScene,texts:[{...text,x:140,y:108}]},(r,xml)=>{
    assert.ok(collisions(r).some(w=>w.edge==='semantic'));
    assert.match(xml,/source="[^"]+" target="[^"]+"/);
  });
  await check('arrowheads-excluded',{...edgeScene,texts:[{...text,x:240,y:108,text:'I',size:5}]},clear);
  const failed=option('--failed-scene'),repaired=option('--repaired-scene');
  assert.equal(Boolean(failed),Boolean(repaired),'provide both external scene paths');
  if(failed){
    await check('external-first-draft',JSON.parse(fs.readFileSync(failed,'utf8')),r=>{
      assert.equal(collisions(r).length,3);
      assert.ok(collisions(r).every(w=>w.id && w.edge && w.connector==='line'));
    });
    await check('external-repaired',JSON.parse(fs.readFileSync(repaired,'utf8')),clear);
  }
  report.passed=true;
}finally{
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();
}
console.log(JSON.stringify({passed:report.passed,cases:report.cases.length,report:path.join(out,'report.json')}));

