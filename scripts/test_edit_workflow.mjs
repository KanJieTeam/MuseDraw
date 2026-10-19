import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { loadTheme } from '../skills/musedraw/scripts/musedraw.mjs';
import { render } from '../skills/musedraw/scripts/engine/render.mjs';
import { prepareScene } from '../skills/musedraw/scripts/engine/validate.mjs';
import { patchScene } from '../skills/musedraw/scripts/engine/patch.mjs';

const cli = path.resolve(import.meta.dirname, '../skills/musedraw/scripts/musedraw.mjs');
const theme = await loadTheme('enterprise');
const base = () => ({ theme: 'enterprise', size: [600, 400], autoFit: false,
  nodes: [{ id: 'one', x: 30, y: 50, label: '核心技术力', fill: '#7795f4' }, { id: 'two', x: 300, y: 50, label: '项目管理力' }] });
const scratch = (run) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'musedraw-edit-'));
  try { return run(dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
};

test('patch changes only the requested label', () => {
  const s = base(), before = structuredClone(s);
  const result = patchScene(s, [{ id: 'one', field: 'label', expect: '核心技术力', value: '技术平台' }]);
  assert.deepEqual(s, before);
  const expected = structuredClone(before); expected.nodes[0].label = '技术平台';
  assert.deepEqual(result.scene, expected);
  assert.deepEqual(result.changes, [{ path: '/nodes/0/label', before: '核心技术力', after: '技术平台' }]);
  assert.ok(render(result.scene, theme).includes('技术平台'));
});

test('ambiguous, absent and stale patches fail atomically', () => {
  const s = base(), copy = structuredClone(s);
  assert.throws(() => patchScene(s, [{ from: 'absent', to: 'new' }]), /matched 0/);
  assert.throws(() => patchScene(s, [{ id: 'one', field: 'label', expect: 'old', value: 'new' }]), /source changed/);
  s.nodes[1].label = s.nodes[0].label;
  assert.throws(() => patchScene(s, [{ from: '核心技术力', to: 'new' }]), /matched 2/);
  assert.equal(patchScene(s, [{ id: 'two', field: 'label', value: 'new' }]).scene.nodes[0].label, copy.nodes[0].label);
  assert.throws(() => patchScene(s, [{ id: 'one', field: 'fill', value: 'red' }]), /text field/);
});

test('grid expands variable item counts, preserves IDs and keeps unrelated nodes fixed', () => {
  const s = { theme: 'enterprise', autoFit: false, size: [800, 600],
    nodes: [{ id: 'unrelated', label: '固定', x: 600, y: 400 }],
    blocks: [{ type: 'grid', id: 'g', x: 20, y: 20, w: 400, columns: 3, size: 12, gap: 10,
      items: [{ id: 'a', label: '服务' }, { id: 'b', label: '流程' }, { id: 'c', label: '数据' }, { id: 'd', label: '新增模块' }] }] };
  const expanded = prepareScene(s, theme);
  assert.deepEqual(expanded.nodes[0], s.nodes[0]);
  assert.equal(expanded.nodes.length, 5);
  assert.equal(expanded.nodes.find((n) => n.id === 'a').x, expanded.nodes.find((n) => n.id === 'd').x);
  assert.ok(expanded.nodes.find((n) => n.id === 'd').y > expanded.nodes.find((n) => n.id === 'a').y);
  const changed = patchScene(s, [{ id: 'd', field: 'label', value: '这个更长的模块名称需要换行' }]);
  const after = prepareScene(changed.scene, theme);
  assert.ok(after.nodes.find((n) => n.id === 'd').h > expanded.nodes.find((n) => n.id === 'd').h);
  assert.deepEqual(after.nodes[0], expanded.nodes[0]);
  s.blocks[0].h = 20; assert.throws(() => prepareScene(s, theme), /cannot fit content/);
  s.blocks[0].columns = 0; assert.throws(() => prepareScene(s, theme), /must be >= 1/);
});

test('compact grid renders with the same padding used for its row measurement', () => {
  const s = {theme:'enterprise', size:[300,100], autoFit:false,
    blocks:[{id:'compact',type:'grid',x:10,y:10,w:260,columns:3,gap:5,padding:0,
      cellPadding:2,size:10,rowH:22,items:[{label:'服务触达力'},{label:'流程管理力'},{label:'数据支撑力'}]}]};
  const svg=render(s,theme);
  assert.ok(svg.includes('>服务触达力</tspan>'), 'The complete label must fit on one line');
  assert.ok(svg.includes('>流程管理力</tspan>'));
  assert.ok(svg.includes('>数据支撑力</tspan>'));
});

test('CLI patch produces an audited revision without modifying its source, defaults record run timings', () => scratch((dir) => {
  const source = path.join(dir, 'source.json'), changes = path.join(dir, 'changes.json'), out = path.join(dir, 'revision');
  fs.writeFileSync(source, JSON.stringify(base())); const original = fs.readFileSync(source, 'utf8');
  // A legacy test artifact beside a scene must not trigger an extra pipeline.
  fs.writeFileSync(path.join(dir, 'reference.json'),JSON.stringify({version:1,source:{sha256:'old-test'},labels:[]}));
  fs.writeFileSync(changes, JSON.stringify([{ from: '核心技术力', to: '技术平台' }]));
  const invoke = (...args) => spawnSync(process.execPath, [cli, ...args], { cwd: dir, encoding: 'utf8', timeout: 10000 });
  const first = invoke('patch', source, changes, '--out', out, '--svg-only');
  assert.equal(first.status, 0, first.stderr);
  assert.equal(fs.readFileSync(source, 'utf8'), original);
  assert.equal(JSON.parse(fs.readFileSync(path.join(out, 'changes.json'))).changes.length, 1);
  assert.ok(JSON.parse(fs.readFileSync(path.join(out, 'run.json'))).events.some((event) => event.stage === 'scene-ready'));
  const before = fs.readFileSync(path.join(out, 'scene.json'), 'utf8');
  const again = invoke('patch', source, changes, '--out', out, '--svg-only');
  assert.equal(again.status, 1); assert.equal(fs.readFileSync(path.join(out, 'scene.json'), 'utf8'), before);
}));
