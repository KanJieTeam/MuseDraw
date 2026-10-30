// Run every bounded-family suite, retaining each result even if another fails.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2),value=key=>{const i=args.indexOf(key);if(i<0)return null;if(!args[i+1]||args[i+1].startsWith('--'))throw Error('Missing '+key);return args[i+1]};
const playwright=value('--playwright'),out=path.resolve(value('--out')??path.join(root,'output/musecore-qa'));
if(args.some((v,i)=>i%2===0&&!['--playwright','--out'].includes(v)))throw Error('Unsupported option');
await fs.mkdir(out,{recursive:true});const folder=path.join(root,'skills/musedraw/tests/musecore'),suites=(await fs.readdir(folder)).filter(n=>n.endsWith('.test.mjs')).sort(),results=[];
for(const suite of suites){
 const result=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[path.join(folder,suite)],{cwd:root,env:{...process.env,...(playwright?{MUSEDRAW_PLAYWRIGHT:path.resolve(playwright)}:{})},windowsHide:true});let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);child.on('error',reject);child.on('close',code=>resolve({suite,code,stdout,stderr}))});
 await fs.writeFile(path.join(out,suite+'.log'),result.stdout+result.stderr);results.push({suite,exitCode:result.code});process.stdout.write(JSON.stringify(results.at(-1))+'\n');if(result.code)process.stderr.write(result.stderr||result.stdout);
}
await fs.writeFile(path.join(out,'results.json'),JSON.stringify({results,passed:results.every(r=>r.exitCode===0),note:'Execution and measured layout, not aesthetic approval.'},null,2));if(results.some(r=>r.exitCode!==0))process.exitCode=1;
