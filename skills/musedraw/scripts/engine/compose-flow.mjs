// Semantic flow brief -> native scene. No browser, network or drawing format code.
import {composeLaneFlow} from './compose-flow-lanes.mjs';
import {attachFlowContract} from './flow-contract.mjs';
const round = n => Math.round(n * 100) / 100;
const fail = (where, message) => { throw new Error(`Flow brief ${where}: ${message}`); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const units = text => [...text].reduce((sum, ch) => sum + (/[^\u0000-\u00ff]/u.test(ch) ? 1 : /[MW@#]/.test(ch) ? .85 : .56), 0);
const idPart = id => encodeURIComponent(id).replaceAll('-', '%2D').replaceAll('~', '%7E');
function phraseBreaks(text) {
  const options = [];
  if (text.startsWith('是否') && text.length > 2) options.push([text.slice(0, 2), text.slice(2)]);
  for (let i = 2; i < text.length - 1; i++) if ('与及和'.includes(text[i])) options.push([text.slice(0, i), text.slice(i)]);
  return options;
}
const keys = (value, allowed, where) => {
  const unknown = Object.keys(value).find(key => !allowed.includes(key));
  if (unknown !== undefined) fail(`${where}/${unknown}`, 'unknown field; use the documented semantic brief');
};

function string(value, where, max, optional = false) {
  if (optional && value === undefined) return undefined;
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) fail(where, `expected nonempty text, at most ${max} characters`);
  return value.trim();
}

// Explicit newlines make the compiler's conservative measurements reproducible.
// Do not remove words, substitute facts or shrink all text to fit a fixed frame.
function wrap(text, width, fontSize) {
  const result = [];
  for (const paragraph of text.split(/\r?\n/)) {
    const phrase = units(paragraph) * fontSize > width && phraseBreaks(paragraph).find(parts => parts.every(part => units(part) * fontSize <= width));
    if (phrase) { result.push(...phrase); continue; }
    const capacity = Math.max(1, Math.floor(width / fontSize));
    const balancedWidth = Math.min(width, Math.max(1, Math.ceil(units(paragraph) / Math.max(1, Math.ceil(units(paragraph) / capacity)))) * fontSize);
    let line = '';
    // Amounts, decimal values and dates must not become different-looking
    // quantities across lines. Keep their unit with them when it fits a line.
    const tokens = /\d/.test(paragraph)
      ? paragraph.match(/[A-Za-z0-9]+(?:[.,:/-][A-Za-z0-9]+)*(?:\s*(?:亿元|万元|元|工作日|小时|分钟|秒|天|周|月|年|%|％))?|./gu) ?? []
      : [...paragraph];
    for (const token of tokens) {
      if (/\d/.test(token) && units(token) * fontSize > width) fail('/nodes', 'a numeric value or date exceeds the label width; use a wider custom composition rather than splitting the quantity');
      const parts = units(token) * fontSize > width ? [...token] : [token];
      for (const part of parts) {
        if (line && units(line + part) * fontSize > balancedWidth) { result.push(line.trimEnd()); line = part.trimStart(); }
        else line += part;
      }
    }
    result.push(line.trimEnd());
  }
  return result.join('\n');
}

const overlaps = (a, b, gap = 0) => a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;
const labelBox = (label, at) => {
  const lines = label.split('\n'), w = Math.max(...lines.map(units)) * 15 + 16, h = lines.length * 18.75 + 6;
  return { x: at[0] - w / 2, y: at[1] - h / 2, w, h };
};

function segmentHits(a, b, box) {
  const inset = 1;
  if (Math.abs(a[0] - b[0]) < .1) return a[0] > box.x + inset && a[0] < box.x + box.w - inset && Math.max(a[1], b[1]) > box.y + inset && Math.min(a[1], b[1]) < box.y + box.h - inset;
  if (Math.abs(a[1] - b[1]) < .1) return a[1] > box.y + inset && a[1] < box.y + box.h - inset && Math.max(a[0], b[0]) > box.x + inset && Math.min(a[0], b[0]) < box.x + box.w - inset;
  return true;
}

function validate(brief) {
  if (!object(brief) || brief.method !== 'flow') fail('/method', 'expected "flow"');
  keys(brief, ['method', 'theme', 'width', 'lanes', 'nodes', 'links'], '');
  if (!Array.isArray(brief.nodes) || !brief.nodes.length || brief.nodes.length > 36) fail('/nodes', 'supported range is 1–36 nodes; split larger flows');
  if (!Array.isArray(brief.links) || brief.links.length > 72) fail('/links', 'expected at most 72 links; split larger flows');
  const width = brief.width ?? 1200;
  if (typeof width !== 'number' || !Number.isFinite(width) || width < 1200 || width > 3200) fail('/width', 'expected 1200–3200 pixels; width controls output resolution');
  if (brief.theme !== undefined) string(brief.theme, '/theme', 80);
  if (brief.lanes !== undefined && (!Array.isArray(brief.lanes) || !brief.lanes.length || brief.lanes.length > 8)) fail('/lanes', 'expected 1–8 roles');
  const laneIds = new Set();
  const lanes = (brief.lanes ?? [{ id: '__flow', label: '' }]).map((lane, i) => {
    if (!object(lane)) fail(`/lanes/${i}`, 'expected an object');
    keys(lane, ['id', 'label'], `/lanes/${i}`);
    const id = string(lane.id, `/lanes/${i}/id`, 160);
    if (laneIds.has(id)) fail(`/lanes/${i}/id`, `duplicate role ${JSON.stringify(id)}`);
    laneIds.add(id);
    return { id, label: brief.lanes ? string(lane.label, `/lanes/${i}/label`, 80) : '' };
  });
  const ids = new Set();
  const nodes = brief.nodes.map((node, i) => {
    if (!object(node)) fail(`/nodes/${i}`, 'expected an object');
    keys(node, ['id', 'label', 'lane', 'shape', 'emphasis'], `/nodes/${i}`);
    const id = string(node.id, `/nodes/${i}/id`, 160);
    if (ids.has(id)) fail(`/nodes/${i}/id`, `duplicate node ${JSON.stringify(id)}`);
    ids.add(id);
    if (node.shape !== undefined && !['box', 'diamond'].includes(node.shape)) fail(`/nodes/${i}/shape`, 'supported shapes: box, diamond');
    if (node.emphasis !== undefined && typeof node.emphasis !== 'boolean') fail(`/nodes/${i}/emphasis`, 'expected boolean');
    const lane = node.lane ?? (lanes.length === 1 ? lanes[0].id : undefined);
    if (!laneIds.has(lane) || (!brief.lanes && node.lane !== undefined)) fail(`/nodes/${i}/lane`, 'select an explicitly declared role');
    return { id, label: string(node.label, `/nodes/${i}/label`, 180), lane, shape: node.shape ?? 'box', emphasis: node.emphasis === true };
  });
  const duplicates = new Set();
  const links = brief.links.map((link, i) => {
    if (!object(link)) fail(`/links/${i}`, 'expected an object');
    keys(link, ['from', 'to', 'label', 'feedback'], `/links/${i}`);
    for (const key of ['from', 'to']) if (typeof link[key] !== 'string' || !ids.has(link[key])) fail(`/links/${i}/${key}`, `unknown node ${JSON.stringify(link[key])}`);
    if (link.feedback !== undefined && typeof link.feedback !== 'boolean') fail(`/links/${i}/feedback`, 'expected boolean');
    if (link.from === link.to) fail(`/links/${i}`, 'self loops are unsupported; represent the repeated operation and its return separately');
    const label = string(link.label, `/links/${i}/label`, 80, true);
    const signature = JSON.stringify([link.from, link.to, label ?? '']);
    if (duplicates.has(signature)) fail(`/links/${i}`, 'duplicate relation with the same condition');
    duplicates.add(signature);
    return { from: link.from, to: link.to, label, feedback: link.feedback === true, key: signature };
  });
  if (links.filter(l => l.feedback).length > 12) fail('/links', 'at most 12 explicit return channels are supported');
  return { width, lanes, nodes, links, hasLanes: !!brief.lanes };
}

/** Compile content and relationships to ordinary editable scene primitives. */
export function composeFlow(brief) {
  const input = validate(brief), { width: outputWidth, lanes, nodes, links, hasLanes } = input;
  // Width controls output resolution, never a way to squeeze more columns into
  // the 1200px reading view. Scale typography and geometry together at the end.
  const width = 1200;
  const byId = new Map(nodes.map(n => [n.id, n]));
  const incoming = new Map(nodes.map(n => [n.id, []])), outgoing = new Map(nodes.map(n => [n.id, []]));
  for (const link of links) if (!link.feedback) { outgoing.get(link.from).push(link); incoming.get(link.to).push(link); }
  const indegree = new Map(nodes.map(n => [n.id, incoming.get(n.id).length]));
  const trueStarts = new Set(nodes.filter(n => !links.some(l => l.to === n.id)).map(n => n.id));
  const feedbackRoots = new Set(nodes.filter(n => !incoming.get(n.id).length && links.some(l => l.feedback && l.to === n.id)).map(n => n.id));
  const readingPriority = id => trueStarts.has(id) ? 0 : feedbackRoots.has(id) ? 2 : 1;
  const rank = new Map(nodes.map(n => [n.id, 0]));
  const ready = nodes.filter(n => !indegree.get(n.id)).map(n => n.id).sort(), ordered = [];
  while (ready.length) {
    const id = ready.shift(); ordered.push(id);
    for (const link of outgoing.get(id)) {
      rank.set(link.to, Math.max(rank.get(link.to), rank.get(id) + 1));
      indegree.set(link.to, indegree.get(link.to) - 1);
      if (!indegree.get(link.to)) { ready.push(link.to); ready.sort(); }
    }
  }
  if (ordered.length !== nodes.length) fail('/links', 'cycle without an explicit feedback:true return; mark the actual returning relation');
  const cols = Math.max(...rank.values()) + 1, margin = 40, roleWidth = hasLanes ? 74 : 0;
  const plotX = margin + roleWidth, plotW = width - plotX - margin;
  const gap = 58, available = plotW - (cols - 1) * gap;
  if (available < cols * 92) {
    if (hasLanes) return composeLaneFlow(input,brief,rank,{wrap,units});
    fail('/nodes', `this ${cols}-column flow exceeds the readable 1200px composition; split the flow into subprocesses (width changes resolution only)`);
  }
  // Give verbose columns more room instead of making every column equally
  // narrow. A nine-character action can retain two balanced readable lines.
  const preferred = Array.from({ length: cols }, (_, col) => Math.max(92, ...nodes.filter(n => rank.get(n.id) === col).map(n => {
    let lineUnits = Math.ceil(Math.max(...n.label.split(/\r?\n/).map(units)) / 2);
    const phrase = phraseBreaks(n.label).find(parts => parts.every(part => units(part) <= 8));
    if (phrase) lineUnits = Math.max(lineUnits, ...phrase.map(units));
    return Math.min(238, lineUnits * 18 + (n.shape === 'diamond' ? 36 : 14));
  })));
  const desire = preferred.reduce((sum, w) => sum + w - 92, 0), budget = available - cols * 92;
  const columnWidths = preferred.map(w => 92 + (desire ? (w - 92) * Math.min(1, budget / desire) : 0));
  let spare = available - columnWidths.reduce((a, b) => a + b, 0);
  while (spare > .01) {
    const open = columnWidths.map((w, i) => w < 238 - .01 ? i : -1).filter(i => i >= 0);
    if (!open.length) break;
    const share = spare / open.length;
    for (const i of open) { const add = Math.min(share, 238 - columnWidths[i]); columnWidths[i] += add; spare -= add; }
  }
  const contentW = columnWidths.reduce((a, b) => a + b, 0) + (cols - 1) * gap;
  const startX = plotX + (plotW - contentW) / 2;
  const columnX = columnWidths.map((_, col) => startX + columnWidths.slice(0, col).reduce((a, b) => a + b, 0) + col * gap);
  const shapes = nodes.map(node => {
    const col = rank.get(node.id), nodeW = columnWidths[col];
    const label = wrap(node.label, nodeW - (node.shape === 'diamond' ? 36 : 14), 18);
    const lines = label.split('\n').length;
    const h = node.shape === 'diamond' ? Math.max(112, lines * 24 + 60) : Math.max(72, lines * 24 + 24);
    if (h > 680) fail(`/nodes/${node.id}/label`, 'text is too dense for a readable flow; split the operation into meaningful steps');
    return { id: node.id, label, shape: node.shape, tone: node.emphasis ? 'accent' : 'default', x: round(columnX[col]), y: 0, w: round(nodeW), h, size: 18, padding: 7 };
  });
  const shapeById = new Map(shapes.map(n => [n.id, n]));
  const parallel = new Map();
  for (const link of links) { const key = JSON.stringify([link.from, link.to]); parallel.set(key, (parallel.get(key) ?? 0) + 1); }
  const special = new Map();
  for (const link of links) {
    const isLong = rank.get(link.to) - rank.get(link.from) > 1 || (parallel.get(JSON.stringify([link.from, link.to])) > 1) || (link.label && units(link.label) > 9);
    // Conditions occupy the free corridor beside an edge, not the thin column
    // gutter. Prefer a horizontal phrase and reserve enough branch separation.
    const label = link.label ? wrap(link.label, 160, 15) : undefined;
    if (label && label.split('\n').length > 2) fail('/links', `condition ${JSON.stringify(link.label)} needs more than two readable lines; express the detailed operation as a node`);
    special.set(link.key, { type: link.feedback ? 'feedback' : isLong ? 'top' : 'direct', label, bandH: Math.max(52, (label?.split('\n').length ?? 0) * 18.75 + 30) });
  }
  let cursor = margin;
  const topY = new Map();
  for (const link of links.filter(l => special.get(l.key).type === 'top').sort((a, b) => a.key.localeCompare(b.key))) {
    const h = special.get(link.key).bandH; topY.set(link.key, cursor + h / 2); cursor += h;
  }
  if (topY.size) cursor += 28;
  const originalTopHeight = cursor - margin;
  const laneFrames = [];
  for (const lane of lanes) {
    const columns = Array.from({ length: cols }, (_, col) => shapes.filter(n => byId.get(n.id).lane === lane.id && rank.get(n.id) === col).sort((a, b) => readingPriority(a.id) - readingPriority(b.id) || a.id.localeCompare(b.id)));
    const rowGap = Math.max(144, Math.max(0, ...columns.flat().map(n => n.h)) + 72);
    const stackHeights = columns.map(group => group.reduce((s, n) => s + n.h, 0) + Math.max(0, group.length - 1) * rowGap);
    const h = Math.max(hasLanes ? 180 : 210, Math.max(...stackHeights) + 80);
    const frame = { id: lane.id, label: lane.label, y: cursor, h }; laneFrames.push(frame);
    columns.forEach((group, i) => { let y = cursor + (h - stackHeights[i]) / 2; for (const node of group) { node.y = round(y); y += node.h + rowGap; } });
    cursor += h;
  }
  let contentBottom = cursor;
  const feedbackY = new Map();
  if (links.some(l => l.feedback)) cursor += 26;
  for (const link of links.filter(l => l.feedback).sort((a, b) => a.key.localeCompare(b.key))) { const h = special.get(link.key).bandH; feedbackY.set(link.key, cursor + h / 2); cursor += h; }
  let height = Math.max(300, Math.ceil(cursor + margin));

  // Ports are explicit: renderer auto-alignment must not change safe waypoints.
  const sourcePorts = new Map(), targetPorts = new Map();
  for (const node of nodes) {
    for (const [kind, group, map] of [['from', links.filter(l => l.from === node.id), sourcePorts], ['to', links.filter(l => l.to === node.id), targetPorts]]) {
      group.sort((a, b) => {
        const va = shapeById.get(kind === 'from' ? a.to : a.from), vb = shapeById.get(kind === 'from' ? b.to : b.from);
        return va.y - vb.y || a.key.localeCompare(b.key);
      });
      group.forEach((link, i) => map.set(link.key, node.shape === 'diamond' || group.length === 1 ? .5 : .25 + .5 * i / (group.length - 1)));
    }
  }
  // A skip edge often fits in the source role's empty row. Prefer that compact
  // route over a needless trip above every lane, but prove it clears all nodes.
  for (const link of links) {
    const plan = special.get(link.key);
    if (plan.type !== 'top' || rank.get(link.to) - rank.get(link.from) < 2 || parallel.get(JSON.stringify([link.from, link.to])) !== 1) continue;
    const a = shapeById.get(link.from), b = shapeById.get(link.to);
    const sy = a.y + a.h * sourcePorts.get(link.key), ty = b.y + b.h * targetPorts.get(link.key), x = b.x - gap / 2;
    const points = [[a.x + a.w, sy], [x, sy], [x, ty], [b.x, ty]];
    const clear = points.slice(1).every((p, i) => shapes.every(n => n.id === a.id || n.id === b.id || !segmentHits(points[i], p, n)));
    if (clear) plan.type = 'skip-local';
  }
  topY.clear(); let newTopHeight = 0;
  for (const link of links.filter(l => special.get(l.key).type === 'top').sort((a, b) => a.key.localeCompare(b.key))) {
    const h = special.get(link.key).bandH; topY.set(link.key, margin + newTopHeight + h / 2); newTopHeight += h;
  }
  if (topY.size) newTopHeight += 28;
  const shift = originalTopHeight - newTopHeight;
  if (shift) {
    for (const node of shapes) node.y = round(node.y - shift);
    for (const frame of laneFrames) frame.y -= shift;
    for (const [key, y] of feedbackY) feedbackY.set(key, y - shift);
    contentBottom -= shift; height -= shift;
  }
  // Local rework belongs to its owner's lane when a genuinely clear corridor
  // exists. Right-side ports avoid routing through the role label gutter.
  const reservedLabels = new Map();
  for (const link of links.filter(l => l.feedback).sort((a, b) => a.key.localeCompare(b.key))) {
    const fromNode = byId.get(link.from), toNode = byId.get(link.to);
    if (fromNode.lane !== toNode.lane) continue;
    const frame = laneFrames.find(f => f.id === fromNode.lane);
    const a = shapeById.get(link.from), b = shapeById.get(link.to), plan = special.get(link.key);
    const laneNodes = shapes.filter(n => byId.get(n.id).lane === fromNode.lane);
    const sy = a.y + a.h * sourcePorts.get(link.key), ty = b.y + b.h * targetPorts.get(link.key);
    const sx = a.x + a.w + 20, tx = b.x + b.w + 20;
    if (Math.max(sx, tx) > width - 10) continue;
    const halfLabel = plan.label ? labelBox(plan.label, [0, 0]).h / 2 : 4;
    const candidateYs = [Math.max(...laneNodes.map(n => n.y + n.h)) + halfLabel + 8, Math.min(...laneNodes.map(n => n.y)) - halfLabel - 8];
    const boundaries = [...new Set(laneNodes.flatMap(n => [n.y, n.y + n.h]))].sort((x, y) => x - y);
    for (let i = 1; i < boundaries.length; i++) candidateYs.push((boundaries[i - 1] + boundaries[i]) / 2);
    for (const y of candidateYs) {
      if (y - halfLabel < frame.y + 6 || y + halfLabel > frame.y + frame.h - 6) continue;
      const bottomX = a.x + a.w * sourcePorts.get(link.key);
      const options = [{ fromSide: 'b', start: [bottomX, a.y + a.h], via: [[bottomX, y], [tx, y], [tx, ty]], at: [(bottomX + tx) / 2, y] },
        { fromSide: 'r', start: [a.x + a.w, sy], via: Math.abs(sx - tx) < .1 ? [[sx, sy], [sx, ty]] : [[sx, sy], [sx, y], [tx, y], [tx, ty]], at: Math.abs(sx - tx) < .1 ? [sx, (sy + ty) / 2] : [(sx + tx) / 2, y] }];
      for (const option of options) {
        const points = [option.start, ...option.via, [b.x + b.w, ty]];
        // Include endpoint bodies too: a return must not cut through its own
        // destination before arriving at the selected boundary port.
        if (!points.slice(1).every((p, i) => shapes.every(n => !segmentHits(points[i], p, n)))) continue;
        const box = plan.label ? labelBox(plan.label, option.at) : null;
        if (box && (shapes.some(n => overlaps(box, n, 6)) || [...reservedLabels.values()].some(n => overlaps(box, n, 8)) || box.x < plotX || box.x + box.w > width - 8 || box.y < frame.y + 4 || box.y + box.h > frame.y + frame.h - 4)) continue;
        plan.type = 'feedback-local'; plan.localVia = option.via; plan.localLabelAt = option.at; plan.localFromSide = option.fromSide; plan.localStart = option.start;
        if (box) reservedLabels.set(link.key, box);
        break;
      }
      if (plan.type === 'feedback-local') break;
    }
  }
  // Only unsatisfied/cross-role returns reserve channels below the whole flow.
  feedbackY.clear(); let bottom = contentBottom;
  const outerFeedback = links.filter(l => special.get(l.key).type === 'feedback').sort((a, b) => a.key.localeCompare(b.key));
  if (outerFeedback.length) bottom += 26;
  for (const link of outerFeedback) { const h = special.get(link.key).bandH; feedbackY.set(link.key, bottom + h / 2); bottom += h; }
  height = Math.max(300, Math.ceil(bottom + margin));
  if (height > 1070) fail('/nodes', 'the flow exceeds a readable 1200×1000 preview; split by responsibility or subprocess');
  const labels = [], edges = [], usedEdgeIds = new Set(nodes.map(n => n.id));
  const directGroups = new Map();
  for (const link of links) if (special.get(link.key).type === 'direct') {
    const col = rank.get(link.from); if (!directGroups.has(col)) directGroups.set(col, []); directGroups.get(col).push(link);
  }
  const gutters = new Map();
  for (const [col, group] of directGroups) {
    group.sort((a, b) => a.key.localeCompare(b.key));
    if (group.length > 8) fail('/links', 'more than 8 routes share one column gap; split the dense flow');
    group.forEach(link => gutters.set(link.key, columnX[col] + columnWidths[col] + gap / 2));
  }
  for (const link of links) {
    const a = shapeById.get(link.from), b = shapeById.get(link.to), plan = special.get(link.key);
    const fromAt = sourcePorts.get(link.key), toAt = targetPorts.get(link.key), sy = a.y + a.h * fromAt, ty = b.y + b.h * toAt;
    let via, labelAt, points, fromSide = 'r', toSide = 'l';
    if (plan.type === 'direct' || plan.type === 'skip-local') {
      const x = plan.type === 'skip-local' ? b.x - gap / 2 : gutters.get(link.key); via = [[x, sy], [x, ty]];
      points = [[a.x + a.w, sy], ...via, [b.x, ty]];
    } else if (plan.type === 'feedback-local') {
      fromSide = plan.localFromSide; toSide = 'r'; via = plan.localVia;
      points = [plan.localStart, ...via, [b.x + b.w, ty]];
      if (plan.label) labelAt = plan.localLabelAt;
    } else {
      const sx = a.x + a.w + Math.min(24, gap * .35), tx = b.x - Math.min(24, gap * .35);
      const y = plan.type === 'feedback' ? feedbackY.get(link.key) : topY.get(link.key);
      via = [[sx, sy], [sx, y], [tx, y], [tx, ty]];
      points = [[a.x + a.w, sy], ...via, [b.x, ty]];
      if (plan.label) labelAt = [(sx + tx) / 2, y];
    }
    for (let i = 1; i < points.length; i++) for (const node of shapes) if (node.id !== a.id && node.id !== b.id && segmentHits(points[i - 1], points[i], node)) fail('/links', `cannot route ${link.from} -> ${link.to} without crossing ${node.id}; split the flow into meaningful subprocesses`);
    if (plan.label && !labelAt) {
      const candidates = [];
      for (const at of points.slice(1, -1)) candidates.push({ at, len: 0 });
      for (let i = 1; i < points.length; i++) {
        const p = points[i - 1], q = points[i], len = Math.hypot(q[0] - p[0], q[1] - p[1]);
        const fractions = Array.from({ length: 39 }, (_, j) => (j + 1) / 40).sort((a, b) => Math.abs(a - .5) - Math.abs(b - .5));
        for (const t of fractions) candidates.push({ at: [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t], len });
      }
      candidates.sort((p, q) => q.len - p.len);
      labelAt = candidates.find(({ at }) => { const box = labelBox(plan.label, at); return box.x >= 8 && box.y >= 8 && box.x + box.w <= width - 8 && box.y + box.h <= height - 8 && !shapes.some(n => overlaps(box, n, 4)) && !labels.some(n => overlaps(box, n, 6)) && ![...reservedLabels.entries()].some(([key, n]) => key !== link.key && overlaps(box, n, 6)); })?.at;
      if (!labelAt) fail('/links', `cannot place condition ${JSON.stringify(link.label)} legibly; split the flow or express detailed conditions as steps`);
    }
    if (plan.label) {
      const box = labelBox(plan.label, labelAt);
      if (box.x < 0 || box.y < 0 || box.x + box.w > width || box.y + box.h > height || shapes.some(n => overlaps(box, n, 4)) || labels.some(n => overlaps(box, n, 6))) fail('/links', `condition ${JSON.stringify(link.label)} has no safe position; split the flow or express detailed conditions as steps`);
      labels.push(box);
    }
    let id = `flow-${idPart(link.from)}~${idPart(link.to)}~${idPart(link.label ?? '')}`;
    while (usedEdgeIds.has(id)) id = '_' + id;
    usedEdgeIds.add(id);
    edges.push({ id, from: link.from, to: link.to, fromSide, toSide, fromAt, toAt, via: via.map(p => p.map(round)), route: 'ortho', ...(plan.label ? { label: plan.label, labelAt: labelAt.map(round) } : {}), kind: link.feedback ? 'feedback' : 'default', ...(link.feedback ? { dash: '5 4' } : {}) });
  }
  const lines = [], texts = [];
  const drawnRules = new Set();
  if (hasLanes) for (const lane of laneFrames) {
    for (const y of [lane.y, lane.y + lane.h]) if (!drawnRules.has(y)) { drawnRules.add(y); lines.push({ points: [[margin, y], [width - margin, y]], color: brief.theme ? 'line' : '#DCE2E8', width: 1 }); }
    const label = wrap(lane.label, roleWidth - 12, 18), lineCount = label.split('\n').length;
    texts.push({ x: margin + (roleWidth - 12) / 2, y: round(lane.y + lane.h / 2 - (lineCount - 1) * 12), text: label, size: 18, weight: 600, anchor: 'middle', color: brief.theme ? 'ink' : '#465461', w: roleWidth - 12 });
  }
  const scene = {
    theme: brief.theme ?? 'journal', size: [round(width), height], header: false, footer: false, autoFit: false,
    nodes: shapes, edges, lines, texts,
    style: { node: { size: 18, weight: 500, padding: 7, radius: 5, stroke: 1.2, lineHeight: 1.3 },
      tones: { default: { fill: '#FFFFFF', stroke: '#81909C', text: '#1D2A35' }, accent: { fill: '#E8F0F7', stroke: '#315E80', text: '#173D5A' } },
      edge: { color: '#65717C', width: 1.35, radius: 5, labelSize: 15, labelColor: '#465461', labelStyle: 'chip', labelBg: '#FFFFFF', kinds: { default: { color: '#65717C', width: 1.35 }, feedback: { color: '#315E80', width: 1.7, dash: '5 4' } } } },
    meta: { composition: 'flow', nodeCount: nodes.length, relationCount: links.length, laneCount: hasLanes ? lanes.length : 0, feedbackCount: links.filter(l => l.feedback).length, localFeedbackCount: links.filter(l => special.get(l.key).type === 'feedback-local').length, contentBottom: round(contentBottom) }
  };
  if (brief.theme !== undefined) scene.style = {
    node: { size: 18, padding: 7, stroke: 1.2, lineHeight: 1.3 },
    edge: { labelSize: 15, width: 1.35, radius: 5, arrowSize: 7, gap: 2 }
  };
  const scale = outputWidth / 1200;
  scene.size = [round(outputWidth), round(height * scale)];
  for (const node of scene.nodes) for (const key of ['x', 'y', 'w', 'h', 'size', 'padding']) node[key] = round(node[key] * scale);
  for (const edge of scene.edges) {
    edge.via = edge.via.map(p => p.map(n => round(n * scale)));
    if (edge.labelAt) edge.labelAt = edge.labelAt.map(n => round(n * scale));
    edge.width = round((edge.kind === 'feedback' ? 1.7 : 1.35) * scale);
    edge.fromGap = edge.toGap = round(2 * scale);
    if (edge.dash) edge.dash = edge.dash.split(' ').map(n => round(Number(n) * scale)).join(' ');
  }
  for (const line of scene.lines) { line.points = line.points.map(p => p.map(n => round(n * scale))); line.width = round(line.width * scale); }
  for (const text of scene.texts) for (const key of ['x', 'y', 'w', 'size']) text[key] = round(text[key] * scale);
  const scaleStyle = (group, fields) => { for (const key of fields) if (typeof group?.[key] === 'number') group[key] = round(group[key] * scale); };
  scaleStyle(scene.style.node, ['size', 'padding', 'radius', 'stroke']);
  scaleStyle(scene.style.edge, ['width', 'radius', 'labelSize', 'arrowSize', 'gap']);
  for (const kind of Object.values(scene.style.edge.kinds ?? {})) scaleStyle(kind, ['width']);
  // These affect port gaps / arrowheads even with a named theme override.
  scene.style.edge.arrowSize ??= round(7 * scale); scene.style.edge.gap ??= round(2 * scale);
  scene.meta.contentBottom = round(scene.meta.contentBottom * scale);
  return attachFlowContract(scene,input,laneFrames.map(f=>({id:f.id,x:round(plotX*scale),y:round(f.y*scale),w:round(plotW*scale),h:round(f.h*scale)})));
}
