import {el} from './svg.mjs';
import {visualPage,visualText,visualFontBounds,measureVisual,measuredVisualPlan,visualFinish,stroke} from './visual-tools.mjs';
import {numericDisplay} from './quantitative.mjs';
import {multiPanelEvidenceModel} from './multi-panel-evidence-models.mjs';

const mpePalette={ink:'#1E2A32',muted:'#66737B',rule:'#CBD5D9',paper:'#F8FAFB',lead:'#1B647A',confirmed:'#2E7D63',partial:'#C58B36',missing:'#9AA5AA',blocked:'#B34B43',na:'#D7DDE0'};
const mpeStatusLabel={confirmed:'已确认',partial:'部分证据',missing:'未提供',blocked:'待处理','not-applicable':'不适用'};
const mpeRoleLabel={overview:'总览',comparison:'比较',detail:'细节',validation:'核验'};

export function multiPanelEvidenceFigure(input){
 const m=multiPanelEvidenceModel(input),W=1800,margin=84,gap=30,innerW=W-margin*2,plotHeight=260;
 const plan=(text,width,size=20,weight=400,max=3)=>measuredVisualPlan(text,width,{size,weight,max});
 const title=plan(m.title,innerW,48,800,2),sub=plan(m.subtitle,innerW,22,400,2),question=plan('读者问题：'+m.question,innerW,20,600,2),note=plan(m.note,innerW,18,400,3);
 const textPlans=[];
 const draw=(svg,x,top,p,{fill=mpePalette.ink,anchor='start',...attrs}={})=>p.lines.map((text,i)=>{
  const node=visualText(svg,x,top+p.ascent+i*p.step,text,{size:p.size,weight:p.weight,role:p.role,fill,anchor});
  for(const [key,value]of Object.entries(attrs))node.setAttribute(key,value);
  const width=measureVisual(text,p.size,p.role,p.weight),bounds=visualFontBounds(text,p.size,p.role,p.weight),shift=anchor==='middle'?-width/2:anchor==='end'?-width:0;
  textPlans.push({text,x:x+shift-1,y:top+i*p.step,width:width+2,height:bounds.ascent+bounds.descent+2});return node;
 });
 function headerPlan(p,w){
  const role=plan('A  '+mpeRoleLabel[p.role],w-40,15,800,1),heading=plan(p.title,w-40,25,800,2),sample=plan('样本定义：'+p.sampleDefinition,w-40,15,400,3);
  const source=plan('来源：'+p.sourceIds.map(id=>m.sources.find(s=>s.id===id).label).join('；'),w-40,14,400,3);
  return {role,heading,sample,source,height:18+role.height+10+heading.height+8+sample.height+5+source.height+22};
 }
 function plotPlan(p,w){
  const ticks=[0,m.sharedDomain[1]].map(value=>({value,label:numericDisplay(value),text:plan(numericDisplay(value),w-80,14,400,1)}));
  const left=Math.max(58,20+Math.max(...ticks.map(t=>t.text.width))+12),right=w-22,plotW=right-left,cw=plotW/p.categories.length;
  if(cw<36)throw Error('Panel '+p.id+': plot categories exceed the readable width');
  const categories=p.categories.map(c=>plan(c,cw-8,14,400,3)),categoryHeight=Math.max(...categories.map(c=>c.height));
  const topPad=Math.max(...ticks.map(t=>t.text.height))/2+2,legend=[];let lx=0,ly=0,lineH=0;
  for(const group of m.groups.filter(g=>p.series.some(s=>s.groupId===g.id))){
   const text=plan(group.label,w-76,14,400,2),width=18+text.width;
   if(lx&&lx+width>w-40){ly+=lineH+10;lx=0;lineH=0}
   legend.push({group,text,x:lx,y:ly});lx+=width+26;lineH=Math.max(lineH,text.height);
  }
  const legendHeight=ly+lineH,legendTop=topPad+plotHeight+12+categoryHeight+18;
  return {ticks,left,right,plotW,cw,categories,topPad,legend,legendTop,height:legendTop+legendHeight+22};
 }
 function tablePlan(p,w){
  const labelW=Math.min(190,w*.29),cellW=(w-40-labelW)/p.columns.length;
  const columns=p.columns.map(c=>plan(c.label,cellW-16,15,700,3)),headerHeight=Math.max(...columns.map(c=>c.height))+20;
  const rows=p.rows.map(r=>{
   const label=plan(r.label,labelW-14,15,600,3),cells=r.cells.map(c=>{
    const status=plan(mpeStatusLabel[c.status],cellW-42,14,400,3),note=c.note?plan(c.note,cellW-24,14,400,5):null;
    return {...c,statusText:status,noteText:note,height:status.height+(note?8+note.height:0)};
   });
   return {row:r,label,cells,height:Math.max(label.height,...cells.map(c=>c.height))+24};
  });
  return {labelW,cellW,columns,headerHeight,rows,height:headerHeight+rows.reduce((s,r)=>s+r.height,0)+22};
 }
 function textPlan(p,w){
  const blocks=p.blocks.map(b=>{const label=plan(b.label,w-88,18,800,3),text=plan(b.text,w-88,16,400,8);return {block:b,label,text,height:Math.max(32,label.height+8+text.height)+22}});
  return {blocks,height:blocks.reduce((s,b)=>s+b.height,0)+8};
 }
 const ordered=[...m.panels].sort((a,b)=>a.role==='overview'?-1:b.role==='overview'?1:0);
 const rows=ordered.length===3?[[ordered[0]],[ordered[1],ordered[2]]]:[[ordered[0],ordered[1]],[ordered[2],ordered[3]]];
 const layouts=rows.map(row=>{
  const available=innerW-gap*(row.length-1),total=row.reduce((s,p)=>s+p.weight,0);let consumed=0;
  const panels=row.map((p,i)=>{
   const width=i===row.length-1?available-consumed:Math.floor(available*p.weight/total);consumed+=width;
   const header=headerPlan(p,width),body=p.kind==='plot'?plotPlan(p,width):p.kind==='table'?tablePlan(p,width):textPlan(p,width);
   return {panel:p,width,header,body};
  });
  // Share the body origin within a row and plot height across all rows:
  // equal quantities retain equal pixel heights even when headers wrap.
  const headerHeight=Math.max(...panels.map(p=>p.header.height));
  return {panels,headerHeight,height:headerHeight+Math.max(...panels.map(p=>p.body.height))};
 });
 const headerBottom=48+title.height+12+sub.height+18+question.height+28,bodyTop=headerBottom+22;
 const H=bodyTop+layouts.reduce((sum,row)=>sum+row.height,0)+gap*(layouts.length-1)+note.height+48;
 const svg=visualPage(W,H,mpePalette.paper),geometryPanels=[];
 draw(svg,margin,48,title);draw(svg,margin,48+title.height+12,sub,{fill:mpePalette.muted});draw(svg,margin,48+title.height+12+sub.height+18,question,{fill:mpePalette.lead});
 stroke(svg,[[margin,headerBottom-14],[W-margin,headerBottom-14]],mpePalette.rule,1.5);
 function renderHeader(p,h,x,y){
  let top=y+18;draw(svg,x+20,top,{...h.role,lines:[String.fromCharCode(65+geometryPanels.length)+'  '+mpeRoleLabel[p.role]]},{fill:p.role==='overview'?mpePalette.lead:mpePalette.muted});
  top+=h.role.height+10;draw(svg,x+20,top,h.heading);top+=h.heading.height+8;draw(svg,x+20,top,h.sample,{fill:mpePalette.muted});top+=h.sample.height+5;draw(svg,x+20,top,h.source,{fill:mpePalette.muted});
 }
 function renderPlot(p,b,x,y){
  const left=x+b.left,right=x+b.right,top=y+b.topPad,bottom=top+plotHeight,max=m.sharedDomain[1],bars=[],whiskers=[];
  for(let i=0;i<=4;i++){const yy=bottom-plotHeight*i/4;stroke(svg,[[left,yy],[right,yy]],mpePalette.rule,1,{'data-role':'panel-grid'})}
  for(const tick of b.ticks){const yy=bottom-(tick.value/max)*plotHeight;draw(svg,left-10,yy-tick.text.height/2,tick.text,{fill:mpePalette.muted,anchor:'end','data-role':'panel-tick','data-panel':p.id,'data-value':tick.value})}
  stroke(svg,[[left,top],[left,bottom],[right,bottom]],mpePalette.ink,1.2);
  for(const [si,s]of p.series.entries())for(let i=0;i<s.values.length;i++){
   const value=s.values[i],barW=Math.min(24,b.cw/(p.series.length+1)),xx=left+b.cw*(i+.5)+(si-(p.series.length-1)/2)*barW,yy=bottom-(value/max)*plotHeight;
   el('rect',{x:xx-barW*.42,y:yy,width:barW*.84,height:bottom-yy,fill:s.group.color,'data-role':'panel-observation','data-panel':p.id,'data-group':s.groupId,'data-category':p.categories[i],'data-value':value},svg);
   if(s.uncertainty){
    const low=s.uncertainty.low[i],high=s.uncertainty.high[i],lo=bottom-(low/max)*plotHeight,hi=bottom-(high/max)*plotHeight;
    stroke(svg,[[xx,hi],[xx,lo]],mpePalette.ink,1.5,{'data-role':'uncertainty-whisker','data-panel':p.id,'data-group':s.groupId,'data-category':p.categories[i]});
    stroke(svg,[[xx-5,hi],[xx+5,hi]],mpePalette.ink,1.5);stroke(svg,[[xx-5,lo],[xx+5,lo]],mpePalette.ink,1.5);
    whiskers.push({groupId:s.groupId,category:p.categories[i],low,high,x:xx,lowY:lo,highY:hi});
   }
   bars.push({groupId:s.groupId,category:p.categories[i],value,x:xx,y:yy,width:barW*.84,height:bottom-yy});
  }
  b.categories.forEach((c,i)=>draw(svg,left+b.cw*(i+.5),bottom+12,c,{fill:mpePalette.muted,anchor:'middle'}));
  for(const item of b.legend){const ly=y+b.legendTop+item.y,lx=x+20+item.x;el('rect',{x:lx,y:ly+(item.text.height-12)/2,width:12,height:12,fill:item.group.color},svg);draw(svg,lx+18,ly,item.text,{fill:mpePalette.muted})}
  return {domain:[0,max],plot:{left,right,top,bottom,height:plotHeight},bars,whiskers};
 }
 function renderTable(p,b,x,y){
  const gridX=x+20,cells=[];
  b.columns.forEach((c,i)=>{const xx=gridX+b.labelW+i*b.cellW;el('rect',{x:xx,y,width:b.cellW,height:b.headerHeight,fill:'#E9EFF1',stroke:mpePalette.paper,'stroke-width':2},svg);draw(svg,xx+b.cellW/2,y+(b.headerHeight-c.height)/2,c,{anchor:'middle'})});
  let yy=y+b.headerHeight;
  for(const r of b.rows){
   draw(svg,gridX,yy+(r.height-r.label.height)/2,r.label);
   r.cells.forEach((c,ci)=>{
    const xx=gridX+b.labelW+ci*b.cellW,top=yy+(r.height-c.height)/2;
    el('rect',{x:xx,y:yy,width:b.cellW,height:r.height,fill:mpePalette.paper,stroke:mpePalette.rule,'stroke-width':1},svg);
    el('circle',{cx:xx+19,cy:top+c.statusText.height/2,r:6,fill:mpePalette[c.status==='not-applicable'?'na':c.status]},svg);
    draw(svg,xx+32,top,c.statusText,{fill:mpePalette.muted});
    if(c.noteText)draw(svg,xx+12,top+c.statusText.height+8,c.noteText,{'data-role':'cell-note','data-row':r.row.id,'data-column':p.columns[ci].id});
    cells.push({row:r.row.id,column:p.columns[ci].id,status:c.status,...(c.note?{note:c.note}:{}),x:xx,y:yy,width:b.cellW,height:r.height});
   });yy+=r.height;
  }
  return {cells};
 }
 function renderText(p,b,x,y){
  const blocks=[];let yy=y;
  for(const [i,item]of b.blocks.entries()){
   const number=plan(String(i+1),24,13,800,1);el('circle',{cx:x+30,cy:yy+item.label.height/2,r:14,fill:i===0?mpePalette.lead:'#DCE6E9'},svg);
   draw(svg,x+30,yy+(item.label.height-number.height)/2,number,{fill:i===0?'#fff':mpePalette.ink,anchor:'middle'});
   draw(svg,x+58,yy,item.label);draw(svg,x+58,yy+item.label.height+8,item.text,{fill:mpePalette.muted});
   blocks.push({...item.block,x:x+20,y:yy,width:b.width,height:item.height});yy+=item.height;
  }
  return {blocks};
 }
 let y=bodyTop;
 for(const row of layouts){let x=margin;for(const item of row.panels){
  const {panel:p,width:w,header,body}=item;
  el('rect',{x,y,width:w,height:row.height,fill:'#FFFFFF',stroke:p.role==='overview'?mpePalette.lead:mpePalette.rule,'stroke-width':p.role==='overview'?2:1.2,'data-role':'evidence-panel','data-panel':p.id},svg);
  renderHeader(p,header,x,y);const bodyY=y+row.headerHeight;
  const content=p.kind==='plot'?renderPlot(p,body,x,bodyY):p.kind==='table'?renderTable(p,body,x,bodyY):renderText(p,{...body,width:w-40},x,bodyY);
  geometryPanels.push({id:p.id,role:p.role,kind:p.kind,x,y,width:w,height:row.height,weight:p.weight,sourceIds:[...p.sourceIds],content});x+=w+gap;
 }y+=row.height+gap}
 draw(svg,margin,H-note.height-28,note,{fill:mpePalette.muted});
 return visualFinish(svg,{family:'multi-panel-evidence',width:W,height:H,title:m.title,subtitle:m.subtitle,question:m.question,evidenceKind:m.evidenceKind,scalePolicy:m.scalePolicy,sharedDomain:m.sharedDomain,panels:geometryPanels,traceability:m.traceability,textPlans,note:m.note,compositionReference:'multi-panel-evidence',aestheticApproval:'not-assessed'});
}

export function multiPanelEvidenceFamilies(){return {'multi-panel-evidence':multiPanelEvidenceFigure}}
