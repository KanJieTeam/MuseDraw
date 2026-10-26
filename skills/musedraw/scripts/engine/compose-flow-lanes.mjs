import {attachFlowContract} from './flow-contract.mjs';
const r = n => Math.round(n*100)/100;
const hits = (a,b,n) => a[0] === b[0]
  ? a[0]>n.x+.1 && a[0]<n.x+n.w-.1 && Math.max(a[1],b[1])>n.y+.1 && Math.min(a[1],b[1])<n.y+n.h-.1
  : a[1]>n.y+.1 && a[1]<n.y+n.h-.1 && Math.max(a[0],b[0])>n.x+.1 && Math.min(a[0],b[0])<n.x+n.w-.1;
const clear = (points, nodes) => points.slice(1).every((p,i)=>!nodes.some(n=>hits(points[i],p,n)));
const simplify = points => points.filter((p,i,a)=>!i || i===a.length-1 || !((a[i-1][0]===p[0]&&p[0]===a[i+1][0])||(a[i-1][1]===p[1]&&p[1]===a[i+1][1])));

// A bounded rectilinear visibility grid. Never route through another operation.
// Breadth first search minimises grid steps; coordinate axes include free rails.
function route(a,b,nodes,width,height) {
  const middle=(a[1]+b[1])/2;
  for(const p of [[a,[a[0],middle],[b[0],middle],b],[a,[b[0],a[1]],b],[a,[a[0],b[1]],b]])
    if(clear(p,nodes))return simplify(p);
  const xs=[...new Set([a[0],b[0],24,width-24,...nodes.flatMap(n=>[n.x-20,n.x+n.w+20])])].filter(x=>x>=12&&x<=width-12).sort((a,b)=>a-b);
  const ys=[...new Set([a[1],b[1],76,height-24,...nodes.flatMap(n=>[n.y-20,n.y+n.h+20])])].filter(y=>y>=64&&y<=height-12).sort((a,b)=>a-b);
  const key=(x,y)=>y*xs.length+x, start=key(xs.indexOf(a[0]),ys.indexOf(a[1])), end=key(xs.indexOf(b[0]),ys.indexOf(b[1]));
  const queue=[start], parent=new Map([[start,null]]);
  for(let i=0;i<queue.length&&!parent.has(end);i++) {
    const current=queue[i],x=current%xs.length,y=Math.floor(current/xs.length);
    for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]) {
      const xx=x+dx,yy=y+dy,k=key(xx,yy);
      if(xx<0||xx>=xs.length||yy<0||yy>=ys.length||parent.has(k)||!clear([[xs[x],ys[y]],[xs[xx],ys[yy]]],nodes))continue;
      parent.set(k,current);queue.push(k);
    }
  }
  if(!parent.has(end))throw new Error('Flow brief /links: no clear responsibility route; split this dense flow');
  const path=[];for(let k=end;k!==null;k=parent.get(k))path.push([xs[k%xs.length],ys[Math.floor(k/xs.length)]]);
  return simplify(path.reverse());
}

/** Long role-based processes: roles across columns, time down rows. */
export function composeLaneFlow(input, brief, rank, {wrap,units}) {
  const {lanes,nodes,links}=input, width=1200, margin=40, laneW=(width-2*margin)/lanes.length;
  if(lanes.length>4)throw new Error('Flow brief /lanes: a long vertical flow supports at most four readable responsibility columns');
  const frames=lanes.map((l,i)=>({...l,x:margin+i*laneW,y:40,w:laneW,h:0}));
  const shapes=nodes.map(n=>{
    const f=frames.find(f=>f.id===n.lane),w=Math.min(224,laneW-100),label=wrap(n.label,w-(n.shape==='diamond'?68:24),18);
    return {id:n.id,label,shape:n.shape,tone:n.emphasis?'accent':'default',x:r(f.x+(laneW-w)/2),y:0,w:r(w),h:Math.max(n.shape==='diamond'?88:52,label.split('\n').length*24+(n.shape==='diamond'?48:16)),size:18,padding:8};
  });
  const headerLines=Math.max(...frames.map(f=>wrap(f.label,f.w-32,18).split('\n').length));
  const byId=new Map(shapes.map(n=>[n.id,n]));let y=100+(headerLines-1)*24;
  for(let row=0;row<=Math.max(...rank.values());row++) {
    const groups=lanes.map(l=>nodes.filter(n=>n.lane===l.id&&rank.get(n.id)===row).sort((a,b)=>a.id.localeCompare(b.id)).map(n=>byId.get(n.id)));
    const heights=groups.map(g=>g.reduce((s,n)=>s+n.h,0)+Math.max(0,g.length-1)*44),height=Math.max(...heights);
    groups.forEach((g,i)=>{let top=y+(height-heights[i])/2;for(const n of g){n.y=top;top+=n.h+44;}});y+=height+36;
  }
  const height=y-36+48;
  if(height>1070)throw new Error('Flow brief /nodes: vertical responsibility flow exceeds a readable preview; split into subprocesses');
  frames.forEach(f=>f.h=height-80);
  const labels=[],edges=[];
  const box=(text,at)=>({x:at[0]-Math.max(...text.split('\n').map(units))*15/2-8,y:at[1]-text.split('\n').length*19/2-3,w:Math.max(...text.split('\n').map(units))*15+16,h:text.split('\n').length*19+6});
  const overlap=(a,b,g=5)=>a.x<b.x+b.w+g&&a.x+a.w+g>b.x&&a.y<b.y+b.h+g&&a.y+a.h+g>b.y;
  [...links].sort((a,b)=>a.key.localeCompare(b.key)).forEach(l=>{
    const a=byId.get(l.from),b=byId.get(l.to),feedback=l.feedback;
    const skip=!feedback&&rank.get(l.to)-rank.get(l.from)>1&&a.x===b.x;
    const rail=Math.max(44,l.label?Math.min(140,units(l.label)*15)/2+24:44);
    const start=feedback?[a.x,a.y+a.h/2]:skip?[a.x+a.w,a.y+a.h/2]:[a.x+a.w/2,a.y+a.h];
    const end=feedback?[b.x,b.y+b.h/2]:skip?[b.x+b.w,b.y+b.h/2]:[b.x+b.w/2,b.y];
    const stubA=feedback?[start[0]-rail,start[1]]:skip?[start[0]+rail,start[1]]:[start[0],start[1]+18];
    const stubB=feedback?[end[0]-rail,end[1]]:skip?[end[0]+rail,end[1]]:[end[0],end[1]-18];
    const points=[start,...route(stubA,stubB,shapes,width,height),end];
    if(!clear(points,shapes))throw new Error(`Flow brief /links: obstructed port ${l.from} -> ${l.to}`);
    const label=l.label?wrap(l.label,140,15):undefined;let labelAt;
    if(label){
      const candidates=[];
      for(let j=1;j<points.length;j++){
        const p=points[j-1],q=points[j],length=Math.hypot(q[0]-p[0],q[1]-p[1]);
        for(const t of [.5,.35,.65,.2,.8])candidates.push({at:[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t],length});
      }
      labelAt=candidates.sort((a,b)=>b.length-a.length).find(c=>{const rect=box(label,c.at);return rect.x>12&&rect.x+rect.w<width-12&&rect.y>82&&rect.y+rect.h<height-12&&!shapes.some(n=>overlap(rect,n))&&!labels.some(n=>overlap(rect,n));})?.at;
      if(!labelAt)throw new Error(`Flow brief /links: condition ${l.label} needs more space`);
      labels.push(box(label,labelAt));
    }
    let id=`lane-flow-${encodeURIComponent(l.key)}`;while(nodes.some(n=>n.id===id)||edges.some(e=>e.id===id))id='_'+id;
    edges.push({id,from:l.from,to:l.to,fromSide:feedback?'l':skip?'r':'b',toSide:feedback?'l':skip?'r':'t',fromAt:.5,toAt:.5,via:points.slice(1,-1).map(p=>p.map(r)),route:'ortho',kind:feedback?'feedback':'default',...(feedback?{dash:'5 4'}:{}),...(label?{label,labelAt:labelAt.map(r)}:{})});
  });
  const scene={theme:brief.theme??'journal',size:[width,height],header:false,footer:false,autoFit:false,nodes:shapes,edges,
    lines:frames.flatMap((f,i)=>[{points:[[r(f.x),40],[r(f.x),height-40]],color:'line',width:1},...(i===frames.length-1?[{points:[[width-margin,40],[width-margin,height-40]],color:'line',width:1}]:[])]),
    texts:frames.map(f=>({x:r(f.x+f.w/2),y:68,text:wrap(f.label,f.w-32,18),size:18,weight:600,anchor:'middle',color:'ink',w:r(f.w-32)})),
    style:{node:{size:18,padding:8,radius:4,stroke:1.2,lineHeight:1.3},edge:{labelSize:15,width:1.35,radius:4,arrowSize:7,gap:2,labelStyle:'chip'}},
    meta:{composition:'flow',orientation:'vertical',nodeCount:nodes.length,relationCount:links.length,laneCount:lanes.length,feedbackCount:links.filter(l=>l.feedback).length,contentBottom:height-40}};
  const scale=input.width/width;
  scene.size=scene.size.map(v=>r(v*scale));
  for(const n of scene.nodes)for(const k of ['x','y','w','h','size','padding'])n[k]=r(n[k]*scale);
  for(const e of scene.edges){e.via=e.via.map(p=>p.map(v=>r(v*scale)));if(e.labelAt)e.labelAt=e.labelAt.map(v=>r(v*scale));e.fromGap=e.toGap=r(2*scale);if(e.dash)e.dash=e.dash.split(' ').map(v=>r(Number(v)*scale)).join(' ');}
  for(const l of scene.lines){l.points=l.points.map(p=>p.map(v=>r(v*scale)));l.width=r(l.width*scale);}
  for(const t of scene.texts)for(const k of ['x','y','w','size'])t[k]=r(t[k]*scale);
  for(const group of Object.values(scene.style))for(const k of ['size','padding','radius','stroke','width','labelSize','arrowSize','gap'])if(typeof group[k]==='number')group[k]=r(group[k]*scale);
  scene.meta.contentBottom=r(scene.meta.contentBottom*scale);
  return attachFlowContract(scene,input,frames.map(({id,x,y,w,h})=>({id,x:r(x*scale),y:r(y*scale),w:r(w*scale),h:r(h*scale)})));
}
