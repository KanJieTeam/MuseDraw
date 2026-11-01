import {el} from './svg.mjs';
import {visualPage,visualText,visualLines,visualHeadingPlan,visualBlock,visualFinish,stroke} from './visual-tools.mjs';
import {forestPlotModel} from './forest-plot-models.mjs';

export function forestPlotFamilies(){
 return {'forest-plot':b=>{
  const r=forestPlotModel(b),ink='#1D2A33',muted='#617079',grid='#D8E0DE',accent='#2A6874',amber='#B47A2C',W=2200,margin=110;
  const head=visualHeadingPlan(r.title,r.subtitle,{top:52,width:1980,size:54,max:3}),status=visualLines(r.dataStatus,1980,{size:24,max:3}),note=visualLines(r.note,1980,{size:22,max:6});
  const plot={x:650,y:head.bottom+190,w:1260,rowH:86},labelX=margin,plotTop=plot.y-40,plotBottom=plot.y+r.rows.length*plot.rowH+20;
  const x=v=>plot.x+(v-r.domain.min)/(r.domain.max-r.domain.min)*plot.w,refX=x(r.reference);
  const legendLines=visualLines('读法\n方块：输入的效应估计；横线：输入的区间端点；方块大小：仅在输入提供时表示相对权重。\n竖线：声明的参照值。区间没有被标成置信区间或预测区间。',1980,{size:22,max:6});
  const H=plotBottom+150+legendLines.length*31+note.length*33+130,s=visualPage(W,H,'#F8FAF8');
  visualBlock(s,margin,54,head.titleLines,{size:54,weight:800,fill:ink,leading:1.25});visualBlock(s,margin,54+head.h+14,head.sub,{size:22,fill:muted,leading:1.3});visualBlock(s,margin,head.bottom+34,status,{size:24,fill:muted,leading:1.3});
  visualText(s,labelX,plotTop-26,'比较项',{size:24,weight:750,fill:ink});visualText(s,plot.x,plotTop-26,b.intervalLabel,{size:24,weight:750,fill:ink});
  for(let i=0;i<=4;i++){const xx=plot.x+plot.w*i/4;stroke(s,[[xx,plotTop],[xx,plotBottom]],grid,1,{'data-role':'grid'});visualText(s,xx,plotBottom+40,Number((r.domain.min+(r.domain.max-r.domain.min)*i/4).toFixed(2)).toString(),{size:21,anchor:'middle',fill:muted})}
  stroke(s,[[refX,plotTop],[refX,plotBottom]],amber,3,{'stroke-dasharray':'11 9','data-reference-line':'true'});visualText(s,refX,plotTop-56,`参照 ${r.reference}`,{size:21,anchor:'middle',fill:amber});
  const marks=[];
  for(const row of r.rows){const cy=plot.y+row.index*plot.rowH+plot.rowH/2; if(row.index%2===0)el('rect',{x:margin-12,y:cy-plot.rowH/2,width:W-2*margin+24,height:plot.rowH,fill:'#F1F4F1'},s);visualText(s,labelX,cy+7,row.label,{size:24,fill:ink});const lo=x(row.low),hi=x(row.high),est=x(row.estimate);stroke(s,[[lo,cy],[hi,cy]],accent,6,{'data-forest-interval':row.id});stroke(s,[[lo,cy-13],[lo,cy+13]],accent,3);stroke(s,[[hi,cy-13],[hi,cy+13]],accent,3);const rr=10+18*row.weight/r.weightMax;el('rect',{x:est-rr,y:cy-rr,width:2*rr,height:2*rr,fill:accent,stroke:'#F8FAF8','stroke-width':3,'data-forest-estimate':row.id},s);visualText(s,plot.x+plot.w+30,cy+7,`${row.estimate.toFixed(2)}  [${row.low.toFixed(2)}, ${row.high.toFixed(2)}]`,{size:21,fill:ink});marks.push({id:row.id,label:row.label,low:lo,high:hi,estimate:est,y:cy,source:row.source});}
  visualText(s,plot.x+plot.w/2,plotBottom+88,`${r.xLabel} · ${r.unit}`,{size:24,anchor:'middle',fill:muted});
  visualBlock(s,margin,plotBottom+130,legendLines,{size:22,fill:muted,leading:1.35});
  stroke(s,[[margin,H-note.length*33-40],[W-margin,H-note.length*33-40]],'#B7C2BE',1);visualBlock(s,margin,H-note.length*33-15,note,{size:22,fill:muted,leading:1.35});
  return visualFinish(s,{family:'forest-plot',width:W,height:H,input:b,model:r,plot:{...plot,domain:r.domain,referenceX:refX},marks,sourceTraceability:r.sourceTraceability});
 }};
}
