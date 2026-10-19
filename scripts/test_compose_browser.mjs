// Browser regressions for transparent/open frames, tray containment and label bounds.
// Run from any directory. Each run preserves its own evidence directory.
// node scripts/test_compose_browser.mjs [--playwright <module>] [--browser <executable>]
// Optional: --out <evidence directory>. Default: output/compose-browser/<runid>.
// Uses an existing runtime/browser only; never installs or downloads anything.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inflateRawSync} from 'node:zlib';
import {composeStates} from '../skills/musedraw/scripts/engine/compose.mjs';
import {render} from '../skills/musedraw/scripts/engine/render.mjs';
import {loadTheme} from '../skills/musedraw/scripts/musedraw.mjs';
import {resolveBrowser,withSystemFonts} from '../skills/musedraw/scripts/engine/environment.mjs';
import {collectEditableScene,toDrawio} from '../skills/musedraw/scripts/engine/drawio.mjs';
import {exportScene,loadPlaywrightInfo} from '../skills/musedraw/scripts/engine/export.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const options={};
for(let i=2;i<process.argv.length;i++) {
 const flag=process.argv[i];
 if(flag==='--help') {
  console.log('Usage: node scripts/test_compose_browser.mjs [--playwright <module>] [--browser <executable>] [--out <evidence directory>]\nDefault evidence: repository output/compose-browser/<runid>. Uses existing Playwright and Chromium/Chrome/Edge; no downloads.');
  process.exit(0);
 }
 if(!['--out','--playwright','--browser'].includes(flag))throw new Error(`Unknown option: ${flag}`);
 if(!process.argv[i+1]||process.argv[i+1].startsWith('--'))throw new Error(`${flag} requires a value`);
 options[flag.slice(2)]=process.argv[++i];
}
const evidenceRoot=path.join(root,'output','compose-browser');
let out;
if(options.out) {
 out=path.resolve(options.out);fs.mkdirSync(out,{recursive:true});
}else {
 fs.mkdirSync(evidenceRoot,{recursive:true});
 out=fs.mkdtempSync(path.join(evidenceRoot,new Date().toISOString().replace(/[:.]/g,'-')+'-'));
}
const report={scope:'Actual Chromium SVG geometry and native collector/XML; no official mxGraph import',startedUTC:new Date().toISOString(),cases:[]};
const opening=theme=>({method:'states',theme,entities:[
 {id:'backdrop',label:'Panel behind frame',shape:'box',extent:[.8,.75],role:'focus'},
 {id:'frame',label:'Frame on panel',shape:'frame',extent:[.7,.6],role:'constraint'}],
 views:[{id:'overlay',label:'Transparent opening',items:[{entity:'backdrop',at:[.5,.5]},{entity:'frame',place:{of:'backdrop',relation:'align'}}]}]});
const containment=theme=>({method:'states',theme,entities:[
 {id:'cabinet',label:'Cabinet frame',shape:'frame',extent:[.75,.74],role:'context'},
 {id:'drawer',label:'Drawer tray',shape:'tray',extent:[.52,.34],role:'focus'},
 // Fill the entire allowed vertical opening: this is the sharp valid boundary.
 {id:'folder',label:'Folder',shape:'folder',extent:[.5,.272],role:'constraint'}],
 views:[{id:'start',label:'Maximum valid content height',items:[{entity:'cabinet',at:[.55,.5]},
 {entity:'drawer',place:{of:'cabinet',relation:'inside',offset:[0,.1]}},
 {entity:'folder',place:{of:'drawer',relation:'inside'}}]},
 {id:'move',label:'Attached content follows',from:'start',items:[{entity:'cabinet',at:[.45,.5]}]}]});
const labels=theme=>({method:'states',theme,entities:[
 {id:'container',label:'W'.repeat(120),extent:[.7,.7],role:'context'},
 {id:'part',label:'Minimum illumination limit '.repeat(5),extent:[.25,.2],role:'focus'}],
 views:[{id:'initial',label:'Wide glyph and monospaced label bounds',items:[{entity:'container',at:[.5,.5]},
 {entity:'part',place:{of:'container',relation:'inside'}}],
 arrows:[{from:[.95,.2],to:[.95,.7],label:'向下移动到指定位置'}]}]});

// Probe bands across each side, rather than copying the renderer's wall polygon
// or assuming a particular wall thickness. Three separated cross-sections must
// be empty on the requested opening and painted/bounded on every retained wall.
async function probeFrameSides(page,id,frame) {
 return page.evaluate(({id,frame})=>{
  const svg=document.querySelector('svg'),node=document.getElementById(id);
  const primitives=[...node.querySelectorAll('rect,path,circle,ellipse,polygon,polyline')].map(el=>{
   const cs=getComputedStyle(el);
   return {el,inverse:el.getCTM().inverse(),fill:cs.fill!=='none'&&Number(cs.opacity)>0&&Number(cs.fillOpacity)>0,
    stroke:cs.stroke!=='none'&&Number(cs.opacity)>0&&Number(cs.strokeOpacity)>0&&Number.parseFloat(cs.strokeWidth)>0};
  });
  const svgMatrix=svg.getCTM();
  const hit=(x,y)=>{
   const p=new DOMPoint(x,y).matrixTransform(svgMatrix);let fill=0,stroke=0;
   for(const primitive of primitives) {
    const local=p.matrixTransform(primitive.inverse);
    if(primitive.fill&&primitive.el.isPointInFill(local))fill++;
    if(primitive.stroke&&primitive.el.isPointInStroke(local))stroke++;
   }
   return {fill,stroke};
  };
  const sides={};
  for(const side of ['r','l','t','b']) {
   const normalLength=['r','l'].includes(side)?frame.w:frame.h;
   const steps=Math.ceil(normalLength*.205/.5);
   sides[side]=[.35,.5,.65].map(t=>{
    let fillHits=0,strokeHits=0;
    for(let i=0;i<=steps;i++) {
     const n=-.025+.205*i/steps;
     const u=side==='r'?1-n:side==='l'?n:t;
     const v=side==='b'?1-n:side==='t'?n:t;
     const h=hit(frame.x+u*frame.w,frame.y+v*frame.h);
     if(h.fill)fillHits++;if(h.stroke)strokeHits++;
    }
    return {t,samples:steps+1,fillHits,strokeHits};
   });
  }
  const interior=[.4,.5,.6].flatMap(u=>[.4,.5,.6].map(v=>hit(frame.x+u*frame.w,frame.y+v*frame.h)));
  return {sides,interior};
 },{id,frame});
}

function assertOpenFrame(probe,openSide,context,solidFill) {
 for(const [side,stripes] of Object.entries(probe.sides))for(const stripe of stripes) {
  if(side===openSide) {
   assert.equal(stripe.fillHits,0,`${context}: ${side} opening must have a real unfilled gap at ${stripe.t}`);
   assert.equal(stripe.strokeHits,0,`${context}: no stroke may close the ${side} opening at ${stripe.t}`);
  }else {
   // Whiteboard represents these walls with an unfilled hand-drawn outline.
   // Both themes must retain real boundaries; journal also has solid walls.
   if(solidFill)assert.ok(stripe.fillHits>0,`${context}: retained ${side} wall must have actual fill at ${stripe.t}`);
   assert.ok(stripe.strokeHits>0,`${context}: retained ${side} wall must have an actual boundary at ${stripe.t}`);
  }
 }
 assert.ok(probe.interior.every(h=>h.fill===0&&h.stroke===0),`${context}: interior must stay transparent`);
}

let browser;
try {
 const {pw}=await loadPlaywrightInfo(options.playwright);
 const found=resolveBrowser(pw,{browser:options.browser});
 report.runtime={browserSource:found.source,fontMode:'system'};
 browser=await pw.chromium.launch({headless:true,executablePath:found.executablePath});
}catch(error) {
 report.passed=false;report.error=error.message;report.finishedUTC=new Date().toISOString();
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
 console.error(`Browser setup failed: ${error.message}\nFrom the repository root, run: node skills/musedraw/scripts/musedraw.mjs doctor --json\nReuse an existing runtime with --playwright <module> and browser with --browser <executable>. This script does not install or download dependencies.`);
 console.log(`Evidence: ${out}`);process.exit(1);
}
try {
 const page=await browser.newPage();
 await page.route(/^https?:\/\//,route=>route.abort());
 for(const [kind,themes,factory] of [['frame',['journal','whiteboard'],opening],['tray',['journal','whiteboard'],containment],['labels',['journal','whiteboard','terminal'],labels]]) {
  for(const theme of themes) {
   const name=`${kind}-${theme}`,dir=path.join(out,name);fs.mkdirSync(dir,{recursive:true});
   const result={name,passed:false};report.cases.push(result);
   try {
    const source=factory(theme);fs.writeFileSync(path.join(dir,'composition.json'),JSON.stringify(source,null,2));
    const scene=composeStates(source);fs.writeFileSync(path.join(dir,'scene.json'),JSON.stringify(scene,null,2));
    const svg=withSystemFonts(render(scene,await loadTheme(theme)));fs.writeFileSync(path.join(dir,'diagram.svg'),svg);
    await page.setViewportSize({width:scene.size[0],height:scene.size[1]});
    await page.setContent(`<html><head><meta charset="utf-8"><style>body{margin:0}svg{display:block}</style></head><body>${svg}</body></html>`);
    await page.evaluate(()=>document.fonts.ready);
    await page.screenshot({path:path.join(dir,'diagram.png')});
    const native=await page.evaluate(collectEditableScene);fs.writeFileSync(path.join(dir,'native.json'),JSON.stringify(native,null,2));
    const xml=toDrawio(native);fs.writeFileSync(path.join(dir,'diagram.drawio'),xml);
    assert.doesNotMatch(svg+xml,/<image\b|foreignObject|data:image|shape=image/);
    const stencils=[...xml.matchAll(/shape=stencil\(([^)]*)\)/g)].map(m=>decodeURIComponent(inflateRawSync(Buffer.from(m[1],'base64')).toString()));
    assert.equal(stencils.length,native.shapes.length,'every captured primitive must have a native stencil');
    assert.ok(stencils.every(s=>s.includes('<path>')&&/<(?:move|line|quad|curve)/.test(s)),'native stencils must contain actual vector commands');
    result.native={groups:native.groups.length,shapes:native.shapes.length,texts:native.texts.length,stencils:stencils.length};
    for(const n of scene.nodes.filter(n=>n.id.startsWith('states-'))) {
     const group=native.groups.find(g=>g.sourceId===n.id);assert.ok(group,`missing editable object ${n.id}`);
     assert.ok(xml.includes(`<mxCell id="${group.id}"`));
     assert.ok(native.shapes.some(s=>s.parent===group.id),`object ${n.id} must contain native geometry`);
    }
    if(kind==='frame') {
     const frame=scene.nodes.find(n=>n.id==='states-overlay-frame');
     const points=[[.5,.5],[.3,.4],[.7,.6]].map(([u,v])=>[frame.x+u*frame.w,frame.y+v*frame.h]);
     const fills=await page.evaluate(({id,points})=>{
      const svg=document.querySelector('svg'),node=document.getElementById(id),primitives=[...node.querySelectorAll('rect,path,circle,ellipse,polygon,polyline')];
      return points.map(([x,y])=>primitives.filter(el=>{
       const cs=getComputedStyle(el);if(cs.fill==='none'||Number(cs.opacity)===0)return false;
       const local=new DOMPoint(x,y).matrixTransform(svg.getCTM()).matrixTransform(el.getCTM().inverse());
       return el.isPointInFill(local);
      }).map(el=>({tag:el.tagName,fill:getComputedStyle(el).fill})));
     },{id:frame.id,points});
     assert.deepEqual(fills,[[],[],[]],'the actual opening must not paint over its backdrop');
     const group=native.groups.find(g=>g.sourceId===frame.id),filled=native.shapes.filter(s=>s.parent===group.id&&s.fill!=='none');
     for(const p of points)assert.ok(!filled.some(s=>p[0]>s.box[0]&&p[0]<s.box[0]+s.box[2]&&p[1]>s.box[1]&&p[1]<s.box[1]+s.box[3]),'native opening must not contain an opaque interior primitive');
     result.opening={samplePoints:points,browserCoveringFills:fills,nativeFilledShapes:filled.length};
    }
    if(kind==='tray') {
     result.containment=[];
     for(const view of ['start','move']) {
      const frame=scene.nodes.find(n=>n.id===`states-${view}-cabinet`),tray=scene.nodes.find(n=>n.id===`states-${view}-drawer`),folder=scene.nodes.find(n=>n.id===`states-${view}-folder`);
      const inset=Math.min(frame.w,frame.h)*.075,lipY=tray.y+.8*tray.h,handleY=tray.y+.9*tray.h;
      assert.ok(tray.x>=frame.x+inset-.03&&tray.x+tray.w<=frame.x+frame.w-inset+.03);
      assert.ok(tray.y>=frame.y+inset-.03&&tray.y+tray.h<=frame.y+frame.h-inset+.03);
      assert.ok(folder.y+folder.h<=lipY+.03,'the complete valid content must remain above the lip');
      assert.ok(handleY>folder.y+folder.h+tray.h*.08,'valid inside content must not cover the handle');
      const handle=await page.evaluate(({id,x,y})=>{
       const svg=document.querySelector('svg'),node=document.getElementById(id),paths=[...node.querySelectorAll('path')].filter(e=>getComputedStyle(e).fill==='none'&&getComputedStyle(e).stroke!=='none');
       const hits=[];for(let dx=-3;dx<=3;dx+=.5)for(let dy=-3;dy<=3;dy+=.5){
        const p=new DOMPoint(x+dx,y+dy).matrixTransform(svg.getCTM());
        if(paths.some(el=>el.isPointInStroke(p.matrixTransform(el.getCTM().inverse()))))hits.push([x+dx,y+dy]);
       }return {strokedPaths:paths.length,hitCount:hits.length};
      },{id:tray.id,x:tray.x+tray.w/2,y:handleY});
      assert.ok(handle.hitCount>0,'a real handle stroke must exist inside the reserved lip');
      const trayGroup=native.groups.find(g=>g.sourceId===tray.id);
      assert.ok(native.shapes.some(s=>s.parent===trayGroup.id&&s.tag==='path'&&s.stroke!=='none'&&handleY>=s.box[1]-3&&handleY<=s.box[1]+s.box[3]+3),'native path must retain handle geometry');
      result.containment.push({view,lipY,handleY,folderBottom:folder.y+folder.h,handle});
     }
    }
    if(kind==='labels') {
     const bounds=await page.evaluate(()=>{
      const v=document.querySelector('svg').viewBox.baseVal;
      return [...document.querySelectorAll('text')].map(e=>{const b=e.getBBox();return {text:e.textContent.slice(0,40),font:getComputedStyle(e).fontFamily,x:b.x,y:b.y,w:b.width,h:b.height,overflow:b.x<-.2||b.x+b.width>v.width+.2||b.y<-.2||b.y+b.height>v.height+.2};});
     });
     result.textBounds=bounds;
     assert.deepEqual(bounds.filter(t=>t.overflow),[],'browser glyphs must stay inside the final canvas');
     const key=scene.texts.find(t=>t.id==='name-container');assert.equal(key.text.replaceAll('\n',''),'W'.repeat(120),'wrapping must preserve the complete name');
     for(const p of scene.paths)assert.ok(svg.includes(`id="${p.id}"`),'motion IDs must survive SVG rendering');
    }
    result.passed=true;
   }catch(error) {result.error=error.stack;fs.writeFileSync(path.join(dir,'failure.txt'),error.stack);}
   console.log(`${result.passed?'PASS':'FAIL'} ${name}`);
  }
 }
 // Keep the seven original regressions above; openSide adds eight cases, each
 // exercised at two responsive widths with both browser and native geometry.
 for(const theme of ['journal','whiteboard'])for(const side of ['r','l','t','b']) {
  const name=`open-frame-${theme}-${side}`,dir=path.join(out,name);fs.mkdirSync(dir,{recursive:true});
  const result={name,passed:false,widths:[]};report.cases.push(result);
  try {
   for(const width of [1200,1800]) {
    const variantDir=path.join(dir,`width-${width}`);fs.mkdirSync(variantDir,{recursive:true});
    const source=opening(theme);source.width=width;source.entities[1].openSide=side;
    fs.writeFileSync(path.join(variantDir,'composition.json'),JSON.stringify(source,null,2));
    const scene=composeStates(source),frame=scene.nodes.find(n=>n.id==='states-overlay-frame');
    assert.equal(scene.size[0],width,'the requested width must actually change the rendered canvas');
    assert.equal(frame.openSide,side,'compose must preserve the requested opening direction');
    fs.writeFileSync(path.join(variantDir,'scene.json'),JSON.stringify(scene,null,2));
    const svg=withSystemFonts(render(scene,await loadTheme(theme)));
    fs.writeFileSync(path.join(variantDir,'diagram.svg'),svg);
    await page.setViewportSize({width:scene.size[0],height:scene.size[1]});
    await page.setContent(`<html><head><meta charset="utf-8"><style>body{margin:0}svg{display:block}</style></head><body>${svg}</body></html>`);
    await page.evaluate(()=>document.fonts.ready);
    await page.screenshot({path:path.join(variantDir,'diagram.png')});
    const browserProbe=await probeFrameSides(page,frame.id,frame);
    fs.writeFileSync(path.join(variantDir,'browser-probe.json'),JSON.stringify(browserProbe,null,2));
    assertOpenFrame(browserProbe,side,`${name} width ${width} browser`,theme==='journal');

    const native=await page.evaluate(collectEditableScene),xml=toDrawio(native);
    fs.writeFileSync(path.join(variantDir,'native.json'),JSON.stringify(native,null,2));
    fs.writeFileSync(path.join(variantDir,'diagram.drawio'),xml);
    assert.doesNotMatch(svg+xml,/<image\b|foreignObject|data:image|shape=image/);
    const stencils=[...xml.matchAll(/shape=stencil\(([^)]*)\)/g)].map(m=>decodeURIComponent(inflateRawSync(Buffer.from(m[1],'base64')).toString()));
    assert.equal(stencils.length,native.shapes.length,'every native primitive must have a vector stencil');
    assert.ok(stencils.every(s=>s.includes('<path>')&&/<(?:move|line|quad|curve)/.test(s)),'native stencils must contain vector commands');
    const group=native.groups.find(g=>g.sourceId===frame.id);assert.ok(group,'open frame must remain an editable native object');
    const frameShapes=native.shapes.filter(s=>s.parent===group.id);
    assert.ok(frameShapes.some(s=>s.tag==='path'&&s.attributes.d),'native frame must retain actual path geometry');
    assert.ok(frameShapes.every(s=>xml.includes(`<mxCell id="${s.id}"`)),'every frame primitive must survive native serialization');
    // Rebuild the collected native primitives independently in the browser.
    // Bounding boxes alone cannot prove that a U-shaped polygon has a gap.
    await page.evaluate(shapes=>{
     const ns='http://www.w3.org/2000/svg',group=document.createElementNS(ns,'g');group.id='native-frame-probe';
     for(const shape of shapes) {
      const el=document.createElementNS(ns,shape.tag);
      for(const [key,value] of Object.entries(shape.attributes))if(key!=='id'&&key!=='transform')el.setAttribute(key,value);
      el.setAttribute('transform',`matrix(${shape.matrix.join(' ')})`);
      for(const [key,value] of Object.entries({fill:shape.fill,stroke:shape.stroke,'stroke-width':shape.width,opacity:shape.opacity,
       'fill-opacity':shape.fillOpacity,'stroke-opacity':shape.strokeOpacity,'stroke-dasharray':shape.dash,'stroke-linecap':shape.cap,'stroke-linejoin':shape.join}))el.setAttribute(key,value);
      group.appendChild(el);
     }
     document.querySelector('svg').appendChild(group);
    },frameShapes);
    const nativeProbe=await probeFrameSides(page,'native-frame-probe',frame);
    fs.writeFileSync(path.join(variantDir,'native-probe.json'),JSON.stringify(nativeProbe,null,2));
    assertOpenFrame(nativeProbe,side,`${name} width ${width} native`,theme==='journal');
    result.widths.push({width,frame:{x:frame.x,y:frame.y,w:frame.w,h:frame.h},browserProbe,nativeProbe,
     native:{groupId:group.id,frameShapes:frameShapes.length,totalStencils:stencils.length}});
   }
   assert.ok(result.widths[1].frame.w>result.widths[0].frame.w,'width variants must exercise different object geometry');
   result.passed=true;
  }catch(error) {result.error=error.stack;fs.writeFileSync(path.join(dir,'failure.txt'),error.stack);}
  console.log(`${result.passed?'PASS':'FAIL'} ${name}`);
 }
 // A raw SVG fixture makes this an independent browser export check: the scene
 // renderer/compose logic cannot supply the expected result to the assertion.
 {
  const name='preview-readability',dir=path.join(out,name);fs.mkdirSync(dir,{recursive:true});
  const result={name,passed:false,variants:[]};report.cases.push(result);
  try {
   for(const fontSize of [15,22.5]) {
    const variantDir=path.join(dir,`font-${fontSize}`);fs.mkdirSync(variantDir,{recursive:true});
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="300" viewBox="0 0 1800 300"><text x="60" y="100" font-family="sans-serif" font-size="${fontSize}">Readable final-size type</text></svg>`;
    fs.writeFileSync(path.join(variantDir,'diagram.svg'),svg);
    const checks=await exportScene({svg,outDir:variantDir,browser,fontDirs:[],images:false,drawio:false,fontMode:'system',
     readingProfile:{maxWidth:1200,maxHeight:1000,min:14}});
    fs.writeFileSync(path.join(variantDir,'checks.json'),JSON.stringify(checks,null,2));
    const tooSmall=checks.warnings.filter(w=>w.type==='text-too-small');
    assert.deepEqual(checks.readability.preview,[1200,200]);
    if(fontSize===15) {
     assert.equal(checks.passed,false,'actual 10px preview text must fail readability');
     assert.equal(tooSmall.length,1,'the browser must report the small text');
     assert.equal(tooSmall[0].previewPx,10);
     assert.equal(checks.readability.smallestTextPx,10);
    }else {
     assert.equal(checks.passed,true,'actual 15px preview text must pass readability');
     assert.deepEqual(checks.warnings,[]);
     assert.equal(checks.readability.smallestTextPx,15);
    }
    assert.equal(fs.existsSync(path.join(variantDir,'diagram@2x.png')),false,'this check must not write an unnecessary screenshot');
    assert.equal(fs.existsSync(path.join(variantDir,'diagram.drawio')),false);
    result.variants.push({fontSize,checks});
   }
   result.passed=true;
  }catch(error) {result.error=error.stack;fs.writeFileSync(path.join(dir,'failure.txt'),error.stack);}
  console.log(`${result.passed?'PASS':'FAIL'} ${name}`);
 }
}finally {await browser.close();}
report.passed=report.cases.every(c=>c.passed);report.finishedUTC=new Date().toISOString();
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
console.log(`Evidence: ${out}`);if(!report.passed)process.exitCode=1;
