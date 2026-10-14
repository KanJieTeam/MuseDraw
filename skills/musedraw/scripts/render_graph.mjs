// Semantic graph -> native geometry. Shared mechanics, independent composition
// strategies and data-only styles; no gallery files or industry labels imported.
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {protectedPage,validateSvg,previewDocument,measureLayout} from './preview.mjs';
import {orthogonalRoute,relationshipPorts,pathObstacles,intersectsBox} from './route_edges.mjs';

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const snap=n=>Math.ceil(n/4)*4;
const digest=s=>createHash('sha256').update(s).digest('hex');
const ident=s=>{if(typeof s!=='string'||! /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(s))throw Error('Use a bounded ASCII ID');return s;};
const label=s=>{if(typeof s!=='string'||!s.trim()||s.length>160)throw Error('Use a nonempty label of at most 160 characters');return s.trim();};
function keys(o,allowed){if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).some(k=>!allowed.includes(k)))throw Error('Unknown field or invalid object; send semantic content, not coordinates');}

export function normalizeGraph(raw){
 keys(raw,['title','nodes','groups','edges']);
 if(!Array.isArray(raw.nodes)||!raw.nodes.length||raw.nodes.length>80||!Array.isArray(raw.groups??[])||(raw.groups??[]).length>12||!Array.isArray(raw.edges??[])||(raw.edges??[]).length>160)throw Error('Expected 1–80 nodes, at most 12 flat groups and 160 edges');
 const groups=(raw.groups??[]).map(g=>{keys(g,['id','label','role']);const role=g.role??'domain';if(!['control','data','domain'].includes(role))throw Error('Unknown group role');return {id:ident(g.id),label:label(g.label),role};});
 const gids=new Set(groups.map(g=>g.id));if(gids.size!==groups.length)throw Error('Duplicate group ID');
 const nodes=raw.nodes.map(n=>{keys(n,['id','label','kind','parent','focus']);const kind=n.kind??'service';if(!['service','store','client','queue'].includes(kind))throw Error('Unknown node role');const parent=n.parent??null;if(parent!==null&&!gids.has(parent))throw Error('Missing ownership group');if(n.focus!==undefined&&typeof n.focus!=='boolean')throw Error('Focus must be boolean');return {id:ident(n.id),label:label(n.label),kind,parent,focus:n.focus??false};});
 const ids=new Set(nodes.map(n=>n.id));if(ids.size!==nodes.length||nodes.some(n=>gids.has(n.id)))throw Error('Node and group IDs must be unique');
 if(groups.some(g=>!nodes.some(n=>n.parent===g.id)))throw Error('Empty groups are not drawn; remove them explicitly');
 const edgeIds=new Set(),pairs=new Set();
 const edges=(raw.edges??[]).map(e=>{keys(e,['id','from','to','label','direction']);if(!ids.has(e.from)||!ids.has(e.to)||e.from===e.to)throw Error('An edge needs two different existing nodes');const direction=e.direction??'forward';if(!['forward','none'].includes(direction))throw Error('Unknown edge direction');const id=ident(e.id??'e-'+digest(e.from+'\0'+e.to+'\0'+direction).slice(0,16));const pair=e.from+'\0'+e.to;if(edgeIds.has(id)||pairs.has(pair)||ids.has(id)||gids.has(id))throw Error('Duplicate edge ID or ambiguous repeated endpoint pair');edgeIds.add(id);pairs.add(pair);return {id,from:e.from,to:e.to,label:e.label?label(e.label):'',direction};});
 const all=[...ids,...gids,...edgeIds],generated=['diagram-title','signature','layout-metadata','arrow','pencil-hatch',...all,...all.map(id=>id+'-label'),...all.map(id=>id+'-outline'),...all.map(id=>id+'-glyph')];
 if(new Set(generated).size!==generated.length)throw Error('IDs collide with renderer-generated elements');
 return {title:label(raw.title),groups,nodes,edges};
}

export function applyOperations(input,operations){
 if(!Array.isArray(operations)||!operations.length||operations.length>30)throw Error('Expected 1–30 explicit edit operations');
 const graph=structuredClone(normalizeGraph(input));
 for(const op of operations){
  if(!op||typeof op!=='object')throw Error('Invalid operation');
  if(op.op==='rename_node'){keys(op,['op','id','label']);const n=graph.nodes.find(n=>n.id===op.id);if(!n)throw Error('Node not found');n.label=label(op.label);}
  else if(op.op==='add_node'){keys(op,['op','node']);graph.nodes.push(op.node);}
  else if(op.op==='remove_node'){keys(op,['op','id']);if(!graph.nodes.some(n=>n.id===op.id))throw Error('Node not found');graph.nodes=graph.nodes.filter(n=>n.id!==op.id);graph.edges=graph.edges.filter(e=>e.from!==op.id&&e.to!==op.id);}
  else if(op.op==='add_edge'){keys(op,['op','edge']);graph.edges.push(op.edge);}
  else if(op.op==='remove_edge'){keys(op,['op','id']);if(!graph.edges.some(e=>e.id===op.id))throw Error('Edge not found');graph.edges=graph.edges.filter(e=>e.id!==op.id);}
  else throw Error('Unsupported operation');
 }
 return normalizeGraph(graph); // Atomic: input remains unchanged on any failure.
}

export async function graphStyle(name){
 const data=JSON.parse(await fs.readFile(path.join(import.meta.dirname,'../references/graph-styles.json'),'utf8'));
 const key=Object.keys(data.styles).find(k=>k===name||data.styles[k].id===name);
 if(!key)throw Error('Unknown graph style; currently 手绘线稿 or 终端色域');
 return {...data.styles[key],name:key,version:data.version};
}

// Condense strongly connected components before ranking; cycles remain cycles.
export function graphRanks(nodes,edges){
 const next=new Map(nodes.map(n=>[n.id,[]]));for(const e of edges)next.get(e.from).push(e.to);
 let seq=0;const index=new Map(),low=new Map(),stack=[],on=new Set(),components=[];
 function visit(v){index.set(v,seq);low.set(v,seq++);stack.push(v);on.add(v);for(const w of next.get(v)){if(!index.has(w)){visit(w);low.set(v,Math.min(low.get(v),low.get(w)));}else if(on.has(w))low.set(v,Math.min(low.get(v),index.get(w)));}if(low.get(v)===index.get(v)){const group=[];let w;do{w=stack.pop();on.delete(w);group.push(w);}while(w!==v);components.push(group);}}
 for(const n of nodes)if(!index.has(n.id))visit(n.id);
 const cids=new Map(components.flatMap((c,i)=>c.map(id=>[id,i]))),parents=components.map(()=>new Set());
 for(const e of edges)if(cids.get(e.from)!==cids.get(e.to))parents[cids.get(e.to)].add(cids.get(e.from));
 const ranks=new Map();function rank(i){if(!ranks.has(i))ranks.set(i,Math.max(0,...[...parents[i]].map(p=>rank(p)+1)));return ranks.get(i);}
 return new Map(nodes.map(n=>[n.id,rank(cids.get(n.id))]));
}

const overlap=(a,b)=>Math.min(a[0]+a[2],b[0]+b[2])>Math.max(a[0],b[0])+1&&Math.min(a[1]+a[3],b[1]+b[3])>Math.max(a[1],b[1])+1;
function union(boxes,pad=28,head=48){const x=Math.min(...boxes.map(b=>b[0]))-pad,y=Math.min(...boxes.map(b=>b[1]))-head;return [x,y,Math.max(...boxes.map(b=>b[0]+b[2]))-x+pad,Math.max(...boxes.map(b=>b[1]+b[3]))-y+pad];}

export function layoutGraph(scene,style,measure,composition,gutter=192){
 if(!['flow','planes'].includes(composition))throw Error('Supported compositions are flow and planes');
 const nodeSize=n=>[snap(Math.max(n.kind==='client'?200:240,measure(n.label,style.bodySize,500)+64)),n.kind==='client'?128:n.kind==='store'?128:100];
 let nodes=[],groups=[],W,H;
 if(composition==='flow'){
  const ranks=graphRanks(scene.nodes,scene.edges),columns=[];
  for(let r=0;r<=Math.max(...ranks.values());r++)columns.push(scene.nodes.filter(n=>ranks.get(n.id)===r));
  const widths=columns.map(c=>Math.max(...c.map(n=>nodeSize(n)[0]))),heights=columns.map(c=>c.reduce((h,n)=>h+nodeSize(n)[1],0)+(c.length-1)*gutter*.6);
  H=snap(Math.max(620,...heights.map(h=>h+300)));let x=128;
  for(let i=0;i<columns.length;i++){let y=170+(H-300-heights[i])/2;for(const n of columns[i]){const [w,h]=nodeSize(n);nodes.push({...n,box:[x+(widths[i]-w)/2,snap(y),w,h]});y+=h+gutter*.6;}x+=widths[i]+gutter;}
  W=snap(Math.max(1000,x-gutter+128));
  groups=scene.groups.map(g=>({...g,title:g.label,box:union(nodes.filter(n=>n.parent===g.id).map(n=>n.box))}));
  if(groups.some((g,i)=>groups.slice(i+1).some(other=>overlap(g.box,other.box))))throw Error('Ownership groups overlap in ranked flow; use planes or split the detail view');
  if(groups.some(g=>nodes.some(n=>n.parent!==g.id&&overlap(g.box,n.box))))throw Error('Ownership group overlaps an unrelated node in ranked flow; use planes or split the detail view');
 }else{
  if(!scene.groups.length)throw Error('Planes needs real ownership groups; use flow when ownership is not provided');
  const outside=scene.nodes.filter(n=>!n.parent),outerIds=new Set(outside.map(n=>n.id));
  const ranks=outside.length?graphRanks(outside,scene.edges.filter(e=>outerIds.has(e.from)&&outerIds.has(e.to))):new Map();
  const externalColumns=outside.length?Math.max(...ranks.values())+1:0,externalWidth=externalColumns*(280+gutter),gx=100+externalWidth;
  const columnGap=Math.max(120,gutter*.65);
  const rowsFor=g=>{const members=scene.nodes.filter(n=>n.parent===g.id),rows=[];for(let i=0;i<members.length;i+=3)rows.push(members.slice(i,i+3));return rows;};
  const groupWidth=Math.max(660,...scene.groups.flatMap(g=>rowsFor(g).map(row=>row.reduce((w,n)=>w+nodeSize(n)[0],0)+(row.length-1)*columnGap+96)));
  let y=160;
  for(const g of scene.groups){const rows=rowsFor(g),rowHeights=rows.map(row=>Math.max(...row.map(n=>nodeSize(n)[1]))),height=rowHeights.reduce((a,b)=>a+b,0)+(rows.length-1)*columnGap+120;groups.push({...g,title:g.label,box:[gx,y,groupWidth,height]});let rowY=y+80;for(const [ri,row] of rows.entries()){let x=gx+48;for(const n of row){const [w,h]=nodeSize(n);nodes.push({...n,box:[x,rowY,w,h]});x+=w+columnGap;}rowY+=rowHeights[ri]+columnGap;}y+=height+gutter*.7;}
  W=snap(gx+groupWidth+100);H=snap(y-gutter*.7+100);
  const seen=new Set();function target(id){if(seen.has(id))return null;seen.add(id);for(const e of scene.edges.filter(e=>e.from===id)){const n=scene.nodes.find(n=>n.id===e.to);if(n.parent)return n.parent;const found=target(n.id);if(found)return found;}return null;}
  const slots=new Map();
  for(const n of outside){seen.clear();const wanted=target(n.id),group=groups.find(g=>g.id===wanted)??groups[0],rank=ranks.get(n.id),key=group.id+':'+rank,count=slots.get(key)??0;slots.set(key,count+1);const [w,h]=nodeSize(n);nodes.push({...n,box:[100+rank*(280+gutter),snap(group.box[1]+(group.box[3]-h)/2+count*(h+48)),w,h]});}
  if(nodes.some(n=>n.box[1]+n.box[3]>H-48)||nodes.some((n,i)=>nodes.slice(i+1).some(other=>overlap(n.box,other.box))))throw Error('External endpoints need more room; split or regroup the plane view');
 }
 if(W>8000||H>8000)throw Error('Canvas exceeds supported size; split a detail view');
 W=snap(Math.max(W,measure(scene.title,style.titleSize,700)+240));
 return {nodes,groups,width:W,height:H};
}

export function composeGraph(scene,style,measure,composition,gutter){
 const layout=layoutGraph(scene,style,measure,composition,gutter),{nodes,groups,width:W,height:H}=layout;
 const pieces=[],bounds=[],textParts=[],paths=[];
 const body=style.bodySize;
 function text(id,value,box,size=body,color=style.ink,weight=500,anchor='middle',font=style.textFont){const [x,y,w,h]=box;if(measure(value,size,weight)>w-16)throw Error('Label is wider than its measured region: '+value);textParts.push(`<text id="${id}" x="${anchor==='middle'?x+w/2:x+8}" y="${y+h/2+size*.34}" text-anchor="${anchor}" font-family="${esc(font)}" font-size="${size}" font-weight="${weight}" fill="${color}">${esc(value)}</text>`);bounds.push({id,box});}
 text('diagram-title',scene.title,[64,28,W-240,80],style.titleSize,style.ink,700,'start');
 text('signature','MuseDraw',[W-168,H-48,120,36],16,style.muted,500,'middle',style.technicalFont);
 function rough(id,x,y,w,h){const j=(parseInt(digest(id).slice(0,6),16)%100)/70+.5;return `M${x+10} ${y} Q${x+w*.42} ${y-j} ${x+w-9} ${y+1} Q${x+w+1} ${y} ${x+w} ${y+10} L${x+w-j} ${y+h-9} Q${x+w} ${y+h+1} ${x+w-10} ${y+h} Q${x+w*.52} ${y+h+j} ${x+9} ${y+h} Q${x-1} ${y+h} ${x} ${y+h-10} L${x+j} ${y+9} Q${x} ${y-1} ${x+10} ${y} Z`;}
 for(const g of groups){const [x,y,w,h]=g.box;pieces.push(`<rect id="${g.id}" x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${style.boundary}" stroke-width="1.6" stroke-dasharray="8 6"/>`);text(g.id+'-label',g.label,[x+16,y+8,w-32,48],19,style.muted,500,'start');}
 for(const n of nodes){
  const [x,y,w,h]=n.box,group=groups.find(g=>g.id===n.parent),fill=style[group?.role??'data'];
  pieces.push(`<rect id="${n.id}" x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="none"/>`);
  if(n.kind==='store'){
   const cx=x,cy=y,cw=w,ch=h;
   pieces.push(`<path id="${n.id}-outline" d="M${cx} ${cy+16} C${cx} ${cy-5} ${cx+cw} ${cy-5} ${cx+cw} ${cy+16} V${cy+ch-16} C${cx+cw} ${cy+ch+5} ${cx} ${cy+ch+5} ${cx} ${cy+ch-16} Z M${cx} ${cy+16} C${cx} ${cy+36} ${cx+cw} ${cy+36} ${cx+cw} ${cy+16}" stroke="${style.accent}" stroke-width="${style.lineWidth}" fill="${style.outline==='seeded-pencil'?'url(#pencil-hatch)':fill}"/>`);
   text(n.id+'-label',n.label,[x+24,y+40,w-48,h-56]);
  }else if(n.kind==='client'&&style.clientTreatment==='open-person'){
   pieces.push(`<circle cx="${x+w/2}" cy="${y+24}" r="16" fill="none" stroke="${style.accent}" stroke-width="2"/><path id="${n.id}-glyph" d="M${x+w/2-32} ${y+68} Q${x+w/2-30} ${y+43} ${x+w/2} ${y+43} Q${x+w/2+30} ${y+43} ${x+w/2+32} ${y+68} Z" fill="none" stroke="${style.accent}" stroke-width="2"/>`);
   text(n.id+'-label',n.label,[x+8,y+76,w-16,44]);
   // Explicit small connection rails make the open glyph's ports visible.
   pieces.push(`<line x1="${x}" y1="${y+h/2}" x2="${x+w/2-32}" y2="${y+h/2}" stroke="${style.boundary}"/><line x1="${x+w/2+32}" y1="${y+h/2}" x2="${x+w}" y2="${y+h/2}" stroke="${style.boundary}"/>`);
  }else{
   if(style.outline==='seeded-pencil')pieces.push(`<path id="${n.id}-outline" d="${rough(n.id,x,y,w,h)}" fill="${n.focus?style.data:style.canvas}" stroke="${n.focus?style.accent:style.ink}" stroke-width="${n.focus?3:2}" stroke-linecap="round"/>`);
   else pieces.push(`<rect id="${n.id}-outline" x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${n.kind==='client'?style.data:fill}" stroke="none"/>`);
   text(n.id+'-label',n.label,[x+16,y+16,w-32,h-32],body,n.focus?style.accent:style.ink,500);
  }
 }
 const obstacles=nodes.map(n=>n.box).concat(bounds.filter(b=>!nodes.some(n=>b.id===n.id+'-label')).map(b=>b.box));
 const ports=relationshipPorts(nodes,scene.edges),reserved=[];
 // Establish local port access before routing long cross-domain branches.
 const order=scene.edges.map((e,i)=>({e,i,span:Math.abs(ports[i][0].point[0]-ports[i][1].point[0])+Math.abs(ports[i][0].point[1]-ports[i][1].point[1])})).sort((a,b)=>a.span-b.span||a.i-b.i);
 for(const {e,i} of order){
  let points;
  try{points=orthogonalRoute(...ports[i],obstacles,W,H,{priorPaths:paths.map(p=>p.points),crossingCost:80});}
  catch(error){throw Error(`${e.from} -> ${e.to}: ${error.message}`);}
  paths.push({...e,points});reserved.push(...pathObstacles(points,2));
 }
 for(const e of paths){
  if(e.label){
   const w=snap(measure(e.label,18,500)+24),h=40,candidates=e.points.slice(1).flatMap((q,i)=>{const p=e.points[i];return [.5,.3,.7].flatMap(t=>{const x=p[0]+t*(q[0]-p[0]),y=p[1]+t*(q[1]-p[1]);return p[1]===q[1]?[[x-w/2,y-h-8,w,h],[x-w/2,y+8,w,h]]:[[x+8,y-h/2,w,h],[x-w-8,y-h/2,w,h]];});});
   const box=candidates.find(b=>b[0]>24&&b[1]>112&&b[0]+b[2]<W-24&&b[1]+b[3]<H-56&&obstacles.every(o=>!overlap(o,b))&&reserved.every(o=>!overlap(o,b)));
   if(!box)throw Error('Relationship caption has no free region');text(e.id+'-label',e.label,box,18,style.muted,500);obstacles.push(box);e.labelBox=box;
  }
  let route='M'+e.points[0].join(' ');const bridges=[];
  for(let i=1;i<e.points.length;i++){
   const p=e.points[i-1],q=e.points[i],horizontal=p[1]===q[1],hits=[];
   for(const prior of paths.slice(0,paths.indexOf(e)))for(let j=1;j<prior.points.length;j++){
    const a=prior.points[j-1],b=prior.points[j];if((a[1]===b[1])===horizontal)continue;
    const x=horizontal?a[0]:p[0],y=horizontal?p[1]:a[1];
    if(x>=Math.min(p[0],q[0])&&x<=Math.max(p[0],q[0])&&y>=Math.min(p[1],q[1])&&y<=Math.max(p[1],q[1])&&x>=Math.min(a[0],b[0])&&x<=Math.max(a[0],b[0])&&y>=Math.min(a[1],b[1])&&y<=Math.max(a[1],b[1])&&Math.hypot(x-p[0],y-p[1])>7&&Math.hypot(x-q[0],y-q[1])>7)hits.push([x,y]);
   }
   hits.sort((a,b)=>(a[horizontal?0:1]-b[horizontal?0:1])*Math.sign(q[horizontal?0:1]-p[horizontal?0:1]));
   for(const hit of hits){if(bridges.some(b=>Math.hypot(b[0]-hit[0],b[1]-hit[1])<1))continue;const direction=Math.sign(q[horizontal?0:1]-p[horizontal?0:1]),r=5;
    route+=horizontal?` L${hit[0]-direction*r} ${hit[1]} Q${hit[0]} ${hit[1]-r*2} ${hit[0]+direction*r} ${hit[1]}`:` L${hit[0]} ${hit[1]-direction*r} Q${hit[0]+r*2} ${hit[1]} ${hit[0]} ${hit[1]+direction*r}`;bridges.push(hit);
   }
   route+=' L'+q.join(' ');
  }
  e.bridges=bridges;
  pieces.push(`<path id="${e.id}" d="${route}" fill="none" stroke="${style.accent}" stroke-width="${style.lineWidth}" stroke-linejoin="round"${e.direction==='forward'?' marker-end="url(#arrow)"':''}/>`);
 }
 const metadata={version:1,number:'graph',layout:'semantic-'+composition,style:style.id,styleVersion:style.version,nodes,groups,paths,bounds};
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><title>${esc(scene.title)}</title><metadata id="layout-metadata">${esc(JSON.stringify(metadata))}</metadata><defs><marker id="arrow" markerWidth="9" markerHeight="8" refX="8" refY="4" markerUnits="userSpaceOnUse" orient="auto"><path d="M1 1L8 4L1 7" stroke="${style.accent}" stroke-width="1.8" fill="none"/></marker><pattern id="pencil-hatch" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="white"/><path d="M0 9L9 0" stroke="${style.boundary}" stroke-width=".6"/></pattern></defs><rect width="${W}" height="${H}" fill="${style.canvas}"/>${pieces.join('')}${textParts.join('')}</svg>`;
 return {...layout,svg,metadata};
}

export async function renderGraph(browser,raw,presentation,destination){
 keys(presentation,['style','composition']);const scene=normalizeGraph(raw),style=await graphStyle(presentation.style),composition=presentation.composition??style.defaultComposition;
 const page=await protectedPage(browser);
 try{
  const values=[scene.title,'MuseDraw',...scene.nodes.map(n=>n.label),...scene.groups.map(g=>g.label),...scene.edges.map(e=>e.label)].filter(Boolean);
  const metrics=await page.evaluate(async({values,font,sizes})=>{await document.fonts.load(`24px ${font}`,values.join(''));await document.fonts.ready;const context=document.createElement('canvas').getContext('2d'),result={};for(const size of sizes)for(const weight of [500,700]){context.font=`${weight} ${size}px ${font}`;result[size+':'+weight]=Object.fromEntries(values.map(s=>[s,context.measureText(s).width]));}return result;},{values,font:style.textFont,sizes:[16,18,19,style.bodySize,style.titleSize]});
  const measure=(s,size,weight)=>metrics[size+':'+weight]?.[s]??(()=>{throw Error('Actual font measurement missing');})();
  let drawing,failures=[];
  for(const gutter of [192,256,336,432]){try{drawing=composeGraph(scene,style,measure,composition,gutter);break;}catch(e){failures.push(e.message);}}
  if(!drawing)throw Error('Supported layout attempts exhausted: '+[...new Set(failures)].join('; '));
  const validated=await validateSvg(page,drawing.svg);await page.setViewportSize({width:validated.W,height:validated.H});await page.setContent(previewDocument(validated.svg));await page.evaluate(()=>document.fonts.ready);
  const typography=await measureLayout(page,validated.W,validated.H);
  const actual=await page.evaluate(()=>[...document.querySelectorAll('text')].map(el=>{const r=el.getBoundingClientRect();return {id:el.id,box:[r.x,r.y,r.width,r.height]}}));
  const crossings=[];for(const e of drawing.metadata.paths)for(let i=1;i<e.points.length;i++)for(const t of actual)if(intersectsBox(e.points[i-1],e.points[i],t.box))crossings.push({edge:e.id,text:t.id});
  const checks={...typography,edgeTextCrossings:crossings,passed:typography.passed===true&&!crossings.length,composition,style:style.id,nodeCount:scene.nodes.length,edgeCount:scene.edges.length,contentSha256:digest(JSON.stringify(scene)),svgSha256:digest(validated.svg),deterministicSource:true,visualAcceptance:'pending',notChecked:[...typography.notChecked,'professional-aesthetic-acceptance','all graph topologies','cross-platform font equivalence']};
  await fs.mkdir(destination,{recursive:false});await fs.writeFile(path.join(destination,'diagram.svg'),validated.svg+'\n',{flag:'wx'});await fs.writeFile(path.join(destination,'content.json'),JSON.stringify(scene,null,2)+'\n',{flag:'wx'});await fs.writeFile(path.join(destination,'presentation.json'),JSON.stringify(presentation,null,2)+'\n',{flag:'wx'});await fs.writeFile(path.join(destination,'document.json'),JSON.stringify({scene,presentation},null,2)+'\n',{flag:'wx'});await fs.writeFile(path.join(destination,'checks.json'),JSON.stringify(checks,null,2)+'\n',{flag:'wx'});await page.screenshot({path:path.join(destination,'diagram.png')});
  const h=Math.ceil(validated.H*1200/validated.W);await page.setViewportSize({width:1200,height:h});await page.evaluate(({h})=>{document.querySelector('svg').style.width='1200px';document.querySelector('svg').style.height=h+'px'},{h});await page.screenshot({path:path.join(destination,'preview-1200.png')});
  if(!checks.passed)throw Error('Rendered checks failed: '+JSON.stringify(checks));return {scene,presentation,checks};
 }finally{await page.close();}
}

async function main(){const [input,destination,...flags]=process.argv.slice(2),get=k=>flags.includes(k)?flags[flags.indexOf(k)+1]:undefined;if(!input||!destination||!get('--playwright'))throw Error('Usage: render_graph.mjs document.json new-output --playwright MODULE [--browser EXE] [--operations edits.json] [--style 手绘线稿] [--composition flow]');const data=JSON.parse(await fs.readFile(input,'utf8'));let scene=data.scene??data;if(get('--operations')){const edits=JSON.parse(await fs.readFile(get('--operations'),'utf8'));scene=applyOperations(scene,edits.operations??edits);}const {chromium}=await import(pathToFileURL(path.resolve(get('--playwright'))).href);const browser=await chromium.launch({headless:true,...(get('--browser')?{executablePath:get('--browser')}:{})});try{console.log(JSON.stringify((await renderGraph(browser,scene,data.presentation??{style:get('--style')??'手绘线稿',composition:get('--composition')},path.resolve(destination))).checks));}finally{await browser.close();}}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await main().catch(e=>{console.error(e.message);process.exitCode=1});
