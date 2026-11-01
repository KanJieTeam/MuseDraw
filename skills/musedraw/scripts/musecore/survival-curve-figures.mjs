import {el} from './svg.mjs';
import {measureVisual,visualPage,visualText,visualLines,visualHeadingPlan,visualBlock,visualFinish,stroke} from './visual-tools.mjs';
import {survivalCurveModel} from './survival-curve-models.mjs';
export function survivalCurveFamilies(h){
 function curve(b){
  const r=survivalCurveModel(b),ink='#183657',muted='#596F82',grid='#DCE5EF',red='#B64A3A',W=2200,margin=90,heading=visualHeadingPlan(r.title,r.subtitle,{top:52,width:1720,size:54,max:3}),bodyTop=heading.bottom+42,plotLeft=180,plotRight=1200,plotTop=bodyTop+74,plotBottom=plotTop+560,summaryX=1260,summaryW=560,plotW=plotRight-plotLeft,x=t=>plotLeft+t/r.maxTime*plotW,y=v=>plotBottom-v* (plotBottom-plotTop),titleY=bodyTop,axisLabel=visualLines(`${r.unit} · 时间`,240,{size:23,max:2}),status=visualLines(r.dataStatus,560,{size:24,max:3}),tickLabels=r.ticks.map(t=>String(Number(t.toFixed(2)))),summaryPlans=r.groups.map(g=>({g,title:visualLines(g.label,420,{size:22,weight:700,max:3}),detail:visualLines(`n=${g.n} · 事件 ${g.events} · 截尾 ${g.censored}\n中位时间 ${g.median===null?'未达到':Number(g.median.toFixed(2))+' '+r.unit}\n末次生存 ${Number((g.survivalAtEnd*100).toFixed(1))}%`,summaryW,{size:23,max:5})}));
  const riskTitleY=plotBottom+92,riskRowY=riskTitleY+54,riskBottom=riskRowY+r.groups.length*50+44,noteLines=visualLines(r.note,1720,{size:23,max:4}),noteY=riskBottom+36,H=noteY+noteLines.length*33+58,s=visualPage(W,H,'#FFFFFF');
  visualBlock(s,90,52,heading.titleLines,{size:54,weight:800,fill:ink,leading:1.3});visualBlock(s,90,52+heading.h+14,heading.sub,{size:22,fill:muted,leading:1.3});visualBlock(s,plotLeft,titleY,status,{size:24,fill:muted,leading:1.3});
  for(let i=0;i<=4;i++){const yy=plotTop+(plotBottom-plotTop)*i/4;stroke(s,[[plotLeft,yy],[plotRight,yy]],grid,1,{'data-role':'background-grid'});visualText(s,plotLeft-18,yy+7,`${100-i*25}%`,{size:22,anchor:'end',fill:muted});const xx=plotLeft+plotW*i/4;stroke(s,[[xx,plotTop],[xx,plotBottom]],grid,1,{'data-role':'background-grid'});visualText(s,xx,plotBottom+33,tickLabels[i],{size:22,anchor:'middle',fill:muted})}
  stroke(s,[[plotLeft,plotTop],[plotLeft,plotBottom],[plotRight,plotBottom]],ink,2);visualText(s,plotRight,plotBottom+68,axisLabel[0],{size:23,anchor:'end',fill:muted});visualText(s,plotLeft,plotTop-6,'事件未发生的比例',{size:23,fill:muted});
  for(const g of r.groups){let d='M '+x(0)+' '+y(1),prev={time:0,survival:1};for(const p of g.steps.slice(1)){d+=` L ${x(p.time)} ${y(prev.survival)} L ${x(p.time)} ${y(p.survival)}`;prev=p}d+=` L ${x(g.maxTime)} ${y(prev.survival)}`;el('path',{d,fill:'none',stroke:g.color,'stroke-width':5,'stroke-linejoin':'round','data-survival-curve':g.id},s);for(const rec of g.records.filter(q=>!q.event)){const p=g.steps.find(q=>q.time===rec.time)||g.steps.at(-1);const xx=x(rec.time),yy=y(p.survival);stroke(s,[[xx-7,yy-7],[xx+7,yy+7]],g.color,2);stroke(s,[[xx+7,yy-7],[xx-7,yy+7]],g.color,2)} }
  visualText(s,summaryX,bodyTop+34,'队列摘要',{size:30,weight:800,fill:ink});let sy=bodyTop+82;for(const p of summaryPlans){el('rect',{x:summaryX,y:sy-27,width:18,height:18,fill:p.g.color},s);visualBlock(s,summaryX+30,sy,p.title,{size:22,weight:700,fill:ink,leading:1.2});sy+=p.title.length*32+9;visualBlock(s,summaryX+30,sy,p.detail,{size:23,fill:muted,leading:1.3});sy+=p.detail.length*30+34}
  visualText(s,plotLeft,riskTitleY,'仍在观察的记录（到达时间点时）',{size:26,weight:700,fill:ink});for(let i=0;i<r.ticks.length;i++){const xx=plotLeft+plotW*i/4;visualText(s,xx,riskRowY-18,tickLabels[i],{size:21,anchor:'middle',fill:muted})}r.groups.forEach((g,j)=>{const yy=riskRowY+j*50,riskLabel=visualLines(g.label,170,{size:20,max:2});visualBlock(s,plotLeft-18,yy-26,riskLabel,{size:20,anchor:'end',fill:ink,leading:1.2});for(let i=0;i<g.risk.length;i++)(()=>{const n=visualText(s,plotLeft+plotW*i/4,yy+8,String(g.risk[i]),{size:23,anchor:'middle',weight:700,fill:g.color});n.dataset.riskGroup=g.id})()});stroke(s,[[90,noteY-18],[1810,noteY-18]],'#B8C4CF',1);visualBlock(s,90,noteY,noteLines,{size:23,fill:muted,leading:1.3});return visualFinish(s,{family:'survival-curve',width:W,height:H,input:b,model:r,plot:{left:plotLeft,right:plotRight,top:plotTop,bottom:plotBottom,maxTime:r.maxTime},risk:{top:riskRowY,rows:r.groups.length},curves:r.groups.map(g=>({id:g.id,events:g.events,censored:g.censored,median:g.median}))});
 }
 return {'survival-curve':curve};
}






