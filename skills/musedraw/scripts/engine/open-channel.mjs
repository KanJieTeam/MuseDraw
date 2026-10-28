// Explicit qualitative section geometry, not inferred apparatus or fluid physics.
// Local origin is the chamber's upper-left inner boundary. Callers style the
// returned native paths/rectangles and transform the whole group for other views.
export function openChannel({ id, width, height, portLength, inlet, outlet,
  partitions = [], strokeWidth = 2 }) {
  const safeId = value => typeof value === 'string' && /^[A-Za-z][\w-]*$/.test(value);
  const positive = value => Number.isFinite(value) && value > 0 && value <= 8000;
  if (!safeId(id)) throw new Error('A simple explicit channel id is required');
  if (![width, height, portLength, strokeWidth].every(positive)) throw new Error('Positive bounded drawing dimensions are required');
  for (const [name, port] of [['inlet', inlet], ['outlet', outlet]]) {
    if (!Array.isArray(port) || port.length !== 2 || !port.every(Number.isFinite) ||
      port[0] < 0 || port[1] > height || port[1] - port[0] <= strokeWidth * 2) {
      throw new Error(`${name}: explicit top/bottom opening with stroke clearance required`);
    }
  }
  if (!Array.isArray(partitions) || partitions.length > 50) throw new Error('Use an explicit bounded partitions array');
  const ids = new Set();
  const ordered = partitions.map(p => {
    if (!safeId(p.id) || ids.has(p.id)) throw new Error('Unique simple partition ids are required');
    ids.add(p.id);
    if (!Number.isFinite(p.x) || !positive(p.width) || p.x <= 0 || p.x + p.width >= width) {
      throw new Error(`${p.id}: partition must lie inside the chamber`);
    }
    if (p.spansChannel !== true) throw new Error(`${p.id}: spanning the wet channel must be explicitly supplied`);
    return { id: `${id}-${p.id}`, sourceId: p.id, x: p.x, y: 0,
      width: p.width, height, center: [p.x + p.width / 2, height / 2] };
  }).sort((a, b) => a.x - b.x);
  if (ordered.some((p, i) => i && ordered[i - 1].x + ordered[i - 1].width > p.x)) {
    throw new Error('Partitions overlap; this constructor only represents serial sections');
  }
  const top = [[-portLength, inlet[0]], [0, inlet[0]], [0, 0], [width, 0], [width, outlet[0]], [width + portLength, outlet[0]]];
  const bottom = [[-portLength, inlet[1]], [0, inlet[1]], [0, height], [width, height], [width, outlet[1]], [width + portLength, outlet[1]]];
  const path = points => points.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ');
  return {
    id, wallPaths: [{ id: `${id}-wall-top`, d: path(top), fill: 'none' }, { id: `${id}-wall-bottom`, d: path(bottom), fill: 'none' }],
    strokeWidth, partitions: ordered,
    ports: { inlet: [-portLength, (inlet[0] + inlet[1]) / 2], outlet: [width + portLength, (outlet[0] + outlet[1]) / 2] },
    bounds: { x: -portLength, y: 0, width: width + 2 * portLength, height },
  };
}
