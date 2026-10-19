import assert from 'node:assert/strict';
import { test } from 'node:test';
import { composeFlow } from '../skills/musedraw/scripts/engine/compose-flow.mjs';
import { prepareScene } from '../skills/musedraw/scripts/engine/validate.mjs';
import { render } from '../skills/musedraw/scripts/engine/render.mjs';
import { loadTheme } from '../skills/musedraw/scripts/musedraw.mjs';
import { port } from '../skills/musedraw/scripts/engine/route.mjs';

const plain = text => text.replace(/\s/gu, '');
const node = (id, label = id, extra = {}) => ({ id, label, ...extra });
const link = (from, to, extra = {}) => ({ from, to, ...extra });
const theme = await loadTheme('journal');
const repair = () => ({ method: 'flow', lanes: [{ id: 'staff', label: '店员' }, { id: 'manager', label: '店长' }, { id: 'repair', label: '维修员' }],
  nodes: [node('report', '提交故障', { lane: 'staff' }), node('impact', '是否影响营业', { lane: 'manager', shape: 'diamond' }), node('priority', '优先处理', { lane: 'repair', emphasis: true }), node('remote', '远程排查', { lane: 'repair' }), node('record', '记录处理结果', { lane: 'repair' }), node('onsite', '上门维修', { lane: 'repair' }), node('accept', '验收设备', { lane: 'staff' }), node('close', '关闭工单', { lane: 'manager' })],
  links: [link('report', 'impact'), link('impact', 'priority', { label: '影响营业' }), link('impact', 'remote', { label: '不影响营业' }), link('priority', 'remote'), link('remote', 'record', { label: '远程可解决' }), link('remote', 'onsite', { label: '无法远程解决' }), link('record', 'accept'), link('onsite', 'accept'), link('accept', 'remote', { label: '未解决', feedback: true }), link('accept', 'close', { label: '已解决' })] });

test('repair flow preserves responsibilities, branches, return destination and every fact', () => {
  const brief = repair(), saved = structuredClone(brief), scene = composeFlow(brief);
  assert.deepEqual(brief, saved, 'compiler does not mutate its brief');
  assert.equal(scene.nodes.length, brief.nodes.length);
  assert.equal(scene.edges.length, brief.links.length);
  assert.equal(scene.header, false); assert.equal(scene.footer, false);
  assert.ok(!scene.notes?.length, 'required branches are never outsourced to notes');
  const shapes = new Map(scene.nodes.map(n => [n.id, n]));
  for (const n of brief.nodes) assert.equal(plain(shapes.get(n.id).label), plain(n.label));
  for (const edge of brief.links) assert.ok(scene.edges.some(e => e.from === edge.from && e.to === edge.to && plain(e.label ?? '') === plain(edge.label ?? '')));
  const staff = brief.nodes.filter(n => n.lane === 'staff').map(n => shapes.get(n.id));
  const managers = brief.nodes.filter(n => n.lane === 'manager').map(n => shapes.get(n.id));
  const repairers = brief.nodes.filter(n => n.lane === 'repair').map(n => shapes.get(n.id));
  assert.ok(Math.max(...staff.map(n => n.y + n.h)) < Math.min(...managers.map(n => n.y)));
  assert.ok(Math.max(...managers.map(n => n.y + n.h)) < Math.min(...repairers.map(n => n.y)));
  const feedback = scene.edges.find(e => e.from === 'accept' && e.to === 'remote');
  assert.equal(feedback.kind, 'feedback');
  assert.ok(Math.max(...feedback.via.map(p => p[1])) > Math.max(...scene.nodes.map(n => n.y + n.h)));
  assert.deepEqual(prepareScene(scene, theme).nodes.map(n => n.id), scene.nodes.map(n => n.id));
  const svg = render(scene, theme);
  assert.ok(svg.includes('data-connection='));
});

test('unfamiliar branch flow has real separate nodes and visible on-edge conditions', () => {
  const brief = { method: 'flow', nodes: [node('in', '收到请求'), node('condition', '缓存命中？', { shape: 'diamond' }), node('hit', '返回缓存'), node('miss', '查询数据库'), node('out', '返回结果')], links: [link('in', 'condition'), link('condition', 'hit', { label: '命中' }), link('condition', 'miss', { label: '未命中' }), link('hit', 'out'), link('miss', 'out')] };
  const scene = composeFlow(brief), map = new Map(scene.nodes.map(n => [n.id, n]));
  assert.equal(map.get('hit').x, map.get('miss').x);
  assert.notEqual(map.get('hit').y, map.get('miss').y);
  assert.ok(map.get('out').x > map.get('hit').x);
  assert.equal(scene.edges.filter(e => e.from === 'condition' && e.label && e.labelAt?.length === 2).length, 2);
  assert.equal(scene.texts.length, 0, 'no invented title, footer or prose');
});

test('the real repair wording stays readable rather than becoming vertical fragments', () => {
  const b = repair(); b.nodes[0].label = '提交故障描述与照片';
  const s = composeFlow(b), report = s.nodes.find(n => n.id === 'report');
  assert.equal(report.label.split('\n').length, 2);
  assert.equal(report.label, '提交故障描述\n与照片');
  assert.equal(s.nodes.find(n => n.id === 'impact').label, '是否\n影响营业');
  assert.equal(plain(report.label), b.nodes[0].label);
  for (const e of s.edges) if (e.label) assert.equal(e.label.split('\n').length, 1, `short condition must stay horizontal: ${e.label}`);
  assert.equal(s.nodes.find(n => n.id === 'onsite').label, '上门维修');
});

test('long labels grow boxes rather than silently shrinking or deleting text', () => {
  const short = composeFlow({ method: 'flow', nodes: [node('a', '确认')], links: [] });
  const longText = '核对提交材料中的项目名称、负责人、验收意见以及全部变更记录，保留缺失项并退回原提交人补充';
  const long = composeFlow({ method: 'flow', nodes: [node('a', longText)], links: [] });
  assert.ok(long.nodes[0].h > short.nodes[0].h);
  assert.equal(long.nodes[0].size, 18);
  assert.equal(plain(long.nodes[0].label), plain(longText));
  assert.ok(long.size[1] > long.nodes[0].y + long.nodes[0].h);
});

test('cycles must mark the actual return relation, and explicit feedback is retained', () => {
  const base = { method: 'flow', nodes: [node('a', '处理'), node('b', '复核')], links: [link('a', 'b'), link('b', 'a')] };
  assert.throws(() => composeFlow(base), /cycle.*feedback:true/);
  base.links[1].feedback = true;
  const scene = composeFlow(base);
  assert.equal(scene.edges.length, 2);
  assert.equal(scene.edges.find(e => e.from === 'b').to, 'a');
  assert.equal(scene.edges.find(e => e.from === 'b').kind, 'feedback');
});

test('identical duplicate relations fail; distinct conditional parallel edges get stable unique IDs', () => {
  const base = { method: 'flow', nodes: [node('a'), node('b')], links: [link('a', 'b'), link('a', 'b')] };
  assert.throws(() => composeFlow(base), /duplicate relation/);
  base.links = [link('a', 'b', { label: '通过' }), link('a', 'b', { label: '附条件通过' })];
  const scene = composeFlow(base);
  assert.equal(new Set(scene.edges.map(e => e.id)).size, 2);
  assert.notDeepEqual(scene.edges[0].labelAt, scene.edges[1].labelAt);
  const reversed = composeFlow({ ...base, links: [...base.links].reverse() });
  assert.deepEqual(new Set(scene.edges.map(e => e.id)), new Set(reversed.edges.map(e => e.id)));
});

test('invalid identities, role assignments and link flags fail before producing a scene', () => {
  assert.throws(() => composeFlow({ method: 'flow', nodes: [node('a'), node('a')], links: [] }), /duplicate node/);
  assert.throws(() => composeFlow({ method: 'flow', nodes: [node('a')], links: [link('a', 'missing')] }), /unknown node/);
  assert.throws(() => composeFlow({ method: 'flow', nodes: [node('a')], links: [link('a', 'a', { feedback: true })] }), /self loops/);
  assert.throws(() => composeFlow({ method: 'flow', nodes: [node('a', 'A', { lane: 'invented' })], links: [] }), /declared role/);
  assert.throws(() => composeFlow({ method: 'flow', lanes: [{ id: 'x', label: '甲' }, { id: 'y', label: '乙' }], nodes: [node('a')], links: [] }), /declared role/);
  assert.throws(() => composeFlow({ method: 'flow', nodes: [node('a'), node('b')], links: [link('a', 'b', { feedback: 'yes' })] }), /expected boolean/);
});

test('oversized requests fail explicitly instead of dropping nodes or reducing readability', () => {
  const nodes = Array.from({ length: 12 }, (_, i) => node('n' + i));
  const links = nodes.slice(1).map((n, i) => link(nodes[i].id, n.id));
  assert.throws(() => composeFlow({ method: 'flow', nodes, links }), /split the flow/);
  assert.throws(() => composeFlow({ method: 'flow', nodes: Array.from({ length: 37 }, (_, i) => node('n' + i)), links: [] }), /1–36/);
  assert.throws(() => composeFlow({ method: 'flow', width: Infinity, nodes: [node('a')], links: [] }), /1200–3200/);
  assert.throws(() => composeFlow({ method: 'flow', nodes: Array.from({ length: 10 }, (_, i) => node('n' + i)), links: [] }), /readable 1200×1000 preview/);
});

test('unknown fields at every level fail instead of silently discarding facts', () => {
  for (const mutate of [
    b => { b.linkz = b.links; }, b => { b.nodes[0].position = 'left'; },
    b => { b.links[0].feedbak = true; }, b => { b.lanes[0].owner = '财务'; }
  ]) { const b = repair(); mutate(b); assert.throws(() => composeFlow(b), /unknown field/); }
});

test('output width scales coordinates, text and line weights without shrinking the reading view', () => {
  const b = repair(), base = composeFlow(b), large = composeFlow({ ...b, width: 1800 });
  assert.equal(large.size[0], 1800);
  assert.equal(large.nodes.length, base.nodes.length);
  for (const n of large.nodes) {
    const original = base.nodes.find(v => v.id === n.id);
    for (const key of ['x', 'y', 'w', 'h', 'size']) assert.ok(Math.abs(n[key] / 1.5 - original[key]) < .02);
    assert.equal(n.size * 1200 / large.size[0], 18);
  }
  assert.equal(large.style.edge.labelSize * 1200 / large.size[0], 15);
  assert.equal(large.edges[0].width, 2.03);
  assert.throws(() => composeFlow({ method: 'flow', width: 3200, nodes: Array.from({ length: 12 }, (_, i) => node('n' + i)), links: Array.from({ length: 11 }, (_, i) => link('n' + i, 'n' + (i + 1))) }), /width changes resolution only/);
});

test('explicit themes retain their own palette and semantic tones', async () => {
  const scene = composeFlow({ ...repair(), theme: 'terminal' });
  assert.equal(scene.style.tones, undefined);
  assert.equal(scene.style.edge.color, undefined);
  assert.ok(scene.texts.every(t => t.color === 'ink'));
  assert.ok(scene.lines.every(l => l.color === 'line'));
  const terminal = await loadTheme('terminal');
  const svg = render(scene, terminal);
  assert.ok(svg.includes(terminal.palette.bg));
  assert.ok(scene.edges.some(e => e.dash === '5 4'));
});

test('node IDs including punctuation survive, with unambiguous native edge identities', () => {
  const brief = { method: 'flow', nodes: [node('组-A'), node('组~B'), node('组/%C')], links: [link('组-A', '组~B'), link('组~B', '组/%C')] };
  const scene = composeFlow(brief);
  assert.deepEqual(new Set(scene.nodes.map(n => n.id)), new Set(brief.nodes.map(n => n.id)));
  assert.equal(new Set(scene.edges.map(e => e.id)).size, 2);
  assert.equal(prepareScene(scene, theme).edges.length, 2);
  const tricky = composeFlow({ method: 'flow', nodes: [node('a~b'), node('c'), node('a'), node('b~c'), node('flow-a~b%7Ec~')], links: [link('a~b', 'c'), link('a', 'b~c')] });
  assert.equal(new Set([...tricky.nodes, ...tricky.edges].map(v => v.id)).size, tricky.nodes.length + tricky.edges.length);
});

test('topology coordinates are deterministic across input array order', () => {
  const base = repair(), normal = composeFlow(base), reversed = composeFlow({ ...base, nodes: [...base.nodes].reverse(), links: [...base.links].reverse() });
  const geometry = scene => Object.fromEntries(scene.nodes.map(n => [n.id, [n.x, n.y, n.w, n.h]]).sort());
  assert.deepEqual(geometry(normal), geometry(reversed));
});

test('returned routes stay clear of unrelated nodes, including long skip edges and feedback', () => {
  const scene = composeFlow(repair()), nodes = new Map(scene.nodes.map(n => [n.id, n]));
  for (const edge of scene.edges) {
    const a = nodes.get(edge.from), b = nodes.get(edge.to);
    const points = [[a.x + a.w, a.y + a.h * edge.fromAt], ...edge.via, [b.x, b.y + b.h * edge.toAt]];
    for (let i = 1; i < points.length; i++) {
      const [p, q] = [points[i - 1], points[i]];
      assert.ok(Math.abs(p[0] - q[0]) < .1 || Math.abs(p[1] - q[1]) < .1);
      for (const n of scene.nodes) if (n.id !== a.id && n.id !== b.id) {
        const vertical = Math.abs(p[0] - q[0]) < .1;
        const hit = vertical ? p[0] > n.x + 1 && p[0] < n.x + n.w - 1 && Math.max(p[1], q[1]) > n.y + 1 && Math.min(p[1], q[1]) < n.y + n.h - 1 : p[1] > n.y + 1 && p[1] < n.y + n.h - 1 && Math.max(p[0], q[0]) > n.x + 1 && Math.min(p[0], q[0]) < n.x + n.w - 1;
        assert.equal(hit, false, `${edge.from} -> ${edge.to} crosses ${n.id}`);
      }
    }
  }
});

const reworkBrief = () => ({ method: 'flow', lanes: [{ id: 'a', label: '接收员' }, { id: 'b', label: '操作员' }, { id: 'c', label: '记录员' }],
  nodes: [node('z-in', '受理材料', { lane: 'a' }), node('inspect-a', '材料检查', { lane: 'a', shape: 'diamond' }), node('a-fix', '补充材料', { lane: 'a' }), node('process', '处理材料', { lane: 'b' }), node('inspect-b', '质量检查', { lane: 'b', shape: 'diamond' }), node('read', '读取结果', { lane: 'c' }), node('save', '保存结果', { lane: 'c' })],
  links: [link('z-in', 'inspect-a'), link('a-fix', 'inspect-a'), link('inspect-a', 'process', { label: '完整' }), link('inspect-a', 'a-fix', { label: '缺失', feedback: true }), link('process', 'inspect-b'), link('inspect-b', 'read', { label: '合格' }), link('inspect-b', 'process', { label: '返工', feedback: true }), link('read', 'save')] });

test('genuine entry precedes a feedback-created source despite adversarial ID ordering', () => {
  const brief = reworkBrief(), scene = composeFlow(brief), actual = scene.nodes.find(n => n.id === 'z-in'), pseudo = scene.nodes.find(n => n.id === 'a-fix');
  assert.equal(actual.x, pseudo.x);
  assert.ok(actual.y < pseudo.y, 'a feedback receiver with no forward indegree must not become the first entry');
  const permuted = composeFlow({ ...brief, nodes: [...brief.nodes].reverse(), links: [...brief.links].reverse() });
  assert.equal(permuted.nodes.find(n => n.id === actual.id).y, actual.y);
  assert.deepEqual(new Set(scene.nodes.map(n => n.id)), new Set(brief.nodes.map(n => n.id)));
});

test('independent local rework remains in its owner lane with every condition and endpoint intact', () => {
  const brief = reworkBrief(), saved = structuredClone(brief), scene = composeFlow(brief);
  assert.deepEqual(brief, saved);
  assert.equal(scene.meta.localFeedbackCount, 2);
  assert.equal(scene.edges.length, brief.links.length);
  const rules = [...new Set(scene.lines.map(l => l.points[0][1]))].sort((a, b) => a - b);
  const nodeMap = new Map(scene.nodes.map(n => [n.id, n]));
  for (const expected of brief.links.filter(l => l.feedback)) {
    const edge = scene.edges.find(e => e.from === expected.from && e.to === expected.to);
    assert.equal(plain(edge.label), expected.label);
    const roleIndex = brief.lanes.findIndex(l => l.id === brief.nodes.find(n => n.id === expected.from).lane);
    for (const [, y] of [...edge.via, edge.labelAt]) assert.ok(y >= rules[roleIndex] && y <= rules[roleIndex + 1], `${expected.from} must not leave its lane`);
    const a = nodeMap.get(edge.from), b = nodeMap.get(edge.to);
    const points = [port(a, edge.fromSide, edge.fromAt, edge.fromGap), ...edge.via, port(b, edge.toSide, edge.toAt, edge.toGap)];
    for (let i = 1; i < points.length; i++) for (const n of scene.nodes) {
      const [p, q] = [points[i - 1], points[i]], vertical = Math.abs(p[0] - q[0]) < .1;
      const hit = vertical ? p[0] > n.x + 1 && p[0] < n.x + n.w - 1 && Math.max(p[1], q[1]) > n.y + 1 && Math.min(p[1], q[1]) < n.y + n.h - 1 : p[1] > n.y + 1 && p[1] < n.y + n.h - 1 && Math.max(p[0], q[0]) > n.x + 1 && Math.min(p[0], q[0]) < n.x + n.w - 1;
      assert.equal(hit, false, `return must not cross ${n.id}, including its endpoints' interiors`);
    }
  }
});

test('a local return without a safe label corridor keeps an explicit external return', () => {
  const scene = composeFlow({ method: 'flow', lanes: [{ id: 'only', label: '审核员' }], nodes: [node('first', '准备', { lane: 'only' }), node('second', '审核', { lane: 'only' })], links: [link('first', 'second'), link('second', 'first', { feedback: true, label: '材料不符合要求退回重新准备' })] });
  assert.equal(scene.meta.localFeedbackCount, 0);
  const feedback = scene.edges.find(e => e.kind === 'feedback');
  assert.equal(plain(feedback.label), '材料不符合要求退回重新准备');
  assert.ok(feedback.via.some(([, y]) => y > scene.meta.contentBottom));
});
