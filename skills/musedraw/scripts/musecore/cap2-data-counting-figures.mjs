import {el} from './svg.mjs';
import {visualPage,visualText,visualLines,visualFontBounds,measureVisual,visualFinish} from './visual-tools.mjs';
import {axisNumber} from './quantitative.mjs';
import {cap2DataCountingModel} from './cap2-data-counting-models.mjs';

// Optional entry for unit-chart inputs that explicitly request countingGroups.
// The existing default branch does not call this function.
export function cap2DataGroupedUnitChart(input){
 const m=cap2DataCountingModel(input),W=1700,margin=80,left=370,right=1620,step=27,iconW=20,iconH=46,groupGap=27,groupWidth=(m.countingGroups-1)*step+iconW,groupsPerRow=Math.floor((right-left+groupGap)/(groupWidth+groupGap));
 if(groupsPerRow<1)throw Error('A complete counting group exceeds the fixed symbol reading width');
 const plan=(value,width,size,weight=400,max=4)=>{
  // Keep fixed reading sizes, while balancing short CJK labels so that a
  // final single character is not stranded on its own line.
  const lines=[];for(const para of value.split('\n')){const rough=visualLines(para,width,{size,weight,max});if(rough.length>1&&[...rough.at(-1)].length<3&&rough.length<=4){const chars=[...para],memo=new Map(),target=measureVisual(para,size,'sans',weight)/rough.length;const solve=(at,left)=>{const key=at+'/'+left;if(memo.has(key))return memo.get(key);if(left===0)return at===chars.length?{cost:0,lines:[]}:null;let best=null;for(let end=at+1;end<=chars.length-left+1;end++){const text=chars.slice(at,end).join(''),w=measureVisual(text,size,'sans',weight);if(w>width)break;const tail=solve(end,left-1);if(!tail)continue;const penalty=([ ...text].length===1?1e6:0)+(/^[，。、；：！？）]/.test(text)?1e6:0),cost=(w-target)**2+penalty+tail.cost;if(!best||cost<best.cost)best={cost,lines:[text,...tail.lines]}}memo.set(key,best);return best};lines.push(...(solve(0,rough.length)?.lines??rough))}else lines.push(...rough)}
  if(lines.length>max)throw Error(`Text exceeds ${max} lines at ${size}px`);const bounds=lines.map(t=>visualFontBounds(t,size,'sans',weight)),ascent=Math.max(...bounds.map(b=>b.ascent)),descent=Math.max(...bounds.map(b=>b.descent)),lineStep=Math.max(size*1.35,ascent+descent+5);return {lines,size,weight,ascent,descent,step:lineStep,height:ascent+descent+(lines.length-1)*lineStep};
 };
 const title=plan(m.title,W-2*margin,44,800,3),subtitle=plan(m.subtitle,W-2*margin,23,400,4),legend=plan(`每个符号 = ${axisNumber(m.perSymbol)} ${m.unit}；每 ${m.countingGroups} 个符号一组 = ${axisNumber(m.groupValue)} ${m.unit}`,W-2*margin,21,400,3),footer=plan(m.note,W-2*margin,20,400,10),titleY=48,subtitleY=titleY+title.height+18,legendY=subtitleY+subtitle.height+20;
 let cursor=legendY+legend.height+40;
 const rows=m.items.map(it=>{const label=plan(it.label,240,26,700,4),value=plan(axisNumber(it.value)+' '+m.unit,240,22,400,3),note=it.note===undefined?null:plan(it.note,240,19,400,6),textHeight=label.height+10+value.height+(note?12+note.height:0),symbolRows=Math.max(1,Math.ceil(it.groups.length/groupsPerRow)),symbolsHeight=symbolRows*70-24,height=Math.max(textHeight,symbolsHeight),result={...it,labelPlan:label,valuePlan:value,notePlan:note,y:cursor,height,symbolRows};cursor+=height+38;return result});
 const footerY=cursor+8,H=Math.ceil(footerY+footer.height+44),svg=visualPage(W,H,'#FFFFFF'),textPlans=[],marks=[],groups=[],ink='#23323F',muted='#64727B';
 const draw=(x,y,p,fill=ink)=>{p.lines.forEach((t,i)=>{visualText(svg,x,y+p.ascent+i*p.step,t,{size:p.size,weight:p.weight,fill});textPlans.push({text:t,x,y:y+i*p.step,width:measureVisual(t,p.size,'sans',p.weight),height:p.ascent+p.descent})})};
 draw(margin,titleY,title);draw(margin,subtitleY,subtitle,muted);draw(margin,legendY,legend,muted);
 for(const it of rows){draw(margin,it.y,it.labelPlan,ink);draw(margin,it.y+it.labelPlan.height+10,it.valuePlan,muted);if(it.notePlan)draw(margin,it.y+it.labelPlan.height+10+it.valuePlan.height+12,it.notePlan,muted);
  for(const group of it.groups){const row=Math.floor(group.index/groupsPerRow),column=group.index%groupsPerRow,gx=left+column*(groupWidth+groupGap),gy=it.y+row*70;groups.push({item:it.id,...group,row,column,x:gx,y:gy,width:(group.count-1)*step+iconW,height:iconH});for(let j=0;j<group.count;j++){const x=gx+j*step,y=gy,index=group.start+j;const node=el('g',{'data-role':'count-symbol','data-item':it.id,'data-symbol-index':index},svg);if(m.icon==='person'){el('circle',{cx:x+10,cy:y+7,r:7,fill:it.color},node);el('path',{d:`M ${x} ${y+46} V ${y+25} Q ${x} ${y+17} ${x+8} ${y+17} H ${x+12} Q ${x+20} ${y+17} ${x+20} ${y+25} V ${y+46} Z`,fill:it.color},node)}else el('rect',{x,y,width:iconW,height:iconH,fill:it.color},node);marks.push({id:it.id,index,group:group.index,value:m.perSymbol,x,y,width:iconW,height:iconH,color:it.color})}}
 }
 draw(margin,footerY,footer,muted);
 return visualFinish(svg,{family:'unit-chart',width:W,height:H,variant:'counting-groups',compositionReference:'d10-danweitu-tongqin',items:rows.map(({labelPlan,valuePlan,notePlan,...it})=>it),total:m.total,perSymbol:m.perSymbol,countingGroups:m.countingGroups,groupValue:m.groupValue,groupsPerRow,groups,marks,textPlans,note:m.note,ordering:m.ordering,aestheticApproval:'not-assessed'});
}
