import {el} from './svg.mjs';
import {visualPage,visualText,visualLines,visualFinish} from './visual-tools.mjs';
import {civilBlock,civilTypeStep} from './calendar-figures.mjs';
import {dailyTimeModel} from './daytime-models.mjs';
export function daytimeFamilies(h){
 function dailyTime(input){
  const model=dailyTimeModel(input),scroll=model.notation==='double-hour',W=scroll?2400:2100,role=scroll?'serif':'mono',ink=scroll?'#292B27':'#CEE2DA',dim=scroll?'#66675F':'#839D99',accent=scroll?'#A34235':'#F5B765',bg=scroll?'#EEE8D9':'#0C171B',title=visualLines(input.title,W-160,{size:60,role,weight:800,max:2}),sub=visualLines(input.subtitle,W-160,{size:24,role,max:3}),titleH=title.length*civilTypeStep(60,role,800),subH=sub.length*civilTypeStep(24,role),top=70+titleH+subH+60,note=visualLines(input.note,W-160,{size:23,role,max:5}),sampleStep=civilTypeStep(28,role),intervalStep=civilTypeStep(25,role),bodyH=scroll?400+model.samples.length*(sampleStep+24):Math.max(820,model.samples.length*(sampleStep*2+28)+160+model.intervals.length*(intervalStep*3+sampleStep+30)),noteY=top+bodyH+70,H=noteY+note.length*civilTypeStep(23,role)+60,s=visualPage(W,H,bg);
  civilBlock(s,80,60,title,{size:60,weight:800,role,fill:ink});civilBlock(s,80,70+titleH,sub,{size:24,role,fill:dim});
  const intervalRows=[];function durationText(p){return p.hours+' 小时 '+p.remainder+' 分钟'}
  if(scroll){
   const x0=80,cell=(W-160)/12,cy=top+145,radius=70;
   el('path',{d:`M ${x0} ${cy+108} Q ${W*.32} ${cy+95} ${W/2} ${cy+108} T ${W-x0} ${cy+108}`,stroke:ink,'stroke-width':3,fill:'none'},s);
   for(const p of model.periods){const x=x0+(p.index+.5)*cell,shade=Math.round(65+110*(1-Math.abs(p.index-6)/6)),fill='#'+[shade,shade+2,shade-6].map(v=>Math.min(255,v).toString(16).padStart(2,'0')).join(''),textFill=shade<140?'#F0EDDF':'#252821';el('ellipse',{cx:x,cy,rx:radius,ry:100,fill,'fill-opacity':.78,'data-double-hour':p.index},s);visualText(s,x,cy+13,p.label[0],{size:56,weight:700,role:'serif',anchor:'middle',fill:textFill});visualText(s,x,cy+66,p.zodiac,{size:25,role:'serif',anchor:'middle',fill:textFill});el('line',{x1:x0+p.index*cell,y1:cy+101,x2:x0+p.index*cell,y2:cy+118,stroke:ink},s);visualText(s,x,cy+157,String(p.startHour).padStart(2,'0')+'—'+String(p.endHour).padStart(2,'0')+' 时',{size:25,role:'serif',anchor:'middle',fill:ink})}
   el('line',{x1:W-x0,y1:cy+101,x2:W-x0,y2:cy+118,stroke:ink},s);
   model.samples.forEach((p,i)=>{const y=top+335+i*(sampleStep+24);visualText(s,80,y,p.label+'　'+p.time,{size:28,role,fill:ink});visualText(s,850,y,'→　'+p.doubleHourLabel+' · '+p.zodiac,{size:28,role,fill:accent});visualText(s,1280,y,'对应 '+String(model.periods[p.doubleHour].startHour).padStart(2,'0')+'—'+String(model.periods[p.doubleHour].endHour).padStart(2,'0')+' 时',{size:25,role,fill:dim})});
  }else{
   let y=top+25;
   model.samples.forEach(p=>{visualText(s,80,y,p.label+'　'+p.time,{size:28,role,fill:ink});y+=sampleStep;visualText(s,120,y,'= '+p.half+' '+p.twelveHour+':'+String(p.minutePart).padStart(2,'0'),{size:28,role,fill:p.hour<12?'#79B9E6':accent});y+=sampleStep+28});
   y+=25;for(const p of model.intervals){const text=p.label+'　'+p.start.time+'（第'+p.start.dayOffset+'日） → '+p.end.time+'（第'+p.end.dayOffset+'日）',ls=visualLines(text,1030,{size:25,role,max:3});y+=civilBlock(s,80,y,ls,{size:25,role,fill:dim});visualText(s,120,y+25,'经过 '+durationText(p),{size:28,role,fill:'#86CD8B'});intervalRows.push({id:p.id,y,minutes:p.minutes});y+=sampleStep+30}
   const cx=1570,cy=top+325,R=255;
   el('circle',{cx,cy,r:R,fill:'none',stroke:'#445C5E','stroke-width':1.5},s);for(let hour=0;hour<24;hour++){const a=hour/24*2*Math.PI-Math.PI/2,color=hour<12?'#79B9E6':accent;el('line',{x1:cx+Math.cos(a)*(R-8),y1:cy+Math.sin(a)*(R-8),x2:cx+Math.cos(a)*(R+8),y2:cy+Math.sin(a)*(R+8),stroke:color,'stroke-width':2},s);visualText(s,cx+Math.cos(a)*(R+40),cy+Math.sin(a)*(R+40)+9,hour,{size:23,role:'mono',anchor:'middle',fill:color});visualText(s,cx+Math.cos(a)*(R-45),cy+Math.sin(a)*(R-45)+7,hour%12||12,{size:19,role:'mono',anchor:'middle',fill:dim})}
   const selected=model.samples[0],angle=selected.minute/1440*2*Math.PI-Math.PI/2,x=cx+Math.cos(angle)*190,z=cy+Math.sin(angle)*190;el('line',{x1:cx,y1:cy,x2:x,y2:z,stroke:accent,'stroke-width':5,'data-selected-minute':selected.minute},s);el('circle',{cx,cy,r:7,fill:accent},s);visualText(s,cx,cy+R+110,selected.time+' · '+selected.label,{size:28,role,anchor:'middle',fill:ink});visualText(s,cx,cy+R+155,'外圈 24 时，内圈为对应的 12 时制数字',{size:21,role,anchor:'middle',fill:dim});
  }
  el('line',{x1:80,y1:noteY-25,x2:W-80,y2:noteY-25,stroke:dim,'stroke-width':1},s);civilBlock(s,80,noteY,note,{size:23,role,fill:dim});return visualFinish(s,{family:'daily-time',width:W,height:H,...model,intervalRows,sourceCases:scroll?['j07-shier-shichen']:['133-twenty-four-hour']});
 }
 return {'daily-time':dailyTime};
}
