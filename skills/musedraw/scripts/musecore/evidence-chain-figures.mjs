import {el} from './svg.mjs';
import {visualPage,visualText,visualLines,visualFontBounds,measureVisual,visualFinish,stroke} from './visual-tools.mjs';
import {evidenceChainModel} from './evidence-chain-models.mjs';

export function evidenceChainFigure(input){
 const m=evidenceChainModel(input),W=1800,margin=84,gap=34,bg='#FBFCFD',ink='#203142',muted='#63717B',grid='#DCE4E9';
 const svg=visualPage(W,1120,bg), textPlans=[];
 const plan=(t,w,size=20,weight=400,max=3,role='sans')=>{const lines=visualLines(t,w,{size,weight,max,role}),fb=lines.map(x=>visualFontBounds(x,size,role,weight)),ascent=Math.max(...fb.map(x=>x.ascent)),descent=Math.max(...fb.map(x=>x.descent)),step=Math.max(size*1.35,ascent+descent+6);return {lines,size,weight,role,ascent,descent,step,height:ascent+descent+(lines.length-1)*step}};
 const draw=(x,y,p,{fill=ink,anchor='start'}={})=>{p.lines.forEach((t,i)=>{const node=visualText(svg,x,y+p.ascent+i*p.step,t,{size:p.size,weight:p.weight,role:p.role,fill,anchor});const adv=measureVisual(t,p.size,p.role,p.weight),fb=visualFontBounds(t,p.size,p.role,p.weight),shift=anchor==='middle'?-adv/2:anchor==='end'?-adv:0;const b={x:x+shift-1,y:y+i*p.step,width:adv+2,height:fb.ascent+fb.descent+2};textPlans.push({text:t,...b})})};
 const title=plan(m.title,W-margin*2,46,800,2,'sans'),sub=plan(m.subtitle,W-margin*2,23,400,2),note=plan(m.note,W-margin*2,19,400,3),titleY=48,subY=titleY+title.height+16,ruleY=subY+sub.height+22;
 draw(margin,titleY,title);draw(margin,subY,sub,{fill:muted});stroke(svg,[[margin,ruleY],[W-margin,ruleY]],ink,1.5);
 const panelMap={overview:m.panels.find(p=>p.role==='overview'),comparison:m.panels.find(p=>p.role==='comparison'),detail:m.panels.find(p=>p.role==='detail')},positions={overview:{x:margin,y:ruleY+26,w:W-margin*2,h:356},comparison:{x:margin,y:ruleY+26+356+gap,w:(W-margin*2-gap)/2,h:356},detail:{x:margin+(W-margin*2+gap)/2,y:ruleY+26+356+gap,w:(W-margin*2-gap)/2,h:356}};
 const max=m.sharedDomain[1]||1;
 const geometries=[];
 function panel(role){const p=panelMap[role],box=positions[role],head=plan(p.title,box.w-36,25,800,2),sample=plan('样本定义：'+p.sampleDefinition,box.w-36,16,400,2),sourceNames=p.sourceIds.map(id=>m.sources.find(s=>s.id===id).label).join('；'),source=plan('来源：'+sourceNames,box.w-36,15,400,2),panelTop=box.y+14;draw(box.x+18,panelTop,head,{fill:role==='overview'?'#285A78':ink});draw(box.x+18,panelTop+head.height+7,sample,{fill:muted});draw(box.x+18,panelTop+head.height+7+sample.height+4,source,{fill:muted});
  const chartTop=panelTop+head.height+sample.height+source.height+30,plotTop=chartTop+6,plotBottom=box.y+box.h-82,left=box.x+62,right=box.x+box.w-24,chartW=right-left,cw=chartW/m.categories.length;for(let i=0;i<=4;i++){const value=max*i/4,y=plotBottom-(value/max)*(plotBottom-plotTop);stroke(svg,[[left,y],[right,y]],grid,1,{'data-role':'panel-grid'});if(i===0||i===4)draw(left-10,y-8,plan(String(Number(value.toFixed(2))),48,13,400,1),{fill:muted,anchor:'end'})}stroke(svg,[[left,plotTop],[left,plotBottom],[right,plotBottom]],ink,1.1);
  const scale=v=>plotBottom-(v/max)*(plotBottom-plotTop),bars=[];for(const [si,s]of p.series.entries()){const group=s.group;for(let i=0;i<s.values.length;i++){const value=s.values[i],x=left+cw*(i+.5)+(si-(p.series.length-1)/2)*Math.min(22,cw/(p.series.length+1)),w=Math.min(17,cw/(p.series.length+1));const y=scale(value),h=plotBottom-y;el('rect',{x:x-w/2,y,width:w,height:h,fill:group.color,'data-role':'panel-observation','data-panel':p.id,'data-group':group.id,'data-category':m.categories[i]},svg);if(s.uncertainty){const lo=scale(s.uncertainty.low[i]),hi=scale(s.uncertainty.high[i]);stroke(svg,[[x,hi],[x,lo]],ink,1.6,{'data-role':'uncertainty-whisker'});stroke(svg,[[x-5,hi],[x+5,hi]],ink,1.6);stroke(svg,[[x-5,lo],[x+5,lo]],ink,1.6)}bars.push({groupId:group.id,category:m.categories[i],value,x,y,width:w,height:h,uncertainty:s.uncertainty?{low:s.uncertainty.low[i],high:s.uncertainty.high[i]}:null})}}
  const labels=m.categories.map((c,i)=>plan(c,Math.max(60,cw-8),14,400,2));labels.forEach((p2,i)=>{const x=left+cw*(i+.5);draw(x,plotBottom+9,p2,{fill:muted,anchor:'middle'})});const legendX=left,legendY=box.y+box.h-25;m.groups.forEach((g,i)=>{if(!p.series.some(s=>s.groupId===g.id))return;el('rect',{x:legendX+i*160,y:legendY-11,width:12,height:12,fill:g.color},svg);draw(legendX+18+i*160,legendY-12,plan(g.label,125,14,400,1),{fill:muted})});geometries.push({id:p.id,role:p.role,x:box.x,y:box.y,width:box.w,height:box.h,plot:{left,right,top:plotTop,bottom:plotBottom,domain:[0,max]},bars,sampleDefinition:p.sampleDefinition,sourceIds:[...p.sourceIds]});
 }
 panel('overview');panel('comparison');panel('detail');
 draw(margin,1054,note,{fill:muted});
 // Return a compact role and scale record so callers can inspect evidence lineage.
 const geometry={family:'evidence-chain',width:W,height:1120,title:m.title,subtitle:m.subtitle,evidenceKind:m.evidenceKind,sharedDomain:m.sharedDomain,categories:m.categories,groups:m.groups,panels:geometries,traceability:m.traceability,textPlans,note:m.note,compositionReference:'nature-multipanel-evidence-chain',aestheticApproval:'not-assessed'};
 return visualFinish(svg,geometry);
}

export function evidenceChainFamilies(){return {'evidence-chain':evidenceChainFigure}}
