// Orthogonal routes for an already laid-out scene, not automatic graph layout.
// Separate ports and reserved lanes keep independent relations distinguishable.

export function intersectsBox(p, q, box) {
  const [x, y, w, h] = box;
  if (p[0] === q[0]) return p[0] > x && p[0] < x + w &&
    Math.max(p[1], q[1]) > y && Math.min(p[1], q[1]) < y + h;
  if (p[1] === q[1]) return p[1] > y && p[1] < y + h &&
    Math.max(p[0], q[0]) > x && Math.min(p[0], q[0]) < x + w;
  throw Error('Expected an orthogonal segment');
}

export function pathObstacles(points, clearance = 3) {
  return points.slice(1).map((q, i) => {
    const p = points[i];
    return [Math.min(p[0], q[0]) - clearance, Math.min(p[1], q[1]) - clearance,
      Math.abs(q[0] - p[0]) + clearance * 2, Math.abs(q[1] - p[1]) + clearance * 2];
  });
}

function facingSides(a, b) {
  const dx = b[0] + b[2] / 2 - a[0] - a[2] / 2;
  const dy = b[1] + b[3] / 2 - a[1] - a[3] / 2;
  const separatedX = a[0] + a[2] <= b[0] || b[0] + b[2] <= a[0];
  const separatedY = a[1] + a[3] <= b[1] || b[1] + b[3] <= a[1];
  if (separatedX && (!separatedY || Math.abs(dx) > Math.abs(dy)))
    return dx > 0 ? ['right', 'left'] : ['left', 'right'];
  return dy >= 0 ? ['bottom', 'top'] : ['top', 'bottom'];
}

const normals = {left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1]};

export function relationshipPorts(nodes, edges) {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const slots = new Map();
  const assignments = edges.map(edge => {
    const a = byId.get(edge.from), b = byId.get(edge.to);
    if (!a || !b || a === b) throw Error('A route requires two different existing nodes');
    return facingSides(a.box, b.box).map((side, i) => {
      const node = i ? b : a, key = `${node.id}:${side}`;
      const list = slots.get(key) ?? [];
      const entry = {node, side, index: list.length};
      list.push(entry); slots.set(key, list);
      return entry;
    });
  });
  return assignments.map(pair => pair.map(({node, side, index}) => {
    const [x, y, w, h] = node.box, count = slots.get(`${node.id}:${side}`).length;
    const horizontal = side === 'top' || side === 'bottom', length = horizontal ? w : h;
    // Fan-out is spread locally, not across the full face of a large box.
    const spread = Math.min(length - 24, (count - 1) * 18);
    if (spread < 0 || (count > 1 && spread / (count - 1) < 8))
      throw Error('Too many relationships for this node face; use a detailed view');
    const offset = count === 1 ? length / 2 : length / 2 - spread / 2 + index * spread / (count - 1);
    const point = horizontal ? [x + offset, side === 'top' ? y : y + h]
      : [side === 'left' ? x : x + w, y + offset];
    return {point, normal: normals[side]};
  }));
}

class MinHeap {
  values = [];
  push(value) {
    let i = this.values.length; this.values.push(value);
    while (i) {
      const parent = (i - 1) >> 1;
      if (this.values[parent].cost <= value.cost) break;
      this.values[i] = this.values[parent]; i = parent;
    }
    this.values[i] = value;
  }
  pop() {
    const first = this.values[0], last = this.values.pop();
    if (this.values.length) {
      let i = 0;
      while (i * 2 + 1 < this.values.length) {
        let child = i * 2 + 1;
        if (child + 1 < this.values.length && this.values[child + 1].cost < this.values[child].cost) child++;
        if (this.values[child].cost >= last.cost) break;
        this.values[i] = this.values[child]; i = child;
      }
      this.values[i] = last;
    }
    return first;
  }
}

function simplify(points) {
  const result = [];
  for (const p of points) {
    if (result.length && p[0] === result.at(-1)[0] && p[1] === result.at(-1)[1]) continue;
    if (result.length > 1) {
      const a = result.at(-2), b = result.at(-1);
      if ((a[0] === b[0] && b[0] === p[0]) || (a[1] === b[1] && b[1] === p[1])) result.pop();
    }
    result.push(p);
  }
  return result;
}

export function orthogonalRoute(startPort, endPort, obstacles, width, height) {
  const start = startPort.point, end = endPort.point;
  const stub = port => port.point.map((v, i) => v + port.normal[i] * 8);
  const from = stub(startPort), to = stub(endPort);
  const bounded = p => p[0] >= 4 && p[0] <= width - 4 && p[1] >= 4 && p[1] <= height - 4;
  const clear = (p, q) => bounded(p) && bounded(q) && obstacles.every(o => !intersectsBox(p, q, o));
  if (!clear(start, from) || !clear(to, end)) throw Error('A relationship port has no clear exit');
  const unique = (values, max) => [...new Set(values.filter(v => v >= 4 && v <= max - 4))].sort((a, b) => a - b);
  const xs = unique([8, width - 8, from[0], to[0], ...obstacles.flatMap(o => [o[0] - 8, o[0] + o[2] + 8])], width);
  const ys = unique([8, height - 8, from[1], to[1], ...obstacles.flatMap(o => [o[1] - 8, o[1] + o[3] + 8])], height);
  if (xs.length * ys.length > 160000) throw Error('Routing grid is too dense; split the detailed view');
  const key = (i, j, axis) => `${i},${j},${axis}`;
  const startAxis = startPort.normal[0] ? 0 : 1;
  const first = {i: xs.indexOf(from[0]), j: ys.indexOf(from[1]), axis: startAxis, cost: 0};
  first.key = key(first.i, first.j, first.axis);
  const queue = new MinHeap(), best = new Map([[first.key, 0]]), previous = new Map([[first.key, null]]);
  queue.push(first);
  let visited = 0;
  while (queue.values.length && visited++ < 320000) {
    const current = queue.pop();
    if (current.cost !== best.get(current.key)) continue;
    const {i, j, axis} = current, p = [xs[i], ys[j]];
    if (p[0] === to[0] && p[1] === to[1]) {
      const points = []; let cursor = current.key;
      while (cursor) {
        const [u, v] = cursor.split(',').map(Number);
        points.push([xs[u], ys[v]]); cursor = previous.get(cursor);
      }
      return simplify([start, ...points.reverse(), end]);
    }
    for (const [u, v, nextAxis] of [[i + 1, j, 0], [i - 1, j, 0], [i, j + 1, 1], [i, j - 1, 1]]) {
      if (u < 0 || v < 0 || u >= xs.length || v >= ys.length) continue;
      const q = [xs[u], ys[v]];
      if (!clear(p, q)) continue;
      const nextKey = key(u, v, nextAxis);
      const cost = current.cost + Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]) + (axis === nextAxis ? 0 : 24);
      if (cost >= (best.get(nextKey) ?? Infinity)) continue;
      best.set(nextKey, cost); previous.set(nextKey, current.key);
      queue.push({i: u, j: v, axis: nextAxis, cost, key: nextKey});
    }
  }
  throw Error('No distinct unobstructed route; adjust the composition or split the relationship view');
}
