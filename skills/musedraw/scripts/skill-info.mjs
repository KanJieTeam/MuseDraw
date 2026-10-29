#!/usr/bin/env node
// Local installed-copy identity. Does not fetch, install, or mutate anything.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const root=path.resolve(import.meta.dirname,'..');
const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
const files={};
for(const relative of ['SKILL.md','references/musecore.md']){
 const bytes=await fs.readFile(path.join(root,relative));
 files[relative]=createHash('sha256').update(bytes).digest('hex');
}
const entry=await fs.readFile(path.join(root,'SKILL.md'),'utf8');
console.log(JSON.stringify({name:pkg.name,version:pkg.version,
 instructionsVersion:entry.match(/^\s+instructions-version:\s*(\S+)/m)?.[1]??null,
 root,files},null,2));
