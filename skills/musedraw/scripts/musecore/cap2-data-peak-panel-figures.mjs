import {el} from './svg.mjs';
import {visualPage,visualText,visualFontBounds,visualFinish,stroke} from './visual-tools.mjs';
import {axisNumber,linearScale} from './quantitative.mjs';
import {cap2DataPeakPanelModel} from './cap2-data-peak-panel-models.mjs';

export function cap2DataPeakPanelFigure(input){
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

 const m=cap2DataPeakPanelModel(input),W=1800,margin=80,gap=48,cols=m.series.length===2?2:3,panelW=(W-margin*2-gap*(cols-1))/cols,ink='#233B50',muted='#62727C',grid='#E3EAEE';
 const plan=(text,width,size=20,weight=400,max=5)=>{const lines=linesFor(text,width,{size,weight,max}),bounds=lines.map(t=>metrics(t,size,weight)),ascent=Math.max(...bounds.map(b=>b.ascent)),descent=Math.max(...bounds.map(b=>b.descent)),step=Math.max(size*1.35,ascent+descent+5);return {lines,size,weight,ascent,descent,step,height:ascent+descent+(lines.length-1)*step}};
 const title=plan(m.title,W-margin*2,44,800,3),subtitle=plan(m.subtitle,W-margin*2,23,400,4),key=plan('类别顺序：'+m.categories.join(' → '),W-margin*2,19,400,8),scaleNote=plan('共同纵轴从 0 开始；单位：'+m.unit+'。深蓝色表示每组全部并列最大值。',W-margin*2,20,400,4),titleY=48,subtitleY=titleY+title.height+18,keyY=subtitleY+subtitle.height+20,scaleY=keyY+key.height+12,top=scaleY+scaleNote.height+34;
 const tick=plan('0123456789.',300,17,400,1),leftInset=Math.max(46,...m.domain.ticks.map(v=>measure(axisNumber(v),17)+16)),plotW=panelW-leftInset-16;if(plotW<280)throw Error('Numeric axis exceeds panel reading width; rescale supplied units');
 const prepared=m.series.map(g=>{const heading=plan(g.label,panelW,26,700,4),total=plan('合计 '+axisNumber(g.total)+' '+m.unit,panelW,20,400,4),peakLines=[];let current='最大值 '+axisNumber(g.maximum)+' '+m.unit+'；对应类别：';for(const category of g.peakCategories){if(measure(category,20,'sans',700)>panelW)throw Error('A complete peak category exceeds panel width at fixed 20px; shorten the supplied label or choose a wider composition');const separator=current.endsWith('：')?'':'、';if(measure(current+separator+category,20,'sans',700)>panelW){peakLines.push(current);current=category}else current+=separator+category}peakLines.push(current);const peaks=plan(peakLines.join('\n'),panelW,20,700,18),note=g.note===undefined?null:plan(g.note,panelW,19,400,8);return {...g,heading,totalPlan:total,peakPlan:peaks,notePlan:note,headHeight:heading.height+12+total.height+9+peaks.height+(note?12+note.height:0)}});
 const xPlans=m.categories.map(c=>plan(c,Math.max(120,plotW/3),17,400,3)),axisHeight=Math.max(...xPlans.map(p=>p.height)),plotHeight=Math.max(290,(m.domain.ticks.length-1)*(tick.height+10)),rows=[];let cursor=top;
 for(let i=0;i<prepared.length;i+=cols){const members=prepared.slice(i,i+cols),headerHeight=Math.max(...members.map(g=>g.headHeight)),plotTop=cursor+headerHeight+tick.height/2+24,plotBottom=plotTop+plotHeight,axisY=plotBottom+18,bottom=axisY+axisHeight;rows.push({members,top:cursor,plotTop,plotBottom,axisY,bottom});cursor=bottom+42}
 const footer=plan(m.note,W-margin*2,20,400,10),footerY=cursor+8,H=Math.ceil(footerY+footer.height+44),svg=visualPage(W,H,'#FFFFFF'),textPlans=[],panels=[];
 function draw(x,y,p,color=ink,anchor='start'){p.lines.forEach((t,i)=>{visualText(svg,x,y+p.ascent+i*p.step,t,{size:p.size,weight:p.weight,fill:color,anchor});const b=metrics(t,p.size,p.weight),shift=anchor==='middle'?-b.advance/2:anchor==='end'?-b.advance:0,left=Math.floor(x+shift+b.left),top=Math.floor(y+i*p.step),right=Math.ceil(x+shift+b.right),bottom=Math.ceil(y+i*p.step+p.ascent+p.descent);textPlans.push({text:t,x:left,y:top,width:right-left,height:bottom-top})})}
 draw(margin,titleY,title);draw(margin,subtitleY,subtitle,muted);draw(margin,keyY,key,muted);draw(margin,scaleY,scaleNote,muted);
 for(const row of rows)row.members.forEach((g,j)=>{const x=margin+j*(panelW+gap),left=x+leftInset,right=x+panelW-16,cw=(right-left)/m.categories.length,Y=linearScale(m.domain.domain,[row.plotBottom,row.plotTop]);let y=row.top;draw(x,y,g.heading);y+=g.heading.height+12;draw(x,y,g.totalPlan,muted);y+=g.totalPlan.height+9;draw(x,y,g.peakPlan);y+=g.peakPlan.height;if(g.notePlan)draw(x,y+12,g.notePlan,muted);
  for(const value of m.domain.ticks){stroke(svg,[[left,Y(value)],[right,Y(value)]],grid,1,{'data-role':'background-grid'});if(j===0){const p=plan(axisNumber(value),leftInset-10,17,400,1);draw(left-12,Y(value)-p.height/2,p,muted,'end')}}
  const bars=g.values.map((value,k)=>{const bx=left+cw*(k+.12),by=Y(value),width=cw*.76,height=row.plotBottom-by;el('rect',{x:bx,y:by,width,height,fill:g.peakIndices.includes(k)?'#2B689B':'#AFC2D1','data-role':'panel-observation','data-series':g.id,'data-category':k},svg);return {category:m.categories[k],value,x:bx,y:by,width,height,peak:g.peakIndices.includes(k)}});
  const chosen=[];for(let k=0;k<m.categories.length;k++){if(k!==0&&k!==m.categories.length-1&&k%Math.ceil(m.categories.length/5)!==0)continue;const p=xPlans[k],xx=left+cw*(k+.5),width=Math.max(...p.lines.map(t=>measure(t,p.size)));if(k===m.categories.length-1)while(chosen.length&&xx-width/2<chosen.at(-1).right+8)chosen.pop();if(chosen.length&&xx-width/2<chosen.at(-1).right+8)continue;chosen.push({index:k,x:xx,p,left:xx-width/2,right:xx+width/2})}for(const label of chosen)draw(label.x,row.axisY,label.p,muted,'middle');
  panels.push({id:g.id,label:g.label,note:g.note??null,values:g.values,total:g.total,maximum:g.maximum,peakIndices:g.peakIndices,peakCategories:g.peakCategories,bars,plot:{left,right,top:row.plotTop,bottom:row.plotBottom},axisLabelIndices:chosen.map(c=>c.index)});
 });
 draw(margin,footerY,footer,muted);return visualFinish(svg,{family:'small-multiples',variant:'all-maxima-summary',width:W,height:H,columns:cols,categories:m.categories,panels,domain:m.domain.domain,textPlans,note:m.note,scope:m.scope,compositionReference:'d02-xiaobeishu-jiangshui',aestheticApproval:'not-assessed'});
 }finally{probe.remove()}
}
