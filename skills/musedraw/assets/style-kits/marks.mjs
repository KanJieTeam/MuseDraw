// Original, editable drawing vocabulary. These marks do not choose a page layout.
export const families = Object.freeze({
  swiss: {
    paper:'#F2F1EC', ink:'#0B0B0B', accent:'#E3001B', muted:'#5E5E5A', pale:'#DCDAD2',
    display:'Arial, Microsoft YaHei, sans-serif', body:'Microsoft YaHei, sans-serif',
    mono:'Consolas, Microsoft YaHei, monospace', displayWeight:800,
  },
  'ink-wash': {
    paper:'#F3EEE2', ink:'#1E1C19', accent:'#B3342A', muted:'#6E675B', pale:'#E4DED1',
    display:'KaiTi, STKaiti, SimSun, serif', body:'Microsoft YaHei, sans-serif',
    mono:'Consolas, Microsoft YaHei, monospace', displayWeight:400,
  },
});
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const finite=(...xs)=>{if(xs.some(x=>!Number.isFinite(x)))throw Error('Geometry must be finite.');};
function wrap(text,width,size){
  const lines=[];
  for(const para of String(text).split('\n')){
    let line='',used=0;
    for(const ch of [...para]){
      const em=/[\u0000-\u007f]/.test(ch)?.61:1;
      if(line&&used+em>width/size){lines.push(line);line='';used=0;}
      line+=ch;used+=em;
    }
    lines.push(line);
  }
  return lines;
}
export class Sheet {
  constructor(style,{width=1600,height=1100,title=''}={}){
    if(!families[style])throw Error('Supported drawing kits: swiss, ink-wash.');
    finite(width,height);if(width<=0||height<=0)throw Error('Positive canvas dimensions required.');
    this.style=style;this.p=families[style];this.width=width;this.height=height;this.parts=[];this.serial=0;
    this.parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" data-theme="${style}"><title>${esc(title)}</title>`);
    this.rect(0,0,width,height,{fill:this.p.paper});
  }
  add(mark){this.parts.push(mark);return this;}
  group(attrs,fn){this.add(`<g ${attrs}>`);fn(this);this.add('</g>');return this;}
  rect(x,y,w,h,{fill='none',stroke='none',weight=1,rx=0,opacity=1}={}){
    finite(x,y,w,h,weight,rx,opacity);if(w<0||h<0)throw Error('Negative rectangle extent.');
    return this.add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${esc(fill)}" stroke="${esc(stroke)}" stroke-width="${weight}" opacity="${opacity}"/>`);
  }
  path(d,{stroke=this.p.ink,weight=2,fill='none',opacity=1,dash='',arrow=false}={}){
    finite(weight,opacity);if(!/^[MmLlHhVvCcSsQqTtAaZz0-9eE.,+\s-]+$/.test(d))throw Error('Invalid SVG path characters.');
    const id=`arrow-${++this.serial}`;
    if(arrow)this.add(`<defs><marker id="${id}" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="6" markerHeight="6" orient="auto"><path d="M1 2L10 6L1 10" stroke="${esc(stroke)}" stroke-width="1.5" fill="none"/></marker></defs>`);
    return this.add(`<path d="${d}" stroke="${esc(stroke)}" stroke-width="${weight}" fill="${esc(fill)}" opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round"${dash?` stroke-dasharray="${esc(dash)}"`:''}${arrow?` marker-end="url(#${id})"`:''}/>`);
  }
  circle(x,y,r,{fill='none',stroke='none',weight=1,opacity=1}={}){
    finite(x,y,r,weight,opacity);if(r<0)throw Error('Negative radius.');
    return this.add(`<circle cx="${x}" cy="${y}" r="${r}" fill="${esc(fill)}" stroke="${esc(stroke)}" stroke-width="${weight}" opacity="${opacity}"/>`);
  }
  text(x,y,text,{size=30,role='body',fill=this.p.ink,weight,anchor='start',tracking=0}={}){
    finite(x,y,size,tracking);if(size<=0)throw Error('Positive type size required.');
    if(!['display','body','mono'].includes(role)||!['start','middle','end'].includes(anchor))throw Error('Unknown type role or anchor.');
    const font=this.p[role],bold=weight??(role==='display'?this.p.displayWeight:400);
    return this.add(`<text x="${x}" y="${y}" font-family="${esc(font)}" font-size="${size}" font-weight="${bold}" fill="${esc(fill)}" text-anchor="${anchor}" letter-spacing="${tracking}">${esc(text)}</text>`);
  }
  paragraph(x,y,text,{width=320,size=28,leading=1.55,...rest}={}){
    finite(width,size,leading);if(width<size||leading<1)throw Error('Text area too small.');
    const lines=wrap(text,width,size);lines.forEach((s,i)=>this.text(x,y+i*size*leading,s,{size,...rest}));
    return {lines:lines.length,height:lines.length*size*leading};
  }
  vertical(x,y,text,{size=76,gap=1.12,...rest}={}){
    [...text].forEach((ch,i)=>this.text(x,y+i*size*gap,ch,{size,role:'display',...rest}));return this;
  }
  // Variable-width ink gesture: actual centreline and endpoints remain supplied by the author.
  brush(points,{width=13,fill=this.p.ink,opacity=1}={}){
    finite(width,opacity);if(width<=0||opacity<0||opacity>1)throw Error('Invalid brush width or opacity.');
    if(points.length<2)throw Error('A brush gesture needs two or more points.');
    const l=[],r=[];
    points.forEach(([x,y],i)=>{
      finite(x,y);const a=points[Math.max(i-1,0)],b=points[Math.min(i+1,points.length-1)];
      const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1;
      const radius=width*(.17+.83*Math.sin(Math.PI*(i+.35)/(points.length-.3)))/2;
      l.push([x-dy/length*radius,y+dx/length*radius]);r.push([x+dy/length*radius,y-dx/length*radius]);
    });
    return this.path('M'+[...l,...r.reverse()].map(p=>p.join(' ')).join('L')+'Z',{fill,stroke:'none',opacity});
  }
  // Labels remain attached to supplied anchors; caller owns composition and meaning.
  callout({anchor:[ax,ay],label:[x,y],text,side='right',size=28,tone='ink'}){
    finite(ax,ay,x,y);if(!['left','right'].includes(side)||!this.p[tone])throw Error('Invalid callout role.');
    const col=this.p[tone],end=x+(side==='right'?-12:12),bend=(ax+end)/2;
    this.path(`M${ax} ${ay}H${bend}V${y-10}H${end}`,{stroke:col,weight:1.5});
    this.circle(ax,ay,3,{fill:col});this.text(x,y,text,{size,fill:col,anchor:side==='right'?'start':'end'});return this;
  }
  tool(kind,{x=0,y=0,scale=1,rotate=0,tone='ink'}={}){
    const shapes={
      wrench:'M20 0L49 18L49 61L76 77L106 61L107 18L137 1L137 73L100 112L100 340Q80 367 59 340L59 112L20 74Z',
      hammer:'M12 0H140L163 20L142 50H100V330Q83 349 66 330V50H12Z',
      screwdriver:'M69 0H91L95 95L104 110V245Q104 275 80 277Q56 275 56 245V110L65 95Z',
    };
    if(!shapes[kind]||!this.p[tone])throw Error('Unknown tool or tone.');
    finite(x,y,scale,rotate);if(scale<=0)throw Error('Positive object scale required.');
    return this.group(`transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale})"`,d=>{
      if(this.style==='ink-wash'){
        d.path(shapes[kind],{fill:this.p.ink,stroke:this.p.ink,weight:1,opacity:.12});
        d.path(shapes[kind],{stroke:this.p[tone],weight:2.8});
        const top=kind==='hammer'?67:134,bottom=kind==='screwdriver'?253:329;
        d.brush(Array.from({length:6},(_,i)=>[73+(i%2)*3,top+(bottom-top)*i/5]),{width:10,opacity:.7});
        d.path(`M84 ${top}L87 ${bottom-8}`,{stroke:this.p.muted,weight:1.2});
      }else d.path(shapes[kind],{fill:this.p[tone],stroke:'none'});
      if(kind==='wrench')d.circle(80,327,8,{fill:this.p.paper});
    });
  }
  record({x=0,y=0,width=210,height=270,kind='copy',label='',tone='ink',heading=''}={}){
    if(!['raw','copy','script','figure'].includes(kind)||!this.p[tone])throw Error('Unknown record type.');
    finite(x,y,width,height);if(width<90||height<100)throw Error('Record object is too small.');
    const c=this.p[tone];return this.group(`transform="translate(${x} ${y})"`,d=>{
      if(kind==='copy')d.rect(9,10,width,height,{stroke:this.p.muted,fill:this.p.paper,weight:1});
      const fold=Math.min(28,width/6);
      d.path(`M0 0H${width-fold}L${width} ${fold}V${height}H0Z`,{fill:this.p.paper,stroke:c,weight:this.style==='swiss'?2.2:1.3});
      d.path(`M${width-fold} 0V${fold}H${width}`,{stroke:c,weight:1});
      if(kind==='script'){
        d.text(20,70,'{ }',{role:'mono',size:40,fill:c});
        for(let i=0;i<3;i++)d.path(`M${i%2?42:22} ${105+i*29}H${width-25}`,{stroke:this.p.muted,weight:2});
      }else if(kind==='figure'){
        d.rect(22,49,width-44,height-92,{stroke:this.p.muted,weight:1});
        d.path(`M34 ${height-58}H${width-29}M34 65V${height-58}`,{stroke:c,weight:1.5});
      }else{
        if(heading)d.text(22,64,heading,{size:30,role:'display',fill:c});
        const start=heading?105:55;
        for(let i=0;i<5;i++){
          const lineY=start+i*28;if(lineY>height-(label?57:28))break;
          d.path(`M22 ${lineY}H${width-22-(i%2)*18}`,{stroke:this.p.muted,weight:1.8});
        }
      }
      if(label)d.text(20,height-20,label,{size:24,fill:c,role:kind==='script'?'mono':'body'});
    });
  }
  svg(){return this.parts.join('\n')+'\n</svg>';}
  scene(){return {type:'vector',theme:this.style,size:[this.width,this.height],header:false,footer:false,nativeSvg:this.svg()};}
}
