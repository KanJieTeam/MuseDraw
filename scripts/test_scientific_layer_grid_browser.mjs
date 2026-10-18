// Explicit browser regression; run separately from the offline suite.
// Optional MUSEDRAW_GRID_EVIDENCE saves the four projection images and native XML.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import {scientificMotif} from '../skills/musedraw/scripts/engine/scientific-motifs.mjs';
import {render} from '../skills/musedraw/scripts/engine/render.mjs';
import {loadTheme} from '../skills/musedraw/scripts/musedraw.mjs';
import {resolveBrowser,withSystemFonts} from '../skills/musedraw/scripts/engine/environment.mjs';
import {loadPlaywrightInfo} from '../skills/musedraw/scripts/engine/export.mjs';
import {collectEditableScene,toDrawio} from '../skills/musedraw/scripts/engine/drawio.mjs';
const base={id:'stack',type:'scientific',kind:'layers'};
const gridParts=out=>out.paths.filter(part=>part.id.includes('-grid-'));
const options={};
for(let i=2;i<process.argv.length;i++){
  const flag=process.argv[i];
  if(!['--out','--playwright','--browser'].includes(flag)||!process.argv[i+1]||process.argv[i+1].startsWith('--'))throw new Error('Use --out, --playwright or --browser with a value');
  options[flag.slice(2)]=process.argv[++i];
}
test('Chromium confirms four-layer grid strokes are painted and not covered by later opaque faces',async()=>{
  const {pw}=await loadPlaywrightInfo(options.playwright),found=resolveBrowser(pw,{browser:options.browser});
  const browser=await pw.chromium.launch({headless:true,executablePath:found.executablePath});
  const evidence=options.out??process.env.MUSEDRAW_GRID_EVIDENCE;
  if(evidence)fs.mkdirSync(evidence,{recursive:true});
  const report=[];
  try{
    const theme=await loadTheme('journal'),page=await browser.newPage();
    await page.route(/^https?:\/\//,route=>route.abort());
    for(const [dx,dy] of [[48,28],[-48,28],[48,-28],[-48,-28]]){
      // Same geometry as the real four-layer cold-start case, without its
      // manually added foreground lines that could mask a broken native mesh.
      const block={...base,x:80,y:118,w:560,h:290,separation:8,projection:[dx,dy],layers:[
        {label:'Cover',fill:'#C6DFDC'},
        {label:'Metal mesh',fill:'#E7BE62',pattern:'grid'},
        {label:'Dielectric',fill:'#E3E7EE'},
        {label:'PI substrate',fill:'#D9A868'}]};
      const scene={theme:'journal',size:[950,500],header:false,footer:false,autoFit:false,blocks:[block]};
      const svg=withSystemFonts(render(scene,theme));
      await page.setViewportSize({width:950,height:500});
      await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
      await page.evaluate(()=>document.fonts.ready);
      const visibility=await page.evaluate(()=>{
        const module=document.getElementById('scientific-stack');
        const grid=[...module.querySelectorAll('path[id*="-grid-"]')];
        const geometry=[...module.querySelectorAll('rect,path,polygon,circle,ellipse')];
        let samples=0;const covered=[];
        for(const line of grid){
          const style=getComputedStyle(line);
          if(style.stroke==='none'||Number(style.strokeWidth)<=0||Number(style.opacity)===0)throw new Error('unpainted grid stroke');
          for(const t of [.1,.5,.9]){
            const point=line.getPointAtLength(line.getTotalLength()*t).matrixTransform(line.getScreenCTM());
            samples++;
            for(const shape of geometry){
              if(!(line.compareDocumentPosition(shape)&Node.DOCUMENT_POSITION_FOLLOWING))continue;
              const s=getComputedStyle(shape);
              if(s.fill==='none'||Number(s.opacity)===0||Number(s.fillOpacity)===0)continue;
              const local=point.matrixTransform(shape.getScreenCTM().inverse());
              if(shape.isPointInFill(local))covered.push({line:line.id,t,occluder:shape.id||shape.parentElement.id});
            }
          }
        }
        const fronts=[...module.querySelectorAll('g[data-md="node"]')].filter(g=>/^stack-layer-\d+$/.test(g.id)).map(g=>({id:g.id,box:g.getBoundingClientRect().toJSON()}));
        return {gridLines:grid.length,samples,covered,fronts};
      });
      assert.equal(visibility.gridLines,11);assert.equal(visibility.samples,33);
      assert.deepEqual(visibility.covered,[],`actual browser paint coverage for ${dx},${dy}`);
      const native=await page.evaluate(collectEditableScene),xml=toDrawio(native);
      const grid=gridParts(scientificMotif(block,theme));
      for(const line of grid)assert.ok(native.shapes.some(shape=>shape.tag==='path'&&shape.attributes.d===line.d),'visible grid stroke must survive native collection');
      assert.match(xml,/shape=stencil\(/);assert.doesNotMatch(svg+xml,/<image\b|foreignObject|data:image|shape=image/i);
      report.push({projection:[dx,dy],...visibility,nativeShapes:native.shapes.length,passed:true});
      if(evidence){
        const name=`projection-${dx}-${dy}`;
        await page.screenshot({path:path.join(evidence,`${name}.png`)});
        fs.writeFileSync(path.join(evidence,`${name}.drawio`),xml);
      }
    }
  }finally{
    await browser.close();
    if(evidence)fs.writeFileSync(path.join(evidence,'report.json'),JSON.stringify(report,null,2));
  }
  assert.equal(report.length,4);
});
