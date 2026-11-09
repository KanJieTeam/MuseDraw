import {el} from './svg.mjs';
import {visualPage,measureVisual,measuredVisualPlan,drawVisualPlan,visualFinish,stroke} from './visual-tools.mjs';
import {resourceAllocationModel} from './resource-allocation-models.mjs';

export function resourceAllocationFigure(input){
 const m=resourceAllocationModel(input);
 const M=100,gap=44,pad=24,ink='#1E2C32',muted='#627176',paper='#F6F3EE',rule='#C9D0CD',accent='#2E6F73',amber='#A16A30',red='#B44E4B',green='#4D7E68';
 const plan=(text,width,size=22,weight=400,max=4)=>measuredVisualPlan(text,width,{size,weight,max});
 const widest=(texts,size,weight=400)=>Math.max(...texts.map(text=>measureVisual(text,size,'sans',weight)));
 const totalCapacity=m.totalCapacity;
 const amountTexts=m.workstreams.flatMap(w=>w.allocations.map(c=>String(c.amount)));
 // Width follows the values and resource count. Text keeps its size.
 const minResourceWidth=Math.ceil(Math.max(170,widest(amountTexts,26,750)+pad*2,widest([m.unit],15)+pad*2,
  widest(m.resources.map(r=>`容量 ${r.capacity}`),17)+pad*2));
 const ww=380,gx=M+ww;
 const loadTexts=m.workstreams.map(w=>`总负载 ${w.total} ${m.unit}`);
 const sw=Math.ceil(Math.max(390,widest(loadTexts,21,750)+pad*2,widest([`资源总容量 ${totalCapacity} ${m.unit}`],17)+pad*2));
 const W=Math.max(1800,gx+minResourceWidth*m.resources.length+gap+sw+M),contentWidth=W-M*2;
 // Share spare canvas width among the comparable resource columns. The minimum
 // two-resource ledger must not leave half its composition as unused space.
 const rw=(W-M*2-ww-gap-sw)/m.resources.length,gw=rw*m.resources.length,sx=gx+gw+gap;
 if(W>8000)throw Error('resource allocation exceeds supported width; split resources or shorten labels');
 const title=plan(m.title,contentWidth,54,800,3),subtitle=plan(m.subtitle,contentWidth,23,400,5),status=plan(m.dataStatus,contentWidth,18,400,5),note=plan(m.note,contentWidth,20,400,8);
 const titleY=54,subY=titleY+title.height+18,statusY=subY+subtitle.height+12,ruleY=statusY+status.height+28,my=ruleY+36;
 const header=plan('工作流 / 资源',ww-pad*2,22,750),unit=plan(`单位：${m.unit}`,ww-pad*2,18);
 const resourceHeads=m.resources.map(r=>({label:plan(r.label,rw-pad*2,20,750,8),capacity:plan(`容量 ${r.capacity}`,rw-pad*2,17,400,2)}));
 const loadHead=plan('工作流负载',sw-pad*2,22,750),capacityHead=plan(`资源总容量 ${totalCapacity} ${m.unit}`,sw-pad*2,17,400,2);
 const th=Math.ceil(Math.max(header.height+unit.height+12,loadHead.height+capacityHead.height+12,
  ...resourceHeads.map(p=>p.label.height+p.capacity.height+14))+pad*2);
 const rowPlans=m.workstreams.map(w=>{
  const label=plan(w.label,ww-pad*2,23,750,6),id=plan(w.id,ww-pad*2,16,400,2);
  const cells=m.resources.map(r=>{
   // The ledger is keyed by resourceId, never the incoming array position.
   const c=w.allocations.find(a=>a.resourceId===r.id),state=c.amount>r.capacity?'over':c.amount===r.capacity?'balanced':'spare';
   const amountPlan=plan(String(c.amount),rw-pad*2,26,750,1),unitText=plan(m.unit,rw-pad*2,15,400,3);
   const stateLabel=r.capacity===0?(c.amount?'零容量 · 有分配':'零容量 · 无分配'):state==='over'?'超出登记容量':null;
   const warning=stateLabel?plan(stateLabel,rw-pad*2,15,750,3):null;
   const ratio=r.capacity>0?Math.min(1,c.amount/r.capacity):null;
   return {...c,capacity:r.capacity,state,ratio,amountPlan,unitText,warning};
  });
  const load=plan(`总负载 ${w.total} ${m.unit}`,sw-pad*2,21,750,2);
  const basis=plan(totalCapacity>0?'与资源总容量比较':'资源总容量为零 · 不计算比例',sw-pad*2,17,400,3);
  const contentHeight=Math.max(label.height+12+id.height,load.height+10+basis.height,
   ...cells.map(c=>c.amountPlan.height+8+c.unitText.height+(c.warning?8+c.warning.height:0)));
  return {label,id,cells,load,basis,height:Math.ceil(Math.max(118,pad*2+contentHeight+30))};
 });
 const matrixBottom=my+th+rowPlans.reduce((sum,p)=>sum+p.height,0),ledgerTitle=plan('资源余量',contentWidth,22,750),ledgerY=matrixBottom+38;
 // Wrap the ledger rather than packing eight long resource labels into one row.
 const ledgerColumns=Math.min(4,m.resources.length),ledgerGap=18,ledgerWidth=(contentWidth-(ledgerColumns-1)*ledgerGap)/ledgerColumns;
 const ledger=m.summaries.map((z,i)=>{
  const r=m.resources[i],state=z.spare<0?'超出':z.spare===0?'平衡':'余量';
  return {resourceId:r.id,state:z.state,label:plan(r.label,ledgerWidth-pad*2,18,750,4),
   load:plan(`已分配 ${z.load} ${m.unit}`,ledgerWidth-pad*2,17,400,4),
   spare:plan(`${state} ${Math.abs(z.spare)} ${m.unit}`,ledgerWidth-pad*2,17,750,4)};
 });
 const ledgerRows=[];let ledgerBottom=ledgerY+ledgerTitle.height+20;
 for(let i=0;i<ledger.length;i+=ledgerColumns){
  const items=ledger.slice(i,i+ledgerColumns),height=Math.ceil(Math.max(...items.map(p=>p.label.height+12+p.load.height+8+p.spare.height))+pad*2);
  ledgerRows.push({items,y:ledgerBottom,height});ledgerBottom+=height+ledgerGap;
 }
 const noteY=ledgerBottom+18,H=Math.ceil(noteY+24+note.height+54);
 if(H>8000)throw Error('resource allocation exceeds supported height; split workstreams or shorten labels');
 const s=visualPage(W,H,paper),draw=(x,y,p,extra={})=>drawVisualPlan(s,x,y,p,{fill:ink,...extra});
 const rect=(x,y,w,h,fill,attributes={})=>el('rect',{x,y,width:w,height:h,fill,stroke:rule,'stroke-width':1,...attributes},s);
 draw(M,titleY,title);draw(M,subY,subtitle,{fill:muted});draw(M,statusY,status,{fill:muted});stroke(s,[[M,ruleY],[W-M,ruleY]],ink,2);
 rect(M,my,ww,th,'#E8ECE8');draw(M+pad,my+pad,header);draw(M+pad,my+pad+header.height+12,unit,{fill:muted});
 resourceHeads.forEach((p,i)=>{
  const x=gx+i*rw;rect(x,my,rw,th,'#E8ECE8');draw(x+rw/2,my+pad,p.label,{anchor:'middle'});
  draw(x+rw/2,my+th-pad-p.capacity.height,p.capacity,{fill:muted,anchor:'middle'});
 });
 rect(sx,my,sw,th,'#E8ECE8');draw(sx+pad,my+pad,loadHead);draw(sx+pad,my+th-pad-capacityHead.height,capacityHead,{fill:muted});
 let y=my+th;const cells=[];
 m.workstreams.forEach((w,wi)=>{
  const p=rowPlans[wi],fill=wi%2?'#F0F2EE':'#FBFAF6';
  rect(M,y,ww,p.height,fill);draw(M+pad,y+pad,p.label);draw(M+pad,y+pad+p.label.height+12,p.id,{fill:muted});
  p.cells.forEach((c,ri)=>{
   const r=m.resources[ri],x=gx+ri*rw,color=c.state==='over'?red:c.state==='balanced'?amber:accent;
   rect(x,y,rw,p.height,fill,{'data-resource':r.id,'data-workstream':w.id,'data-role':'allocation-cell'});
   draw(x+rw/2,y+pad,c.amountPlan,{fill:color,anchor:'middle','data-role':'allocation-value','data-resource':r.id,'data-workstream':w.id});
   draw(x+rw/2,y+pad+c.amountPlan.height+8,c.unitText,{fill:muted,anchor:'middle'});
   if(c.warning)draw(x+rw/2,y+pad+c.amountPlan.height+8+c.unitText.height+8,c.warning,{fill:color,anchor:'middle'});
   if(c.ratio!==null){
    const attrs={'data-resource':r.id,'data-workstream':w.id};
    rect(x+20,y+p.height-pad-8,rw-40,8,'#DDE3DF',{'stroke-width':0,'data-role':'allocation-track',...attrs});
    if(c.amount)rect(x+20,y+p.height-pad-8,(rw-40)*c.ratio,8,color,{'stroke-width':0,'data-role':'allocation-mark',...attrs});
   }
   cells.push({resourceId:r.id,workstreamId:w.id,amount:c.amount,capacity:r.capacity,ratio:c.ratio,state:c.state,x,y,width:rw,height:p.height,source:c.source});
  });
  rect(sx,y,sw,p.height,fill);draw(sx+pad,y+pad,p.load);draw(sx+pad,y+pad+p.load.height+10,p.basis,{fill:muted});
  if(totalCapacity>0){
   rect(sx+pad,y+p.height-pad-8,sw-pad*2,8,'#DDE3DF',{'stroke-width':0,'data-role':'workstream-track','data-workstream':w.id});
   rect(sx+pad,y+p.height-pad-8,(sw-pad*2)*Math.min(1,w.total/totalCapacity),8,w.total>totalCapacity?red:'#536D72',{'stroke-width':0,'data-role':'workstream-load','data-workstream':w.id});
  }
  y+=p.height;
 });
 draw(M,ledgerY,ledgerTitle);
 for(const row of ledgerRows)row.items.forEach((p,i)=>{
  const x=M+i*(ledgerWidth+ledgerGap),color=p.state==='over'?red:p.state==='balanced'?amber:green;
  rect(x,row.y,ledgerWidth,row.height,'#FFFFFF',{'data-role':'resource-summary','data-resource':p.resourceId});
  draw(x+pad,row.y+pad,p.label);draw(x+pad,row.y+pad+p.label.height+12,p.load,{fill:muted});
  draw(x+pad,row.y+pad+p.label.height+12+p.load.height+8,p.spare,{fill:color});
 });
 stroke(s,[[M,noteY],[W-M,noteY]],ink,1);draw(M,noteY+24,note,{fill:muted});
 return visualFinish(s,{family:'resource-allocation',width:W,height:H,resources:m.resources,workstreams:m.workstreams.map(w=>({id:w.id,total:w.total})),summaries:m.summaries,cells,
  layout:{resourceWidth:rw,workstreamWidth:ww,loadWidth:sw,headerHeight:th,rowHeights:rowPlans.map(p=>p.height),ledgerColumns},
  readingOrder:['title','matrix','resource-ledger','note'],encoding:'each cell is a supplied allocation keyed by resourceId; bars compare with supplied capacity and stop at its limit; zero capacities have no ratio; numeric values retain overloads',scope:m.scope,aestheticApproval:'not-assessed'});
}

export function resourceAllocationFamilies(){return {'resource-allocation':resourceAllocationFigure}}
