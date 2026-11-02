import {el} from './svg.mjs';
import {visualPage,visualText,visualLines,visualHeadingPlan,visualBlock,visualFinish,stroke,measureVisual,visualFontBounds} from './visual-tools.mjs';
import {trendBandModel} from './trend-band-models.mjs';

export function trendBandFigure(input){
 const m=trendBandModel(input),W=1800,margin=92,ink='#19252A',muted='#65757A',grid='#D6DFDD',paper='#FAFBF7',band='#DCEAE4',bandEdge='#8AAEA2';
 const head=visualHeadingPlan(m.title,m.subtitle,{top:50,width:1616,size:52,max:3}),status=visualLines(m.dataStatus,1616,{size:22,max:3}),note=visualLines(m.note,1616,{size:21,max:5});
 const chart={x:150,y:head.bottom+180,w:1190,h:610},legend={x:chart.x+chart.w+76,y:chart.y+30,w:W-(chart.x+chart.w+76)-margin};
 const H=chart.y+chart.h+note.length*32+220,s=visualPage(W,H,paper),textPlans=[];
 const plan=(text,width,size,weight=400,max=2)=>{const lines=visualLines(text,width,{size,weight,max}),bounds=lines.map(l=>visualFontBounds(l,size,'sans',weight)),ascent=Math.max(...bounds.map(b=>b.ascent)),descent=Math.max(...bounds.map(b=>b.descent)),step=Math.max(size*1.25,ascent+descent+4);return {lines,size,weight,ascent,descent,step,height:ascent+descent+(lines.length-1)*step}};
 const draw=(g,x,y,p,fill=ink,anchor='start')=>p.lines.forEach((line,i)=>{visualText(g,x,y+p.ascent+i*p.step,line,{size:p.size,weight:p.weight,fill,anchor});const w=measureVisual(line,p.size,'sans',p.weight),b=visualFontBounds(line,p.size,'sans',p.weight),shift=anchor==='middle'?-w/2:anchor==='end'?-w:0;textPlans.push({text:line,x:x+shift-1,y:y+i*p.step,width:w+2,height:b.ascent+b.descent+2})});
 visualBlock(s,margin,50,head.titleLines,{size:52,weight:800,fill:ink,leading:1.24});visualBlock(s,margin,50+head.h+14,head.sub,{size:22,fill:muted,leading:1.3});visualBlock(s,margin,head.bottom+34,status,{size:22,fill:muted,leading:1.3});
 const min=m.domain.min,max=m.domain.max,inner={x:chart.x+82,y:chart.y+56,w:chart.w-118,h:chart.h-138};
 const X=i=>inner.x+(inner.w*i/(m.periods.length-1)),Y=v=>inner.y+inner.h-(v-min)/(max-min)*inner.h;
 const tickCount=5,ticks=Array.from({length:tickCount},(_,i)=>min+(max-min)*(tickCount-1-i)/(tickCount-1));
 el('rect',{x:chart.x,y:chart.y,width:chart.w,height:chart.h,fill:'#F2F5F1',stroke:'#BAC8C4','stroke-width':1.2,'data-trend-panel':'true'},s);
 for(const v of ticks){const y=Y(v);stroke(s,[[inner.x,y],[inner.x+inner.w,y]],grid,1,{'data-role':'grid'});draw(s,inner.x-18,y-6,plan(Number(v).toFixed(Math.abs(v)>=100?0:1),66,17,400,1),muted,'end')}
 stroke(s,[[inner.x,inner.y],[inner.x,inner.y+inner.h],[inner.x+inner.w,inner.y+inner.h]],ink,2);
 if(m.target){const top=Math.max(inner.y,Math.min(inner.y+inner.h,Y(m.target.max))),bottom=Math.max(inner.y,Math.min(inner.y+inner.h,Y(m.target.min)));el('rect',{x:inner.x,y:top,width:inner.w,height:Math.max(0,bottom-top),fill:band,'data-trend-target-band':'true'},s);stroke(s,[[inner.x,top],[inner.x+inner.w,top],[inner.x+inner.w,bottom],[inner.x,bottom]],bandEdge,1,{'stroke-dasharray':'5 6','data-role':'target-edge'})}
 const xLabels=[];m.periods.forEach((label,i)=>{const p=plan(label,Math.max(44,inner.w/(m.periods.length-1)-14),17,400,2),x=X(i);draw(s,x,inner.y+inner.h+30,p,muted,'middle');xLabels.push({label,x,y:inner.y+inner.h+30,width:Math.max(...p.lines.map(t=>measureVisual(t,p.size,'sans',p.weight))),height:p.height})});
 const lines=[];for(const series of m.series){const pts=series.values.map((v,i)=>[X(i),Y(v)]);stroke(s,pts,series.color,4,{'stroke-linecap':'round','stroke-linejoin':'round','data-trend-series':series.id});const points=[];pts.forEach(([x,y],i)=>{el('circle',{cx:x,cy:y,r:6.5,fill:paper,stroke:series.color,'stroke-width':3,'data-trend-point':`${series.id}:${i}`},s);points.push({period:m.periods[i],value:series.values[i],x,y})});lines.push({id:series.id,label:series.label,color:series.color,points})}
 visualText(s,inner.x+inner.w/2,inner.y+inner.h+92,'登记时段',{size:18,fill:muted,anchor:'middle'});const yTitleX=chart.x-36;visualText(s,yTitleX,inner.y+inner.h/2,'数量',{size:18,fill:muted,anchor:'middle',transform:`rotate(-90 ${yTitleX} ${inner.y+inner.h/2})`});
 draw(s,legend.x,legend.y,plan('序列与读法',legend.w,25,800,1),ink);let ly=legend.y+66;for(const series of m.series){el('line',{x1:legend.x,y1:ly-7,x2:legend.x+32,y2:ly-7,stroke:series.color,'stroke-width':4,'stroke-linecap':'round'},s);draw(s,legend.x+48,ly,plan(series.label,legend.w-48,20,700,2),ink);ly+=56}
 if(m.target){draw(s,legend.x,ly+12,plan(`目标带：${m.target.label}`,legend.w,19,700,1),bandEdge);ly+=42;} const summary=plan(`${m.series.length} 条序列 · ${m.periods.length} 个时段`,legend.w,19,400,2);draw(s,legend.x,ly+12,summary,muted);const scope=plan('线段只连接已提供的期点；颜色区分序列，不代表级别。',legend.w,18,400,4);draw(s,legend.x,ly+72,scope,muted);
 const ruleY=H-note.length*32-72;stroke(s,[[margin,ruleY],[W-margin,ruleY]],'#B8C5C0',1);visualBlock(s,margin,ruleY+28,note,{size:21,fill:muted,leading:1.35});
 return visualFinish(s,{family:'trend-band',width:W,height:H,input,model:m,plot:{...inner,xDomain:m.periods,yDomain:[min,max]},target:m.target,lines,xLabels,textPlans,scope:m.scope,readingOrder:['title','status','plot','legend','note']});
}
export function trendBandFamilies(){return {'trend-band':trendBandFigure};}
