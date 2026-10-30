// Search a small registry; copy only the selected native-vector example into a job.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const skill=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2),value=key=>args.includes(key)?args[args.indexOf(key)+1]:undefined;
const registry=JSON.parse(await fs.readFile(path.join(skill,'assets/case-library/index.json'),'utf8'));
let coreExamples=[];try{coreExamples=JSON.parse(await fs.readFile(path.join(skill,'assets/musecore/index.json'),'utf8')).examples}catch(error){if(error.code!=='ENOENT')throw error}
const coreFor=id=>coreExamples.find(example=>example.source?.case===id||example.sourceCases?.some(source=>source.id===id));
const describe=item=>{const core=coreFor(item.id);return core?{...item,contentDriven:{family:core.family,example:core.id,next:`Use core example ${core.id} --out <new-input.json>, check that family's scope, then core render. Exact source replay remains available.`}}:item};
const inside=(base,file)=>{const rel=path.relative(base,file);return rel!==''&&!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel);};
try{
 const id=value('--id'),query=(value('--search')||'').trim().toLowerCase();
 if(!id){
  const limit=Number(value('--limit')||(args.includes('--all')?registry.count:12));
  if(!Number.isInteger(limit)||limit<1||limit>registry.count)throw Error(`--limit must be 1–${registry.count}`);
  const terms=query.split(/\s+/).filter(Boolean);
  const matches=registry.items.filter(item=>terms.every(term=>[item.id,item.title,item.category,item.theme,item.method,item.brief].join(' ').toLowerCase().includes(term)));
  console.log(JSON.stringify({total:registry.count,matched:matches.length,items:matches.slice(0,limit).map(describe)},null,2));
 }else{
  const item=registry.items.find(item=>item.id===id);if(!item)throw Error('Unknown case ID; search the registry first.');
  if(!value('--out'))throw Error('Use --out with an empty job directory.');
  const candidates=value('--library')?[path.resolve(value('--library'))]:[path.resolve(skill,'../../',registry.libraryPath),path.join(skill,'assets/case-library/visual-cases')];
  let library;
  for(const candidate of candidates){try{await fs.access(path.join(candidate,'catalog.json'));library=await fs.realpath(candidate);break;}catch{}}
  if(!library)throw Error('Case files are not installed. Use the full repository, or extract the visual-cases pack and pass --library <visual-cases folder>. See references/case-library.md.');
  const source=await fs.realpath(path.join(library,item.id));if(!inside(library,source))throw Error('Case path escapes the library.');
  const destination=path.resolve(value('--out'));if(destination===library||inside(library,destination))throw Error('Keep job output outside the case library.');
  const names=['scene.json','diagram.svg','source.svg','preview.jpg','original.png','prompt.md','design.md','author-notes.md','source-meta.json'],files=[];
  for(const name of names){const from=await fs.realpath(path.join(source,name));if(!inside(source,from))throw Error('Linked case resource escapes its folder.');const bytes=await fs.readFile(from);const to=path.join(destination,name);try{const existing=await fs.readFile(to);if(!existing.equals(bytes))throw Error(`Refusing to replace existing ${name}; choose a new output directory.`);}catch(error){if(error.code!=='ENOENT')throw error;}files.push({to,bytes});}
  const scene=JSON.parse(files.find(file=>path.basename(file.to)==='scene.json').bytes.toString('utf8'));if(scene.type!=='vector'||typeof scene.nativeSvg!=='string')throw Error('Expected the library native-vector scene contract.');
  await fs.mkdir(destination,{recursive:true});for(const file of files)await fs.writeFile(file.to,file.bytes);
  console.log(JSON.stringify({id:item.id,title:item.title,out:destination,files:names,...(coreFor(item.id)?{contentDriven:describe(item).contentDriven}:{}),next:'Read design.md and prompt.md; render scene.json with the existing MuseDraw CLI. Preserve the original before adapting its nativeSvg.'},null,2));
 }
}catch(error){console.error(error.message);process.exitCode=1;}
