import {el} from './svg.mjs';
import {visualPage,visualFinish,stroke,measuredVisualPlan,drawVisualPlan} from './visual-tools.mjs';
import {distinctNumericTicks,numericDisplay} from './quantitative.mjs';
import {raincloudModel} from './raincloud-models.mjs';

export function raincloudFamilies(){return {'raincloud':input=>{
 const m=raincloudModel(input),W=2200,margin=100,ink='#1D2A33',muted='#637176',grid='#D7DFDC',paper='#FFFFFF',palette=['#356F78','#A55B65','#B4883A','#586F9B','#697C55','#8A5D8D'];
 const plan=(text,width,size=22,weight=400,max=6)=>measuredVisualPlan(text,width,{size,weight,max});
 const title=plan(m.title,2000,54,800,5),sub=plan(m.subtitle,2000,23),status=plan(m.dataStatus,2000,22),note=plan(m.note,2000,22,400,12);
 const titleY=54,subY=titleY+title.height+22,statusY=subY+sub.height+20;
 const plot={x:440,y:statusY+status.height+55,w:1210},summaryX=1740,summaryW=W-summaryX-margin;
 const labelPlans=m.groups.map((g,i)=>plan(`${i+1}. ${g.label}`,260,25,700,8));
 const summaryPlans=m.groups.map((g,i)=>plan(`${i+1}. n = ${g.n}\n中位数 ${numericDisplay(g.median)}\nIQR ${numericDisplay(g.q1)} – ${numericDisplay(g.q3)}`,summaryW,21,400,10));
 const rowHeights=m.groups.map((g,i)=>Math.max(185,labelPlans[i].height+32,summaryPlans[i].height+32));
 const rowTops=[];let bottom=plot.y;for(const h of rowHeights){rowTops.push(bottom);bottom+=h}
 const axisY=bottom+22,x=v=>plot.x+(v-m.domain.min)/(m.domain.max-m.domain.min)*plot.w;
 const ticks=distinctNumericTicks(m.domain.min,m.domain.max),tickPlans=ticks.map(t=>plan(t.label,plot.w/5-16,20,400,2)),tickY=axisY+18;
 const axisLabel=plan(`${m.valueLabel} · ${m.unit}`,plot.w,23,400,5),axisLabelY=tickY+Math.max(...tickPlans.map(p=>p.height))+24;
 const reading=plan('云形：核密度形状摘要\n箱体：四分位区间与中位数\n散点：全部输入观测\n点的上下错位不表示另一变量',summaryW,21,400,10),readingY=axisY+20;
 const ruleY=Math.max(axisLabelY+axisLabel.height,readingY+reading.height)+42,noteY=ruleY+28,H=Math.ceil(noteY+note.height+50),s=visualPage(W,H,paper);
 const draw=(x,y,p,fill=ink,anchor='start',attrs={})=>drawVisualPlan(s,x,y,p,{fill,anchor,...attrs});
 draw(margin,titleY,title);draw(margin,subY,sub,muted);draw(margin,statusY,status,muted);
 for(const [i,tick] of ticks.entries()){const xx=x(tick.value);stroke(s,[[xx,plot.y],[xx,axisY]],grid,1,{'data-role':'grid'});draw(xx,tickY,tickPlans[i],muted,'middle',{'data-raincloud-tick':String(tick.value)})}
 stroke(s,[[plot.x,axisY],[plot.x+plot.w,axisY]],ink,1.5);draw(plot.x+plot.w/2,axisLabelY,axisLabel,muted,'middle');
 const rows=[];for(const g of m.groups){const top=rowTops[g.index],base=top+62,color=palette[g.index%palette.length],densMax=Math.max(...g.densityPoints.map(p=>p.density)),cloud=g.densityPoints.map(p=>[x(p.x),base-52*p.density/densMax]);
  el('polygon',{points:[[x(g.min),base],...cloud,[x(g.max),base]].map(p=>p.join(',')).join(' '),fill:color,opacity:'.22','data-raincloud-density':g.id},s);stroke(s,cloud,color,3,{'data-raincloud-density-line':g.id});
  draw(margin,top+14,labelPlans[g.index]);draw(summaryX,top+14,summaryPlans[g.index],muted);
  stroke(s,[[x(g.min),base+42],[x(g.max),base+42]],color,3,{'data-raincloud-whisker':g.id});
  for(const value of [g.min,g.max])stroke(s,[[x(value),base+34],[x(value),base+50]],color,3);
  el('rect',{x:x(g.q1),y:base+29,width:x(g.q3)-x(g.q1),height:26,fill:paper,stroke:color,'stroke-width':3,'data-raincloud-box':g.id},s);
  stroke(s,[[x(g.median),base+27],[x(g.median),base+57]],color,4,{'data-raincloud-median':g.id});
  const dots=g.values.map((value,i)=>{const yy=base+76+((i*37)%17)-8,cx=x(value);el('circle',{cx,cy:yy,r:5,fill:color,opacity:'.8','data-raincloud-point':g.id},s);return {x:cx,y:yy,value}});
  rows.push({id:g.id,label:g.label,n:g.n,min:g.min,q1:g.q1,median:g.median,q3:g.q3,max:g.max,points:dots});
 }
 draw(summaryX,readingY,reading,muted);stroke(s,[[margin,ruleY],[W-margin,ruleY]],grid,1);draw(margin,noteY,note,muted);
 return visualFinish(s,{family:'raincloud',width:W,height:H,input,model:m,plot:{...plot,axisY,rowHeights},rows,sourceTraceability:m.sourceTraceability,scope:m.scope});
}}}
