import {el} from './svg.mjs';
import {measureVisual,visualLines,visualPage,visualText,visualBlock,visualHeading,visualFinish,stroke,number,blend} from './visual-tools.mjs';

export function dataVisualFamilies(h){
 const {need,list,fields,str}=h;
 const palettes={emerald:['#EEF2EA','#B6D4C9','#79B5A5','#41867C','#20574E'],amber:['#F4EEE5','#F2D6A2','#DDA65E','#B66B36','#743E29'],blue:['#EEF0F6','#BBC9E3','#809BCC','#4B6EAE','#284779']};
 function calendar(b){
  fields(b,['family','title','year','records','missing','unit','palette','dataStatus','note'],'calendar');for(const k of ['title','unit','dataStatus','note'])str(b[k],k);
  need(Number.isInteger(b.year)&&b.year>=1900&&b.year<=2100,'year: 1900–2100');need(b.missing==='zero'||b.missing==='reject','missing: explicitly choose zero or reject');need(Object.hasOwn(palettes,b.palette),'unknown calendar palette');
  list(b.records,1,366,'records');const records=new Map();
  for(const r of b.records){fields(r,['date','value'],'daily record');str(r.date,'record.date');need(/^\d{4}-\d{2}-\d{2}$/.test(r.date),'date must be YYYY-MM-DD');const t=new Date(r.date+'T00:00:00Z');need(!Number.isNaN(+t)&&t.toISOString().slice(0,10)===r.date&&t.getUTCFullYear()===b.year,'invalid calendar date or wrong year');number(r.value,'daily value');need(r.value>=0,'daily value cannot be negative');need(!records.has(r.date),'duplicate date '+r.date);records.set(r.date,r.value)}
  const jan=Date.UTC(b.year,0,1),end=Date.UTC(b.year+1,0,1),offset=(new Date(jan).getUTCDay()+6)%7,days=[],months=Array(12).fill(0);let total=0,weekend=0,run=0,longest=0;
  for(let t=jan,i=0;t<end;t+=86400000,i++){const date=new Date(t).toISOString().slice(0,10);need(b.missing==='zero'||records.has(date),'missing daily value: '+date);const value=records.get(date)??0,month=new Date(t).getUTCMonth(),weekday=(i+offset)%7;days.push({date,value,month,weekday,week:Math.floor((i+offset)/7)});months[month]+=value;total+=value;if(weekday>=5)weekend+=value;if(value>0){run++;longest=Math.max(longest,run)}else run=0}
  const max=Math.max(...days.map(d=>d.value)),colors=palettes[b.palette],breaks=[0,...[1,2,3,4].map(k=>max*k/4)];
  const W=1600,H=760,s=visualPage(W,H,'#FBFBF7');
  visualHeading(s,b.title,`${b.year} 年合计 ${fmt(total)} ${b.unit} · 最长连续 ${longest} 天 · ${b.dataStatus}`,{x:70,top:45,width:1460,size:48});
  const weeks=days.at(-1).week+1,x0=120,y0=225,cw=Math.min(23,1180/weeks),gap=3,cell=cw-gap;
  ['一','二','三','四','五','六','日'].forEach((d,i)=>visualText(s,95,y0+i*cw+cell*.8,d,{size:17,fill:'#6B7476',anchor:'end'}));
  const firsts=days.filter(d=>d.date.endsWith('-01'));firsts.forEach(d=>visualText(s,x0+d.week*cw,y0-18,`${d.month+1}月`,{size:18,fill:'#394449'}));
  days.forEach(d=>{const bin=d.value===0?0:Math.min(4,Math.max(1,Math.ceil(d.value/max*4)));d.bin=bin;el('rect',{x:x0+d.week*cw,y:y0+d.weekday*cw,width:cell,height:cell,rx:2,fill:colors[bin]},s)});
  const legendX=1390;visualText(s,legendX,y0-18,`${b.unit} / 天`,{size:18,weight:700});
  for(let i=0;i<(max?5:1);i++){el('rect',{x:legendX,y:y0+i*31,width:19,height:19,rx:2,fill:colors[i]},s);const label=i===0?'0':`(${fmt(breaks[i-1])}, ${fmt(breaks[i])}]`;visualText(s,legendX+30,y0+i*31+16,label,{size:17,fill:'#56636A'})}
  const baseline=620,barsTop=475,maxMonth=Math.max(...months),monthStep=115,monthly=[];
  visualText(s,120,443,'每月合计',{size:23,weight:700});
  months.forEach((value,i)=>{const x=120+i*monthStep,height=maxMonth?value/maxMonth*(baseline-barsTop):0;el('rect',{x,y:baseline-height,width:76,height,fill:colors[value===maxMonth?4:2]},s);visualText(s,x+38,baseline-height-10,fmt(value),{size:18,anchor:'middle',fill:'#4C5A5C'});visualText(s,x+38,baseline+30,`${i+1}月`,{size:19,anchor:'middle',fill:'#647073'});monthly.push({month:i+1,value,height})});
  const weekendShare=total?weekend/total*100:null;
  visualBlock(s,120,682,visualLines(`${b.note}；周末占比 ${weekendShare===null?'无数据':weekendShare.toFixed(1)+'%'}。${b.missing==='zero'?'未列出的日期按输入约定计为 0。':'每日记录完整。'}`,1390,{size:20,max:2}),{size:20,fill:'#647073'});
  return visualFinish(s,{family:'calendar',width:W,height:H,year:b.year,days,total,months,longest,weekendShare,breaks,palette:colors,monthly,sourceCase:'d05-rili-reli'});
 }
 function plate(b){
  fields(b,['family','title','subtitle','rows','columns','values','range','threshold','direction','unit','controls','dataStatus'],'plate');for(const k of ['title','subtitle','unit','dataStatus'])str(b[k],k);
  list(b.rows,4,16,'rows');need(new Set(b.rows).size===b.rows.length,'duplicate plate row');b.rows.forEach(r=>{str(r,'row');need(r.length<=3,'plate row label too long')});need(Number.isInteger(b.columns)&&b.columns>=6&&b.columns<=24,'columns: 6–24');list(b.values,b.rows.length*b.columns,b.rows.length*b.columns,'values');b.values.forEach(v=>number(v,'well value'));
  list(b.range,2,2,'range');b.range.forEach(v=>number(v,'range bound'));need(b.range[1]>b.range[0]&&b.values.every(v=>v>=b.range[0]&&v<=b.range[1]),'values must lie in the declared scale');number(b.threshold,'threshold');need(b.threshold>=b.range[0]&&b.threshold<=b.range[1],'threshold outside scale');need(['above','below'].includes(b.direction),'direction: above or below');
  fields(b.controls,['positiveColumns','negativeColumns'],'controls');const pos=b.controls.positiveColumns,neg=b.controls.negativeColumns;list(pos,1,3,'positiveColumns');list(neg,1,3,'negativeColumns');const all=[...pos,...neg];need(new Set(all).size===all.length,'control columns duplicate or overlap');all.forEach(c=>need(Number.isInteger(c)&&c>=1&&c<=b.columns,'control column outside plate'));
  const wells=b.values.map((value,i)=>({row:b.rows[Math.floor(i/b.columns)],column:i%b.columns+1,value,id:b.rows[Math.floor(i/b.columns)]+(i%b.columns+1),control:pos.includes(i%b.columns+1)?'positive':neg.includes(i%b.columns+1)?'negative':null}));
  const cmp=v=>b.direction==='above'?v>=b.threshold:v<=b.threshold;
  const samples=wells.filter(w=>!w.control),hits=samples.filter(w=>cmp(w.value)).sort((a,z)=>b.direction==='above'?z.value-a.value:a.value-z.value);
  const stats=vs=>{const mean=vs.reduce((s,v)=>s+v,0)/vs.length,sd=Math.sqrt(vs.reduce((s,v)=>s+(v-mean)**2,0)/(vs.length-1));return {mean,sd,n:vs.length}};
  const positive=stats(wells.filter(w=>w.control==='positive').map(w=>w.value)),negative=stats(wells.filter(w=>w.control==='negative').map(w=>w.value)),meanDiff=Math.abs(positive.mean-negative.mean),zPrime=meanDiff?1-3*(positive.sd+negative.sd)/meanDiff:null;
  const W=1400;let H=1360;const s=visualPage(W,H,'#FFFFFF'),red='#D7282F',ink='#17191B';
  const top=visualHeading(s,b.title,`${b.subtitle} · ${b.dataStatus}`,{x:70,top:48,width:1060,size:68});
  visualText(s,1320,112,`Z′ = ${zPrime===null?'未定义':zPrime.toFixed(2)}`,{size:38,weight:800,fill:red,anchor:'end'});
  const annotation=`样本 ${samples.length} 孔 · 命中 ${hits.length} 孔 · ${b.direction==='above'?'≥':'≤'} ${fmt(b.threshold)} ${b.unit}`;visualText(s,70,top+16,annotation,{size:24,fill:'#56616A'});
  const x0=140,y0=top+110,gridW=1120,dx=gridW/(b.columns-1),dy=Math.min(44,560/(b.rows.length-1)),r=Math.min(17,dx*.37,dy*.37),geometry=[];
  for(let c=1;c<=b.columns;c++)visualText(s,x0+(c-1)*dx,y0-36,String(c),{size:17,fill:'#757F85',anchor:'middle'});
  b.rows.forEach((row,i)=>visualText(s,x0-40,y0+i*dy+6,row,{size:20,weight:700,anchor:'end'}));
  wells.forEach(w=>{const x=x0+(w.column-1)*dx,y=y0+b.rows.indexOf(w.row)*dy,t=(w.value-b.range[0])/(b.range[1]-b.range[0]),hit=!w.control&&cmp(w.value);el('circle',{cx:x,cy:y,r,fill:blend('#FFF9F7',red,t),stroke:hit?ink:'#DDD8D6','stroke-width':hit?2.6:.8},s);geometry.push({...w,x,y,r,hit})});
  for(const c of all){const x=x0+(c-1)*dx;el('rect',{x:x-r-7,y:y0-r-10,width:r*2+14,height:dy*(b.rows.length-1)+r*2+20,fill:'none',stroke:ink,'stroke-width':1,'stroke-dasharray':'5 4'},s);visualText(s,x,y0+(b.rows.length-1)*dy+r+45,pos.includes(c)?'阳性对照':'阴性对照',{size:16,anchor:'middle'})}
  const keyY=y0+(b.rows.length-1)*dy+r+90;visualText(s,140,keyY,'数值尺度',{size:20,weight:700});for(let i=0;i<5;i++){const x=290+i*125;el('circle',{cx:x,cy:keyY-7,r:11,fill:blend('#FFF9F7',red,i/4),stroke:'#D6D1CF','stroke-width':1},s);visualText(s,x,keyY+31,fmt(b.range[0]+i/4*(b.range[1]-b.range[0])),{size:17,anchor:'middle',fill:'#6A7177'})}el('circle',{cx:1010,cy:keyY-7,r:12,fill:'white',stroke:ink,'stroke-width':2.5},s);visualText(s,1033,keyY,'命中样本',{size:19});
  const divider=keyY+70;stroke(s,[[70,divider],[1330,divider]],ink,2);
  const histTop=divider+60,baseline=Math.max(1250,histTop+240),plotLeft=100,plotRight=820,bins=12,counts=Array(bins).fill(0);for(const w of samples)counts[Math.min(bins-1,Math.floor((w.value-b.range[0])/(b.range[1]-b.range[0])*bins))]++;
  H=baseline+110;need(H<=1800,'plate and evidence area exceed supported reading height');s.setAttribute('height',H);s.setAttribute('viewBox',`0 0 ${W} ${H}`);s.firstChild.setAttribute('height',H);
  const max=Math.max(1,...counts),binWidth=(plotRight-plotLeft)/bins;visualText(s,100,histTop-18,'样本数值分布',{size:24,weight:700});
  counts.forEach((count,i)=>{const height=count/max*(baseline-histTop-20),low=b.range[0]+i/bins*(b.range[1]-b.range[0]),high=low+(b.range[1]-b.range[0])/bins,selected=b.direction==='above'?low>=b.threshold:high<=b.threshold;el('rect',{x:plotLeft+i*binWidth+4,y:baseline-height,width:binWidth-8,height,fill:selected?red:ink},s)});
  stroke(s,[[plotLeft,baseline],[plotRight,baseline]],ink,1);for(let i=0;i<=4;i++)visualText(s,plotLeft+(plotRight-plotLeft)*i/4,baseline+30,fmt(b.range[0]+(b.range[1]-b.range[0])*i/4),{size:17,anchor:'middle',fill:'#6A7177'});
  const listX=930;visualText(s,listX,histTop-18,`命中 ${hits.length} 个`,{size:25,weight:800});
  hits.slice(0,6).forEach((w,i)=>{visualText(s,listX,histTop+25+i*30,w.id,{size:21,weight:700});visualText(s,1240,histTop+25+i*30,`${fmt(w.value)} ${b.unit}`,{size:21,weight:700,fill:red,anchor:'end'})});
  if(hits.length>6)visualText(s,listX,histTop+25+6*30,`另 ${hits.length-6} 个见输入记录`,{size:18,fill:'#6A7177'});
  visualText(s,70,H-30,'示意图不替代实验判断；Z′ 由给定对照列的均值和样本标准差计算。',{size:18,fill:'#6A7177'});
  return visualFinish(s,{family:'plate',width:W,height:H,wells:geometry,hitIds:hits.map(w=>w.id),threshold:b.threshold,positive,negative,zPrime,histogram:counts,sourceCase:'170-hts-384-plate'});
 }
 function fmt(n){return Number(n.toFixed(2)).toString()}
 function riso(b){
  fields(b,['family','title','subtitle','x','xUnit','unit','series','dataStatus','note'],'riso');for(const k of ['title','subtitle','xUnit','unit','dataStatus','note'])str(b[k],k);
  list(b.x,4,24,'x');b.x.forEach(v=>number(v,'x'));need(b.x.every((v,i)=>!i||v>b.x[i-1]),'x must strictly increase');list(b.series,2,2,'series');need(b.series[0].label!==b.series[1].label,'series names must differ');
  for(const series of b.series){fields(series,['label','values'],'series');str(series.label,'series.label');list(series.values,b.x.length,b.x.length,'series.values');series.values.forEach(v=>{number(v,'y');need(v>=0,'riso evidence requires nonnegative values')})}
  const W=1500,H=1180,paper='#F3ECDD',blue='#2648B8',pink='#E64083',s=visualPage(W,H,paper);
  const top=visualHeading(s,b.title,`${b.subtitle} · ${b.dataStatus}`,{x:80,top:55,width:1340,size:67,fill:blue,subFill:'#6071A3'});
  const x0=120,x1=1380,y0=top+160,base=870,high=Math.max(1,...b.series.flatMap(v=>v.values)),max=Math.ceil(high/10)*10;
  const X=v=>x0+(v-b.x[0])/(b.x.at(-1)-b.x[0])*(x1-x0),Y=v=>base-v/max*(base-y0),peaks=b.series.map(series=>{const value=Math.max(...series.values),indices=series.values.map((v,i)=>v===value?i:-1).filter(i=>i>=0);return {label:series.label,value,at:indices.map(i=>b.x[i])}});
  visualText(s,80,top+60,'两条曲线，同一把尺。',{size:31,weight:700,fill:blue});
  for(let i=0;i<=4;i++){const value=max*i/4,y=Y(value);stroke(s,[[x0,y],[x1,y]],blue,1,{'stroke-opacity':.17});visualText(s,x0-20,y+7,fmt(value),{size:21,fill:'#6D7BA6',anchor:'end'})}
  const ticks=b.x.filter((_,i)=>i%Math.max(1,Math.ceil(b.x.length/9))===0||i===b.x.length-1);ticks.forEach(v=>visualText(s,X(v),base+35,`${fmt(v)}`,{size:21,fill:'#6D7BA6',anchor:'middle'}));visualText(s,x1,base+72,b.xUnit,{size:22,fill:blue,anchor:'end'});visualText(s,78,y0-18,b.unit,{size:22,fill:blue});
  const paths=b.series.map((series,si)=>{const color=si?pink:blue,points=series.values.map((v,i)=>[X(b.x[i]),Y(v)]),area=[[x0,base],...points,[x1,base]];el('polygon',{points:area.map(p=>p.join(',')).join(' '),fill:color,'fill-opacity':.22},s);stroke(s,points,color,4);points.forEach(([x,y])=>el('circle',{cx:x,cy:y,r:4.5,fill:color},s));return {label:series.label,color,points}});
  // Overprinted areas share a baseline; the two actual series remain sharply
  // drawn. The image is illustrative, with all values and peak positions retained.
  stroke(s,[[80,970],[1420,970]],blue,1,{'stroke-opacity':.4});
  peaks.forEach((p,i)=>{const x=80+i*710,color=i?pink:blue;visualText(s,x,1030,p.label,{size:27,weight:700,fill:color});visualText(s,x+270,1030,`${fmt(p.value)} ${b.unit}`,{size:38,weight:800,fill:color});visualText(s,x,1070,`峰值位置 ${p.at.map(fmt).join('、')} ${b.xUnit}`,{size:23,fill:'#6071A3'})});
  visualBlock(s,80,1122,visualLines(b.note,1340,{size:20,max:2}),{size:20,fill:'#6071A3'});
  return visualFinish(s,{family:'riso',width:W,height:H,x:b.x,series:b.series,peaks,paths,yDomain:[0,max],sourceCase:'visual-language/riso-report'});
 }
 return {calendar,plate,riso};
}
