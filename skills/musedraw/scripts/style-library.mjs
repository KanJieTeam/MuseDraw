// Find a complete style composition and prepare its self-contained editable files.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const skill=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const library=path.join(skill,'assets/visual-language');
const args=process.argv.slice(2);
const options={};
const inside=(base,file)=>{const relative=path.relative(base,file);return relative!==''&&!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative);};
try{
 for(let index=0;index<args.length;index++){
  const flag=args[index];
  if(['--all','--help'].includes(flag)){options[flag]=true;continue;}
  if(!['--id','--out','--style','--search','--limit'].includes(flag))throw Error('Unknown option: '+flag);
  const value=args[++index];if(!value||value.startsWith('--'))throw Error(flag+' requires a value.');
  if(flag in options)throw Error('Repeated option: '+flag);options[flag]=value;
 }
 if(options['--help']){
  console.log('node <skill>/scripts/style-library.mjs [--style FAMILY] [--search WORDS] [--all] [--limit N]\nnode <skill>/scripts/style-library.mjs --id CASE_ID --out NEW_JOB_FOLDER');
 }else{
  const registry=JSON.parse(await fs.readFile(path.join(library,'index.json'),'utf8'));
  if(!options['--id']){
   const terms=(options['--search']||'').toLowerCase().trim().split(/\s+/).filter(Boolean);
   const found=registry.items.filter(item=>(!options['--style']||item.theme===options['--style'])&&terms.every(t=>[item.id,item.theme,item.title,item.medium].join(' ').toLowerCase().includes(t)));
   const limit=Number(options['--limit']||(options['--all']?registry.count:12));
   if(!Number.isInteger(limit)||limit<1||limit>registry.count)throw Error(`--limit must be 1–${registry.count}.`);
   console.log(JSON.stringify({families:registry.families,total:registry.count,matched:found.length,items:found.slice(0,limit).map(({files,...item})=>item)},null,2));
  }else{
   const item=registry.items.find(i=>i.id===options['--id']);if(!item)throw Error('Unknown composition ID; search first.');
   if(!options['--out'])throw Error('Use --out with a new job directory.');
   const destination=path.resolve(options['--out']);
   if(destination===skill||inside(skill,destination))throw Error('Keep job output outside the installed Skill.');
   try{await fs.lstat(destination);throw Error('Output already exists; choose a new job directory.');}catch(error){if(error.code!=='ENOENT')throw error;}
   const resources=[];
   for(const relative of item.files){
    const source=path.resolve(library,relative),target=path.resolve(destination,relative);
    if(!inside(library,source)||!inside(destination,target))throw Error('Resource path escapes the composition library.');
    const resolved=await fs.realpath(source);if(!inside(library,resolved))throw Error('Linked resource escapes the composition library.');
    if(!(await fs.stat(resolved)).isFile())throw Error('Composition resource must be a file.');
    resources.push({relative,target,bytes:await fs.readFile(resolved)});
   }
   await fs.mkdir(path.dirname(destination),{recursive:true});await fs.mkdir(destination);
   for(const file of resources){await fs.mkdir(path.dirname(file.target),{recursive:true});await fs.writeFile(file.target,file.bytes,{flag:'wx'});}
   console.log(JSON.stringify({id:item.id,theme:item.theme,medium:item.medium,entry:path.join(destination,item.entry),brief:path.join(destination,item.brief),design:item.design.startsWith('references/')?path.join(skill,item.design):path.join(destination,item.design),files:resources.map(r=>r.relative),next:item.medium==='vector'?'Read the brief/design, then render the copied scene.json with scripts/musedraw.mjs.':'Open the copied index.html. Adapt its complete HTML/CSS/JavaScript and data together; use the report builder for its matching data-driven report.'},null,2));
  }
 }
}catch(error){console.error(error.message);process.exitCode=1;}
