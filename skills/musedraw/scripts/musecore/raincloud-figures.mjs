import {el} from './svg.mjs';
import {visualPage,visualText,visualLines,visualHeadingPlan,visualBlock,visualFinish,stroke} from './visual-tools.mjs';
import {raincloudModel} from './raincloud-models.mjs';

export function raincloudFamilies(){return {'raincloud':input=>{
 const m=raincloudModel(input),W=2200,margin=100,ink='#1D2A33',muted='#637176',grid='#D7DFDC',paper='#F8FAF8',palette=['#356F78','#A55B65','#B4883A','#586F9B','#697C55','#8A5D8D'];
 const head=visualHeadingPlan(m.title,m.subtitle,{top:54,width:2000,size:54,max:3}),status=visualLines(m.dataStatus,2000,{size:23,max:3}),note=visualLines(m.note,2000,{size:22,max:6});
 const plot={x:390,y:head.bottom+175,w:1260,rowH:145},axisY=plot.y+plot.rowH*m.groups.length+22,summaryX=plot.x+plot.w+72,summaryW=W-summaryX-margin;
 const x=v=>plot.x+(v-m.domain.min)/(m.domain.max-m.domain.min)*plot.w,H=axisY+180+note.length*34+250,s=visualPage(W,H,paper);
 visualBlock(s,margin,54,head.titleLines,{size:54,weight:800,fill:ink,leading:1.25});visualBlock(s,margin,54+head.h+14,head.sub,{size:23,fill:muted,leading:1.3});visualBlock(s,margin,head.bottom+34,status,{size:23,fill:muted,leading:1.3});
 const axisTop=plot.y-24;for(let i=0;i<=5;i++){const xx=plot.x+plot.w*i/5;stroke(s,[[xx,axisTop],[xx,axisY]],grid,1,{'data-role':'grid'});visualText(s,xx,axisY+38,(m.domain.min+(m.domain.max-m.domain.min)*i/5).toFixed(1),{size:20,anchor:'middle',fill:muted})}stroke(s,[[plot.x,axisY],[plot.x+plot.w,axisY]],ink,2);visualText(s,plot.x+plot.w/2,axisY+80,`${m.valueLabel} · ${m.unit}`,{size:23,anchor:'middle',fill:muted});
 const rows=[];for(const g of m.groups){const base=plot.y+g.index*plot.rowH+plot.rowH*.62,color=palette[g.index%palette.length],densMax=Math.max(...g.densityPoints.map(p=>p.density)),cloud=g.densityPoints.map(p=>[x(p.x),base-54*p.density/densMax]);const polygon=[[x(g.min),base],...cloud,[x(g.max),base]];el('polygon',{points:polygon.map(p=>p.join(',')).join(' '),fill:color,opacity:'.22','data-raincloud-density':g.id},s);stroke(s,cloud,color,3,{'data-raincloud-density-line':g.id});
   visualText(s,margin,base+7,g.label,{size:27,weight:750,fill:ink});stroke(s,[[x(g.min),base+42],[x(g.max),base+42]],color,3,{'data-raincloud-whisker':g.id});stroke(s,[[x(g.min),base+34],[x(g.min),base+50]],color,3);stroke(s,[[x(g.max),base+34],[x(g.max),base+50]],color,3);el('rect',{x:x(g.q1),y:base+29,width:Math.max(4,x(g.q3)-x(g.q1)),height:26,fill:paper,stroke:color,'stroke-width':3,'data-raincloud-box':g.id},s);stroke(s,[[x(g.median),base+27],[x(g.median),base+57]],color,4,{'data-raincloud-median':g.id});
   const dots=[];g.values.forEach((v,i)=>{const yy=base+70+((i*37)%17)-8;el('circle',{cx:x(v),cy:yy,r:5,fill:color,opacity:'.8','data-raincloud-point':g.id},s);dots.push({x:x(v),y:yy,value:v})});rows.push({id:g.id,label:g.label,n:g.n,min:g.min,q1:g.q1,median:g.median,q3:g.q3,max:g.max,points:dots});
 }
 visualText(s,summaryX,plot.y+26,'摘要',{size:30,weight:800,fill:ink});let sy=plot.y+78;for(const g of m.groups){visualBlock(s,summaryX,sy,visualLines(`${g.label}  n=${g.n}\n中位数 ${g.median.toFixed(2)} · IQR ${g.q1.toFixed(2)}–${g.q3.toFixed(2)}`,summaryW,{size:21,max:3,weight:650}),{size:21,weight:650,fill:ink,leading:1.35});sy+=82}
 visualText(s,summaryX,sy+8,'读法',{size:30,weight:800,fill:ink});visualBlock(s,summaryX,sy+62,visualLines('云形：固定核宽度的形状摘要\n箱体：四分位区间与中位数\n散点：每个输入观测，未删去离群值',summaryW,{size:21,max:6}),{size:21,fill:muted,leading:1.4});
 stroke(s,[[margin,H-note.length*34-48],[W-margin,H-note.length*34-48]],'#B8C5C0',1);visualBlock(s,margin,H-note.length*34-22,note,{size:22,fill:muted,leading:1.35});return visualFinish(s,{family:'raincloud',width:W,height:H,input,model:m,plot:{...plot,axisY},rows,sourceTraceability:m.sourceTraceability,scope:m.scope});
}}}
