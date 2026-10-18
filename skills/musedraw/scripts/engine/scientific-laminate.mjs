// A geometric laminate motif, not a constitutive/material simulation.
// The caller owns module terminals, nativeModule attribution and state layouts.
import {measure} from './text.mjs';

const number = value => Number.isFinite(value);
const r = value => Number(value.toFixed(6));
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Expand one frame into native geometry, without mutating b or p.
 * thickness, gap and electrode width are logical pixels. deflection is the
 * actual centre displacement / frame height (0..0.4), positive downwards.
 * Omitted thickness defaults to h*0.12/layerCount, reduced only to fit explicit
 * thicknesses/gaps. Anchor geometry always reserves the full 0.4h range, so a
 * deflection-only edit changes cubic control/interior points, not ends.
 */
export function laminateParts(b, p = {}, size = b?.size ?? 16) {
  const bad = message => { throw new Error(`Scientific motif ${b?.id ?? '?'}: laminate ${message}`); };
  if (!plain(b) || typeof b.id !== 'string' || !b.id.trim()) bad('requires an id');
  for (const key of ['x', 'y', 'w', 'h']) {
    if (!number(b[key]) || (key === 'w' || key === 'h') && b[key] <= 0) bad('requires a finite, positive frame');
  }
  if (!number(b.x + b.w) || !number(b.y + b.h)) bad('frame bounds overflow');
  if (!plain(p) || !number(size) || size <= 0) bad('requires a palette and positive label size');
  const common = ['id', 'type', 'kind', 'x', 'y', 'w', 'h', 'palette', 'size'];
  for (const key of Object.keys(b)) {
    if (![...common, 'layers', 'deflection', 'gap', 'electrodes', 'labelSide', 'load'].includes(key)) bad(`unsupported field ${key}`);
  }
  const colour = token => {
    if (typeof token !== 'string' || !token.trim()) bad('fill must be a colour role or CSS colour');
    const value = Object.hasOwn(p, token) ? p[token] : token;
    // Deliberately no URLs, declarations, markup or external paint resources.
    if (typeof value !== 'string' || !/^(?:#[\da-f]{3,4}|#[\da-f]{6}|#[\da-f]{8}|[a-z]+|(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\([\da-z.,%+\-/\s]+\))$/i.test(value)) bad('unsafe or unsupported colour syntax');
    return value;
  };
  const ink = colour(p.ink ?? '#3C4749');
  if (!Array.isArray(b.layers) || b.layers.length < 2 || b.layers.length > 8) bad('requires 2..8 layers');
  const ids = new Set();
  const layers = b.layers.map(layer => {
    if (!plain(layer) || Object.keys(layer).some(key => !['id', 'label', 'fill', 'thickness'].includes(key))) bad('invalid layer fields');
    if (typeof layer.id !== 'string' || !layer.id.trim() || ids.has(layer.id)) bad('layers need unique nonempty ids');
    ids.add(layer.id);
    let encoded;
    try { encoded = encodeURIComponent(layer.id); } catch { bad('layer id is not valid Unicode'); }
    if (layer.label !== undefined && (typeof layer.label !== 'string' || /[\r\n]/.test(layer.label))) bad('layer labels must be single-line strings');
    if (layer.thickness !== undefined && (!number(layer.thickness) || layer.thickness <= 0)) bad('thickness must be positive pixels');
    return {id: `${b.id}-layer-${encoded}`, label: layer.label ?? '', fill: colour(layer.fill), thickness: layer.thickness};
  });
  const deflection = b.deflection ?? 0, gap = b.gap ?? 0, labelSide = b.labelSide ?? 'none';
  if (!number(deflection) || deflection < 0 || deflection > 0.4) bad('deflection must be in 0..0.4');
  if (!number(gap) || gap < 0) bad('gap must be nonnegative pixels');
  if (!['none', 'right'].includes(labelSide)) bad('labelSide must be none or right');
  if (b.load !== undefined && (typeof b.load !== 'string' || !/^[A-Za-z]$/.test(b.load))) bad('load must be a single Latin force letter');
  const stroke = Math.min(1.15, b.w / 200, b.h / 200), inset = stroke / 2;
  const innerH = b.h - 2 * inset, capacity = innerH - b.h * 0.4;
  const explicit = layers.reduce((sum, layer) => sum + (layer.thickness ?? 0), 0);
  const missing = layers.filter(layer => layer.thickness === undefined).length;
  const remaining = capacity - gap * (layers.length - 1) - explicit;
  if (remaining < -1e-8 || missing && remaining <= 0) bad('thicknesses/gaps do not fit with the fixed 0.4h deflection reserve');
  const implicit = missing ? Math.min(b.h * 0.12 / layers.length, remaining / missing) : 0;
  for (const layer of layers) layer.thickness ??= implicit;
  const stackH = layers.reduce((sum, layer) => sum + layer.thickness, 0) + gap * (layers.length - 1);
  if (layers.some(layer => layer.thickness < 0.00001)) bad('layer thickness is too small for stable native geometry');

  const labelled = labelSide === 'right' ? layers.filter(layer => layer.label) : [];
  // A conservative reserve accommodates real font advances beyond the helper's
  // approximate measurement (notably long strings of wide capitals).
  const labelW = labelled.length ? Math.max(...labelled.map(layer => measure(layer.label, size))) * 1.25 + size * 0.2 : 0;
  const lead = labelled.length ? Math.max(8, size * 0.7) : 0;
  const left = b.x + inset, right = b.x + b.w - inset - labelW - lead, width = right - left;
  if (width <= stroke * 4 || labelled.length * size * 1.35 > innerH) bad('labels do not fit the frame; enlarge it or use labelSide none');
  const top = b.y + inset + (innerH - stackH - b.h * 0.4) / 2;
  const delta = deflection * b.h;
  let electrode = null;
  if (b.electrodes !== undefined) {
    const e = b.electrodes;
    if (!plain(e) || Object.keys(e).some(key => !['layer', 'width', 'fill'].includes(key)) || !Number.isInteger(e.layer) || e.layer < 0 || e.layer >= layers.length) bad('electrodes need an existing layer index');
    const ew = e.width ?? width * 0.06;
    if (!number(ew) || ew <= 0 || ew >= width / 2) bad('electrode width must be positive and less than half the material width');
    electrode = {layer: e.layer, width: ew, fill: colour(e.fill ?? ink)};
  }
  const end = electrode?.width ?? 0;
  const a = left + end, z = right - end, mid = (a + z) / 2;
  const c1 = a + (z - a) / 6, c2 = a + (z - a) / 3;
  const c3 = z - (z - a) / 3, c4 = z - (z - a) / 6;
  const out = {nodes: [], edges: [], paths: [], texts: []};
  let y = top;
  layers.forEach((layer, i) => {
    const bottom = y + layer.thickness;
    // Matching upper/lower contours preserve the specified vertical thickness.
    // Each half has horizontal tangents at its fixed end and centre. Matching
    // reverse bottom cubics preserve thickness without an end-pad corner.
    const d = `M${r(left)} ${r(y)}L${r(a)} ${r(y)}C${r(c1)} ${r(y)} ${r(c2)} ${r(y + delta)} ${r(mid)} ${r(y + delta)}C${r(c3)} ${r(y + delta)} ${r(c4)} ${r(y)} ${r(z)} ${r(y)}L${r(right)} ${r(y)}L${r(right)} ${r(bottom)}L${r(z)} ${r(bottom)}C${r(c4)} ${r(bottom)} ${r(c3)} ${r(bottom + delta)} ${r(mid)} ${r(bottom + delta)}C${r(c2)} ${r(bottom + delta)} ${r(c1)} ${r(bottom)} ${r(a)} ${r(bottom)}L${r(left)} ${r(bottom)}Z`;
    out.paths.push({id: layer.id, d, fill: layer.fill, stroke: ink, width: stroke});
    if (electrode?.layer === i) {
      for (const [side, x] of [['left', left], ['right', right - electrode.width]]) {
        out.nodes.push({id: `${b.id}-electrode-${side}`, shape: 'box', x: r(x), y: r(y), w: r(electrode.width), h: r(layer.thickness), fill: electrode.fill, stroke: 'none', label: '', labelPos: 'none', radius: 0, overlap: true});
      }
    }
    if (labelSide === 'right' && layer.label) {
      const index = labelled.indexOf(layer);
      const centre = b.y + inset + innerH * (index + 0.5) / labelled.length;
      const tx = right + lead, anchorY = y + layer.thickness / 2;
      out.paths.push({id: `${layer.id}-leader`, d: `M${r(right)} ${r(anchorY)}L${r(right + lead * 0.4)} ${r(anchorY)}L${r(tx - 2)} ${r(centre)}`, fill: 'none', stroke: ink, width: stroke * 0.7});
      out.texts.push({id: `${layer.id}-label`, x: r(tx), y: r(centre + size * 0.3), text: layer.label, size, color: ink, anchor: 'start'});
    }
    y = bottom + gap;
  });
  if (b.load !== undefined) {
    // Explicit qualitative force only. The material is never moved to make room.
    const tip = top + delta - 2.5;
    const tail = b.y + inset + size * 0.35;
    const head = Math.max(3, size * 0.3), halfHead = head * 0.45;
    const tx = mid + Math.max(5, size * 0.32);
    const ty = b.y + inset + size * 1.2;
    const tw = Math.max(size * 0.55, measure(b.load, size, 'Times New Roman') * 1.2);
    const vectorY = ty - size * 0.95, vectorHead = size * 0.12;
    if (tail >= top || tip - tail < Math.max(8, size * 0.5)
      || mid - halfHead < b.x + inset || mid + halfHead > b.x + b.w - inset
      || tx + tw > b.x + b.w - inset
      || vectorY - vectorHead < b.y + inset
      || ty + size * 0.28 > top - 2.5) bad('load and force symbol do not fit above the fixed material baseline');
    out.paths.push({id: `${b.id}-load-arrow`, d: `M${r(mid)} ${r(tail)}L${r(mid)} ${r(tip)}M${r(mid-halfHead)} ${r(tip-head)}L${r(mid)} ${r(tip)}L${r(mid+halfHead)} ${r(tip-head)}`, fill: 'none', stroke: ink, width: Math.min(1.4, stroke * 1.3)});
    out.texts.push({id: `${b.id}-load-symbol`, x: r(tx), y: r(ty), text: b.load, size, font: 'Times New Roman, serif', italic: true, color: ink, anchor: 'start', w: r(tw)});
    out.paths.push({id: `${b.id}-load-symbol-vector`, d: `M${r(tx)} ${r(vectorY)}L${r(tx+tw)} ${r(vectorY)}M${r(tx+tw-vectorHead)} ${r(vectorY-vectorHead)}L${r(tx+tw)} ${r(vectorY)}L${r(tx+tw-vectorHead)} ${r(vectorY+vectorHead)}`, fill: 'none', stroke: ink, width: Math.min(1, stroke)});
  }
  return out;
}
