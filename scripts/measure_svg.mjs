// Browser-only SVG inspection for geometry regressions; no serialization format.
// This function is serialized by Playwright; keep it independent of the module.
export function collectMeasuredScene() {
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
  function walk(el,parent=null,edgeParent=null,moduleParent=null){
    const tag=el.tagName.toLowerCase();
    if(['defs','title','desc','metadata'].includes(tag))return;
    if(tag==='g'){
      if(el.dataset.md==='edge'&&el.dataset.connection){edges.push({id:el.id,...JSON.parse(el.dataset.connection),...(moduleParent?{parent:moduleParent}:{}),layer:el.closest('#foreground')?'foreground':'background'});return;}
      if(el.dataset.md==='edge-label')edgeParent=el.dataset.edge||null;
      if(el.dataset.md||['header','footer','legend','texts','notes','foreground'].includes(el.id)){
        const box=el.dataset.box?el.dataset.box.split(',').map(Number):bounds(el);
        // Sequence messages have zero-sized invisible attachment points. Give
        // them a centered 1px measurement anchor so port fractions stay finite.
        if(el.dataset.md==='node')for(const axis of [0,1])if(box[axis+2]===0){box[axis]-=0.5;box[axis+2]=1;}
        const id=`group-${++serial}`;
        groups.push({id,sourceId:el.id,kind:el.dataset.md||el.id,parent,edgeParent,box});parent=id;
        if(el.dataset.md==='module')moduleParent=id;
      }
      for(const child of el.children)walk(child,parent,edgeParent,moduleParent);
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
    if(!['rect','circle','ellipse','path','line','polygon','polyline'].includes(tag))throw new Error(`Unsupported SVG primitive: ${tag}`);
    const m=el.getCTM(), fill=paint(cs.fill,el), stroke=paint(cs.stroke,el);
    if(fill==='none'&&stroke==='none')return;
    shapes.push({id:`shape-${++serial}`,parent,box:bounds(el),tag,attributes:Object.fromEntries([...el.attributes].map(a=>[a.name,a.value])),matrix:[m.a,m.b,m.c,m.d,m.e,m.f],fill,stroke,width:parseFloat(cs.strokeWidth)*Math.hypot(m.a,m.b),opacity:opacity(el),fillOpacity:Number(cs.fillOpacity),strokeOpacity:Number(cs.strokeOpacity),dash:cs.strokeDasharray,cap:cs.strokeLinecap,join:cs.strokeLinejoin});
  }
  for(const child of svg.children)walk(child);
  return {size:[svg.viewBox.baseVal.width,svg.viewBox.baseVal.height],title:svg.querySelector('title')?.textContent||'MuseDraw',groups,shapes,texts,edges,visualEffects:[...omitted]};
}
