import {el} from './svg.mjs';
import {visualPage,visualText,visualLines,visualBlock,visualHeading,visualFinish,backedVisualText,number,hex} from './visual-tools.mjs';
import {formatNumber,labelTrack} from './quantitative.mjs';

export function amountFlowFamilies(h){
 const {fields,list,str,need,unique}=h;
 function sankey(b){
  fields(b,['family','title','subtitle','columns','nodes','links','unit','note'],'sankey');for(const k of ['title','subtitle','unit','note'])str(b[k],k);list(b.columns,2,4,'columns');b.columns.forEach(c=>str(c,'column'));list(b.nodes,4,20,'nodes');unique(b.nodes,'nodes');list(b.links,2,32,'links');
  for(const n of b.nodes){fields(n,['id','label','column','color'],'node');str(n.label,'node.label');need(Number.isInteger(n.column)&&n.column>=0&&n.column<b.columns.length,'node column outside range');hex(n.color)}
  const nodeMap=new Map(b.nodes.map(n=>[n.id,{...n,incoming:0,outgoing:0}])),edgeIds=new Set();
  for(const l of b.links){fields(l,['from','to','value'],'link');number(l.value,'link.value');need(l.value>0,'flow value must be positive');const a=nodeMap.get(l.from),z=nodeMap.get(l.to);need(a&&z,'unknown flow endpoint');need(z.column===a.column+1,'flow only joins adjacent increasing columns');const key=l.from+'>'+l.to;need(!edgeIds.has(key),'duplicate flow link');edgeIds.add(key);a.outgoing+=l.value;z.incoming+=l.value}
  for(const n of nodeMap.values()){need(Number.isFinite(n.incoming)&&Number.isFinite(n.outgoing),'flow total exceeds numeric range');need(n.incoming+n.outgoing>0,'isolated flow node');if(n.column>0&&n.column<b.columns.length-1)need(Math.abs(n.incoming-n.outgoing)<=1e-8*Math.max(1,n.incoming,n.outgoing),'internal node does not conserve flow: '+n.id)}
  const columns=b.columns.map((_,i)=>[...nodeMap.values()].filter(n=>n.column===i));for(const col of columns)list(col,1,7,'column nodes');const totals=columns.map(col=>col.reduce((s,n)=>s+Math.max(n.incoming,n.outgoing),0));need(totals.every(t=>Math.abs(t-totals[0])<1e-8*Math.max(1,t)),'column totals do not conserve flow');
  const W=1800,top=280,bottom=1010,H=1170,s=visualPage(W,H,'#FFFEFA'),x0=150,x1=1500,nodeW=15,gap=28,scale=Math.min(...columns.map(col=>(bottom-top-(col.length-1)*gap)/totals[0]));need(scale>0,'flow layout has no vertical room');
  visualHeading(s,b.title,b.subtitle,{width:1660,size:49});const positions=new Map();
  columns.forEach((col,i)=>{const x=x0+(x1-x0)*i/(columns.length-1),height=totals[i]*scale+(col.length-1)*gap;let y=top+(bottom-top-height)/2;const labels=labelTrack(col.map(n=>{const h=Math.max(n.incoming,n.outgoing)*scale;need(h>=3,'flow below visible resolution; use another chart');const result={id:n.id,desired:y+h/2};positions.set(n.id,{...n,x,y,w:nodeW,h,inOffset:0,outOffset:0});y+=h+gap;return result}),{top:top+18,bottom:bottom-22,gap:66});labels.forEach(l=>positions.get(l.id).labelY=l.placed);visualText(s,x+nodeW/2,top-55,b.columns[i],{size:23,weight:700,anchor:'middle'})});
  // Stable port ordering follows the destination/source order within its column.
  // All bands share one global value scale; no minimum-width inflation.
  const flows=b.links.map((l,index)=>({...l,index})).sort((a,z)=>positions.get(a.from).x-positions.get(z.from).x||positions.get(a.from).y-positions.get(z.from).y||positions.get(a.to).y-positions.get(z.to).y);
  const targetOffsets=new Map();for(const node of positions.values()){let offset=0;for(const l of flows.filter(l=>l.to===node.id).sort((a,z)=>positions.get(a.from).y-positions.get(z.from).y)){targetOffsets.set(l.index,offset);offset+=l.value*scale}}
  const bands=[];for(const l of flows){const a=positions.get(l.from),z=positions.get(l.to),height=l.value*scale,sy=a.y+a.outOffset,ty=z.y+targetOffsets.get(l.index),start=a.x+nodeW,end=z.x,m=(start+end)/2;const d=`M ${start} ${sy} C ${m} ${sy} ${m} ${ty} ${end} ${ty} L ${end} ${ty+height} C ${m} ${ty+height} ${m} ${sy+height} ${start} ${sy+height} Z`;el('path',{d,fill:z.color,'fill-opacity':.42},s);bands.push({...l,sourceY:sy,targetY:ty,height,startX:start,endX:end});a.outOffset+=height}
  for(const n of positions.values()){el('rect',{x:n.x,y:n.y,width:n.w,height:n.h,fill:n.color},s);const last=n.column===b.columns.length-1,x=last?n.x+nodeW+20:n.x+nodeW+18,ls=visualLines(n.label,220,{size:23,weight:700,max:1});visualText(s,x,n.labelY-4,ls[0],{size:23,weight:700,fill:'#303B3D'});visualText(s,x,n.labelY+25,`${formatNumber(Math.max(n.incoming,n.outgoing))} ${b.unit}`,{size:19,fill:'#435052'})}
  visualBlock(s,70,H-72,visualLines(b.note,1660,{size:19,max:2}),{size:19,fill:'#748180'});
  return visualFinish(s,{family:'sankey',width:W,height:H,nodes:[...positions.values()],links:bands,total:totals[0],columnTotals:totals,scale,sourceCases:['d06-sangji-shouzhi','181-budget-sankey']});
 }
 return {sankey};
}
