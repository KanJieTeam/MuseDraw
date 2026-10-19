import assert from 'node:assert/strict';
import {test} from 'node:test';
import {laminateParts} from '../skills/musedraw/scripts/engine/scientific-laminate.mjs';
import {pathCommands} from '../skills/musedraw/scripts/engine/drawio.mjs';

const palette = {ink: '#334455', soft: '#E5E5E5', focus: '#55AABB'};
const base = {id: 'sample', type: 'scientific', kind: 'laminate', x: 15, y: 20, w: 380, h: 180,
  layers: [{id: 'skin/top', label: 'Skin', fill: 'soft', thickness: 12}, {id: 'active', label: 'Active', fill: 'focus', thickness: 8}, {id: 'base', label: 'Base', fill: '#E6BD99', thickness: 16}], gap: 4,
  electrodes: {layer: 1, width: 18, fill: '#667788'}};
const layerPaths = out => out.paths.filter(part => !part.id.endsWith('-leader'));
const commands = path => pathCommands(path.d);
const close = (a, b) => assert.ok(Math.abs(a - b) < 0.00001, `${a} != ${b}`);
const curves = path => {
  let current; const result = [];
  for (const c of commands(path)) {
    if (c[0] === 'curve') result.push([current, c.slice(1, 3), c.slice(3, 5), c.slice(5, 7)]);
    if (c.length > 1) current = c.slice(-2);
  }
  return result;
};
const at = (c, t) => [0, 1].map(axis => c.reduce((sum, point, i) => sum + point[axis] * [1, 3, 3, 1][i] * (1 - t) ** (3 - i) * t ** i, 0));

test('fixed ends, electrode anchors, identities and restoration survive deflection edits', () => {
  const input = structuredClone(base), saved = structuredClone(input), colours = structuredClone(palette);
  const flat = laminateParts(input, palette, 16);
  const bent = laminateParts({...input, deflection: 0.4}, palette, 16);
  const restored = laminateParts({...input, deflection: 0}, palette, 16);
  assert.deepEqual(input, saved); assert.deepEqual(palette, colours);
  assert.deepEqual(restored, flat); assert.deepEqual(bent.nodes, flat.nodes);
  assert.deepEqual(flat.nodes.map(node => node.id), ['sample-electrode-left', 'sample-electrode-right']);
  assert.deepEqual(layerPaths(flat).map(path => path.id), ['sample-layer-skin%2Ftop', 'sample-layer-active', 'sample-layer-base']);
  for (let i = 0; i < base.layers.length; i++) {
    const a = commands(layerPaths(flat)[i]), b = commands(layerPaths(bent)[i]);
    assert.equal(layerPaths(flat)[i].fill, layerPaths(bent)[i].fill);
    assert.notDeepEqual(a, b);
    for (let j = 0; j < a.length; j++) if (a[j][0] !== 'curve') assert.deepEqual(a[j], b[j], 'straight end pads do not move');
    const c0 = curves(layerPaths(flat)[i]), c1 = curves(layerPaths(bent)[i]);
    // True fixed curve endpoints, not merely the outer path's move/line points.
    for (const [segment, end] of [[0, 0], [1, 3], [2, 0], [3, 3]]) assert.deepEqual(c0[segment][end], c1[segment][end]);
    for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) close(c0[j][k][0], c1[j][k][0]);
    close(c1[0][3][1] - c0[0][3][1], base.h * 0.4);
    close(c1[2][3][1] - c0[2][3][1], base.h * 0.4);
  }
});

test('native paths have horizontal end/centre tangents, stay in frame and preserve sampled thickness', () => {
  for (const deflection of [0, 0.12, 0.4]) {
    const out = laminateParts({...base, deflection}, palette);
    assert.deepEqual(out.edges, []); assert.deepEqual(out.texts, []);
    for (const [i, path] of layerPaths(out).entries()) {
      assert.match(path.d, /^M[^<>]+Z$/); assert.doesNotMatch(path.d, /NaN|Infinity|<|image|url/i);
      const c = commands(path), segments = curves(path);
      assert.equal(segments.length, 4); assert.equal(c.at(-1)[0], 'close');
      for (const command of c) for (let j = 1; j < command.length; j += 2) {
        assert.ok(command[j] >= base.x && command[j] <= base.x + base.w);
        assert.ok(command[j + 1] >= base.y && command[j + 1] <= base.y + base.h);
      }
      for (const segment of segments) {
        // Endpoint derivatives are 3*(P1-P0) and 3*(P3-P2).
        close(3 * (segment[1][1] - segment[0][1]), 0);
        close(3 * (segment[3][1] - segment[2][1]), 0);
        assert.ok(Math.abs(segment[1][0] - segment[0][0]) > 0);
        assert.ok(Math.abs(segment[3][0] - segment[2][0]) > 0);
      }
      assert.deepEqual(segments[0][3], segments[1][0]);
      close(segments[0][3][0] - segments[0][2][0], segments[1][1][0] - segments[1][0][0]);
      for (const t of [0, 0.1, 0.25, 0.5, 0.8, 1]) {
        for (const [upper, lower] of [[0, 3], [1, 2]]) {
          const a = at(segments[upper], t), b = at(segments[lower], 1 - t);
          close(a[0], b[0]); close(b[1] - a[1], base.layers[i].thickness);
          assert.ok(a[0] >= base.x && a[0] <= base.x + base.w);
          assert.ok(b[1] >= base.y && b[1] <= base.y + base.h);
        }
      }
    }
  }
});

test('right labels reserve width inside frame and retain literal material names', () => {
  const out = laminateParts({...base, labelSide: 'right'}, palette, 16);
  assert.deepEqual(out.texts.map(text => text.text), ['Skin', 'Active', 'Base']);
  for (const text of out.texts) {
    assert.ok(text.x > base.x && text.x < base.x + base.w);
    assert.ok(text.y - text.size >= base.y && text.y + text.size * 0.3 <= base.y + base.h);
  }
  for (const path of out.paths) assert.doesNotThrow(() => pathCommands(path.d));
});

test('defaults support 2..8 layers without inventing electrodes or facts', () => {
  for (let n = 2; n <= 8; n++) {
    const input = {id: 'plain', x: 0, y: 0, w: 300, h: 200, layers: Array.from({length: n}, (_, i) => ({id: `${i}`, fill: 'soft'}))};
    const flat = laminateParts(input, palette), bent = laminateParts({...input, deflection: 0.4}, palette);
    assert.equal(flat.paths.length, n); assert.equal(flat.nodes.length, 0);
    assert.equal(flat.texts.length, 0); assert.deepEqual(flat.edges, []);
    for (let i = 0; i < n; i++) {
      assert.equal(flat.paths[i].id, bent.paths[i].id);
      const c = curves(flat.paths[i]);
      close(c[2][0][1] - c[1][3][1], input.h * 0.12 / n);
    }
  }
});

test('illegal parameters fail synchronously, before returning partial native geometry', () => {
  const invalid = [
    {layers: []}, {layers: [{id: 'only', fill: 'soft'}]}, {layers: Array.from({length: 9}, (_, i) => ({id: `${i}`, fill: 'soft'}))},
    {layers: [{id: 'same', fill: 'soft'}, {id: 'same', fill: 'focus'}]},
    {layers: [{id: 'a', fill: 'soft', thickness: -1}, {id: 'b', fill: 'focus'}]},
    {layers: [{id: 'a', fill: 'soft', thickness: 1000}, {id: 'b', fill: 'focus'}]},
    {layers: [{id: 'a', fill: 'soft', thikness: 3}, {id: 'b', fill: 'focus'}]},
    {layers: [{id: 'a', fill: 'url(https://invalid)'}, {id: 'b', fill: 'focus'}]},
    {gap: -1}, {gap: Infinity}, {gap: 1000}, {deflection: -0.01}, {deflection: 0.4001}, {deflection: NaN}, {deflection: '0.2'},
    {electrodes: {layer: 3}}, {electrodes: {layer: 0.5}}, {electrodes: {layer: 1, width: 0}}, {electrodes: {layer: 1, width: 1000}},
    {labelSide: 'left'}, {w: 0}, {h: Infinity}, {unexpected: true}, {labelSide: 'right', w: 12},
  ];
  for (const patch of invalid) assert.throws(() => laminateParts({...base, ...patch}, palette), /Scientific motif .*laminate/);
  assert.throws(() => laminateParts(base, palette, -1), /positive label size/);
});

test('explicit load terminates at the actual surface without moving any material or electrode', () => {
  for (const deflection of [0, 0.12, 0.4]) {
    const input = {...base, deflection, load: 'F'}, saved = structuredClone(input);
    const bare = laminateParts({...base, deflection}, palette), loaded = laminateParts(input, palette);
    assert.deepEqual(input, saved); assert.deepEqual(loaded.nodes, bare.nodes); assert.deepEqual(loaded.edges, bare.edges);
    assert.deepEqual(loaded.paths.filter(p => !p.id.includes('-load-')), bare.paths);
    assert.deepEqual(loaded.texts.filter(t => !t.id.includes('-load-')), bare.texts);
    const upper = curves(layerPaths(bare)[0]);
    const surface = upper[0][3], baseline = upper[0][0][1];
    const arrow = loaded.paths.find(p => p.id === 'sample-load-arrow'), c = commands(arrow);
    assert.deepEqual(c.map(x => x[0]), ['move', 'line', 'move', 'line', 'line']);
    close(c[0][1], surface[0]); close(c[1][1], surface[0]);
    close(surface[1] - c[1][2], 2.5); assert.ok(c[0][2] < baseline && c[0][2] < c[1][2]);
    assert.deepEqual(c[3].slice(1), c[1].slice(1), 'arrow head ends at the true load tip');
    const symbol = loaded.texts.find(t => t.id === 'sample-load-symbol');
    assert.equal(symbol.text, 'F'); assert.equal(symbol.italic, true); assert.match(symbol.font, /Times New Roman/);
    assert.ok(symbol.x > surface[0]); assert.ok(symbol.x + symbol.w <= base.x + base.w);
    assert.ok(symbol.y - symbol.size >= base.y && symbol.y + symbol.size * 0.28 < baseline);
    for (const p of loaded.paths.filter(p => p.id.includes('-load-'))) {
      for (const command of commands(p)) for (let j = 1; j < command.length; j += 2) {
        assert.ok(command[j] >= base.x && command[j] <= base.x + base.w);
        assert.ok(command[j + 1] >= base.y && command[j + 1] <= base.y + base.h);
      }
    }
  }
});

test('load is opt-in, a single letter and requires existing headroom inside each frame', () => {
  const bent = laminateParts({...base, deflection: 0.4}, palette);
  assert.ok(!bent.paths.some(p => p.id.includes('-load-'))); assert.equal(bent.texts.length, 0);
  for (const load of ['', 'FF', 'F1', 'F₂', '→F', 1, null, true]) assert.throws(() => laminateParts({...base, load}, palette), /single Latin force letter/);
  assert.throws(() => laminateParts({...base, h: 100, load: 'F'}, palette), /load and force symbol do not fit/);
  assert.throws(() => laminateParts({...base, w: 20, electrodes: undefined, load: 'F'}, palette), /load and force symbol do not fit/);
});

test('crowded right labels pack around actual fixed contacts rather than unused bend reserve', () => {
  const input={id:'packed',x:0,y:0,w:500,h:300,labelSide:'right',gap:0,
    layers:['A','B','C'].map(id=>({id,label:id,fill:'#abc',thickness:4}))};
  const flat=laminateParts(input,{},14),bent=laminateParts({...input,deflection:.4},{},14);
  assert.deepEqual(flat.texts,bent.texts);
  assert.deepEqual(flat.paths.filter(p=>p.id.endsWith('-leader')),bent.paths.filter(p=>p.id.endsWith('-leader')));
  assert.deepEqual(flat.nodes,bent.nodes);
  const centres=flat.texts.map(t=>t.y-14*.3);
  [71.1,90,108.9].forEach((expected,i)=>close(centres[i],expected));
  flat.paths.filter(p=>p.id.endsWith('-leader')).forEach((p,i)=>close(commands(p)[0][2],[86,90,94][i]));
});

test('well-separated labels stay on their actual layer midpoint and sparse labels keep order', () => {
  const input={id:'spaced',x:0,y:0,w:500,h:500,labelSide:'right',gap:10,
    layers:[{id:'a',label:'A',fill:'#abc',thickness:50},{id:'middle',fill:'#bca',thickness:10},{id:'c',label:'C',fill:'#cab',thickness:50}]};
  const out=laminateParts(input,{},14);
  assert.deepEqual(out.texts.map(t=>t.text),['A','C']);
  for(const t of out.texts){const leader=out.paths.find(p=>p.id===t.id.replace(/-label$/,'-leader'));close(t.y-14*.3,commands(leader)[0][2]);}
});

test('packed label centres respect minimum spacing and frame limits; infeasible frames reject', () => {
  const input={id:'bounded',x:15,y:20,w:600,h:200,labelSide:'right',
    layers:Array.from({length:8},(_,i)=>({id:String(i),label:'Layer '+i,fill:'#abc',thickness:2}))};
  const out=laminateParts(input,{},16),centres=out.texts.map(t=>t.y-16*.3);
  for(let i=0;i<centres.length;i++){
    assert.ok(centres[i]>=input.y+16*.85&&centres[i]<=input.y+input.h-16*.5);
    if(i)assert.ok(centres[i]-centres[i-1]>=16*1.35-1e-5);
  }
  assert.throws(()=>laminateParts({...input,h:150},{},16),/labels do not fit/);
  assert.throws(()=>laminateParts({...input,w:50},{},16),/labels do not fit/);
});

test('declared electrode exits reserve a glyph-safe band without reordering labels', () => {
  const input={id:'contacts',x:0,y:0,w:500,h:300,labelSide:'right',gap:0,
    layers:['A','B','C'].map(id=>({id,label:id,fill:'#abc',thickness:4})),electrodes:{layer:1,width:18}};
  const out=laminateParts(input,{},14),centres=out.texts.map(t=>t.y-14*.3);
  [75.4,104.6,123.5].forEach((expected,i)=>close(centres[i],expected));
  assert.deepEqual(out.texts.map(t=>t.text),['A','B','C']);
  for(const c of centres)assert.ok(Math.abs(c-90)>=14*.9+2-1e-5);
  out.paths.filter(p=>p.id.endsWith('-leader')).forEach((p,i)=>close(commands(p)[0][2],[86,90,94][i]));
  const bent=laminateParts({...input,deflection:.4},{},14);assert.deepEqual(bent.nodes,out.nodes);assert.deepEqual(bent.texts,out.texts);
});

test('a row-feasible frame rejects when the declared contact band leaves no ordered fit', () => {
  const input={id:'tight-contact',x:0,y:0,w:950,h:205,size:18,labelSide:'right',
    layers:Array.from({length:8},(_,i)=>({id:String(i),label:'Layer '+i,fill:'#abc',thickness:6}))};
  assert.doesNotThrow(()=>laminateParts(input,{},18));
  assert.throws(()=>laminateParts({...input,electrodes:{layer:1,width:18}},{},18),/labels do not fit around electrode contact/);
});
