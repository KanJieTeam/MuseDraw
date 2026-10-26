// Geometry and wrapping have no browser or filesystem dependency.
export class LayoutError extends Error {
  constructor(code, message, details = {}) { super(message); this.name = 'LayoutError'; this.code = code; this.details = details; }
}
const fail = (code, message, details) => { throw new LayoutError(code, message, details); };
const finite = n => typeof n === 'number' && Number.isFinite(n);
export function validatePlan(size, plan) {
  if (!Array.isArray(size) || size.length !== 2 || !size.every(n => finite(n) && n > 0)) fail('SIZE', 'size must be [positive width, positive height]');
  const p = { margin: 28, gutter: 32, gap: 12, ...plan };
  if (!p.blankSides || !['left', 'right'].every(s => p.blankSides.includes(s))) fail('BLANK_DECLARATION', 'blankSides must explicitly declare ["left", "right"] empty of artwork');
  if (!finite(p.fontSize) || p.fontSize <= 0 || typeof p.fontFamily !== 'string' || !p.fontFamily.trim()) fail('FONT', 'fontSize and fontFamily are required');
  if (![p.margin, p.gutter, p.gap].every(n => finite(n) && n >= 0) || p.gutter < 16) fail('SPACING', 'margin/gap must be nonnegative; gutter must be at least 16');
  const b = p.subjectBBox;
  if (!b || !['x','y','w','h'].every(k => finite(b[k])) || b.w <= 0 || b.h <= 0 || b.x < 0 || b.y < 0 || b.x+b.w > size[0] || b.y+b.h > size[1]) fail('SUBJECT', 'subjectBBox must fit the canvas');
  if (!Array.isArray(p.annotations)) fail('ANNOTATIONS', 'annotations must be an array');
  const ids = new Set();
  for (const a of p.annotations) {
    if (typeof a.id !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(a.id) || ids.has(a.id)) fail('ID', `Invalid or duplicate id: ${a.id}`);
    ids.add(a.id);
    if (typeof a.text !== 'string' || !a.text.trim() || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/u.test(a.text)) fail('TEXT', `Invalid text: ${a.id}`);
    if (!['left','right'].includes(a.side)) fail('SIDE', `Invalid side: ${a.id}`);
    if (!Array.isArray(a.anchor) || a.anchor.length !== 2 || !a.anchor.every(finite) || a.anchor[0]<b.x || a.anchor[0]>b.x+b.w || a.anchor[1]<b.y || a.anchor[1]>b.y+b.h) fail('ANCHOR', `Anchor outside declared subject: ${a.id}`);
  }
  return p;
}

// Greedy grapheme-safe wrapping. Every original code unit survives in concatenated
// line texts; explicit newlines are stored separately as breakAfter.
export async function wrapText(text, maxWidth, measure) {
  if (!finite(maxWidth) || maxWidth <= 0) fail('WIDTH', 'No annotation width available');
  const segments = [...new Intl.Segmenter(undefined, {granularity:'grapheme'}).segment(text)].map(s => s.segment);
  const lines = [];
  let start = 0;
  while (start < segments.length) {
    const newline = segments.findIndex((g,i) => i >= start && /^(?:\r\n|\r|\n)$/.test(g));
    const end = newline < 0 ? segments.length : newline;
    if (start === end) { lines.push({text:'', breakAfter:segments[end]}); start=end+1; continue; }
    let lo=start+1, hi=end, fits=start;
    while (lo<=hi) {
      const mid=Math.floor((lo+hi)/2), metrics=await measure(segments.slice(start,mid).join(''));
      if (metrics.right-metrics.left <= maxWidth+1e-7) { fits=mid; lo=mid+1; } else hi=mid-1;
    }
    if (fits === start) fail('GLYPH_TOO_WIDE', 'A single grapheme cannot fit at the requested font size', {grapheme:segments[start], maxWidth});
    let cut=fits;
    if (fits<end) {
      // Prefer a word boundary when it exists; keep its whitespace verbatim.
      for (let i=fits; i>start; i--) if (/\s/u.test(segments[i-1])) { cut=i; break; }
    }
    const lineText=segments.slice(start,cut).join('');
    const breakAfter=cut===end && newline>=0 ? segments[newline] : '';
    lines.push({text:lineText, breakAfter, metrics:await measure(lineText)});
    start=cut + (breakAfter ? 1 : 0);
  }
  if (/\r$|\n$/.test(text)) lines.push({text:'',breakAfter:''});
  return lines;
}

// Bounded isotonic regression minimizes sum squared vertical centre displacement
// in anchor order, subject to fixed label heights, gap and canvas bounds.
export function pack(items, top, bottom, gap) {
  if (!items.length) return [];
  const total=items.reduce((s,a)=>s+a.h,0)+gap*(items.length-1);
  if (total>bottom-top+1e-7) fail('CAPACITY', 'Annotation height exceeds available side region', {required:total, available:bottom-top});
  let offset=0;
  const offsets=[], blocks=[];
  items.forEach((a,i)=>{
    offsets.push(offset);
    blocks.push({start:i,end:i,sum:a.anchor[1]-a.h/2-offset,count:1});
    while (blocks.length>1 && blocks.at(-2).sum/blocks.at(-2).count > blocks.at(-1).sum/blocks.at(-1).count) {
      const r=blocks.pop(),l=blocks.pop(); blocks.push({start:l.start,end:r.end,sum:l.sum+r.sum,count:l.count+r.count});
    }
    offset+=a.h+gap;
  });
  const ys=[];
  for (const b of blocks) for(let i=b.start;i<=b.end;i++) ys[i]=Math.max(top,Math.min(bottom-total,b.sum/b.count))+offsets[i];
  return items.map((a,i)=>({...a,y:ys[i]}));
}

export async function layoutCallouts(size, inputPlan, measure) {
  const p=validatePlan(size,inputPlan), b=p.subjectBBox;
  const regions={left:{x:p.margin,y:p.margin,w:b.x-p.gutter-p.margin,h:size[1]-2*p.margin},right:{x:b.x+b.w+p.gutter,y:p.margin,w:size[0]-p.margin-(b.x+b.w+p.gutter),h:size[1]-2*p.margin}};
  const sample=await measure('Mg国Ågj'), ascent=sample.ascent, descent=sample.descent;
  if (![ascent,descent].every(n=>finite(n)&&n>=0)) fail('METRICS','Invalid font metrics');
  const lineHeight=Math.max(p.fontSize*1.3,ascent+descent);
  const labels=[],warnings=[];
  for(const side of ['left','right']) {
    const r=regions[side], source=p.annotations.filter(a=>a.side===side).sort((a,b)=>a.anchor[1]-b.anchor[1] || a.id.localeCompare(b.id));
    for(let i=1;i<source.length;i++) if(source[i].anchor[1]===source[i-1].anchor[1]) warnings.push({code:'DUPLICATE_ANCHOR_Y',side,ids:[source[i-1].id,source[i].id],message:'Same-height anchors may share a subject-side horizontal leader segment; inspect or supply distinct anchor heights.'});
    const wrapped=[];
    for(const a of source) {
      const lines=await wrapText(a.text,r.w,measure);
      const actualLineHeight=Math.max(lineHeight,...lines.map(l=>(l.metrics?.ascent || 0)+(l.metrics?.descent || 0)));
      wrapped.push({...a,anchor:[...a.anchor],lines,lineHeight:actualLineHeight,h:lines.length*actualLineHeight});
    }
    for(const a of pack(wrapped,r.y,r.y+r.h,p.gap)) {
      const rows=a.lines.map((line,i)=>{
        const m=line.metrics || {left:0,right:0,ascent,descent};
        const x=side==='left' ? r.x+r.w-m.right : r.x-m.left;
        return {...line,metrics:m,x,baseline:a.y+i*a.lineHeight+(a.lineHeight-m.ascent-m.descent)/2+m.ascent};
      });
      const x0=Math.min(...rows.map(l=>l.x+l.metrics.left)),x1=Math.max(...rows.map(l=>l.x+l.metrics.right));
      const cy=a.y+a.h/2,exit=side==='left'?b.x:b.x+b.w;
      const endpoint=side==='left'?r.x+r.w+8:r.x-8;
      labels.push({...a,lines:rows,x:x0,w:x1-x0,displacement:cy-a.anchor[1],leader:[a.anchor,[exit,a.anchor[1]],[endpoint,cy]]});
    }
  }
  return {size:[...size],fontSize:p.fontSize,fontFamily:p.fontFamily,lineHeight,regions,labels,warnings,objective:'least squared centre displacement within each anchor-sorted side',squaredDisplacement:labels.reduce((n,a)=>n+a.displacement**2,0)};
}

const xml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function appendCallouts(scene, layout) {
  if(scene.type!=='vector' || typeof scene.nativeSvg!=='string' || !/<\/svg\s*>\s*$/i.test(scene.nativeSvg)) fail('SCENE','Expected a native vector scene with a closing SVG root');
  const content=layout.labels.map(a=>`<g id="callout-group-${xml(a.id)}"><polyline points="${a.leader.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#647078" stroke-width="1"/>${a.lines.map((l,i)=>`<text id="callout-text-${xml(a.id)}-${i}" x="${l.x}" y="${l.baseline}" font-family="${xml(layout.fontFamily)}" font-size="${layout.fontSize}" fill="#243137" xml:space="preserve">${xml(l.text)}</text>`).join('')}</g>`).join('\n');
  return {...scene,autoFit:false,nativeSvg:scene.nativeSvg.replace(/<\/svg\s*>\s*$/i,`<g id="callouts">\n${content}\n</g></svg>`)};
}
