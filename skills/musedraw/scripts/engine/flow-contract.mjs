// A composition contract survives visual editing. It checks declared content,
// not whether the author's interpretation of a natural-language brief is true.
const plain = s => String(s ?? '').replace(/\s+/gu, '');
export function attachFlowContract(scene, input, frames) {
  scene.meta.flowContract = {
    version: 1,
    lanes: frames,
    nodes: input.nodes.map(({id, label, lane, shape}) => ({id, label, lane, shape})),
    links: input.links.map(({from, to, label, feedback}) => ({from, to, label: label ?? '', feedback}))
  };
  return scene;
}

export function checkFlowContract(scene) {
  const c = scene.meta?.flowContract;
  if (c === undefined) return [];
  const issues = [], fail = message => issues.push({path:'/meta/flowContract', message});
  if (c?.version !== 1 || !Array.isArray(c.nodes) || !Array.isArray(c.links) || !Array.isArray(c.lanes)) {
    fail('invalid flow contract; regenerate from the semantic composition'); return issues;
  }
  if(c.nodes.some(n=>!n||typeof n.id!=='string'||typeof n.label!=='string'||typeof n.lane!=='string'||!['box','diamond'].includes(n.shape)) ||
     c.links.some(l=>!l||typeof l.from!=='string'||typeof l.to!=='string'||typeof l.label!=='string'||typeof l.feedback!=='boolean') ||
     c.lanes.some(f=>!f||typeof f.id!=='string')) {
    fail('invalid contract entries; regenerate from the semantic composition');return issues;
  }
  const frames = new Map(c.lanes.map(f => [f.id, f]));
  for (const f of c.lanes) if (![f.x,f.y,f.w,f.h].every(Number.isFinite) || f.w <= 0 || f.h <= 0) {
    fail('invalid responsibility bounds'); return issues;
  }
  const nodes = new Map((scene.nodes ?? []).map(n => [n.id,n]));
  if (nodes.size !== c.nodes.length) fail('operation count changed; edit the semantic composition and recompose');
  for (const expected of c.nodes) {
    const n = nodes.get(expected.id), f = frames.get(expected.lane);
    if (!n) { fail(`missing operation ${expected.id}`); continue; }
    if (plain(n.label) !== plain(expected.label) || (n.shape ?? 'box') !== expected.shape)
      fail(`operation ${expected.id} changed; edit the semantic composition and recompose`);
    if (!f || n.x < f.x-.1 || n.y < f.y-.1 || n.x+n.w > f.x+f.w+.1 || n.y+n.h > f.y+f.h+.1)
      fail(`operation ${expected.id} left its declared responsibility ${expected.lane}`);
  }
  const signature = e => JSON.stringify([e.from,e.to,plain(e.label),e.feedback ?? e.kind === 'feedback']);
  const expected = c.links.map(signature).sort(), actual = (scene.edges ?? []).map(signature).sort();
  if (JSON.stringify(expected) !== JSON.stringify(actual)) fail('relationships or conditions changed; edit the semantic composition and recompose');
  return issues;
}
