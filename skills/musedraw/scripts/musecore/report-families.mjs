import {el,makeFig,GREY} from './svg.mjs';

// These three families share type measurement, bounded text, tracks and drawing
// material with lanes/schedule. They do not infer relations from topic labels.
export function reportFamilies(h){
  const {need,list,fields,str,unique,width,wrap,track,finish,labelBox}=h;
  const lineH=(lines,size=15)=>lines.length*size*1.38;
  function framed(f,x,y,w,height,title){
    need(width(title,14,'hei')<w-24,'group heading too wide');
    f.rect(x,y,w,height,{dash:true,sw:.9,fill:'none'});
    el('rect',{x:x+10,y:y-8,width:width(title,14,'hei')+8,height:17,fill:'#fff'},f.svg);
    f.text(x+14,y+5.04,title,{size:14,font:'hei',anchor:'start'});
  }
  function layers(b){
    fields(b,['family','layers','links'],'layers');list(b.layers,2,6,'layers');list(b.links,0,20,'links');unique(b.layers,'layers');
    const ids=new Set(b.layers.map(l=>l.id)), groups=new Map();
    for(const [ri,l] of b.layers.entries()){
      fields(l,['id','label','groups'],'layer');str(l.label,'layer.label');list(l.groups,1,3,'groups');
      for(const g of l.groups){fields(g,['id','title','items'],'group');str(g.id,'group.id');str(g.title,'group.title');list(g.items,0,8,'group.items');g.items.forEach(t=>str(t,'item'));need(!ids.has(g.id),'duplicate object id '+g.id);ids.add(g.id);groups.set(g.id,{...g,ri})}
    }
    for(const e of b.links){fields(e,['from','to','label'],'link');need(ids.has(e.from)&&ids.has(e.to),'unknown layer/group endpoint');if(e.label!==undefined)str(e.label,'link.label')}
    const plans=b.layers.map((l,ri)=>{
      const sibling=b.links.filter(e=>groups.get(e.from)?.ri===ri&&groups.get(e.to)?.ri===ri);
      const gap=sibling.length?Math.max(64,...sibling.map(e=>width(e.label??'',14)+12)):16;
      need(gap<=92,'sibling relation label too long');
      const gw=(640-gap*(l.groups.length-1))/l.groups.length;
      const gs=l.groups.map((g,i)=>{
        const minimumItem=Math.max(70,Math.min(130,Math.max(0,...g.items.map(t=>width(t,14)+16))));
        const title=wrap(g.title,gw-20,16,'hei',2),columns=Math.min(g.items.length,Math.max(1,Math.floor((gw-24+8)/(minimumItem+8))));
        const iw=columns?(gw-24-8*(columns-1))/columns:0;
        const items=g.items.map(t=>wrap(t,iw-12,14,'song',3));
        const rowHeights=[];for(let k=0;k<items.length;k+=columns)rowHeights.push(Math.max(42,...items.slice(k,k+columns).map(ls=>lineH(ls,14)+12)));
        const heading=lineH(title,16)+14,body=rowHeights.reduce((a,v)=>a+v,0)+Math.max(0,rowHeights.length-1)*8;
        return {...g,x:70+i*(gw+gap),w:gw,title,items,columns,iw,rowHeights,heading,height:Math.max(44,heading+(items.length?body+12:0))};
      });
      const label=wrap(l.label,42,15,'hei',4),height=Math.max(...gs.map(g=>g.height),lineH(label)+12);
      return {id:l.id,gs,gap,label,height,sibling};
    });
    let y=10;const objects=new Map();
    for(const [ri,row] of plans.entries()){
      row.y=y;objects.set(row.id,{id:row.id,ri,x:70,y,w:640,h:row.height});
      row.gs.forEach(g=>objects.set(g.id,{id:g.id,ri,x:g.x,y,w:g.w,h:row.height}));
      const labels=b.links.filter(e=>{const a=objects.get(e.from)??groups.get(e.from);return a?.ri===ri&&e.label}).map(e=>e.label);
      // Links are validated after all object tracks exist; reserve a legible gap.
      y+=row.height+(ri<plans.length-1?Math.max(40,...labels.map(t=>lineH(wrap(t,400,14,'song',2),14)+20)):0);
    }
    const f=makeFig(720,y+10),edges=[];
    for(const e of b.links){
      const a=objects.get(e.from),z=objects.get(e.to);let points;
      if(a.ri===z.ri){need(groups.has(e.from)&&groups.has(e.to)&&Math.abs(plans[a.ri].gs.findIndex(g=>g.id===a.id)-plans[a.ri].gs.findIndex(g=>g.id===z.id))===1,'only neighbouring group links supported');const d=Math.sign(z.x-a.x);points=[[a.x+(d>0?a.w:0),a.y+a.h/2],[z.x+(d>0?0:z.w),z.y+z.h/2]];if(e.label)f.text((points[0][0]+points[1][0])/2,points[0][1]-8,e.label,{size:14})}
      else{need(Math.abs(a.ri-z.ri)===1,'layer link must connect neighbouring layers');const down=z.ri>a.ri;
        // Anchor on the overlapping span rather than drawing diagonal arrows.
        const left=Math.max(a.x,z.x),right=Math.min(a.x+a.w,z.x+z.w);need(right-left>=30,'layer endpoints have no shared vertical span');const x=(left+right)/2;
        points=[[x,down?a.y+a.h:a.y],[x,down?z.y:z.y+z.h]];
        if(e.label){const ls=wrap(e.label,Math.max(150,x<360?700-x:x-80),14,'song',2);f.lines(x+(x<360?10:-10),(points[0][1]+points[1][1])/2,ls,{size:14,anchor:x<360?'start':'end'})}
      }
      f.arrow(points);edges.push({...e,points});
    }
    for(const row of plans){
      labelBox(f,10,row.y,50,row.height,row.label,{fill:GREY,font:'hei'});
      for(const g of row.gs){f.rect(g.x,row.y,g.w,row.height);f.lines(g.x+g.w/2,row.y+g.heading/2,g.title,{size:16,font:'hei'});
        const rs=track(g.rowHeights,row.y+g.heading);g.items.forEach((ls,i)=>{const r=Math.floor(i/g.columns),c=i%g.columns;labelBox(f,g.x+12+c*(g.iw+8),rs[r].start+r*8,g.iw,rs[r].size,ls,{size:14})});
      }
    }
    return finish(f,{family:'layers',width:720,height:y+10,objects:[...objects.values()],edges,rowHeights:plans.map(r=>r.height)});
  }
  function association(b){
    fields(b,['family','sources','hub','chain','shared'],'association');
    fields(b.sources,['title','items'],'sources');str(b.sources.title,'sources.title');list(b.sources.items,2,7,'sources.items');
    fields(b.hub,['title','subtitle','upper','lower','relation'],'hub');for(const key of ['title','subtitle','relation'])str(b.hub[key],'hub.'+key);
    fields(b.chain,['title','nodes','keys'],'chain');str(b.chain.title,'chain.title');list(b.chain.nodes,2,7,'chain.nodes');list(b.chain.keys,b.chain.nodes.length-1,b.chain.nodes.length-1,'chain.keys');
    const sourceLines=b.sources.items.map(t=>wrap(t,114,15,'song',3)),chainLines=b.chain.nodes.map(t=>wrap(t,116,15,'song',3)),keys=b.chain.keys.map(t=>wrap(t,70,13,'song',2));
    const sourceHeights=sourceLines.map(ls=>Math.max(32,lineH(ls)+10)),chainHeights=chainLines.map(ls=>Math.max(32,lineH(ls)+10));
    const chainGaps=keys.map(ls=>Math.max(28,lineH(ls,13)+8));
    const top=40,sourceHeight=sourceHeights.reduce((a,v)=>a+v,0)+(sourceLines.length-1)*20;
    const chainHeight=chainHeights.reduce((a,v)=>a+v,0)+chainGaps.reduce((a,v)=>a+v,0);
    const ht=wrap(b.hub.title,208,17,'hei',2),hs=wrap(b.hub.subtitle,208,14,'song',2),hu=wrap(b.hub.upper,184,15,'song',3),hl=wrap(b.hub.lower,184,15,'song',3),rel=wrap(b.hub.relation,96,14,'song',2);
    const upperH=Math.max(52,lineH(hu)+12),lowerH=Math.max(52,lineH(hl)+12),hubHead=lineH(ht,17)+lineH(hs,14)+22,hubGap=Math.max(54,lineH(rel,14)+16);
    const hubH=hubHead+upperH+hubGap+lowerH+16,bodyH=Math.max(sourceHeight,chainHeight,hubH),frameBottom=top+bodyH+14;
    const shared=b.shared;let sh;
    if(shared){fields(shared,['title','items','relation'],'shared');str(shared.title,'shared.title');str(shared.relation,'shared.relation');list(shared.items,1,4,'shared.items');const cellW=(668-20*(shared.items.length-1))/shared.items.length;sh={cellW,lines:shared.items.map(t=>wrap(t,cellW-16,14,'song',3))};sh.height=Math.max(46,...sh.lines.map(ls=>lineH(ls,14)+12));sh.relation=wrap(shared.relation,300,14,'song',2)}
    const sharedY=frameBottom+(sh?Math.max(42,lineH(sh.relation,14)+20):0),H=sh?sharedY+sh.height+34:frameBottom+12,f=makeFig(720,H),objects=[],edges=[];
    framed(f,10,12,150,frameBottom-12,b.sources.title);framed(f,474,12,236,frameBottom-12,b.chain.title);
    let sy=top;const sourceBoxes=sourceLines.map((ls,i)=>{const box={id:'source-'+i,x:22,y:sy,w:126,h:sourceHeights[i]};sy+=box.h+20;labelBox(f,box.x,box.y,box.w,box.h,ls);objects.push(box);return box});
    const hy=top+(bodyH-hubH)/2,hub={id:'hub',x:200,y:hy,w:240,h:hubH};objects.push(hub);f.rect(hub.x,hub.y,hub.w,hub.h);
    f.lines(320,hy+12+lineH(ht,17)/2,ht,{size:17,font:'hei'});f.lines(320,hy+18+lineH(ht,17)+lineH(hs,14)/2,hs,{size:14});
    const uy=hy+hubHead,ly=uy+upperH+hubGap;labelBox(f,220,uy,200,upperH,hu);labelBox(f,220,ly,200,lowerH,hl);
    f.arrow([[320,uy+upperH],[320,ly]],{both:true});f.lines(330,uy+upperH+hubGap/2,rel,{size:14,anchor:'start'});
    const centers=sourceBoxes.map(s=>s.y+s.h/2),cy=hy+hubH/2;
    sourceBoxes.forEach(s=>f.hline(s.x+s.w,176,s.y+s.h/2));f.vline(176,Math.min(...centers,cy),Math.max(...centers,cy));f.arrow([[176,cy],[200,cy]]);
    sourceBoxes.forEach(s=>edges.push({from:s.id,to:'hub',points:[[s.x+s.w,s.y+s.h/2],[176,s.y+s.h/2],[176,cy],[200,cy]]}));
    let ny=top;const chainBoxes=chainLines.map((ls,i)=>{const box={id:'chain-'+i,x:492,y:ny,w:128,h:chainHeights[i]};ny+=box.h+(chainGaps[i]??0);labelBox(f,box.x,box.y,box.w,box.h,ls);objects.push(box);return box});
    const chainCy=chainBoxes[0].y+chainBoxes[0].h/2;
    const entry=chainCy>=hy+12&&chainCy<=hy+hubH-12?[[440,chainCy],[492,chainCy]]:[[440,cy],[456,cy],[456,chainCy],[492,chainCy]];
    f.arrow(entry);edges.push({from:'hub',to:'chain-0',points:entry});
    for(let i=0;i<chainBoxes.length-1;i++){const a=chainBoxes[i],z=chainBoxes[i+1],points=[[556,a.y+a.h],[556,z.y]];f.arrow(points);f.lines(566,(a.y+a.h+z.y)/2,keys[i],{size:13,anchor:'start'});edges.push({from:a.id,to:z.id,key:b.chain.keys[i],points})}
    if(sh){framed(f,10,sharedY,700,sh.height+22,shared.title);sh.lines.forEach((ls,i)=>labelBox(f,26+i*(sh.cellW+20),sharedY+12,sh.cellW,sh.height,ls,{size:14}));const points=[[320,sharedY],[320,hy+hubH]];f.arrow(points);f.lines(330,(sharedY+hy+hubH)/2,sh.relation,{size:14,anchor:'start'});edges.push({from:'shared',to:'hub',points})}
    return finish(f,{family:'association',width:720,height:H,objects,edges});
  }
  function flow(b){
    fields(b,['family','inputs','steps','decision','checks','checkLinks','footer'],'flow');list(b.inputs,1,3,'inputs');list(b.steps,2,5,'steps');unique(b.steps,'steps');
    for(const t of b.inputs)str(t,'input');for(const s of b.steps){fields(s,['id','lines'],'step');str(s.id,'step.id')}
    const d=b.decision;if(d){fields(d,['after','label','continueLabel','returnLabel','branch','repair','recheckLabel'],'decision');need(b.steps.some(s=>s.id===d.after)&&b.steps.at(-1).id!==d.after,'decision.after must precede a later step');for(const k of ['label','continueLabel','returnLabel','recheckLabel'])str(d[k],'decision.'+k)}
    const cx=300,nodeX=180,nodeW=240,inputW=(348-10*(b.inputs.length-1))/b.inputs.length;
    const ins=b.inputs.map(t=>wrap(t,inputW-12,14,'song',3)),inputH=Math.max(48,...ins.map(ls=>lineH(ls,14)+12));
    const prepared=b.steps.map(s=>({...s,lines:wrap(s.lines,nodeW-20,15,'song',4)}));
    let y=10+inputH+34;const nodes=[],rows=[];let diamond;
    for(const s of prepared){const height=Math.max(48,lineH(s.lines)+12),n={...s,x:nodeX,y,w:nodeW,h:height};nodes.push(n);rows.push(height);y+=height;
      if(d?.after===s.id){const ls=wrap(d.label,112,15,'song',2),dh=Math.max(68,lineH(ls)+28);diamond={x:218,y:y+24,w:164,h:dh,lines:ls};y+=24+dh+34}else y+=28;
    }
    const checks=b.checks??[];list(checks,0,5,'checks');const stepMap=new Map(nodes.map(n=>[n.id,n]));
    unique(checks.map(c=>({id:c.step})),'checks');
    const checkRows=checks.map(c=>{fields(c,['step','lines'],'check');need(stepMap.has(c.step),'check refers to unknown step');const ls=wrap(c.lines,184,14,'song',3),n=stepMap.get(c.step),height=Math.max(48,lineH(ls,14)+12);need(height<=n.h+20,'check text exceeds its corresponding step; shorten or split');return {...c,lines:ls,x:494,y:n.y+(n.h-height)/2,w:200,h:height}});
    for(let i=1;i<checkRows.length;i++)need(checkRows[i].y>checkRows[i-1].y+checkRows[i-1].h+12,'checks must follow main-step order without overlap');
    const checkLinks=b.checkLinks??[];list(checkLinks,0,4,'checkLinks');for(const e of checkLinks){fields(e,['from','to'],'checkLink');const ai=checkRows.findIndex(c=>c.step===e.from),zi=checkRows.findIndex(c=>c.step===e.to);need(ai>=0&&zi===ai+1,'checkLink must connect neighbouring checks in order')}
    let branch,repair;if(d){const bs=wrap(d.branch,114,14,'song',3),rs=wrap(d.repair,114,14,'song',3),bh=Math.max(48,lineH(bs,14)+12),rh=Math.max(48,lineH(rs,14)+12);branch={x:36,y:diamond.y+diamond.h/2-bh/2,w:130,h:bh,lines:bs};repair={x:36,y:branch.y+branch.h+28,w:130,h:rh,lines:rs};need(repair.y+repair.h<nodes.at(-1).y+nodes.at(-1).h+70,'return branch too tall; split this flow')}
    const bottom=Math.max(nodes.at(-1).y+nodes.at(-1).h,repair?repair.y+repair.h:0,...checkRows.map(n=>n.y+n.h));
    const footer=b.footer;let ft;if(footer){fields(footer,['title','items'],'footer');str(footer.title,'footer.title');list(footer.items,1,6,'footer.items');const w=(668-10*(footer.items.length-1))/footer.items.length;ft={w,lines:footer.items.map(s=>wrap(s,w-12,14,'song',3))};ft.height=Math.max(28,...ft.lines.map(ls=>lineH(ls,14)+10))}
    const fy=bottom+38,H=ft?fy+ft.height+34:bottom+16,f=makeFig(720,H),edges=[];
    const arrow=(from,to,points,extra={})=>{f.arrow(points,extra);edges.push({from,to,points,...extra})};
    const ib=b.inputs.map((_,i)=>({x:128+i*(inputW+10),y:10,w:inputW,h:inputH}));
    const bus=10+inputH+16;ib.forEach((n,i)=>{labelBox(f,n.x,n.y,n.w,n.h,ins[i],{size:14});f.vline(n.x+n.w/2,n.y+n.h,bus)});f.hline(Math.min(cx,...ib.map(n=>n.x+n.w/2)),Math.max(cx,...ib.map(n=>n.x+n.w/2)),bus);arrow('inputs',nodes[0].id,[[cx,bus],[cx,nodes[0].y]]);
    for(let i=0;i<nodes.length-1;i++){const a=nodes[i],z=nodes[i+1];if(d?.after===a.id){arrow(a.id,'decision',[[cx,a.y+a.h],[cx,diamond.y]]);arrow('decision',z.id,[[cx,diamond.y+diamond.h],[cx,z.y]]);f.text(cx+8,z.y-10,d.continueLabel,{size:14,anchor:'start'})}else arrow(a.id,z.id,[[cx,a.y+a.h],[cx,z.y]])}
    if(d){const cy=diamond.y+diamond.h/2;arrow('decision','branch',[[218,cy],[166,cy]]);f.text(192,cy-8,d.returnLabel,{size:14});arrow('branch','repair',[[101,branch.y+branch.h],[101,repair.y]]);const to=stepMap.get(d.after),ry=to.y+to.h/2;arrow('repair',to.id,[[36,repair.y+repair.h/2],[20,repair.y+repair.h/2],[20,ry],[180,ry]]);f.text(100,ry-8,d.recheckLabel,{size:14});labelBox(f,branch.x,branch.y,branch.w,branch.h,branch.lines,{size:14});labelBox(f,repair.x,repair.y,repair.w,repair.h,repair.lines,{size:14});f.diamond(cx,cy,diamond.w,diamond.h,diamond.lines)}
    nodes.forEach(n=>labelBox(f,n.x,n.y,n.w,n.h,n.lines));
    if(checkRows.length){framed(f,478,Math.min(...checkRows.map(c=>c.y))-20,232,Math.max(...checkRows.map(c=>c.y+c.h))-Math.min(...checkRows.map(c=>c.y))+34,'质量检查');for(const c of checkRows){labelBox(f,c.x,c.y,c.w,c.h,c.lines,{size:14});f.hline(420,c.x,stepMap.get(c.step).y+stepMap.get(c.step).h/2,{dash:true});edges.push({from:c.step,to:'check-'+c.step,points:[[420,stepMap.get(c.step).y+stepMap.get(c.step).h/2],[c.x,stepMap.get(c.step).y+stepMap.get(c.step).h/2]],kind:'check-association'})}for(const e of checkLinks){const a=checkRows.find(c=>c.step===e.from),z=checkRows.find(c=>c.step===e.to);arrow('check-'+a.step,'check-'+z.step,[[594,a.y+a.h],[594,z.y]])}}
    if(ft){framed(f,10,fy,700,ft.height+22,footer.title);ft.lines.forEach((ls,i)=>labelBox(f,26+i*(ft.w+10),fy+12,ft.w,ft.height,ls,{size:14}))}
    return finish(f,{family:'flow',width:720,height:H,nodes,decision:diamond,branch,repair,checks:checkRows,edges});
  }
  function assembly(b){
    fields(b,['family','standards','inputs','operation','outputs','review','standardLinkLabel'],'assembly');
    fields(b.standards,['title','groups'],'standards');str(b.standards.title,'standards.title');list(b.standards.groups,1,3,'standards.groups');
    list(b.inputs,1,2,'inputs');fields(b.operation,['title','items'],'operation');str(b.operation.title,'operation.title');list(b.operation.items,1,5,'operation.items');
    fields(b.outputs,['title','items'],'outputs');str(b.outputs.title,'outputs.title');list(b.outputs.items,1,4,'outputs.items');str(b.standardLinkLabel,'standardLinkLabel');
    if(b.review){fields(b.review,['lines','feedbackLabel'],'review');str(b.review.feedbackLabel,'review.feedbackLabel')}
    const groups=b.standards.groups.map(g=>{fields(g,['title','items'],'standard group');str(g.title,'standard group.title');list(g.items,1,8,'standard group.items');const title=wrap(g.title,146,15,'hei',2),items=g.items.map(t=>wrap(t,146,14,'song',2));return {title,items,heading:lineH(title)+14,h:lineH(title)+24+items.reduce((sum,l)=>sum+lineH(l,14)+3,0)}});
    const inputW=(220-20*(b.inputs.length-1))/b.inputs.length,inputLines=b.inputs.map(t=>wrap(t,inputW-12,14,'song',3)),inputH=Math.max(48,...inputLines.map(t=>lineH(t,14)+12));
    const opTitle=wrap(b.operation.title,200,16,'hei',2),opItems=b.operation.items.map(t=>wrap(t,176,14,'song',3)),opRowH=opItems.map(t=>Math.max(34,lineH(t,14)+10));
    const outItems=b.outputs.items.map(t=>wrap(t,118,15,'song',3)),outRowH=outItems.map(t=>Math.max(34,lineH(t)+10));
    const y=12+inputH+36,head=lineH(opTitle,16)+16,opHeight=head+opRowH.reduce((s,v)=>s+v,0)+12*(opItems.length-1)+12,outHeight=outRowH.reduce((s,v)=>s+v,0)+14*(outItems.length-1)+28;
    const bodyHeight=Math.max(opHeight,outHeight),standardHeight=Math.max(groups.reduce((s,g)=>s+g.h,0)+14*(groups.length-1)+28,y+bodyHeight-12);
    const reviewLines=b.review?wrap(b.review.lines,138,15,'song',3):[],reviewH=b.review?Math.max(38,lineH(reviewLines)+12):0;
    const reviewY=y+bodyHeight+38,feedback=b.review?wrap(b.review.feedbackLabel,200,14,'song',2):[];
    const bottom=Math.max(12+standardHeight,b.review?reviewY+reviewH:y+bodyHeight),H=bottom+16,f=makeFig(720,H),edges=[];
    framed(f,10,12,190,standardHeight,b.standards.title);let gy=30;
    for(const g of groups){f.rect(24,gy,162,g.h);f.lines(105,gy+g.heading/2,g.title,{font:'hei'});f.hline(24,186,gy+g.heading,{sw:.7});let ty=gy+g.heading+8;for(const ls of g.items){f.lines(105,ty+lineH(ls,14)/2,ls,{size:14});ty+=lineH(ls,14)+3}gy+=g.h+14}
    const center={id:'operation',x:260,y,w:220,h:bodyHeight};f.rect(center.x,center.y,center.w,center.h);f.lines(370,y+head/2,opTitle,{size:16,font:'hei'});
    const opRows=track(opRowH,y+head);opItems.forEach((ls,i)=>labelBox(f,276,opRows[i].start+i*12,188,opRows[i].size,ls,{size:14}));
    const arrow=(from,to,points,o={})=>{f.arrow(points,o);edges.push({from,to,points,...o})};
    b.inputs.forEach((_,i)=>{const x=260+i*(inputW+20);labelBox(f,x,12,inputW,inputH,inputLines[i],{size:14});arrow('input-'+i,'operation',[[x+inputW/2,12+inputH],[x+inputW/2,y]])});
    const linkY=Math.max(y+head+10,Math.min(12+standardHeight-16,y+bodyHeight/2));
    arrow('standards','operation',[[200,linkY],[260,linkY]]);need(width(b.standardLinkLabel,14)<=60,'standard link label too wide for this composition');f.text(230,linkY-8,b.standardLinkLabel,{size:14});
    framed(f,540,y,170,bodyHeight,b.outputs.title);const outRows=track(outRowH,y+14);const outBoxes=outItems.map((ls,i)=>{const n={id:'output-'+i,x:560,y:outRows[i].start+i*14,w:130,h:outRows[i].size};labelBox(f,n.x,n.y,n.w,n.h,ls);return n});
    const mid=y+bodyHeight/2,centers=outBoxes.map(n=>n.y+n.h/2);f.hline(480,512,mid);f.vline(512,Math.min(mid,...centers),Math.max(mid,...centers));for(const n of outBoxes){const points=[[512,n.y+n.h/2],[560,n.y+n.h/2]];f.arrow(points);edges.push({from:'operation',to:n.id,points:[[480,mid],[512,mid],[512,n.y+n.h/2],[560,n.y+n.h/2]]})}
    if(b.review){arrow('outputs','review',[[625,y+bodyHeight],[625,reviewY]]);labelBox(f,550,reviewY,150,reviewH,reviewLines);const ry=reviewY+reviewH/2;arrow('review','operation',[[550,ry],[370,ry],[370,y+bodyHeight]],{dash:true});f.lines(460,ry-8-lineH(feedback,14)/2,feedback,{size:14})}
    return finish(f,{family:'assembly',width:720,height:H,operation:center,standardHeight,outputs:outBoxes,edges});
  }
  return {layers,association,flow,assembly};
}
