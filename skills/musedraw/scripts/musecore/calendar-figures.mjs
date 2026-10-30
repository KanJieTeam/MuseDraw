import {el} from './svg.mjs';
import {visualPage,visualText,visualLines,visualBlock,visualFontBounds,visualFinish} from './visual-tools.mjs';
import {civilCalendarModel} from './calendar-models.mjs';
export function civilTypeStep(size,role='serif',weight=400){const b=visualFontBounds('年月日Ag',size,role,weight);return Math.max(size*1.4,b.ascent+b.descent+6)}
export function civilBlock(svg,x,y,lines,options={}){const size=options.size??24,step=civilTypeStep(size,options.role??'serif',options.weight??400);visualBlock(svg,x,y,lines,{role:'serif',...options,leading:step/size});return lines.length*step}
export function calendarFamilies(h){
 function civilCalendar(input){
  const model=civilCalendarModel(input),W=2000,margin=80,ink='#171817',dim='#595953',title=visualLines(input.title,W-160,{size:66,role:'serif',weight:800,max:2}),sub=visualLines(input.subtitle,W-160,{size:25,role:'serif',max:3}),titleH=title.length*civilTypeStep(66,'serif',800),subH=sub.length*civilTypeStep(25),top=70+titleH+subH+110,headH=civilTypeStep(30,'serif',700),rowH=Math.max(48,civilTypeStep(26)+8),ruleLines=visualLines('能被 4 整除，且不能被 100 整除；或者，能被 400 整除。',430,{size:28,role:'serif',max:6}),ruleH=ruleLines.length*civilTypeStep(28),tableTop=top+headH+50+ruleH+60,notes=visualLines(input.note,W-160,{size:23,role:'serif',max:5}),bodyBottom=Math.max(top+headH+40+12*rowH,tableTop+model.comparisons.length*(civilTypeStep(25)+24)),noteY=bodyBottom+70,H=noteY+notes.length*civilTypeStep(23)+60,s=visualPage(W,H,'#F0EDE5');
  const defs=el('defs',{},s),pat=el('pattern',{id:'civil-february-dots',width:8,height:8,patternUnits:'userSpaceOnUse'},defs);el('rect',{width:8,height:8,fill:'#F0EDE5'},pat);el('circle',{cx:2,cy:2,r:1.2,fill:ink},pat);el('circle',{cx:6,cy:6,r:1.2,fill:ink},pat);
  civilBlock(s,margin,60,title,{size:66,weight:800,fill:ink});civilBlock(s,margin,70+titleH,sub,{size:25,fill:dim});const ruleY=70+titleH+subH+24;
  el('line',{x1:margin,y1:ruleY,x2:W-margin,y2:ruleY,stroke:ink,'stroke-width':3},s);visualText(s,margin,ruleY+36,model.referenceDate+'　星期'+model.weekdayLabel,{size:24,role:'serif',fill:dim});visualText(s,W-margin,ruleY+36,'参考日期是本年第 '+model.ordinal+' 天',{size:24,role:'serif',anchor:'end',fill:dim});
  const left=margin,middle=900,right=1490;for(const x of [840,1430])el('line',{x1:x,y1:top-5,x2:x,y2:bodyBottom,stroke:'#77766F','stroke-width':1},s);
  visualText(s,left,top+30,model.year+' 年 · 十二个月',{size:30,weight:700,role:'serif',fill:ink});visualText(s,middle,top+30,'一年由哪些月份组成',{size:30,weight:700,role:'serif',fill:ink});visualText(s,right,top+30,'怎样判断闰年',{size:30,weight:700,role:'serif',fill:ink});
  const scale=17,barX=left+82,barY=top+headH+40;
  model.months.forEach((days,i)=>{const y=barY+i*rowH,fill=i===1?'url(#civil-february-dots)':days===31?ink:'#92948D';visualText(s,left+54,y+28,(i+1)+'月',{size:25,role:'serif',anchor:'end',fill:ink});el('rect',{x:barX,y:y+4,width:days*scale,height:29,fill,stroke:i===1?ink:'none','stroke-width':.7,'data-month':i+1,'data-days':days},s);visualText(s,barX+31*scale+18,y+28,days+' 天',{size:25,role:'serif',fill:ink})});
  const feb=model.months[1],midY=top+headH+42;let yy=midY;
  for(const text of ['大月 · 31 天','1、3、5、7、8、10、12 月','共 7 个月','小月 · 30 天','4、6、9、11 月','共 4 个月','二月单独计算 · '+feb+' 天']){const strong=text.includes('·'),lines=visualLines(text,470,{size:strong?28:25,role:'serif',weight:strong?700:400,max:3});yy+=civilBlock(s,middle,yy,lines,{size:strong?28:25,weight:strong?700:400,fill:strong?ink:dim})+16}
  yy+=12;for(const text of ['31 × 7 + 30 × 4 + '+feb,'= 217 + 120 + '+feb,'= '+model.days+' 天'])yy+=civilBlock(s,middle,yy,[text],{size:30,weight:700,fill:ink})+8;
  civilBlock(s,right,top+headH+42,ruleLines,{size:28,fill:ink});visualText(s,right,tableTop-20,'年份　　　　　判断',{size:25,weight:700,role:'serif',fill:ink});
  model.comparisons.forEach((c,i)=>{const y=tableTop+i*(civilTypeStep(25)+24);el('line',{x1:right,y1:y-8,x2:W-margin,y2:y-8,stroke:'#B4B2AA'},s);visualText(s,right,y+25,c.year+' 年',{size:25,role:'serif',fill:ink});visualText(s,W-margin,y+25,c.leap?'闰年 · 366 天':'平年 · 365 天',{size:25,role:'serif',anchor:'end',fill:ink})});
  el('line',{x1:margin,y1:noteY-25,x2:W-margin,y2:noteY-25,stroke:ink,'stroke-width':1.5},s);civilBlock(s,margin,noteY,notes,{size:23,fill:dim});return visualFinish(s,{family:'civil-calendar',width:W,height:H,...model,barScale:scale,barHeight:29,sourceCases:['130-year-month-day']});
 }
 return {'civil-calendar':civilCalendar};
}
