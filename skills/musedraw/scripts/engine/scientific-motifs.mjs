// Original editable scientific drawing vocabulary. A motif depicts an object;
// it does not decide the scientific meaning or supply experimental evidence.
import {measure} from './text.mjs';
import {laminateParts} from './scientific-laminate.mjs';
import {duplexParts} from './scientific-duplex.mjs';
const r=n=>Math.round(n*100)/100;
const bad=(b,message)=>{throw new Error(`Scientific motif ${b.id}: ${message}`);};
const hex=/^#[0-9a-f]{6}$/i;
function shade(col,t){
  if(!hex.test(col))return col;
  return '#'+[1,3,5].map(i=>Math.max(0,Math.min(255,Math.round(parseInt(col.slice(i,i+2),16)*(1-t)+255*t))).toString(16).padStart(2,'0')).join('');
}
function check(b){
  for(const key of ['x','y','w','h'])if(!Number.isFinite(b[key])||(key==='w'||key==='h')&&b[key]<=0)bad(b,`${key} must be finite; width and height must be positive`);
  if(!['graph','network','tensor','sequence','layers','cycle','manifold','formula','laminate','duplex'].includes(b.kind))bad(b,'unknown scientific kind');
  const common=['id','type','kind','x','y','w','h','palette','size'];
  const special={graph:['points','links','diameter'],network:['layers','diameter'],tensor:['cells','depth','offset','cellStroke'],sequence:['tracks','links','bandHeight'],layers:['layers','projection','separation'],cycle:['steps','startAngle','thickness'],manifold:['points','links','diameter'],formula:['runs','enclosure'],laminate:['layers','deflection','gap','electrodes','labelSide','states','load'],duplex:['turns','phase','amplitude','strandWidth','strands','sites','markerRadius','markerOffset','rungs','siteNames']};
  for(const field of Object.keys(b))if(!common.includes(field)&&!special[b.kind].includes(field))bad(b,`unsupported field ${field}`);
  if(b.palette!==undefined&&(!b.palette||typeof b.palette!=='object'||Array.isArray(b.palette)))bad(b,'palette must be a colour-role object');
  if(b.size!==undefined&&(!Number.isFinite(b.size)||b.size<=0))bad(b,'size must be positive');
}
export function scientificMotif(b,theme){
  check(b);
  const out={nodes:[],edges:[],paths:[],texts:[],nativeModules:[{id:b.id}]};
  const p={ink:'#3C4749',neutral:'#ADB6B7',focus:'#4B8695',soft:'#D9E9E7',warm:'#C49370',...b.palette};
  const X=v=>r(b.x+v*b.w),Y=v=>r(b.y+v*b.h),size=b.size??16;
  let serial=0;
  const node=(id,shape,x,y,w,h,fill,stroke=p.ink,label='')=>{
    const n={id:`${b.id}-${encodeURIComponent(id)}`,shape,x:r(x),y:r(y),w:r(w),h:r(h),fill,stroke,label,
      labelPos:label?'inside':'none',textColor:p.ink,tone:'default',radius:0,padding:2,size,weight:400,overlap:true};
    out.nodes.push(n);return n.id;
  };
  const path=(d,fill='none',stroke=p.ink,width=1.15,extra={})=>out.paths.push({id:`${b.id}-part-${++serial}`,d,fill,stroke,width,...extra});
  const text=(x,y,label,extra={})=>{if(label!==undefined&&label!=='')out.texts.push({id:`${b.id}-label-${++serial}`,x:r(x),y:r(y),text:String(label),size,color:p.ink,...extra});};
  // A stable invisible terminal lets ordinary connected edges target a motif.
  out.nodes.push({id:b.id,shape:'box',x:b.x,y:b.y,w:b.w,h:b.h,fill:'none',stroke:'none',label:'',labelPos:'none',overlap:true,radius:0});
  if(b.kind==='duplex'){
    const parts=duplexParts(b,p,size);
    for(const key of ['nodes','edges','paths','texts'])out[key].push(...parts[key]);
  }
  if(b.kind==='laminate'){
    const append=parts=>{for(const key of ['nodes','edges','paths','texts'])out[key].push(...parts[key]);};
    if(b.states===undefined)append(laminateParts(b,p,size));
    else{
      if(b.deflection!==undefined||b.load!==undefined||!Array.isArray(b.states)||b.states.length<1||b.states.length>6)bad(b,'laminate states require 1..6 frames and no top-level deflection/load');
      const ids=new Set(),gap=18,frameW=(b.w-gap*(b.states.length-1))/b.states.length,labelH=size*1.8;
      if(frameW<24||b.h-labelH<8)bad(b,'laminate state frames do not fit');
      const {states,...shared}=b;
      for(const [i,state] of states.entries()){
        if(!state||typeof state.id!=='string'||!state.id.trim()||ids.has(state.id)||typeof state.label!=='string'||!state.label.trim()||Object.keys(state).some(k=>!['id','label','deflection','load'].includes(k)))bad(b,'laminate states need unique IDs, labels and explicit deflection');
        if(!Number.isFinite(state.deflection))bad(b,'laminate state deflection must be explicit');
        ids.add(state.id);const x=b.x+i*(frameW+gap);
        append(laminateParts({...shared,id:`${b.id}-state-${encodeURIComponent(state.id)}`,x,y:b.y+labelH,w:frameW,h:b.h-labelH,deflection:state.deflection,...(state.load!==undefined?{load:state.load}:{})},p,size));
        text(x+frameW/2,b.y+size,state.label,{anchor:'middle',w:frameW});
      }
    }
  }
  if(b.kind==='formula'){
    if(b.enclosure!==undefined&&!['circle','box'].includes(b.enclosure))bad(b,'formula enclosure must be circle or box');
    if(b.enclosure)Object.assign(out.nodes[0],{shape:b.enclosure,fill:p.soft,stroke:p.ink});
    // Explicit script trees preserve scientific identity without TeX, Unicode
    // approximations or raster equations. Every run remains a native text item.
    let count=0;
    const layout=(runs,em,depth=0)=>{
      if(!Array.isArray(runs)||!runs.length||depth>2)bad(b,'formula requires runs, with at most two script levels');
      const items=[];let advance=0;
      for(const run of runs){
        if(++count>100||!run||typeof run.text!=='string'||!run.text||Object.keys(run).some(k=>!['text','sub','sup','vector','italic'].includes(k)))bad(b,'invalid formula run');
        if(run.vector!==undefined&&typeof run.vector!=='boolean'||run.italic!==undefined&&typeof run.italic!=='boolean')bad(b,'formula vector/italic must be boolean');
        const width=measure(run.text,em,'Times New Roman')+em*.06;
        items.push({x:advance,y:0,text:run.text,size:em,italic:run.italic??/[a-zA-Z\u0370-\u03ff]/.test(run.text)});
        if(run.vector)items.push({arrow:[advance,-em*.88,advance+Math.max(width-em*.12,em*.48),-em*.88],size:em});
        let scriptWidth=0;
        for(const [key,dy] of [['sub',em*.28],['sup',-em*.58]])if(run[key]!==undefined){
          const nested=typeof run[key]==='string'?[{text:run[key]}]:run[key];
          const result=layout(nested,em*.64,depth+1);
          for(const item of result.items)items.push({...item,x:(item.x??0)+advance+width,y:(item.y??0)+dy,...(item.arrow?{arrow:item.arrow.map((v,i)=>v+(i%2?dy:advance+width))}:{})});
          scriptWidth=Math.max(scriptWidth,result.width);
        }
        advance+=width+scriptWidth;
      }
      return {items,width:advance};
    };
    const result=layout(b.runs,size),left=b.x+(b.w-result.width)/2;
    const top=Math.min(...result.items.map(i=>i.arrow?i.arrow[1]-i.size*.12:i.y-i.size*.82));
    const bottom=Math.max(...result.items.map(i=>i.arrow?i.arrow[3]+i.size*.12:i.y+i.size*.22));
    const baseline=b.y+(b.h-bottom+top)/2-top;
    if(result.width>b.w+.01)bad(b,'formula exceeds its width; increase w or reduce size');
    if(bottom-top>b.h+.01)bad(b,'formula exceeds its height; increase h or reduce size');
    for(const item of result.items){
      if(item.arrow){const [x1,y1,x2,y2]=item.arrow,dy=item.size*.12;path(`M${r(left+x1)} ${r(baseline+y1)}H${r(left+x2)}M${r(left+x2-dy)} ${r(baseline+y2-dy)}L${r(left+x2)} ${r(baseline+y2)}L${r(left+x2-dy)} ${r(baseline+y2+dy)}`,'none',p.ink,Math.max(.65,item.size*.045));}
      else text(left+item.x,baseline+item.y,item.text,{size:item.size,font:'Times New Roman, serif',italic:item.italic});
    }
  }
  if(b.kind==='graph'){
    if(!Array.isArray(b.points)||!b.points.length||b.points.length>100)bad(b,'graph requires 1..100 explicit points');
    const ids=new Map();
    b.points.forEach((v,i)=>{
      if(!v.id||ids.has(v.id)||![v.x,v.y].every(n=>Number.isFinite(n)&&n>=0&&n<=1))bad(b,'graph points need unique IDs and x/y in 0..1');
      const d=v.diameter??b.diameter??8;if(!Number.isFinite(d)||d<=0||d>Math.min(b.w,b.h)/2)bad(b,'invalid point diameter');
      ids.set(v.id,node(v.id,'circle',X(v.x)-d/2,Y(v.y)-d/2,d,d,v.fill??p.soft,v.stroke??p.ink));
      if(v.label)text(X(v.x),Y(v.y)-d/2-6,v.label,{anchor:'middle'});
    });
    for(const [i,e] of (b.links??[]).entries()){
      if(!ids.has(e.from)||!ids.has(e.to)||e.from===e.to)bad(b,'graph links need distinct existing point IDs');
      out.edges.push({id:`${b.id}-bond-${i}`,from:ids.get(e.from),to:ids.get(e.to),route:'straight',arrow:e.directed?'triangle':'none',color:e.color??p.ink,width:e.width??1.1,...(e.dash?{dash:e.dash}:{})});
    }
  }
  if(b.kind==='network'){
    if(!Array.isArray(b.layers)||b.layers.length<2||b.layers.length>12||b.layers.some(n=>!Number.isInteger(n)||n<1||n>16))bad(b,'network layers require 2..12 explicit counts in 1..16');
    const d=Math.min(b.diameter??12,b.h/(Math.max(...b.layers)*1.8),b.w/(b.layers.length*2.2));
    const groups=b.layers.map((n,i)=>Array.from({length:n},(_,j)=>node(`layer-${i}-unit-${j}`,'circle',X(.06+.88*i/(b.layers.length-1))-d/2,Y((j+1)/(n+1))-d/2,d,d,i===b.layers.length-1?p.focus:p.soft,p.focus)));
    groups.slice(0,-1).forEach((from,i)=>from.forEach(a=>groups[i+1].forEach(to=>out.edges.push({id:`${b.id}-link-${++serial}`,from:a,to,route:'straight',arrow:'none',color:shade(p.focus,.68),width:.8}))));
  }
  if(b.kind==='manifold'){
    const cx=X(.5),cy=Y(.5),radius=Math.min(b.w,b.h)*.46;
    const ellipse=(rx,ry)=>path(`M${r(cx-rx)} ${cy}A${r(rx)} ${r(ry)} 0 1 0 ${r(cx+rx)} ${cy}A${r(rx)} ${r(ry)} 0 1 0 ${r(cx-rx)} ${cy}`,'none',p.neutral,.95);
    ellipse(radius,radius);ellipse(radius,radius*.29);ellipse(radius*.29,radius);
    const ids=new Map();
    for(const point of b.points??[]){
      if(!point||!point.id||ids.has(point.id)||![point.x,point.y].every(n=>Number.isFinite(n)&&n>=0&&n<=1)||(2*point.x-1)**2+(2*point.y-1)**2>1+1e-9)bad(b,'manifold points require unique IDs and positions inside its unit disk');
      const d=point.diameter??b.diameter??7;
      if(!Number.isFinite(d)||d<=0||d>radius/2)bad(b,'invalid manifold point diameter');
      ids.set(point.id,node(point.id,'circle',cx+(point.x*2-1)*radius-d/2,cy+(point.y*2-1)*radius-d/2,d,d,point.fill??p.soft,point.stroke??p.focus));
    }
    for(const [i,edge] of (b.links??[]).entries()){
      if(!ids.has(edge.from)||!ids.has(edge.to)||edge.from===edge.to)bad(b,'manifold links require existing point IDs');
      out.edges.push({id:`${b.id}-geometry-${i}`,from:ids.get(edge.from),to:ids.get(edge.to),route:'straight',arrow:'none',color:edge.color??p.ink,width:edge.width??.9});
    }
  }
  if(b.kind==='tensor'){
    const values=b.cells;
    if(!Array.isArray(values)||!values.length||values.length>30||values.some(row=>!Array.isArray(row)||row.length!==values[0].length)||!values[0].length||values[0].length>30)bad(b,'tensor needs a rectangular explicit cells array, max 30 by 30');
    const depth=b.depth??1;if(!Number.isInteger(depth)||depth<1||depth>6)bad(b,'tensor depth must be 1..6');
    const ox=b.offset?.[0]??7,oy=b.offset?.[1]??-7;
    if(![ox,oy].every(Number.isFinite))bad(b,'tensor offset requires two finite pixel values');
    const cw=(b.w-Math.abs(ox)*(depth-1))/values[0].length,ch=(b.h-Math.abs(oy)*(depth-1))/values.length;
    if(cw<3||ch<3)bad(b,'tensor cells do not fit the frame');
    const startX=b.x+(ox<0?Math.abs(ox)*(depth-1):0),startY=b.y+(oy<0?Math.abs(oy)*(depth-1):0);
    for(let layer=depth-1;layer>=0;layer--)values.forEach((row,j)=>row.forEach((value,i)=>{
      if(typeof value!=='string')bad(b,'tensor cells are explicit colour tokens, not inferred measurements');
      const fill=p[value]??value;
      node(`sheet-${layer}-cell-${j}-${i}`,'box',startX+layer*ox+i*cw,startY+layer*oy+j*ch,cw,ch,layer?shade(fill,.35):fill,b.cellStroke??'#FFFFFF');
    }));
  }
  if(b.kind==='sequence'){
    if(!Array.isArray(b.tracks)||!b.tracks.length||b.tracks.length>16)bad(b,'sequence requires 1..16 explicit tracks');
    const gap=b.h/b.tracks.length,th=Math.min(b.bandHeight??12,gap*.45);
    b.tracks.forEach((track,j)=>{
      if(!track||typeof track!=='object')bad(b,'tracks must be objects');
      const y=Y((j+.5)/b.tracks.length);
      if(!Array.isArray(track.segments)||!track.segments.length)bad(b,'each track needs explicit segments');
      if(track.backbone!==false)path(`M${X(0)} ${r(y)}H${X(1)}`,'none',p.neutral,.8);
      track.segments.forEach((s,i)=>{
        if(![s.start,s.end].every(v=>Number.isFinite(v)&&v>=0&&v<=1)||s.end<=s.start)bad(b,'segment start/end must satisfy 0 <= start < end <= 1');
        node(`track-${j}-segment-${i}`,'box',X(s.start),y-th/2,(s.end-s.start)*b.w,th,p[s.fill]??s.fill??p.focus,'none',s.label??'');
      });
      if(track.label)text(b.x-8,y+size*.35,track.label,{anchor:'end'});
    });
    for(const [i,l] of (b.links??[]).entries()){
      if(!Array.isArray(l.from)||!Array.isArray(l.to)||l.from.length!==2||l.to.length!==2)bad(b,'sequence links use [track index, x fraction] endpoints');
      const [a,x]=l.from,[c,z]=l.to;
      if(![a,c].every(n=>Number.isInteger(n)&&n>=0&&n<b.tracks.length)||![x,z].every(n=>Number.isFinite(n)&&n>=0&&n<=1))bad(b,'invalid sequence link endpoint');
      const y1=Y((a+.5)/b.tracks.length),y2=Y((c+.5)/b.tracks.length);
      path(`M${X(x)} ${y1}C${X(x)} ${r((y1+y2)/2)} ${X(z)} ${r((y1+y2)/2)} ${X(z)} ${y2}`,'none',l.color??p.neutral,l.width??1);
    }
  }
  if(b.kind==='layers'){
    if(!Array.isArray(b.layers)||!b.layers.length||b.layers.length>12)bad(b,'layers needs 1..12 explicitly named layers');
    for(const layer of b.layers){
      if(!layer||typeof layer!=='object'||Array.isArray(layer))bad(b,'layers must be objects');
      if(layer.pattern!==undefined&&layer.pattern!=='grid')bad(b,'layer pattern must be grid when supplied');
    }
    const dx=b.projection?.[0]??b.w*.16,dy=b.projection?.[1]??-b.h*.12;
    const separation=b.separation??b.h*.09;
    if(![dx,dy,separation].every(Number.isFinite)||separation<0)bad(b,'projection and separation must be finite; separation is nonnegative');
    if(dy===0&&b.layers.some(layer=>layer.pattern==='grid'))bad(b,'grid needs a top face with nonzero vertical projection');
    const thickness=(b.h-b.layers.length*Math.abs(dy)-separation*(b.layers.length-1))/b.layers.length;
    const faceW=b.w-Math.abs(dx);
    if(thickness<2||faceW<5)bad(b,'layer geometry does not fit the frame');
    const left=b.x+(dx<0?-dx:0),top=b.y+(dy<0?-dy:0);
    // Back-to-front is explicit, with consistent top/side illumination.
    for(let i=b.layers.length-1;i>=0;i--){
      const layer=b.layers[i];if(!layer||typeof layer!=='object')bad(b,'layers must be objects');
      const fill=p[layer.fill]??layer.fill??p.soft,y=top+i*(thickness+Math.abs(dy)+separation);
      path(`M${r(left)} ${r(y)}l${r(dx)} ${r(dy)}h${r(faceW)}l${r(-dx)} ${r(-dy)}Z`,shade(fill,.28),p.ink,.9);
      if(layer.pattern==='grid'){
        // Qualitative material mesh only: spacing is not an experimental value.
        // Affine top-face coordinates use exactly its horizontal and projected
        // axes. Insets keep every independent native stroke inside the face.
        const point=(u,v)=>`${r(left+u*faceW+v*dx)} ${r(y+v*dy)}`;
        for(let j=1;j<9;j++)path(`M${point(j/9,.06)}L${point(j/9,.94)}`,'none',shade(p.ink,.2),.55,{id:`${b.id}-layer-${i}-grid-u-${j}`});
        for(let j=1;j<4;j++)path(`M${point(.04,j/4)}L${point(.96,j/4)}`,'none',shade(p.ink,.2),.55,{id:`${b.id}-layer-${i}-grid-v-${j}`});
      }
      // Choose the outer side that remains exposed beyond the front rectangle.
      // Positive dy puts the front on the translated top-face edge; negative dy
      // puts it on the unshifted edge. The top-face/grid axes never change.
      const sideRight=dy>=0?dx<0:dx>=0,sideX=left+(sideRight?faceW:0);
      path(`M${r(sideX)} ${r(y)}l${r(dx)} ${r(dy)}v${r(thickness)}l${r(-dx)} ${r(-dy)}Z`,shade(fill,-.15),p.ink,.9);
      const frontX=left+(dy>=0?dx:0),frontY=y+(dy>=0?dy:0);
      node(`layer-${i}`,'box',frontX,frontY,faceW,thickness,fill,p.ink);
      if(layer.label)text(left+faceW+Math.max(dx,0)+12,frontY+thickness/2+size*.35,layer.label);
    }
  }
  if(b.kind==='cycle'){
    if(!Array.isArray(b.steps)||b.steps.length<3||b.steps.length>8)bad(b,'cycle requires 3..8 explicit steps');
    const cx=X(.5),cy=Y(.5),radius=Math.min(b.w,b.h)*.3,th=b.thickness??Math.min(b.w,b.h)*.045;
    if(!Number.isFinite(th)||th<1||th>radius*.4)bad(b,'invalid cycle arrow thickness');
    const sector=Math.PI*2/b.steps.length,start=b.startAngle??-90;
    const pt=(rad,a)=>[r(cx+rad*Math.cos(a)),r(cy+rad*Math.sin(a))];
    b.steps.forEach((step,i)=>{
      if(!step||typeof step!=='object'||typeof step.label!=='string'||!step.label.trim())bad(b,'cycle steps need explicit label objects');
      const a=(start*Math.PI/180)+i*sector+.12,z=a+sector-.42,tip=z+.18;
      const A=pt(radius+th/2,a),B=pt(radius+th/2,z),C=pt(radius+th,z),D=pt(radius,tip),E=pt(radius-th,z),F=pt(radius-th/2,z),G=pt(radius-th/2,a);
      path(`M${A}A${r(radius+th/2)} ${r(radius+th/2)} 0 0 1 ${B}L${C}L${D}L${E}L${F}A${r(radius-th/2)} ${r(radius-th/2)} 0 0 0 ${G}Z`,step.fill??p.soft,p.focus,.7);
      const mid=a+(sector-.24)/2,tx=cx+Math.cos(mid)*(radius+th+18),ty=cy+Math.sin(mid)*(radius+th+18);
      text(tx,ty+size*.35,step.label,{anchor:Math.cos(mid)>.25?'start':Math.cos(mid)<-.25?'end':'middle'});
    });
  }
  for(const kind of ['nodes','edges','paths','texts'])for(const part of out[kind])part.nativeModule=b.id;
  return out;
}
