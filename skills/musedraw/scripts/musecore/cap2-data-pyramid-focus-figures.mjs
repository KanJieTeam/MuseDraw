import {el} from './svg.mjs';
import {visualPage,visualText,visualFontBounds,visualFinish,stroke} from './visual-tools.mjs';
import {axisNumber,linearScale} from './quantitative.mjs';
import {cap2DataPyramidFocusModel} from './cap2-data-pyramid-focus-models.mjs';

export function cap2DataPyramidFocusFigure(input){
 // Measure actual fallback SVG ink together with the canvas font line box.
 // This per-render cache cannot retain measurements from a previous font.
 const probe=el('svg',{'aria-hidden':'true',width:1,height:1,style:'position:fixed;left:-10000px;top:-10000px;visibility:hidden;pointer-events:none'},document.body),measured=new Map();
 try{
 function metrics(text,size=20,weight=400){
  const key=JSON.stringify([text,size,weight]);if(measured.has(key))return measured.get(key);
  const node=visualText(probe,0,0,text,{size,weight}),box=node.getBBox(),advance=node.getComputedTextLength(),font=visualFontBounds(text,size,'sans',weight);node.remove();
  const left=Math.floor(Math.min(0,box.x)),right=Math.ceil(Math.max(advance,box.x+box.width)),ascent=Math.ceil(Math.max(font.ascent,-box.y)),descent=Math.ceil(Math.max(font.descent,box.y+box.height));
  if(![advance,left,right,ascent,descent].every(Number.isFinite)||advance<0||right<left||(text.trim()&&(advance===0||right===left)))throw Error('Data SVG text measurement unavailable');
  const value={advance,left,right,width:right-left,ascent,descent};measured.set(key,value);return value;
 }
 function measure(text,size=20,role='sans',weight=400){return metrics(text,size,weight).width}
 function linesFor(text,width,{size=20,weight=400,max=5}={}){
  const lines=[];for(const paragraph of text.split('\n')){if(!paragraph.trim())throw Error('Empty explicit text line');let part='';for(const ch of paragraph){if(part&&metrics(part+ch,size,weight).width>width){lines.push(part);part=''}if(metrics(ch,size,weight).width>width)throw Error('Glyph exceeds available text width');part+=ch}if(part)lines.push(part)}
  if(lines.length>max)throw Error(`Text exceeds ${max} lines at ${size}px: ${text.slice(0,60)}`);return lines;
 }

 const m=cap2DataPyramidFocusModel(input),W=2160,margin=80,left=740,right=900,extent=570,sideX=1670,sideWidth=410,ink='#233C50',muted='#5D6D77',grid='#E5E9EB';
 const plan=(t,w,size=20,weight=400,max=5)=>{const lines=linesFor(t,w,{size,weight,max}),bounds=lines.map(s=>metrics(s,size,weight)),ascent=Math.max(...bounds.map(b=>b.ascent)),descent=Math.max(...bounds.map(b=>b.descent)),step=Math.max(size*1.35,ascent+descent+5);return {lines,size,weight,ascent,descent,step,height:ascent+descent+(lines.length-1)*step}};
 const title=plan(m.title,W-margin*2,44,800,3),subtitle=plan(m.subtitle,W-margin*2,23,400,4),lhead=plan(m.leftLabel,500,26,700,3),rhead=plan(m.rightLabel,500,26,700,3),tick=plan('0123456789.',300,18,400,1),unit=plan(m.unit,600,20,400,3),titleY=48,subtitleY=titleY+title.height+18,headY=subtitleY+subtitle.height+42,top=headY+Math.max(lhead.height,rhead.height)+24,S=linearScale(m.domain.domain,[0,extent]);
 let y=top;const rows=[...m.bands].reverse().map(b=>{const label=plan(b.label,right-left-14,20,700,3),selected=m.selectedIds.includes(b.id),total=selected?plan(axisNumber(b.total)+' '+m.unit,142,19,700,4):null,height=Math.max(34,label.height+10,(total?.height??0)+10),result={...b,labelPlan:label,totalPlan:total,selected,y,height};y+=height+6;return result}),bottom=y-6;
 const side=[],push=(text,size=21,weight=400,gap=12,max=5,color=ink)=>{const p=plan(text,sideWidth,size,weight,max);side.push({p,gap,color});};
 push('给定集合的计数比',25,700,22);push(m.focus.numeratorLabel,26,700,10);push('成员：'+m.numerator.map(b=>b.label).join('、'),19,400,12,8,muted);push(axisNumber(m.numeratorTotal)+' '+m.unit,36,800,24,4,'#2E4A5F');push(m.focus.denominatorLabel,26,700,10);push('成员：'+m.denominator.map(b=>b.label).join('、'),19,400,12,8,muted);push(axisNumber(m.denominatorTotal)+' '+m.unit,36,800,26,4,'#7A5232');
 push('分子合计 / 分母合计',20,400,10,3,muted);push(m.ratio===null?'未定义':Number(m.ratio.toPrecision(5)).toString()+' 倍',48,800,12,4);push(m.ratio===null?'分母合计为 0，没有计算比值。':'比值按两集合的给定计数合计计算。',20,400,18,5,muted);if(m.overlap.length)push('两集合重叠：'+m.overlap.map(id=>m.bands.find(b=>b.id===id).label).join('、')+'；本图没有把它们当作互斥总体。',19,400,12,8,muted);push(m.focus.note,20,400,0,10,muted);
 const sideHeight=side.reduce((s,row)=>s+row.p.height+row.gap,0),axisY=bottom+18,unitY=axisY+tick.height+14,footer=plan(m.note,W-2*margin,20,400,10),footerY=Math.max(unitY+unit.height,top+sideHeight)+52,H=Math.ceil(footerY+footer.height+46),svg=visualPage(W,H,'#FFFFFF'),textPlans=[];
 function draw(x,y,p,color=ink,anchor='start'){p.lines.forEach((t,i)=>{visualText(svg,x,y+p.ascent+i*p.step,t,{size:p.size,weight:p.weight,fill:color,anchor});const b=metrics(t,p.size,p.weight),shift=anchor==='middle'?-b.advance/2:anchor==='end'?-b.advance:0,left=Math.floor(x+shift+b.left),top=Math.floor(y+i*p.step),right=Math.ceil(x+shift+b.right),bottom=Math.ceil(y+i*p.step+p.ascent+p.descent);textPlans.push({text:t,x:left,y:top,width:right-left,height:bottom-top})})}
 draw(margin,titleY,title);draw(margin,subtitleY,subtitle,muted);draw(left-extent/2,headY,lhead,'#2E4A5F','middle');draw(right+extent/2,headY,rhead,'#7A5232','middle');
 for(const value of m.domain.ticks){for(const x of [left-S(value),right+S(value)]){stroke(svg,[[x,top-8],[x,bottom+8]],grid,1,{'data-role':'background-grid'});draw(x,axisY,plan(axisNumber(value),160,18,400,1),muted,'middle')}}draw(right+extent,unitY,unit,muted,'end');
 const bands=rows.map(b=>{const lw=S(b.left),rw=S(b.right),barY=b.y+4,barHeight=b.height-8,totalX=right+rw+18;el('rect',{x:left-lw,y:barY,width:lw,height:barHeight,fill:b.selected?'#2E4A5F':'#8CA0B0','data-band':b.id,'data-side':'left'},svg);el('rect',{x:right,y:barY,width:rw,height:barHeight,fill:b.selected?'#7A5232':'#C9AE96','data-band':b.id,'data-side':'right'},svg);draw((left+right)/2,b.y+(b.height-b.labelPlan.height)/2,b.labelPlan,b.selected?ink:muted,'middle');if(b.totalPlan){const ty=b.y+(b.height-b.totalPlan.height)/2;el('rect',{x:totalX-4,y:ty-2,width:150,height:b.totalPlan.height+4,fill:'#FFFFFF','data-role':'label-backing'},svg);draw(totalX,ty,b.totalPlan,ink)}const {labelPlan,totalPlan,...base}=b;return {...base,leftWidth:lw,rightWidth:rw,barY,barHeight,totalX:b.totalPlan?totalX:null}});
 stroke(svg,[[sideX-28,top],[sideX-28,top+sideHeight]],'#2E4A5F',2);let sy=top;for(const row of side){draw(sideX,sy,row.p,row.color);sy+=row.p.height+row.gap}draw(margin,footerY,footer,muted);
 return visualFinish(svg,{family:'pyramid',variant:'declared-focus-sets',width:W,height:H,bands,domain:m.domain.domain,selectedIds:m.selectedIds,focus:m.focus,numeratorTotal:m.numeratorTotal,denominatorTotal:m.denominatorTotal,ratio:m.ratio,overlap:m.overlap,note:m.note,textPlans,scale:extent/m.domain.domain[1],scope:m.scope,compositionReference:'d07-renkou-jinzita',aestheticApproval:'not-assessed'});
 }finally{probe.remove()}
}
