import {el} from './svg.mjs';
import {LEAVES} from '../../assets/musecore/artwork/leaf-specimens.mjs';
import {measureVisual,visualLines,visualPage,visualText,visualBlock,visualHeading,visualFinish,stroke,number,hex,blend} from './visual-tools.mjs';

export function visualFamilies(h){
 const {need,list,fields,str,unique}=h;
 function rhythm(b){
  fields(b,['family','headline','title','subtitle','beats','patterns','accentBeats','facts','caption'],'rhythm');
  for(const k of ['headline','title','subtitle','caption'])str(b[k],k);need(Number.isInteger(b.beats)&&b.beats>=2&&b.beats<=8,'beats: integer 2–8');
  list(b.patterns,3,12,'patterns');list(b.accentBeats,0,b.beats,'accentBeats');need(new Set(b.accentBeats).size===b.accentBeats.length,'duplicate accent beat');for(const beat of b.accentBeats)need(Number.isInteger(beat)&&beat>=0&&beat<b.beats,'accent beat outside measure');
  list(b.facts,1,3,'facts');b.facts.forEach(f=>{fields(f,['value','label'],'fact');str(f.value,'fact.value');str(f.label,'fact.label')});
  const patterns=b.patterns.map(row=>{list(row,1,24,'notes');return row.map(n=>{fields(n,['at','strength'],'note');number(n.at,'note.at');number(n.strength,'note.strength');need(n.at>=0&&n.at<b.beats&&n.strength>0&&n.strength<=1,'note outside measure or strength range');return n})});
  const W=1200,H=1600,bg='#2340A0',paper='#F4F2EC',yellow='#F2C230',s=visualPage(W,H,bg),x0=120,span=960,rowH=Math.min(100,740/patterns.length),rmax=Math.min(37,rowH*.34),plotY=120;
  const beatSpan=span/b.beats;
  for(let i=0;i<=b.beats;i++)stroke(s,[[x0+beatSpan*i,100],[x0+beatSpan*i,plotY+rowH*patterns.length]],paper,1,{'stroke-opacity':.14});
  const dots=[];patterns.forEach((row,ri)=>row.forEach(n=>{const x=x0+beatSpan*n.at,y=plotY+rowH*(ri+.5),r=rmax*Math.sqrt(n.strength),accent=b.accentBeats.includes(n.at);el('circle',{cx:x,cy:y,r,fill:accent?yellow:paper},s);dots.push({row:ri,at:n.at,x,y,r,accent})}));
  const caption=visualLines(b.caption,960,{size:18,max:2});visualBlock(s,120,plotY+rowH*patterns.length+22,caption,{size:18,fill:paper});
  const headWidth=measureVisual(b.headline,210,'sans',800),headSize=Math.min(210,210*960/headWidth);need(headSize>=100,'headline too long for rhythm display; shorten or choose another composition');
  const hy=Math.max(1080,plotY+rowH*patterns.length+caption.length*24+70);visualText(s,110,hy+headSize*.75,b.headline,{size:headSize,weight:800,fill:paper});
  const title=visualLines(b.title,960,{size:46,weight:700,max:2});const titleTop=hy+headSize*.75+headSize*.22+25;visualBlock(s,120,titleTop,title,{size:46,weight:700,fill:paper});
  const subtitle=visualLines(b.subtitle,960,{size:23,max:2});const subY=titleTop+title.length*59.8+18;visualBlock(s,120,subY,subtitle,{size:23,fill:paper});
  const fy=Math.max(1430,subY+subtitle.length*29.9+40);need(fy+110<1600,'rhythm content exceeds footer budget');stroke(s,[[120,fy-20],[1080,fy-20]],paper,1,{'stroke-opacity':.35});
  const fw=960/b.facts.length;b.facts.forEach((f,i)=>{visualBlock(s,120+i*fw,fy,visualLines(f.value,fw-28,{size:28,weight:700,max:2}),{size:28,weight:700,fill:paper});visualBlock(s,120+i*fw,fy+66,visualLines(f.label,fw-28,{size:17,max:2}),{size:17,fill:paper})});
  return visualFinish(s,{family:'rhythm',width:W,height:H,rowHeight:rowH,headlineSize:headSize,dots,material:{bg,paper,yellow},sourceCase:'p03-caoping-jueshi'});
 }
 function specimen(b){
  fields(b,['family','title','subtitle','species','columns','footer'],'specimen');str(b.title,'title');str(b.subtitle,'subtitle');str(b.footer,'footer');list(b.species,3,9,'species');need(new Set(b.species).size===b.species.length,'duplicate species');
  const selected=b.species.map(id=>{const leaf=LEAVES.find(x=>x.id===id);need(leaf,'Unknown specimen: '+id+'; supply a reviewed drawing through another route');return leaf});
  const columns=b.columns??(selected.length<=4?2:3);need([2,3].includes(columns),'specimen.columns: 2 or 3');
  const W=1200,H=1600,bg='#1F2D27',paper='#F0EDD9',muted='#BAC5AF',s=visualPage(W,H,bg);
  const top=visualHeading(s,b.title,b.subtitle,{x:100,top:95,width:1000,size:78,fill:paper,subFill:muted,role:'serif'}),footerLines=visualLines(b.footer,1000,{size:24,max:2});
  const rows=Math.ceil(selected.length/columns),gridBottom=1400,cellW=1000/columns,cellH=(gridBottom-top)/rows;need(cellH>=260,'specimen grid too dense');
  const objects=[];
  selected.forEach((leaf,i)=>{
   const r=Math.floor(i/columns),c=i%columns,xc=100+(c+.5)*cellW,yc=top+r*cellH;
   const group=el('g',{},s);group.innerHTML=leaf.svg;
   const bb=leaf.bounds,scale=Math.min((cellW-70)/bb.w,(cellH-118)/bb.h,1.8),bx=bb.x+bb.w/2,by=bb.y+bb.h/2;
   group.setAttribute('transform',`translate(${xc} ${yc+(cellH-90)/2}) rotate(${Math.max(-10,Math.min(10,leaf.rotation))}) scale(${scale}) translate(${-bx} ${-by})`);
   const labelTop=yc+cellH-80;visualText(s,xc,labelTop+28,leaf.label,{size:30,role:'serif',fill:paper,anchor:'middle'});
   const latin=visualLines(leaf.latin,cellW-28,{size:18,role:'serif',max:2});visualBlock(s,xc,labelTop+42,latin,{size:18,role:'serif',italic:true,fill:muted,anchor:'middle'});
   objects.push({id:leaf.id,label:leaf.label,latin:leaf.latin,column:c,row:r,scale});
  });
  stroke(s,[[100,1440],[1100,1440]],muted,1,{'stroke-opacity':.4});visualBlock(s,100,1460,footerLines,{size:24,fill:paper});
  visualText(s,1100,1560,`图中 ${selected.length} 种 · 简化叶形插画`,{size:18,fill:muted,anchor:'end'});
  return visualFinish(s,{family:'specimen',width:W,height:H,columns,rows,cellHeight:cellH,objects,sourceCase:'p04-luoye-tujian'});
 }
 function metro(b){
  fields(b,['family','title','subtitle','stages','routes','sharedStages','note'],'metro');for(const k of ['title','subtitle','note'])str(b[k],k);
  list(b.stages,3,7,'stages');list(b.routes,2,4,'routes');list(b.sharedStages,1,b.stages.length,'sharedStages');unique(b.stages,'stages');unique(b.routes,'routes');
  b.stages.forEach(st=>{fields(st,['id','label'],'stage');str(st.label,'stage.label')});const stageSet=new Set(b.stages.map(x=>x.id));
  need(new Set(b.sharedStages).size===b.sharedStages.length,'duplicate shared stage');b.sharedStages.forEach(id=>need(stageSet.has(id),'unknown shared stage'));
  for(const r of b.routes){fields(r,['id','label','color','events'],'route');str(r.label,'route.label');hex(r.color);list(r.events,0,b.stages.length,'events');const seen=new Set();for(const ev of r.events){fields(ev,['stage','label'],'event');need(stageSet.has(ev.stage),'event has unknown stage');need(!b.sharedStages.includes(ev.stage),'shared-stage event belongs to stage label, not an offset route label');need(!seen.has(ev.stage),'duplicate event on route');seen.add(ev.stage);str(ev.label,'event.label')}}
  const W=1600,H=940,s=visualPage(W,H,'#FAFAF5'),titleBottom=visualHeading(s,b.title,b.subtitle,{width:1460,size:52});
  const x0=250,x1=1460,dx=(x1-x0)/(b.stages.length-1),startY=Math.max(300,titleBottom+130),gap=130,ys=b.routes.map((_,i)=>startY+i*gap),mid=(ys[0]+ys.at(-1))/2;
  const sharedGap=18,stages=b.stages.map((st,i)=>({...st,x:x0+i*dx,shared:b.sharedStages.includes(st.id)})),lines=[];
  for(const [ri,r] of b.routes.entries()){
   const normal=ys[ri],points=[];stages.forEach((st,i)=>{const y=st.shared?mid+(ri-(b.routes.length-1)/2)*sharedGap:normal;if(i===0)points.push([st.x,y]);else{const prev=stages[i-1],py=prev.shared?mid+(ri-(b.routes.length-1)/2)*sharedGap:normal,offset=Math.min(65,dx*.24);points.push([prev.x+offset,py],[st.x-offset,y],[st.x,y])}});
   stroke(s,points,r.color,10,{'stroke-linecap':'round','stroke-linejoin':'round'});
   visualText(s,70,normal+8,r.label,{size:26,weight:700,fill:r.color});
   const events=[];for(const ev of r.events){const st=stages.find(x=>x.id===ev.stage);el('circle',{cx:st.x,cy:normal,r:8,fill:'#FAFAF5',stroke:r.color,'stroke-width':3},s);const ls=visualLines(ev.label,Math.min(200,dx-30),{size:20,max:2});visualBlock(s,st.x,normal+(ri%2===0?-56:24),ls,{size:20,fill:'#252c30',anchor:'middle'});events.push({stage:ev.stage,label:ev.label,x:st.x,y:normal})}
   lines.push({id:r.id,color:r.color,points,events});
  }
  for(const st of stages){const heading=visualLines(st.label,Math.min(210,dx-20),{size:22,weight:st.shared?700:400,max:2});if(st.shared){const rh=(b.routes.length-1)*sharedGap+28;el('rect',{x:st.x-18,y:mid-rh/2,width:36,height:rh,rx:18,fill:'#FAFAF5',stroke:'#1a1a1a','stroke-width':3},s);visualBlock(s,st.x,mid-rh/2-70,heading,{size:22,weight:700,anchor:'middle'})}else visualBlock(s,st.x,220,heading,{size:22,fill:'#637076',anchor:'middle'})}
  const bottom=Math.max(ys.at(-1)+100,mid+100);need(bottom+90<H,'metro routes too tall');stroke(s,[[70,bottom],[1530,bottom]],'#c7c9c2',1);visualBlock(s,70,bottom+25,visualLines(b.note,1460,{size:22,max:2}),{size:22,fill:'#586269'});
  return visualFinish(s,{family:'metro',width:W,height:H,stages,lines,normalY:ys,sourceCase:'192-operating-rhythm-metro',scale:'categorical; distance does not encode elapsed time'});
 }
 function colour(b){
  fields(b,['family','title','subtitle','primaries','mixes','footer'],'colour');for(const k of ['title','subtitle','footer'])str(b[k],k);
  list(b.primaries,3,3,'primaries');unique(b.primaries,'primaries');list(b.mixes,1,3,'mixes');
  const shapes=['triangle','square','circle'];for(const p of b.primaries){fields(p,['id','label','color','shape'],'primary');str(p.label,'primary.label');hex(p.color);need(shapes.includes(p.shape),'unsupported primary shape')}
  for(const m of b.mixes){fields(m,['a','b','label','color'],'mix');need(m.a!==m.b&&b.primaries.some(p=>p.id===m.a)&&b.primaries.some(p=>p.id===m.b),'mix requires two distinct existing primaries');str(m.label,'mix.label');hex(m.color)}
  const W=1400,H=1300,s=visualPage(W,H,'#EEE9DE'),ink='#141414';el('rect',{x:0,y:0,width:65,height:H,fill:ink},s);
  const top=visualHeading(s,b.title,b.subtitle,{x:130,top:65,width:1190,size:68});
  const cy=top+185,centers=[330,750,1160],R=145;
  b.primaries.forEach((p,i)=>{const x=centers[i];if(p.shape==='triangle')el('polygon',{points:`${x},${cy-R} ${x+R},${cy+R} ${x-R},${cy+R}`,fill:p.color},s);else if(p.shape==='square')el('rect',{x:x-R,y:cy-R,width:R*2,height:R*2,fill:p.color},s);else el('circle',{cx:x,cy,r:R,fill:p.color},s);visualText(s,x,cy+R+58,p.label,{size:42,weight:800,anchor:'middle'})});
  const divider=cy+R+100;el('rect',{x:65,y:divider,width:1335,height:20,fill:ink},s);
  const mixCy=divider+205,r=103,d=105,mixObjects=[];b.mixes.forEach((m,i)=>{const cx=140+(i+.5)*1200/b.mixes.length,a=b.primaries.find(p=>p.id===m.a),z=b.primaries.find(p=>p.id===m.b);el('circle',{cx:cx-d/2,cy:mixCy,r,fill:a.color},s);el('circle',{cx:cx+d/2,cy:mixCy,r,fill:z.color},s);
   const dy=Math.sqrt(r*r-d*d/4),path=`M${cx} ${mixCy-dy} A${r} ${r} 0 0 1 ${cx} ${mixCy+dy} A${r} ${r} 0 0 1 ${cx} ${mixCy-dy} Z`;el('path',{d:path,fill:m.color},s);
   visualBlock(s,cx,mixCy+r+35,visualLines(m.label,1200/b.mixes.length-24,{size:30,weight:700,max:2}),{size:30,weight:700,anchor:'middle'});mixObjects.push({a:m.a,b:m.b,color:m.color,x:cx});
  });
  const footerY=mixCy+r+170;need(footerY+80<H,'colour lesson content too tall');visualBlock(s,140,footerY,visualLines(b.footer,1170,{size:26,max:2}),{size:26});
  return visualFinish(s,{family:'colour',width:W,height:H,primaries:b.primaries,mixes:mixObjects,encoding:'Explicit author-supplied colour examples, not a physical colour-mixing simulation',sourceCase:'t06-sanyuanse'});
 }
 return {rhythm,specimen,metro,colour};
}
