// Connector geometry: ports, orthogonal / curved / straight routes, rounded corners.
// Routes are deterministic. Art direction (via points, sides, mid lines) comes
// from the scene; the engine only fills in the obvious elbows.

const SIDES = { l: [-1, 0], r: [1, 0], t: [0, -1], b: [0, 1] };

export function center(n) { return [n.x + n.w / 2, n.y + n.h / 2]; }

/** Pick the facing sides of two boxes when the scene does not specify them. */
export function autoSides(a, b) {
  const gapX = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
  const gapY = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
  if (gapX >= 40 || gapX >= gapY) return b.x >= a.x + a.w / 2 ? ['r', 'l'] : ['l', 'r'];
  return b.y >= a.y + a.h / 2 ? ['b', 't'] : ['t', 'b'];
}

/** Point on a node side; `at` is 0..1 along the side (left→right or top→bottom). */
export function port(n, side, at = 0.5, gap = 0) {
  const [dx, dy] = SIDES[side];
  if (n.shape === 'person' || n.shape === 'station' || n.shape === 'circle') at = 0.5;
  let x, y;
  if (side === 'l' || side === 'r') { x = side === 'l' ? n.x : n.x + n.w; y = n.y + n.h * at; }
  else { y = side === 't' ? n.y : n.y + n.h; x = n.x + n.w * at; }
  // Ellipse-like shapes: pull ports onto the curve.
  if (n.shape === 'circle' || n.shape === 'station') {
    const [cx, cy] = center(n);
    const r = Math.min(n.w, n.h) / 2;
    x = cx + dx * r; y = cy + dy * r;
  }
  return [x + dx * gap, y + dy * gap];
}

const axisOf = (side) => (side === 'l' || side === 'r' ? 'h' : 'v');

/** Orthogonal polyline from start to end through optional via points. */
export function orthoPoints(S, sSide, E, eSide, via = [], mid) {
  const pts = [S];
  const sAxis = axisOf(sSide), eAxis = axisOf(eSide);
  if (!via.length) {
    if (sAxis === 'h' && eAxis === 'h') {
      if (Math.abs(S[1] - E[1]) < 0.5) return [S, E];
      const mx = mid ?? (S[0] + E[0]) / 2;
      pts.push([mx, S[1]], [mx, E[1]]);
    } else if (sAxis === 'v' && eAxis === 'v') {
      if (Math.abs(S[0] - E[0]) < 0.5) return [S, E];
      const my = mid ?? (S[1] + E[1]) / 2;
      pts.push([S[0], my], [E[0], my]);
    } else if (sAxis === 'h') pts.push([E[0], S[1]]);
    else pts.push([S[0], E[1]]);
    pts.push(E);
    return clean(pts);
  }
  let axis = sAxis;
  let cur = S;
  for (const v of via) {
    if (Math.abs(cur[0] - v[0]) > 0.5 && Math.abs(cur[1] - v[1]) > 0.5) {
      const corner = axis === 'h' ? [v[0], cur[1]] : [cur[0], v[1]];
      pts.push(corner);
      axis = axis === 'h' ? 'v' : 'h';
    } else axis = Math.abs(cur[0] - v[0]) > 0.5 ? 'h' : 'v';
    pts.push(v);
    cur = v;
  }
  if (Math.abs(cur[0] - E[0]) > 0.5 && Math.abs(cur[1] - E[1]) > 0.5) {
    pts.push(eAxis === 'h' ? [cur[0], E[1]] : [E[0], cur[1]]);
  }
  pts.push(E);
  return clean(pts);
}

function clean(pts) {
  const out = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (last && Math.abs(last[0] - p[0]) < 0.5 && Math.abs(last[1] - p[1]) < 0.5) continue;
    out.push(p);
  }
  // Drop collinear middle points.
  for (let i = out.length - 2; i > 0; i--) {
    const [a, b, c] = [out[i - 1], out[i], out[i + 1]];
    if ((Math.abs(a[0] - b[0]) < 0.5 && Math.abs(b[0] - c[0]) < 0.5) || (Math.abs(a[1] - b[1]) < 0.5 && Math.abs(b[1] - c[1]) < 0.5)) out.splice(i, 1);
  }
  return out;
}

/** Path string for a polyline with rounded corners. */
export function roundedPath(pts, radius = 8) {
  if (pts.length < 2) return '';
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [p0, p1, p2] = [pts[i - 1], pts[i], pts[i + 1]];
    const l1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const l2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const r = Math.min(radius, l1 / 2, l2 / 2);
    if (r < 0.5) { d += ` L${f(p1[0])} ${f(p1[1])}`; continue; }
    const a = [p1[0] + ((p0[0] - p1[0]) * r) / l1, p1[1] + ((p0[1] - p1[1]) * r) / l1];
    const b = [p1[0] + ((p2[0] - p1[0]) * r) / l2, p1[1] + ((p2[1] - p1[1]) * r) / l2];
    d += ` L${f(a[0])} ${f(a[1])} Q${f(p1[0])} ${f(p1[1])} ${f(b[0])} ${f(b[1])}`;
  }
  const z = pts[pts.length - 1];
  return d + ` L${f(z[0])} ${f(z[1])}`;
}

/** Cubic curve between two ports following the side normals. */
export function curvePath(S, sSide, E, eSide, bend = 0.45) {
  const dist = Math.hypot(E[0] - S[0], E[1] - S[1]);
  const k = Math.max(36, dist * bend);
  const [sx, sy] = SIDES[sSide], [ex, ey] = SIDES[eSide];
  const c1 = [S[0] + sx * k, S[1] + sy * k];
  const c2 = [E[0] + ex * k, E[1] + ey * k];
  return { d: `M${f(S[0])} ${f(S[1])} C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(E[0])} ${f(E[1])}`, c1, c2 };
}

export function bezierPoint(S, c1, c2, E, t) {
  const m = 1 - t;
  return [0, 1].map((i) => m * m * m * S[i] + 3 * m * m * t * c1[i] + 3 * m * t * t * c2[i] + t * t * t * E[i]);
}

/** Point and direction at fraction t of a polyline's length. */
export function along(pts, t) {
  const segs = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(l); total += l; }
  let target = total * t;
  for (let i = 0; i < segs.length; i++) {
    if (target <= segs[i] || i === segs.length - 1) {
      const k = segs[i] ? Math.min(1, target / segs[i]) : 0;
      const a = pts[i], b = pts[i + 1];
      return { p: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k], dir: [Math.sign(b[0] - a[0]), Math.sign(b[1] - a[1])], horizontal: Math.abs(b[1] - a[1]) < 0.5 };
    }
    target -= segs[i];
  }
  return { p: pts[0], dir: [1, 0], horizontal: true };
}

/** Midpoint of the longest segment — the calmest spot for a label. */
export function longestSegmentMid(pts) {
  let best = 0, at = null;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (l > best) { best = l; at = { p: [(pts[i][0] + pts[i - 1][0]) / 2, (pts[i][1] + pts[i - 1][1]) / 2], horizontal: Math.abs(pts[i][1] - pts[i - 1][1]) < 0.5, len: l }; }
  }
  return at;
}

export function shorten(pts, by) {
  const out = pts.map((p) => [...p]);
  const n = out.length;
  const a = out[n - 2], b = out[n - 1];
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (l > by) { b[0] -= ((b[0] - a[0]) / l) * by; b[1] -= ((b[1] - a[1]) / l) * by; }
  return out;
}

export const f = (n) => Math.round(n * 100) / 100;
