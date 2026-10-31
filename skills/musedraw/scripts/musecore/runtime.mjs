// Browser runtime: content and explicit relations in, coordinated report geometry out.
import {el,makeFig,SONG,HEI,GREY} from './svg.mjs';
import {reportFamilies} from './report-families.mjs';
import {visualFamilies} from './visual-families.mjs';
import {dataVisualFamilies} from './data-visuals.mjs';
import {spatialFamilies} from './spatial-families.mjs';
import {comparisonFamilies} from './comparison-families.mjs';
import {distributionFamilies} from './distribution-families.mjs';
import {amountFlowFamilies} from './flow-amounts.mjs';
import {workflowStructureFamilies} from './workflow-structures.mjs';
import {officeTimeFamilies} from './office-time.mjs';
import {collaborationFamilies} from './collaboration.mjs';
import {formulaFamilies} from './formula.mjs';
import {stateFamilies} from './states.mjs';
import {deploymentFamilies} from './deployment.mjs';
import {chalkFamilies} from './chalk-figures.mjs';
import {blueprintFigureFamilies} from './blueprint-figures.mjs';
import {solidFamilies} from './solid-figures.mjs';
import {magnitudeFamilies} from './magnitude.mjs';
import {officeCostFamilies} from './office-cost.mjs';
import {officeObjectiveFamilies} from './office-objectives.mjs';
import {officeAuditFamilies} from './office-audits.mjs';
import {reliabilityFamilies} from './reliability-figures.mjs';
import {requestFamilies} from './request-figures.mjs';
import {hashFamilies} from './hash-figures.mjs';
import {mathShapeFamilies} from './math-shapes.mjs';
import {binaryFamilies} from './binary-figures.mjs';
import {probabilityFamilies} from './probability-figures.mjs';
import {architectureFamilies} from './architecture-figures.mjs';
import {messageSequenceFamilies} from './sequence-figures.mjs';
import {responsibilityFamilies} from './responsibility-figures.mjs';
import {backupFamilies} from './backup-figures.mjs';
import {historyFamilies} from './history-figures.mjs';
import {loopFamilies} from './loop-figures.mjs';
import {workforceFamilies} from './workforce-figures.mjs';
import {leaveFamilies} from './leave-figures.mjs';
import {orbitFamilies} from './orbit-figures.mjs';
import {phaseFamilies} from './phase-figures.mjs';
import {categoryFamilies} from './category-figures.mjs';
import {sampleFamilies} from './sample-figures.mjs';
import {priorityFamilies} from './priority-figures.mjs';
import {benefitFamilies} from './benefit-figures.mjs';
import {circuitFamilies} from './circuit-figures.mjs';
import {forceFamilies} from './force-figures.mjs';
import {equationFamilies} from './equation-figures.mjs';
import {quantityFamilies} from './quantity-figures.mjs';
import {spacingFamilies} from './spacing-figures.mjs';
import {mapFamilies} from './map-figures.mjs';
import {approvalFamilies} from './approval-figures.mjs';
import {handoffFamilies} from './handoff-figures.mjs';
import {fieldFamilies} from './field-figures.mjs';
import {runoffFamilies} from './runoff-figures.mjs';
import {transitFamilies} from './transit-figures.mjs';
import {velocityFamilies} from './velocity-figures.mjs';
import {squareFamilies} from './square-figures.mjs';
import {angleFamilies} from './angle-figures.mjs';
import {calendarFamilies} from './calendar-figures.mjs';
import {daytimeFamilies} from './daytime-figures.mjs';
import {pathwayFamilies} from './pathway-figures.mjs';
import {chemistryFamilies} from './chemistry-figures.mjs';
import {ionFamilies} from './ion-figures.mjs';
import {moveFamilies} from './move-figures.mjs';
import {escalationFamilies} from './escalation-figures.mjs';
import {compartmentFamilies} from './compartment-figures.mjs';
import {oscillatorFamilies} from './oscillator-figures.mjs';
import {frictionFamilies} from './friction-figures.mjs';
import {germinationFamilies} from './germination-figures.mjs';
import {incidentFamilies} from './incident-figures.mjs';
import {tierFamilies} from './tier-figures.mjs';
import {spectrumFamilies} from './spectrum-figures.mjs';
import {latticeFamilies} from './lattice-figures.mjs';
import {elementsFamilies} from './elements-figures.mjs';
import {decimalsFamilies} from './decimals-figures.mjs';
import {schedulingFamilies} from './scheduling-figures.mjs';
import {gitopsFamilies} from './gitops-figures.mjs';
import {waterstateFamilies} from './waterstate-figures.mjs';
import {sinterFamilies} from './sinter-figures.mjs';
import {groverFamilies} from './grover-figures.mjs';
import {primerFamilies} from './primer-figures.mjs';
import {plantcycleFamilies} from './plantcycle-figures.mjs';
import {leafenergyFamilies} from './leafenergy-figures.mjs';
import {shadowCinemaFamilies} from './shadow-cinema-figures.mjs';
import {nightPosterFamilies} from './night-poster-figures.mjs';
import {proteomicsFamilies} from './proteomics-figures.mjs';
import {calciumFamilies} from './calcium-figures.mjs';
import {paperCoffeeFamilies} from './paper-coffee-figures.mjs';
import {cupFamilies} from './cup-figures.mjs';
import {knightFamilies} from './knight-figures.mjs';
import {circulationFamilies} from './circulation-figures.mjs';
import {metabolismFamilies} from './metabolism-figures.mjs';
import {northstarFamilies} from './northstar-figures.mjs';
import {planetFamilies} from './planet-figures.mjs';
import {argumentFamilies} from './argument-figures.mjs';
import {collationFamilies} from './collation-figures.mjs';
import {characterFamilies} from './character-figures.mjs';
import {tenseFamilies} from './tense-figures.mjs';
import {quadratFamilies} from './quadrat-figures.mjs';
import {gwasFamilies} from './gwas-figures.mjs';
import {foodwebFamilies} from './foodweb-figures.mjs';
import {insectFamilies} from './insect-figures.mjs';
import {windtunnelFamilies} from './windtunnel-figures.mjs';
import {lightsheetFamilies} from './lightsheet-figures.mjs';
import {shadowheightFamilies} from './shadowheight-figures.mjs';
import {sunshadowFamilies} from './sunshadow-figures.mjs';
import {bayesFamilies} from './bayes-figures.mjs';
import {phylogenyFamilies} from './phylogeny-figures.mjs';
import {electionFamilies} from './election-figures.mjs';
import {shardingFamilies} from './sharding-figures.mjs';
import {narrativeMotifFamilies} from './narrative-motif-figures.mjs';
import {classicalSyntaxFamilies} from './classical-syntax-figures.mjs';
import {weeklyPracticeFamilies} from './weekly-practice-figures.mjs';
import {lessonTimingFamilies} from './lesson-timing-figures.mjs';
import {adoptionFamilies} from './adoption-figures.mjs';
import {datedLaneFamilies} from './dated-lane-figures.mjs';
import {historicalPrintFamilies} from './historical-print-figures.mjs';
import {poetryReadingFamilies} from './poetry-reading-figures.mjs';
import {trainingFamilies} from './training-figures.mjs';
import {statementFamilies} from './statement-figures.mjs';
import {seasonTerraceFamilies} from './season-terrace-figures.mjs';
import {learningFamilies} from './learning-figures.mjs';
import {earthFamilies} from './earth-figures.mjs';
import {aisleFamilies} from './aisle-figures.mjs';
import {httpFamilies} from './http-figures.mjs';
import {chaosFamilies} from './chaos-figures.mjs';
import {canaryFamilies} from './canary-figures.mjs';
import {meshFamilies} from './mesh-figures.mjs';
import {cdnFamilies} from './cdn-figures.mjs';
import {typedSystemFamilies} from './typed-system-figures.mjs';
import {searchFamilies} from './search-figures.mjs';
import {latencyFamilies} from './latency-figures.mjs';
import {uncertaintyFamilies} from './uncertainty-figures.mjs';
import {scalesFamilies} from './scales-figures.mjs';
export const MuseCore=(()=>{
 const need=(yes,msg)=>{if(!yes)throw Error(msg)};
 const list=(x,min,max,p)=>need(Array.isArray(x)&&x.length>=min&&x.length<=max,`${p}: requires ${min}–${max} items`);
 const fields=(o,ks,p)=>{need(o&&typeof o==='object'&&!Array.isArray(o),`${p}: object required`);for(const k of Object.keys(o))need(ks.includes(k),`${p}.${k}: unsupported field`)};
 const str=(s,p)=>need(typeof s==='string'&&s.trim().length>0,`${p}: nonempty text required`);
 function unique(items,p){const seen=new Set();for(const a of items){str(a.id,p+'.id');need(!seen.has(a.id),p+': duplicate id '+a.id);seen.add(a.id)}}
 function width(t,size=15,font='song'){
   const s=el('svg',{width:1,height:1});s.style.cssText='position:absolute;visibility:hidden';document.body.append(s);
   const e=el('text',{'font-family':font==='hei'?HEI:SONG,'font-size':size},s);e.textContent=t;
   const w=e.getComputedTextLength();s.remove();return w;
 }
 function wrap(text,w,size=15,font='song',max=4){
   const parts=Array.isArray(text)?text:[text], out=[];
   for(const part of parts){str(part,'label');let line='',rough=[];for(const ch of part){if(line&&width(line+ch,size,font)>w){rough.push(line);line=''}need(width(ch,size,font)<=w,'label: single glyph exceeds available width');line+=ch}if(line)rough.push(line);
     need(out.length+rough.length<=max,`label exceeds ${max} lines at fixed ${size}px: ${parts.join(' / ')}`);
     // Balance within an author's explicit line; preserve explicit line boundaries.
     // Four-character role names become 2+2, rather than a stranded last glyph.
     if(rough.length>1){const chars=[...part],N=rough.length,target=width(part,size,font)/N,memo=new Map();
       function solve(at,left){const key=at+'/'+left;if(memo.has(key))return memo.get(key);if(!left)return at===chars.length?{cost:0,lines:[]}:null;let best=null;
         for(let end=at+1;end<=chars.length-left+1;end++){const s=chars.slice(at,end).join(''),ww=width(s,size,font);if(ww>w)break;const tail=solve(end,left-1);if(!tail)continue;const cost=tail.cost+(ww-target)**2+(/^[，。、；：！？）]/.test(s)?10000:0);if(!best||cost<best.cost)best={cost,lines:[s,...tail.lines]}}
         memo.set(key,best);return best;
       }rough=solve(0,N)?.lines??rough;
     }out.push(...rough);
   }
   need(out.length<=max,`label exceeds ${max} lines at fixed ${size}px: ${parts.join(' / ')}`);return out;
 }
 const track=(sizes,start)=>{let p=start;return sizes.map(size=>{const r={start:p,size,center:p+size/2};p+=size;return r})};
 function finish(f,meta){f.svg.dataset.family=meta.family;f.svg.dataset.geometry=JSON.stringify(meta);return f.svg}
 function labelBox(f,x,y,w,h,lines,o={}){const before=f.svg.children.length;f.box(x,y,w,h,lines,o);for(const e of [...f.svg.children].slice(before))if(e.tagName==='text')e.dataset.bound=JSON.stringify({x,y,w,h})}
 function audit(svg){
   const [,,W,H]=svg.getAttribute('viewBox').split(' ').map(Number), findings=[];
   const all=[...svg.querySelectorAll('*')],order=new Map(all.map((e,i)=>[e,i]));
   const matrix=e=>svg.getScreenCTM().inverse().multiply(e.getScreenCTM());
   const point=(e,x,y)=>new DOMPoint(x,y).matrixTransform(matrix(e));
   const bounds=e=>{const b=e.getBBox(),ps=[point(e,b.x,b.y),point(e,b.x+b.width,b.y+b.height)];return {x:ps[0].x,y:ps[0].y,w:ps[1].x-ps[0].x,h:ps[1].y-ps[0].y}};
   const ts=[...svg.querySelectorAll('text')].map(e=>({e,b:bounds(e)}));
   for(const {e,b} of ts){if(b.x<-.5||b.y<-.5||b.x+b.w>W+.5||b.y+b.h>H+.5)findings.push({type:'canvas-text-overflow',text:e.textContent});
     if(e.dataset.bound){const r=JSON.parse(e.dataset.bound),local=e.getBBox();if(local.x<r.x+3||local.x+local.width>r.x+r.w-3||local.y<r.y+2||local.y+local.height>r.y+r.h-2)findings.push({type:'container-text-overflow',text:e.textContent})}
   }
   const overlap=(a,b,pad=1)=>a.x+pad<b.x+b.w&&a.x+a.w-pad>b.x&&a.y+pad<b.y+b.h&&a.y+a.h-pad>b.y;
   for(let i=0;i<ts.length;i++)for(let j=i+1;j<ts.length;j++)if(overlap(ts[i].b,ts[j].b,2))findings.push({type:'text-overlap',text:ts[i].e.textContent,other:ts[j].e.textContent});
   const masks=[...svg.querySelectorAll('rect')].filter(e=>['#fff','#ffffff','white'].includes(e.getAttribute('fill'))||e.dataset.role==='label-backing').map(e=>({e,b:bounds(e)}));
   for(const line of svg.querySelectorAll('polyline')){
     if(line.closest('defs')||line.dataset.role==='background-grid')continue;
     const ps=[...line.points].map(p=>point(line,p.x,p.y));
     for(const {e,b} of ts){const hidden=masks.some(m=>order.get(m.e)>order.get(line)&&order.get(m.e)<order.get(e)&&m.b.x<=b.x&&m.b.x+m.b.w>=b.x+b.w&&m.b.y<=b.y&&m.b.y+m.b.h>=b.y+b.h);if(hidden)continue;
       for(let i=1;i<ps.length;i++){const a=ps[i-1],z=ps[i];let hit=false;
         if(Math.abs(a.x-z.x)<.01)hit=a.x>b.x+1&&a.x<b.x+b.w-1&&Math.max(a.y,z.y)>b.y+2&&Math.min(a.y,z.y)<b.y+b.h-2;
         if(Math.abs(a.y-z.y)<.01)hit=a.y>b.y+2&&a.y<b.y+b.h-2&&Math.max(a.x,z.x)>b.x+1&&Math.min(a.x,z.x)<b.x+b.w-1;
         if(hit){findings.push({type:'line-through-text',text:e.textContent});break}
       }
     }
   }
   return {findings,geometry:JSON.parse(svg.dataset.geometry||'{}'),fontFamilies:[...new Set([...svg.querySelectorAll('text')].map(e=>e.getAttribute('font-family')))]};
 }
 function lanes(b){
   fields(b,['family','stages','roles','nodes','links','feedback'],'lanes');
   list(b.stages,2,6,'stages');list(b.roles,2,4,'roles');list(b.nodes,1,24,'nodes');list(b.links,0,40,'links');
   unique(b.stages,'stages');unique(b.roles,'roles');unique(b.nodes,'nodes');
   for(const x of [...b.stages,...b.roles]){fields(x,['id','label'],'track');str(x.label,'track.label')}
   const W=720, margin=10, labelW=60, x0=70, cw=640/b.stages.length, bw=cw-20;
   const headers=b.stages.map(s=>wrap(s.label,cw-12,15,'hei',3));
   const HH=Math.max(32,...headers.map(t=>t.length*15*1.38+10));
   const prepared=[], used=new Set();
   for(const n of b.nodes){fields(n,['id','role','stage','lines'],'node');const r=b.roles.findIndex(x=>x.id===n.role),c=b.stages.findIndex(x=>x.id===n.stage);need(r>=0&&c>=0,`node ${n.id}: unknown role/stage`);need(!used.has(`${r}/${c}`),'more than one node in a cell');used.add(`${r}/${c}`);const lines=wrap(n.lines,bw-16);prepared.push({...n,r,c,lines,h:Math.max(50,lines.length*15*1.38+8)})}
   const roleLines=b.roles.map(r=>wrap(r.label,labelW-12,15,'hei',4));
   const rowH=b.roles.map((_,r)=>Math.max(88,...prepared.filter(n=>n.r===r).map(n=>n.h+38),roleLines[r].length*15*1.38+16));
   const rows=track(rowH,margin+HH),bottom=rows.at(-1).start+rows.at(-1).size;
   const nodes=new Map(prepared.map(n=>[n.id,{...n,x:x0+cw*n.c+10,y:rows[n.r].center-n.h/2,w:bw}]));
   const feedbackLines=b.feedback?wrap(b.feedback.label,620,14,'song',2):[];
   const H=bottom+(b.feedback?30+feedbackLines.length*19:10),f=makeFig(W,H);
   labelBox(f,10,10,60,HH,[],{fill:GREY});headers.forEach((ls,c)=>labelBox(f,x0+cw*c,10,cw,HH,ls,{fill:GREY,font:'hei'}));
   rows.forEach((row,r)=>{labelBox(f,10,row.start,60,row.size,roleLines[r],{fill:GREY,font:'hei'});f.rect(x0,row.start,640,row.size,{fill:'none'})});
   for(let c=1;c<b.stages.length;c++)f.vline(x0+cw*c,margin+HH,bottom,{dash:true,sw:.6});
   const edges=[];
   for(const e of b.links){fields(e,['from','to'],'link');const a=nodes.get(e.from),z=nodes.get(e.to);need(a&&z,'link: unknown endpoint');let pts;
     if(a.r===z.r&&Math.abs(a.c-z.c)===1){const d=Math.sign(z.c-a.c);pts=[[a.x+(d>0?a.w:0),a.y+a.h/2],[z.x+(d>0?0:z.w),z.y+z.h/2]]}
     else if(a.c===z.c&&Math.abs(a.r-z.r)===1){const d=Math.sign(z.r-a.r);pts=[[a.x+a.w/2,a.y+(d>0?a.h:0)],[z.x+z.w/2,z.y+(d>0?0:z.h)]]}
     else throw Error('link outside family: only neighbouring roles or stages; use another composition');
     edges.push({from:e.from,to:e.to,points:pts});f.arrow(pts);
   }
   for(const n of nodes.values())labelBox(f,n.x,n.y,n.w,n.h,n.lines);
   if(b.feedback){fields(b.feedback,['from','to','label'],'feedback');const a=nodes.get(b.feedback.from),z=nodes.get(b.feedback.to);need(a&&z&&a.r===b.roles.length-1&&z.r===a.r&&a.c!==z.c,'feedback: distinct nodes in last role required');const y=bottom+18;const pts=[[a.x+a.w/2,a.y+a.h],[a.x+a.w/2,y],[z.x+z.w/2,y],[z.x+z.w/2,z.y+z.h]];f.arrow(pts,{dash:true});f.lines(360,y+6+feedbackLines.length*9.5,feedbackLines,{size:14});edges.push({from:a.id,to:z.id,points:pts,feedback:true})}
   return finish(f,{family:'lanes',width:W,height:H,columnWidth:cw,headerHeight:HH,rowHeights:rowH,nodes:[...nodes.values()],edges});
 }
 function schedule(b){
   fields(b,['family','periods','groups'],'schedule');list(b.periods,1,6,'periods');list(b.groups,1,8,'groups');
   let slots=[];for(const p of b.periods){fields(p,['label','slots'],'period');str(p.label,'period.label');list(p.slots,1,12,'period.slots');p.slots.forEach(s=>str(s,'slot'));slots.push(...p.slots)}list(slots,2,12,'total slots');
   const tasks=[];b.groups.forEach((g,gi)=>{fields(g,['label','tasks'],'group');str(g.label,'group.label');list(g.tasks,1,16,'tasks');for(const t of g.tasks){fields(t,['id','label','start','end'],'task');str(t.label,'task.label');need(Number.isInteger(t.start)&&Number.isInteger(t.end)&&t.start>=0&&t.end>t.start&&t.end<=slots.length,`invalid interval: ${t.id}`);tasks.push({...t,gi})}});list(tasks,1,16,'all tasks');unique(tasks,'tasks');
   const xP=10,xT=86,xE=710,slotWish=Math.min(64,Math.max(...slots.map(s=>width(s,14)))+8);
   const taskLimit=Math.min(290,Math.max(180,xE-xT-slots.length*slotWish));
   const taskW=Math.min(taskLimit,Math.max(220,Math.max(...tasks.map(t=>width(t.label,14)))+20)),xG=xT+taskW,cw=(xE-xG)/slots.length;
   need(cw>=26,'time slots too narrow');
   const periodLines=b.periods.map(p=>wrap(p.label,p.slots.length*cw-10,14,'hei',2)),slotLines=slots.map(t=>wrap(t,cw-8,14,'song',2));
   const h1=Math.max(28,...periodLines.map(t=>t.length*19.32+8)),h2=Math.max(28,...slotLines.map(t=>t.length*19.32+8)),yB=10+h1+h2;
   const prepared=tasks.map(t=>({...t,lines:wrap(t.label,taskW-20,14,'song',3)}));
   const rowH=prepared.map(t=>Math.max(28,t.lines.length*19.32+10));
   const glines=b.groups.map(g=>wrap(g.label,xT-xP-12,14,'hei',4));
   b.groups.forEach((g,gi)=>{const indices=prepared.map((t,i)=>t.gi===gi?i:-1).filter(i=>i>=0),sum=indices.reduce((s,i)=>s+rowH[i],0),delta=Math.max(0,glines[gi].length*19.32+12-sum);rowH[indices.at(-1)]+=delta});
   const rows=track(rowH,yB),bottom=rows.at(-1).start+rows.at(-1).size,f=makeFig(720,bottom+12);
   f.rect(xP,10,700,h1+h2,{fill:GREY,sw:.6});f.lines((xP+xT)/2,10+(h1+h2)/2,['阶段'],{font:'hei',size:14});f.lines((xT+xG)/2,10+(h1+h2)/2,['工作内容'],{font:'hei',size:14});
   let cursor=0;const boundaries=[];
   b.periods.forEach((p,i)=>{f.lines(xG+cw*(cursor+p.slots.length/2),10+h1/2,periodLines[i],{font:'hei',size:14});cursor+=p.slots.length;boundaries.push(cursor)});
   slotLines.forEach((s,i)=>f.lines(xG+cw*(i+.5),10+h1+h2/2,s,{size:14}));f.hline(xG,xE,10+h1,{sw:.6});
   b.groups.forEach((g,gi)=>{const indices=prepared.map((t,i)=>t.gi===gi?i:-1).filter(i=>i>=0),first=rows[indices[0]],last=rows[indices.at(-1)],height=last.start+last.size-first.start;f.lines((xP+xT)/2,first.start+height/2,glines[gi],{font:'hei',size:14});if(gi)f.hline(xP,xE,first.start,{sw:.6})});
   const bars=[];
   prepared.forEach((t,i)=>{const row=rows[i];for(let k=0;k<t.lines.length;k++)f.text(xT+10,row.center+(k-(t.lines.length-1)/2)*19.32+5,t.lines[k],{size:14,anchor:'start'});const bar={id:t.id,x:xG+cw*t.start+3,y:row.center-5,w:cw*(t.end-t.start)-6,h:10};el('rect',{x:bar.x,y:bar.y,width:bar.w,height:bar.h,fill:'#595959'},f.svg);bars.push(bar);if(i&&prepared[i-1].gi===t.gi)f.hline(xT,xE,row.start,{sw:.6})});
   [xT,xG].forEach(x=>f.vline(x,10,bottom,{sw:.6}));for(let i=1;i<slots.length;i++)f.vline(xG+cw*i,boundaries.includes(i)?10:10+h1,bottom,{sw:.6});f.hline(xP,xE,yB,{sw:1});el('rect',{x:xP,y:10,width:700,height:bottom-10,fill:'none',stroke:'#000','stroke-width':1.2},f.svg);
   return finish(f,{family:'schedule',width:720,height:bottom+12,taskWidth:taskW,slotWidth:cw,rowHeights:rowH,bars});
 }
 const helpers={need,list,fields,str,unique,width,wrap,track,finish,labelBox};
 const families={lanes,schedule,...reportFamilies(helpers),...visualFamilies(helpers),...dataVisualFamilies(helpers),...spatialFamilies(helpers),...comparisonFamilies(helpers),...distributionFamilies(helpers),...amountFlowFamilies(helpers),...workflowStructureFamilies(helpers),...officeTimeFamilies(helpers),...collaborationFamilies(helpers),...formulaFamilies(helpers),...stateFamilies(helpers),...deploymentFamilies(helpers),...chalkFamilies(helpers),...blueprintFigureFamilies(helpers),...solidFamilies(helpers),...magnitudeFamilies(helpers),...officeCostFamilies(helpers),...officeObjectiveFamilies(helpers),...officeAuditFamilies(helpers),...reliabilityFamilies(helpers),...requestFamilies(helpers),...hashFamilies(helpers),...mathShapeFamilies(helpers),...binaryFamilies(helpers),...probabilityFamilies(helpers),...architectureFamilies(helpers),...messageSequenceFamilies(helpers),...responsibilityFamilies(helpers),...backupFamilies(helpers),...historyFamilies(helpers),...loopFamilies(helpers),...workforceFamilies(helpers),...leaveFamilies(helpers),...orbitFamilies(helpers),...phaseFamilies(helpers),...categoryFamilies(helpers),...sampleFamilies(helpers),...priorityFamilies(helpers),...benefitFamilies(helpers),...circuitFamilies(helpers),...forceFamilies(helpers),...equationFamilies(helpers),...quantityFamilies(helpers),...compartmentFamilies(helpers),...oscillatorFamilies(helpers),...frictionFamilies(helpers),...germinationFamilies(helpers),...incidentFamilies(helpers),...tierFamilies(helpers),...spectrumFamilies(helpers),...latticeFamilies(helpers),...elementsFamilies(helpers),...decimalsFamilies(helpers),...schedulingFamilies(helpers),...gitopsFamilies(helpers),...waterstateFamilies(helpers),...sinterFamilies(helpers),...groverFamilies(helpers),...primerFamilies(helpers),...plantcycleFamilies(helpers),...leafenergyFamilies(helpers),...shadowCinemaFamilies(helpers),...nightPosterFamilies(helpers),...proteomicsFamilies(helpers),...calciumFamilies(helpers),...paperCoffeeFamilies(helpers),...cupFamilies(helpers),...knightFamilies(helpers),...circulationFamilies(helpers),...metabolismFamilies(helpers),...northstarFamilies(helpers),...planetFamilies(helpers),...argumentFamilies(helpers),...collationFamilies(helpers),...characterFamilies(helpers),...tenseFamilies(helpers),...quadratFamilies(helpers),...gwasFamilies(helpers),...foodwebFamilies(helpers),...insectFamilies(helpers),...windtunnelFamilies(helpers),...lightsheetFamilies(helpers),...shadowheightFamilies(helpers),...sunshadowFamilies(helpers),...bayesFamilies(helpers),...phylogenyFamilies(helpers),...electionFamilies(helpers),...shardingFamilies(helpers),...narrativeMotifFamilies(helpers),...classicalSyntaxFamilies(helpers),...weeklyPracticeFamilies(helpers),...lessonTimingFamilies(helpers),...adoptionFamilies(helpers),...datedLaneFamilies(helpers),...historicalPrintFamilies(helpers),...poetryReadingFamilies(helpers),...trainingFamilies(helpers),...statementFamilies(helpers),...seasonTerraceFamilies(helpers),...learningFamilies(helpers),...earthFamilies(helpers),...aisleFamilies(helpers),...httpFamilies(helpers),...chaosFamilies(helpers),...canaryFamilies(helpers),...meshFamilies(helpers),...cdnFamilies(helpers),...typedSystemFamilies(helpers),...searchFamilies(helpers),...latencyFamilies(helpers),...uncertaintyFamilies(helpers),...scalesFamilies(helpers),...chemistryFamilies(helpers),...ionFamilies(helpers),...moveFamilies(helpers),...escalationFamilies(helpers),...transitFamilies(helpers),...velocityFamilies(helpers),...squareFamilies(helpers),...angleFamilies(helpers),...calendarFamilies(helpers),...daytimeFamilies(helpers),...pathwayFamilies(helpers),...spacingFamilies({need,list,fields,str,unique,width,wrap,track,finish,labelBox}),...mapFamilies({need,list,fields,str,unique,width,wrap,track,finish,labelBox}),...approvalFamilies({need,list,fields,str,unique,width,wrap,track,finish,labelBox}),...handoffFamilies({need,list,fields,str,unique,width,wrap,track,finish,labelBox}),...fieldFamilies({need,list,fields,str,unique,width,wrap,track,finish,labelBox}),...runoffFamilies({need,list,fields,str,unique,width,wrap,track,finish,labelBox})};
 function report(b){
   fields(b,['family','title','columns','sections'],'report');str(b.title,'report.title');list(b.sections,2,6,'sections');unique(b.sections,'sections');
   const columns=b.columns??1;need([1,2].includes(columns),'report.columns must be 1 or 2');
   const children=b.sections.map(s=>{fields(s,['id','title','content'],'section');str(s.title,'section.title');need(s.content?.family!=='report','nested reports are unsupported');const svg=render(s.content),geometry=JSON.parse(svg.dataset.geometry);need(geometry.width===720,'report sections require a 720px technical-report family; deliver this visual separately');return {...s,svg,geometry,heading:wrap(s.title,680,16,'hei',2)}});
   const W=columns===1?720:1480,title=wrap(b.title,W-40,22,'hei',2),top=20+title.length*30.36+24,placements=[];
   let y=top;for(let i=0;i<children.length;i+=columns){const row=children.slice(i,i+columns),hh=Math.max(...row.map(c=>c.heading.length*22.08+12));const height=Math.max(...row.map(c=>c.geometry.height));for(const [col,c] of row.entries())placements.push({id:c.id,x:col*760,y:y+hh,w:720,h:c.geometry.height,headingY:y+hh/2,geometry:c.geometry});y+=hh+height+32}
   need(y<=4000,'report exceeds 4000px; split into separate pages');const f=makeFig(W,y);f.lines(W/2,20+title.length*30.36/2,title,{font:'hei',size:22});
   for(let i=0;i<children.length;i++){const c=children[i],p=placements[i];f.lines(p.x+10,p.headingY,c.heading,{size:16,font:'hei',anchor:'start'});const g=el('g',{transform:`translate(${p.x} ${p.y})`},f.svg);for(const n of [...c.svg.children])g.append(n);g.dataset.section=c.id}
   return finish(f,{family:'report',width:W,height:y,columns,sections:placements});
 }
 families.report=report;
 function render(input){need(input&&Object.hasOwn(families,input.family),'unsupported family');return families[input.family](input)}
 return {render,audit,width,families:Object.keys(families)};
})();
