import {renderDevelopmentScroll} from './development-scroll-figures.mjs';
import {el} from './svg.mjs';
import {visualPage,visualText,visualLines,visualBlock,visualHeading,visualFinish,stroke,number,measureVisual,backedVisualText} from './visual-tools.mjs';
import {linearScale,niceDomain,formatNumber} from './quantitative.mjs';
import {constellationErrorEvidence} from './constellation-models.mjs';
import {equationTextPlan,equationDrawPlan} from './equation-figures.mjs';

export function spatialFamilies(h){
 const {fields,list,str,need,unique}=h;
 function blueprint(b){
  fields(b,['family','title','subtitle','layers','excluded','unit','note'],'blueprint');for(const k of ['title','subtitle','unit','note'])str(b[k],k);list(b.layers,2,8,'layers');unique(b.layers,'layers');
  const paper='#CDE7EF',bg='#163F63',muted='#92B6CA';
  for(const l of b.layers){fields(l,['id','label','value','detail'],'layer');str(l.label,'layer.label');str(l.detail,'layer.detail');number(l.value,'layer.value');need(l.value>0,'layer values must be positive')}
  const excluded=b.excluded??[];list(excluded,0,3,'excluded');for(const e of excluded){fields(e,['label','value'],'excluded');str(e.label,'excluded.label');number(e.value,'excluded.value');need(e.value>0,'excluded amount must be positive')}
  const total=b.layers.reduce((s,l)=>s+l.value,0),W=1600,H=1050,s=visualPage(W,H,bg);
  for(let x=25;x<W;x+=25)stroke(s,[[x,20],[x,H-20]],paper,1,{'stroke-opacity':x%100===0?.10:.035,'data-role':'background-grid'});
  for(let y=25;y<H;y+=25)stroke(s,[[20,y],[W-20,y]],paper,1,{'stroke-opacity':y%100===0?.10:.035,'data-role':'background-grid'});
  for(const inset of [20,28])el('rect',{x:inset,y:inset,width:W-2*inset,height:H-2*inset,fill:'none',stroke:paper,'stroke-width':1},s);
  const top=visualHeading(s,b.title,b.subtitle,{x:75,top:58,width:1430,size:48,fill:paper,subFill:muted});
  const y0=Math.max(220,top+25),plotH=590,x0=220,stackW=390,scale=plotH/total;
  const textRows=b.layers.map(l=>({id:l.id,lines:visualLines(l.label,450,{size:26,weight:700,max:2}),detail:visualLines(l.detail,440,{size:19,max:2})}));
  const slotsH=textRows.map(r=>r.lines.length*34+r.detail.length*25+30),sumH=slotsH.reduce((s,v)=>s+v,0);need(sumH<=plotH+100,'too many detailed layer labels; split the diagram');
  let y=y0;const layers=[];
  b.layers.forEach((l,i)=>{const height=l.value*scale;need(height>=3,'layer below visible resolution; choose another scale/diagram');const g=el('g',{},s);el('rect',{x:x0,y,width:stackW,height,fill:'none',stroke:paper,'stroke-width':1.5},g);
   const clipId='blueprint-clip-'+i,defs=el('defs',{},g),clip=el('clipPath',{id:clipId},defs);el('rect',{x:x0+1,y:y+1,width:stackW-2,height:Math.max(0,height-2)},clip);
   const hatch=el('g',{'clip-path':`url(#${clipId})`},g);for(let k=-600;k<1000;k+=16){const pts=i%2?[[x0+k,y],[x0+k-height,y+height]]:[[x0+k,y],[x0+k+height,y+height]];stroke(hatch,pts,paper,1,{'stroke-opacity':.23})}
   layers.push({id:l.id,label:l.label,value:l.value,x:x0,y,w:stackW,h:height,center:y+height/2});y+=height;
  });
  // Label positions are independent tracks. Connection endpoints stay on the
  // original proportional segment, so short layers do not get fake thickness.
  const gap=Math.max(12,(plotH-sumH)/Math.max(1,b.layers.length-1));let labelY=y0;
  for(let i=0;i<layers.length;i++){const l=layers[i],t=textRows[i],labelCenter=labelY+t.lines.length*17;
   const pts=[[x0+stackW,l.center],[660,l.center],[700,labelCenter],[735,labelCenter]];stroke(s,pts,paper,1.2);el('circle',{cx:x0+stackW,cy:l.center,r:3,fill:paper},s);
   visualBlock(s,750,labelY,t.lines,{size:26,weight:700,fill:paper});visualText(s,1320,labelY+28,`${formatNumber(l.value)} ${b.unit}`,{size:24,fill:paper,anchor:'end'});visualBlock(s,750,labelY+t.lines.length*34+8,t.detail,{size:19,fill:muted});l.labelCenter=labelCenter;labelY+=slotsH[i]+(i===layers.length-1?0:gap);
  }
  stroke(s,[[170,y0],[150,y0],[150,y0+plotH],[170,y0+plotH]],paper,1.5);visualText(s,130,y0-18,`${formatNumber(total)} ${b.unit}`,{size:22,fill:paper,anchor:'start'});
  const extraY=Math.max(y0+plotH+45,labelY+15);need(extraY+Math.max(60,excluded.length*27)<H-95,'blueprint labels exceed reading budget');
  if(excluded.length){el('rect',{x:750,y:extraY-15,width:680,height:excluded.length*27+45,fill:'none',stroke:muted,'stroke-width':1,'stroke-dasharray':'6 5'},s);visualText(s,770,extraY+8,'不计入上述总量',{size:19,fill:paper,weight:700});excluded.forEach((l,i)=>visualText(s,770,extraY+38+i*27,`${l.label} · ${formatNumber(l.value)} ${b.unit}`,{size:19,fill:muted}))}
  visualBlock(s,75,970,visualLines(b.note,1430,{size:19,max:2}),{size:19,fill:muted});
  return visualFinish(s,{family:'blueprint',width:W,height:H,total,scale,layers,excluded,sourceCase:'113-image-layers'});
 }
 function constellation(b){
  fields(b,['family','title','subtitle','center','nodes','edges','warningAt','criticalAt','unit','note'],'constellation');for(const k of ['title','subtitle','unit','note'])str(b[k],k);list(b.nodes,3,12,'nodes');list(b.edges,1,24,'edges');unique(b.nodes,'nodes');
  number(b.warningAt,'warningAt');number(b.criticalAt,'criticalAt');need(b.warningAt>=0&&b.criticalAt>b.warningAt&&b.criticalAt<=1,'invalid warning thresholds');need(b.nodes.some(n=>n.id===b.center),'unknown center node');
  for(const n of b.nodes){fields(n,['id','label','value','errorRate','errorRateState','tier'],'node');str(n.label,'node.label');number(n.value,'node.value');constellationErrorEvidence(n,b.warningAt,b.criticalAt);need(n.value>0,'node weight must be positive; rate in 0–1');need(Number.isInteger(n.tier)&&n.tier>=1&&n.tier<=2||n.id===b.center&&n.tier===0,'tier must be 1/2, center tier 0')}
  const ids=new Set(b.nodes.map(n=>n.id));const edgeIds=new Set();for(const e of b.edges){fields(e,['from','to'],'edge');need(ids.has(e.from)&&ids.has(e.to)&&e.from!==e.to,'invalid edge endpoint');const key=e.from+'>'+e.to;need(!edgeIds.has(key),'duplicate directed edge');edgeIds.add(key)}
  // New evidence states use measured line boxes. The exact-rate-only route
  // below remains byte-identical for existing inputs, including old metadata.
  if(b.nodes.some(n=>Object.hasOwn(n,'errorRateState'))){
   const W=1760,white='#E7F3F7',muted='#9AB0CA',sky='#08152A',colors={normal:'#BBDFF5',warning:'#E8BB69',critical:'#EF8158',uncertain:'#A7ABB9'};
   const title=equationTextPlan(b.title,W-140,{size:49,weight:800,max:2}),subtitle=equationTextPlan(b.subtitle,W-140,{size:23,max:3}),percent=x=>Number((x*100).toPrecision(12))+'%',legend=equationTextPlan(`错误率：蓝白 < ${percent(b.warningAt)}　琥珀 ${percent(b.warningAt)} 至 < ${percent(b.criticalAt)}　橙红 ≥ ${percent(b.criticalAt)}　灰：未给出或上界跨档`,W-140,{size:20,max:2}),note=equationTextPlan(b.note,W-140,{size:22,max:5});
   const maxValue=Math.max(...b.nodes.map(n=>n.value)),prepared=b.nodes.map(n=>{const evidence=constellationErrorEvidence(n,b.warningAt,b.criticalAt),label=equationTextPlan(n.label,300,{size:28,weight:700,max:2}),detail=equationTextPlan(`${formatNumber(n.value)} ${b.unit} · ${evidence.display}`,330,{size:20,max:2});return {...n,evidence,labelPlan:label,detailPlan:detail,labelWidth:Math.max(label.width,detail.width),labelHeight:label.height+detail.height+10,r:Math.sqrt(n.value/maxValue)*27,color:colors[evidence.classification]}});
   const subtitleY=55+title.height+17,legendY=subtitleY+subtitle.height+20,plotTop=legendY+legend.height+45,maxLabelHeight=Math.max(...prepared.map(n=>n.labelHeight)),plotHeight=850+Math.max(0,maxLabelHeight-78)*3,plotBottom=plotTop+plotHeight,cx=W/2,cy=(plotTop+plotBottom)/2,noteY=plotBottom+35,H=noteY+note.height+65,s=visualPage(W,H,sky),positions=new Map();
   equationDrawPlan(s,70,55,title,{fill:white});equationDrawPlan(s,70,subtitleY,subtitle,{fill:muted});equationDrawPlan(s,70,legendY,legend,{fill:muted});
   for(const r of [130,255,370,480])el('ellipse',{cx,cy,rx:r*1.12,ry:r/480*plotHeight*.35,fill:'none',stroke:muted,'stroke-width':1,'stroke-opacity':.13},s);
   for(let i=0;i<120;i++)el('circle',{cx:45+i*317%(W-90),cy:plotTop+15+i*197%(plotHeight-30),r:i%7===0?1.2:.65,fill:'#BFD9ED','fill-opacity':i%7===0?.4:.18},s);
   const centerNode=prepared.find(n=>n.id===b.center);need(centerNode.tier===0,'center must use tier 0');
   const rings=[prepared.filter(n=>n.id!==b.center&&n.tier===1),prepared.filter(n=>n.id!==b.center&&n.tier===2)];need(rings[0].length<=5&&rings[1].length<=8,'constellation tier too crowded');
   const pointDistance=(p,a,z)=>{const dx=z.x-a.x,dy=z.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)};
   const placed=(orders,phases)=>{const m=new Map([[centerNode.id,{...centerNode,x:cx,y:cy}]]);orders.forEach((ns,ti)=>ns.forEach((n,i)=>{const a=-Math.PI/2+2*Math.PI*i/ns.length+phases[ti],r=ti===0?255:480;m.set(n.id,{...n,x:cx+Math.cos(a)*r*1.12,y:cy+Math.sin(a)*r/480*plotHeight*.35})}));return m};
   const layoutCost=m=>{let cost=0;const segments=b.edges.map(e=>({e,a:m.get(e.from),z:m.get(e.to)})),orient=(a,z,p)=>(z.x-a.x)*(p.y-a.y)-(z.y-a.y)*(p.x-a.x);for(const {e,a,z}of segments){cost+=Math.hypot(z.x-a.x,z.y-a.y);for(const n of m.values())if(n.id!==e.from&&n.id!==e.to){const d=pointDistance(n,a,z),safe=n.r*1.8+13;if(d<safe)cost+=1e8+(safe-d)*1e5;else if(d<safe+50)cost+=(safe+50-d)*25}}for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++){const a=segments[i],z=segments[j];if([a.e.from,a.e.to].some(id=>id===z.e.from||id===z.e.to))continue;if(orient(a.a,a.z,z.a)*orient(a.a,a.z,z.z)<0&&orient(z.a,z.z,a.a)*orient(z.a,z.z,a.z)<0)cost+=1200}return cost};
   let orders=rings.map(ns=>[...ns]),phases=[.25,.4],bestCost=layoutCost(placed(orders,phases));
   // A bounded coordinate search uses graph relationships, never caller xy or
   // service-specific positions. It keeps tier membership while reducing long
   // crossings and, most importantly, avoids creating false service junctions.
   for(let pass=0;pass<8;pass++){let changed=false;for(let tier=0;tier<2;tier++){for(let i=0;i<orders[tier].length;i++)for(let j=i+1;j<orders[tier].length;j++){const trial=orders.map(ns=>[...ns]);[trial[tier][i],trial[tier][j]]=[trial[tier][j],trial[tier][i]];const cost=layoutCost(placed(trial,phases));if(cost<bestCost-1e-7){orders=trial;bestCost=cost;changed=true}}for(const delta of [-.24,-.12,.12,.24]){const trial=[...phases];trial[tier]+=delta;const cost=layoutCost(placed(orders,trial));if(cost<bestCost-1e-7){phases=trial;bestCost=cost;changed=true}}}if(!changed)break}
   for(const[id,n]of placed(orders,phases))positions.set(id,n);
   for(const e of b.edges)for(const n of positions.values())if(n.id!==e.from&&n.id!==e.to)need(pointDistance(n,positions.get(e.from),positions.get(e.to))>n.r*1.8+12,'constellation cannot route edge without a false service junction; reduce density or choose another view');
   const edges=[];for(const e of b.edges){const a=positions.get(e.from),z=positions.get(e.to),dx=z.x-a.x,dy=z.y-a.y,L=Math.hypot(dx,dy);need(L>a.r+z.r+15,'nodes too close for directed edge');const ux=dx/L,uy=dy/L,start=[a.x+ux*(a.r+7),a.y+uy*(a.r+7)],end=[z.x-ux*(z.r+9),z.y-uy*(z.r+9)];stroke(s,[start,end],'#7898BC',1.8,{'stroke-opacity':.72,'data-role':'service-call','data-from':e.from,'data-to':e.to});el('polygon',{points:`${end[0]},${end[1]} ${end[0]-ux*9-uy*4},${end[1]-uy*9+ux*4} ${end[0]-ux*9+uy*4},${end[1]-uy*9-ux*4}`,fill:'#ADC6E0','data-role':'call-arrow','data-from':e.from,'data-to':e.to},s);edges.push({...e,points:[start,end]})}
   const labels=[],labelLeaders=[];
   for(const n of positions.values()){
    for(const [k,opacity]of [[3,.025],[2.2,.05],[1.55,.11]])el('circle',{cx:n.x,cy:n.y,r:n.r*k,fill:n.color,'fill-opacity':opacity},s);el('circle',{cx:n.x,cy:n.y,r:n.r,fill:n.color,'data-role':'service-node','data-id':n.id},s);
    if(n.value/maxValue>.7){stroke(s,[[n.x-n.r*1.8,n.y],[n.x+n.r*1.8,n.y]],n.color,1.2,{'stroke-opacity':.55});stroke(s,[[n.x,n.y-n.r*1.8],[n.x,n.y+n.r*1.8]],n.color,1.2,{'stroke-opacity':.55})}
    const candidates=[[n.x,n.y+n.r*1.8+18,'middle'],[n.x,n.y-n.r*1.8-n.labelHeight-18,'middle'],[n.x+n.r*1.8+25,n.y-n.labelHeight/2,'start'],[n.x-n.r*1.8-25,n.y-n.labelHeight/2,'end']];
    for(const radius of [80,120,165,210,265])for(let i=0;i<24;i++){const a=i/24*Math.PI*2;candidates.push([n.x+Math.cos(a)*radius,n.y+Math.sin(a)*radius-n.labelHeight/2,'middle'])}let chosen;
    for(const[x,y,anchor]of candidates){const w=n.labelWidth,left=anchor==='middle'?x-w/2:anchor==='end'?x-w:x,box={x:left-3,y:y-2,w:w+6,h:n.labelHeight+4};if(left<40||left+w>W-40||y<plotTop||y+n.labelHeight>plotBottom)continue;if(labels.some(l=>intersects(box,l.box,12)))continue;if([...positions.values()].some(o=>intersects(box,{x:o.x-o.r*1.8-8,y:o.y-o.r*1.8-8,w:o.r*3.6+16,h:o.r*3.6+16},4)))continue;if([...edges,...labelLeaders].some(e=>segmentHits(e.points[0],e.points[1],box)))continue;
     const target={x:Math.max(left,Math.min(left+w,n.x)),y:Math.max(y,Math.min(y+n.labelHeight,n.y))},dx=target.x-n.x,dy=target.y-n.y,d=Math.hypot(dx,dy);let leader=null;if(d>n.r*1.8+43){const ux=dx/d,uy=dy/d,points=[[n.x+ux*(n.r*1.8+7),n.y+uy*(n.r*1.8+7)],[target.x-ux*8,target.y-uy*8]];if(labels.some(l=>segmentHits(points[0],points[1],l.box)))continue;if([...positions.values()].some(o=>o.id!==n.id&&pointDistance(o,{x:points[0][0],y:points[0][1]},{x:points[1][0],y:points[1][1]})<o.r*1.8+8))continue;leader={id:n.id,points}}
     chosen={x,y,anchor,box,leader};break}
    need(chosen,'constellation cannot place label without collisions: '+n.id+'; reduce density or choose another view');labels.push({id:n.id,...chosen});if(chosen.leader){labelLeaders.push(chosen.leader);stroke(s,chosen.leader.points,n.color,1,{'stroke-opacity':.6,'stroke-dasharray':'3 5','data-role':'label-leader','data-id':n.id})}const labelGroup=el('g',{'data-role':'service-label','data-id':n.id},s);equationDrawPlan(labelGroup,chosen.x,chosen.y,n.labelPlan,{fill:white,anchor:chosen.anchor});equationDrawPlan(labelGroup,chosen.x,chosen.y+n.labelPlan.height+10,n.detailPlan,{fill:n.color,anchor:chosen.anchor});
   }
   stroke(s,[[70,plotBottom+15],[W-70,plotBottom+15]],muted,1,{'stroke-opacity':.4});equationDrawPlan(s,70,noteY,note,{fill:muted});
   return visualFinish(s,{family:'constellation',width:W,height:H,nodes:[...positions.values()].map(({labelPlan,detailPlan,labelWidth,labelHeight,...n})=>n),edges,labels,labelLeaders,layoutOrder:orders.map(ns=>ns.map(n=>n.id)),layoutPhases:phases,radiusEncoding:'area proportional to supplied value; no radius minimum',compositionReference:'107-service-star-map',rateEvidence:'Exact values, strict upper bounds and unknown values remain distinct; bounds crossing thresholds use a neutral color.',edgeAmounts:'Not supplied or inferred; no inbound/outbound sum calculation.',layout:'Explicit directed relationships; orbital position and distance encode no latency or causal strength. Dotted leaders attach distant labels, not service calls.',typeMetrics:'Actual font ascent/descent determine labels and page height'});
  }
  const W=1600,H=1100,s=visualPage(W,H,'#08152A'),white='#E7F3F7',muted='#7D95B0';visualHeading(s,b.title,b.subtitle,{x:70,top:55,width:1460,size:49,fill:white,subFill:muted});
  const cx=770,cy=585,max=Math.max(...b.nodes.map(n=>n.value)),rs=[0,210,380];
  for(const r of [130,210,300,380])el('ellipse',{cx,cy,rx:r*1.35,ry:r*.76,fill:'none',stroke:muted,'stroke-width':1,'stroke-opacity':.15},s);
  for(let i=0;i<100;i++){const x=45+(i*317%1510),y=220+(i*197%730);el('circle',{cx:x,cy:y,r:i%7===0?1.3:.7,fill:'#BFD9ED','fill-opacity':i%7===0?.45:.2},s)}
  const positions=new Map();const nodeStyle=n=>({r:Math.sqrt(n.value/max)*27,color:n.errorRate>=b.criticalAt?'#EF8158':n.errorRate>=b.warningAt?'#E8BB69':'#BBDFF5'});
  for(const n of b.nodes.filter(n=>n.id===b.center)){need(n.tier===0,'center must use tier 0');positions.set(n.id,{...n,x:cx,y:cy,...nodeStyle(n)})}
  for(const tier of [1,2]){const ns=b.nodes.filter(n=>n.id!==b.center&&n.tier===tier);need(ns.length<=(tier===1?5:8),'constellation tier too crowded');ns.forEach((n,i)=>{const angle=-Math.PI/2+2*Math.PI*i/ns.length+(tier===1?.25:.4);positions.set(n.id,{...n,x:cx+Math.cos(angle)*rs[tier]*1.35,y:cy+Math.sin(angle)*rs[tier]*.76,...nodeStyle(n)})})}
  const edges=[];
  for(const e of b.edges){const a=positions.get(e.from),z=positions.get(e.to),dx=z.x-a.x,dy=z.y-a.y,L=Math.hypot(dx,dy);need(L>a.r+z.r+15,'nodes too close for directed edge');const ux=dx/L,uy=dy/L,start=[a.x+ux*(a.r+7),a.y+uy*(a.r+7)],end=[z.x-ux*(z.r+9),z.y-uy*(z.r+9)];stroke(s,[start,end],'#6E8DAE',1.6,{'stroke-opacity':.55});el('polygon',{points:`${end[0]},${end[1]} ${end[0]-ux*9-uy*4},${end[1]-uy*9+ux*4} ${end[0]-ux*9+uy*4},${end[1]-uy*9-ux*4}`,fill:'#93AEC9'},s);edges.push({...e,points:[start,end]})}
  const labels=[];
  for(const n of positions.values()){
   for(const [k,opacity] of [[3.0,.025],[2.2,.05],[1.55,.11]])el('circle',{cx:n.x,cy:n.y,r:n.r*k,fill:n.color,'fill-opacity':opacity},s);el('circle',{cx:n.x,cy:n.y,r:n.r,fill:n.color},s);
   if(n.value/max>.7){stroke(s,[[n.x-n.r*1.8,n.y],[n.x+n.r*1.8,n.y]],n.color,1.2,{'stroke-opacity':.55});stroke(s,[[n.x,n.y-n.r*1.8],[n.x,n.y+n.r*1.8]],n.color,1.2,{'stroke-opacity':.55})}
   const title=visualLines(n.label,205,{size:22,weight:700,max:2}),sub=`${formatNumber(n.value)} ${b.unit}${n.errorRate>=b.warningAt?' · '+(n.errorRate*100).toFixed(1)+'%':''}`,subLines=visualLines(sub,230,{size:17,max:2}),height=title.length*28.6+subLines.length*22.1+6;
   const candidates=[[n.x,n.y+n.r*1.8+18,'middle'],[n.x,n.y-n.r*1.8-height-18,'middle'],[n.x+n.r*1.8+25,n.y-height/2,'start'],[n.x-n.r*1.8-25,n.y-height/2,'end']];
   for(const radius of [75,115,160])for(let i=0;i<12;i++){const a=i/12*Math.PI*2;candidates.push([n.x+Math.cos(a)*radius,n.y+Math.sin(a)*radius-height/2,'middle'])}let chosen;
   for(const [x,y,anchor] of candidates){const w=Math.max(...title.map(t=>measureVisual(t,22,'sans',700)),...subLines.map(t=>measureVisual(t,17))),left=anchor==='middle'?x-w/2:anchor==='end'?x-w:x,box={x:left,y,w,h:height};if(left<40||left+w>1560||y<220||y+height>940)continue;
    if(labels.some(l=>intersects(box,l.box,9)))continue;if([...positions.values()].some(o=>intersects(box,{x:o.x-o.r*1.8-8,y:o.y-o.r*1.8-8,w:o.r*3.6+16,h:o.r*3.6+16},4)))continue;
    // Check edge against the complete label rectangle, not just its glyphs.
    if(edges.some(e=>segmentHits(e.points[0],e.points[1],box)))continue;
    chosen={x,y,anchor,box};break;
   }
   need(chosen,'constellation cannot place label without collisions: '+n.id+'; reduce density or choose another view');labels.push({id:n.id,...chosen});visualBlock(s,chosen.x,chosen.y,title,{size:22,weight:700,fill:white,anchor:chosen.anchor});visualBlock(s,chosen.x,chosen.y+title.length*28.6+5,subLines,{size:17,fill:n.color,anchor:chosen.anchor});
  }
  stroke(s,[[70,970],[1530,970]],muted,1,{'stroke-opacity':.4});visualBlock(s,70,995,visualLines(b.note,1460,{size:20,max:2}),{size:20,fill:muted});
  return visualFinish(s,{family:'constellation',width:W,height:H,nodes:[...positions.values()],edges,labels,radiusEncoding:'area proportional to value; no radius minimum',sourceCase:'107-service-star-map'});
 }
 function scroll(b){
  if(Object.hasOwn(b,'development'))return renderDevelopmentScroll(b);
  fields(b,['family','title','subtitle','points','unit','note'],'scroll');for(const k of ['title','subtitle','unit','note'])str(b[k],k);list(b.points,4,12,'points');
  for(const p of b.points){fields(p,['year','value','event'],'point');number(p.year,'year');number(p.value,'value');str(p.event,'event');need(Number.isInteger(p.year)&&p.value>=0,'year integer; value nonnegative')}
  need(b.points.every((p,i)=>!i||p.year>b.points[i-1].year),'years must strictly increase');const W=1800,H=1050,paper='#EAE3D1',ink='#342F28',faint='#A69D89',red='#AC392D',s=visualPage(W,H,paper);
  for(const inset of [24,31])el('rect',{x:inset,y:inset,width:W-inset*2,height:H-inset*2,fill:'none',stroke:faint,'stroke-width':1,'stroke-opacity':.6},s);
  const top=visualHeading(s,b.title,b.subtitle,{x:90,top:60,width:1600,size:63,role:'serif',fill:ink,subFill:'#77705F'}),x0=150,x1=1640,yTop=top+235,yBase=785,scale=niceDomain(b.points.map(p=>p.value)),X=linearScale([b.points[0].year,b.points.at(-1).year],[x0,x1]),Y=linearScale(scale.domain,[yBase,yTop]);
  for(const v of scale.ticks){const y=Y(v);stroke(s,[[x0,y],[x1,y]],faint,1,{'stroke-opacity':.2});visualText(s,x0-20,y+6,formatNumber(v),{size:19,role:'serif',fill:'#817966',anchor:'end'})}
  const marks=b.points.map(p=>({...p,x:X(p.year),y:Y(p.value)}));
  for(let i=1;i<marks.length;i++){const a=marks[i-1],z=marks[i];stroke(s,[[a.x,a.y],[z.x,z.y]],ink,3+(i/(marks.length-1))*4,{'stroke-linecap':'round'});stroke(s,[[a.x+.7,a.y+1.8],[z.x-.5,z.y+1.2]],'#605643',1,{'stroke-opacity':.35})}
  const labelBoxes=[];for(const [i,p] of marks.entries()){
   el('circle',{cx:p.x,cy:p.y,r:i===0||i===marks.length-1?7:4.5,fill:i===0||i===marks.length-1?red:ink},s);backedVisualText(s,p.x,p.y-15,formatNumber(p.value),{background:paper,size:20,role:'serif',fill:ink,anchor:'middle'});
   visualText(s,p.x,top+58,String(p.year),{size:25,role:'serif',weight:700,fill:ink,anchor:'middle'});
   const slot=(x1-x0)/(marks.length-1),lines=visualLines(p.event,Math.min(slot-20,180),{size:20,role:'serif',max:4}),box={x:p.x-Math.min(slot-20,180)/2,y:top+82,w:Math.min(slot-20,180),h:lines.length*26};
   need(!labelBoxes.some(o=>intersects(box,o,3)),'timeline events need a wider interval or shorter label');labelBoxes.push(box);visualBlock(s,p.x,top+82,lines,{size:20,role:'serif',fill:'#6D6555',anchor:'middle'});if(p.y-42>top+88+box.h)stroke(s,[[p.x,top+88+box.h],[p.x,p.y-42]],faint,1,{'stroke-dasharray':'2 5','stroke-opacity':.55});
  }
  visualText(s,x0,yTop-30,b.unit,{size:22,role:'serif',fill:ink});stroke(s,[[100,860],[1700,860]],faint,1);const bw=Math.min(70,(x1-x0)/marks.length*.42),max=Math.max(1,...marks.map(p=>p.value));marks.forEach(p=>el('rect',{x:p.x-bw/2,y:955-p.value/max*70,width:bw,height:p.value/max*70,fill:ink,'fill-opacity':.55},s));
  visualBlock(s,100,975,visualLines(b.note,1590,{size:20,role:'serif',max:2}),{size:20,role:'serif',fill:'#746B5B'});
  return visualFinish(s,{family:'scroll',width:W,height:H,points:marks,domain:scale.domain,yearDomain:[b.points[0].year,b.points.at(-1).year],sourceCase:'195-decade-scroll'});
 }
 return {blueprint,constellation,scroll};
}
function intersects(a,b,pad=0){return a.x<b.x+b.w+pad&&a.x+a.w+pad>b.x&&a.y<b.y+b.h+pad&&a.y+a.h+pad>b.y}
function segmentHits(a,b,r){let lo=0,hi=1;const dx=b[0]-a[0],dy=b[1]-a[1];for(const [p,q] of [[-dx,a[0]-r.x],[dx,r.x+r.w-a[0]],[-dy,a[1]-r.y],[dy,r.y+r.h-a[1]]]){if(Math.abs(p)<1e-9){if(q<0)return false;continue}const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return false}return true}
