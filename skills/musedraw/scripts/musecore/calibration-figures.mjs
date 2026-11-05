import {el} from './svg.mjs';
import {visualPage,visualFinish,stroke,measuredVisualPlan,drawVisualPlan} from './visual-tools.mjs';
import {calibrationPlotModel} from './calibration-models.mjs';
export function calibrationPlotFamilies(){return {'calibration-plot':input=>{
 const m=calibrationPlotModel(input),W=2200,margin=110,ink='#203038',muted='#61757A',grid='#D8E1E1',paper='#FBFDFC',accent='#0C6973';
 const plan=(t,w,s=22,weight=400,max=6)=>measuredVisualPlan(t,w,{size:s,weight,max});
 const title=plan(m.title,W-2*margin,54,800,4),sub=plan(m.subtitle,W-2*margin,24,400,5),status=plan(`${m.dataStatus} · ${m.rows.length} 行 · 覆盖 ${m.covered}/${m.rows.length}（${(m.coverage*100).toFixed(1)}%）`,W-2*margin,22,400,3),note=plan(m.note,W-2*margin,22,400,8);
 const titleY=54,subY=titleY+title.height+20,statusY=subY+sub.height+18,plotTop=statusY+status.height+55,plot={x:margin+100,y:plotTop+50,w:1420,h:760},summaryX=1600,summaryW=W-summaryX-margin;
 const span=m.domain.max-m.domain.min,X=v=>plot.x+(v-m.domain.min)/span*plot.w,Y=v=>plot.y+plot.h-(v-m.domain.min)/span*plot.h;
 const ticks=Array.from({length:5},(_,i)=>m.domain.min+(m.domain.max-m.domain.min)*i/4),tickPlans=ticks.map(v=>plan(String(Number(v.toPrecision(4))),90,19,400,1));
 const xLabel=plan(`${m.xLabel} · ${m.unit}`,plot.w,24,700,2),yLabel=plan(`${m.yLabel} · ${m.unit}`,plot.h,24,700,2),xTickY=plot.y+plot.h+22,xHeight=Math.max(...tickPlans.map(p=>p.height)),xLabelY=xTickY+xHeight+24;
 const sections=[{h:plan('条件摘要',summaryW,28,800,2),b:plan(m.byCondition.map(c=>`${c.label} · n=${c.count} · 偏差 ${c.bias.toFixed(2)} · RMSE ${c.rmse.toFixed(2)} · 覆盖 ${(c.coverage*100).toFixed(0)}%`).join('\n'),summaryW,21,400,10)},{h:plan('读法',summaryW,28,800,2),b:plan('点：观测–预测配对。\n竖线：给定预测区间。\n虚线：理想校准 y=x。',summaryW,21,400,8)},{h:plan('边界',summaryW,28,800,2),b:plan('覆盖率只针对这些输入行；不能外推到未采样人群，也不表示因果关系。',summaryW,21,400,8)}];let sy=plotTop;for(const q of sections){q.y=sy;sy+=q.h.height+16+q.b.height+30}
 const ruleY=Math.max(xLabelY+xLabel.height,sy)+40,noteY=ruleY+26,H=Math.ceil(noteY+note.height+50),s=visualPage(W,H,paper),draw=(x,y,p,fill=ink,anchor='start',attrs={})=>drawVisualPlan(s,x,y,p,{fill,anchor,...attrs});
 draw(margin,titleY,title);draw(margin,subY,sub,muted);draw(margin,statusY,status,muted);draw(plot.x,plotTop,xLabel,ink);
 for(let i=0;i<ticks.length;i++){const v=ticks[i],xx=X(v),yy=Y(v);stroke(s,[[xx,plot.y],[xx,plot.y+plot.h]],grid,1,{'data-role':'grid'});stroke(s,[[plot.x,yy],[plot.x+plot.w,yy]],grid,1,{'data-role':'grid'});draw(xx,xTickY,tickPlans[i],muted,'middle',{'data-calibration-tick':String(v)});draw(plot.x-18,yy-tickPlans[i].height/2,tickPlans[i],muted,'end',{'data-calibration-y-tick':String(v)})}
 stroke(s,[[plot.x,plot.y],[plot.x,plot.y+plot.h],[plot.x+plot.w,plot.y+plot.h]],ink,1.5);stroke(s,[[X(m.domain.min),Y(m.domain.min)],[X(m.domain.max),Y(m.domain.max)]],muted,2,{'stroke-dasharray':'10 8','data-calibration-reference':'identity'});
 draw(plot.x+plot.w/2,xLabelY,xLabel,muted,'middle');
 const marks=m.rows.map(r=>{const x=X(r.observed),y=Y(r.predicted),lo=Y(r.low),hi=Y(r.high),color=m.conditions[r.conditionIndex].color;stroke(s,[[x,lo],[x,hi]],color,3,{'data-calibration-interval':r.id});el('circle',{cx:x,cy:y,r:8,fill:color,stroke:paper,'stroke-width':2,'data-calibration-point':r.id,'data-calibration-condition':r.condition},s);return {id:r.id,x,y,low:lo,high:hi,color}});
 for(const q of sections){draw(summaryX,q.y,q.h);draw(summaryX,q.y+q.h.height+16,q.b,muted)}
 stroke(s,[[margin,ruleY],[W-margin,ruleY]],grid,1);draw(margin,noteY,note,muted);
 return visualFinish(s,{family:'calibration-plot',width:W,height:H,input,model:m,plot,marks,scope:m.scope,readingOrder:['title','status','plot','condition-summary','note']});
}}}
