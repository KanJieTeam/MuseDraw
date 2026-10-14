// Content-driven architecture drawing. Visual families are data, not case IDs.
// Text is measured by the actual browser font; no gallery content is imported.
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {protectedPage, validateSvg, previewDocument, measureLayout} from './preview.mjs';
import {orthogonalRoute, relationshipPorts, pathObstacles} from './route_edges.mjs';

const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const snap = value => Math.ceil(value / 4) * 4;
const label = value => {
  if (typeof value !== 'string' || !value.trim() || value.length > 300) throw Error('Expected a nonempty label of at most 300 characters');
  return value.trim();
};

export function normalizeScene(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('Expected a scene object');
  const ids = new Set(); let sequence = 0;
  const identify = (entry, prefix) => {
    const id = entry.id ?? `${prefix}-${++sequence}`;
    if (typeof id !== 'string' || !/^[A-Za-z][\w:-]{0,79}$/.test(id) || ids.has(id)) throw Error('Node/group IDs must be unique bounded identifiers');
    ids.add(id); return id;
  };
  const items = values => {
    if (!Array.isArray(values) || !values.length || values.length > 100) throw Error('Expected 1–100 items per group');
    return values.map(value => { const item = typeof value === 'string' ? {label:value} : value;
      if (!item || typeof item !== 'object') throw Error('Invalid item');
      return {id:identify(item, 'node'), label:label(item.label)};
    });
  };
  const group = value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Expected a group object');
    return {id:identify(value, 'group'), title:label(value.title), items:items(value.items)};
  };
  if (!Array.isArray(raw.sections) || !raw.sections.length || raw.sections.length > 20) throw Error('Expected 1–20 sections');
  const sections = raw.sections.map(value => {
    if (!value || !Array.isArray(value.groups) || !value.groups.length || value.groups.length > 20) throw Error('Expected 1–20 groups per section');
    return {id:identify(value, 'section'), title:label(value.title), groups:value.groups.map(group)};
  });
  const view = raw.view ?? 'capability';
  if (!['capability','component','integration','deployment'].includes(view)) throw Error('Unsupported architecture view');
  if (!Array.isArray(raw.supports ?? [])) throw Error('Expected a support array');
  const supports = (raw.supports ?? []).map(value => ({...group(value), side:value.side}));
  if (supports.length > 2 || supports.some(s => !['left','right'].includes(s.side)) || new Set(supports.map(s => s.side)).size !== supports.length) throw Error('At most one support per side');
  const scene = {title:label(raw.title), view, sections, supports};
  for (const key of ['top','bottom']) if (raw[key]) scene[key] = group(raw[key]);
  const nodeIds = new Set([...sections.flatMap(s => s.groups.flatMap(g => g.items)), ...supports.flatMap(s => s.items), ...['top','bottom'].flatMap(k => scene[k]?.items ?? [])].map(n => n.id));
  if (nodeIds.size > 500) throw Error('Scene exceeds the 500-node limit; split a detailed view');
  if (!Array.isArray(raw.edges ?? []) || (raw.edges ?? []).length > 100) throw Error('Expected at most 100 explicit edges');
  scene.edges = (raw.edges ?? []).map((e, i) => {
    if (!e || typeof e !== 'object' || !nodeIds.has(e.from) || !nodeIds.has(e.to) || e.from === e.to) throw Error('An edge requires two different existing node IDs');
    if (e.direction && !['forward','none'].includes(e.direction)) throw Error('Edge direction must be forward or none');
    return {id:`edge-${i+1}`, from:e.from, to:e.to, label:e.label ? label(e.label) : '', direction:e.direction ?? 'forward'};
  });
  const generatedIds = ['diagram-title','layout-metadata','arrow', ...ids, ...[...ids].flatMap(id => [`${id}-label`, `${id}-title`, `${id}-band`]), ...scene.edges.flatMap(e => [e.id, `${e.id}-label`, `${e.id}-label-background`])];
  if (new Set(generatedIds).size !== generatedIds.length) throw Error('IDs collide with generated labels or relationships');
  return scene;
}

export function composeScene(scene, tokens, measure) {
  const c = tokens.colors, rule = tokens.layoutRules;
  const body = Math.max(tokens.typography.body, rule.minimumBody);
  const annotation = tokens.typography.annotation;
  // Labeled interactions need physical routing gutters. Reusing a capability
  // matrix's tiny cell gaps leaves no legal place for a relationship caption.
  const labelWidth = Math.max(0,...scene.edges.filter(e=>e.label).map(e=>measure(e.label,annotation,400)));
  const relationshipGap = labelWidth ? snap(Math.min(260,labelWidth+40)) : 0;
  const padding = Math.max(rule.padding,labelWidth?48:0);
  const gap = Math.max(rule.itemGap,relationshipGap);
  const sectionGap = Math.max(rule.sectionGap,relationshipGap);
  const groupSize = Math.max(body, tokens.typography.group);
  const sectionSize = Math.max(groupSize + 6, tokens.typography.section);
  const titleSize = tokens.typography.title;
  const weight = tokens.weights;
  const W = 1800, margin = 32;
  const pieces = [], bounds = [], nodes = [], groups = [], paths = [];
  const bands = tokens.variant.headerTreatment === 'band';
  const lineWidth = tokens.stroke.boundary;
  const rect = (id, x,y,w,h,fill,stroke=c.border) => pieces.push(`<rect id="${id}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rule.radius}" fill="${fill}" stroke="${stroke}" stroke-width="${lineWidth}"/>`);
  function wrap(value, width, size, weight=400) {
    const lines = [];
    for (const paragraph of value.split('\n')) {
      let line = '';
      const words = paragraph.match(/[A-Za-z0-9_./:-]+|\s+|[^\x00-\x7F]|./gu) ?? [];
      for (const word of words) {
        if (measure(word, size, weight) > width) {
          for (const char of word) {
            if (line && measure(line+char,size,weight) > width) {lines.push(line.trim());line='';}
            line += char;
          }
        } else {
          if (line && measure(line+word,size,weight) > width) {lines.push(line.trim());line='';}
          line += word;
        }
      }
      if (line.trim()) lines.push(line.trim());
    }
    return lines.length ? lines : [''];
  }
  function text(id, value, box, size, fill=c.ink, fontWeight=weight.body, anchor='middle') {
    const [x,y,w,h] = box, lines = wrap(value,w-20,size,fontWeight), lineHeight=Math.ceil(size*1.45);
    const baseline=y+h/2-(lines.length-1)*lineHeight/2+size*.35;
    pieces.push(`<text id="${id}" font-family="${esc(tokens.fonts.text)}" font-size="${size}" font-weight="${fontWeight}" fill="${fill}" text-anchor="${anchor}">${lines.map((line,i)=>`<tspan x="${anchor==='start'?x+10:x+w/2}" y="${baseline+i*lineHeight}">${esc(line)}</tspan>`).join('')}</text>`);
    bounds.push({id,box});
  }
  const requiredHeight = (value,w,size=body,fontWeight=weight.body) => snap(Math.max(52,wrap(value,w-20,size,fontWeight).length*Math.ceil(size*1.45)+20));
  function cellsPlan(items,width,maxColumns=rule.maxColumns) {
    const desired=Math.max(180,...items.map(n=>Math.min(460,measure(n.label,body,400)+28)));
    const columns=Math.max(1,Math.min(maxColumns,items.length,Math.floor((width+gap)/(desired+gap))));
    const cellWidth=snap((width-gap*(columns-1))/columns)-4;
    const rows=[];
    for(let i=0;i<items.length;i+=columns) {
      const entries=items.slice(i,i+columns), height=Math.max(...entries.map(n=>requiredHeight(n.label,cellWidth)));
      rows.push({entries,height});
    }
    return {columns,cellWidth,rows,height:rows.reduce((n,r)=>n+r.height,0)+gap*(rows.length-1)};
  }
  function drawCells(plan,x,y,parent) {
    for(const row of plan.rows) {
      row.entries.forEach((n,i)=>{const box=[x+i*(plan.cellWidth+gap),y,plan.cellWidth,row.height];
        rect(n.id,...box,c.canvas);text(`${n.id}-label`,n.label,box,body);
        nodes.push({...n,parent,box});});
      y+=row.height+gap;
    }
  }
  function groupPlan(group,width) {
    const titleH=requiredHeight(group.title,width-2*padding,groupSize,weight.group);
    const cells=cellsPlan(group.items,width-2*padding);
    const headingArea=Math.max(titleH,rule.headroom);
    return {...group,width,titleH,headingArea,cells,height:padding+headingArea+cells.height+padding};
  }
  function drawGroup(plan,x,y,parent,height=plan.height) {
    const box=[x,y,plan.width,height];rect(plan.id,...box,c.surface,bands?'none':c.border);
    text(`${plan.id}-title`,plan.title,[x+padding,y+padding,plan.width-2*padding,plan.titleH],groupSize,c.secondary,weight.group);
    drawCells(plan.cells,x+padding,y+padding+plan.headingArea,plan.id);
    groups.push({id:plan.id,label:plan.title,parent,box});
  }
  function sectionPlan(section,width) {
    // Group demand, not gallery coordinates, determines columns and row count.
    const available=width-2*padding;
    const columns=Math.max(1,Math.min(4,section.groups.length,Math.floor((available+gap)/340)));
    const gw=Math.floor((available-gap*(columns-1))/columns);
    const headerH=requiredHeight(section.title,width-2*padding,sectionSize,weight.section);
    const rows=[];
    for(let i=0;i<section.groups.length;i+=columns) {
      const entries=section.groups.slice(i,i+columns).map(g=>groupPlan(g,gw));
      rows.push({entries,height:Math.max(...entries.map(g=>g.height))});
    }
    return {...section,width,headerH,rows,height:headerH+rows.reduce((h,r)=>h+r.height,0)+gap*(rows.length-1)+2*padding};
  }
  function drawSection(plan,x,y) {
    const box=[x,y,plan.width,plan.height];rect(plan.id,...box,c.canvas);
    if(bands)rect(`${plan.id}-band`,x,y,plan.width,plan.headerH,c.accent,'none');
    else if(tokens.variant.headerTreatment==='strip')rect(`${plan.id}-band`,x,y,plan.width,plan.headerH,c.focus,'none');
    text(`${plan.id}-title`,plan.title,[x+padding,y,plan.width-2*padding,plan.headerH],sectionSize,bands?c.inverse:c.secondary,weight.section);
    let rowY=y+plan.headerH+padding;
    for(const row of plan.rows) {
      row.entries.forEach((g,i)=>drawGroup(g,x+padding+i*(g.width+gap),rowY,plan.id,row.height));
      rowY+=row.height+gap;
    }
    groups.push({id:plan.id,label:plan.title,parent:null,box});
  }
  function drawStrip(strip,y) {
    const labelW=Math.min(320,Math.max(210,snap(measure(strip.title,sectionSize,weight.section)+40)));
    const width=W-2*margin-labelW-padding*2;
    const plan=cellsPlan(strip.items,width,8);
    const h=Math.max(requiredHeight(strip.title,labelW-padding,sectionSize,weight.section),plan.height)+2*padding;
    rect(strip.id,margin,y,W-2*margin,h,bands?c.accent:c.surface,'none');
    text(`${strip.id}-title`,strip.title,[margin+padding,y+padding,labelW-padding,h-2*padding],sectionSize,bands?c.inverse:c.secondary,weight.section,'start');
    drawCells(plan,margin+labelW+padding,y+padding,strip.id);
    groups.push({id:strip.id,label:strip.title,parent:null,box:[margin,y,W-2*margin,h]});
    return h;
  }
  let y=margin;
  const titleH=requiredHeight(scene.title,W-margin*2,titleSize,weight.title);
  text('diagram-title',scene.title,[margin,y,W-2*margin,titleH],titleSize,c.ink,weight.title,'start');
  y+=titleH+sectionGap;
  if(scene.top)y+=drawStrip(scene.top,y)+sectionGap;
  const sideWidths=Object.fromEntries(scene.supports.map(s=>[s.side,Math.min(320,Math.max(208,snap(Math.max(measure(s.title,groupSize,weight.group),...s.items.map(n=>Math.min(260,measure(n.label,body,weight.body))))+2*padding+24)))]));
  const x=margin+(sideWidths.left?sideWidths.left+sectionGap:0);
  const width=W-2*margin-(sideWidths.left??0)-(sideWidths.right??0)-sectionGap*scene.supports.length;
  const plans=scene.sections.map(s=>sectionPlan(s,width));
  const supportPlans=scene.supports.map(s=>groupPlan(s,sideWidths[s.side]));
  const bodyY=y, bodyH=Math.max(plans.reduce((h,p)=>h+p.height,0)+sectionGap*(plans.length-1),...supportPlans.map(s=>s.height));
  plans.forEach(plan=>{drawSection(plan,x,y);y+=plan.height+sectionGap;});
  supportPlans.forEach(s=>drawGroup(s,s.side==='left'?margin:W-margin-s.width,bodyY,null,bodyH));
  y=bodyY+bodyH+sectionGap;
  if(scene.bottom)y+=drawStrip(scene.bottom,y)+sectionGap;
  const H=snap(y+margin);
  if(H>8000)throw Error('Content exceeds bounded canvas height; split into detail views');
  // Relationships are never inferred from membership. Route explicit edges only.
  const obstacles=nodes.map(n=>n.box).concat(bounds.filter(b=>!nodes.some(n=>`${n.id}-label`===b.id)).map(b=>b.box));
  const ports=relationshipPorts(nodes,scene.edges),reserved=[];
  for(const [index,e] of scene.edges.entries()) {
    const futureExits=ports.slice(index+1).flat().flatMap(port=>pathObstacles([port.point,port.point.map((v,i)=>v+port.normal[i]*16)]));
    let points;
    try { points=orthogonalRoute(...ports[index],[...obstacles,...reserved,...futureExits],W,H); }
    catch(error) { throw Error(`${e.id} (${e.from} → ${e.to}): ${error.message}`); }
    const color=tokens.detailColors.relationship;
    paths.push({...e,points});
    pieces.push(`<path id="${e.id}" d="${points.map((p,i)=>`${i?'L':'M'}${p.join(' ')}`).join(' ')}" stroke="${color}" stroke-width="${tokens.stroke.relationship}" fill="none"${e.direction==='forward'?' marker-end="url(#arrow)"':''}/>`);
    if(e.label){
      const w=snap(measure(e.label,annotation,400)+24),h=snap(Math.ceil(annotation*1.5)+12);
      const candidates=points.slice(1).flatMap((q,i)=>{const p=points[i];
        return [.5,.25,.75].flatMap(t=>{const px=p[0]+(q[0]-p[0])*t,py=p[1]+(q[1]-p[1])*t;
          return p[1]===q[1]?[[px-w/2,py-h-6,w,h],[px-w/2,py+6,w,h]]
            :[[px+6,py-h/2,w,h],[px-w-6,py-h/2,w,h]];});});
      const candidate=candidates.find(box=>box[0]>=8&&box[0]+w<=W-8&&box[1]>=8&&box[1]+h<=H-8&&
        [...obstacles,...reserved,...pathObstacles(points,2),...futureExits].every(o=>Math.min(o[0]+o[2],box[0]+w)<=Math.max(o[0],box[0])||Math.min(o[1]+o[3],box[1]+h)<=Math.max(o[1],box[1])));
      if(!candidate)throw Error(`${e.id}: Relationship label requires more routing space`);
      text(`${e.id}-label`,e.label,candidate,annotation,c.secondary);obstacles.push(candidate);
    }
    reserved.push(...pathObstacles(points));
  }
  const metadata={version:1,number:'scene',layout:'content-driven-containment',view:scene.view,style:tokens.id,family:tokens.family,variant:tokens.variant,density:tokens.density,colors:c,bounds,nodes,groups,paths};
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img"><title>${esc(scene.title)}</title><metadata id="layout-metadata">${esc(JSON.stringify(metadata))}</metadata><defs><marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0 0L7 3L0 6" fill="none" stroke="${tokens.detailColors.relationship}"/></marker></defs><rect width="${W}" height="${H}" fill="${c.canvas}"/>${pieces.join('')}</svg>`;
  return {svg,width:W,height:H,metadata};
}

export async function renderScene(browser, raw, tokens, destination) {
  const scene=normalizeScene(raw),page=await protectedPage(browser);
  try {
    const labels=[scene.title,...scene.sections.flatMap(s=>[s.title,...s.groups.flatMap(g=>[g.title,...g.items.map(n=>n.label)])]),...scene.supports.flatMap(s=>[s.title,...s.items.map(n=>n.label)]),...['top','bottom'].flatMap(k=>scene[k]?[scene[k].title,...scene[k].items.map(n=>n.label)]:[]),...scene.edges.map(e=>e.label)];
    // Measure all substrings used in wrapping with the actual installed font.
    const body=Math.max(tokens.typography.body,tokens.layoutRules.minimumBody),group=Math.max(body,tokens.typography.group);
    const sizes=[...new Set([body,group,Math.max(group+6,tokens.typography.section),tokens.typography.title,tokens.typography.annotation])];
    const weights=[...new Set([400,...Object.values(tokens.weights)])];
    const metrics=await page.evaluate(async ({labels,font,sizes,weights})=>{
      await document.fonts.load(`20px ${font}`,labels.join(''));await document.fonts.ready;
      const context=document.createElement('canvas').getContext('2d'),widths={};
      for(const size of sizes)for(const weight of weights){
        context.font=`${weight} ${size}px ${font}`;
        const map={};for(const value of new Set(labels)){const chars=[...value];for(let i=0;i<chars.length;i++)for(let j=i+1;j<=chars.length;j++){const part=chars.slice(i,j).join('');if(map[part]===undefined)map[part]=context.measureText(part).width;}}
        widths[`${size}:${weight}`]=map;
      }
      return widths;
    },{labels,font:tokens.fonts.text,sizes,weights});
    const measure=(s,size,weight=400)=>metrics[`${size}:${weight}`]?.[s]??(s===''?0:(()=>{throw Error('Missing actual-font measurement');})());
    const drawing=composeScene(scene,tokens,measure),validated=await validateSvg(page,drawing.svg);
    await page.setViewportSize({width:validated.W,height:validated.H});
    await page.setContent(previewDocument(validated.svg));await page.evaluate(()=>document.fonts.ready);
    const checks=await measureLayout(page,validated.W,validated.H);
    await fs.mkdir(destination,{recursive:true});
    for(const name of ['diagram.svg','diagram.png','checks.json','content.json']){try{await fs.access(path.join(destination,name));throw Error('Output exists; use a new run directory');}catch(e){if(e.code!=='ENOENT')throw e;}}
    await fs.writeFile(path.join(destination,'diagram.svg'),validated.svg+'\n');
    await fs.writeFile(path.join(destination,'content.json'),JSON.stringify(scene,null,2)+'\n');
    await page.screenshot({path:path.join(destination,'diagram.png')});
    await fs.writeFile(path.join(destination,'checks.json'),JSON.stringify({...checks,style:tokens.id,variant:tokens.variant.id,nodeCount:drawing.metadata.nodes.length,edgeCount:drawing.metadata.paths.length,routing:{distinctLanes:true,obstacleAvoidance:true,checkedEdges:drawing.metadata.paths.length,topologyLayout:false}},null,2)+'\n');
    if(checks.passed!==true)throw Error('Actual-font layout checks failed; inspect the saved result');
    return {checks,style:tokens.id,variant:tokens.variant.id,nodes:drawing.metadata.nodes.length,edges:drawing.metadata.paths.length};
  }finally{await page.close();}
}

async function main(){
  const [input,destination,...options]=process.argv.slice(2),get=name=>{const i=options.indexOf(name);return i<0?undefined:options[i+1];};
  if(!input||!destination||!get('--playwright'))throw Error('Usage: render_style.mjs brief.json new-output --style 墨蓝 --playwright module [--browser executable]');
  const raw=JSON.parse(await fs.readFile(input,'utf8'));
  const args=[path.join(import.meta.dirname,'style_tokens.py'),get('--style')??'墨蓝','--view',raw.view??'capability'];
  for(const flag of ['--variant','--density'])if(get(flag))args.push(flag,get(flag));
  const tokens=JSON.parse(execFileSync(get('--python')??'python',args,{encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'},timeout:15000}));
  const {chromium}=await import(pathToFileURL(path.resolve(get('--playwright'))).href);
  const browser=await chromium.launch({headless:true,...(get('--browser')?{executablePath:get('--browser')}:{})});
  try{console.log(JSON.stringify(await renderScene(browser,raw,tokens,path.resolve(destination))));}finally{await browser.close();}
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await main().catch(e=>{console.error(e.message);process.exitCode=1;});
