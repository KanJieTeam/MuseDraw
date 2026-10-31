import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {cap2ComponentContextModel} from '../../scripts/musecore/cap2-component-context-models.mjs';
import {architectureModel} from '../../scripts/musecore/architecture-models.mjs';
const source=JSON.parse(await fs.readFile(new URL('../../assets/musecore/cap2-component-shortlink-source.json',import.meta.url),'utf8'));
test('source retains all six components, six external objects, eleven directed relationships and null unknowns',()=>{
 const m=cap2ComponentContextModel(source);assert.deepEqual(m.counts,{components:6,externals:6,internal:5,boundary:5,externalContext:1});assert.equal(m.relationships.find(l=>l.id==='subscribe').relationKind,'external-context');assert.equal(m.externals.find(n=>n.id==='statistics').inside,false);assert.equal(m.externals.find(n=>n.id==='statistics').ownership,'其他团队');assert.equal(m.relationships.find(l=>l.id==='click').label,null);assert(m.components.every(n=>n.technology===null));assert.deepEqual(m.relationships.map(({id,from,to,label,technology})=>({id,from,to,label,technology})),source.relationships);assert.equal(m.readerQuestion,source.readerQuestion);
});
test('existing architecture guard specifically refuses the external context edge',()=>{
 const input={family:'architecture',title:source.title,subtitle:source.subtitle,level:'component',scope:{...source.scope,kind:'container'},root:'repository',nodes:source.components.map(n=>({...n,kind:'component',technology:n.technology??'未提供'})),externals:source.externals.map(({placement,ownership,...n})=>({...n,band:placement,...(n.kind==='person'?{technology:undefined}:{})})),links:source.relationships.map(l=>({...l,label:l.label??'未提供',technology:l.technology??'未提供'})),note:source.note};assert.throws(()=>architectureModel(input),/external-to-external link outside boundary view/);
});
test('new context chain recomputes outside layers while preserving caller labels and unknown technologies',()=>{
 const b=structuredClone(source);b.externals.push({id:'archive',label:'调用者命名的归档端（不移入 API）',kind:'container',containerType:'data',technology:null,detail:'调用者明确给出的静态下游',placement:'after',ownership:null});b.relationships.push({id:'archive-link',from:'statistics',to:'archive',label:'已给定的归档关系与完整说明',technology:null});b.note='Caller notes 保留，不推断未知吞吐量或因果。';const m=cap2ComponentContextModel(b);assert.equal(m.counts.externalContext,2);assert.deepEqual(m.externalLayers,[['redis','mysql','kafka'],['statistics'],['archive']]);assert.equal(m.note,b.note);assert.equal(m.externals.at(-1).label,b.externals.at(-1).label);
});
test('reject cycles, disconnected context, wrong side, accidental component ownership and unsupported data',()=>{
 for(const mutate of [b=>b.relationships.push({id:'cycle',from:'statistics',to:'kafka',label:'回环',technology:null}),b=>b.relationships=b.relationships.filter(l=>l.id!=='subscribe'),b=>b.externals.find(n=>n.id==='statistics').placement='before',b=>b.relationships[0].to='unknown',b=>b.components[0].kind='container',b=>b.components[0].technology=undefined,b=>b.relationships[0].throughput=0,b=>b.relationships.push({...b.relationships[0],id:'parallel'})]){const b=structuredClone(source);mutate(b);assert.throws(()=>cap2ComponentContextModel(b))}
});
