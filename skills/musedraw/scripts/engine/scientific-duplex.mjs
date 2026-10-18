// Original qualitative two-strand geometry; no sequence or chemical inference.
// The caller owns module attribution, terminals, labels and state composition.
import {measure} from './text.mjs';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = Number.isFinite;
const namedColours = new Set(('aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato transparent turquoise violet wheat white whitesmoke yellow yellowgreen').split(' '));

/** Pure native geometry expansion. Coordinates, amplitude and radii are pixels. */
export function duplexParts(b, p = {}, size = 16) {
  const bad = message => { throw new Error(`Scientific motif ${b?.id ?? '?'}: duplex ${message}`); };
  const keys = (value, allowed, name) => {
    if (!object(value) || Object.keys(value).some(key => !allowed.includes(key))) bad(`invalid or unknown ${name} fields`);
  };
  keys(b, ['id', 'type', 'kind', 'x', 'y', 'w', 'h', 'palette', 'size', 'turns', 'phase', 'amplitude', 'strandWidth', 'strands', 'sites', 'markerRadius', 'markerOffset', 'rungs', 'siteNames'], 'motif');
  if (typeof b.id !== 'string' || !b.id.trim()) bad('requires a nonempty id');
  if (!object(p) || b.palette !== undefined && !object(b.palette)) bad('palette must be a colour-role object');
  if (!finite(size) || size <= 0 || b.size !== undefined && (!finite(b.size) || b.size <= 0)) bad('size must be positive');
  for (const k of ['x', 'y', 'w', 'h']) if (!finite(b[k]) || ['w', 'h'].includes(k) && b[k] <= 0) bad('frame must be finite with positive dimensions');
  if (!finite(b.x + b.w) || !finite(b.y + b.h)) bad('frame bounds overflow');
  const colour = value => {
    if (typeof value !== 'string') bad('colours must be safe static CSS colours');
    if (/^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(value) || namedColours.has(value.toLowerCase())) return value;
    const match = value.match(/^(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\(([^()]*)\)$/i);
    if (match) {
      const values = match[2].trim().split(/[\s,/]+/);
      if ([3, 4].includes(values.length) && values.every(v => /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?%?$/i.test(v) && finite(parseFloat(v)))) return value;
    }
    bad('colours must be safe static CSS colours (no variables, URLs or markup)');
  };
  const encode = id => { try { return encodeURIComponent(id); } catch { bad('ids must be valid Unicode'); } };
  const turns = b.turns ?? 3, phase = b.phase ?? 0, amplitude = b.amplitude ?? Math.min(b.h * .16, 20);
  const stroke = b.strandWidth ?? 1.5, radius = b.markerRadius ?? 4, rungs = b.rungs ?? 0;
  const markerOffset = b.markerOffset === undefined ? 0 : b.markerOffset;
  if (!finite(turns) || turns < 1 || turns > 12) bad('turns must be in 1..12');
  if (!finite(phase)) bad('phase must be finite degrees');
  if (!finite(amplitude) || amplitude <= 0 || !finite(stroke) || stroke <= 0 || !finite(radius) || radius <= 0) bad('amplitude, strandWidth and markerRadius must be positive finite pixels');
  if (!finite(markerOffset) || markerOffset < 0) bad('markerOffset must be nonnegative finite pixels');
  if (b.siteNames !== undefined && typeof b.siteNames !== 'boolean') bad('siteNames must be boolean');
  if (!Number.isInteger(rungs) || rungs < 0 || rungs > 48) bad('rungs must be an integer in 0..48');
  const source = b.strands ?? [{id: 'a', fill: p.focus ?? '#3563C4'}, {id: 'b', fill: p.focus ?? '#3563C4'}];
  if (!Array.isArray(source) || source.length !== 2) bad('strands must contain exactly two entries');
  const strandIds = new Set();
  const strands = source.map(strand => {
    keys(strand, ['id', 'fill'], 'strand');
    if (typeof strand.id !== 'string' || !strand.id.trim() || strandIds.has(strand.id)) bad('strands require unique nonempty ids');
    strandIds.add(strand.id);
    return {id: strand.id, encoded: encode(strand.id), fill: colour(strand.fill)};
  });
  if (!Array.isArray(b.sites)) bad('sites must be an explicit array, which may be empty');
  const siteIds = new Set();
  const markerFill = colour(p.warm ?? '#C65B59');
  const sites = b.sites.map(site => {
    keys(site, ['id', 'at', 'marks', 'fill', 'label', 'name'], 'site');
    if (typeof site.id !== 'string' || !site.id.trim() || siteIds.has(site.id)) bad('sites require unique nonempty ids');
    siteIds.add(site.id);
    if (!finite(site.at) || site.at < 0 || site.at > 1) bad('site at must be in 0..1');
    if (!Array.isArray(site.marks) || new Set(site.marks).size !== site.marks.length || site.marks.some(id => !strandIds.has(id))) bad('marks require distinct existing strand ids');
    if (site.label !== undefined && (typeof site.label !== 'string' || !site.label.trim() || /[\r\n]/.test(site.label))) bad('site label must be a nonempty single line');
    if (site.label && measure(site.label,radius*.9,'Arial, sans-serif') > radius*1.4) bad('site label does not fit its marker; shorten the label or use a shared legend');
    if (site.name !== undefined && (typeof site.name !== 'string' || !site.name || site.name !== site.name.trim()
      || Array.from(site.name).length > 24 || /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f<>&]/u.test(site.name))) bad('site name must be safe short single-line text (1..24 characters)');
    if (site.name !== undefined) { try { encodeURIComponent(site.name); } catch { bad('site name must be valid Unicode'); } }
    return {id: site.id, encoded: encode(site.id), at: site.at, marks: [...site.marks], fill: site.fill === undefined ? markerFill : colour(site.fill), ...(site.label?{label:site.label}:{}), ...(site.name?{name:site.name}:{})};
  });
  const margin = radius + stroke, width = b.w - 2 * margin;
  if (width <= 0 || amplitude + markerOffset + margin > b.h / 2) bad('frame has insufficient space for amplitude, marker offset, markers and stroke');
  const x0 = b.x + margin, cy = b.y + b.h / 2, omega = 2 * Math.PI * turns;
  const phi = ((phase % 360 + 360) % 360) * Math.PI / 180;
  const point = (t, strand) => [x0 + width * t, cy + (strand === 0 ? 1 : -1) * amplitude * Math.sin(phi + omega * t)];
  const slope = (t, strand) => (strand === 0 ? 1 : -1) * amplitude * omega * Math.cos(phi + omega * t);
  // Quarter-phase anchors bound all controls. Site/rung anchors additionally
  // make their mathematical points exact endpoints of the native cubics.
  const anchors = new Set([0, 1, ...sites.map(site => site.at)]);
  for (let k = Math.ceil(phi / (Math.PI / 2)); k * Math.PI / 2 < phi + omega; k++) {
    const t = (k * Math.PI / 2 - phi) / omega;
    if (t > 0 && t < 1) anchors.add(t);
  }
  const rungAt = Array.from({length: rungs}, (_, i) => (i + 1) / (rungs + 1));
  for (const t of rungAt) anchors.add(t);
  const ts = [...anchors].sort((a, z) => a - z);
  const out = {nodes: [], edges: [], paths: [], texts: []};
  const rungColour = rungs ? colour(p.neutral ?? '#A3ADB8') : null;
  for (const [i, t] of rungAt.entries()) out.paths.push({id: `${b.id}-rung-${i}`, d: `M${point(t, 0)}L${point(t, 1)}`, fill: 'none', stroke: rungColour, width: stroke * .6});
  for (const [i, strand] of strands.entries()) {
    let d = `M${point(0, i)}`;
    for (let j = 1; j < ts.length; j++) {
      const a = ts[j - 1], z = ts[j], dt = z - a, A = point(a, i), Z = point(z, i);
      d += `C${A[0] + width * dt / 3} ${A[1] + slope(a, i) * dt / 3} ${Z[0] - width * dt / 3} ${Z[1] - slope(z, i) * dt / 3} ${Z}`;
    }
    out.paths.push({id: `${b.id}-strand-${strand.encoded}`, d, fill: 'none', stroke: strand.fill, width: stroke});
  }
  const markers = [], partIds = new Set(out.paths.map(path => path.id));
  for (const site of sites) for (const strandId of site.marks) {
    const index = strands.findIndex(strand => strand.id === strandId), centre = point(site.at, index);
    if (markerOffset > 0) {
      const side = (index === 0 ? 1 : -1) * Math.sin(phi + omega * site.at);
      if (Math.abs(side) < 1e-12) bad(`marker offset has no defined outer side at crossing site ${site.id}; move the site away from crossings`);
      centre[1] += Math.sign(side) * markerOffset;
    }
    const id = `${b.id}-site-${site.encoded}-${strands[index].encoded}`;
    if (partIds.has(id)) bad('native part ids collide; choose unambiguous site and strand ids');
    partIds.add(id);
    if (markers.some(marker => Math.hypot(marker.x - centre[0], marker.y - centre[1]) < 2 * radius - 1e-9)) bad(`markers collide near site ${site.id}; move the site away from crossings or increase site spacing`);
    markers.push({x: centre[0], y: centre[1]});
    out.nodes.push({id, shape: 'circle', x: centre[0] - radius, y: centre[1] - radius, w: radius * 2, h: radius * 2, fill: site.fill, stroke: 'none', label: site.label??'', labelPos: site.label?'inside':'none', radius: 0, overlap: true,
      ...(site.label?{size:radius*.9,padding:0,textColor:'#FFFFFF',weight:400}:{})});
  }
  // External site names label the explicit site once, independently of its
  // strand occupancy or chemical marker labels. They never move the backbone.
  const namedSites = b.siteNames === false ? [] : sites.filter(site => site.name);
  if (namedSites.length) {
    const baseline = b.y + size + 2, bottom = baseline + size * .3;
    const geometryTop = cy - amplitude - markerOffset - margin;
    if (bottom + 4 > geometryTop) bad('site names do not fit above the backbone; increase frame height or reduce name size');
    const ink = colour(p.ink ?? '#3C4749'), boxes = [];
    for (const site of namedSites) {
      const x = point(site.at, 0)[0];
      // Reserve beyond approximate font advance, while retaining the exact
      // mathematical x anchor. No clamping, scaling or hidden label relocation.
      const w = measure(site.name, size, 'Arial, sans-serif') * 1.25 + size * .2;
      if (x - w / 2 < b.x || x + w / 2 > b.x + b.w) bad(`site name ${site.id} exceeds the frame; shorten it or move the site inward`);
      if (boxes.some(box => Math.abs(box.x - x) < (box.w + w) / 2 + size * .2)) bad(`site names collide near ${site.id}; separate the sites or shorten their names`);
      boxes.push({x, w});
      out.texts.push({id: `${b.id}-siteName-${site.encoded}`, x, y: baseline, w,
        text: site.name, size, font: 'Arial, sans-serif', color: ink, anchor: 'middle'});
    }
  }
  return out;
}
