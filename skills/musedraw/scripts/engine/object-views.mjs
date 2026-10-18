// Repeat object identities across schematic views without drawing process cards.
// Positions/sizes are fractions of each view's drawing area; the block owns
// panel placement. Only explicitly supplied items are drawn: no fake data or
// transition arrows. Ordinary scene edges can target `${block}-${view}-${entity}`.
import { scientificMotif } from './scientific-motifs.mjs';
const r2 = n => Math.round(n * 100) / 100;
const idPart = value => encodeURIComponent(value).replace(/-/g, '%2D');
export const viewNodeId = (block, view, entity) => [block, view, entity].map(idPart).join('-');
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function scientificState(b, entity, item) {
  const bad = message => { throw new Error(`object-views ${b.id}, entity ${entity.id}: ${message}`); };
  if (!object(entity.scientific)) bad('scientific must be a motif parameter object');
  for (const key of Object.keys(entity)) if (!['id', 'extent', 'label', 'labelPos', 'scientific'].includes(key)) bad(`unsupported scientific entity field ${key}`);
  if (entity.label !== undefined && typeof entity.label !== 'string') bad('label must be a string');
  if (entity.labelPos !== undefined && !['above', 'below', 'left', 'right', 'none'].includes(entity.labelPos)) bad('scientific labels must be outside the object or none');
  for (const key of ['id', 'type', 'x', 'y', 'w', 'h']) if (Object.hasOwn(entity.scientific, key)) bad(`scientific cannot own ${key}; the view owns the frame and identity`);
  const motif = structuredClone(entity.scientific);
  const state = item.state;
  if (state === undefined) return motif;
  if (!object(state)) bad('state must be an object');
  if (motif.kind === 'duplex') {
    if (Object.keys(state).some(key => key !== 'marks')) bad('duplex state only supports marks');
    if (Object.hasOwn(state, 'marks')) {
      if (!object(state.marks)) bad('state marks must map existing site IDs to strand ID arrays');
      if (!Array.isArray(motif.sites)) bad('duplex sites must be an explicit array');
      const sites = new Map(motif.sites.map(site => [site?.id, site]));
      const strands = new Set((motif.strands ?? [{id: 'a'}, {id: 'b'}]).map(strand => strand?.id));
      for (const [siteId, marks] of Object.entries(state.marks)) {
        if (!sites.has(siteId)) bad(`unknown duplex site ${siteId}`);
        if (!Array.isArray(marks) || new Set(marks).size !== marks.length || marks.some(id => !strands.has(id))) bad(`marks for ${siteId} require distinct existing strand IDs`);
        sites.get(siteId).marks = [...marks];
      }
    }
  } else if (motif.kind === 'laminate') {
    if (Object.keys(state).some(key => !['deflection', 'load'].includes(key))) bad('laminate state only supports deflection and load');
    if (Object.hasOwn(state, 'deflection')) {
      if (!Number.isFinite(state.deflection) || state.deflection < 0 || state.deflection > .4) bad('state deflection must be in 0..0.4');
      motif.deflection = state.deflection;
    }
    if (Object.hasOwn(state, 'load')) {
      if (typeof state.load !== 'string' || !/^[A-Za-z]$/.test(state.load)) bad('state load must be a single Latin force letter');
      motif.load = state.load;
    }
  } else bad(`state is not supported for scientific kind ${motif.kind}`);
  return motif;
}

export function objectViews(b, theme) {
  const columns = Math.min(b.columns ?? b.views.length, b.views.length);
  const rows = Math.ceil(b.views.length / columns);
  const gap = b.gap ?? 72, rowGap = b.rowGap ?? 64, headingH = b.headingH ?? 44;
  const viewW = (b.w - gap * (columns - 1)) / columns;
  const viewH = (b.h - rowGap * (rows - 1)) / rows;
  const artH = viewH - headingH;
  if (viewW <= 0 || artH <= 0) throw new Error(`object-views ${b.id}: frame too small for views and gaps`);
  const entities = new Map(b.entities.map(e => [e.id, e]));
  const nodes = [], texts = [], edges = [], paths = [], nativeModules = [];
  const labelled = new Set();
  b.views.forEach((view, i) => {
    const x = b.x + (i % columns) * (viewW + gap);
    const y = b.y + Math.floor(i / columns) * (viewH + rowGap);
    if (view.label) texts.push({ x: r2(x), y: r2(y + 20), w: r2(viewW), text: view.label,
      size: b.size ?? 16, weight: 600, color: 'ink' });
    for (const item of view.items) {
      const entity = entities.get(item.entity);
      if (!entity) throw new Error(`object-views ${b.id}: unknown entity ${item.entity}`);
      const show = item.showLabel ?? !labelled.has(item.entity);
      const { id: entityId, extent, ...appearance } = entity;
      const dimensions = item.size ?? extent;
      if (entity.scientific !== undefined) {
        if (!Array.isArray(dimensions) || dimensions.length !== 2 || !dimensions.every(v => Number.isFinite(v) && v > 0)) throw new Error(`object-views ${b.id}: scientific entity ${entityId} needs a positive extent or item size`);
        const frame = { id: viewNodeId(b.id, view.id, entityId), type: 'scientific',
          x: r2(x + viewW * item.at[0] - viewW * dimensions[0] / 2),
          y: r2(y + headingH + artH * item.at[1] - artH * dimensions[1] / 2),
          w: r2(viewW * dimensions[0]), h: r2(artH * dimensions[1]) };
        const motif = scientificState(b, entity, item);
        if (motif.kind === 'duplex') {
          if (motif.siteNames !== undefined && typeof motif.siteNames !== 'boolean') throw new Error(`object-views ${b.id}: scientific siteNames must be boolean`);
          motif.siteNames = item.showSiteNames ?? (show && motif.siteNames !== false);
        }
        else if (item.showSiteNames !== undefined) throw new Error(`object-views ${b.id}: showSiteNames is only supported by duplex entities`);
        // Validate the canonical definition too: a view override must not hide
        // invalid source marks or other invalid parameters. Both calls are pure.
        if (item.state !== undefined) scientificMotif({ ...structuredClone(entity.scientific), ...frame }, theme);
        const parts = scientificMotif({ ...motif, ...frame }, theme);
        const anchor = parts.nodes.find(node => node.id === frame.id);
        Object.assign(anchor, { label: show ? (entity.label ?? '') : '',
          labelPos: show && entity.label ? (entity.labelPos ?? 'below') : 'none' });
        nodes.push(...parts.nodes); edges.push(...parts.edges); paths.push(...parts.paths);
        texts.push(...parts.texts); nativeModules.push(...parts.nativeModules);
        if (show) labelled.add(item.entity);
        continue;
      }
      if (item.state !== undefined) throw new Error(`object-views ${b.id}: primitive entity ${entityId} does not support state`);
      if (item.showSiteNames !== undefined) throw new Error(`object-views ${b.id}: showSiteNames is only supported by duplex entities`);
      const w = viewW * dimensions[0], h = artH * dimensions[1];
      nodes.push({ ...appearance, id: viewNodeId(b.id, view.id, entityId),
        labelPos: show ? (entity.labelPos ?? 'below') : 'none',
        label: show ? entity.label : '', overlap: item.overlap ?? false,
        x: r2(x + viewW * item.at[0] - w / 2),
        y: r2(y + headingH + artH * item.at[1] - h / 2),
        w: r2(w), h: r2(h) });
      if (show) labelled.add(item.entity);
    }
  });
  return { nodes, texts, edges, paths, nativeModules };
}
