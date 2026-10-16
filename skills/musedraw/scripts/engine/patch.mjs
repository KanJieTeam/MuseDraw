// Exact, transactional text edits on an existing diagram scene.
const TEXT_KEYS = new Set(['label', 'text', 'sub', 'tag', 'title', 'date', 'num']);
const normalize = (value) => String(value).normalize('NFC').replace(/\s+/gu, '');
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);

export function textEntries(scene) {
  const result = [];
  function walk(value, pointer, header = false) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) return value.forEach((item, i) => walk(item, `${pointer}/${i}`, header));
    for (const [key, item] of Object.entries(value)) {
      if (key === 'reference' || key === 'style' || key === 'meta') continue;
      if (TEXT_KEYS.has(key) && (typeof item === 'string' || typeof item === 'number')) {
        if (key === 'label' && value.labelPos === 'none') continue;
        if (normalize(item)) result.push({ path: `${pointer}/${key}`, value: String(item), id: value.id });
      } else if (typeof item === 'object') walk(item, `${pointer}/${key}`, header);
    }
  }
  // Top-level metadata is only visible with an explicit page header.
  for (const key of ['nodes', 'zones', 'edges', 'texts', 'notes', 'bars', 'legend', 'participants', 'messages', 'sections']) walk(scene[key], `/${key}`);
  if (scene.header === true) for (const key of ['title', 'subtitle', 'kicker', 'figure']) {
    if (scene[key]) result.push({ path: `/${key}`, value: String(scene[key]) });
  }
  if (typeof scene.footer === 'string' && scene.footer) result.push({ path: '/footer', value: scene.footer });
  return result;
}

// Exact text replacements or explicit ID+field updates. A failed/ambiguous
// operation returns no scene; the input object/file is never changed.
export function patchScene(source, operations) {
  if (!Array.isArray(operations) || !operations.length) throw new Error('Patch must be a nonempty JSON array');
  const scene = structuredClone(source), changes = [];
  const resolve = (pointer) => {
    const parts = pointer.split('/').slice(1);
    const field = parts.pop();
    if (parts.some((v) => forbidden.has(v)) || forbidden.has(field)) throw new Error('Unsafe patch path');
    let target = scene;
    for (const key of parts) target = target[key];
    return { target, field };
  };
  const entries = () => {
    const direct = textEntries(scene);
    // Semantic blocks retain their content; generated coordinates are not edited.
    function visit(value, pointer) {
      if (!value || typeof value !== 'object') return;
      for (const [key, item] of Object.entries(value)) {
        if (TEXT_KEYS.has(key) && typeof item === 'string') direct.push({ path: `${pointer}/${key}`, value: item, id: value.id });
        else if (typeof item === 'object') visit(item, `${pointer}/${key}`);
      }
    }
    visit(scene.blocks, '/blocks');
    return direct;
  };
  for (const [i, operation] of operations.entries()) {
    if (!operation || typeof operation !== 'object' || Array.isArray(operation)) throw new Error(`Patch ${i}: expected an object`);
    const keys = Object.keys(operation);
    if (keys.some((key) => !['from', 'to', 'id', 'field', 'expect', 'value'].includes(key))) throw new Error(`Patch ${i}: unsupported field`);
    let matches, replacement;
    if (Object.hasOwn(operation, 'from')) {
      if (typeof operation.from !== 'string' || typeof operation.to !== 'string' || keys.some((key) => !['from', 'to'].includes(key))) throw new Error(`Patch ${i}: use {from,to} strings`);
      matches = entries().filter((entry) => entry.value === operation.from);
      replacement = operation.to;
    } else {
      if (typeof operation.id !== 'string' || !TEXT_KEYS.has(operation.field) || typeof operation.value !== 'string') throw new Error(`Patch ${i}: use {id,field,expect,value} for a text field`);
      matches = entries().filter((entry) => entry.id === operation.id && entry.path.endsWith(`/${operation.field}`));
      replacement = operation.value;
      if (operation.expect !== undefined && matches.some((entry) => entry.value !== operation.expect)) throw new Error(`Patch ${i}: expected text does not match; source changed`);
    }
    if (matches.length !== 1) throw new Error(`Patch ${i}: matched ${matches.length} text fields; use a unique ID and field instead of guessing`);
    const match = matches[0], { target, field } = resolve(match.path);
    target[field] = replacement;
    changes.push({ path: match.path, before: match.value, after: replacement });

  }
  return { scene, changes };
}
