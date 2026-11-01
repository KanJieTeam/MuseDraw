import {deviceMeasurementModel} from './device-measurement-models.mjs';
import {el} from './svg.mjs';
import {visualPage,visualText,visualFinish,stroke} from './visual-tools.mjs';
const deviceColors={source:'#315A72',sample:'#A66A2B',sensor:'#356B59',detector:'#7D4A62',controller:'#626D75',readout:'#40474B'};
const deviceStatusStyle={measured:{fill:'#356B59',dash:null},missing:{fill:'#8C9698',dash:'7 6'},planned:{fill:'#A66A2B',dash:'2 6'}};
function deviceFmt(v){return Number(v).toFixed(2).replace(/\.00$/,'')}
export function deviceMeasurementFamilies(){return {'device-measurement':deviceMeasurementFigure}}
export function deviceMeasurementFigure(input){
 const m=deviceMeasurementModel(input),W=1600,H=960,margin=74,apparatus={x:margin,y:238,w:980,h:515},panel={x:1115,y:238,w:410,h:515},s=visualPage(W,H,'#F8F7F2');
 visualText(s,margin,72,m.title,{size:48,weight:800,fill:'#182B38'});visualText(s,margin,116,m.question,{size:25,fill:'#586975'});stroke(s,[[margin,148],[W-margin,148]],'#B8C1C2',1);
 visualText(s,apparatus.x,202,'装置与路径',{size:27,weight:700,fill:'#182B38'});visualText(s,panel.x,202,'测量读数',{size:27,weight:700,fill:'#182B38'});
 el('rect',{x:apparatus.x,y:apparatus.y,width:apparatus.w,height:apparatus.h,fill:'#FFFFFF',stroke:'#AAB6B9','stroke-width':2},s);el('rect',{x:panel.x,y:panel.y,width:panel.w,height:panel.h,fill:'#FFFFFF',stroke:'#AAB6B9','stroke-width':2},s);
 const pts={};for(const c of m.components){pts[c.id]={x:apparatus.x+c.x*apparatus.w,y:apparatus.y+c.y*apparatus.h,w:c.w*apparatus.w,h:c.h*apparatus.h,cx:apparatus.x+(c.x+c.w/2)*apparatus.w,cy:apparatus.y+(c.y+c.h/2)*apparatus.h};}
 const deviceEdge=(p,q)=>{const dx=q.cx-p.cx,dy=q.cy-p.cy,tx=Math.abs(dx)>0? p.w/(2*Math.abs(dx)):Infinity,ty=Math.abs(dy)>0? p.h/(2*Math.abs(dy)):Infinity,t=Math.min(tx,ty);return [p.cx+dx*t,p.cy+dy*t]};
 for(const p of m.paths){const a=pts[p.from],b=pts[p.to],start=deviceEdge(a,b),end=deviceEdge(b,a),col=p.kind==='measurement'?'#315A72':p.kind==='control'?'#A66A2B':'#87939A';const line=stroke(s,[start,end],col,p.kind==='measurement'?7:3,p.kind==='reference'?{'stroke-dasharray':'8 7'}:{});line.dataset.role='path';line.dataset.kind=p.kind;line.dataset.source=p.source;el('circle',{cx:end[0],cy:end[1],r:p.kind==='measurement'?7:5,fill:col},s);}
 for(const c of m.components){const p=pts[c.id],fill=deviceColors[c.role]||'#40474B';const r=el('rect',{x:p.x,y:p.y,width:p.w,height:p.h,rx:10,fill,opacity:.94,stroke:'#182B38','stroke-width':2,'data-role':'component','data-component':c.id,'data-source':c.source},s);visualText(s,p.cx,p.cy+7,c.label,{size:22,weight:700,fill:'#FFFFFF',anchor:'middle'});}
 const legend=[['#315A72','测量路径'],['#A66A2B','控制路径'],['#87939A','参考路径']];legend.forEach(([fill,label],i)=>{const x=apparatus.x+26+i*270;stroke(s,[[x,apparatus.y+apparatus.h-38],[x+35,apparatus.y+apparatus.h-38]],fill,i===0?7:3);visualText(s,x+48,apparatus.y+apparatus.h-31,label,{size:18,fill:'#586975'});});
 visualText(s,panel.x+26,panel.y+58,`单位：${m.unit}`,{size:20,fill:'#586975'});m.readings.forEach((r,i)=>{const y=panel.y+110+i*150,st=deviceStatusStyle[r.status];visualText(s,panel.x+26,y,r.label,{size:25,weight:700,fill:'#182B38'});el('rect',{x:panel.x+26,y:y+20,width:110,height:32,rx:16,fill:st.fill,opacity:.15,stroke:st.fill});visualText(s,panel.x+81,y+42,{measured:'已测',missing:'缺失',planned:'计划'}[r.status],{size:17,fill:st.fill,anchor:'middle'});if(r.status==='measured')visualText(s,panel.x+170,y+44,deviceFmt(r.value),{size:34,weight:800,fill:'#182B38'});else stroke(s,[[panel.x+180,y+36],[panel.x+300,y+36]],st.fill,4,{ 'stroke-dasharray':st.dash });visualText(s,panel.x+26,y+78,`${r.source} · ${r.componentId}`,{size:16,fill:'#65747A'});});
 visualText(s,margin,H-64,m.note,{size:19,fill:'#586975'});return visualFinish(s,{family:'device-measurement',width:W,height:H,components:m.components,paths:m.paths,readings:m.readings,unit:m.unit,sourceTraceability:{components:m.components.map(c=>c.source),paths:m.paths.map(p=>p.source),readings:m.readings.map(r=>r.source)},compositionReference:'nature-device-measurement',aestheticApproval:'not-assessed'});
}




