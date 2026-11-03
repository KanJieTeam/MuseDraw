import {el} from './svg.mjs';
import {visualPage,visualText,visualLines,visualFinish,stroke,measureVisual,visualFontBounds} from './visual-tools.mjs';
import {trendBandModel} from './trend-band-models.mjs';

// Text blocks use the same font metrics as the SVG. Extra lines grow their
// allocated region; legend rows and the footer never rely on fixed increments.
export function trendBandFigure(input){
 const m=trendBandModel(input),W=1800,margin=92,ink='#19252A',muted='#596970',grid='#DAE1E4',paper='#FFFFFF';
 const textPlans=[];
 const plan=(text,width,size,weight=400,max=4)=>{
  const lines=visualLines(text,width,{size,weight,max}),bounds=lines.map(line=>visualFontBounds(line,size,'sans',weight));
  const ascent=Math.max(...bounds.map(b=>b.ascent)),descent=Math.max(...bounds.map(b=>b.descent)),step=Math.max(size*1.35,ascent+descent+6);
  return {lines,size,weight,ascent,descent,step,height:ascent+descent+(lines.length-1)*step,width:Math.max(...lines.map(line=>measureVisual(line,size,'sans',weight)))};
 };
 const title=plan(m.title,W-2*margin,50,800,8),subtitle=plan(m.subtitle,W-2*margin,22,400,5),status=plan(m.dataStatus,W-2*margin,21,400,5),note=plan(m.note,W-2*margin,21,400,6);
 const titleY=50,subY=titleY+title.height+22,statusY=subY+subtitle.height+22,chartY=statusY+status.height+50;
 const min=m.domain.min,max=m.domain.max,ticks=Array.from({length:5},(_,i)=>min+(max-min)*(4-i)/4);
 // Keep ticks distinct for tiny scales and for data around a large offset.
 let labels=[];
 for(let digits=4;digits<=17;digits++){
  labels=ticks.map(v=>{const n=Number(v.toPrecision(digits));return n!==0&&(Math.abs(n)>=1e6||Math.abs(n)<1e-3)?n.toExponential(digits-1).replace(/(\.\d*?[1-9])0+e/,'$1e').replace(/\.0+e/,'e'):String(Object.is(n,-0)?0:n)});
  if(new Set(labels).size===ticks.length)break;
 }
 const tickPlans=labels.map(label=>plan(label,480,18,400,1)),tickWidth=Math.max(...tickPlans.map(p=>p.width));
 const plot={x:margin+tickWidth+26,y:0,w:0,h:Math.max(500,5*Math.max(...tickPlans.map(p=>p.height))+80)};
 const legendX=1410,legendW=W-legendX-margin;
 plot.w=legendX-60-plot.x;
 if(plot.w<700)throw Error('trend-band: numeric labels leave insufficient plot width');
 const yLabel=plan(m.unit?`给定值 / ${m.unit}`:'给定值（单位未声明）',plot.w,21,700,3);
 plot.y=chartY+yLabel.height+24;
 const X=i=>plot.x+plot.w*i/(m.periods.length-1),Y=v=>plot.y+plot.h-(v-min)/(max-min)*plot.h;
 const xStep=plot.w/(m.periods.length-1),xPlans=m.periods.map(label=>plan(label,xStep-16,18,400,20)),xY=plot.y+plot.h+22,xHeight=Math.max(...xPlans.map(p=>p.height));
 const xCaption=plan('给定顺序 · 等距排列，不表示实际时间间隔',plot.w,19,400,2),xCaptionY=xY+xHeight+24;
 const legendHeader=plan('序列与读法',legendW,25,800,2),legendRows=[];
 let legendY=chartY+legendHeader.height+24;
 m.series.forEach((series,index)=>{const label=plan(series.label,legendW-46,21,700,6);legendRows.push({series,index,label,y:legendY});legendY+=label.height+28});
 const targetPlan=m.target?plan(`目标带：${m.target.label}`,legendW,20,700,8):null,targetY=legendY;
 if(targetPlan)legendY+=targetPlan.height+24;
 const summary=plan(`${m.series.length} 条序列 · ${m.periods.length} 个时段`,legendW,19,400,3),summaryY=legendY;
 legendY+=summary.height+24;
 const scope=plan('线段只连接给定期点。颜色、线型与符号共同区分序列，不代表等级。',legendW,19,400,8),scopeY=legendY;
 legendY+=scope.height;
 const ruleY=Math.max(xCaptionY+xCaption.height,legendY)+50,noteY=ruleY+28,H=Math.ceil(noteY+note.height+50),s=visualPage(W,H,paper);
 const draw=(x,y,p,fill=ink,anchor='start',attrs={})=>p.lines.forEach((line,i)=>{
  const node=visualText(s,x,y+p.ascent+i*p.step,line,{size:p.size,weight:p.weight,fill,anchor});
  for(const [k,v] of Object.entries(attrs))node.setAttribute(k,v);
  const width=measureVisual(line,p.size,'sans',p.weight),shift=anchor==='middle'?-width/2:anchor==='end'?-width:0;
  textPlans.push({text:line,x:x+shift,y:y+i*p.step,width,height:p.ascent+p.descent});
 });
 draw(margin,titleY,title);draw(margin,subY,subtitle,muted);draw(margin,statusY,status,muted);
 draw(plot.x,chartY,yLabel,ink,'start',{'data-trend-axis':'value'});
 if(m.target){const top=Y(m.target.max),bottom=Y(m.target.min);el('rect',{x:plot.x,y:top,width:plot.w,height:bottom-top,fill:'#E8EFF3','data-trend-target-band':'true'},s);for(const y of [...new Set([top,bottom])])stroke(s,[[plot.x,y],[plot.x+plot.w,y]],'#7D929F',1.5,{'stroke-dasharray':'5 6','data-role':'target-edge'})}
 ticks.forEach((v,i)=>{const y=Y(v);stroke(s,[[plot.x,y],[plot.x+plot.w,y]],grid,1,{'data-role':'grid'});draw(plot.x-18,y-tickPlans[i].height/2,tickPlans[i],muted,'end',{'data-trend-tick':String(v)})});
 stroke(s,[[plot.x,plot.y],[plot.x,plot.y+plot.h],[plot.x+plot.w,plot.y+plot.h]],ink,1.5);
 m.periods.forEach((label,i)=>draw(X(i),xY,xPlans[i],muted,'middle',{'data-trend-period':String(i)}));
 draw(plot.x+plot.w/2,xCaptionY,xCaption,muted,'middle');
 const dashes=['','11 5','3 5','13 4 3 4','2 4 2 9'];
 const marker=(x,y,index,color,attrs={})=>{
  const r=6,common={fill:paper,stroke:color,'stroke-width':2.5,...attrs};
  if(index===0)return el('circle',{cx:x,cy:y,r,...common},s);
  if(index===1)return el('rect',{x:x-r,y:y-r,width:2*r,height:2*r,...common},s);
  const points=index===2?[[x,y-r-2],[x+r+1,y+r],[x-r-1,y+r]]:index===3?[[x,y-r-2],[x+r+2,y],[x,y+r+2],[x-r-2,y]]:null;
  if(points)return el('polygon',{points:points.map(p=>p.join(',')).join(' '),...common},s);
  return el('path',{d:`M${x-r-1} ${y}h${2*r+2}M${x} ${y-r-1}v${2*r+2}`,...common,fill:'none'},s);
 };
 const lines=m.series.map((series,index)=>{
  const points=series.values.map((value,i)=>({period:m.periods[i],value,x:X(i),y:Y(value)}));
  stroke(s,points.map(p=>[p.x,p.y]),series.color,3,{'stroke-dasharray':dashes[index]||null,'data-trend-series':series.id});
  points.forEach((p,i)=>marker(p.x,p.y,index,series.color,{'data-trend-point':`${series.id}:${i}`}));
  return {id:series.id,label:series.label,color:series.color,marker:index,dash:dashes[index],points};
 });
 draw(legendX,chartY,legendHeader);
 for(const {series,index,label,y} of legendRows){const cy=y+label.ascent*.65;stroke(s,[[legendX,cy],[legendX+30,cy]],series.color,3,{'stroke-dasharray':dashes[index]||null});marker(legendX+15,cy,index,series.color);draw(legendX+46,y,label)}
 if(targetPlan)draw(legendX,targetY,targetPlan,muted);
 draw(legendX,summaryY,summary,muted);draw(legendX,scopeY,scope,muted);
 stroke(s,[[margin,ruleY],[W-margin,ruleY]],grid,1);draw(margin,noteY,note,muted);
 return visualFinish(s,{family:'trend-band',width:W,height:H,input,model:m,plot:{...plot,xDomain:m.periods,yDomain:[min,max]},target:m.target,lines,xLabels:m.periods.map((label,i)=>({label,x:X(i),y:xY,width:xPlans[i].width,height:xPlans[i].height})),textPlans,scope:m.scope,readingOrder:['title','status','plot','legend','note']});
}
export function trendBandFamilies(){return {'trend-band':trendBandFigure};}
