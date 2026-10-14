import assert from 'node:assert/strict';
import {relationshipPorts, orthogonalRoute, pathObstacles, intersectsBox} from '../skills/musedraw/scripts/route_edges.mjs';

let assertions = 0;
function check(name, fn) { fn(); assertions++; }
function routeAll(nodes, edges, extra = []) {
  const ports = relationshipPorts(nodes, edges), paths = [], reserved = [];
  for (const [i, edge] of edges.entries()) {
    const points = orthogonalRoute(...ports[i], [...nodes.map(n => n.box), ...extra, ...reserved], 800, 600);
    for (const [j, q] of points.slice(1).entries()) {
      const p = points[j];
      assert.ok(p[0] === q[0] || p[1] === q[1], 'orthogonal');
      assert.ok(!nodes.some(n => intersectsBox(p, q, n.box)), 'no node interior');
      assert.ok(!extra.some(o => intersectsBox(p, q, o)), 'no label / obstacle');
      assert.ok(!reserved.some(o => intersectsBox(p, q, o)), 'no accidental shared lane / junction');
    }
    assert.deepEqual(points[0], ports[i][0].point);
    assert.deepEqual(points.at(-1), ports[i][1].point);
    paths.push({...edge, points}); reserved.push(...pathObstacles(points));
  }
  return paths;
}

const pair = [{id: 'a', box: [40, 180, 120, 80]}, {id: 'b', box: [400, 180, 120, 80]}];
check('horizontal neighbours use facing sides and shortest straight path', () => {
  const path = routeAll(pair, [{from: 'a', to: 'b'}])[0].points;
  assert.deepEqual(path, [[160, 220], [400, 220]]);
});
check('forward and response relations stay separate', () => {
  const paths = routeAll(pair, [{from: 'a', to: 'b'}, {from: 'b', to: 'a'}]);
  assert.notEqual(paths[0].points[0][1], paths[1].points.at(-1)[1]);
  assert.notEqual(paths[0].points.at(-1)[1], paths[1].points[0][1]);
});
const fan = [{id: 'a', box: [40, 60, 120, 60]}, {id: 'b', box: [40, 230, 120, 60]},
  {id: 'c', box: [40, 400, 120, 60]}, {id: 'sink', box: [400, 210, 120, 100]}];
const fanEdges = ['a', 'b', 'c'].map(from => ({from, to: 'sink'}));
check('fan-in keeps endpoints and complete independent routes', () => {
  const paths = routeAll(fan, fanEdges);
  assert.equal(new Set(paths.map(p => p.points.at(-1).join(','))).size, 3);
});
check('fixed inputs produce fixed ports and routes', () => {
  assert.deepEqual(routeAll(fan, fanEdges), routeAll(fan, fanEdges));
});
check('route goes around an unrelated central component', () => {
  const block = [240, 160, 80, 120];
  assert.ok(routeAll(pair, [{from: 'a', to: 'b'}], [block])[0].points.length > 2);
});
check('missing / self endpoint fails without guessed nodes', () => {
  assert.throws(() => relationshipPorts(pair, [{from: 'missing', to: 'b'}]));
  assert.throws(() => relationshipPorts(pair, [{from: 'a', to: 'a'}]));
});
check('overcrowded port face fails instead of merged lines', () => {
  const narrow = [{id: 'a', box: [40, 180, 80, 30]}, {id: 'b', box: [400, 180, 80, 30]}];
  assert.throws(() => relationshipPorts(narrow, Array.from({length: 12}, () => ({from: 'a', to: 'b'}))));
});
check('sealed exit fails instead of line across a component', () => {
  const ports = relationshipPorts(pair, [{from: 'a', to: 'b'}]);
  assert.throws(() => orthogonalRoute(...ports[0], [[160, 170, 20, 100]], 800, 600));
});
console.log(JSON.stringify({assertions, passed: true}));
