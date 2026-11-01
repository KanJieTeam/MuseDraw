import {conditionComparisonModel} from './condition-comparison-models.mjs';
import {el} from './svg.mjs';
import {visualPage,visualText,visualFinish,stroke} from './visual-tools.mjs';

const statusLabel={measured:'已测',missing:'缺失',planned:'计划',conditional:'有条件'};
const statusStyle={measured:{fill:'#1F516C',dash:null},missing:{fill:'#87939A',dash:'6 5'},planned:{fill:'#A66A2B',dash:'2 6'},conditional:{fill:'#4D6A57',dash:'10 5'}};
const fmt=n=>Number(n).toFixed(2).replace(/\.00$/,'');

/** A bounded comparison composition: one declared substrate, one shared scale,
 * and condition rows that encode only supplied states. */
export function conditionComparisonFigure(input){
 const m=conditionComparisonModel(input),W=1600,margin=72,top=64,rowH=138,baselineX=margin,baselineW=410,rightX=540,rightW=W-rightX-margin,H=top+150+m.conditions.length*rowH+130;
 const s=visualPage(W,H,'#F8F7F2');
 visualText(s,margin,top,m.title,{size:42,weight:700,fill:'#182B38'});
 visualText(s,margin,top+54,m.question,{size:24,fill:'#586975'});stroke(s,[[margin,top+84],[W-margin,top+84]],'#B8C1C2',1);
 visualText(s,baselineX,top+130,'共同底物',{size:22,weight:700,fill:'#182B38'});
 visualText(s,rightX,top+130,`条件变化（同一尺度 ${m.unit}）`,{size:22,weight:700,fill:'#182B38'});
 const substrateY=top+154,total=m.substrate.segments.reduce((a,q)=>a+q.weight,0);let sx=baselineX;
 for(const [i,q] of m.substrate.segments.entries()){const sw=baselineW*q.weight/total;const rect=el('rect',{x:sx,y:substrateY,width:sw,height:72,fill:i%2?'#DDE4E5':'#E9EDE8',stroke:'#65747A','data-role':'substrate-segment','data-segment':q.id,'data-source':m.substrate.source},s);visualText(s,sx+sw/2,substrateY+43,q.label,{size:20,fill:'#263C45',anchor:'middle'});sx+=sw;}
 visualText(s,baselineX,substrateY+106,`${m.substrate.label} · ${m.substrate.source}`,{size:18,fill:'#65747A'});
 const plotX=rightX+360,plotW=rightW-400,scaleY=top+192;stroke(s,[[plotX,scaleY],[plotX+plotW,scaleY]],'#AAB6B9',1);
 for(let i=0;i<=4;i++){const x=plotX+plotW*i/4;stroke(s,[[x,scaleY-10],[x,scaleY+10]],'#AAB6B9',1);visualText(s,x,scaleY-18,fmt(m.scale.min+(m.scale.max-m.scale.min)*i/4),{size:16,fill:'#65747A',anchor:'middle'});}
 const baseX=plotX+plotW*(m.baseline.value-m.scale.min)/(m.scale.max-m.scale.min);stroke(s,[[baseX,scaleY-17],[baseX,scaleY+17]],'#182B38',4);visualText(s,baseX,scaleY+42,`基线 ${fmt(m.baseline.value)}`,{size:17,fill:'#182B38',anchor:'middle'});visualText(s,rightX,scaleY+34,m.baseline.source,{size:17,fill:'#65747A'});
 m.conditions.forEach((q,i)=>{const y=top+230+i*rowH,cy=y+32,style=statusStyle[q.status];if(i<m.conditions.length-1)stroke(s,[[rightX,y+rowH-8],[W-margin,y+rowH-8]],'#D8DEDE',1);const label=visualText(s,rightX,cy,q.label,{size:24,weight:700,fill:'#182B38'});label.dataset.role='condition-label';label.dataset.source=q.source;el('rect',{x:rightX+190,y:cy-22,width:86,height:30,rx:15,fill:style.fill,opacity:.15,stroke:style.fill},s);visualText(s,rightX+233,cy-1,statusLabel[q.status],{size:16,fill:style.fill,anchor:'middle'});
  if(q.status==='measured'){const x=plotX+plotW*(q.value-m.scale.min)/(m.scale.max-m.scale.min),mark=stroke(s,[[x,cy-26],[x,cy+26]],style.fill,6);mark.dataset.role='condition-marker';mark.dataset.condition=q.id;mark.dataset.source=q.source;visualText(s,x+12,cy-46,`${fmt(q.value)} · Δ ${fmt(q.value-m.baseline.value)}`,{size:17,fill:style.fill});}
  else if(q.status==='conditional'){const x1=plotX+plotW*(q.range[0]-m.scale.min)/(m.scale.max-m.scale.min),x2=plotX+plotW*(q.range[1]-m.scale.min)/(m.scale.max-m.scale.min),range=stroke(s,[[x1,cy],[x2,cy]],style.fill,8,{ 'stroke-dasharray':style.dash});range.dataset.role='condition-range';range.dataset.condition=q.id;range.dataset.source=q.source;visualText(s,x1,cy-25,`${fmt(q.range[0])}–${fmt(q.range[1])} · 条件范围`,{size:17,fill:style.fill});}
  else {const box=el('rect',{x:plotX-8,y:cy-8,width:16,height:16,fill:'none',stroke:style.fill,'stroke-width':3,'stroke-dasharray':style.dash,'data-role':'condition-placeholder','data-condition':q.id,'data-source':q.source},s);}
  visualText(s,rightX,cy+52,`${q.source}${q.changedSegmentId?` · 改变区：${m.substrate.segments.find(x=>x.id===q.changedSegmentId).label}`:''}`,{size:17,fill:'#65747A'});
 });
 visualText(s,margin,H-50,m.note,{size:18,fill:'#586975'});
 return visualFinish(s,{family:'condition-comparison',width:W,height:H,substrate:m.substrate,baseline:m.baseline,conditions:m.conditions,scale:m.scale,sourceTraceability:{substrate:m.substrate.source,baseline:m.baseline.source,conditions:m.conditions.map(q=>q.source)},compositionReference:'nature-condition-comparison',aestheticApproval:'not-assessed'});
}

export function conditionComparisonFamilies(){return {'condition-comparison':conditionComparisonFigure};}
