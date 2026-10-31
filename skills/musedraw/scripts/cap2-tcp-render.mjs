#!/usr/bin/env node
// Independent review CLI while the shared entrypoint is frozen. Uses the bundled browser/export runtime.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {browserBundle} from './musecore.mjs';
import {loadPlaywrightInfo} from './engine/export.mjs';
import {resolveBrowser} from './engine/environment.mjs';
import {cap2TCPBase62Model} from './musecore/cap2-tcp-base62-models.mjs';

export async function cap2TCPRender(input,{out,font,ascent=0}={}){
 if(!out)throw Error('output directory required');
 if(![0,40].includes(Number(ascent)))throw Error('ascent must be 0 or 40');
 if(input.family==='base62-encoding')cap2TCPBase62Model(input);
 const here=path.dirname(fileURLToPath(import.meta.url)),parts=await Promise.all(['cap2-tcp-base62-models.mjs','cap2-tcp-base62-figures.mjs'].map(f=>fs.readFile(path.join(here,'musecore',f),'utf8'))),extra=parts.map(code=>code.replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'')).join('\n');
 const fontData=font?(await fs.readFile(font)).toString('base64'):null,code=await browserBundle(),safe=x=>JSON.stringify(x).replace(/</g,'\\u003c');
 const html=`<!doctype html><meta charset="utf-8"><style>body{margin:0}svg{display:block}</style><script>(async()=>{try{${code}\n${extra}\nconst input=${safe(input)},fontData=${safe(fontData)};if(fontData){const face=new FontFace('Cap2 Noto','url(data:font/ttf;base64,'+fontData+')');await face.load();document.fonts.add(face);for(const role of ['sans','serif','mono'])VISUAL_TYPE[role]="'Cap2 Noto',sans-serif";}const original=CanvasRenderingContext2D.prototype.measureText;if(${Number(ascent)})CanvasRenderingContext2D.prototype.measureText=function(value){const m=original.call(this,value);return new Proxy(m,{get(t,k){return k==='fontBoundingBoxAscent'?(t.fontBoundingBoxAscent??0)+40:Reflect.get(t,k,t)}})};const svg=input.family==='base62-encoding'?cap2TCPBase62Families()[input.family](input):MuseCore.render(input);if(fontData){const style=el('style',{},svg);style.textContent="@font-face{font-family:'Cap2 Noto';src:url(data:font/ttf;base64,"+fontData+")}";}document.body.append(svg);await document.fonts.ready;window.result=MuseCore.audit(svg);window.result.fontEvidence={customNoto:!!fontData,ascentPressure:${Number(ascent)}};window.ready=true;}catch(e){window.result={error:e.stack};window.ready=true;}})();</script>`;
 const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{const page=await browser.newPage({viewport:{width:1664,height:1200},deviceScaleFactor:1});await page.route(/^https?:\/\//,r=>r.abort());await page.setContent(html);await page.waitForFunction(()=>window.ready);const result=await page.evaluate(()=>window.result);if(result.error)throw Error(result.error);if(result.findings.length)throw Error(JSON.stringify(result.findings));await page.setViewportSize({width:Math.ceil(result.geometry.width),height:1200});
 const svg=await page.locator('svg').evaluate(e=>e.outerHTML);await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'input.json'),JSON.stringify(input,null,2)+'\n');await fs.writeFile(path.join(out,'diagram.svg'),svg);await fs.writeFile(path.join(out,'editor.html'),html);await fs.writeFile(path.join(out,'checks.json'),JSON.stringify({status:'geometry-passed',aestheticApproval:'not-assessed',...result},null,2)+'\n');await page.locator('svg').screenshot({path:path.join(out,'diagram.png')});return result;
 }finally{await browser.close()}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [source,...args]=process.argv.slice(2),flags={};for(let i=0;i<args.length;i+=2){if(!['--out','--font','--ascent'].includes(args[i])||args[i+1]===undefined)throw Error('Use <input.json> --out <directory> [--font <Noto font>] [--ascent 0|40]');flags[args[i].slice(2)]=args[i+1]}
 cap2TCPRender(JSON.parse(await fs.readFile(source,'utf8')),flags).then(r=>console.log(JSON.stringify({family:r.geometry.family,status:'geometry-passed',height:r.geometry.height,fontEvidence:r.fontEvidence}))).catch(e=>{console.error(e.message);process.exitCode=1});
}
