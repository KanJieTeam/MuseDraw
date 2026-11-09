import {el} from './svg.mjs';
import {visualPage,visualText,visualLines,visualFontBounds,measureVisual,visualFinish,stroke} from './visual-tools.mjs';
import {dashboardFocusModel} from './dashboard-focus-models.mjs';

const dashboardViewLabels={spatial:'空间分布',process:'阶段进展',trend:'趋势变化',comparison:'数值对照',inventory:'资产状态',summary:'摘要',record:'登记记录'};

function dashboardSupportPlan(p,width,plan,sizes){
 const rel=plan(dashboardViewLabels[p.relation],width,sizes.rel,700,2),title=plan(p.title,width,sizes.title,700,3),titleTop=16+rel.height+10,contentTop=titleTop+title.height+14;
 const rows=[];let bottom=contentTop;
 if(p.rows){for(const text of p.rows){const textPlan=plan(text,width-14,sizes.body,400,3);rows.push({plan:textPlan,top:bottom});bottom+=textPlan.height+10}}
 const unit=p.rows?null:plan(`${p.unit} · ${p.period}`,width,sizes.unit,400,3,'mono');
 if(unit)bottom+=unit.height+16+sizes.bar;
 return {rel,title,titleTop,contentTop,rows,unit,barHeight:sizes.bar,height:bottom+18};
}

const dashboardSpatialStates={normal:{label:'正常',color:'#65B8B1'},warning:{label:'告警',color:'#E8B052'},critical:{label:'严重',color:'#E56D63'},unknown:{label:'未知',color:'#AFB9C5'},offline:{label:'离线',color:'#AFB9C5'}};
function dashboardSpatialPlan(hero,width,plan,small){
 const size=small?11:15,caption=plan('归一化位置示意 · 非地理底图',width,size,400,2),axis=plan('x → / y ↓ · 0–100',width,size,400,2),labels=hero.points.map(p=>plan(p.label,Math.min(small?120:170,width*.55),small?12:17,700,3));
 const legend=[];let x=0,y=0,rowHeight=0;
 for(const [state,s]of Object.entries(dashboardSpatialStates)){const item=plan(`${state==='unknown'?'○':state==='offline'?'■':'●'} ${s.label}`,width,size,400,1),w=measureVisual(item.lines[0],size,'sans',400);if(x&&x+w>width){y+=rowHeight+6;x=0;rowHeight=0}legend.push({plan:item,x,y,color:s.color});x+=w+14;rowHeight=Math.max(rowHeight,item.height)}
 const legendHeight=y+rowHeight,left=measureVisual('100',size,'sans',400)+12,head=caption.height+8+legendHeight+18,tail=18+axis.height+Math.max(...labels.map(p=>p.ascent+p.descent))+8;
 return {size,caption,legend,axis,labels,left,head,tail,minHeight:head+tail+Math.max(small?160:250,Math.max(...labels.map(p=>p.height))*5)};
}
function drawDashboardSpatial(svg,hero,chart,p,draw,plan,{muted,line,ink}){
 draw(chart.x,chart.y,p.caption,{fill:muted});for(const item of p.legend)draw(chart.x+item.x,chart.y+p.caption.height+8+item.y,item.plan,{fill:item.color});
 const plot={x:chart.x+p.left,y:chart.y+p.head,w:chart.w-p.left-15,h:chart.h-p.head-p.tail};
 if(plot.h<120)throw Error('Spatial position plot needs more height');
 for(const tick of [0,50,100]){const x=plot.x+plot.w*tick/100,y=plot.y+plot.h*tick/100;stroke(svg,[[x,plot.y],[x,plot.y+plot.h]],line,1,{'data-role':'background-grid'});stroke(svg,[[plot.x,y],[plot.x+plot.w,y]],line,1,{'data-role':'background-grid'});const q=plan(String(tick),p.left-8,p.size,400,1);draw(plot.x-(p.size<15?15:18),y-q.height/2,q,{anchor:'end',fill:muted});draw(x,plot.y+plot.h+12,q,{anchor:'middle',fill:muted})}
 draw(chart.x,chart.y+chart.h-p.axis.height,p.axis,{fill:muted});
 const radius=p.size<15?7:10,points=hero.points.map(q=>({...q,px:plot.x+q.x/100*plot.w,py:plot.y+q.y/100*plot.h})),boxes=[],labels=[];
 const overlap=(a,b,pad=0)=>a.x<b.x+b.w+pad&&a.x+a.w>b.x-pad&&a.y<b.y+b.h+pad&&a.y+a.h>b.y-pad;
 for(let i=0;i<points.length;i++){
  const q=points[i],text=p.labels[i],w=Math.max(...text.lines.map(t=>measureVisual(t,text.size,text.role,text.weight)))+2,h=text.height+2;
  if(points.some((other,j)=>j<i&&Math.hypot(q.px-other.px,q.py-other.py)<radius*2+4))throw Error('Spatial markers overlap; split the view or provide a clustered representation');
  const clamp=(v,a,z)=>Math.max(a,Math.min(z,v)),cy=clamp(q.py-h/2,plot.y,plot.y+plot.h-h),cx=clamp(q.px-w/2,plot.x,plot.x+plot.w-w),candidates=[[q.px+radius+7,cy],[q.px-radius-7-w,cy],[cx,q.py-radius-7-h],[cx,q.py+radius+7]];
  let chosen;for(const [x,y]of candidates){const b={x,y,w,h};if(x<plot.x||x+w>plot.x+plot.w||y<plot.y||y+h>plot.y+plot.h)continue;if(boxes.some(box=>overlap(b,box,5)))continue;if(points.some(point=>overlap(b,{x:point.px-radius-3,y:point.py-radius-3,w:radius*2+6,h:radius*2+6})))continue;chosen=b;break}
  if(!chosen)throw Error('Spatial label cannot fit without overlap: '+q.label+'; split the view or use a list');
  boxes.push(chosen);labels.push({label:q.label,...chosen});draw(chosen.x,chosen.y,text,{fill:ink});
 }
 for(const q of points){const state=dashboardSpatialStates[q.status],common={'data-role':'hero-marker','data-spatial-label':q.label,'data-spatial-state':q.status,'data-normalized-x':q.x,'data-normalized-y':q.y,stroke:state.color,'stroke-width':2};let marker;
  if(q.status==='offline')marker=el('rect',{x:q.px-radius,y:q.py-radius,width:radius*2,height:radius*2,fill:state.color,...common},svg);
  else marker=el('circle',{cx:q.px,cy:q.py,r:radius,fill:q.status==='unknown'?'none':state.color,...common,'stroke-dasharray':q.status==='unknown'?'3 2':null},svg);
  const title=el('title',{},marker);title.textContent=`${q.label} · ${state.label} · x ${q.x}, y ${q.y}`;
 }
 return {...plot,coordinateSystem:'normalized-layout',axisDirection:'x-right-y-down',domain:[0,100],baseGeometry:'none-supplied',points:points.map(({px,py,...q})=>({...q,xPixel:px,yPixel:py})),labels};
}

// The two export routes share the same data grammar. Time comes only from
// explicit labels; a prose period is never parsed into invented observations.
function dashboardTrendPlan(hero,width,plan,small){
 const size=small?11:15,count=hero.series[0].values.length,max=Math.max(...hero.series.flatMap(s=>s.values))||1;
 const format=v=>v===0?'0':Math.abs(v)<.001||Math.abs(v)>=1e6?v.toExponential(2).replace(/\.00e/,'e'):Number(v.toPrecision(4)).toString();
 // Multiplying the fraction first avoids overflow for a finite 1e308 maximum.
 // At subnormal precision quarter steps can coincide; show each representable
 // tick once instead of stacking duplicate labels or inventing finer precision.
 const ticks=Array.from({length:5},(_,i)=>({value:max*(i/4),label:format(max*(i/4))})).filter((t,i,a)=>a.findIndex(v=>v.value===t.value)===i),left=Math.max(...ticks.map(t=>measureVisual(t.label,size,'sans',400)))+12,right=10,plotW=width-left-right;
 const unit=plan(`${hero.period} · ${hero.unit}`,width,size,400,4),legend=hero.series.map(s=>plan(s.label,width-36,size,700,4));
 const labels=hero.periods??Array.from({length:count},(_,i)=>String(i+1)),step=plotW/(count-1),direct=labels.every(t=>measureVisual(t,size,'sans',400)<=step*.84);
 const axisLabels=direct?labels:labels.map((_,i)=>String(i+1)),axisHeight=Math.max(...axisLabels.map(t=>plan(t,Math.max(step,40),size,400,1).height)),axisRows=Math.max(...axisLabels.map(t=>measureVisual(t,size,'sans',400)))+4>step?2:1,axisBlockHeight=axisHeight*axisRows+4*(axisRows-1);
 const key=hero.periods&&!direct?labels.map((t,i)=>plan(`${i+1} · ${t}`,width,size,400,4)):[];
 const axisTitle=plan(hero.periods?(direct?'时间 / 给定标签':'观测编号 · 时间对应见下方'):'观测编号 · 未提供逐点时间',width,size,400,2);
 const head=unit.height+12+legend.reduce((sum,p)=>sum+p.height+10,0),tail=12+axisBlockHeight+10+axisTitle.height+(key.length?12+key.reduce((sum,p)=>sum+p.height+6,0):0);
 return {size,max,ticks,left,right,plotW,unit,legend,axisLabels,axisHeight,axisRows,axisBlockHeight,axisTitle,key,head,tail,minHeight:head+tail+(small?120:200),periodMode:hero.periods?'explicit':'observation-index'};
}

function drawDashboardTrend(svg,hero,chart,p,draw,plan,colors){
 const {ink,muted,line,amber,teal}=colors;let top=chart.y;
 draw(chart.x,top,p.unit,{fill:muted});top+=p.unit.height+12;
 hero.series.forEach((s,i)=>{const emphasis=s.label===hero.emphasis,c=emphasis?amber:teal,dash=emphasis?null:(i===1?'7 4':'2 4');
  stroke(svg,[[chart.x,top+p.legend[i].ascent*.6],[chart.x+24,top+p.legend[i].ascent*.6]],c,emphasis?3:2,{'stroke-dasharray':dash,'data-trend-key':s.label});
  draw(chart.x+34,top,p.legend[i],{fill:c});top+=p.legend[i].height+10;
 });
 const plot={x:chart.x+p.left,y:top,w:p.plotW,h:chart.h-p.head-p.tail};
 if(plot.h<100)throw Error('Trend plot needs more height; reduce labels or use a taller composition');
 const y=v=>plot.y+plot.h-v/p.max*plot.h;
 for(const tick of p.ticks){stroke(svg,[[plot.x, y(tick.value)],[plot.x+plot.w,y(tick.value)]],line,1,{'data-trend-grid':tick.value});const t=plan(tick.label,p.left-8,p.size,400,1);draw(plot.x-8,y(tick.value)-t.height/2,t,{fill:muted,anchor:'end'});svg.lastChild.setAttribute('data-trend-tick',tick.value)}
 stroke(svg,[[plot.x,plot.y],[plot.x,plot.y+plot.h],[plot.x+plot.w,plot.y+plot.h]],muted,1);
 hero.series.forEach((s,k)=>{const emphasis=s.label===hero.emphasis,c=emphasis?amber:teal,pts=s.values.map((v,i)=>[plot.x+plot.w*i/(s.values.length-1),y(v)]);
  stroke(svg,pts,c,emphasis?3:2,{'stroke-dasharray':emphasis?null:(k===1?'7 4':'2 4'),'data-trend-series':s.label});
  pts.forEach(([x,y],i)=>{const mark=el('circle',{cx:x,cy:y,r:emphasis?4:3,fill:c,'data-role':'hero-trend-point','data-trend-series':s.label,'data-trend-index':i},svg);const title=el('title',{},mark);title.textContent=`${s.label} · ${hero.periods?.[i]??'观测 '+(i+1)} · ${s.values[i]} ${hero.unit}`});
 });
 p.axisLabels.forEach((label,i)=>{const x=plot.x+plot.w*i/(p.axisLabels.length-1);stroke(svg,[[x,plot.y+plot.h],[x,plot.y+plot.h+4]],muted,1);draw(x,plot.y+plot.h+12+(i%p.axisRows)*(p.axisHeight+4),plan(label,Math.max(plot.w/(p.axisLabels.length-1),40),p.size,400,1),{fill:muted,anchor:'middle'});svg.lastChild.setAttribute('data-trend-period',i)});
 top=plot.y+plot.h+12+p.axisBlockHeight+10;draw(chart.x,top,p.axisTitle,{fill:muted});top+=p.axisTitle.height+12;
 for(const item of p.key){draw(chart.x,top,item,{fill:muted});top+=item.height+6}
 return {...plot,yDomain:[0,p.max],periodMode:p.periodMode};
}

export function dashboardFocusFigure(input){
 const m=dashboardFocusModel(input),W=1800,margin=72,gap=28,bg='#0B1722',ink='#F2F5F1',muted='#A9C0BD',line='#2C4B57',teal='#65B8B1',amber='#E8B052',red='#E56D63';
 const svg=visualPage(W,1120,bg),textPlans=[];
 const plan=(t,w,size=22,weight=400,max=3,role='sans')=>{const lines=visualLines(t,w,{size,weight,max,role}),fb=lines.map(x=>visualFontBounds(x,size,role,weight)),ascent=Math.max(...fb.map(x=>x.ascent)),descent=Math.max(...fb.map(x=>x.descent)),step=Math.max(size*1.34,ascent+descent+5);return {lines,size,weight,role,ascent,descent,step,height:ascent+descent+(lines.length-1)*step}};
 const draw=(x,y,p,{fill=ink,anchor='start'}={})=>{p.lines.forEach((t,i)=>{visualText(svg,x,y+p.ascent+i*p.step,t,{size:p.size,weight:p.weight,role:p.role,fill,anchor});const adv=measureVisual(t,p.size,p.role,p.weight),fb=visualFontBounds(t,p.size,p.role,p.weight),shift=anchor==='middle'?-adv/2:anchor==='end'?-adv:0;textPlans.push({text:t,x:x+shift-1,y:y+i*p.step,width:adv+2,height:fb.ascent+fb.descent+2})})};
 const title=plan(m.title,W-margin*2,44,800,2),fresh=plan(`数据时点 ${m.freshness}`,W-margin*2,18,400,1),titleY=48,freshY=titleY+title.height+12,ruleY=freshY+fresh.height+18;draw(margin,titleY,title);draw(margin,freshY,fresh,{fill:muted});stroke(svg,[[margin,ruleY],[W-margin,ruleY]],line,1);
 const hero={x:margin,y:ruleY+28,w:Math.round((W-margin*2)*.65),h:548};const heroHeading=plan(dashboardViewLabels[m.heroRelation],hero.w-48,18,700,1),chartTop=34+heroHeading.height+14,chartBottom=24;hero.h+=Math.max(0,chartTop-64);const trendPlan=m.heroRelation==='trend'?dashboardTrendPlan(m.hero,hero.w-52,plan,false):null;if(trendPlan)hero.h=Math.max(hero.h,trendPlan.minHeight+chartTop+chartBottom);const spatialPlan=m.heroRelation==='spatial'?dashboardSpatialPlan(m.hero,hero.w-52,plan,false):null;if(spatialPlan)hero.h=Math.max(hero.h,spatialPlan.minHeight+chartTop+chartBottom);let trendGeometry,spatialGeometry;const side={x:hero.x+hero.w+gap,y:hero.y,w:W-(hero.x+hero.w+gap)-margin,h:hero.h};
 el('rect',{x:hero.x,y:hero.y,width:hero.w,height:hero.h,rx:14,fill:'#102936',stroke:line,'stroke-width':1,'data-hero':'true'},svg);el('rect',{x:side.x,y:side.y,width:side.w,height:side.h,rx:14,fill:'#0F2430',stroke:line,'stroke-width':1,'data-support-column':'true'},svg);
 draw(hero.x+24,hero.y+34,heroHeading,{fill:amber});
 const chart={x:hero.x+26,y:hero.y+chartTop,w:hero.w-52,h:hero.h-chartTop-chartBottom};
 function drawMap(){spatialGeometry=drawDashboardSpatial(svg,m.hero,chart,spatialPlan,draw,plan,{muted,line,ink})}
 function drawProcess(){const vals=m.hero.stages.map(s=>s.value),max=Math.max(...vals,1),barW=(chart.w-40)/vals.length-12;vals.forEach((v,i)=>{const h=v===0?0:Math.max(8,v/max*(chart.h-88)),x=chart.x+20+i*(barW+12),y=chart.y+chart.h-50-h,c=i===Math.max(0,vals.indexOf(Math.min(...vals)))?amber:teal;el('rect',{x,y,width:barW,height:h,rx:5,fill:c,'data-role':'hero-stage'},svg);draw(x+barW/2,y-12,plan(String(v),barW+20,16,700,1),{anchor:'middle'});draw(x+barW/2,chart.y+chart.h-20,plan(m.hero.stages[i].label,barW+30,15,400,2),{anchor:'middle',fill:muted})});stroke(svg,[[chart.x+12,chart.y+chart.h-50],[chart.x+chart.w-12,chart.y+chart.h-50]],line,1)}
 function drawComparison(){const vals=m.hero.series.map(s=>s.value),max=Math.max(...vals,1),row=chart.h/vals.length;vals.forEach((v,i)=>{const y=chart.y+i*row+row*.27,w=(chart.w-190)*v/max;draw(chart.x+122,y+22,plan(m.hero.series[i].label,110,16,400,2),{anchor:'end',fill:muted});el('rect',{x:chart.x+140,y,width:v===0?0:Math.max(4,w),height:26,rx:5,fill:i===0?amber:teal,'data-role':'hero-comparison-bar'},svg);draw(chart.x+150+w,y+21,plan(String(v),70,16,700,1),{fill:ink})});stroke(svg,[[chart.x+140,chart.y+chart.h-12],[chart.x+chart.w-10,chart.y+chart.h-12]],line,1)}
 function drawTrend(){trendGeometry=drawDashboardTrend(svg,m.hero,chart,trendPlan,draw,plan,{ink,muted,line,amber,teal})}
 function drawInventory(){const cols=4,cellW=(chart.w-30)/cols-10,cellH=100;for(const [i,a]of m.hero.assets.entries()){const x=chart.x+12+(i%cols)*(cellW+10),y=chart.y+18+Math.floor(i/cols)*(cellH+16),c=a.status==='due'?amber:a.status==='offline'?red:teal;el('rect',{x,y,width:cellW,height:cellH,rx:8,fill:'#173746',stroke:line,'stroke-width':1,'data-role':'hero-asset'},svg);el('circle',{cx:x+18,cy:y+20,r:6,fill:c},svg);draw(x+32,y+26,plan(a.id,cellW-42,16,700,1),{fill:ink});stroke(svg,[[x+18,y+52],[x+cellW-18,y+52]],'#3D6670',5);stroke(svg,[[x+18,y+70],[x+cellW-35,y+70]],'#3D6670',5);stroke(svg,[[x+18,y+88],[x+cellW-52,y+88]],'#3D6670',5)}}
 if(m.heroRelation==='spatial')drawMap();if(m.heroRelation==='process')drawProcess();if(m.heroRelation==='comparison')drawComparison();if(m.heroRelation==='trend')drawTrend();if(m.heroRelation==='inventory')drawInventory();
 const sideHead=plan('辅助证据',side.w-36,18,700,2);draw(side.x+18,side.y+20,sideHead,{fill:amber});let sy=side.y+20+sideHead.height+24;
 for(const p of m.support){const block=dashboardSupportPlan(p,side.w-66,plan,{rel:12,title:20,body:15,unit:12,bar:30}),h=block.height;
  el('rect',{x:side.x+14,y:sy,width:side.w-28,height:h,rx:9,fill:'#14303D',stroke:line,'stroke-width':1,'data-support-panel':p.name,'data-bound-to':p.bindsTo?.join(',')||''},svg);
  draw(side.x+26,sy+16,block.rel,{fill:amber});draw(side.x+26,sy+block.titleTop,block.title,{fill:ink});
  if(p.rows)block.rows.forEach((row,i)=>{const linked=m.hero.points?.find(q=>q.label===p.bindsTo?.[i]);if(linked)el('circle',{cx:side.x+30,cy:sy+row.top+row.plan.ascent*.65,r:4,fill:dashboardSpatialStates[linked.status].color,'data-binding':linked.label},svg);draw(side.x+(linked?40:26),sy+row.top,row.plan,{fill:muted})});
  else{draw(side.x+26,sy+block.contentTop,block.unit,{fill:muted});const max=Math.max(...p.values,1),cw=(side.w-56)/p.values.length;p.values.forEach((v,i)=>{const h2=v===0?0:Math.max(5,v/max*block.barHeight),x=side.x+26+i*cw;el('rect',{x,y:sy+h-18-h2,width:Math.max(4,cw-5),height:h2,fill:teal,'data-role':'support-observation'},svg)})}
  sy+=h+12;
 }
 svg.querySelector('[data-support-column]').setAttribute('height',Math.max(side.h,sy-side.y+8));
 const metricY=Math.max(hero.y+hero.h,sy+8)+26,metricGap=16,metricW=(W-margin*2-metricGap*(m.summary.length-1))/m.summary.length;
 const metricPlans=m.summary.map(k=>({value:plan(k.value,metricW-36,34,800,1,'mono'),label:plan(`${k.label} · ${k.unit}`,metricW-36,16,400,2)}));
 const valueHeight=Math.max(...metricPlans.map(p=>p.value.height)),labelHeight=Math.max(...metricPlans.map(p=>p.label.height)),metricH=20+valueHeight+16+labelHeight+20,H=metricY+metricH+40;
 svg.setAttribute('height',H);svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.firstChild.setAttribute('height',H);
 for(const [i,k]of m.summary.entries()){const x=margin+i*(metricW+metricGap),p=metricPlans[i];el('rect',{x,y:metricY,width:metricW,height:metricH,rx:10,fill:'#102936',stroke:line,'stroke-width':1,'data-metric':k.label},svg);draw(x+18,metricY+20,p.value,{fill:ink});draw(x+18,metricY+20+valueHeight+16,p.label,{fill:muted})}
 const geometry={family:'dashboard-focus',width:W,height:H,title:m.title,freshness:m.freshness,operationalQuestion:m.operationalQuestion,heroRelation:m.heroRelation,trend:trendGeometry,spatial:spatialGeometry,viewports:[390,1024,1440],hero:{x:hero.x,y:hero.y,width:hero.w,height:hero.h,kind:m.hero.kind},support:m.support.map(p=>({name:p.name,relation:p.relation})),summary:m.summary,textPlans,readingOrder:['hero','support','metrics'],compositionReference:'dashboard-focus-composition-v0',aestheticApproval:'not-assessed'};return visualFinish(svg,geometry);
}
/**
 * Render the same dashboard contract at a concrete viewport.  The regular
 * figure remains a 1800px export for print/presentation, while this function
 * owns the responsive composition used by editors and narrow previews.  It
 * deliberately reflows the reading order instead of merely scaling the
 * desktop SVG: hero first, support evidence second, metrics last.
 */
export function dashboardFocusResponsiveFigure(input, viewport=390){
 const m=dashboardFocusModel(input.family==='dashboard-focus'?input:{...input,family:'dashboard-focus'}),vw=Number(viewport);
 if(!Number.isFinite(vw)||vw<320||vw>8000)throw Error('dashboard viewport must be 320..8000px');
 if(vw>=1800){const s=dashboardFocusFigure(input),g=JSON.parse(s.dataset.geometry||'{}');g.viewport=vw;g.responsive=false;s.dataset.geometry=JSON.stringify(g);return s}
 const narrow=vw<700,W=Math.round(vw),margin=narrow?18:32,gap=narrow?14:20,bg='#0B1722',ink='#F2F5F1',muted='#A9C0BD',line='#2C4B57',teal='#65B8B1',amber='#E8B052',red='#E56D63';
 const plan=(t,w,size=16,weight=400,max=3,role='sans')=>{const lines=visualLines(t,Math.max(24,w),{size,weight,max,role}),fb=lines.map(x=>visualFontBounds(x,size,role,weight)),ascent=Math.max(...fb.map(x=>x.ascent)),descent=Math.max(...fb.map(x=>x.descent)),step=Math.max(size*1.34,ascent+descent+4);return {lines,size,weight,role,ascent,descent,step,height:ascent+descent+(lines.length-1)*step}};
 const textPlans=[],svg=visualPage(W,200,bg);
 const draw=(x,y,p,{fill=ink,anchor='start'}={})=>{p.lines.forEach((t,i)=>{visualText(svg,x,y+p.ascent+i*p.step,t,{size:p.size,weight:p.weight,role:p.role,fill,anchor});const adv=measureVisual(t,p.size,p.role,p.weight),fb=visualFontBounds(t,p.size,p.role,p.weight),shift=anchor==='middle'?-adv/2:anchor==='end'?-adv:0;textPlans.push({text:t,x:x+shift-1,y:y+i*p.step,width:adv+2,height:fb.ascent+fb.descent+2})})};
 const title=plan(m.title,W-margin*2,narrow?25:34,800,3),fresh=plan(`数据时点 ${m.freshness}`,W-margin*2,narrow?13:16,400,2),titleY=22,freshY=titleY+title.height+8,ruleY=freshY+fresh.height+12;
 draw(margin,titleY,title);draw(margin,freshY,fresh,{fill:muted});stroke(svg,[[margin,ruleY],[W-margin,ruleY]],line,1);
 const heroHeading=plan(dashboardViewLabels[m.heroRelation],W-margin*2-32,narrow?15:17,700,1),chartTop=26+heroHeading.height+14,chartBottom=14;let heroH=narrow?Math.max(250,m.hero.kind==='inventory'?Math.ceil(m.hero.assets.length/3)*62+78:250):Math.max(330,m.hero.kind==='inventory'?Math.ceil(m.hero.assets.length/4)*76+78:330);heroH+=Math.max(0,chartTop-48);const trendPlan=m.heroRelation==='trend'?dashboardTrendPlan(m.hero,W-margin*2-28,plan,narrow):null;if(trendPlan)heroH=Math.max(heroH,trendPlan.minHeight+chartTop+chartBottom);const spatialPlan=m.heroRelation==='spatial'?dashboardSpatialPlan(m.hero,W-margin*2-28,plan,narrow):null;if(spatialPlan)heroH=Math.max(heroH,spatialPlan.minHeight+chartTop+chartBottom);let trendGeometry,spatialGeometry;const hero={x:margin,y:ruleY+16,w:W-margin*2,h:heroH};
 const sideHeading=plan('辅助证据',W-margin*2-28,narrow?15:17,700,2),supportPlans=m.support.map(p=>dashboardSupportPlan(p,W-margin*2-48,plan,{rel:narrow?10:11,title:narrow?13:16,body:narrow?11:13,unit:narrow?10:11,bar:narrow?18:28})),supportHeights=supportPlans.map(p=>p.height),supportH=supportHeights.reduce((a,b)=>a+b,0)+gap*Math.max(0,m.support.length-1)+sideHeading.height+50,side={x:margin,y:hero.y+hero.h+gap,w:W-margin*2,h:supportH};
 // Keep a real lower reserve for CJK ascent/descent differences.  This is
 // intentionally generous: a browser/font fallback may report a much taller
 // box than the nominal CSS size, and the layout must grow instead of clipping
 // the last metric label at the bottom edge.
 const metricCols=narrow?2:Math.min(4,m.summary.length),metricRows=Math.ceil(m.summary.length/metricCols),metricW=(W-margin*2-gap*(metricCols-1))/metricCols,metricY=side.y+side.h+gap;
 const metricPlans=m.summary.map(k=>({value:plan(k.value,metricW-24,narrow?22:28,800,1,'mono'),label:plan(`${k.label} · ${k.unit}`,metricW-24,narrow?11:13,400,2)})),valueHeight=Math.max(...metricPlans.map(p=>p.value.height)),labelHeight=Math.max(...metricPlans.map(p=>p.label.height)),metricH=Math.max(narrow?130:140,18+valueHeight+14+labelHeight+18),H=metricY+metricRows*metricH+gap*(metricRows-1)+margin;
 svg.setAttribute('height',H);svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.firstChild.setAttribute('height',H);
 el('rect',{x:hero.x,y:hero.y,width:hero.w,height:hero.h,rx:10,fill:'#102936',stroke:line,'stroke-width':1,'data-hero':'true','data-responsive-region':'hero'},svg);
 draw(hero.x+16,hero.y+26,heroHeading,{fill:amber});
 const chart={x:hero.x+14,y:hero.y+chartTop,w:hero.w-28,h:hero.h-chartTop-chartBottom};
 if(m.heroRelation==='spatial')spatialGeometry=drawDashboardSpatial(svg,m.hero,chart,spatialPlan,draw,plan,{muted,line,ink});
 if(m.heroRelation==='process'){const vals=m.hero.stages.map(s=>s.value),max=Math.max(...vals,1),bw=(chart.w-16)/vals.length-6;vals.forEach((v,i)=>{const h=v===0?0:Math.max(7,v/max*(chart.h-58)),x=chart.x+8+i*(bw+6),y=chart.y+chart.h-26-h,c=i===vals.indexOf(Math.min(...vals))?amber:teal;el('rect',{x,y,width:bw,height:h,rx:3,fill:c,'data-role':'hero-stage'},svg);draw(x+bw/2,y-8,plan(String(v),bw+12,narrow?11:14,700,1),{anchor:'middle'});draw(x+bw/2,chart.y+chart.h-12,plan(m.hero.stages[i].label,bw+10,narrow?10:13,400,2),{anchor:'middle',fill:muted})})}
 if(m.heroRelation==='comparison'){const vals=m.hero.series.map(s=>s.value),max=Math.max(...vals,1),rh=(chart.h-8)/vals.length;vals.forEach((v,i)=>{const y=chart.y+i*rh+rh*.22,w=v===0?0:Math.max(3,(chart.w-(narrow?92:130))*v/max),labelW=narrow?78:110;draw(chart.x+labelW,y+14,plan(m.hero.series[i].label,labelW-4,narrow?11:14,400,1),{anchor:'end',fill:muted});el('rect',{x:chart.x+labelW+8,y,width:w,height:narrow?16:20,rx:3,fill:i===0?amber:teal,'data-role':'hero-comparison-bar'},svg);draw(Math.min(chart.x+chart.w-2,chart.x+labelW+16+w),y+13,plan(String(v),44,narrow?11:14,700,1),{fill:ink})})}
 if(m.heroRelation==='trend')trendGeometry=drawDashboardTrend(svg,m.hero,chart,trendPlan,draw,plan,{ink,muted,line,amber,teal});
 if(m.heroRelation==='inventory'){const cols=narrow?3:4,cw=(chart.w-8*(cols-1))/cols,ch=narrow?48:60;for(const [i,a]of m.hero.assets.entries()){const x=chart.x+i%cols*(cw+8),y=chart.y+8+Math.floor(i/cols)*(ch+8),c=a.status==='due'?amber:a.status==='offline'?red:teal;el('rect',{x,y,width:cw,height:ch,rx:5,fill:'#173746',stroke:line,'stroke-width':1,'data-role':'hero-asset'},svg);el('circle',{cx:x+10,cy:y+14,r:4,fill:c},svg);draw(x+19,y+19,plan(a.id,cw-24,narrow?10:12,700,1),{fill:ink})}}
 el('rect',{x:side.x,y:side.y,width:side.w,height:side.h,rx:10,fill:'#0F2430',stroke:line,'stroke-width':1,'data-support-column':'true','data-responsive-region':'support'},svg);draw(side.x+14,side.y+14,sideHeading,{fill:amber});let sy=side.y+sideHeading.height+32;
 for(let i=0;i<m.support.length;i++){const p=m.support[i],block=supportPlans[i],h=block.height;
  el('rect',{x:side.x+10,y:sy,width:side.w-20,height:h,rx:7,fill:'#14303D',stroke:line,'stroke-width':1,'data-support-panel':p.name,'data-bound-to':p.bindsTo?.join(',')||''},svg);draw(side.x+18,sy+16,block.rel,{fill:amber});draw(side.x+18,sy+block.titleTop,block.title,{fill:ink});
  if(p.rows)block.rows.forEach((row,j)=>{const linked=m.hero.points?.find(q=>q.label===p.bindsTo?.[j]);if(linked)el('circle',{cx:side.x+21,cy:sy+row.top+row.plan.ascent*.65,r:3,fill:dashboardSpatialStates[linked.status].color,'data-binding':linked.label},svg);draw(side.x+(linked?29:18),sy+row.top,row.plan,{fill:muted})});
  else{draw(side.x+18,sy+block.contentTop,block.unit,{fill:muted});const max=Math.max(...p.values,1),cw=(side.w-36)/p.values.length;p.values.forEach((v,j)=>{const h2=v===0?0:Math.max(3,v/max*block.barHeight),x=side.x+18+j*cw;el('rect',{x,y:sy+h-18-h2,width:Math.max(3,cw-4),height:h2,fill:teal,'data-role':'support-observation'},svg)})}
  sy+=h+gap;
 }
 for(const [i,k]of m.summary.entries()){const col=i%metricCols,row=Math.floor(i/metricCols),x=margin+col*(metricW+gap),y=metricY+row*(metricH+gap);el('rect',{x,y,width:metricW,height:metricH,rx:8,fill:'#102936',stroke:line,'stroke-width':1,'data-metric':k.label,'data-responsive-region':'metric'},svg);draw(x+12,y+18,metricPlans[i].value,{fill:ink});draw(x+12,y+18+valueHeight+14,metricPlans[i].label,{fill:muted})}
 return visualFinish(svg,{family:'dashboard-focus',width:W,height:H,viewport:vw,responsive:true,title:m.title,freshness:m.freshness,operationalQuestion:m.operationalQuestion,heroRelation:m.heroRelation,trend:trendGeometry,spatial:spatialGeometry,viewports:[390,1024,1440],readingOrder:['hero','support','metrics'],hero:{x:hero.x,y:hero.y,width:hero.w,height:hero.h,kind:m.hero.kind},support:m.support.map(p=>({name:p.name,relation:p.relation})),summary:m.summary,textPlans,compositionReference:'dashboard-focus-composition-v0',aestheticApproval:'not-assessed'});
}

export function dashboardFocusFamilies(){return {'dashboard-focus':dashboardFocusFigure,'dashboard-focus-responsive':dashboardFocusResponsiveFigure}}

