import {el} from './svg.mjs';
import {visualPage,visualText,visualLines,visualBlock,visualHeading,visualHeadingPlan,visualFinish,stroke,backedVisualText,measureVisual} from './visual-tools.mjs';
import {messageSequenceModel} from './sequence-models.mjs';

function sequenceLabelLines(text,width,options){
 const result=[];for(const paragraph of text.split('\n')){const greedy=visualLines(paragraph,width,options),count=greedy.length;if(count===1){result.push(...greedy);continue}const chars=[...paragraph],target=measureVisual(paragraph,options.size,options.role??'sans',options.weight??400)/count,memo=new Map();
  function solve(at,left){const key=at+'/'+left;if(memo.has(key))return memo.get(key);if(left===0)return at===chars.length?{cost:0,lines:[]}:null;let best=null;for(let end=at+1;end<=chars.length-left+1;end++){const line=chars.slice(at,end).join(''),w=measureVisual(line,options.size,options.role??'sans',options.weight??400);if(w>width)break;const tail=solve(end,left-1);if(!tail)continue;const cost=tail.cost+(w-target)**2+(/^[，。！？、；：）]/.test(line)?100000:0);if(!best||cost<best.cost)best={cost,lines:[line,...tail.lines]}}memo.set(key,best);return best}
  result.push(...(solve(0,count)?.lines??greedy));
 }if(result.length>options.max)throw Error('Sequence label exceeds '+options.max+' lines');return result;
}
export function messageSequenceFamilies(h){
 function messageSequence(input){
  const model=messageSequenceModel(input),ink='#111111',paper='#FFFFFF',margin=72,gap=350;
  const plans=model.panels.map(p=>{
   const width=Math.max(850,(p.participants.length-1)*gap+340),left=170,right=width-170,step=(right-left)/(p.participants.length-1),xs=p.participants.map((_,i)=>left+i*step),columnWidth=Math.min(300,step-34);
   const titleLines=visualLines(p.title,width-24,{size:34,role:'serif',weight:700,max:3});let y=titleLines.length*44+40;
   const participants=p.participants.map((person,i)=>({...person,x:xs[i],labelLines:visualLines(person.label,columnWidth,{size:28,weight:700,max:3}),roleLines:person.role?visualLines(person.role,columnWidth,{size:21,max:3}):[]}));
   const headerHeight=Math.max(...participants.map(p=>p.labelLines.length*36+p.roleLines.length*28)),headerY=y;const lifelineTop=headerY+headerHeight+20;y=lifelineTop+16;
   const planStates=(states,top)=>{const planned=states.map(s=>({...s,x:xs[s.participantIndex],lines:sequenceLabelLines(s.label,columnWidth,{size:23,weight:700,max:6})}));const height=planned.length?Math.max(...planned.map(s=>s.lines.length*32))+22:0;return {top,height,items:planned}};
   const initial=planStates(p.initialStates,y);y+=initial.height+24;
   const messages=p.messages.map(m=>{const x1=xs[m.fromIndex],x2=xs[m.toIndex],labelWidth=Math.abs(x2-x1)-50,labelLines=sequenceLabelLines(m.label,labelWidth,{size:28,role:'serif',max:8}),labelTop=y,arrowY=y+labelLines.length*38+20,statePlan=planStates(m.states,arrowY+26),bottom=statePlan.top+statePlan.height+38;y=bottom;return {...m,x1,x2,labelX:(x1+x2)/2,labelWidth,labelLines,labelTop,arrowY,statePlan,bottom}});
   const bottom=y+12,noteLines=p.note?visualLines(p.note,width-24,{size:24,role:'serif',max:5}):[],height=bottom+noteLines.length*34+36;
   return {...p,width,height,participants,headerY,lifelineTop,lifelineBottom:bottom-24,initial,messages,noteLines,noteTop:bottom};
  });
  const sideBySide=plans.length===2&&plans.reduce((n,p)=>n+p.width,0)+72<=2300,contentWidth=sideBySide?plans.reduce((n,p)=>n+p.width,0)+72:Math.max(...plans.map(p=>p.width)),W=contentWidth+margin*2,heading=visualHeadingPlan(model.title,model.subtitle,{top:62,width:contentWidth,size:56,role:'serif',max:3}),legendLines=visualLines('自上而下为输入顺序；间距不表示耗时。虚线表示明确关联的回复。',contentWidth,{size:22,max:3}),top=heading.bottom+30;let cursor=top;
  plans.forEach((p,i)=>{p.x=margin+(sideBySide&&i?plans[0].width+72:0);p.y=sideBySide?top:cursor;if(!sideBySide)cursor+=p.height+64});const panelsBottom=sideBySide?top+Math.max(...plans.map(p=>p.height)):cursor-64,legendTop=panelsBottom+20,noteLines=visualLines(model.note,contentWidth,{size:24,role:'serif',max:5}),noteTop=legendTop+26+legendLines.length*30+18,H=noteTop+noteLines.length*34+72,s=visualPage(W,H,paper);
  stroke(s,[[margin,35],[W-margin,35]],ink,7);visualHeading(s,model.title,model.subtitle,{x:margin,top:62,width:contentWidth,size:56,role:'serif',fill:ink,subFill:ink,max:3});stroke(s,[[margin,heading.bottom-10],[W-margin,heading.bottom-10]],ink,1.2);
  const geometryPanels=[];
  for(const p of plans){const g=el('g',{transform:`translate(${p.x} ${p.y})`,'data-panel':p.id},s);visualBlock(g,0,0,visualLines(p.title,p.width-24,{size:34,role:'serif',weight:700,max:3}),{size:34,role:'serif',weight:700,fill:ink,leading:44/34});
   for(const person of p.participants){stroke(g,[[person.x,p.lifelineTop],[person.x,p.lifelineBottom]],ink,1.6,{'data-participant':person.id});visualBlock(g,person.x,p.headerY,person.labelLines,{size:28,weight:700,fill:ink,anchor:'middle',leading:36/28});if(person.roleLines.length)visualBlock(g,person.x,p.headerY+person.labelLines.length*36,person.roleLines,{size:21,fill:ink,anchor:'middle',leading:28/21})}
   const drawStates=(statePlan)=>{for(const st of statePlan.items)st.lines.forEach((line,i)=>backedVisualText(g,st.x,statePlan.top+23+i*32,line,{size:23,weight:700,anchor:'middle',fill:ink,background:paper}));};drawStates(p.initial);
   for(const m of p.messages){const direction=Math.sign(m.x2-m.x1);stroke(g,[[m.x1,m.arrowY],[m.x2-direction*12,m.arrowY]],ink,m.replyTo?1.8:2.2,{'stroke-dasharray':m.replyTo?'8 5':null,'data-message':m.id});el('polygon',{points:`${m.x2},${m.arrowY} ${m.x2-direction*13},${m.arrowY-5} ${m.x2-direction*13},${m.arrowY+5}`,fill:ink},g);m.labelLines.forEach((line,i)=>backedVisualText(g,m.labelX,m.labelTop+28+i*38,line,{size:28,role:'serif',anchor:'middle',fill:ink,background:paper}));drawStates(m.statePlan)}
   if(p.noteLines.length)visualBlock(g,0,p.noteTop,p.noteLines,{size:24,role:'serif',fill:ink,leading:34/24});geometryPanels.push({...p,participants:p.participants.map(person=>({...person,globalX:p.x+person.x})),messages:p.messages.map(m=>({...m,points:[[p.x+m.x1,p.y+m.arrowY],[p.x+m.x2,p.y+m.arrowY]]}))});
  }
  if(sideBySide){const divider=margin+plans[0].width+36;stroke(s,[[divider,top],[divider,panelsBottom]],ink,1)}
  stroke(s,[[margin,legendTop],[W-margin,legendTop]],ink,1.2);visualBlock(s,margin,legendTop+16,legendLines,{size:22,fill:ink,leading:30/22});visualBlock(s,margin,noteTop,noteLines,{size:24,role:'serif',fill:ink,leading:34/24});
  return visualFinish(s,{family:'message-sequence',width:W,height:H,sourceCase:'e10-tcp-woshou',arrangement:sideBySide?'side-by-side':'stacked',messageCount:model.messageCount,stateCount:model.stateCount,orderMeaning:model.orderMeaning,stateMeaning:model.stateMeaning,panels:geometryPanels});
 }
 return {'message-sequence':messageSequence};
}
