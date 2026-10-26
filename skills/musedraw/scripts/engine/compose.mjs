// Small semantic entry points, compiled into the existing editable scene engine.
// They own page geometry and reading size; they do not interpret a natural-language
// brief or infer unstated scientific/physical relationships.
import { objectViews, viewNodeId } from './object-views.mjs';
import { measure, wrap } from './text.mjs';
import { composeFlow } from './compose-flow.mjs';
import { composePlan } from './compose-plan.mjs';

const object = v => v && typeof v === 'object' && !Array.isArray(v);
const fail = (path, message) => { throw new Error(`Invalid composition ${path}: ${message}`); };
const fields = (o, keys, path) => {
  if (!object(o)) fail(path, 'must be an object');
  for (const k of Object.keys(o)) if (!keys.includes(k)) fail(`${path}/${k}`, 'unsupported field');
};
const text = (s, path) => { if (typeof s !== 'string' || !s.trim()) fail(path, 'must be non-empty text'); };
const unitPair = (v, path, positive = false) => {
  if (!Array.isArray(v) || v.length !== 2 || v.some(n => !Number.isFinite(n) || n < 0 || n > 1 || positive && n === 0)) fail(path, 'requires two fractions in 0..1');
};
const rd = v => Math.round(v * 100) / 100;
// The ordinary paragraph wrapper retains long words. A bounded label also needs
// to break a long identifier rather than allowing it to escape the page.
function labelMeasure(s,size,weight=400) {
  // Space for the widest system fallback glyphs, including monospaced Latin.
  const advance = s => [...s].reduce((sum,ch)=>sum+(/[^\u0000-\u00ff]/u.test(ch)?1.06:/[WM@]/.test(ch)?1:/[wm]/.test(ch)?.93:ch===' '?.66:.78),0)*size;
  return Math.max(measure(s,size,'sans-serif',0,weight)*1.18,advance(s));
}
function boundedWrap(text, width, size, weight=400) {
  const lines=[];
  for(const line of wrap(text,width,size,'sans-serif',0,weight)) {
    if(labelMeasure(line,size,weight)<=width) {lines.push(line);continue;}
    let part='';
    for(const ch of line) {if(part && labelMeasure(part+ch,size,weight)>width){lines.push(part);part='';}part+=ch;}
    if(part)lines.push(part);
  }
  return lines;
}
const roles = { context: 'gray', focus: 'blue', constraint: 'orange', warning: 'red' };
const shapes = new Set(['box', 'circle', 'parallelogram', 'cylinder', 'diamond', 'doc', 'folder', 'frame', 'tray', 'hex', 'pill']);

export function composeStates(b) {
  fields(b, ['method', 'theme', 'width', 'columns', 'entities', 'views'], '/');
  const width = b.width ?? 1200;
  if (!Number.isFinite(width) || width < 900 || width > 1800) fail('/width', 'choose 900..1800 pixels; type scales with the viewing width');
  if (!Array.isArray(b.entities) || !b.entities.length || b.entities.length > 24) fail('/entities', 'requires 1..24 persistent objects');
  if (!Array.isArray(b.views) || !b.views.length || b.views.length > 9) fail('/views', 'requires 1..9 views; split a longer sequence');
  const ids = new Set(), viewIds = new Set();
  for (const [i, e] of b.entities.entries()) {
    const p = `/entities/${i}`;
    fields(e, ['id', 'label', 'shape', 'extent', 'role', 'tone', 'openSide', 'labelMode'], p);
    text(e.id, `${p}/id`); text(e.label, `${p}/label`);
    if (ids.has(e.id)) fail(`${p}/id`, 'duplicate object ID'); ids.add(e.id);
    if (!shapes.has(e.shape ?? 'box')) fail(`${p}/shape`, 'unsupported schematic shape');
    if(e.openSide!==undefined && (e.shape!=='frame'||!['r','l','t','b'].includes(e.openSide)))fail(`${p}/openSide`,'only a frame can open on r, l, t or b');
    if(e.labelMode!==undefined&&!['inside','key','above'].includes(e.labelMode))fail(`${p}/labelMode`,'use inside, above or key');
    unitPair(e.extent, `${p}/extent`, true);
    if (e.role !== undefined && !Object.hasOwn(roles, e.role)) fail(`${p}/role`, 'use context, focus, constraint or warning');
    if (e.tone !== undefined) text(e.tone, `${p}/tone`);
  }
  const byId = new Map(b.entities.map(e => [e.id, e]));
  const columns = b.columns ?? Math.min(3, b.views.length);
  if (!Number.isInteger(columns) || columns < 1 || columns > Math.min(3, b.views.length)) fail('/columns', 'requires 1..3 columns, no empty columns');
  const k = width / 1200, margin = 42 * k, gap = 64 * k, rowGap = 46 * k;
  const viewW = (width - 2 * margin - (columns - 1) * gap) / columns;
  const artH = Math.min(360 * k, viewW * .8);
  const resolved = new Map(), definitions = new Map();
  for (const [i, v] of b.views.entries()) {
    const p = `/views/${i}`;
    fields(v, ['id', 'label', 'from', 'items', 'arrows'], p);
    text(v.id, `${p}/id`); text(v.label, `${p}/label`);
    if (viewIds.has(v.id)) fail(`${p}/id`, 'duplicate view ID'); viewIds.add(v.id);
    if (!Array.isArray(v.items) || !v.items.length && !v.from) fail(`${p}/items`, 'requires visible object poses or an inherited view');
    if (v.from !== undefined && !resolved.has(v.from)) fail(`${p}/from`, 'inherit a previously defined view');
    const poses = new Map();
    const seen = new Set();
    const changes = new Map(v.from ? [...definitions.get(v.from)].map(([id,value])=>[id,structuredClone(value)]) : []);
    for (const [j, pose] of v.items.entries()) {
      const q = `${p}/items/${j}`;
      fields(pose, ['entity', 'at', 'place'], q);
      if (!ids.has(pose.entity)) fail(`${q}/entity`, 'unknown object ID');
      if (seen.has(pose.entity)) fail(`${q}/entity`, 'duplicate object within one view'); seen.add(pose.entity);
      if (Object.hasOwn(pose,'at') === Object.hasOwn(pose,'place')) fail(q, 'use exactly one of at or place');
      if (pose.at !== undefined) unitPair(pose.at, `${q}/at`);
      else {
        fields(pose.place, ['of','relation','gap','offset'], `${q}/place`);
        if (!ids.has(pose.place.of)) fail(`${q}/place/of`, 'unknown reference object');
        if (!['above','below','left','right','inside','align'].includes(pose.place.relation)) fail(`${q}/place/relation`, 'use above, below, left, right, inside or align');
        const gap = pose.place.gap ?? 0;
        if (!Number.isFinite(gap) || gap < 0 || gap > 1) fail(`${q}/place/gap`, 'must be a fraction in 0..1');
        const offset = pose.place.offset ?? [0,0];
        if (!Array.isArray(offset) || offset.length!==2 || offset.some(n=>!Number.isFinite(n)||Math.abs(n)>1)) fail(`${q}/place/offset`, 'requires two signed fractions in -1..1');
      }
      changes.set(pose.entity, {pose,path:q});
    }
    // Resolve constraints as a dependency graph, never in the host's item order.
    const visiting = new Set();
    function locate(id) {
      if (!changes.has(id)) { if (!poses.has(id)) fail(p, `reference object ${id} is not visible`); return poses.get(id); }
      if (visiting.has(id)) fail(p, `cyclic placement constraint at ${id}`);
      visiting.add(id);
      const {pose,path:q} = changes.get(id), e=byId.get(id);
      let at;
      if(pose.at) at=[...pose.at];
      else {
        const place=pose.place, other=byId.get(place.of), anchor=locate(place.of), gap=place.gap??0, offset=place.offset??[0,0];
        at=[anchor[0]+offset[0],anchor[1]+offset[1]];
        if(place.relation==='above')at[1]-=(other.extent[1]+e.extent[1])/2+gap;
        if(place.relation==='below')at[1]+=(other.extent[1]+e.extent[1])/2+gap;
        if(place.relation==='left')at[0]-=(other.extent[0]+e.extent[0])/2+gap;
        if(place.relation==='right')at[0]+=(other.extent[0]+e.extent[0])/2+gap;
        if(place.relation==='inside') {
          if(!['box','frame','tray','folder'].includes(other.shape??'box')) fail(`${q}/place`, 'inside currently supports rectangular box, frame, tray or folder containers; use an explicit custom scene for curved boundaries');
          const centre=[...anchor], available=[...other.extent];
          if(other.shape==='frame') {
            const inset=Math.min(other.extent[0]*viewW,other.extent[1]*artH)*.075;
            available[0]-=2*inset/viewW;available[1]-=2*inset/artH;
          }
          if(other.shape==='tray') {centre[1]-=other.extent[1]*.1;at[1]-=other.extent[1]*.1;available[1]*=.8;}
          if(other.shape==='folder') {centre[1]+=other.extent[1]*.17;at[1]+=other.extent[1]*.17;available[0]*=.95;available[1]*=.55;}
          if(at.some((n,k)=>Math.abs(n-centre[k])+e.extent[k]/2>available[k]/2+1e-9)) fail(`${q}/place`, 'object does not fit inside its reference opening');
        }
      }
      if(at.some((n,k)=>n-e.extent[k]/2 < -1e-9 || n+e.extent[k]/2 > 1+1e-9)) fail(q, 'object extends outside its view');
      visiting.delete(id);changes.delete(id);poses.set(id,at);return at;
    }
    definitions.set(v.id,new Map([...changes].map(([id,value])=>[id,structuredClone(value)])));
    for(const id of [...changes.keys()])locate(id);
    resolved.set(v.id,poses);
    if (v.arrows !== undefined && !Array.isArray(v.arrows)) fail(`${p}/arrows`, 'must be an array');
    for (const [j, a] of (v.arrows ?? []).entries()) {
      const q = `${p}/arrows/${j}`;
      fields(a, ['from', 'to', 'label'], q); unitPair(a.from, `${q}/from`); unitPair(a.to, `${q}/to`);
      if (Math.hypot(a.to[0] - a.from[0], a.to[1] - a.from[1]) < .05) fail(q, 'arrow is too short');
      if (a.label !== undefined) text(a.label, `${q}/label`);
    }
  }
  for (const id of ids) if (![...resolved.values()].some(poses=>poses.has(id))) fail('/entities', `object ${id} is never shown`);
  const labelSize = 20 * k, keySize = 18 * k;
  const labels = b.views.map(v => boundedWrap(v.label, viewW, labelSize, 600));
  const folders=b.entities.filter(e=>e.shape==='folder'), multipleFolderNames=new Set(folders.map(e=>e.label)).size>1;
  const captions=new Map(b.entities.filter(e=>e.labelMode==='above'||e.labelMode===undefined&&e.shape==='folder'&&multipleFolderNames)
    .map(e=>[e.id,boundedWrap(e.label,Math.max(80*k,Math.min(viewW*.85,e.extent[0]*viewW)),18*k)]));
  const captionSpace=captions.size?Math.max(...[...captions.values()].map(lines=>lines.length))*18*k*1.3+12*k:0;
  const headingH = Math.max(...labels.map(l => l.length)) * labelSize * 1.3 + 24 * k+captionSpace;
  const rows = Math.ceil(b.views.length / columns), viewH = headingH + artH;
  const inline = new Set(b.entities.filter(e=>e.labelMode==='inside'||e.labelMode===undefined&&e.shape==='doc'
    &&labelMeasure(e.label,18*k)<=e.extent[0]*viewW-12*k&&e.extent[1]*artH>=34*k).map(e=>e.id));
  const block = {type:'object-views',id:'states',x:margin,y:margin,w:width - 2 * margin,
    h:rows * viewH + (rows - 1) * rowGap,columns,gap,rowGap,headingH,
    entities:b.entities.map(e => ({id:e.id,label:captions.has(e.id)?captions.get(e.id).join('\n'):e.label,shape:e.shape ?? 'box',extent:e.extent,
      tone:e.tone ?? roles[e.role] ?? 'gray',openSide:e.openSide,labelPos:inline.has(e.id)?'inside':captions.has(e.id)?'above':'none',size:18*k,padding:6*k,radius:1})),
    views:b.views.map(v => ({id:v.id,items:[...definitions.get(v.id).keys()].map(entity => ({entity,at:resolved.get(v.id).get(entity),showLabel:inline.has(entity)||captions.has(entity),overlap:true}))}))};
  const {nodes} = objectViews(block), texts = [], paths = [];
  // Keep a distinct folder's identity attached to its body. Prefer the same
  // side throughout the sequence, avoiding documents above an empty folder.
  for(const e of folders.filter(e=>e.labelMode===undefined&&captions.has(e.id))) {
    const placements=b.views.map(v=>({node:nodes.find(n=>n.id===viewNodeId('states',v.id,e.id)),
      peers:nodes.filter(n=>[...definitions.get(v.id).keys()].some(id=>n.id===viewNodeId('states',v.id,id)))})).filter(p=>p.node);
    const lines=captions.get(e.id),tw=Math.max(...lines.map(s=>labelMeasure(s,18*k))),th=lines.length*18*k*1.25;
    const hits=(p,side)=>{
      const n=p.node,x=n.x+n.w/2-tw/2,y=side==='above'?n.y-10*k-th:n.y+n.h+10*k;
      return p.peers.some(o=>o!==n&&x<o.x+o.w+4*k&&x+tw>o.x-4*k&&y<o.y+o.h+4*k&&y+th>o.y-4*k);
    };
    if(placements.some(p=>hits(p,'above'))&&!placements.some(p=>hits(p,'below')))
      for(const p of placements)p.node.labelPos='below';
  }
  b.views.forEach((v,i) => {
    const x = margin + (i % columns) * (viewW + gap), y = margin + Math.floor(i / columns) * (viewH + rowGap);
    texts.push({id:`view-${encodeURIComponent(v.id)}`,x:rd(x),y:rd(y + labelSize),w:rd(viewW),
      text:labels[i].join('\n'),size:labelSize,weight:600,color:'ink',lineHeight:1.3});
    (v.arrows ?? []).forEach((a,j) => {
      const [sx,sy] = [x + viewW * a.from[0], y + headingH + artH * a.from[1]];
      const [tx,ty] = [x + viewW * a.to[0], y + headingH + artH * a.to[1]];
      const length = Math.hypot(tx-sx,ty-sy), ux = (tx-sx)/length, uy = (ty-sy)/length, tip = 8*k;
      const ax = tx - ux * tip, ay = ty - uy * tip;
      const motionId=`motion-${encodeURIComponent(v.id)}-${j}`;
      paths.push({id:motionId,d:`M${rd(sx)} ${rd(sy)}L${rd(ax)} ${rd(ay)}`,stroke:'ink',width:1.6*k,layer:'foreground'},
        {id:motionId+'-tip',d:`M${rd(tx)} ${rd(ty)}L${rd(ax-uy*tip*.42)} ${rd(ay+ux*tip*.42)}L${rd(ax+uy*tip*.42)} ${rd(ay-ux*tip*.42)}Z`,fill:'ink',stroke:'none',layer:'foreground'});
      if (a.label) {
        const size=17*k, top=y+headingH, bottom=top+artH, obstacles=nodes.filter(n=>n.id.startsWith(`states-${encodeURIComponent(v.id).replace(/-/g,'%2D')}-`));
        let selected;
        placement: for(const t of [.5,.25,.75])for(const side of [-1,1]) {
          const cx=sx+(tx-sx)*t, cy=sy+(ty-sy)*t, vertical=Math.abs(uy)>.5;
          const available=vertical ? side>0 ? x+viewW-cx-18*k : cx-x-18*k : viewW-12*k;
          if(available<size*2)continue;
          const lines=boundedWrap(a.label,Math.min(available,viewW*.65),size), tw=Math.max(...lines.map(s=>labelMeasure(s,size))), th=lines.length*size*1.3;
          let lx=vertical ? side>0 ? cx+12*k : cx-12*k-tw : Math.max(x+6*k,Math.min(cx-tw/2,x+viewW-6*k-tw));
          let ly=vertical ? cy-th/2 : side<0 ? cy-12*k-th : cy+12*k;
          if(ly<top || ly+th>bottom)continue;
          if(obstacles.some(n=>lx<n.x+n.w+4*k&&lx+tw>n.x-4*k&&ly<n.y+n.h+4*k&&ly+th>n.y-4*k))continue;
          if(texts.some(text=>text.id?.startsWith('motion-')&&text.id.endsWith('-label')&&lx<text.x+text.w+4*k&&lx+tw>text.x-4*k&&ly<text.y+(text.text.split('\n').length*size*1.3)&&ly+th>text.y-size))continue;
          selected={id:motionId+'-label',x:rd(lx),y:rd(ly+size*.85),w:rd(tw+1),text:lines.join('\n'),size,color:'ink',lineHeight:1.3};break placement;
        }
        if(!selected)fail(`/views/${i}/arrows/${j}/label`,'no readable label space beside this motion; move the arrow into open space or use the operation label once');
        texts.push(selected);
      }
    });
  });
  // One key per distinct label/tone/shape, rather than tiny text on each part.
  let keyX = margin, keyY = margin + block.h + 38*k+captionSpace;
  const keys = new Set();
  for (const e of b.entities) {
    if(inline.has(e.id)||captions.has(e.id))continue;
    const source = nodes.find(n => n.id === viewNodeId('states', b.views.find(v => resolved.get(v.id).has(e.id)).id, e.id));
    const signature = JSON.stringify([e.label,source.tone,source.shape]);
    if (keys.has(signature)) continue; keys.add(signature);
    const lines = boundedWrap(e.label, width - 2*margin - 34*k, keySize);
    const textW = Math.max(...lines.map(s=>labelMeasure(s,keySize))), entryW = textW + 64*k;
    if (keyX > margin && keyX + entryW > width - margin) { keyX=margin; keyY += 40*k; }
    nodes.push({id:`key-${encodeURIComponent(e.id)}`,shape:source.shape,x:rd(keyX),y:rd(keyY-14*k),
      w:18*k,h:14*k,label:'',labelPos:'none',tone:source.tone,openSide:e.openSide,radius:1});
    texts.push({id:`name-${encodeURIComponent(e.id)}`,x:rd(keyX+30*k),y:rd(keyY),text:lines.join('\n'),size:keySize,color:'ink',lineHeight:1.3});
    keyX += entryW;
    if(lines.length>1) {keyX=margin;keyY += lines.length*keySize*1.3+16*k;}
  }
  const height=Math.ceil(keyY+40*k), previewScale=Math.min(1,1200/width,1000/height);
  if(17*k*previewScale<14)fail('/views', 'too many rows for readable 1200×1000 preview; use more columns or split the states');
  return {schemaVersion:1,theme:b.theme ?? 'journal',size:[width,height],header:false,footer:false,autoFit:false,meta:{composition:'states'},
    style:{node:{size:20*k,padding:8*k,stroke:1.4*k},edge:{labelSize:17*k,width:1.5*k}},nodes,texts,paths};
}

export function compose(b) {
  if (!object(b)) fail('/', 'must be an object');
  if (b.method === 'states') return composeStates(b);
  if (b.method === 'flow') return composeFlow(b);
  if (b.method === 'plan') return composePlan(b);
  fail('/method', 'use states, flow or plan; other compositions use render scene.json');
}
