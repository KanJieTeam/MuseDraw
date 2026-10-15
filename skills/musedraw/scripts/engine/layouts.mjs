// Layout blocks: compact, semantic descriptions that expand into ordinary
// primitives (zones, nodes, edges, texts, lines, paths). An agent describes
// *what* (a tree, a timeline, a 2×2 matrix…) and a bounding box; the block
// computes positions. Blocks can be mixed with hand-placed primitives.

const PI = Math.PI;
const r2 = (n) => Math.round(n * 100) / 100;

export function expandBlocks(scene, theme) {
  if (!scene.blocks?.length) return scene;
  const out = { ...scene, zones: [...(scene.zones ?? [])], nodes: [...(scene.nodes ?? [])], edges: [...(scene.edges ?? [])], texts: [...(scene.texts ?? [])], lines: [...(scene.lines ?? [])], paths: [...(scene.paths ?? [])], notes: [...(scene.notes ?? [])] };
  scene.blocks.forEach((b, i) => {
    const fn = BLOCKS[b.type];
    if (!fn) throw new Error(`Unknown block type "${b.type}". Available: ${Object.keys(BLOCKS).join(', ')}`);
    const res = fn({ id: b.id ?? `b${i + 1}`, ...b }, theme);
    for (const k of ['zones', 'nodes', 'edges', 'texts', 'lines', 'paths', 'notes']) if (res[k]) out[k].push(...res[k]);
  });
  return out;
}

// ---------------------------------------------------------------- tree
// {type:'tree', x,y,w, direction:'down'|'right', root:{id,label,sub,tone,children:[...], stack:true}, nodeW, nodeH, levelGap, siblingGap, tones:[byDepth], edge:{kind}}
function tree(b) {
  const dir = b.direction ?? 'down';
  const nodeW = (d) => (Array.isArray(b.nodeW) ? b.nodeW[Math.min(d, b.nodeW.length - 1)] : b.nodeW ?? 180);
  const nodeH = (d) => (Array.isArray(b.nodeH) ? b.nodeH[Math.min(d, b.nodeH.length - 1)] : b.nodeH ?? 64);
  const levelGap = b.levelGap ?? 56, sib = b.siblingGap ?? 20, stackGap = b.stackGap ?? 12, indent = b.stackIndent ?? 22;
  const nodes = [], edges = [];
  let auto = 0;
  const idOf = (n) => n.id ?? `${b.id}-n${++auto}`;
  // measure: extent along the sibling axis
  function extent(n, d) {
    const own = dir === 'down' ? nodeW(d) : nodeH(d);
    if (!n.children?.length) return own;
    if (n.stack) {
      const cw = dir === 'down' ? Math.max(...n.children.map(() => nodeW(d + 1))) + indent : Math.max(...n.children.map(() => nodeH(d + 1)));
      return Math.max(own, cw);
    }
    const sum = n.children.reduce((a, c) => a + extent(c, d + 1), 0) + sib * (n.children.length - 1);
    return Math.max(own, sum);
  }
  function depthPos(d) {
    let p = 0;
    for (let i = 0; i < d; i++) p += (dir === 'down' ? nodeH(i) : nodeW(i)) + levelGap;
    return p;
  }
  function place(n, d, start, parent) {
    const ext = extent(n, d);
    const id = idOf(n);
    const w = n.w ?? nodeW(d), h = n.h ?? nodeH(d);
    let x, y;
    if (dir === 'down') { x = b.x + start + ext / 2 - w / 2; y = b.y + depthPos(d); }
    else { y = b.y + start + ext / 2 - h / 2; x = b.x + depthPos(d); }
    if (n.stackChild) { x = n.stackChild.x; y = n.stackChild.y; }
    const tone = n.tone ?? b.tones?.[Math.min(d, (b.tones?.length ?? 1) - 1)];
    nodes.push({ id, label: n.label, sub: n.sub, tag: n.tag, icon: n.icon, shape: n.shape, align: n.align ?? b.align, step: n.step, size: n.size ?? b.sizes?.[d], tone, x: r2(x), y: r2(y), w, h });
    if (parent) {
      if (parent.stack) edges.push({ from: parent.id, to: id, fromSide: dir === 'down' ? 'b' : 'r', toSide: dir === 'down' ? 'l' : 't', fromAt: dir === 'down' ? Math.min(0.5, indent / 2 / parent.w) : 0.5, kind: b.edge?.kind, arrow: b.edge?.arrow ?? 'none' });
      else edges.push({ from: parent.id, to: id, fromSide: dir === 'down' ? 'b' : 'r', toSide: dir === 'down' ? 't' : 'l', fromAt: 0.5, toAt: 0.5, mid: dir === 'down' ? r2(parent.y + parent.h + levelGap / 2) : r2(parent.x + parent.w + levelGap / 2), kind: b.edge?.kind, arrow: b.edge?.arrow ?? 'none' });
    }
    const self = { id, x, y, w, h, stack: n.stack };
    if (n.children?.length) {
      if (n.stack) {
        let cy = dir === 'down' ? y + h + stackGap : y;
        let cx = dir === 'down' ? x + indent : x + w + levelGap;
        n.children.forEach((c) => {
          const ch = c.h ?? nodeH(d + 1);
          place({ ...c, w: c.w ?? (dir === 'down' ? Math.max(w, nodeW(d + 1)) - indent : undefined), stackChild: { x: cx, y: cy } }, d + 1, 0, self);
          if (dir === 'down') cy += ch + stackGap; else cy += ch + stackGap;
        });
      } else {
        const sum = n.children.reduce((a, c) => a + extent(c, d + 1), 0) + sib * (n.children.length - 1);
        let s = start + (ext - sum) / 2;
        for (const c of n.children) { place(c, d + 1, s, self); s += extent(c, d + 1) + sib; }
      }
    }
  }
  const total = extent(b.root, 0);
  const span = dir === 'down' ? b.w : b.h;
  place(b.root, 0, span ? Math.max(0, (span - total) / 2) : 0, null);
  return { nodes, edges };
}

// ---------------------------------------------------------------- mindmap
// {type:'mindmap', cx, cy, root:{label,...,children:[{label, tone, children:[...]}]}, spreadX, rowH, nodeW}
function mindmap(b) {
  const nodes = [], edges = [];
  const rowH = b.rowH ?? 46, gapX = b.levelGap ?? 70;
  const nw = (d) => (Array.isArray(b.nodeW) ? b.nodeW[Math.min(d, b.nodeW.length - 1)] : b.nodeW ?? 170);
  const nh = (d) => (Array.isArray(b.nodeH) ? b.nodeH[Math.min(d, b.nodeH.length - 1)] : b.nodeH ?? 40);
  const root = b.root; const rid = root.id ?? `${b.id}-root`;
  const RW = b.rootW ?? 220, RH = b.rootH ?? 84;
  nodes.push({ id: rid, label: root.label, sub: root.sub, tone: root.tone ?? 'accent', shape: root.shape ?? 'pill', x: b.cx - RW / 2, y: b.cy - RH / 2, w: RW, h: RH, align: 'center' });
  const kids = root.children ?? [];
  const right = kids.filter((_, i) => (b.split ? i < b.split : i % 2 === 0)), left = kids.filter((_, i) => (b.split ? i >= b.split : i % 2 === 1));
  let auto = 0;
  const leaves = (n) => (n.children?.length ? n.children.reduce((a, c) => a + leaves(c), 0) : 1);
  function side(list, sign) {
    const total = list.reduce((a, c) => a + leaves(c), 0) + (list.length - 1) * (b.branchGap ?? 0.6);
    let y = b.cy - (total * rowH) / 2;
    for (const c of list) { const L = leaves(c); placeKid(c, 1, sign, y, rid, true); y += (L + (b.branchGap ?? 0.6)) * rowH; }
  }
  function placeKid(n, d, sign, top, parentId, first) {
    const L = leaves(n);
    const id = n.id ?? `${b.id}-m${++auto}`;
    const w = n.w ?? nw(d), h = n.h ?? nh(d);
    const cy = top + (L * rowH) / 2;
    const off = RW / 2 + gapX + (d - 1) * (nw(d - 1) + gapX) - (d === 1 ? 0 : nw(d - 1) - nw(d - 1));
    let x;
    if (d === 1) x = sign > 0 ? b.cx + RW / 2 + gapX : b.cx - RW / 2 - gapX - w;
    else { const px = n._px; x = sign > 0 ? px + gapX : px - gapX - w; }
    void off;
    nodes.push({ id, label: n.label, sub: n.sub, tone: n.tone ?? b.tones?.[Math.min(d, (b.tones?.length ?? 1) - 1)], shape: n.shape ?? (d === 1 ? 'pill' : 'text'), align: d === 1 ? 'center' : sign > 0 ? 'left' : 'right', size: n.size ?? b.sizes?.[d], x: r2(x), y: r2(cy - h / 2), w, h, labelPos: n.labelPos });
    edges.push({ from: parentId, to: id, fromSide: sign > 0 ? 'r' : 'l', toSide: sign > 0 ? 'l' : 'r', route: 'curve', bend: 0.5, arrow: 'none', kind: n.edgeKind ?? b.edgeKinds?.[Math.min(d - 1, (b.edgeKinds?.length ?? 1) - 1)], color: n.color, width: d === 1 ? b.trunkWidth ?? 3 : b.branchWidth ?? 1.6, fromAt: 0.5, toAt: 0.5 });
    if (n.children?.length) {
      let y = top;
      for (const c of n.children) { const LL = leaves(c); placeKid({ ...c, _px: sign > 0 ? x + w : x, color: c.color ?? n.color, edgeKind: c.edgeKind ?? n.edgeKind }, d + 1, sign, y, id); y += LL * rowH; }
    }
  }
  side(right, 1); side(left, -1);
  return { nodes, edges };
}

// ---------------------------------------------------------------- timeline
// {type:'timeline', x,y,w, items:[{date,label,sub,tone,at?}], alternate:true, gap:70, itemW:200, color}
function timeline(b) {
  const items = b.items ?? [];
  const n = items.length;
  const pad = b.pad ?? 60;
  const xs = items.map((it, i) => (it.at != null ? b.x + pad + it.at * (b.w - 2 * pad) : b.x + pad + (n === 1 ? 0.5 : i / (n - 1)) * (b.w - 2 * pad)));
  const y = b.y;
  const lines = [{ points: [[b.x, y], [b.x + b.w, y]], kind: 'axis', color: b.color ?? 'ink', width: b.axisWidth ?? 3 }];
  const nodes = [], texts = [];
  const iw = b.itemW ?? 190, gap = b.gap ?? 34;
  items.forEach((it, i) => {
    const up = b.alternate === false ? b.side !== 'below' : i % 2 === 0;
    const x = xs[i];
    const r = it.big ? 13 : 9;
    nodes.push({ id: it.id ?? `${b.id}-t${i + 1}`, shape: 'station', tone: it.tone ?? b.tone ?? 'default', x: r2(x - r), y: r2(y - r), w: r * 2, h: r * 2, labelPos: 'none', label: '' });
    const stem = it.stem ?? gap;
    lines.push({ points: [[x, up ? y - r : y + r], [x, up ? y - r - stem : y + r + stem]], kind: 'tick', color: b.tickColor ?? 'muted', width: 1 });
    const anchor = b.anchor ?? 'middle';
    const tx = anchor === 'start' ? x - 4 : x;
    const lines2 = (it.sub ? 1 : 0);
    void lines2;
    if (up) {
      const base = y - r - stem - 10;
      texts.push({ x: tx, y: base - (it.sub ? (b.subLines ?? 2) * 18 + 6 : 0) - 26, text: it.date, font: 'mono', size: b.dateSize ?? 13, weight: 700, color: it.dateColor ?? b.dateColor ?? 'accent', anchor, letterSpacing: 1 });
      texts.push({ x: tx, y: base - (it.sub ? (b.subLines ?? 2) * 18 + 6 : 0), text: it.label, font: b.labelFont ?? 'display', size: b.labelSize ?? 18, weight: 700, color: 'ink', anchor, w: iw });
      if (it.sub) texts.push({ x: tx, y: base - (b.subLines ?? 2) * 18 + 14, text: it.sub, size: b.subSize ?? 13.5, color: 'muted', anchor, w: iw, lineHeight: 1.35 });
    } else {
      const base = y + r + stem + 22;
      texts.push({ x: tx, y: base, text: it.date, font: 'mono', size: b.dateSize ?? 13, weight: 700, color: it.dateColor ?? b.dateColor ?? 'accent', anchor, letterSpacing: 1 });
      texts.push({ x: tx, y: base + 26, text: it.label, font: b.labelFont ?? 'display', size: b.labelSize ?? 18, weight: 700, color: 'ink', anchor, w: iw });
      if (it.sub) texts.push({ x: tx, y: base + 50, text: it.sub, size: b.subSize ?? 13.5, color: 'muted', anchor, w: iw, lineHeight: 1.35 });
    }
  });
  return { lines, nodes, texts };
}

// ---------------------------------------------------------------- gantt
// {type:'gantt', x,y,w, columns:['W1',...], labelW:220, rowH:44, tasks:[{label, start, end, tone, milestone, group}], today: 3.5}
function gantt(b) {
  const cols = b.columns ?? [];
  const labelW = b.labelW ?? 220, rowH = b.rowH ?? 44, headH = b.headH ?? 36;
  const gx = b.x + labelW, gw = b.w - labelW, cw = gw / cols.length;
  const texts = [], lines = [], nodes = [], zones = [];
  cols.forEach((c, i) => {
    texts.push({ x: gx + cw * i + cw / 2, y: b.y + 22, text: c, font: 'mono', size: b.colSize ?? 12, weight: 600, color: 'muted', anchor: 'middle' });
  });
  let y = b.y + headH;
  const rows = [];
  let lastGroup = null;
  for (const t of b.tasks ?? []) {
    if (t.group && t.group !== lastGroup) { rows.push({ group: t.group, y }); y += b.groupH ?? 36; lastGroup = t.group; }
    rows.push({ t, y }); y += rowH;
  }
  const bottom = y;
  for (let i = 0; i <= cols.length; i++) lines.push({ points: [[gx + cw * i, b.y + headH - 6], [gx + cw * i, bottom]], kind: 'grid', color: b.gridColor ?? '#00000018', width: 1 });
  lines.push({ points: [[b.x, b.y + headH - 6], [b.x + b.w, b.y + headH - 6]], kind: 'grid', color: b.ruleColor ?? 'ink', width: 1.2 });
  let k = 0;
  for (const r of rows) {
    if (r.group) {
      texts.push({ x: b.x, y: r.y + 24, text: r.group, font: b.groupFont ?? 'mono', size: b.groupSize ?? 12, weight: 700, color: b.groupColor ?? 'accent', letterSpacing: 1.2, case: b.groupCase ?? 'upper' });
      continue;
    }
    const t = r.t;
    texts.push({ x: b.x + (b.indent ?? 0), y: r.y + rowH / 2 + 5, text: t.label, size: b.labelSize ?? 14, weight: t.bold ? 700 : 500, color: 'ink' });
    const id = t.id ?? `${b.id}-g${++k}`;
    if (t.milestone) {
      const cx = gx + cw * t.start, s = rowH * 0.5;
      nodes.push({ id, shape: 'diamond', tone: t.tone ?? b.milestoneTone ?? 'accent', x: r2(cx - s / 2), y: r2(r.y + rowH / 2 - s / 2), w: s, h: s, label: '' });
      if (t.note) texts.push({ x: cx + s / 2 + 8, y: r.y + rowH / 2 + 5, text: t.note, size: 12.5, color: 'muted', weight: 600 });
    } else {
      const segs = t.segments ?? [[t.start, t.end, t.inLabel]];
      const bh = rowH * (b.barRatio ?? 0.56);
      let bx = 0, bw = 0;
      segs.forEach(([s0, s1, lab], si) => {
        bx = gx + cw * s0 + 2; bw = cw * (s1 - s0) - 4;
        nodes.push({ id: si ? `${id}-${si}` : id, shape: b.barShape ?? 'box', radius: b.barRadius, tone: t.tone ?? 'default', x: r2(bx), y: r2(r.y + (rowH - bh) / 2), w: r2(bw), h: r2(bh), label: lab ?? '', size: b.barLabelSize ?? 12, align: 'center' });
      });
      if (t.note) texts.push({ x: bx + bw + 8, y: r.y + rowH / 2 + 5, text: t.note, size: 12.5, color: 'muted' });
    }
  }
  if (b.today != null) {
    const tx = gx + cw * b.today;
    lines.push({ points: [[tx, b.y + headH - 14], [tx, bottom + 6]], kind: 'today', color: b.todayColor ?? 'accent', width: 1.6, dash: '4 3' });
    texts.push({ x: tx, y: bottom + 24, text: b.todayLabel ?? 'today', font: 'mono', size: 11.5, weight: 700, color: b.todayColor ?? 'accent', anchor: 'middle' });
  }
  return { texts, lines, nodes, zones, edges: (b.deps ?? []).map((d) => ({ ...d, kind: d.kind ?? 'muted' })) };
}

// ---------------------------------------------------------------- matrix (2×2) + scatter points
// {type:'matrix', x,y,w,h, xAxis:['low','high','label'], yAxis:[...], quadrants:[{title,sub,tone,items:[]}×4 TL,TR,BL,BR], points:[{label,x,y,r,tone}]}
function matrix(b) {
  const zones = [], texts = [], nodes = [], lines = [];
  const ax = b.axisPad ?? 46;
  const X = b.x + ax, Y = b.y, W = b.w - ax, H = b.h - ax;
  const gap = b.gap ?? 10;
  const qw = (W - gap) / 2, qh = (H - gap) / 2;
  const pos = [[X, Y], [X + qw + gap, Y], [X, Y + qh + gap], [X + qw + gap, Y + qh + gap]];
  (b.quadrants ?? []).forEach((q, i) => {
    const [qx, qy] = pos[i];
    zones.push({ id: `${b.id}-q${i + 1}`, label: q.title, sub: q.sub, tone: q.tone ?? 'default', style: q.style ?? b.quadStyle ?? 'fill', x: r2(qx), y: r2(qy), w: r2(qw), h: r2(qh), pad: b.titlePad ?? 22, labelFont: b.titleFont, labelSize: b.titleSize, labelCase: b.titleCase, labelWeight: b.titleWeight, letterSpacing: b.titleLetterSpacing });
    if (q.big) texts.push({ x: qx + qw - 18, y: qy + qh - 18, text: q.big, font: 'display', size: b.bigSize ?? 64, weight: 800, color: q.bigColor ?? 'muted', anchor: 'end', opacity: 0.18 });
    (q.items ?? []).forEach((it, j) => {
      const iy = qy + (b.itemTop ?? 78) + j * (b.itemGap ?? 30);
      texts.push({ x: qx + 22, y: iy, text: `${b.bullet ?? '·'} ${it}`, size: b.itemSize ?? 14.5, color: q.itemColor ?? 'ink', w: qw - 44 });
    });
  });
  // axes
  lines.push({ points: [[X, Y + H + 14], [X + W, Y + H + 14]], kind: 'axis', color: 'ink', width: 1.4 });
  lines.push({ points: [[X - 14, Y], [X - 14, Y + H]], kind: 'axis', color: 'ink', width: 1.4 });
  const [xl, xh, xn] = b.xAxis ?? [];
  const [yl, yh, yn] = b.yAxis ?? [];
  if (xl) texts.push({ x: X, y: Y + H + 36, text: xl, font: 'mono', size: 12, color: 'muted' });
  if (xh) texts.push({ x: X + W, y: Y + H + 36, text: xh, font: 'mono', size: 12, color: 'muted', anchor: 'end' });
  if (xn) texts.push({ x: X + W / 2, y: Y + H + 36, text: xn, font: 'mono', size: 12.5, weight: 700, color: 'ink', anchor: 'middle', case: 'upper', letterSpacing: 1.5 });
  if (yl) texts.push({ x: X - 22, y: Y + H, text: yl, font: 'mono', size: 12, color: 'muted', rotate: -90 });
  if (yh) texts.push({ x: X - 22, y: Y + 60, text: yh, font: 'mono', size: 12, color: 'muted', rotate: -90 });
  if (yn) texts.push({ x: X - 22, y: Y + H / 2 + 50, text: yn, font: 'mono', size: 12.5, weight: 700, color: 'ink', rotate: -90, case: 'upper', letterSpacing: 1.5 });
  (b.points ?? []).forEach((p, i) => {
    const r = p.r ?? 12;
    nodes.push({ id: p.id ?? `${b.id}-p${i + 1}`, shape: 'circle', tone: p.tone ?? 'accent', x: r2(X + p.x * W - r), y: r2(Y + (1 - p.y) * H - r), w: r * 2, h: r * 2, label: p.label, labelPos: p.labelPos ?? 'right', sub: p.sub, size: p.size ?? 14 });
  });
  return { zones, texts, nodes, lines };
}

// ---------------------------------------------------------------- funnel
// {type:'funnel', x,y,w, stages:[{label,value,sub,tone}], stageH:70, gap:8, minRatio:0.35, valueFormat}
function funnel(b) {
  const st = b.stages ?? [];
  const h = b.stageH ?? 72, gap = b.gap ?? 8, minR = b.minRatio ?? 0.34;
  const nodes = [], texts = [];
  const fw = b.funnelW ?? b.w * 0.62;
  st.forEach((s, i) => {
    const r0 = 1 - ((1 - minR) * i) / st.length, r1 = 1 - ((1 - minR) * (i + 1)) / st.length;
    const w0 = fw * r0, w1 = fw * r1;
    const x = b.x + (fw - w0) / 2;
    const y = b.y + i * (h + gap);
    nodes.push({ id: s.id ?? `${b.id}-f${i + 1}`, shape: 'trapezoid', inset: (w0 - w1) / 2, tone: s.tone ?? b.tones?.[i % (b.tones?.length ?? 1)] ?? 'default', x: r2(x), y: r2(y), w: r2(w0), h, label: s.label, sub: s.inside, align: 'center' });
    const tx = b.x + fw + 40;
    if (s.value != null) texts.push({ x: tx, y: y + h / 2 + 2, text: s.valueText ?? String(s.value), font: 'display', size: b.valueSize ?? 30, weight: 800, color: 'ink' });
    if (s.sub) texts.push({ x: tx, y: y + h / 2 + 24, text: s.sub, size: 13.5, color: 'muted', w: b.w - fw - 60 });
    if (i > 0 && st[i - 1].value && s.value != null && b.conversions !== false) {
      const pct = Math.round((s.value / st[i - 1].value) * 1000) / 10;
      const cjk = /[\u4e00-\u9fff]/.test(st.map((x) => x.label).join(''));
      const fmt = b.convFormat ?? (cjk ? '转化 {pct}%' : '{pct}% convert');
      texts.push({ x: b.x + fw + 40 + (b.convX ?? 190), y: y - gap / 2 + 4, text: fmt.replace('{pct}', pct), font: 'mono', size: 13, weight: 700, color: 'accent' });
    }
  });
  return { nodes, texts };
}

// ---------------------------------------------------------------- cycle
// {type:'cycle', cx, cy, r, steps:[{label,sub,tone}], nodeW, nodeH, center:{label,sub}, ringWidth}
function cycle(b) {
  const st = b.steps ?? [];
  const n = st.length;
  const nodes = [], paths = [], texts = [];
  const R = b.r ?? 220, w = b.nodeW ?? 200, h = b.nodeH ?? 90;
  const start = (b.startAngle ?? -90) * PI / 180;
  paths.push({ d: `M${b.cx - R} ${b.cy}a${R} ${R} 0 1 0 ${2 * R} 0a${R} ${R} 0 1 0 ${-2 * R} 0`, stroke: b.ringColor ?? 'muted', width: b.ringWidth ?? 2, dash: b.ringDash, fill: 'none' });
  st.forEach((s, i) => {
    const a = start + (2 * PI * i) / n;
    const x = b.cx + R * Math.cos(a), y = b.cy + R * Math.sin(a);
    nodes.push({ id: s.id ?? `${b.id}-c${i + 1}`, label: s.label, sub: s.sub, tag: s.tag, icon: s.icon, tone: s.tone ?? b.tones?.[i % (b.tones?.length ?? 1)] ?? 'default', shape: s.shape ?? b.shape ?? 'box', step: s.step ?? (b.numbered ? i + 1 : undefined), x: r2(x - w / 2), y: r2(y - h / 2), w, h, align: 'center' });
    // arrowhead halfway to the next step, tangent to the ring
    const am = a + PI / n;
    const ax = b.cx + R * Math.cos(am), ay = b.cy + R * Math.sin(am);
    const tx = -Math.sin(am), ty = Math.cos(am), s2 = b.arrowSize ?? 11;
    const nx = -ty, ny = tx;
    paths.push({ d: `M${r2(ax + tx * s2)} ${r2(ay + ty * s2)}L${r2(ax - tx * s2 * 0.4 + nx * s2 * 0.7)} ${r2(ay - ty * s2 * 0.4 + ny * s2 * 0.7)}L${r2(ax - tx * s2 * 0.4 - nx * s2 * 0.7)} ${r2(ay - ty * s2 * 0.4 - ny * s2 * 0.7)}Z`, fill: b.ringColor ?? 'muted', stroke: 'none' });
  });
  if (b.center) {
    texts.push({ x: b.cx, y: b.cy - 2, text: b.center.label, font: 'display', size: b.center.size ?? 30, weight: 800, color: b.center.color ?? 'ink', anchor: 'middle' });
    if (b.center.sub) texts.push({ x: b.cx, y: b.cy + 26, text: b.center.sub, size: 14, color: 'muted', anchor: 'middle', w: R * 1.1 });
  }
  return { nodes, paths, texts };
}

// ---------------------------------------------------------------- fishbone
// {type:'fishbone', x,y,w,h, head:{label,sub}, categories:[{label, causes:[...]}], headW}
function fishbone(b) {
  const paths = [], texts = [], nodes = [];
  const headW = b.headW ?? 220, headH = b.headH ?? 110;
  const spineY = b.y + b.h / 2, x0 = b.x, x1 = b.x + b.w - headW - 20;
  nodes.push({ id: `${b.id}-head`, label: b.head.label, sub: b.head.sub, tone: b.head.tone ?? 'accent', x: x1 + 20, y: spineY - headH / 2, w: headW, h: headH, align: 'center' });
  const ink = b.color ?? 'ink';
  paths.push({ d: `M${x0} ${spineY}H${x1 + 20}`, stroke: ink, width: b.spineWidth ?? 4, fill: 'none' });
  paths.push({ d: `M${x1 + 6} ${spineY - 10}L${x1 + 20} ${spineY}L${x1 + 6} ${spineY + 10}`, stroke: ink, width: b.spineWidth ?? 4, fill: 'none' });
  const cats = b.categories ?? [];
  const perSide = Math.ceil(cats.length / 2);
  const step = (x1 - x0 - 40) / perSide;
  const boneLen = b.h / 2 - 40;
  const slope = b.slope ?? 0.55; // dx per dy
  cats.forEach((c, i) => {
    const top = i % 2 === 0;
    const k = Math.floor(i / 2);
    const bx = x0 + 60 + step * (k + 0.75); // where bone meets spine
    const ex = bx - boneLen * slope, ey = top ? spineY - boneLen : spineY + boneLen;
    paths.push({ d: `M${r2(ex)} ${r2(ey)}L${r2(bx)} ${spineY}`, stroke: ink, width: b.boneWidth ?? 2, fill: 'none' });
    nodes.push({ id: `${b.id}-cat${i + 1}`, label: c.label, tone: c.tone ?? b.catTone ?? 'default', shape: b.catShape ?? 'box', x: r2(ex - 70), y: r2(top ? ey - 46 : ey + 6), w: 140, h: 40, align: 'center' });
    (c.causes ?? []).forEach((cause, j) => {
      const t = (j + 1) / ((c.causes.length) + 1);
      const px = ex + (bx - ex) * t, py = ey + (spineY - ey) * t;
      const len = b.causeLen ?? 150;
      const cz = typeof cause === 'string' ? { text: cause } : cause;
      paths.push({ d: `M${r2(px - len)} ${r2(py)}H${r2(px)}`, stroke: cz.key ? ink : (b.causeColor ?? 'muted'), width: cz.key ? 2 : 1.2, fill: 'none' });
      const cw = cz.count != null ? 50 : 0;
      texts.push({ x: px - len, y: py - 7, text: cz.text, size: b.causeSize ?? 13, color: 'ink', weight: cz.key ? 700 : 400, w: len - 6 - cw });
      if (cz.count != null) texts.push({ x: px - 26, y: py - 7, text: String(cz.count), size: (b.causeSize ?? 13) - 1, color: cz.key ? 'ink' : 'muted', weight: cz.key ? 700 : 400, font: 'mono', anchor: 'end' });
      if (cz.key) paths.push({ d: `M${r2(px - len - 9)} ${r2(py)}m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0`, fill: ink, stroke: 'none' });
    });
  });
  return { paths, texts, nodes };
}

// ---------------------------------------------------------------- swimlane
// {type:'swimlane', x,y,w, lanes:[{id,label}], laneH, labelW, cols, steps:[{id,lane,col,label,sub,shape,tone,w,h}], flows:[{from,to,label,kind,...}]}
function swimlane(b) {
  const lanes = b.lanes ?? [];
  const laneH = b.laneH ?? 130, labelW = b.labelW ?? 120;
  const cols = b.cols ?? 6;
  const colW = (b.w - labelW) / cols;
  const zones = [], nodes = [], texts = [];
  const laneY = new Map();
  lanes.forEach((l, i) => {
    const y = b.y + i * laneH;
    laneY.set(l.id, y);
    zones.push({ id: `${b.id}-lane-${l.id}`, label: '', tone: l.tone ?? (i % 2 ? 'laneAlt' : 'lane'), style: 'fill', x: b.x, y, w: b.w, h: laneH, radius: 0 });
    nodes.push({ id: `${b.id}-lh-${l.id}`, label: l.label, sub: l.sub, tone: l.headTone ?? 'laneHead', x: b.x, y, w: labelW, h: laneH, radius: 0, align: 'center' });
  });
  for (const s of b.steps ?? []) {
    const w = s.w ?? b.stepW ?? Math.min(colW - 28, 190), h = s.h ?? b.stepH ?? 66;
    const cx = b.x + labelW + colW * (s.col + 0.5);
    const cy = laneY.get(s.lane) + laneH / 2 + (s.dy ?? 0);
    if (cy == null || Number.isNaN(cy)) throw new Error(`swimlane step ${s.id}: unknown lane ${s.lane}`);
    nodes.push({ ...s, x: r2(cx - w / 2), y: r2(cy - h / 2), w, h, lane: undefined, col: undefined });
  }
  return { zones, nodes, texts, edges: b.flows ?? [] };
}

// ---------------------------------------------------------------- table
// {type:'table', x,y, columns:[{label,w,align}], rows:[{cells:[str|{text,tone,bold}], tone}], rowH, headH, headTone, cellTones}
function table(b) {
  const cols = b.columns ?? [];
  const rowH = b.rowH ?? 44, headH = b.headH ?? 44;
  const nodes = [], texts = [], lines = [];
  let x = b.x;
  const W = cols.reduce((a, c) => a + c.w, 0);
  cols.forEach((c) => {
    texts.push({ x: c.align === 'center' ? x + c.w / 2 : x + 12, y: b.y + headH / 2 + 5, text: c.label, font: b.headFont ?? 'mono', size: b.headSize ?? 12, weight: 700, color: b.headColor ?? 'ink', anchor: c.align === 'center' ? 'middle' : 'start', case: b.headCase ?? 'upper', letterSpacing: 1 });
    x += c.w;
  });
  lines.push({ points: [[b.x, b.y + headH], [b.x + W, b.y + headH]], kind: 'rule', color: 'ink', width: 1.6 });
  (b.rows ?? []).forEach((row, ri) => {
    const y = b.y + headH + ri * rowH;
    if (row.tone) nodes.push({ id: `${b.id}-row${ri + 1}`, shape: 'box', tone: row.tone, x: b.x, y, w: W, h: rowH, radius: 0, label: '' });
    let cx = b.x;
    row.cells.forEach((cell, ci) => {
      const c = cols[ci];
      const v = typeof cell === 'object' && cell !== null ? cell : { text: cell };
      if (v.tone) {
        const cw = v.chipW ?? Math.min(c.w - 16, 40), ch = rowH - 14;
        nodes.push({ id: `${b.id}-c${ri + 1}-${ci + 1}`, shape: v.shape ?? 'box', tone: v.tone, x: r2(c.align === 'center' ? cx + c.w / 2 - cw / 2 : cx + 8), y: y + 7, w: cw, h: ch, label: v.text ?? '', align: 'center', size: v.size ?? 13, radius: v.radius });
      } else if (v.text != null && v.text !== '') {
        texts.push({ x: c.align === 'center' ? cx + c.w / 2 : cx + 12, y: y + rowH / 2 + 5, text: String(v.text), size: v.size ?? b.cellSize ?? 14, weight: v.bold || ci === 0 ? (b.firstBold === false ? 400 : 650) : 400, color: v.color ?? 'ink', anchor: c.align === 'center' ? 'middle' : 'start', font: v.font });
      }
      cx += c.w;
    });
    lines.push({ points: [[b.x, y + rowH], [b.x + W, y + rowH]], kind: 'grid', color: b.gridColor ?? '#00000022', width: 1 });
  });
  return { nodes, texts, lines };
}

export const BLOCKS = { tree, mindmap, timeline, gantt, matrix, funnel, cycle, fishbone, swimlane, table };
