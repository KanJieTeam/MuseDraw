// Native mxGraph export. SVG is measured in the already-open font-loaded page;
// no embedded image, foreignObject, external URL or editor dependency is used.
import { deflateRawSync } from 'node:zlib';

const xml = value => String(value ?? '').replace(/[&<>"'\n\r\t]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;','\n':'&#xa;','\r':'&#xd;','\t':'&#x9;'}[c]));
const num = n => Math.round(Number(n) * 1000) / 1000;
const attrs = obj => Object.entries(obj).map(([k,v]) => ` ${k}="${xml(v)}"`).join('');
const geometry = (x,y,w,h,extra='') => `<mxGeometry${attrs({x:num(x),y:num(y),width:num(w),height:num(h)})} as="geometry">${extra}</mxGeometry>`;

// This function is serialized by Playwright; keep it independent of the module.
export function collectEditableScene() {
  const svg = document.querySelector('svg');
  const groups = [], shapes = [], texts = [], edges = [], omitted = new Set();
  const bounds = el => { const b=el.getBBox(),m=el.getCTM(); const p=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>[m.a*x+m.c*y+m.e,m.b*x+m.d*y+m.f]); const xs=p.map(p=>p[0]),ys=p.map(p=>p[1]); return [Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)]; };
  const opacity = el => { let v=1; for(let p=el;p&&p!==svg;p=p.parentElement)v*=Number(getComputedStyle(p).opacity); return v; };
  const paint = (value,el) => {
    if(!value.startsWith('url('))return value;
    const id=value.match(/#([^)'"\s]+)/)?.[1], def=id&&document.getElementById(id);
    if(def?.tagName.toLowerCase().endsWith('gradient')){omitted.add('gradient-interpolation');return getComputedStyle(def.querySelector('stop')).stopColor;}
    omitted.add('paper-texture'); return 'none';
  };
  let serial=0;
  function walk(el,parent=null,edgeParent=null){
    const tag=el.tagName.toLowerCase();
    if(['defs','title','desc','metadata'].includes(tag))return;
    if(tag==='g'){
      if(el.dataset.md==='edge'&&el.dataset.connection){edges.push({id:el.id,...JSON.parse(el.dataset.connection)});return;}
      if(el.dataset.md==='edge-label')edgeParent=el.dataset.edge||null;
      if(el.dataset.md||['header','footer','legend','texts','notes'].includes(el.id)){
        const box=el.dataset.box?el.dataset.box.split(',').map(Number):bounds(el);
        // Sequence messages have zero-sized invisible attachment points. Give
        // them a centered 1px native anchor so port fractions stay finite.
        if(el.dataset.md==='node')for(const axis of [0,1])if(box[axis+2]===0){box[axis]-=0.5;box[axis+2]=1;}
        const id=`group-${++serial}`;
        groups.push({id,sourceId:el.id,kind:el.dataset.md||el.id,parent,edgeParent,box});parent=id;
      }
      for(const child of el.children)walk(child,parent,edgeParent);
      return;
    }
    const cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden'||opacity(el)===0)return;
    if(cs.filter!=='none'){
      omitted.add('blur-or-grain');
      if(!el.hasAttribute('fill')&&!el.hasAttribute('stroke'))return;
    }
    if(tag==='text'){
      if(!el.textContent.trim())return;
      const spans=[...el.querySelectorAll(':scope > tspan')];
      const value=spans.length?spans.map(s=>s.textContent).join('\n'):el.textContent;
      const matrix=el.getCTM();
      texts.push({id:`text-${++serial}`,parent,edgeParent,box:bounds(el),value,size:parseFloat(cs.fontSize)*Math.hypot(matrix.a,matrix.b),family:cs.fontFamily,weight:cs.fontWeight,italic:cs.fontStyle==='italic',color:paint(cs.fill,el),opacity:opacity(el),rotation:Math.atan2(matrix.b,matrix.a)*180/Math.PI,vertical:cs.writingMode.startsWith('vertical'),spacing:parseFloat(cs.letterSpacing)||0});
      return;
    }
    if(!['rect','circle','ellipse','path','line','polygon','polyline'].includes(tag))throw new Error(`Unsupported editable primitive: ${tag}`);
    const m=el.getCTM(), fill=paint(cs.fill,el), stroke=paint(cs.stroke,el);
    if(fill==='none'&&stroke==='none')return;
    shapes.push({id:`shape-${++serial}`,parent,box:bounds(el),tag,attributes:Object.fromEntries([...el.attributes].map(a=>[a.name,a.value])),matrix:[m.a,m.b,m.c,m.d,m.e,m.f],fill,stroke,width:parseFloat(cs.strokeWidth)*Math.hypot(m.a,m.b),opacity:opacity(el),fillOpacity:Number(cs.fillOpacity),strokeOpacity:Number(cs.strokeOpacity),dash:cs.strokeDasharray,cap:cs.strokeLinecap,join:cs.strokeLinejoin});
  }
  for(const child of svg.children)walk(child);
  return {size:[svg.viewBox.baseVal.width,svg.viewBox.baseVal.height],title:svg.querySelector('title')?.textContent||'MuseDraw',groups,shapes,texts,edges,visualEffects:[...omitted]};
}

// Convert SVG path commands into native stencil commands, retaining curves.
export function pathCommands(d) {
  const tokens=d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g)||[];
  const out=[];let i=0,cmd,x=0,y=0,sx=0,sy=0,last='',control=null;
  const counts={M:2,L:2,H:1,V:1,C:6,S:4,Q:4,T:2,A:7};
  while(i<tokens.length){
    if(/^[a-zA-Z]$/.test(tokens[i]))cmd=tokens[i++];
    const upper=cmd?.toUpperCase(),relative=cmd!==upper;
    if(upper==='Z'){out.push(['close']);x=sx;y=sy;last='Z';control=null;cmd=null;continue;}
    const count=counts[upper];if(!count||i+count>tokens.length)throw new Error(`Invalid SVG path near ${tokens.slice(i,i+8).join(' ')}`);
    const a=tokens.slice(i,i+count).map(Number);if(a.some(v=>!Number.isFinite(v)))throw new Error('Non-finite SVG path');i+=count;
    const px=v=>v+(relative?x:0),py=v=>v+(relative?y:0);let nextControl=null;
    if(upper==='M'||upper==='L'){x=px(a[0]);y=py(a[1]);out.push([upper==='M'?'move':'line',x,y]);if(upper==='M'){sx=x;sy=y;cmd=relative?'l':'L';}}
    else if(upper==='H'){x=px(a[0]);out.push(['line',x,y]);}
    else if(upper==='V'){y=py(a[0]);out.push(['line',x,y]);}
    else if(upper==='C'){const p=[px(a[0]),py(a[1]),px(a[2]),py(a[3]),px(a[4]),py(a[5])];out.push(['curve',...p]);nextControl=p.slice(2,4);[x,y]=p.slice(4);}
    else if(upper==='S'){const c=last==='C'||last==='S'?[2*x-control[0],2*y-control[1]]:[x,y];const p=[...c,px(a[0]),py(a[1]),px(a[2]),py(a[3])];out.push(['curve',...p]);nextControl=p.slice(2,4);[x,y]=p.slice(4);}
    else if(upper==='Q'||upper==='T'){const c=upper==='Q'?[px(a[0]),py(a[1])]:(last==='Q'||last==='T'?[2*x-control[0],2*y-control[1]]:[x,y]);const p=upper==='Q'?[px(a[2]),py(a[3])]:[px(a[0]),py(a[1])];out.push(['quad',...c,...p]);nextControl=c;[x,y]=p;}
    else if(upper==='A'){const end=[px(a[5]),py(a[6])];out.push(...arcCurves(x,y,...a.slice(0,5),...end));[x,y]=end;}
    last=upper;control=nextControl;
  }
  return out;
}

function arcCurves(x0,y0,rx,ry,angle,large,sweep,x,y){
  rx=Math.abs(rx);ry=Math.abs(ry);if(!rx||!ry)return [['line',x,y]];if(x===x0&&y===y0)return [];
  const phi=angle*Math.PI/180,c=Math.cos(phi),s=Math.sin(phi),dx=(x0-x)/2,dy=(y0-y)/2,u=c*dx+s*dy,v=-s*dx+c*dy;
  const ratio=u*u/(rx*rx)+v*v/(ry*ry);if(ratio>1){rx*=Math.sqrt(ratio);ry*=Math.sqrt(ratio);}
  const factor=(large===sweep?-1:1)*Math.sqrt(Math.max(0,(rx*rx*ry*ry-rx*rx*v*v-ry*ry*u*u)/(rx*rx*v*v+ry*ry*u*u)));
  const uc=factor*rx*v/ry,vc=-factor*ry*u/rx,cx=c*uc-s*vc+(x0+x)/2,cy=s*uc+c*vc+(y0+y)/2;
  const start=Math.atan2((v-vc)/ry,(u-uc)/rx),end=Math.atan2((-v-vc)/ry,(-u-uc)/rx);let delta=end-start;
  if(!sweep&&delta>0)delta-=2*Math.PI;if(sweep&&delta<0)delta+=2*Math.PI;
  const steps=Math.ceil(Math.abs(delta)/(Math.PI/2)),step=delta/steps,result=[];
  const at=t=>[cx+c*rx*Math.cos(t)-s*ry*Math.sin(t),cy+s*rx*Math.cos(t)+c*ry*Math.sin(t)];
  const derivative=t=>[-c*rx*Math.sin(t)-s*ry*Math.cos(t),-s*rx*Math.sin(t)+c*ry*Math.cos(t)];
  for(let k=0;k<steps;k++){const t=start+k*step,t2=t+step,alpha=4/3*Math.tan(step/4),a=at(t),b=at(t2),da=derivative(t),db=derivative(t2);result.push(['curve',a[0]+alpha*da[0],a[1]+alpha*da[1],b[0]-alpha*db[0],b[1]-alpha*db[1],...b]);}
  return result;
}

function primitiveCommands(s){
  const a=s.attributes,n=k=>Number(a[k]||0);
  if(s.tag==='path')return pathCommands(a.d);
  if(s.tag==='line')return [['move',n('x1'),n('y1')],['line',n('x2'),n('y2')]];
  if(s.tag==='polygon'||s.tag==='polyline'){const p=(a.points.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi)||[]).map(Number),out=[];for(let i=0;i<p.length;i+=2)out.push([i?'line':'move',p[i],p[i+1]]);if(s.tag==='polygon')out.push(['close']);return out;}
  if(s.tag==='circle'||s.tag==='ellipse'){const cx=n('cx'),cy=n('cy'),rx=n(s.tag==='circle'?'r':'rx'),ry=n(s.tag==='circle'?'r':'ry'),k=0.5522847498307936;return [['move',cx+rx,cy],['curve',cx+rx,cy+k*ry,cx+k*rx,cy+ry,cx,cy+ry],['curve',cx-k*rx,cy+ry,cx-rx,cy+k*ry,cx-rx,cy],['curve',cx-rx,cy-k*ry,cx-k*rx,cy-ry,cx,cy-ry],['curve',cx+k*rx,cy-ry,cx+rx,cy-k*ry,cx+rx,cy],['close']];}
  const x=n('x'),y=n('y'),w=n('width'),h=n('height'),r=Math.min(n('rx')||n('ry'),w/2),r2=Math.min(n('ry')||r,h/2);
  return [['move',x+r,y],['line',x+w-r,y],['quad',x+w,y,x+w,y+r2],['line',x+w,y+h-r2],['quad',x+w,y+h,x+w-r,y+h],['line',x+r,y+h],['quad',x,y+h,x,y+h-r2],['line',x,y+r2],['quad',x,y,x+r,y],['close']];
}

function stencil(s){
  const [x,y,w0,h0]=s.box,w=Math.max(w0,0.01),h=Math.max(h0,0.01),[a,b,c,d,e,f]=s.matrix;
  const commands=primitiveCommands(s).map(([tag,...p])=>{
    if(tag==='close')return '<close/>';
    const fields={};for(let i=0;i<p.length;i+=2){const suffix=p.length===2?'':i/2+1;fields[`x${suffix}`]=num(a*p[i]+c*p[i+1]+e-x);fields[`y${suffix}`]=num(b*p[i]+d*p[i+1]+f-y);}
    return `<${tag}${attrs(fields)}/>`;
  }).join('');
  const definition=`<shape w="${num(w)}" h="${num(h)}" aspect="variable" strokewidth="inherit"><foreground><path>${commands}</path><${s.fill!=='none'&&s.stroke!=='none'?'fillstroke':s.fill!=='none'?'fill':'stroke'}/></foreground></shape>`;
  return deflateRawSync(Buffer.from(encodeURIComponent(definition))).toString('base64');
}

function color(v){if(!v||v==='none'||v==='transparent')return 'none';if(/^#[\da-f]{3,8}$/i.test(v))return v;const rgb=v.match(/^rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/);if(rgb)return '#'+rgb.slice(1).map(n=>Number(n).toString(16).padStart(2,'0')).join('');throw new Error(`Unsupported native paint: ${v}`);}
function family(v){return v.split(',')[0].replace(/['";]/g,'').trim();}

// Enforce the native-object contract for every caller, not just the browser
// collector. An unsupported primitive must never become a placeholder rectangle.
function assertNativeScene(scene){
  const groups=new Map(scene.groups.map(g=>[g.id,g])),ids=new Set(['0','1']),nodes=new Set(),edges=new Set();
  const finite=(values,length)=>Array.isArray(values)&&values.length===length&&values.every(Number.isFinite);
  if(!finite(scene.size,2)||scene.size.some(n=>n<=0))throw new Error('Invalid native canvas size');
  for(const item of [...scene.groups,...scene.shapes,...scene.texts]){
    if(typeof item.id!=='string'||!item.id||ids.has(item.id))throw new Error(`Duplicate or invalid native object ID: ${item.id}`);
    ids.add(item.id);
    if(!finite(item.box,4))throw new Error(`Invalid native geometry: ${item.id}`);
    if(item.parent&&!groups.has(item.parent))throw new Error(`Unresolved native parent: ${item.parent}`);
  }
  for(const g of scene.groups)if(g.kind==='node'){
    if(!g.sourceId||nodes.has(g.sourceId))throw new Error(`Duplicate or invalid native node: ${g.sourceId}`);
    nodes.add(g.sourceId);
  }
  for(const s of scene.shapes){
    if(!['rect','circle','ellipse','path','line','polygon','polyline'].includes(s.tag))throw new Error(`Unsupported editable primitive: ${s.tag}`);
    if(!finite(s.matrix,6))throw new Error(`Invalid native transform: ${s.id}`);
  }
  for(const [i,e] of scene.edges.entries()){
    if(!e.id||edges.has(e.id)||ids.has(`connector-${i+1}`))throw new Error(`Duplicate native connector ID: ${e.id}`);
    edges.add(e.id);
    if(!nodes.has(e.from)||!nodes.has(e.to))throw new Error(`Unresolved editable terminals ${e.from} → ${e.to}`);
    if(!Array.isArray(e.points)||e.points.length<2||e.points.some(p=>!finite(p,2)))throw new Error(`Invalid native connector geometry: ${e.id}`);
  }
  for(const item of [...scene.groups,...scene.shapes,...scene.texts])if(item.edgeParent&&!edges.has(item.edgeParent))throw new Error(`Unresolved native edge label: ${item.edgeParent}`);
}

export function toDrawio(scene){
  assertNativeScene(scene);
  const cells=['<mxCell id="0"/>','<mxCell id="1" parent="0"/>'],groups=new Map(scene.groups.map(g=>[g.id,g])),nodeIds=new Map(scene.groups.filter(g=>g.kind==='node').map(g=>[g.sourceId,g.id]));
  const edgeMap=new Map(scene.edges.map(e=>[e.id,e])),edgeIds=new Map(scene.edges.map((e,i)=>[e.id,`connector-${i+1}`]));
  const cell=(obj,geo)=>`<mxCell${attrs(obj)}>${geo}</mxCell>`;
  const parentInfo=(item)=>{
    if(item.parent){const g=groups.get(item.parent);return {parent:g.id,x:g.box[0],y:g.box[1],relative:false};}
    if(item.edgeParent&&edgeMap.has(item.edgeParent)){const edge=edgeMap.get(item.edgeParent),p=edge.points,mid=[(p[0][0]+p.at(-1)[0])/2,(p[0][1]+p.at(-1)[1])/2];return {parent:edgeIds.get(item.edgeParent),x:mid[0],y:mid[1],relative:true};}
    return {parent:'1',x:0,y:0,relative:false};
  };
  for(const e of scene.edges){
    const source=nodeIds.get(e.from),target=nodeIds.get(e.to);if(!source||!target)throw new Error(`Unresolved editable terminals ${e.from} → ${e.to}`);
    const a=groups.get(source).box,b=groups.get(target).box,p=e.points,S=p[0],E=p.at(-1);
    const port=(pt,box)=>[Math.max(0,Math.min(1,(pt[0]-box[0])/box[2])),Math.max(0,Math.min(1,(pt[1]-box[1])/box[3]))];const sp=port(S,a),tp=port(E,b);
    const style=`edgeStyle=none;noEdgeStyle=1;rounded=1;curved=${e.curve?1:0};endArrow=${e.arrow==='none'?'none':e.arrow==='triangle'?'block':'open'};endFill=${e.arrow==='triangle'?1:0};startArrow=${e.both?'open':'none'};strokeColor=${color(e.color)};strokeWidth=${e.width};dashed=${e.dash?1:0};opacity=${Math.round(e.opacity*100)};exitX=${sp[0]};exitY=${sp[1]};exitPerimeter=0;entryX=${tp[0]};entryY=${tp[1]};entryPerimeter=0;`;
    const points=p.slice(1,-1).map(([x,y])=>`<mxPoint x="${num(x)}" y="${num(y)}"/>`).join('');
    cells.push(cell({id:edgeIds.get(e.id),value:'',edge:1,parent:'1',source,target,style},`<mxGeometry relative="1" as="geometry"><Array as="points">${points}</Array></mxGeometry>`));
  }
  for(const g of scene.groups){
    const pi=parentInfo({...g,parent:g.parent}),[x,y,w,h]=g.box;
    const style='group;html=0;fillColor=none;strokeColor=none;container=1;collapsible=0;recursiveResize=1;';
    const geo=pi.relative?`<mxGeometry relative="1" width="${num(w)}" height="${num(h)}" as="geometry"><mxPoint x="${num(x-pi.x)}" y="${num(y-pi.y)}" as="offset"/></mxGeometry>`:geometry(x-pi.x,y-pi.y,w,h);
    cells.push(cell({id:g.id,value:'',vertex:1,parent:pi.parent,style},geo));
  }
  for(const s of scene.shapes){
    const pi=parentInfo(s),[x,y,w,h]=s.box;
    const style=`shape=stencil(${stencil(s)});html=0;fillColor=${color(s.fill)};strokeColor=${color(s.stroke)};strokeWidth=${num(s.width)};opacity=${num(s.opacity*100)};fillOpacity=${num(s.fillOpacity*100)};strokeOpacity=${num(s.strokeOpacity*100)};dashed=${s.dash!=='none'?1:0};lineCap=${s.cap};lineJoin=${s.join};`;
    cells.push(cell({id:s.id,value:'',vertex:1,parent:pi.parent,style},geometry(x-pi.x,y-pi.y,Math.max(w,0.01),Math.max(h,0.01))));
  }
  for(const t of scene.texts){
    const pi=parentInfo(t),[x,y,w,h]=t.box;
    const style=`text;html=0;fillColor=none;strokeColor=none;whiteSpace=nowrap;overflow=visible;align=left;verticalAlign=top;spacing=0;fontFamily=${family(t.family)};fontSize=${num(t.size)};fontStyle=${(Number(t.weight)>=600?1:0)+(t.italic?2:0)};fontColor=${color(t.color)};opacity=${num(t.opacity*100)};rotation=${num(t.rotation)};`;
    const value=t.vertical?[...t.value].join('\n'):t.value;
    cells.push(cell({id:t.id,value,vertex:1,parent:pi.parent,style},geometry(x-pi.x,y-pi.y,Math.max(w,1),Math.max(h,1))));
  }
  // Drawio paints children at their parent's position in the model. Reorder the
  // root by SVG layer: background first, connectors, then the foreground groups.
  const roots=cells.splice(2),background=scene.shapes.filter(s=>!s.parent).map(s=>s.id);
  const first=roots.filter(c=>background.some(id=>c.startsWith(`<mxCell id="${id}"`))),rest=roots.filter(c=>!background.some(id=>c.startsWith(`<mxCell id="${id}"`)));
  cells.push(...first,...rest);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="app.diagrams.net" agent="MuseDraw" version="24.7.17"><diagram id="musedraw" name="${xml(scene.title)}"><mxGraphModel page="1" pageScale="1" pageWidth="${scene.size[0]}" pageHeight="${scene.size[1]}" grid="0" background="none"><root>${cells.join('')}</root></mxGraphModel></diagram></mxfile>\n`;
}
