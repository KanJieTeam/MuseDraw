import {el} from './svg.mjs';
import {visualPage,visualText,visualLines,visualFontBounds,measureVisual,visualFinish,stroke} from './visual-tools.mjs';
import {linearScale,labelTrack,axisNumber} from './quantitative.mjs';

export function magnitudeFamilies(h){
 const {fields,list,str,need,unique}=h;
 function powerText(s,x,y,prefix,exponent,suffix='',{size=22,fill='#28302A',anchor='end'}={}){const t=visualText(s,x,y,prefix+'10',{size,fill,anchor});const p=el('tspan',{'baseline-shift':'super','font-size':size*.65},t);p.textContent=String(exponent);if(suffix){const q=el('tspan',{'baseline-shift':'baseline','font-size':size},t);q.textContent=suffix}return t}
 function measuredPlan(text,width,size,weight,max){
  const lines=visualLines(text,width,{size,weight,max}),bounds=lines.map(line=>visualFontBounds(line,size,'sans',weight)),ascent=Math.max(...bounds.map(b=>b.ascent)),descent=Math.max(...bounds.map(b=>b.descent)),step=Math.max(size*1.3,ascent+descent+size*.10);
  return {lines,size,weight,ascent,descent,step,height:ascent+descent+(lines.length-1)*step};
 }
 function drawPlan(s,x,top,plan,fill){plan.lines.forEach((line,i)=>visualText(s,x,top+plan.ascent+i*plan.step,line,{size:plan.size,weight:plan.weight,fill}));}
 function magnitudes(b){
  fields(b,['family','title','subtitle','items','unit','note'],'magnitudes');for(const k of ['title','subtitle','unit','note'])str(b[k],k);list(b.items,3,14,'items');unique(b.items,'items');for(const it of b.items){fields(it,['id','label','value','approximate'],'item');str(it.label,'item.label');need(typeof it.value==='number'&&Number.isFinite(it.value)&&it.value>=1e-100&&it.value<=1e100,'magnitude values must be positive in 1e-100..1e100');need(it.approximate===undefined||typeof it.approximate==='boolean','approximate must be boolean')}
  const values=b.items.map(it=>Math.log10(it.value)),min=Math.floor(Math.min(...values)),max=Math.ceil(Math.max(...values)),domain=min===max?[min-1,max+1]:[min,max];need(domain[1]-domain[0]<=100,'magnitude span exceeds 100 orders');
  const W=1180,oldTitleLines=visualLines(b.title,1020,{size:57,weight:800,max:2}),titleSize=oldTitleLines.length===1?Math.max(57,Math.min(150,Math.floor(57*1020/measureVisual(b.title,57,'sans',800)))):57,
   title=measuredPlan(b.title,1020,titleSize,800,oldTitleLines.length),subtitle=measuredPlan(b.subtitle,1020,22,400,2),note=measuredPlan(b.note,1020,20,400,2),labelPlans=b.items.map(it=>measuredPlan(it.label,490,28,700,2)),
   numberBounds=visualFontBounds('≈ 8.849 × 10 m',23,'sans',400),rowHeight=Math.max(numberBounds.ascent+numberBounds.descent+23*.4,...labelPlans.map(p=>p.height)),gap=Math.max(75,rowHeight+22),
   headingTop=50,subTop=headingTop+title.height+18,top=Math.ceil(subTop+subtitle.height+64),chartHeight=Math.max(1000,(b.items.length-1)*gap+rowHeight+40),
   H=Math.ceil(Math.max(1570,top+chartHeight+note.height+100)),bottom=H-note.height-100,s=visualPage(W,H,'#FCFCF9'),Y=linearScale(domain,[bottom,top]);
  drawPlan(s,80,headingTop,title,'#171C18');drawPlan(s,80,subTop,subtitle,'#727D73');
  el('rect',{x:34,y:top,width:15,height:bottom-top,fill:'#D32D27'},s);stroke(s,[[165,top],[165,bottom]],'#D32D27',2);const stride=Math.max(1,Math.ceil((domain[1]-domain[0])/14)),ticks=[];for(let exponent=domain[0];exponent<=domain[1];exponent+=stride)ticks.push(exponent);if(ticks.at(-1)!==domain[1])ticks.push(domain[1]);for(const exponent of ticks){const y=Y(exponent);stroke(s,[[158,y],[180,y]],'#D32D27',1.5);powerText(s,143,y+8,'',exponent,'',{size:22})}
  const labels=labelTrack(b.items.map((it,i)=>({id:it.id,desired:Y(values[i])})),{top:top+rowHeight/2,bottom:bottom-rowHeight/2,gap}),items=b.items.map((it,i)=>{const y=Y(values[i]),ly=labels[i].placed,plan=labelPlans[i];el('circle',{cx:165,cy:y,r:4,fill:'#D32D27'},s);stroke(s,[[177,y],[235,y],[270,ly]],'#B7C0B8',1);drawPlan(s,290,ly-plan.height/2,plan,'#252D26');const exponent=Math.floor(values[i]),mantissa=it.value/(10**exponent);powerText(s,1100,ly+(numberBounds.ascent-numberBounds.descent)/2,(it.approximate?'≈ ':'')+(mantissa===1?'':axisNumber(mantissa)+' × '),exponent,' '+b.unit,{size:23,fill:'#4C5A4F'});return {...it,logValue:values[i],pointY:y,labelY:ly,exponent,mantissa}});
  drawPlan(s,80,H-40-note.height,note,'#727D73');return visualFinish(s,{family:'magnitudes',width:W,height:H,items,logDomain:domain,tickExponents:ticks,compositionReference:'151-orders-of-magnitude'});
 }
 return {magnitudes};
}
