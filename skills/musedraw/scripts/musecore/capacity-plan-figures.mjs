import {el} from './svg.mjs';
import {visualPage,visualLines,visualBlock,visualText,visualFinish,stroke} from './visual-tools.mjs';
import {capacityPlanModel} from './capacity-plan-models.mjs';

export function capacityPlanFamilies(){
 function capacityPlanFigure(input){
  const m=capacityPlanModel(input),W=1900,margin=86,labelW=300,gridX=margin+labelW,gridW=W-gridX-margin,colGap=18,colW=(gridW-(m.periods.length-1)*colGap)/m.periods.length;
  const paper='#F6F3EA',ink='#1C2B31',muted='#667478',rule='#BCC2BD',blue='#2A6672',amber='#C97842',red='#B24D4B',green='#5A806F';
  const plan=(text,width,size=24,weight=400,max=3)=>{const lines=visualLines(text,width,{size,weight,max});lines.height=lines.length*size*1.3;return lines};
  // subtitle and dataStatus are validated independently by the model, then
  // rendered as one line-wrapped block.  Their combined legal maximum is
  // wider than three lines at the display size, so reserve enough lines for
  // the full authored content instead of rejecting valid input.
  const title=plan(m.title,W-2*margin,58,800,2),sub=plan(`${m.subtitle} · ${m.dataStatus}`,W-2*margin,24,400,6),headerH=104;
  const rowPlans=m.streams.map(s=>{const label=plan(s.label,labelW-28,28,700,2), cells=s.values.map(v=>{const note=v.note?plan(v.note,colW-24,16,400,2):null;return {note}});return {label,cells}});
  const rowH=rowPlans.map(r=>Math.max(185,r.label.height+70,...r.cells.map(c=>c.note?c.note.height+162:0)));
  const legendH=76,note=plan(m.note,W-2*margin,21,400,4),H=58+title.height+14+sub.height+30+headerH+rowH.reduce((a,b)=>a+b,0)+legendH+note.height+82;
  if(H>2800)throw Error('capacity plan exceeds supported height; reduce periods, streams or notes');
  const s=visualPage(W,H,paper);let y=42;visualBlock(s,margin,y,title,{size:58,weight:800,fill:ink});y+=title.height+14;visualBlock(s,margin,y,sub,{size:24,fill:muted});y+=sub.height+28;
  const gridTop=y;stroke(s,[[margin,gridTop],[W-margin,gridTop]],ink,2);visualText(s,gridX-18,gridTop+45,'工作流 / 周期',{size:18,weight:700,fill:muted,anchor:'end'});
  m.periods.forEach((p,i)=>{const x=gridX+i*(colW+colGap)+colW/2;visualBlock(s,x,gridTop+22,plan(p.label,colW-20,25,750,2),{size:25,weight:750,fill:ink,anchor:'middle'});});
  let cy=gridTop+headerH;const rows=[],cells=[];
  for(const [ri,row] of m.streams.entries()){
   const rh=rowH[ri];if(ri%2===0)el('rect',{x:margin,y:cy,width:W-2*margin,height:rh,fill:'#EEEDE6'},s);visualBlock(s,margin+16,cy+(rh-rowPlans[ri].label.height)/2,rowPlans[ri].label,{size:28,weight:700,fill:ink});
  row.values.forEach((v,ci)=>{const x=gridX+ci*(colW+colGap),innerX=x+18,innerW=colW-36,baseY=cy+72,railH=25,max=row.scale,capacityW=innerW*v.capacity/max,demandW=innerW*v.demand/max,color=v.state==='over'?red:v.state==='balanced'?green:blue;el('rect',{x,y:cy+22,width:colW,height:rh-38,rx:10,fill:paper,stroke:rule,'stroke-width':1,'data-capacity-cell':`${row.id}:${m.periods[ci].id}`},s);el('line',{x1:innerX,y1:baseY+railH/2,x2:innerX+innerW,y2:baseY+railH/2,stroke:'#D3D8D2','stroke-width':railH,'stroke-linecap':'round'},s);if(v.capacity>0)el('line',{x1:innerX,y1:baseY+railH/2,x2:innerX+capacityW,y2:baseY+railH/2,stroke:'#A8B2AD','stroke-width':railH-7,'stroke-linecap':'round','data-role':'capacity-rail'} ,s);if(v.demand>0)el('line',{x1:innerX,y1:baseY+railH/2,x2:innerX+demandW,y2:baseY+railH/2,stroke:color,'stroke-width':railH-12,'stroke-linecap':'round','data-role':'demand-mark'},s);visualText(s,innerX,cy+56,`需 ${v.demand} · 容 ${v.capacity}`,{size:18,weight:700,fill:ink});const gapLabel=v.gap>0?`余 ${v.gap}`:v.gap<0?`缺 ${Math.abs(v.gap)}`:'平衡';visualText(s,innerX+innerW,cy+56,gapLabel,{size:18,weight:700,fill:color,anchor:'end'});if(v.note)visualBlock(s,innerX,baseY+50,rowPlans[ri].cells[ci].note,{size:16,fill:muted});cells.push({stream:row.id,period:m.periods[ci].id,demand:v.demand,capacity:v.capacity,gap:v.gap,state:v.state,x,y:cy+22,width:colW,height:rh-38});});rows.push({id:row.id,y:cy,height:rh});stroke(s,[[margin,cy+rh],[W-margin,cy+rh]],rule,1);cy+=rh;}
  const legendY=cy+35;visualText(s,margin,legendY,'容量轨：灰 · 需求标记：蓝 · 平衡：绿 · 超出：红',{size:18,weight:700,fill:muted});const footerY=legendY+48;stroke(s,[[margin,footerY-16],[W-margin,footerY-16]],ink,1);visualBlock(s,margin,footerY,note,{size:21,fill:muted});
  return visualFinish(s,{family:'capacity-plan',width:W,height:H,periods:m.periods,rows,cells,encoding:'rail is supplied capacity; colored mark is supplied demand; gap is capacity minus demand',scope:m.scope,sourceCase:'original-capacity-plan',aestheticApproval:'not-assessed'});
 }
 return {'capacity-plan':capacityPlanFigure};
}
