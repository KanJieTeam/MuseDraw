#!/usr/bin/env node
// Small preflight for new office/research diagrams. It does not judge taste;
// it catches the most common fallback that made MuseDraw outputs look like
// generic dashboards: a wall of equal cards with no declared representation.
import fs from 'node:fs';
import {representationModel} from './engine/representation-view.mjs';

const allowed = new Set(['entity-chain','evidence-branch','source-to-output','swimlane','timeline','boundary-map','array-reorder']);

function issue(code, message, severity='error') { return { code, message, severity }; }

// Array peers legitimately share dimensions. Exempt only an intact two-view
// identity contract, never a profile name pasted onto an unrelated card wall.
function checkArrayReorder(scene) {
  const need=(ok,message)=>{if(!ok)throw Error(message)};
  const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
  const same=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<.01;
  const fields=(value,allowed,label)=>{need(object(value),`${label} must be an object`);for(const key of Object.keys(value))need(allowed.includes(key),`${label}.${key} is unsupported`)};
  try {
    const data=scene.meta.arrayRepresentation;
    fields(data,['sourceId','sourceShape','targetShape','mapping','scope','orientation','layout','geometry'],'arrayRepresentation');
    need(data.orientation==='row-major','orientation must be row-major');
    need(['side-by-side','stacked'].includes(data.layout),'layout must name the actual two-view arrangement');
    need(Array.isArray(data.mapping)&&data.mapping.length>=2&&data.mapping.length<=24,'mapping requires 2..24 elements');
    const count=data.mapping.length;
    for(const key of ['sourceShape','targetShape'])need(Array.isArray(data[key])&&data[key].length===2&&data[key].every(v=>Number.isSafeInteger(v)&&v>=1&&v<=24)&&data[key][0]*data[key][1]===count,`${key} must exactly match the mapping count`);
    const positions=new Set();
    for(const [i,row] of data.mapping.entries()){
      fields(row,['id','value','label','from','to'],'mapping row');
      for(const [key,shape] of [['from',data.sourceShape],['to',data.targetShape]]){fields(row[key],['row','column'],key);need(Number.isInteger(row[key].row)&&row[key].row>=0&&row[key].row<shape[0]&&Number.isInteger(row[key].column)&&row[key].column>=0&&row[key].column<shape[1],`${key} position is outside the declared shape`)}
      const position=row.from.row*data.sourceShape[1]+row.from.column;need(!positions.has(position),'duplicate source position');positions.add(position);
      need(row.to.row===Math.floor(i/data.targetShape[1])&&row.to.column===i%data.targetShape[1],'target positions must enumerate the declared order exactly once');
    }
    const sourceRows=[...data.mapping].sort((a,b)=>a.from.row-b.from.row||a.from.column-b.from.column);
    representationModel({method:'representation',title:'Identity check',source:{id:data.sourceId,shape:data.sourceShape,elements:sourceRows.map(({id,value,label})=>({id,value,label}))},target:{shape:data.targetShape,order:data.mapping.map(row=>row.id)}});
    need(Array.isArray(scene.size)&&scene.size.length===2&&scene.size.every(v=>Number.isFinite(v)&&v>0),'scene requires a finite canvas');
    need(Array.isArray(scene.nodes)&&scene.nodes.length===count*2,'exactly two native cells per mapped element required');
    need(Array.isArray(scene.texts),'native cell texts are required');
    need(Array.isArray(data.geometry)&&data.geometry.length===count*2,'geometry requires both views of every element');
    const nodes=new Map(scene.nodes.map(node=>[node.id,node]));need(nodes.size===scene.nodes.length,'duplicate native cell ID');
    const allIds=[...scene.nodes,...scene.texts,...(scene.paths??[])].map(part=>part.id);need(allIds.every(id=>typeof id==='string')&&new Set(allIds).size===allIds.length,'native node/text/path IDs must be unique');
    for(const key of ['blocks','edges','zones','lines','notes','nativeModules'])need(!scene[key]?.length,`array contract cannot exempt additional ${key}`);
    need(Array.isArray(scene.paths)&&scene.paths.length===1&&scene.paths[0].id==='representation-operation','one representation operation path required');
    const ownedText=new Set(),byView={source:new Map(),target:new Map()},mapped=new Map(data.mapping.map(row=>[row.id,row]));let cellW,cellH;
    for(const g of data.geometry){
      fields(g,['view','id','nodeId','x','y','w','h'],'geometry row');need(g.view==='source'||g.view==='target','unknown geometry view');need(mapped.has(g.id),'geometry references an unknown element');need(!byView[g.view].has(g.id),'duplicate element geometry');byView[g.view].set(g.id,g);
      const nodeId=`representation-${g.view}-${encodeURIComponent(g.id).replace(/-/gu,'%2D')}`;need(g.nodeId===nodeId,'geometry must reference the identity-derived native cell');const node=nodes.get(nodeId);need(node,'mapped native cell is missing');
      need([g.x,g.y,g.w,g.h].every(Number.isFinite)&&g.x>=0&&g.y>=0&&g.w>0&&g.h>0&&g.x+g.w<=scene.size[0]+.01&&g.y+g.h<=scene.size[1]+.01,'cell geometry must fit the canvas');
      need(['x','y','w','h'].every(key=>same(node[key],g[key])),'native cell differs from declared geometry');need((node.shape??'box')==='box'&&node.label===''&&node.labelPos==='none','each array cell must be a plain native box with separately checked texts');
      if(cellW===undefined){cellW=g.w;cellH=g.h}else need(same(g.w,cellW)&&same(g.h,cellH),'both array views must preserve cell dimensions');
      const row=mapped.get(g.id);
      for(const [role,value,max] of [['id',g.id,3],['value',String(row.value),3],['label',row.label,6]]){
        const prefix=`${nodeId}-${role}-`,lines=scene.texts.filter(t=>typeof t.id==='string'&&t.id.startsWith(prefix)).map(t=>({t,index:Number(t.id.slice(prefix.length))})).sort((a,b)=>a.index-b.index);
        need(lines.length>=1&&lines.length<=max&&lines.every(({t,index},i)=>Number.isInteger(index)&&index===i&&t.id===prefix+i),`${g.view}/${g.id}: missing or duplicated ${role} line`);
        need(lines.map(({t})=>t.text).join('')===value,`${g.view}/${g.id}: ${role} text differs from source identity`);
        let lastY=-Infinity;
        for(const {t} of lines){fields(t,['id','x','y','text','size','weight','color'],'cell text');need(typeof t.text==='string'&&Number.isFinite(t.size)&&t.size>0&&Number.isFinite(t.x)&&Number.isFinite(t.y)&&t.x>=g.x&&t.x<g.x+g.w&&t.y>=g.y&&t.y<g.y+g.h,'cell text must stay attached to its native geometry');need(t.y>lastY,'text lines must keep reading order');lastY=t.y;ownedText.add(t.id)}
      }
    }
    for(const [view,shape,key] of [['source',data.sourceShape,'from'],['target',data.targetShape,'to']]){
      need(byView[view].size===count,`incomplete ${view} geometry`);const originRow=data.mapping.find(row=>row[key].row===0&&row[key].column===0),origin=byView[view].get(originRow.id);
      for(const row of data.mapping){const g=byView[view].get(row.id);need(same(g.x,origin.x+row[key].column*(cellW+8))&&same(g.y,origin.y+row[key].row*(cellH+8)),`${view} geometry does not match the declared matrix positions`)}
      const prefix=`representation-${view}-label-`,label=scene.texts.filter(t=>typeof t.id==='string'&&t.id.startsWith(prefix)&&/^\d+$/u.test(t.id.slice(prefix.length))).sort((a,b)=>Number(a.id.slice(prefix.length))-Number(b.id.slice(prefix.length))).map(t=>t.text).join('');need(label===`${view==='source'?'源表示':'目标表示'}  ${shape[0]} × ${shape[1]}`,`${view} visible shape label differs from its declared shape`);
    }
    const bounds=view=>{const gs=[...byView[view].values()];return {x:Math.min(...gs.map(g=>g.x)),y:Math.min(...gs.map(g=>g.y)),right:Math.max(...gs.map(g=>g.x+g.w)),bottom:Math.max(...gs.map(g=>g.y+g.h))}};
    const a=bounds('source'),b=bounds('target');need(data.layout==='side-by-side'?a.right<b.x&&same(a.y,b.y):a.bottom<b.y&&same((a.x+a.right)/2,(b.x+b.right)/2),'view arrangement disagrees with the declared layout');
    for(const t of scene.texts)need(ownedText.has(t.id)||/^representation-(?:title|source-label|target-label|note)-\d+$/u.test(t.id),'unmapped native text cannot use the array exemption');
    return [];
  } catch(error) { return [issue('array-reorder-contract',error.message)]; }
}

export function lintRepresentation(scene, { strict=false } = {}) {
  const meta = scene?.meta ?? {};
  const out = [];
  const profile = meta.representation;
  if (strict && (!profile || !allowed.has(profile))) {
    out.push(issue('representation-missing', `scene.meta.representation must be one of: ${[...allowed].join(', ')}`));
  } else if (profile && !allowed.has(profile)) {
    out.push(issue('representation-unknown', `unknown representation "${profile}"`));
  }
  if (strict && (!meta.readerQuestion || typeof meta.readerQuestion !== 'string'||!meta.readerQuestion.trim())) {
    out.push(issue('reader-question-missing', 'scene.meta.readerQuestion is required for a new routed diagram'));
  }
  if (profile && meta.readerQuestion && typeof meta.readerQuestion !== 'string') {
    out.push(issue('reader-question-invalid', 'scene.meta.readerQuestion must be text'));
  }

  const arrayIssues=profile==='array-reorder'?checkArrayReorder(scene):[],validArray=profile==='array-reorder'&&arrayIssues.length===0;
  out.push(...arrayIssues);
  const nodes = Array.isArray(scene?.nodes) ? scene.nodes : [];
  if (nodes.length >= 8 && !validArray) {
    const boxes = nodes.filter(n => (n.shape ?? 'box') === 'box');
    const sameSize = new Map();
    for (const n of boxes) {
      const key = `${Math.round((n.w ?? 0) / 8)}x${Math.round((n.h ?? 0) / 8)}`;
      sameSize.set(key, (sameSize.get(key) ?? 0) + 1);
    }
    const dominant = Math.max(0, ...sameSize.values());
    const equalShapes = boxes.length >= Math.ceil(nodes.length * .65) && dominant >= Math.ceil(boxes.length * .65);
    const xs = new Set(nodes.map(n => Math.round((n.x ?? 0) / 24)));
    const ys = new Set(nodes.map(n => Math.round((n.y ?? 0) / 24)));
    if (equalShapes && xs.size >= 3 && ys.size <= 5) {
      out.push(issue('equal-card-wall', 'many same-size box nodes form a generic card wall; choose a relationship-led representation or split the figure'));
    }
  }
  const edges = Array.isArray(scene?.edges) ? scene.edges : [];
  if (edges.length && edges.filter(e => !e.label).length > Math.ceil(edges.length * .75)) {
    out.push(issue('unlabelled-edges', 'most connectors have no supplied relationship label; remove decorative arrows or name the actual relation', 'warning'));
  }
  if (strict && profile && nodes.length > 25 && !validArray) {
    out.push(issue('too-dense', 'more than 25 objects in one routed view; split into overview and detail'));
  }
  return out;
}

if (process.argv[1] && process.argv[1].endsWith('representation-lint.mjs')) {
  const file = process.argv[2];
  const strict = process.argv.includes('--strict');
  if (!file) { console.error('Usage: node representation-lint.mjs scene.json [--strict]'); process.exit(1); }
  const scene = JSON.parse(fs.readFileSync(file, 'utf8'));
  const issues = lintRepresentation(scene, {strict});
  console.log(JSON.stringify({ok: !issues.some(x => x.severity === 'error'), issues}, null, 2));
  if (issues.some(x => x.severity === 'error')) process.exitCode = 2;
}

