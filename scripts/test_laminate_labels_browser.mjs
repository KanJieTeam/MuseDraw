// Actual glyph regressions for existing laminate right-label packing. No PNG,
// downloads or editor interaction. Uses current scientific blocks and runtime.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {laminateParts} from '../skills/musedraw/scripts/engine/scientific-laminate.mjs';
import {render} from '../skills/musedraw/scripts/engine/render.mjs';
import {loadTheme} from '../skills/musedraw/scripts/musedraw.mjs';
import {resolveBrowser,withSystemFonts} from '../skills/musedraw/scripts/engine/environment.mjs';
import {loadPlaywrightInfo} from '../skills/musedraw/scripts/engine/export.mjs';

const options={out:'output/laminate-labels-browser'};
for(let i=2;i<process.argv.length;i++){
  const flag=process.argv[i];
  if(flag==='--help'){console.log('node scripts/test_laminate_labels_browser.mjs [--out directory] [--playwright module] [--browser executable]');process.exit(0);}
  if(!['--out','--playwright','--browser'].includes(flag)||!process.argv[i+1])throw Error(`Invalid option ${flag}`);
  options[flag.slice(2)]=process.argv[++i];
}
const out=path.resolve(options.out);fs.mkdirSync(out,{recursive:true});
const report={scope:'Measured glyph separation and frame bounds; not aesthetics or material physics',negativeCases:[],cases:[]};
function segmentHits(a,b,r,pad){
  let lo=0,hi=1;
  for(let i=0;i<2;i++){
    const min=r[i]-pad,max=r[i]+r[i+2]+pad,d=b[i]-a[i];
    if(Math.abs(d)<1e-10){if(a[i]<min||a[i]>max)return false;}
    else{const u=(min-a[i])/d,v=(max-a[i])/d;lo=Math.max(lo,Math.min(u,v));hi=Math.min(hi,Math.max(u,v));if(lo>hi)return false;}
  }
  return true;
}
for(const [name,w,h,count]of [['too-narrow',70,300,3],['too-short',800,70,8]]){
  const b={id:'invalid',x:40,y:60,w,h,size:18,labelSide:'right',layers:Array.from({length:count},(_,i)=>({id:String(i),label:'Material '+i,fill:'#abc'}))};
  assert.throws(()=>laminateParts(b),/labels do not fit/);report.negativeCases.push({name,rejectedBeforeBrowser:true});
}
const tight={id:'tight',x:0,y:0,w:950,h:205,size:18,labelSide:'right',electrodes:{layer:1,width:18},layers:Array.from({length:8},(_,i)=>({id:String(i),label:'Layer '+i,fill:'#abc',thickness:6}))};
assert.throws(()=>laminateParts(tight),/labels do not fit around electrode contact/);report.negativeCases.push({name:'contact-band-infeasible',rejectedBeforeBrowser:true});
const {pw}=await loadPlaywrightInfo(options.playwright),found=resolveBrowser(pw,{browser:options.browser});
const browser=await pw.chromium.launch({headless:true,executablePath:found.executablePath});
try{
  const page=await browser.newPage();await page.route(/^https?:\/\//,r=>r.abort());
  for(const themeName of ['journal','enterprise'])for(const count of [2,3,8])for(const h of [240,480])for(const deflection of [0,.4])for(const language of ['zh','en']){
    const words=language==='zh'?['保护层','敏感接触薄膜','柔性基底材料']:['Protective encapsulation','Sensitive contact film','Flexible substrate'];
    const b={type:'scientific',kind:'laminate',id:'spec',x:40,y:60,w:950,h,deflection,size:18,labelSide:'right',electrodes:{layer:1,width:18},
      layers:Array.from({length:count},(_,i)=>({id:'layer'+i,label:words[i%words.length]+(count>3?' '+i:''),fill:['#abc','#cba','#bca'][i%3],thickness:6})),
      ...(count===3&&h===480?{load:'F'}:{})};
    const parts=laminateParts(b),labels=parts.texts.filter(t=>t.id.endsWith('-label'));
    assert.deepEqual(labels.map(t=>t.text),b.layers.map(l=>l.label));
    for(let i=1;i<labels.length;i++)assert.ok(labels[i].y-labels[i-1].y>=18*1.35-1e-5);
    const theme=await loadTheme(themeName),scene={theme:themeName,size:[1100,750],header:false,footer:false,autoFit:false,blocks:[b],
      nodes:[{id:'readout',label:'',x:440,y:b.y+b.h+80,w:150,h:40}],
      edges:['left','right'].map((side,i)=>({id:'lead-'+side,from:'spec-electrode-'+side,to:'readout',fromSide:i?'r':'l',toSide:'t',toAt:i?.7:.3,route:'ortho',via:[[i?b.x+b.w+20:b.x-20,b.y+b.h+50]],width:2.4}))};
    await page.setContent(withSystemFonts(render(scene,theme)));await page.evaluate(async()=>await document.fonts.ready);
    const measured=await page.evaluate(()=>({boxes:[...document.querySelectorAll('text')].map(t=>{const b=t.getBBox();return {text:t.textContent,x:b.x,y:b.y,w:b.width,h:b.height};}),edges:[...document.querySelectorAll('g[data-md="edge"][data-connection]')].map(g=>JSON.parse(g.dataset.connection))}));
    const boxes=measured.boxes;
    for(const box of boxes)assert.ok(box.x>=b.x-.01&&box.y>=b.y-.01&&box.x+box.w<=b.x+b.w+.01&&box.y+box.h<=b.y+b.h+.01,JSON.stringify({themeName,count,h,deflection,language,box}));
    for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert.ok(!(boxes[i].x<boxes[j].x+boxes[j].w&&boxes[j].x<boxes[i].x+boxes[i].w&&boxes[i].y<boxes[j].y+boxes[j].h&&boxes[j].y<boxes[i].y+boxes[i].h),JSON.stringify({themeName,count,h,boxes:[boxes[i],boxes[j]]}));
    assert.equal(measured.edges.length,2);
    for(const box of boxes)for(const e of measured.edges)assert.ok(!e.points.slice(1).some((b,i)=>segmentHits(e.points[i],b,[box.x,box.y,box.w,box.h],e.width/2+.25)),JSON.stringify({themeName,count,h,box,source:e.from}));
    report.cases.push({theme:themeName,count,h,deflection,language,load:b.load??null,glyphBoxes:boxes,actualEdges:measured.edges.length,actualSegments:measured.edges.reduce((n,e)=>n+e.points.length-1,0),wireGlyphIntersections:0,passed:true});
  }
  await page.close();report.passed=true;console.log(JSON.stringify({passed:true,browserCases:report.cases.length,negativeCases:report.negativeCases.length}));
}finally{await browser.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');}
