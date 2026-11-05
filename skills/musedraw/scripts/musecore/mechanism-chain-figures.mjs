import {el} from './svg.mjs';
import {visualPage,visualText,visualLines,visualFontBounds,visualFinish,stroke} from './visual-tools.mjs';
import {mechanismChainModel} from './mechanism-chain-models.mjs';

// A single measured evidence path. Longer labels and additional stages grow
// the page rather than forcing a caller to shrink type into fixed cards.
const mcTextPlan=(value,width,{size=20,weight=400,max=2,role='sans'}={})=>{
 const lines=visualLines(value,width,{size,weight,max,role});
 const bounds=lines.map(line=>visualFontBounds(line,size,role,weight));
 const ascent=Math.max(...bounds.map(b=>b.ascent)),descent=Math.max(...bounds.map(b=>b.descent));
 const step=Math.max(size*1.3,ascent+descent+5);
 return {lines,size,weight,role,ascent,descent,step,height:ascent+descent+(lines.length-1)*step};
};
const mcDrawPlan=(svg,x,top,p,{fill='#16202A',anchor='start'}={})=>p.lines.map((line,i)=>visualText(svg,x,top+p.ascent+i*p.step,line,{size:p.size,weight:p.weight,role:p.role,fill,anchor}));

export function mechanismChainFigure(input){
 const m=mechanismChainModel(input),count=m.nodes.length;
 const W=2200+Math.max(0,count-5)*90,margin=92,ink='#15202B',muted='#5D6B73',grid='#D9E2E5',bg='#F8FBFA';
 const header=mcTextPlan(m.title,W-margin*2,{size:48,weight:800,max:2});
 const sub=mcTextPlan(m.subtitle,W-margin*2,{size:22,max:2});
 const note=mcTextPlan(m.note,W-margin*2,{size:18,max:3});
 const headerY=44,subY=headerY+header.height+14,ruleY=subY+sub.height+22;
 const bandY=ruleY+22,bandH=38,scaleGap=14,scaleW=(W-margin*2-scaleGap*2)/3;
 const top=bandY+bandH+28,usable=W-margin*2,step=usable/count,cardW=Math.min(300,step-26),inner=24;
 const labelSize=count>=7?21:24;
 const nodePlans=m.nodes.map(node=>{
  const label=mcTextPlan(node.label,cardW-inner*2,{size:labelSize,weight:800,max:4});
  const sourceIds=node.sourceIds.map(id=>m.sources.find(s=>s.id===id).label).join('；');
  const source=mcTextPlan('来源：'+sourceIds,cardW-inner*2,{size:14,max:4});
  return {label,source};
 });
 const maxLabel=Math.max(...nodePlans.map(p=>p.label.height)),maxSource=Math.max(...nodePlans.map(p=>p.source.height));
 const cardH=Math.max(360,60+maxLabel+68+52+maxSource+28);
 const cardY=top+32,nodeMap=new Map();
 for(let i=0;i<m.order.length;i++){
  const node=m.nodes.find(n=>n.id===m.order[i]),x=margin+i*step+(step-cardW)/2;
  nodeMap.set(node.id,{x,y:cardY,w:cardW,h:cardH});
 }
 const legendY=cardY+cardH+42;
 const ledgerY=legendY+48,ledgerTitle=mcTextPlan('证据账本 · 每个节点与边都保留来源指针',W-margin*2,{size:21,weight:800,max:1});
 const ledgerRows=Math.ceil(m.links.length/2),footerTop=ledgerY+ledgerTitle.height+20+ledgerRows*42+36;
 const H=Math.max(1240,footerTop+note.height+24);
 const svg=visualPage(W,H,bg);
 mcDrawPlan(svg,margin,headerY,header);mcDrawPlan(svg,margin,subY,sub,{fill:muted});
 stroke(svg,[[margin,ruleY],[W-margin,ruleY]],ink,2);
 for(const [i,s] of m.scales.entries()){
  const x=margin+i*(scaleW+scaleGap);
  el('rect',{x,y:bandY,width:scaleW,height:bandH,rx:8,fill:s.color,'fill-opacity':'.16',stroke:s.color,'stroke-width':2},svg);
  visualText(svg,x+16,bandY+26,s.label,{size:18,weight:700,fill:s.color});
  visualText(svg,x+scaleW-16,bandY+26,`尺度 ${i+1}/3`,{size:14,fill:muted,anchor:'end'});
 }
 const defs=el('defs',{},svg),marker=el('marker',{id:'mc-arrow',markerWidth:10,markerHeight:10,refX:8,refY:4,orient:'auto',markerUnits:'strokeWidth'},defs);
 el('path',{d:'M0,0 L8,4 L0,8 z',fill:'#4E7B62'},marker);
 const max=Math.max(...m.nodes.map(n=>n.interval.high),1),maxBar=max*1.08;
 const scaleX=(x,w,v)=>x+(v/maxBar)*w;
 for(const link of m.links){
  const a=nodeMap.get(link.from),b=nodeMap.get(link.to),y=cardY+cardH/2;
  stroke(svg,[[a.x+a.w+5,y],[b.x-12,y]],link.effect==='inhibits'?'#B84444':'#4E7B62',4,{'marker-end':'url(#mc-arrow)','data-role':'mechanism-link'});
  const edgeX=(a.x+a.w+b.x)/2,edge=mcTextPlan(`${link.effect} · ${link.evidence}`,160,{size:13,weight:700,max:2});
  mcDrawPlan(svg,edgeX,y-30,edge,{fill:link.effect==='inhibits'?'#B84444':'#4E7B62',anchor:'middle'});
 }
 const geometries=[];
 for(const [i,node] of m.nodes.entries()){
  const box=nodeMap.get(node.id),scale=m.scales.find(s=>s.id===node.scale),roleColor=node.role==='input'?'#3D6E8D':node.role==='readout'?'#8A5A36':'#3B7C67',plan=nodePlans[i];
  el('rect',{x:box.x,y:box.y,width:box.w,height:box.h,rx:18,fill:'#FFFFFF',stroke:roleColor,'stroke-width':3,'data-role':'mechanism-node','data-node':node.id},svg);
  el('rect',{x:box.x,y:box.y,width:box.w,height:9,rx:4,fill:scale.color},svg);
  visualText(svg,box.x+inner,box.y+40,`${node.role.toUpperCase()} · ${scale.label}`,{size:13,weight:700,fill:roleColor});
  mcDrawPlan(svg,box.x+inner,box.y+58,plan.label);
  const valueY=box.y+58+plan.label.height+34;
  visualText(svg,box.x+inner,valueY,`${node.value} ${m.unit}`,{size:28,weight:800,fill:ink});
  visualText(svg,box.x+inner,valueY+28,'给定读数 · 区间保留',{size:14,fill:muted});
  const barX=box.x+inner,barW=box.w-inner*2,barY=valueY+72;
  stroke(svg,[[barX,barY],[barX+barW,barY]],grid,10,{'stroke-linecap':'round','data-role':'uncertainty-baseline'});
  const lo=scaleX(barX,barW,node.interval.low),hi=scaleX(barX,barW,node.interval.high),val=scaleX(barX,barW,node.value);
  stroke(svg,[[lo,barY],[hi,barY]],roleColor,10,{'stroke-linecap':'round','data-role':'uncertainty-interval','data-node':node.id});
  stroke(svg,[[lo,barY-16],[lo,barY+16]],roleColor,2);stroke(svg,[[hi,barY-16],[hi,barY+16]],roleColor,2);
  el('circle',{cx:val,cy:barY,r:8,fill:roleColor,'data-role':'point-estimate','data-node':node.id},svg);
  visualText(svg,barX,barY+34,`范围 ${node.interval.low}–${node.interval.high}`,{size:14,fill:muted});
  mcDrawPlan(svg,box.x+inner,barY+52,plan.source,{fill:muted});
  geometries.push({id:node.id,role:node.role,scale:node.scale,x:box.x,y:box.y,width:box.w,height:box.h,value:node.value,interval:node.interval,sourceIds:[...node.sourceIds]});
 }
 visualText(svg,margin,legendY,'区间读法',{size:17,weight:800,fill:ink});
 visualText(svg,margin+115,legendY,'● 给定读数',{size:15,fill:muted});
 stroke(svg,[[margin+265,legendY-6],[margin+325,legendY-6]],'#3B7C67',8,{'stroke-linecap':'round'});
 visualText(svg,margin+340,legendY,'给定范围',{size:15,fill:muted});
 visualText(svg,W-margin,legendY,'边的颜色与标签只记录声明的作用和证据模式',{size:15,fill:muted,anchor:'end'});
 mcDrawPlan(svg,margin,ledgerY,ledgerTitle);
 let y=ledgerY+ledgerTitle.height+20;const colW=(W-margin*2)/2;
 for(const [i,item] of m.traceability.linkSources.entries()){
  const x=margin+(i%2)*colW,yy=y+Math.floor(i/2)*42;
  visualText(svg,x,yy,`${item.from} → ${item.to} · ${item.evidence}`,{size:15,weight:700,fill:ink});
  visualText(svg,x+300,yy,item.sourceIds.map(id=>m.sources.find(s=>s.id===id).label).join('；'),{size:14,fill:muted});
 }
 mcDrawPlan(svg,margin,H-24-note.height,note,{fill:muted});
 return visualFinish(svg,{family:'mechanism-chain',width:W,height:H,title:m.title,subtitle:m.subtitle,evidenceKind:m.evidenceKind,unit:m.unit,scales:m.scales,nodes:geometries,links:m.links,order:m.order,traceability:m.traceability,note:m.note,compositionReference:'mechanism-chain',aestheticApproval:'not-assessed'});
}

export function mechanismChainFamilies(){return {'mechanism-chain':mechanismChainFigure}};
