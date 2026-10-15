// Cross-platform batch rendering; do not rely on shell wildcard expansion.
import fs from 'node:fs/promises';
import path from 'node:path';
import {loadTheme} from '../skills/musedraw/scripts/musedraw.mjs';
import {render} from '../skills/musedraw/scripts/engine/render.mjs';
import {exportScene,loadPlaywright} from '../skills/musedraw/scripts/engine/export.mjs';
const root=path.resolve(import.meta.dirname,'..'),args=process.argv.slice(2);
const option=k=>args.includes(k)?args[args.indexOf(k)+1]:undefined;
const catalog=JSON.parse(await fs.readFile(path.join(root,'gallery/catalog.json'),'utf8'));
const fontDirs=[path.join(root,'skills/musedraw/node_modules'),path.join(root,'node_modules')];
const browser=args.includes('--svg-only')?null:await (await loadPlaywright(option('--playwright'))).chromium.launch({headless:true,...((option('--browser')||process.env.MUSEDRAW_BROWSER)?{executablePath:option('--browser')||process.env.MUSEDRAW_BROWSER}:{})});
const results=[];
try{
 for(const item of catalog.items){
  const source=path.join(root,item.path,'scene.json'),scene=JSON.parse(await fs.readFile(source,'utf8'));
  const theme=await loadTheme(scene.theme),svg=render(scene,theme);
  const outDir=option('--out')?path.resolve(option('--out'),item.slug):path.dirname(source);
  await fs.mkdir(outDir,{recursive:true});await fs.writeFile(path.join(outDir,'diagram.svg'),svg+'\n');
  const checks=browser?await exportScene({svg,outDir,browser,fontDirs}):{svgOnly:true,passed:null};
  await fs.writeFile(path.join(outDir,'checks.json'),JSON.stringify({...checks,theme:theme.id},null,2)+'\n');
  results.push({id:item.id,theme:theme.id,passed:checks.passed,warnings:checks.warnings??[],missingFonts:checks.missingFonts??[]});
  console.log(JSON.stringify(results.at(-1)));
 }
}finally{await browser?.close();}
if(option('--out'))await fs.writeFile(path.resolve(option('--out'),'summary.json'),JSON.stringify({rendered:results.length,results},null,2)+'\n');
if(results.some(item=>item.passed===false||item.missingFonts.length))process.exitCode=1;
