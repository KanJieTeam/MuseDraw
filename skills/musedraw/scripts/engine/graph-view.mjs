// A derived view of an explicit point graph, never an image crop or a model of
// measured magnification. Source geometry/topology remains the single authority.
import {scientificMotif} from './scientific-motifs.mjs';
import {measure} from './text.mjs';

const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const finite = Number.isFinite;

export function graphView(b, source, theme = {}) {
  const bad = message => { throw new Error(`graph-view ${b?.id ?? '?'}: ${message}`); };
  const keys = (value, allowed, where) => {
    if (!object(value)) bad(`${where} must be an object`);
    for (const key of Object.keys(value)) if (!allowed.includes(key)) bad(`unsupported ${where} field ${key}`);
  };
  const id = (value, where) => {
    if (typeof value !== 'string' || !value.trim() || /[\u0000-\u001f\u007f]/.test(value)) bad(`${where} requires a nonempty ID without control characters`);
    try { encodeURIComponent(value); } catch { bad(`${where} ID must be valid Unicode`); }
    return value;
  };
  const positive = (value, where) => { if (!finite(value) || value <= 0) bad(`${where} must be positive finite pixels`); };
  const colour = (value, where) => { if (typeof value !== 'string' || !value.trim()) bad(`${where} must be a colour string`); };
  const frame = (value, where) => {
    for (const k of ['x','y','w','h']) if (!finite(value[k])) bad(`${where}.${k} must be finite`);
    positive(value.w, `${where}.w`); positive(value.h, `${where}.h`);
    if (!finite(value.x + value.w) || !finite(value.y + value.h)) bad(`${where} bounds overflow`);
  };
  keys(b, ['type','id','source','select','x','y','w','h','padding','guidePoints','labelSize'], 'view');
  if (b.type !== 'graph-view') bad('type must be graph-view');
  id(b.id, 'view'); id(b.source, 'source reference'); frame(b, 'view');
  const padding = b.padding === undefined ? 24 : b.padding;
  positive(padding, 'padding');
  if (b.labelSize !== undefined) positive(b.labelSize, 'labelSize');
  const iw = b.w - 2 * padding, ih = b.h - 2 * padding;
  if (iw <= 0 || ih <= 0) bad('frame has no space inside padding');

  keys(source, ['id','type','kind','x','y','w','h','palette','size','points','links','diameter'], 'source');
  if (source.type !== 'scientific' || source.kind !== 'graph') bad('source must be a canonical scientific graph definition');
  id(source.id, 'source'); frame(source, 'source');
  if (b.source !== source.id) bad('source reference does not match the supplied graph ID');
  if (b.id === source.id) bad('view ID collides with source ID');
  if (source.size !== undefined) positive(source.size, 'source.size');
  if (source.diameter !== undefined) positive(source.diameter, 'source.diameter');
  if (source.palette !== undefined) {
    if (!object(source.palette)) bad('source.palette must map colour roles to strings');
    for (const [role,value] of Object.entries(source.palette)) colour(value, `palette.${role}`);
  }
  if (!Array.isArray(source.points) || !source.points.length || source.points.length > 100) bad('source needs 1..100 explicit points');
  const pointIds = new Set();
  for (const p of source.points) {
    keys(p, ['id','x','y','label','fill','stroke','diameter','labelPos','labelGap'], 'point'); id(p.id, 'point');
    if (pointIds.has(p.id)) bad(`duplicate source point ID ${p.id}`); pointIds.add(p.id);
    if (![p.x,p.y].every(v => finite(v) && v >= 0 && v <= 1)) bad('point coordinates must be in 0..1');
    if (p.label !== undefined && typeof p.label !== 'string') bad('point label must be text');
    if (p.labelPos !== undefined && !['above','below','left','right','none'].includes(p.labelPos)) bad('point labelPos must be above, below, left, right or none');
    if (p.labelGap !== undefined && (!finite(p.labelGap) || p.labelGap < 0)) bad('point labelGap must be nonnegative finite pixels');
    for (const k of ['fill','stroke']) if (p[k] !== undefined) colour(p[k], `point.${k}`);
    if (p.diameter !== undefined) positive(p.diameter, 'point.diameter');
  }
  if (source.links !== undefined && !Array.isArray(source.links)) bad('source links must be an array');
  for (const link of source.links ?? []) {
    keys(link, ['from','to','directed','color','width','dash'], 'link');
    if (!pointIds.has(link.from) || !pointIds.has(link.to) || link.from === link.to) bad('links need distinct existing point IDs');
    if (link.directed !== undefined && typeof link.directed !== 'boolean') bad('link directed must be boolean');
    if (link.width !== undefined) positive(link.width, 'link.width');
    if (link.color !== undefined) colour(link.color, 'link.color');
    if (link.dash !== undefined && typeof link.dash !== 'string') bad('link dash must be a string');
  }
  if (!Array.isArray(b.select) || !b.select.length || b.select.length > 100) bad('select must contain 1..100 existing point IDs');
  const selected = new Set();
  for (const name of b.select) {
    id(name, 'selected point');
    if (selected.has(name)) bad(`duplicate selected point ${name}`);
    if (!pointIds.has(name)) bad(`unknown selected point ${name}`); selected.add(name);
  }
  if (b.guidePoints !== undefined && (!Array.isArray(b.guidePoints) || b.guidePoints.length !== 2
      || b.guidePoints[0] === b.guidePoints[1] || b.guidePoints.some(p => !selected.has(p))))
    bad('guidePoints requires two distinct selected point IDs');

  // Reuse canonical appearances, actual rounded geometry and stable part IDs.
  // Full-source validation/collision checks happen even for unselected objects.
  const canonical = scientificMotif(structuredClone(source), theme);
  // Scientific modules also own this SVG group ID, alongside their native
  // anchor. Reject collisions before the combined scene reaches the renderer.
  const sourceIds = new Set([`scientific-${source.id}`]);
  for (const part of [...canonical.nodes,...canonical.edges,...canonical.texts]) {
    if (sourceIds.has(part.id)) bad(`source native ID collision ${part.id}`); sourceIds.add(part.id);
  }
  const terminal = (prefix, name) => `${prefix}-${encodeURIComponent(name)}`;
  const sourceNodes = new Map(canonical.nodes.map(n => [n.id,n]));
  const textByPoint = new Map(canonical.texts.map(t=>[t.pointLabel,t]));
  const labelSize = b.labelSize ?? source.size ?? 16;
  const font = theme.fonts?.body ?? 'Arial, sans-serif';
  const items = source.points.filter(p => selected.has(p.id)).map(p => {
    const node = sourceNodes.get(terminal(source.id,p.id));
    if (!node || ![node.x,node.y,node.w,node.h].every(finite) || node.w <= 0 || node.h <= 0) bad(`source point ${p.id} has unusable native geometry`);
    const text = textByPoint.get(p.id), lines = text?.text.split('\n');
    const labelW = lines ? Math.max(...lines.map(line => measure(line,labelSize,font))) * 1.3 + labelSize * .4 : 0;
    return {name:p.id,node,text,cx:node.x+node.w/2,cy:node.y+node.h/2,labelW,lines:lines?.length ?? 0};
  });
  // Work relative to a real source point to avoid large world-coordinate offsets.
  const origin = [items[0].cx,items[0].cy];
  for (const item of items) { item.dx=item.cx-origin[0]; item.dy=item.cy-origin[1]; }
  const bounds = scale => {
    let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
    for (const item of items) {
      const x=item.dx*scale,y=item.dy*scale,r=item.node.w*scale/2;
      left=Math.min(left,x-r);right=Math.max(right,x+r);top=Math.min(top,y-r);bottom=Math.max(bottom,y+r);
      if (item.text) {
        const labelX=(item.text.x-origin[0])*scale,baseline=(item.text.y-origin[1])*scale;
        const labelLeft=labelX-(item.text.anchor==='end'?item.labelW:item.text.anchor==='middle'?item.labelW/2:0);
        left=Math.min(left,labelLeft);right=Math.max(right,labelLeft+item.labelW);
        top=Math.min(top,baseline-labelSize*1.15);
        bottom=Math.max(bottom,baseline+labelSize*(.45+1.3*(item.lines-1)));
      }
    }
    return {left,top,right,bottom,w:right-left,h:bottom-top};
  };
  if (bounds(0).w > iw || bounds(0).h > ih) bad('labels do not fit inside the padded frame; increase frame or reduce labelSize');
  let lo=0,hi=Math.min(iw,ih)/Math.max(...items.map(i=>i.node.w));
  for (let i=0;i<64;i++) {
    const mid=(lo+hi)/2,box=bounds(mid);
    if (box.w <= iw && box.h <= ih) lo=mid; else hi=mid;
  }
  if (!finite(lo) || lo <= 1e-12) bad('frame cannot fit positive graph geometry with these labels');
  const box=bounds(lo),tx=b.x+padding+(iw-box.w)/2-box.left,ty=b.y+padding+(ih-box.h)/2-box.top;
  const rename = value => b.id+value.slice(source.id.length);
  const out={nodes:[{...canonical.nodes[0],id:b.id,x:b.x,y:b.y,w:b.w,h:b.h,nativeModule:b.id}],edges:[],texts:[],nativeModules:[{id:b.id}]};
  for (const item of items) {
    const x=tx+item.dx*lo,y=ty+item.dy*lo,d=item.node.w*lo;
    out.nodes.push({...item.node,id:terminal(b.id,item.name),x:x-d/2,y:y-d/2,w:d,h:d,nativeModule:b.id});
    if (item.text) out.texts.push({...item.text,id:rename(item.text.id),x:tx+(item.text.x-origin[0])*lo,y:ty+(item.text.y-origin[1])*lo,
      size:labelSize,w:item.labelW,lineHeight:1.3,nativeModule:b.id});
  }
  for (const [i,link] of (source.links ?? []).entries()) if (selected.has(link.from) && selected.has(link.to)) {
    const edge=canonical.edges[i];
    out.edges.push({...edge,id:rename(edge.id),from:terminal(b.id,link.from),to:terminal(b.id,link.to),nativeModule:b.id});
  }
  for (const [i,name] of (b.guidePoints ?? []).entries()) out.edges.push({id:`${b.id}/guide/${i}`,from:terminal(source.id,name),to:terminal(b.id,name),
    kind:'detail-guide',route:'straight',arrow:'none',color:'#A9B3B6',width:.9});
  const moduleId=`scientific-${b.id}`;
  if (sourceIds.has(moduleId)) bad(`native ID collision ${moduleId}`);
  const generated = new Set([moduleId]);
  for (const part of [...out.nodes,...out.edges,...out.texts]) {
    if (sourceIds.has(part.id) || generated.has(part.id)) bad(`native ID collision ${part.id}`); generated.add(part.id);
  }
  return out;
}
