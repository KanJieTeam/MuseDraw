// Actual SVG hit testing above opaque material, at two display sizes.
// Uses an existing runtime; no downloads. node scripts/test_detail_browser.mjs
// --playwright <module> [--browser <executable>] [--out <new evidence folder>]
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {render} from '../skills/musedraw/scripts/engine/render.mjs';
import {loadTheme} from '../skills/musedraw/scripts/musedraw.mjs';
import {detailLink} from '../skills/musedraw/scripts/engine/detail-link.mjs';
const options={};
for(let i=2;i<process.argv.length;i+=2){const key=process.argv[i];if(!['--out','--browser','--playwright'].includes(key)||!process.argv[i+1])throw new Error('Expected --playwright MODULE [--browser EXE] [--out DIR]');options[key.slice(2)]=process.argv[i+1];}
if(!options.playwright)throw new Error('Supply an existing Playwright module; the selected browser must already be installed');
const {chromium}=await import(pathToFileURL(path.resolve(options.playwright)));
if(!options.out)fs.mkdirSync('output/detail-browser',{recursive:true});
const out=options.out?path.resolve(options.out):fs.mkdtempSync(path.join('output/detail-browser','run-'));
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:options.browser?path.resolve(options.browser):chromium.executablePath(),headless:true});
const page=await browser.newPage({viewport:{width:900,height:800}}),report=[];
try{
  for(const side of ['b','t','r','l'])for(const display of [600,300]){
    const targets={b:[120,350,200,160],t:[120,10,200,110],r:[380,180,200,160],l:[10,180,110,160]};
    const block={type:'detail-link',id:'detail',roi:[190,190,80,50],detail:targets[side],side,color:'#2E7D74',width:2};
    for(const fixed of [false,true]){
      const scene={theme:'journal',size:[600,550],header:false,footer:false,autoFit:false,
        paths:[{id:'opaque-material',d:'M150 150H330V280H150Z',fill:'#DFE9EA',stroke:'none'}],
        ...(fixed?{blocks:[block]}:{lines:detailLink(block).lines.map(({layer,...l})=>l)})};
      const svg=render(scene,await loadTheme('journal'));
      await page.setContent(`<style>body{margin:0}svg{width:${display}px;height:auto}</style>${svg}`);
      const hit=await page.evaluate(()=>{
        const svg=document.querySelector('svg'),matrix=svg.getScreenCTM();let visible=0,hidden=0;
        for(let x=191;x<270;x+=2){const p=new DOMPoint(x,190).matrixTransform(matrix),top=document.elementFromPoint(p.x,p.y);if(top?.id==='line-3')visible++;if(top?.id==='opaque-material')hidden++;}
        return {visible,hidden};
      });
      assert.ok(fixed?hit.visible>=8:hit.visible===0,JSON.stringify({side,display,fixed,hit}));
      const name=`${side}-${display}-${fixed?'fixed':'hidden'}`;
      fs.writeFileSync(path.join(out,name+'.svg'),svg);await page.screenshot({path:path.join(out,name+'.png')});
      report.push({side,display,fixed,...hit});
    }
  }
  fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({passed:true,checks:report},null,2));
  console.log(`PASS ${report.length} actual browser paint probes: ${out}`);
}finally{await browser.close();}
