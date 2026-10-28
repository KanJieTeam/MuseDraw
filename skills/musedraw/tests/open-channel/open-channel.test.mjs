import test from 'node:test';
import assert from 'node:assert/strict';
import { openChannel } from '../../scripts/engine/open-channel.mjs';

const source = () => ({ id: 'filter', width: 500, height: 150, portLength: 35,
  inlet: [60, 90], outlet: [60, 90], partitions: [
    { id: 'screen', x: 120, width: 25, spansChannel: true },
    { id: 'sorbent', x: 340, width: 50, spansChannel: true },
  ] });
const points = d => [...d.matchAll(/[ML] (-?[\d.e+]+) (-?[\d.e+]+)/g)].map(m => [+m[1], +m[2]]);
const wallIntersects = (walls, [x, y]) => walls.some(wall => {
  const p = points(wall.d);
  return p.slice(1).some((b, i) => {
    const a = p[i];
    const cross = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
    return Math.abs(cross) < 1e-7 && x >= Math.min(a[0], b[0]) && x <= Math.max(a[0], b[0]) && y >= Math.min(a[1], b[1]) && y <= Math.max(a[1], b[1]);
  });
});

test('actual emitted wall paths leave both ports open, with no closing cap', () => {
  const c = openChannel(source());
  assert.ok(c.wallPaths.every(w => !/Z/i.test(w.d) && w.fill === 'none'));
  for (const x of [-35, 0, 500, 535]) assert.equal(wallIntersects(c.wallPaths, [x, 75]), false);
  for (const p of [[0, 30], [250, 0], [500, 130], [250, 150]]) assert.equal(wallIntersects(c.wallPaths, p), true);
  assert.deepEqual(c.ports, { inlet: [-35, 75], outlet: [535, 75] });
});

test('spanning partitions have no implied top/bottom bypass; removal preserves other geometry', () => {
  const model = source(), before = openChannel(model);
  const changing = openChannel({ ...model, partitions: model.partitions.filter(p => p.id !== 'sorbent') });
  assert.deepEqual(changing.wallPaths, before.wallPaths);
  assert.deepEqual(changing.partitions, [before.partitions[0]]);
  for (const p of before.partitions) { assert.equal(p.y, 0); assert.equal(p.y + p.height, model.height); }
  assert.deepEqual(openChannel(model), before);
});

test('reject unsupported topology rather than inventing a seal or layer arrangement', () => {
  assert.throws(() => openChannel({ ...source(), inlet: [72, 74] }), /clearance/);
  assert.throws(() => openChannel({ ...source(), outlet: [-1, 30] }), /opening/);
  assert.throws(() => openChannel({ ...source(), partitions: [{ id: 'a', x: 120, width: 25 }] }), /explicitly/);
  assert.throws(() => openChannel({ ...source(), partitions: [{ id: 'a', x: 120, width: 25, spansChannel: true }, { id: 'b', x: 130, width: 20, spansChannel: true }] }), /overlap/);
});

test('1000 varied geometry fixtures preserve open ports and full-span partitions', () => {
  // Geometry regressions, never counted as independent creative comparisons.
  for (let i = 0; i < 1000; i++) {
    const width = 240 + i * .37, height = 80 + i % 113, strokeWidth = 1 + i % 3;
    const model = { id: `channel-${i}`, width, height, portLength: 18 + i % 40, strokeWidth,
      inlet: [height * .3, height * .6], outlet: [height * .4, height * .7],
      partitions: [{ id: 'first', x: width * .25, width: width * .05, spansChannel: true }, { id: 'second', x: width * .65, width: width * .1, spansChannel: true }] };
    const c = openChannel(model);
    for (const [x, port] of [[0, model.inlet], [width, model.outlet]]) {
      assert.equal(wallIntersects(c.wallPaths, [x, (port[0] + port[1]) / 2]), false);
    }
    assert.equal(c.partitions.length, 2);
    for (const p of c.partitions) { assert.equal(p.y, 0); assert.equal(p.height, height); }
  }
});
