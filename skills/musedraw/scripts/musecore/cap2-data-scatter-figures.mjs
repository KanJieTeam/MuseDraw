import {el} from './svg.mjs';
import {visualPage,visualText,visualLines,visualFontBounds,measureVisual,visualFinish,stroke} from './visual-tools.mjs';
import {axisNumber,linearScale} from './quantitative.mjs';
import {cap2DataScatterModel} from './cap2-data-scatter-models.mjs';

export function cap2DataScatterFamilies(){
 function scatterEvidence(input){
  const m=cap2DataScatterModel(input),W=1800,margin=80,gap=90,panelW=(W-margin*2-gap)/2,ink='#23323F',muted='#596B76',red='#BE4C32',grid='#E3E9EC',paper='#FFFFFF';
  const plan=(content,width,size=20,weight=400,max=6)=>{
   const lines=visualLines(content,width,{size,weight,max}),bounds=lines.map(t=>visualFontBounds(t,size,'sans',weight)),ascent=Math.max(...bounds.map(b=>b.ascent)),descent=Math.max(...bounds.map(b=>b.descent)),step=Math.max(size*1.35,ascent+descent+5);
   return {lines,size,weight,ascent,descent,step,height:ascent+descent+(lines.length-1)*step};
  };
  const num=v=>v===null?'未定义':v!==0&&(Math.abs(v)<.001||Math.abs(v)>=1e6)?v.toExponential(3):(Object.is(v,-0)?0:v).toFixed(3),signed=v=>(v<0?' − ':' + ')+num(Math.abs(v));
  const title=plan(m.title,W-2*margin,44,800,3),subtitle=plan(m.subtitle,W-2*margin,23,400,4),legend=plan(m.fit?'红线：逐组计算的普通最小二乘直线；仅作描述。':'未绘制拟合线；所有给定观测保留。',W-2*margin-60,19,400,3),range=plan('共同范围：x ['+m.xScale.domain.map(axisNumber).join(', ')+']；y ['+m.yScale.domain.map(axisNumber).join(', ')+']。方差使用 n−1 分母。',W-2*margin,19,400,3);
  const titleY=50,subtitleY=titleY+title.height+18,legendY=subtitleY+subtitle.height+20,rangeY=legendY+legend.height+12,bodyY=rangeY+range.height+38;
  const xTicks=m.xScale.ticks.map(axisNumber),yTicks=m.yScale.ticks.map(axisNumber),tick=plan('0123456789−.',300,18,400,1),leftInset=Math.max(62,...yTicks.map(t=>measureVisual(t,18)+22)),plotW=panelW-leftInset-24;
  if(plotW<420)throw Error('Axis labels exceed the scatter panel reading budget; rescale the supplied units');
  const xLabel=plan(m.xLabel,plotW,20,400,3),yLabel=plan(m.yLabel,plotW,20,400,3);
  const prepared=m.groups.map(g=>{
   const stats=g.stats,summary=[`n = ${stats.n} · x 均值 ${num(stats.meanX)} · y 均值 ${num(stats.meanY)}`,`样本方差：x ${num(stats.varianceX)} · y ${num(stats.varianceY)} · r ${num(stats.correlation)}`,m.fit?(stats.slope===null?'普通最小二乘：x 无变异，拟合未定义':`普通最小二乘：y = ${num(stats.intercept)}${signed(stats.slope)}x`):'拟合：未请求'];
   const heading=plan(g.label,panelW,27,700,4),note=plan(g.note,panelW,21,400,6),summaries=summary.map(t=>plan(t,panelW,19,400,3));
   return {...g,heading,notePlan:note,summaries,headHeight:heading.height+12+note.height+18+summaries.reduce((h,p)=>h+p.height+7,0)};
  });
  const rows=[];let cursor=bodyY;
  for(let i=0;i<prepared.length;i+=2){const members=prepared.slice(i,i+2),header=Math.max(...members.map(g=>g.headHeight)),plotTop=cursor+header+24+yLabel.height+18,plotBottom=plotTop+310,axisTop=plotBottom+17,xLabelTop=axisTop+tick.height+14,bottom=xLabelTop+xLabel.height;rows.push({members,top:cursor,plotTop,plotBottom,axisTop,xLabelTop,bottom});cursor=bottom+50}
  const footer=plan(m.note,W-2*margin,20,400,10),footerY=cursor,H=Math.ceil(footerY+footer.height+48),svg=visualPage(W,H,paper),textPlans=[];
  function draw(x,y,p,fill=ink,anchor='start',role='text'){
   p.lines.forEach((t,i)=>{const baseline=y+p.ascent+i*p.step,node=visualText(svg,x,baseline,t,{size:p.size,weight:p.weight,fill,anchor});node.dataset.role=role;const width=measureVisual(t,p.size,'sans',p.weight),left=anchor==='middle'?x-width/2:anchor==='end'?x-width:x; textPlans.push({text:t,role,x:left,y:y+i*p.step,width,height:p.ascent+p.descent});});
  }
  draw(margin,titleY,title,ink);draw(margin,subtitleY,subtitle,muted);if(m.fit)stroke(svg,[[margin,legendY+legend.height/2],[margin+40,legendY+legend.height/2]],red,2.5);draw(margin+60,legendY,legend,muted);draw(margin,rangeY,range,muted);
  const panels=[];
  for(const row of rows)row.members.forEach((g,j)=>{
   const x=margin+j*(panelW+gap),left=x+leftInset,right=x+panelW-24,X=linearScale(m.xScale.domain,[left+8,right-8]),Y=linearScale(m.yScale.domain,[row.plotBottom-8,row.plotTop+8]);let y=row.top;
   draw(x,y,g.heading);y+=g.heading.height+12;draw(x,y,g.notePlan,muted);y+=g.notePlan.height+18;for(const p of g.summaries){draw(x,y,p,muted,'start','computed-summary');y+=p.height+7}
   draw(left,row.plotTop-yLabel.height-18,yLabel,muted);
   for(const [i,t]of m.yScale.ticks.entries()){const yy=Y(t);stroke(svg,[[left,yy],[right,yy]],grid,1,{'data-role':'background-grid'});const p=plan(yTicks[i],leftInset-15,18,400,1);draw(left-16,yy-p.height/2,p,muted,'end','axis-tick')}
   let previous=-Infinity;for(const [i,t]of m.xScale.ticks.entries()){const xx=X(t),p=plan(xTicks[i],plotW,18,400,1),width=measureVisual(xTicks[i],18);if(xx-width/2<previous+10)throw Error('Horizontal tick labels collide; rescale units or change the declared range');previous=xx+width/2;draw(xx,row.axisTop,p,muted,'middle','axis-tick')}
   draw(right,row.xLabelTop,xLabel,muted,'end');
   const clipId='cap2-data-scatter-clip-'+panels.length,defs=el('defs',{},svg),clip=el('clipPath',{id:clipId},defs);el('rect',{x:left,y:row.plotTop,width:right-left,height:row.plotBottom-row.plotTop},clip);const marks=el('g',{'clip-path':'url(#'+clipId+')'},svg);
   if(g.fitShown)stroke(marks,[[X(m.xScale.domain[0]),Y(g.stats.intercept+g.stats.slope*m.xScale.domain[0])],[X(m.xScale.domain[1]),Y(g.stats.intercept+g.stats.slope*m.xScale.domain[1])]],red,2.5,{'data-role':'least-squares-fit'});
   const points=g.points.map(p=>{const point={...p,cx:X(p.x),cy:Y(p.y)};el('circle',{cx:point.cx,cy:point.cy,r:6,fill:ink,'data-role':'observation'},marks);return point});
   panels.push({id:g.id,label:g.label,note:g.note,stats:g.stats,fitShown:g.fitShown,points,plot:{left,right,top:row.plotTop,bottom:row.plotBottom,xRange:[left+8,right-8],yRange:[row.plotBottom-8,row.plotTop+8]}});
  });
  draw(margin,footerY,footer,muted,'start','caller-note');
  return visualFinish(svg,{family:'scatter-evidence',width:W,height:H,groups:panels,xDomain:m.xScale.domain,yDomain:m.yScale.domain,varianceConvention:m.varianceConvention,interpretation:m.interpretation,note:m.note,textPlans,compositionReference:'d08-ansikumu',aestheticApproval:'not-assessed'});
 }
 return {'scatter-evidence':scatterEvidence};
}
