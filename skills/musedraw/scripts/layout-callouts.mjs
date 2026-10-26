#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {validatePlan,layoutCallouts,appendCallouts} from './engine/callout-layout.mjs';
import {createBrowserMeasurer} from './engine/callout-measure.mjs';

const help='Usage: node scripts/layout-callouts.mjs SCENE.json PLAN.json --out DIRECTORY --playwright MODULE [--browser EXECUTABLE]';
const args=process.argv.slice(2);
if(args.includes('--help')) { console.log(help); process.exit(0); }
let output, measurer, ownsOutput=false;
try {
  const [sceneFile,planFile,...rest]=args, options={};
  if(!sceneFile || !planFile || rest.length%2) throw new Error(help);
  for(let i=0;i<rest.length;i+=2) { if(!['--out','--playwright','--browser'].includes(rest[i]) || options[rest[i]]) throw new Error(help); options[rest[i]]=rest[i+1]; }
  if(!options['--out'] || !options['--playwright']) throw new Error(help);
  output=path.resolve(options['--out']); await fs.mkdir(path.dirname(output),{recursive:true});
  try { await fs.mkdir(output); ownsOutput=true; }
  catch(error) { if(error.code==='EEXIST') {const e=new Error('Output directory already exists; use a new revision directory. Existing files were preserved.');e.code='OUTPUT_EXISTS';throw e;} throw error; }
  const readJSON=async file=>JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/,''));
  const scene=await readJSON(sceneFile), plan=await readJSON(planFile);
  const p=validatePlan(scene.size,plan);
  measurer=await createBrowserMeasurer({playwright:options['--playwright'],browser:options['--browser'],fontSize:p.fontSize,fontFamily:p.fontFamily,scene,annotations:p.annotations});
  const layout=await layoutCallouts(scene.size,plan,measurer.measure), result=appendCallouts(scene,layout);
  const hash=s=>createHash('sha256').update(s).digest('hex');
  const report={passed:true,sourceSvgSHA256:hash(scene.nativeSvg),planSHA256:hash(JSON.stringify(plan)),measurement:measurer.info,...layout,scope:'Declared blank left/right lanes only. Anchors and subject artwork are supplied; leaders are annotation geometry, not causal edges. No obstacle or leader-crossing avoidance.'};
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  await fs.writeFile(path.join(output,'scene.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({scene:path.join(output,'scene.json'),report:path.join(output,'report.json'),labels:layout.labels.length}));
} catch(error) {
  const failure={passed:false,code:error.code || 'ERROR',message:error.message,details:error.details || {}};
  if(ownsOutput) await fs.writeFile(path.join(output,'report.json'),JSON.stringify(failure,null,2)+'\n');
  console.error(JSON.stringify(failure)); process.exitCode=1;
} finally { await measurer?.close(); }
