import {el} from './svg.mjs';
import {visualPage,visualFinish,stroke} from './visual-tools.mjs';
import {equationTextPlan,equationDrawPlan} from './equation-figures.mjs';
import {cap2ConvergenceModel} from './cap2-convergence-models.mjs';

export function cap2ConvergenceFamilies(){
 function convergingPathways(input){
  const m=cap2ConvergenceModel(input),ink='#18252C',dim='#586A73',plans=new Map(m.stations.map(s=>[s.id,{label:equationTextPlan(s.label,220,{size:28,weight:s.shared?800:600,max:5}),note:s.note?equationTextPlan(s.note,220,{size:20,max:5}):null}]));
  const routePlans=m.branches.map(b=>({label:equationTextPlan(b.label,1000,{size:30,weight:800,max:3}),note:b.note?equationTextPlan(b.note,1000,{size:22,max:5}):null}));
  const labelHeight=Math.max(...[...plans.values()].map(p=>p.label.height)),noteHeight=Math.max(0,...[...plans.values()].map(p=>p.note?.height??0)),nameHeight=Math.max(...routePlans.map(p=>p.label.height)),routeNoteHeight=Math.max(0,...routePlans.map(p=>p.note?.height??0));
  const gap=nameHeight+labelHeight+noteHeight+routeNoteHeight+150,maxCount=Math.max(...m.branches.map(b=>b.stations.length-2)),span=(m.branches.length-1)*gap,originX=300,firstX=originX+span/4+200,step=260,lastX=firstX+(maxCount-1)*step,junctionX=lastX+span/4+220,commonStep=260,W=junctionX+(m.common.stations.length-1)*commonStep+290;
  if(W>8000)throw Error('Convergence exceeds 8000px; shorten text, split the work or use pathway-map');
  const title=equationTextPlan(input.title,W-160,{size:54,weight:800,max:3}),sub=equationTextPlan(input.subtitle,W-160,{size:24,max:4}),top=60+title.height+20+sub.height+70+nameHeight+labelHeight,ys=m.branches.map((b,i)=>top+i*gap),joinY=(ys[0]+ys.at(-1))/2;
  const stationGeometry=[],routeGeometry=[],addStation=(id,x,y,kind)=>{if(stationGeometry.some(s=>s.id===id))throw Error('Internal duplicate station');stationGeometry.push({...m.stations.find(s=>s.id===id),x,y,kind,...plans.get(id)})};
  for(const o of m.origins){const rows=o.branchIds.map(id=>m.branches.findIndex(b=>b.id===id));addStation(o.id,originX,(ys[Math.min(...rows)]+ys[Math.max(...rows)])/2,'origin')}
  m.branches.forEach((b,i)=>{const y=ys[i],origin=stationGeometry.find(s=>s.id===b.stations[0]),interior=b.stations.slice(1,-1),points=[[origin.x,origin.y]];
   if(origin.y!==y)points.push([firstX-140,y]);
   interior.forEach((id,j)=>{const x=firstX+j*step;addStation(id,x,y,'branch');points.push([x,y])});
   const endX=points.at(-1)[0];if(y!==joinY){const bend=lastX+140;if(bend<endX+140)throw Error('Convergence diagonal has insufficient label clearance');points.push([bend,y])}points.push([junctionX,joinY]);
   routeGeometry.push({...b,points,y,labelPlan:routePlans[i].label,notePlan:routePlans[i].note,nameY:y-labelHeight-nameHeight-55,noteY:y+45+noteHeight});
  });
  addStation(m.junctionId,junctionX,joinY,'junction');m.common.stations.slice(1).forEach((id,i)=>addStation(id,junctionX+110+(i+1)*commonStep,joinY,'common'));
  routeGeometry.push({...m.common,points:m.common.stations.map(id=>{const s=stationGeometry.find(s=>s.id===id);return[s.x,s.y]}),y:joinY});
  const commonLabel=equationTextPlan(m.common.label,(m.common.stations.length-1)*commonStep,{size:28,weight:800,max:3}),commonNote=m.common.note?equationTextPlan(m.common.note,(m.common.stations.length-1)*commonStep,{size:22,max:5}):null,commonLabelY=joinY-labelHeight-nameHeight-55,commonNoteY=joinY+85+labelHeight+noteHeight;
  const bodyBottom=Math.max(ys.at(-1)+75+noteHeight+routeNoteHeight,commonNoteY+(commonNote?.height??0)),query=m.query?equationTextPlan(m.query.reachable?'按声明连接可达：'+m.query.stationIds.map(id=>m.stations.find(s=>s.id===id).label).join(' → '):'按声明连接不可达：'+m.stations.find(s=>s.id===m.query.from).label+' → '+m.stations.find(s=>s.id===m.query.to).label,W-160,{size:23,max:6}):null,note=equationTextPlan(input.note,W-160,{size:22,max:6}),noteY=bodyBottom+75+(query?query.height+25:0),H=noteY+note.height+60,s=visualPage(W,H,'#FFFFFF');
  equationDrawPlan(s,80,60,title,{fill:ink});equationDrawPlan(s,80,80+title.height,sub,{fill:dim});
  for(const r of routeGeometry){stroke(s,r.points,r.color,12,{'stroke-linejoin':'round','stroke-linecap':'round','data-convergence-route':r.id});if(r.labelPlan){equationDrawPlan(s,firstX-120,r.nameY,r.labelPlan,{fill:r.color});if(r.notePlan)equationDrawPlan(s,firstX-120,r.noteY,r.notePlan,{fill:r.color})}}
  for(const st of stationGeometry){const p=st.label,group=el('g',{'data-convergence-station':st.id},s);el('circle',{cx:st.x,cy:st.y,r:st.shared?21:12,fill:'#FFFFFF',stroke:st.shared?ink:m.routes.find(r=>st.routeIds.includes(r.id)).color,'stroke-width':st.shared?5:4},group);
   if(st.kind==='origin'){equationDrawPlan(group,st.x-40,st.y-p.height/2,p,{fill:ink,anchor:'end'});if(st.note)equationDrawPlan(group,st.x-40,st.y+p.height/2+20,st.note,{fill:dim,anchor:'end'})}
   else{const labelY=st.kind==='junction'?st.y+35:st.y-35-p.height;equationDrawPlan(group,st.kind==='junction'?st.x+40:st.x,labelY,p,{fill:ink,anchor:st.kind==='junction'?'start':'middle'});if(st.note)equationDrawPlan(group,st.kind==='junction'?st.x+40:st.x,st.kind==='junction'?labelY+p.height+18:st.y+35,st.note,{fill:dim,anchor:st.kind==='junction'?'start':'middle'})}
  }
  equationDrawPlan(s,junctionX+80,commonLabelY,commonLabel,{fill:m.common.color});if(commonNote)equationDrawPlan(s,junctionX+80,commonNoteY,commonNote,{fill:m.common.color});if(query)equationDrawPlan(s,80,bodyBottom+75,query,{fill:ink});equationDrawPlan(s,80,noteY,note,{fill:dim});
  return visualFinish(s,{family:'converging-pathways',compositionReference:'s05-danbai-jiegou',width:W,height:H,...m,stations:stationGeometry,routes:routeGeometry,junction:{id:m.junctionId,x:junctionX,y:joinY},note:input.note,encoding:'One visible node per station ID. Every declared branch terminates at the same junction and the suffix continues right. Branch order and station spacing are not measured time or method equivalence.',typeMetrics:'Measured ascent/descent determine branch spacing, title height, notes and label clearance.'});
 }
 return {'converging-pathways':convergingPathways};
}
