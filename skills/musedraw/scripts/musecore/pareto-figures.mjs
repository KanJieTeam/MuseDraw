import {el} from './svg.mjs';
import {visualPage,visualText,visualLines,visualHeadingPlan,visualBlock,visualFinish,measureVisual,visualFontBounds,stroke} from './visual-tools.mjs';
import {paretoAnalysisModel} from './pareto-models.mjs';

export function paretoAnalysisFigure(input){
 const m=paretoAnalysisModel(input),W=1900,margin=86,ink='#17232A',muted='#65737A',grid='#D6DDDA',bar='#3D7180',line='#B24D3B',paper='#FAFBF8',amber='#C58B34';
 const head=visualHeadingPlan(m.title,m.subtitle,{top:54,width:W-margin*2,size:54,max:3}),status=visualLines(m.dataStatus,W-margin*2,{size:23,max:3}),note=visualLines(m.note,W-margin*2,{size:22,max:5});
 const plot={x:180,y:head.bottom+190,w:1170,h:580},rightX=plot.x+plot.w+80,rightW=W-rightX-margin,axisTop=plot.y,axisBottom=plot.y+plot.h;
 const max=Math.max(...m.items.map(x=>x.value),1),x=i=>plot.x+(i+.5)*plot.w/m.items.length,y=v=>axisBottom-v/max*plot.h,y2=v=>axisBottom-v*plot.h,targetY=y2(m.targetShare),headingY=head.bottom+32;
 const H=axisBottom+250+note.length*34,s=visualPage(W,H,paper);
 visualBlock(s,margin,54,head.titleLines,{size:54,weight:800,fill:ink,leading:1.25});visualBlock(s,margin,54+head.h+14,head.sub,{size:23,fill:muted,leading:1.3});visualBlock(s,margin,headingY,status,{size:23,fill:muted,leading:1.3});
 for(let i=0;i<=4;i++){const yy=axisBottom-plot.h*i/4;stroke(s,[[plot.x,yy],[plot.x+plot.w,yy]],grid,1,{'data-role':'grid'});visualText(s,plot.x-22,yy+7,String(Math.round(max*i/4)),{size:20,anchor:'end',fill:muted})}
 stroke(s,[[plot.x,axisTop],[plot.x,axisBottom],[plot.x+plot.w,axisBottom]],ink,2);stroke(s,[[plot.x+plot.w+18,axisTop],[plot.x+plot.w+18,axisBottom]],grid,1);
 visualText(s,plot.x-92,axisTop-24,m.valueLabel,{size:22,weight:700,fill:muted,anchor:'middle',transform:`rotate(-90 ${plot.x-92} ${axisTop-24})`});visualText(s,plot.x+plot.w+95,axisTop-24,'累计占比',{size:22,weight:700,fill:muted,anchor:'middle',transform:`rotate(-90 ${plot.x+plot.w+95} ${axisTop-24})`});
 for(let i=0;i<=4;i++){const yy=axisBottom-plot.h*i/4;visualText(s,plot.x+plot.w+30,yy+7,Math.round(i*25)+'%',{size:19,fill:muted})}
 stroke(s,[[plot.x, targetY],[plot.x+plot.w,targetY]],amber,2,{'stroke-dasharray':'10 8','data-pareto-target':'true'});visualText(s,plot.x+plot.w-4,targetY-13,`${Math.round(m.targetShare*100)}% 参考线`,{size:20,anchor:'end',fill:amber});
 const points=[];for(const row of m.items){const cx=x(row.index),barH=axisBottom-y(row.value),bw=Math.min(108,plot.w/m.items.length*.62);el('rect',{x:cx-bw/2,y:y(row.value),width:bw,height:barH,fill:bar,'data-pareto-bar':row.id,'data-value':row.value},s);visualText(s,cx,y(row.value)-12,String(row.value),{size:20,anchor:'middle',fill:ink});const py=y2(row.cumulative);points.push([cx,py]);visualText(s,cx,axisBottom+42, row.label,{size:18,anchor:'middle',fill:ink,transform:`rotate(-28 ${cx} ${axisBottom+42})`});}
 stroke(s,points,line,4,{'fill':'none','data-pareto-line':'true'});points.forEach(([cx,py],i)=>el('circle',{cx,cy:py,r:7,fill:paper,stroke:line,'stroke-width':3,'data-pareto-point':m.items[i].id},s));
 visualText(s,rightX,plot.y+26,'读法',{size:28,weight:800,fill:ink});visualBlock(s,rightX,plot.y+78,visualLines('柱：每个类别的输入值\n折线：从左到右的累计占比\n参考线：本页选择的累计份额',{size:23,max:5}),{size:23,fill:muted,leading:1.45});
 visualText(s,rightX,plot.y+260,'累计到达',{size:28,weight:800,fill:ink});const cross=m.crossing===null?'未达到参考线':`${m.items[m.crossing].label} 后达到 ${Math.round(m.items[m.crossing].cumulative*100)}%`;visualBlock(s,rightX,plot.y+315,visualLines(cross,rightW,{size:24,max:3,weight:700}),{size:24,weight:700,fill:line,leading:1.35});
 visualBlock(s,margin,axisBottom+150,visualLines(`总计 ${m.total} ${m.unit} · ${m.items.length} 个已登记类别`,W-margin*2,{size:22,max:2}),{size:22,fill:muted,leading:1.35});stroke(s,[[margin,H-note.length*34-45],[W-margin,H-note.length*34-45]],grid,1);visualBlock(s,margin,H-note.length*34-20,note,{size:22,fill:muted,leading:1.35});
 return visualFinish(s,{family:'pareto-analysis',width:W,height:H,input,model:m,plot:{...plot,targetShare:m.targetShare,targetY},bars:m.items.map(row=>({id:row.id,value:row.value,cumulative:row.cumulative})),sourceTraceability:m.sourceTraceability,scope:m.scope});
}
export function paretoAnalysisFamilies(){return {'pareto-analysis':paretoAnalysisFigure};}
