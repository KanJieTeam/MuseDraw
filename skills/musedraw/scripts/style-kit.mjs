#!/usr/bin/env node
// Prepare drawing tools for original work, without selecting a fixed composition.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const skill=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2),o={};
try{
 for(let i=0;i<args.length;i++){
  if(args[i]==='--help'){o.help=true;continue;}
  if(!['--style','--out'].includes(args[i])||!args[i+1]||args[i+1].startsWith('--'))throw Error('Use --style swiss|ink-wash --out NEW_DIRECTORY.');
  if(o[args[i]])throw Error('Repeated argument.');o[args[i]]=args[++i];
 }
 if(o.help){console.log('node <skill>/scripts/style-kit.mjs --style swiss|ink-wash --out NEW_DIRECTORY');}
 else{
  const style=o['--style'];if(!['swiss','ink-wash'].includes(style)||!o['--out'])throw Error('Use --style swiss|ink-wash --out NEW_DIRECTORY.');
  const out=path.resolve(o['--out']),relative=path.relative(skill,out);
  if(!relative||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)))throw Error('Keep work outside the installed Skill.');
  try{await fs.lstat(out);throw Error('Output already exists; no files overwritten.');}catch(e){if(e.code!=='ENOENT')throw e;}
  const files=[['marks.mjs','marks.mjs'],[style+'.css','style.css']];
  const bytes=await Promise.all(files.map(async([s,t])=>[t,await fs.readFile(path.join(skill,'assets/style-kits',s))]));
  await fs.mkdir(path.dirname(out),{recursive:true});await fs.mkdir(out);
  for(const [name,b] of bytes)await fs.writeFile(path.join(out,name),b,{flag:'wx'});
  const start=`// Supply a subject-specific composition; the kit does not choose one.\nimport fs from 'node:fs/promises';\nimport {Sheet} from './marks.mjs';\nconst d=new Sheet('${style}',{width:1600,height:1100,title:''});\n// d.text / paragraph / vertical / tool / record / brush / callout\n// Add the user's actual objects and relationships, then render scene.json.\nawait fs.writeFile(new URL('./scene.json',import.meta.url),JSON.stringify(d.scene(),null,2));\n`;
  await fs.writeFile(path.join(out,'make.mjs'),start,{flag:'wx'});
  console.log(JSON.stringify({style,output:out,files:['marks.mjs','style.css','make.mjs'],guide:path.join(skill,'references/style-kits',style+'.md'),next:'Read the selected guide. Compose the actual subject in make.mjs or use style.css in HTML. Render native scenes with scripts/musedraw.mjs; the kit is not a layout solver.'},null,2));
 }
}catch(e){console.error(e.message);process.exitCode=1;}
