import {el} from './svg.mjs';
import {visualPage,visualFinish,stroke,measuredVisualPlan,drawVisualPlan} from './visual-tools.mjs';
import {distinctNumericTicks,numericDisplay,labelTrack} from './quantitative.mjs';
import {agreementPlotModel} from './agreement-models.mjs';

export function agreementPlotFamilies(){return {'agreement-plot':input=>{
 const m=agreementPlotModel(input),W=2100,margin=100,ink='#1D2A33',muted='#637176',grid='#D7DFDC',paper='#FFFFFF',accent='#356F78',amber='#B17A2F',red='#A64F53';
 const plan=(text,width,size=22,weight=400,max=6)=>measuredVisualPlan(text,width,{size,weight,max});
 const title=plan(m.title,1900,54,800,5),sub=plan(m.subtitle,1900,23),status=plan(m.dataStatus,1900,22),note=plan(m.note,1900,22,400,12);
 const titleY=54,subY=titleY+title.height+22,statusY=subY+sub.height+20;
 const xTicks=distinctNumericTicks(m.domain.xMin,m.domain.xMax),yTicks=distinctNumericTicks(m.domain.yMin,m.domain.yMax,5),yPlans=yTicks.map(t=>plan(t.label,480,20,400,1));
 const plot={x:margin+Math.max(...yPlans.map(p=>p.width))+26,y:0,w:0,h:730};plot.w=1400-plot.x;
 if(plot.w<650)throw Error('agreement-plot: numeric labels leave insufficient plot width');
 const yLabel=plan(`${m.yLabel} · ${m.unit}`,plot.w,23,700,6),yLabelY=statusY+status.height+50;
 plot.y=yLabelY+yLabel.height+22;
 const summaryX=1590,summaryW=W-summaryX-margin,x=v=>plot.x+(v-m.domain.xMin)/(m.domain.xMax-m.domain.xMin)*plot.w,y=v=>plot.y+plot.h-(v-m.domain.yMin)/(m.domain.yMax-m.domain.yMin)*plot.h;
 const xPlans=xTicks.map(t=>plan(t.label,plot.w/5-14,20,400,2)),xTickY=plot.y+plot.h+20,xLabel=plan(`${m.xLabel} · ${m.unit}`,plot.w,23,400,6),xLabelY=xTickY+Math.max(...xPlans.map(p=>p.height))+24;
 const sections=[{title:'输入摘要',text:`${m.pairs.length} 对读数\n平均差值 ${numericDisplay(m.meanDifference)}\n参考差值 ${numericDisplay(m.referenceDifference)}\n下界 ${numericDisplay(m.lowerLimit)}\n上界 ${numericDisplay(m.upperLimit)}`},{title:'读法',text:'横轴：每对读数的均值\n纵轴：第二次减第一次\n点：每个输入配对\n水平线：给定的参考与界限'},{title:'追溯',text:'两次原始读数、派生坐标与原始来源随输入保留，可逐项核对。'}].map(section=>({...section,heading:plan(section.title,summaryW,28,800,2),body:plan(section.text,summaryW,22,400,12)}));
 let summaryBottom=plot.y;for(const section of sections){section.y=summaryBottom;summaryBottom+=section.heading.height+18+section.body.height+36}
 const annotationDefs=[{value:m.upperLimit,color:red,key:'upper',name:'上界'},{value:m.referenceDifference,color:amber,key:'reference',name:'参考'},{value:m.lowerLimit,color:red,key:'lower',name:'下界'}].map(d=>({...d,plan:plan(`${d.name}\n${numericDisplay(d.value)}`,160,19,700,4),desired:y(d.value)}));
 const annotationHeight=Math.max(...annotationDefs.map(d=>d.plan.height)),annotationGap=annotationHeight+18;
 const annotations=labelTrack(annotationDefs,{top:plot.y+annotationHeight/2+6,bottom:plot.y+plot.h-annotationHeight/2-6,gap:annotationGap});
 const ruleY=Math.max(summaryBottom,xLabelY+xLabel.height)+42,noteY=ruleY+28,H=Math.ceil(noteY+note.height+50),s=visualPage(W,H,paper);
 const draw=(x,y,p,fill=ink,anchor='start',attrs={})=>drawVisualPlan(s,x,y,p,{fill,anchor,...attrs});
 draw(margin,titleY,title);draw(margin,subY,sub,muted);draw(margin,statusY,status,muted);draw(plot.x,yLabelY,yLabel,muted);
 for(const [i,tick] of xTicks.entries()){const xx=x(tick.value);stroke(s,[[xx,plot.y],[xx,plot.y+plot.h]],grid,1,{'data-role':'grid'});draw(xx,xTickY,xPlans[i],muted,'middle',{'data-agreement-x-tick':String(tick.value)})}
 for(const [i,tick] of yTicks.entries()){const yy=y(tick.value);stroke(s,[[plot.x,yy],[plot.x+plot.w,yy]],grid,1,{'data-role':'grid'});draw(plot.x-18,yy-yPlans[i].height/2,yPlans[i],muted,'end',{'data-agreement-y-tick':String(tick.value)})}
 stroke(s,[[plot.x,plot.y],[plot.x,plot.y+plot.h],[plot.x+plot.w,plot.y+plot.h]],ink,1.5);draw(plot.x+plot.w/2,xLabelY,xLabel,muted,'middle');
 for(const d of annotations){const yy=y(d.value),labelY=d.placed-d.plan.height/2;
  stroke(s,[[plot.x,yy],[plot.x+plot.w,yy]],d.color,d.key==='reference'?3:2,{'stroke-dasharray':d.key==='reference'?'':'10 8','data-agreement-line':d.key});
  // A displaced label gets a leader; the supplied line stays at its exact y.
  stroke(s,[[plot.x+plot.w,yy],[plot.x+plot.w+8,yy],[plot.x+plot.w+8,d.placed],[plot.x+plot.w+14,d.placed]],d.color,1.2,{'data-agreement-leader':d.key});
  draw(plot.x+plot.w+18,labelY,d.plan,d.color);
 }
 const points=m.pairs.map(p=>{const cx=x(p.mean),cy=y(p.difference);el('circle',{cx,cy,r:8,fill:accent,stroke:paper,'stroke-width':2.5,'data-agreement-point':p.id},s);return {id:p.id,x:cx,y:cy,mean:p.mean,difference:p.difference}});
 for(const section of sections){draw(summaryX,section.y,section.heading);draw(summaryX,section.y+section.heading.height+18,section.body,muted)}
 stroke(s,[[margin,ruleY],[W-margin,ruleY]],grid,1);draw(margin,noteY,note,muted);
 return visualFinish(s,{family:'agreement-plot',width:W,height:H,input,model:m,plot:{...plot,domain:m.domain},points,sourceTraceability:m.sourceTraceability,scope:m.scope});
}}}
