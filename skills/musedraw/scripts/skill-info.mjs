#!/usr/bin/env node
// Local installed-copy identity. Does not fetch, install, or mutate anything.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const root=path.resolve(import.meta.dirname,'..');
const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
const files={};
const coreModules=(await fs.readdir(path.join(root,'scripts/musecore'))).filter(name=>name.endsWith('.mjs')).sort().map(name=>'scripts/musecore/'+name);
const coreExamples=(await fs.readdir(path.join(root,'assets/musecore'))).filter(name=>name.endsWith('.json')).sort().map(name=>'assets/musecore/'+name);
for(const relative of ['SKILL.md','references/musecore.md','references/musecore-runtime.md','references/musecore-visual-runtime.md','references/musecore-spatial-data.md','references/musecore-distributions.md','references/musecore-workflows.md','references/musecore-objects.md','references/case-library.md','scripts/case-library.mjs','scripts/musecore.mjs',...coreModules,...coreExamples]){
 const bytes=await fs.readFile(path.join(root,relative));
 files[relative]=createHash('sha256').update(bytes).digest('hex');
}
const entry=await fs.readFile(path.join(root,'SKILL.md'),'utf8');
console.log(JSON.stringify({name:pkg.name,version:pkg.version,
 instructionsVersion:entry.match(/^\s+instructions-version:\s*(\S+)/m)?.[1]??null,
 root,files},null,2));
