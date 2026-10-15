import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { loadTheme } from '../skills/musedraw/scripts/musedraw.mjs';
import { render } from '../skills/musedraw/scripts/engine/render.mjs';
import { prepareScene, validateScene, SceneValidationError } from '../skills/musedraw/scripts/engine/validate.mjs';
import { BLOCKS } from '../skills/musedraw/scripts/engine/layouts.mjs';
import { ICONS } from '../skills/musedraw/scripts/engine/icons.mjs';

const root = path.resolve(import.meta.dirname, '..');
const cli = path.join(root, 'skills/musedraw/scripts/musedraw.mjs');
const theme = await loadTheme('journal');
const schema = JSON.parse(fs.readFileSync(path.join(root, 'skills/musedraw/references/scene.schema.json'), 'utf8'));
const base = () => ({
  theme: 'journal', autoFit: false, size: [600, 400],
  nodes: [{ id: 'source', x: 40, y: 180, label: 'Source' }, { id: 'sink', x: 380, y: 180, label: 'Sink' }],
  edges: [{ from: 'source', to: 'sink' }],
});
const sequence = () => ({ theme: 'journal', type: 'sequence', participants: [{ id: 'client', label: 'Client' }], messages: [{ from: 'client', to: 'client', label: 'Retry' }] });
const reject = (scene, expectedPath, pattern) => {
  assert.throws(() => render(scene, theme), (error) => {
    assert.ok(error instanceof SceneValidationError, error.stack);
    assert.ok(error.issues.some((issue) => issue.path === expectedPath && (!pattern || pattern.test(issue.message))), error.message);
    return true;
  });
};

for (const [name, change, at] of [
  ['non-object scene', () => null, ''],
  ['array scene', () => [], ''],
  ['unsupported version', (s) => ({ ...s, schemaVersion: 2 }), '/schemaVersion'],
  ['invalid canvas size', (s) => ({ ...s, size: [600, 0] }), '/size/1'],
  ['extra canvas coordinate', (s) => ({ ...s, size: [600, 400, 1] }), '/size'],
  ['non-array nodes', (s) => ({ ...s, nodes: {} }), '/nodes'],
  ['null node', (s) => ({ ...s, nodes: [null] }), '/nodes/0'],
  ['missing node ID', (s) => { delete s.nodes[0].id; return s; }, '/nodes/0/id'],
  ['blank node ID', (s) => { s.nodes[0].id = '  '; return s; }, '/nodes/0/id'],
  ['missing position', (s) => { delete s.nodes[0].x; return s; }, '/nodes/0/x'],
  ['string position', (s) => { s.nodes[0].x = '40'; return s; }, '/nodes/0/x'],
  ['infinite position', (s) => { s.nodes[0].x = Infinity; return s; }, '/nodes/0/x'],
  ['NaN position', (s) => { s.nodes[0].y = NaN; return s; }, '/nodes/0/y'],
  ['negative node width', (s) => { s.nodes[0].w = -1; return s; }, '/nodes/0/w'],
  ['non-string label', (s) => { s.nodes[0].label = []; return s; }, '/nodes/0/label'],
  ['unknown shape', (s) => { s.nodes[0].shape = 'rectangle'; return s; }, '/nodes/0/shape'],
  ['unknown icon', (s) => { s.nodes[0].icon = 'unknown'; return s; }, '/nodes/0/icon'],
  ['unknown port side', (s) => { s.edges[0].fromSide = 'left'; return s; }, '/edges/0/fromSide'],
  ['port fraction out of range', (s) => { s.edges[0].toAt = 2; return s; }, '/edges/0/toAt'],
  ['malformed waypoint', (s) => { s.edges[0].via = [[1]]; return s; }, '/edges/0/via/0'],
  ['null edge', (s) => { s.edges = [null]; return s; }, '/edges/0'],
  ['unknown route', (s) => { s.edges[0].route = 'orthogonal'; return s; }, '/edges/0/route'],
  ['unknown block', (s) => ({ ...s, blocks: [{ type: 'unknown' }] }), '/blocks/0/type'],
  ['tree missing root', (s) => ({ ...s, blocks: [{ type: 'tree', x: 20, y: 200 }] }), '/blocks/0/root'],
  ['malformed tree child', (s) => ({ ...s, blocks: [{ type: 'tree', x: 20, y: 200, root: { children: [null] } }] }), '/blocks/0/root/children/0'],
  ['empty node widths', (s) => ({ ...s, blocks: [{ type: 'tree', x: 20, y: 200, root: {}, nodeW: [] }] }), '/blocks/0/nodeW'],
  ['empty Gantt columns', (s) => ({ ...s, blocks: [{ type: 'gantt', x: 20, y: 200, w: 500, columns: [] }] }), '/blocks/0/columns'],
  ['too many quadrants', (s) => ({ ...s, blocks: [{ type: 'matrix', x: 0, y: 200, w: 500, h: 400, quadrants: [{}, {}, {}, {}, {}] }] }), '/blocks/0/quadrants'],
  ['malformed line', (s) => ({ ...s, lines: [{ points: [[1, 2], [3, '4']] }] }), '/lines/0/points/1/1'],
  ['division by zero in bar', (s) => ({ ...s, bars: [{ x: 0, y: 200, w: 200, h: 20, max: 0 }] }), '/bars/0/max'],
]) {
  test(name, () => reject(change(base()), at));
}

test('reports several field paths in a single diagnostic', () => {
  const s = base(); s.nodes[0].x = 'wrong'; s.edges[0].fromSide = 'left';
  const issues = validateScene(s);
  assert.deepEqual(issues.map((i) => i.path), ['/nodes/0/x', '/edges/0/fromSide']);
});

test('rejects duplicate IDs before a Map can overwrite a node', () => {
  const s = base(); s.nodes[1].id = 'source';
  reject(s, '/nodes/1/id', /first defined at \/nodes\/0\/id/);
});

test('rejects dangling edge and note references', () => {
  const s = base(); s.edges[0].to = 'missing';
  reject(s, '/edges/0/to', /unknown node/);
  s.edges = []; s.notes = [{ x: 20, y: 320, text: 'Missing', target: 'missing' }];
  reject(s, '/notes/0/target', /unknown node/);
});

test('accepts references to generated nodes and rejects generated ID collisions', () => {
  const s = { blocks: [{ type: 'tree', x: 20, y: 180, root: { label: 'Root' } }], nodes: [{ id: 'sink', x: 400, y: 180 }], edges: [{ from: 'b1-n1', to: 'sink' }] };
  assert.ok(render(s, theme).includes('b1-n1'));
  s.nodes[0].id = 'b1-n1'; s.edges = [];
  reject(s, '/nodes/1/id', /duplicate ID/);
});

test('rejects duplicate IDs inside nested tree content', () => {
  reject({ blocks: [{ type: 'tree', x: 0, y: 0, root: { id: 'same', children: [{ id: 'same' }] } }] }, '/nodes/1/id', /duplicate/);
});

test('rejects block IDs that collide with default generated prefixes', () => {
  const s = { blocks: [{ id: 'b2', type: 'tree', x: 0, y: 0, root: {} }, { type: 'tree', x: 0, y: 0, root: {} }] };
  reject(s, '/blocks/1/id', /duplicate/);
});

test('rejects duplicate and unknown sequence participants', () => {
  const s = sequence(); s.participants.push({ id: 'client' });
  reject(s, '/participants/1/id', /duplicate/);
  s.participants.pop(); s.messages[0].to = 'unknown';
  reject(s, '/messages/0/to', /unknown node/);
  reject({ type: 'sequence', participants: [] }, '/participants');
});

test('identifies expanded paths when generated sequence nodes collide', () => {
  const s = sequence(); s.participants[0].id = 'm1-a';
  s.messages[0] = { from: 'm1-a', to: 'm1-a' };
  assert.throws(() => prepareScene(s, theme), (error) => {
    assert.ok(error instanceof SceneValidationError);
    assert.equal(error.expanded, true);
    assert.match(error.message, /after layout expansion/);
    assert.ok(error.issues.some((issue) => issue.path === '/nodes/1/id'));
    return true;
  });
});

test('validates sequence message ranges and note rows', () => {
  const s = sequence(); s.sections = [{ from: 1, to: 2 }];
  reject(s, '/sections/0/to', /existing message/);
  s.sections = [{ from: 2, to: 1 }];
  reject(s, '/sections/0/to', />= from/);
  s.sections = []; s.notes = [{ x: 20, row: 2, text: 'Note' }];
  reject(s, '/notes/0/row', /existing sequence message/);
  s.notes[0].row = 1;
  assert.ok(render(s, theme).includes('Note'));
  reject({ notes: [{ x: 20, row: 1, text: 'Note' }] }, '/notes/0/row');
});

test('validates swimlane lanes and columns', () => {
  const s = { blocks: [{ type: 'swimlane', x: 0, y: 180, w: 1000, lanes: [{ id: 'team' }], steps: [{ id: 'step', lane: 'unknown', col: 0 }] }] };
  reject(s, '/blocks/0/steps/0/lane', /unknown lane/);
  s.blocks[0].steps[0].lane = 'team'; s.blocks[0].steps[0].col = 6;
  reject(s, '/blocks/0/steps/0/col', /less than cols/);
  s.blocks[0].steps[0].col = 0; s.blocks[0].lanes.push({ id: 'team' });
  reject(s, '/blocks/0/lanes/1/id', /duplicate/);
});

test('validates table cell counts before indexing missing columns', () => {
  reject({ blocks: [{ type: 'table', x: 0, y: 180, columns: [{ w: 100 }], rows: [{ cells: ['one', 'two'] }] }] }, '/blocks/0/rows/0/cells', /more cells/);
});

test('validates Gantt ranges, segment endpoints and generated geometry', () => {
  const block = { type: 'gantt', x: 0, y: 180, w: 600, columns: ['W1', 'W2'], tasks: [{ label: 'Work', start: 1, end: 0 }] };
  reject({ blocks: [block] }, '/blocks/0/tasks/0', /end must be/);
  block.tasks[0] = { label: 'Work', segments: [[0, 'two']] };
  reject({ blocks: [block] }, '/blocks/0/tasks/0/segments/0', /finite numbers/);
  block.tasks[0] = { label: 'Work', start: 0, end: 3 };
  reject({ blocks: [block] }, '/blocks/0/tasks/0', /between 0 and 2/);
  block.tasks[0] = { label: 'Work', start: 0, end: 0.001 };
  reject({ blocks: [block] }, '/nodes/0/w', />= 0/);
});

test('preserves defaults, extra metadata, empty labels, zero-size anchors and nullable legacy fields', () => {
  const s = { schemaVersion: 1, customMetadata: { owner: 'Team' }, nodes: [{ id: 'anchor', x: -10, y: 10, w: 0, h: 0, label: '', shape: 'text' }], notes: [{ x: 10, y: 30, text: '', target: null }] };
  const copy = structuredClone(s);
  assert.deepEqual(validateScene(s), []);
  prepareScene(s, theme);
  assert.deepEqual(s, copy, 'Preflight must not modify the source');
  assert.ok(render(s, theme).startsWith('<svg'));
});

test('the bundled schema uses only the supported offline vocabulary and engine names', () => {
  const supported = new Set(['$schema', '$ref', 'title', 'description', 'definitions', 'type', 'properties', 'required', 'const', 'enum', 'pattern', 'minimum', 'maximum', 'exclusiveMinimum', 'minItems', 'maxItems', 'items', 'allOf', 'anyOf', 'if', 'then']);
  function visit(rule) {
    for (const key of Object.keys(rule)) assert.ok(supported.has(key), `Unsupported schema keyword: ${key}`);
    if (rule.$ref) assert.ok(schema.definitions[rule.$ref.slice('#/definitions/'.length)]);
    for (const group of ['definitions', 'properties']) for (const nested of Object.values(rule[group] ?? {})) visit(nested);
    for (const group of ['allOf', 'anyOf']) for (const nested of rule[group] ?? []) visit(nested);
    for (const key of ['items', 'if', 'then']) if (rule[key]) visit(rule[key]);
  }
  visit(schema);
  assert.deepEqual(new Set(schema.definitions.block.properties.type.enum), new Set(Object.keys(BLOCKS)));
  assert.deepEqual(new Set(schema.definitions.nodeContent.properties.icon.enum), new Set(Object.keys(ICONS)));
});

function withCLI(run) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'musedraw-validate-'));
  try {
    const file = path.join(scratch, 'scene.json');
    const out = path.join(scratch, 'artifacts');
    const invoke = (...args) => spawnSync(process.execPath, [cli, ...args], { cwd: scratch, encoding: 'utf8', timeout: 15000, env: { ...process.env, MUSEDRAW_PLAYWRIGHT: path.join(scratch, 'missing-playwright.mjs') } });
    run({ scratch, file, out, invoke });
  } finally { fs.rmSync(scratch, { recursive: true, force: true }); }
}

test('CLI validates multiple scenes without a browser or artifact writes', () => withCLI(({ scratch, file, invoke }) => {
  fs.writeFileSync(file, JSON.stringify(base()));
  const other = path.join(scratch, 'other.json'); fs.writeFileSync(other, JSON.stringify(sequence()));
  const result = invoke('validate', file, other);
  assert.equal(result.status, 0, result.stderr);
  assert.equal((result.stdout.match(/valid scene/g) ?? []).length, 2);
  assert.deepEqual(fs.readdirSync(scratch).sort(), ['other.json', 'scene.json']);
}));

test('CLI reports validation errors before browser startup and preserves existing artifacts', () => withCLI(({ file, out, invoke }) => {
  const s = base(); s.edges[0].to = 'missing'; fs.writeFileSync(file, JSON.stringify(s));
  let result = invoke('render', file, '--out', out);
  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes(file), result.stderr);
  assert.match(result.stderr, /\/edges\/0\/to: unknown node ID "missing"/);
  assert.doesNotMatch(result.stderr, /Playwright|Chromium/);
  assert.equal(fs.existsSync(out), false);
  fs.mkdirSync(out); fs.writeFileSync(path.join(out, 'diagram.svg'), 'existing artifact');
  result = invoke('render', file, '--out', out, '--svg-only');
  assert.equal(result.status, 1);
  assert.equal(fs.readFileSync(path.join(out, 'diagram.svg'), 'utf8'), 'existing artifact');
}));

test('CLI identifies malformed JSON and a non-object root by source file', () => withCLI(({ file, invoke }) => {
  fs.writeFileSync(file, '{"nodes":');
  let result = invoke('validate', file);
  assert.equal(result.status, 1); assert.ok(result.stderr.includes(file));
  fs.writeFileSync(file, 'null'); result = invoke('validate', file);
  assert.equal(result.status, 1); assert.match(result.stderr, /\/: must be object/);
}));

test('CLI supports a theme override and successful SVG-only rendering', () => withCLI(({ file, out, invoke }) => {
  const s = base(); delete s.theme; fs.writeFileSync(file, JSON.stringify(s));
  let result = invoke('validate', file, '--theme', '科研期刊');
  assert.equal(result.status, 0, result.stderr);
  result = invoke('render', file, '--theme', 'journal', '--out', out, '--svg-only');
  assert.equal(result.status, 0, result.stderr);
  assert.ok(fs.readFileSync(path.join(out, 'diagram.svg'), 'utf8').includes('Source'));
  assert.equal(JSON.parse(fs.readFileSync(path.join(out, 'checks.json'))).svgOnly, true);
}));
