// Scene preflight without browser, fonts or installed npm dependencies.
// Only the JSON Schema vocabulary used by our bundled scene.schema.json is
// evaluated here; this is not a general-purpose JSON Schema implementation.
import fs from 'node:fs';
import { expandBlocks } from './layouts.mjs';
import { layoutSequence } from './sequence.mjs';
import { objectViews } from './object-views.mjs';

const schema = JSON.parse(fs.readFileSync(new URL('../../references/scene.schema.json', import.meta.url), 'utf8'));
const own = (o, key) => Object.hasOwn(o, key) && o[key] !== undefined;
const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const child = (path, key) => `${path}/${String(key).replace(/~/g, '~0').replace(/\//g, '~1')}`;

export class SceneValidationError extends Error {
  constructor(issues, expanded = false) {
    super(`Invalid scene${expanded ? ' after layout expansion' : ''}:\n${issues.map(({ path, message }) => `  ${path || '/'}: ${message}`).join('\n')}`);
    this.name = 'SceneValidationError';
    this.issues = issues;
    this.expanded = expanded;
  }
}

function matchesType(value, type) {
  if (type === 'null') return value === null;
  if (type === 'object') return object(value);
  if (type === 'array') return Array.isArray(value);
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (type === 'integer') return Number.isInteger(value);
  return typeof value === type;
}

function check(value, rule, path, issues) {
  const fail = (message) => issues.push({ path, message });
  if (rule.$ref) {
    const key = rule.$ref.slice('#/definitions/'.length);
    check(value, schema.definitions[key], path, issues);
    return;
  }
  if (rule.type && ![rule.type].flat().some((t) => matchesType(value, t))) {
    fail(`must be ${[rule.type].flat().join(' or ')}${[rule.type].flat().includes('number') ? ' (finite)' : ''}`);
    return;
  }
  if (own(rule, 'const') && value !== rule.const) fail(`must equal ${JSON.stringify(rule.const)}`);
  if (rule.enum && !rule.enum.includes(value)) fail(`must be one of: ${rule.enum.join(', ')}`);
  if (typeof value === 'number') {
    if (rule.minimum !== undefined && value < rule.minimum) fail(`must be >= ${rule.minimum}`);
    if (rule.exclusiveMinimum !== undefined && value <= rule.exclusiveMinimum) fail(`must be > ${rule.exclusiveMinimum}`);
    if (rule.maximum !== undefined && value > rule.maximum) fail(`must be <= ${rule.maximum}`);
  }
  if (typeof value === 'string' && rule.pattern && !new RegExp(rule.pattern).test(value)) fail('must contain a non-whitespace character');
  if (Array.isArray(value)) {
    if (rule.minItems !== undefined && value.length < rule.minItems) fail(`must contain at least ${rule.minItems} items`);
    if (rule.maxItems !== undefined && value.length > rule.maxItems) fail(`must contain at most ${rule.maxItems} items`);
    if (rule.items) value.forEach((v, i) => check(v, rule.items, child(path, i), issues));
  }
  if (object(value)) {
    if (rule.additionalProperties === false) for (const key of Object.keys(value)) {
      if (!Object.hasOwn(rule.properties ?? {}, key)) issues.push({ path: child(path, key), message: 'is not a supported field' });
    }
    for (const key of rule.required ?? []) if (!own(value, key)) issues.push({ path: child(path, key), message: 'is required' });
    for (const [key, property] of Object.entries(rule.properties ?? {})) if (own(value, key)) check(value[key], property, child(path, key), issues);
  }
  for (const branch of rule.allOf ?? []) check(value, branch, path, issues);
  if (rule.anyOf) {
    const branches = rule.anyOf.map((branch) => { const errors = []; check(value, branch, path, errors); return errors; });
    if (branches.every((errors) => errors.length)) fail('must match one of the allowed forms');
  }
  if (rule.if) {
    const errors = [];
    check(value, rule.if, path, errors);
    if (!errors.length) check(value, rule.then, path, issues);
  }
}

function unique(items, path, issues, defaultId) {
  const seen = new Map();
  items.forEach((item, i) => {
    const id = item.id ?? defaultId?.(i);
    if (id === undefined) return;
    const here = `${path}/${i}/id`;
    if (seen.has(id)) issues.push({ path: here, message: `duplicate ID ${JSON.stringify(id)}; first defined at ${seen.get(id)}` });
    else seen.set(id, here);
  });
  return seen;
}

function references(edges, nodes, path, issues) {
  edges.forEach((edge, i) => {
    for (const key of ['from', 'to']) if (!nodes.has(edge[key])) issues.push({ path: `${path}/${i}/${key}`, message: `unknown node ID ${JSON.stringify(edge[key])}` });
  });
}

// Structural checks happen before layout code can consume malformed values.
// Relationships involving generated nodes are checked after layout expansion.
export function validateScene(scene) {
  const issues = [];
  check(scene, schema, '', issues);
  if (issues.length) return issues;
  unique(scene.nodes ?? [], '/nodes', issues);
  unique(scene.blocks ?? [], '/blocks', issues, (i) => `b${i + 1}`);
  if (scene.type === 'sequence') {
    const participants = unique(scene.participants, '/participants', issues);
    references(scene.messages ?? [], participants, '/messages', issues);
    for (const [i, section] of (scene.sections ?? []).entries()) {
      for (const key of ['from', 'to']) if (section[key] > (scene.messages?.length ?? 0)) issues.push({ path: `/sections/${i}/${key}`, message: 'must reference an existing message (1-based)' });
      if (section.from > section.to) issues.push({ path: `/sections/${i}/to`, message: 'must be >= from' });
    }
  }
  for (const [i, note] of (scene.notes ?? []).entries()) {
    if (note.row !== undefined && (scene.type !== 'sequence' || note.row > (scene.messages?.length ?? 0))) issues.push({ path: `/notes/${i}/row`, message: 'must reference an existing sequence message (1-based)' });
  }
  for (const [i, block] of (scene.blocks ?? []).entries()) {
    const path = `/blocks/${i}`;
    if (block.type === 'object-views') {
      const entities = unique(block.entities, `${path}/entities`, issues);
      const definitions = new Map(block.entities.map(e=>[e.id,e]));
      unique(block.views, `${path}/views`, issues);
      for (const [j, view] of block.views.entries()) {
        const used = new Set();
        for (const [k, item] of view.items.entries()) {
          const here = `${path}/views/${j}/items/${k}`;
          if (!entities.has(item.entity)) issues.push({ path: `${here}/entity`, message: `unknown entity ID ${JSON.stringify(item.entity)}` });
          if (used.has(item.entity)) issues.push({ path: `${here}/entity`, message: 'an entity may appear only once per view; give distinct objects distinct IDs' });
          used.add(item.entity);
          if (item.state !== undefined && !definitions.get(item.entity)?.scientific)
            issues.push({path:`${here}/state`,message:'state is only supported by scientific entities'});
          const dimensions = item.size ?? definitions.get(item.entity)?.extent;
          if (!dimensions) issues.push({ path: `${here}/size`, message: 'define extent once on the entity, or an explicit size for this pose' });
          else if (item.at.some((v, axis) => v - dimensions[axis] / 2 < -1e-9 || v + dimensions[axis] / 2 > 1 + 1e-9))
            issues.push({ path: `${here}/at`, message: 'object bounds must fit within the view (at is centre, size is width/height)' });
        }
      }
      // The motif grammar owns kind-specific fields and sparse-state semantics.
      // Expand purely before a browser starts; do not let an override conceal an
      // invalid canonical definition or inject a second object frame/identity.
      if (!issues.length && block.entities.some(e => e.scientific !== undefined)) {
        try { objectViews(block); }
        catch (error) { issues.push({path,message:error.message}); }
      }
    }
    if (block.type === 'grid') unique(block.items ?? [], `${path}/items`, issues);
    if (block.type === 'swimlane') {
      const lanes = unique(block.lanes ?? [], `${path}/lanes`, issues);
      unique(block.steps ?? [], `${path}/steps`, issues);
      for (const [j, step] of (block.steps ?? []).entries()) {
        if (!lanes.has(step.lane)) issues.push({ path: `${path}/steps/${j}/lane`, message: `unknown lane ID ${JSON.stringify(step.lane)}` });
        if (step.col >= (block.cols ?? 6)) issues.push({ path: `${path}/steps/${j}/col`, message: `must be less than cols (${block.cols ?? 6})` });
      }
    }
    if (block.type === 'table') {
      for (const [j, row] of (block.rows ?? []).entries()) if (row.cells.length > block.columns.length) issues.push({ path: `${path}/rows/${j}/cells`, message: `has more cells than columns (${block.columns.length})` });
    }
    if (block.type === 'gantt') {
      unique(block.tasks ?? [], `${path}/tasks`, issues);
      for (const [j, task] of (block.tasks ?? []).entries()) {
        const spans = task.milestone ? [[task.start, task.start]] : task.segments ?? [[task.start, task.end]];
        for (const [k, span] of spans.entries()) {
          const here = task.segments && !task.milestone ? `${path}/tasks/${j}/segments/${k}` : `${path}/tasks/${j}`;
          const [start, end, label] = span;
          if (![start, end].every((v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= block.columns.length)) issues.push({ path: here, message: `start/end must be finite numbers between 0 and ${block.columns.length}` });
          else if (end < start) issues.push({ path: here, message: 'end must be >= start' });
          if (label !== undefined && typeof label !== 'string') issues.push({ path: here, message: 'segment label must be a string' });
        }
      }
    }
  }
  return issues;
}

export function prepareScene(scene, theme) {
  let issues = validateScene(scene);
  if (issues.length) throw new SceneValidationError(issues);
  const expanded = scene.type === 'sequence' || scene.blocks?.length > 0;
  if (scene.type === 'sequence') scene = layoutSequence(scene, theme);
  scene = expandBlocks(scene, theme);
  // Validate generated geometry too (for example a Gantt bar narrower than its
  // padding). Undefined optional JS fields produced by layouts count as absent.
  issues = [];
  for (const kind of ['nodes', 'zones', 'edges', 'texts', 'lines', 'paths', 'notes']) {
    for (const [i, item] of (scene[kind] ?? []).entries()) check(item, schema.properties[kind].items, `/${kind}/${i}`, issues);
  }
  const nodes = unique(scene.nodes ?? [], '/nodes', issues);
  const modules=unique(scene.nativeModules??[], '/nativeModules',issues);
  for(const [i,m] of (scene.nativeModules??[]).entries())if(!m.id||typeof m.id!=='string')issues.push({path:`/nativeModules/${i}/id`,message:'requires a non-empty module ID'});
  for(const kind of ['nodes','edges','paths','texts'])for(const [i,item] of (scene[kind]??[]).entries())
    if(item.nativeModule!==undefined&&!modules.has(item.nativeModule))issues.push({path:`/${kind}/${i}/nativeModule`,message:'unknown native module'});
  references(scene.edges ?? [], nodes, '/edges', issues);
  for (const [i, note] of (scene.notes ?? []).entries()) if (note.target != null && !nodes.has(note.target)) issues.push({ path: `/notes/${i}/target`, message: `unknown node ID ${JSON.stringify(note.target)}` });
  if (issues.length) throw new SceneValidationError(issues, expanded);
  return scene;
}
