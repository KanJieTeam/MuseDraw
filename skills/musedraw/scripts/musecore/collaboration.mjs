import {el} from './svg.mjs';
import {visualPage,visualText,visualLines,visualBlock,visualHeading,visualFinish,stroke,blend,backedVisualText} from './visual-tools.mjs';
import {formatNumber} from './quantitative.mjs';
import {collaborationWindows} from './time-windows.mjs';

export function collaborationFamilies(h){
 const {fields,list,str,need,unique}=h;
 const clock=m=>`${String(Math.floor(((m%1440)+1440)%1440/60)).padStart(2,'0')}:${String(((m%60)+60)%60).padStart(2,'0')}`;
 function timezone(b){
  fields(b,['family','title','subtitle','offices','referenceDate','recurringDaily','meetingMinutes','note'],'timezone');for(const k of ['title','subtitle','referenceDate','note'])str(b[k],k);need(/^\d{4}-\d{2}-\d{2}$/.test(b.referenceDate)&&new Date(b.referenceDate+'T00:00:00Z').toISOString().slice(0,10)===b.referenceDate,'invalid UTC reference date');need(b.recurringDaily===true,'timezone route requires explicit daily recurring work windows');list(b.offices,2,8,'offices');unique(b.offices,'offices');for(const o of b.offices){fields(o,['id','label','offsetMinutes','workStart','workEnd'],'office');str(o.label,'office.label');visualLines(o.label,200,{size:20,max:1})}const result=collaborationWindows(b.offices,{meetingMinutes:b.meetingMinutes});
  const W=1800,H=1380,s=visualPage(W,H,'#0B1830'),white='#E0ECF4',muted='#819DB9',cyan='#8BD3EF',gold='#F0C464',cx=490,cy=780,inner=205,outer=inner+(b.offices.length-1)*26;
  visualHeading(s,b.title,b.subtitle,{width:1660,size:52,fill:white,subFill:muted});
  for(let hour=0;hour<24;hour++){const angle=hour/24*Math.PI*2-Math.PI/2,r=outer+55,x=cx+Math.cos(angle)*r,y=cy+Math.sin(angle)*r;visualText(s,x,y+6,String(hour).padStart(2,'0'),{size:18,anchor:'middle',fill:muted})}
  const polar=(radius,minute)=>[cx+Math.cos(minute/1440*Math.PI*2-Math.PI/2)*radius,cy+Math.sin(minute/1440*Math.PI*2-Math.PI/2)*radius];
  b.offices.forEach((o,i)=>{const r=inner+i*26,color=blend('#6C9FC8',cyan,i/Math.max(1,b.offices.length-1));el('circle',{cx,cy,r,fill:'none',stroke:'#223A55','stroke-width':12},s);for(const slot of result.slots)if(slot.working[i]){const a=polar(r,slot.minute+.7),z=polar(r,slot.minute+15-.7);el('path',{d:`M ${a.join(' ')} A ${r} ${r} 0 0 1 ${z.join(' ')}`,fill:'none',stroke:color,'stroke-width':12,'stroke-linecap':'butt'},s)}});
  if(result.recommended!==null){const a=polar(inner-25,result.recommended),z=polar(outer+25,result.recommended);stroke(s,[a,z],gold,2)}
  b.offices.forEach((o,i)=>backedVisualText(s,cx,cy-inner-i*26+5,String(i+1).padStart(2,'0'),{background:'#0B1830',size:14,anchor:'middle',weight:700,fill:white}));
  visualText(s,cx,cy-38,'UTC',{size:48,weight:700,anchor:'middle',fill:white});visualText(s,cx,cy+5,b.referenceDate,{size:23,anchor:'middle',fill:muted});visualText(s,cx,cy+45,`共同 ${formatNumber(result.sharedMinutes/60)} 小时`,{size:25,anchor:'middle',fill:gold});
  const left=1020,right=1690,barTop=300,barBottom=440,cw=(right-left)/96;visualText(s,left,barTop-35,'每 15 分钟，同时在岗的办公室数量',{size:25,weight:700,fill:white});for(const slot of result.slots){const height=slot.count/b.offices.length*(barBottom-barTop);el('rect',{x:left+slot.index*cw,y:barBottom-height,width:cw-1,height,fill:slot.count===b.offices.length?gold:'#629DC2'},s)}for(const hr of [0,6,12,18,24])visualText(s,left+(right-left)*hr/24,barBottom+28,String(hr).padStart(2,'0'),{size:18,anchor:'middle',fill:muted});
  visualText(s,left,510,result.recommended===null?'没有满足全部办公室的完整会议时段':`首个共同起点 UTC ${clock(result.recommended)} · ${b.meetingMinutes} 分钟`,{size:23,weight:700,fill:gold});
  b.offices.forEach((o,i)=>{let value='—';if(result.recommended!==null){const total=result.recommended+o.offsetMinutes,day=Math.floor(total/1440);value=clock(total)+(day?`（${day>0?'+':''}${day} 日）`:'')}visualText(s,left,555+i*30,`${String(i+1).padStart(2,'0')}  ${o.label}`,{size:21,fill:white});visualText(s,right,555+i*30,value,{size:21,anchor:'end',fill:cyan})});
  const tableTop=650+b.offices.length*30,cell=49,matrixX=1260;visualText(s,left,tableTop-30,'两地每天共同在岗时长（小时）',{size:24,weight:700,fill:white});b.offices.forEach((o,i)=>{visualText(s,matrixX+(i+.5)*cell,tableTop+18,String(i+1).padStart(2,'0'),{size:17,anchor:'middle',fill:muted});visualText(s,left,tableTop+60+i*cell,`${String(i+1).padStart(2,'0')} ${o.label}`,{size:19,fill:muted});result.pairwise[i].forEach((minutes,j)=>{const x=matrixX+j*cell,y=tableTop+28+i*cell;el('rect',{x,y,width:cell-2,height:cell-2,fill:blend('#11263F','#8BD3EF',minutes/1440)},s);visualText(s,x+cell/2,y+29,formatNumber(minutes/60),{size:18,anchor:'middle',fill:minutes>600?'#10253A':white})})});
  const contentBottom=tableTop+28+b.offices.length*cell,finalH=Math.max(H,contentBottom+110);s.setAttribute('height',finalH);s.setAttribute('viewBox',`0 0 ${W} ${finalH}`);s.firstChild.setAttribute('height',finalH);visualBlock(s,70,finalH-70,visualLines(b.note,1660,{size:19,max:2}),{size:19,fill:muted});return visualFinish(s,{family:'timezone',width:W,height:finalH,offices:b.offices,...result,referenceDate:b.referenceDate,scope:'explicit fixed offsets and daily recurring windows; not a timezone/DST lookup',sourceCase:'193-timezone-collaboration'});
 }
 return {timezone};
}
