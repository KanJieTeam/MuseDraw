// Conventional technical-report drawing material. No report content is bundled.
export const SONG = "'Times New Roman', SimSun, 宋体, 'Songti SC', STSong, 'Noto Serif CJK SC', serif";
export const HEI = "Arial, SimHei, 黑体, 'Heiti SC', STHeiti, 'Noto Sans CJK SC', sans-serif";
export const GREY = '#F2F2F2';
export function el(tag, attributes, parent) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attributes)) if (value != null) node.setAttribute(key, value);
  parent?.append(node);
  return node;
}
export function makeFig(W, H) {
  if (![W,H].every(n => Number.isFinite(n) && n > 0 && n <= 8000)) throw Error('Canvas exceeds 8000px; split the report');
  const svg = el('svg', {xmlns:'http://www.w3.org/2000/svg',viewBox:`0 0 ${W} ${H}`,width:W,height:H});
  el('rect',{x:0,y:0,width:W,height:H,fill:'#ffffff'},svg);
  const f={svg,W,H};
  f.rect=(x,y,w,h,o={})=>el('rect',{x,y,width:w,height:h,fill:o.fill??'#ffffff',stroke:'#000000','stroke-width':o.sw??1,'stroke-dasharray':o.dash?'5 3':null},svg);
  f.text=(x,y,value,o={})=>{const t=el('text',{x,y,fill:'#000000','font-family':o.font==='hei'?HEI:SONG,'font-size':o.size??15,'text-anchor':o.anchor??'middle'},svg);t.textContent=value;return t};
  f.lines=(x,y,values,o={})=>{
    const lines=values.map(value=>typeof value==='string'?{t:value}:value).map(l=>({...l,size:l.size??o.size??15,font:l.font??o.font??'song'}));
    let cursor=y-lines.reduce((sum,l)=>sum+l.size*1.38,0)/2;
    for(const l of lines){const leading=l.size*1.38;f.text(x,cursor+leading/2+l.size*.36,l.t,{size:l.size,font:l.font,anchor:o.anchor});cursor+=leading}
  };
  f.box=(x,y,w,h,lines,o={})=>{f.rect(x,y,w,h,o);f.lines(x+w/2,y+h/2,lines,o)};
  f.path=(points,o={})=>el('polyline',{points:points.map(p=>p.join(',')).join(' '),fill:'none',stroke:'#000000','stroke-width':o.sw??1,'stroke-dasharray':o.dash?'4 3':null,'stroke-linejoin':'miter'},svg);
  f.head=(from,to)=>{
    const dx=to[0]-from[0],dy=to[1]-from[1],len=Math.hypot(dx,dy);
    if(len<8)throw Error('Arrow segment shorter than its head; choose a wider composition');
    const ux=dx/len,uy=dy/len,bx=to[0]-ux*8,by=to[1]-uy*8;
    el('polygon',{points:`${to[0]},${to[1]} ${bx-uy*3.2},${by+ux*3.2} ${bx+uy*3.2},${by-ux*3.2}`,fill:'#000000'},svg);
    return [to[0]-ux*7,to[1]-uy*7];
  };
  f.arrow=(points,o={})=>{const ps=points.map(p=>[...p]);ps[ps.length-1]=f.head(ps.at(-2),ps.at(-1));if(o.both)ps[0]=f.head(ps[1],ps[0]);f.path(ps,o)};
  f.hline=(x1,x2,y,o={})=>f.path([[x1,y],[x2,y]],o);
  f.vline=(x,y1,y2,o={})=>f.path([[x,y1],[x,y2]],o);
  f.diamond=(cx,cy,w,h,lines,o={})=>{el('polygon',{points:`${cx},${cy-h/2} ${cx+w/2},${cy} ${cx},${cy+h/2} ${cx-w/2},${cy}`,fill:'#ffffff',stroke:'#000000','stroke-width':1},svg);f.lines(cx,cy,lines,o)};
  return f;
}
