// Sequence layout: participants across the top, time flows down.
// Produces ordinary scene primitives (nodes, edges, zones, lines) so every
// theme renders sequence diagrams without special styling code.

export function layoutSequence(scene, theme) {
  const P = scene.participants ?? [];
  const M = scene.messages ?? [];
  if (!P.length) throw new Error('A sequence scene needs participants');
  const W = scene.size?.[0] ?? 1600;
  const margin = theme.canvas?.margin ?? 56;
  const left = scene.left ?? margin + 40;
  const right = scene.right ?? W - margin - (scene.noteColumn ?? 0);
  const top = scene.top ?? 200;
  const headH = scene.headHeight ?? 64;
  const headW = scene.headWidth ?? 170;
  const rowGap = scene.rowGap ?? 58;
  const colW = (right - left) / P.length;
  const xOf = new Map(P.map((p, i) => [p.id, left + colW * i + colW / 2]));
  const nodes = [], edges = [], lines = [], zones = [...(scene.zones ?? [])];
  P.forEach((p) => {
    const cx = xOf.get(p.id);
    nodes.push({ id: p.id, label: p.label, sub: p.sub, tag: p.tag, icon: p.icon, tone: p.tone ?? 'default', shape: p.shape ?? 'box', x: cx - headW / 2, y: top, w: headW, h: headH });
  });
  let y = top + headH + (scene.firstGap ?? 52);
  const rowY = [];
  M.forEach((m, i) => {
    if (m.gapBefore) y += m.gapBefore;
    rowY.push(y);
    const x1 = xOf.get(m.from), x2 = xOf.get(m.to);
    if (x1 == null || x2 == null) throw new Error(`Message ${i + 1} references an unknown participant`);
    const a = { id: `m${i + 1}-a`, shape: 'text', x: x1, y, w: 0, h: 0 };
    if (m.from === m.to) {
      const b = { id: `m${i + 1}-b`, shape: 'text', x: x1, y: y + 30, w: 0, h: 0 };
      nodes.push(a, b);
      edges.push({ id: `msg-${i + 1}`, from: a.id, to: b.id, fromSide: 'r', toSide: 'r', via: [[x1 + 56, y], [x1 + 56, y + 30]], label: m.label, kind: m.kind, step: m.step, labelAt: [x1 + 70 + (m.labelWidth ?? 90), y + 15], labelPlacement: 'on', labelBg: true });
      y += 30;
    } else {
      const dir = x2 > x1 ? 1 : -1;
      const b = { id: `m${i + 1}-b`, shape: 'text', x: x2, y, w: 0, h: 0 };
      nodes.push(a, b);
      edges.push({ id: `msg-${i + 1}`, from: a.id, to: b.id, fromSide: dir > 0 ? 'r' : 'l', toSide: dir > 0 ? 'l' : 'r', fromGap: 0, toGap: 1, label: m.label, kind: m.kind, step: m.step, labelPlacement: 'above', labelAt: m.labelAt, labelBg: true });
    }
    y += m.gapAfter ?? rowGap;
  });
  const bottom = y - rowGap + 40;
  P.forEach((p) => {
    const cx = xOf.get(p.id);
    lines.push({ points: [[cx, top + headH], [cx, bottom]], kind: 'lifeline' });
  });
  for (const sec of scene.sections ?? []) {
    const y1 = rowY[sec.from - 1] - (sec.padTop ?? 34), y2 = rowY[sec.to - 1] + (sec.padBottom ?? 22);
    zones.push({ id: sec.id ?? `section-${sec.from}`, label: sec.label, tone: sec.tone ?? 'default', style: sec.style ?? 'dashed', x: sec.x ?? left - 24, y: y1, w: sec.w ?? right - left + 48, h: y2 - y1 });
  }
  const H = Math.max(scene.size?.[1] ?? 0, bottom + 110);
  const notes = (scene.notes ?? []).map((n) => (n.row ? { ...n, y: rowY[n.row - 1] + (n.dy ?? -10) } : n));
  return { ...scene, type: 'graph', size: [W, H], nodes: [...nodes, ...(scene.nodes ?? [])], edges: [...edges, ...(scene.edges ?? [])], lines: [...lines, ...(scene.lines ?? [])], zones, notes, _rows: rowY };
}
