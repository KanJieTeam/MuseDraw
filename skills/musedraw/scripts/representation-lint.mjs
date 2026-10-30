#!/usr/bin/env node
// Small preflight for new office/research diagrams. It does not judge taste;
// it catches the most common fallback that made MuseDraw outputs look like
// generic dashboards: a wall of equal cards with no declared representation.
import fs from 'node:fs';

const allowed = new Set(['entity-chain','evidence-branch','source-to-output','swimlane','timeline','boundary-map']);

function issue(code, message, severity='error') { return { code, message, severity }; }

export function lintRepresentation(scene, { strict=false } = {}) {
  const meta = scene?.meta ?? {};
  const out = [];
  const profile = meta.representation;
  if (strict && (!profile || !allowed.has(profile))) {
    out.push(issue('representation-missing', `scene.meta.representation must be one of: ${[...allowed].join(', ')}`));
  } else if (profile && !allowed.has(profile)) {
    out.push(issue('representation-unknown', `unknown representation "${profile}"`));
  }
  if (strict && (!meta.readerQuestion || typeof meta.readerQuestion !== 'string')) {
    out.push(issue('reader-question-missing', 'scene.meta.readerQuestion is required for a new routed diagram'));
  }
  if (profile && meta.readerQuestion && typeof meta.readerQuestion !== 'string') {
    out.push(issue('reader-question-invalid', 'scene.meta.readerQuestion must be text'));
  }

  const nodes = Array.isArray(scene?.nodes) ? scene.nodes : [];
  if (nodes.length >= 8) {
    const boxes = nodes.filter(n => (n.shape ?? 'box') === 'box');
    const sameSize = new Map();
    for (const n of boxes) {
      const key = `${Math.round((n.w ?? 0) / 8)}x${Math.round((n.h ?? 0) / 8)}`;
      sameSize.set(key, (sameSize.get(key) ?? 0) + 1);
    }
    const dominant = Math.max(0, ...sameSize.values());
    const equalShapes = boxes.length >= Math.ceil(nodes.length * .65) && dominant >= Math.ceil(boxes.length * .65);
    const xs = new Set(nodes.map(n => Math.round((n.x ?? 0) / 24)));
    const ys = new Set(nodes.map(n => Math.round((n.y ?? 0) / 24)));
    if (equalShapes && xs.size >= 3 && ys.size <= 5) {
      out.push(issue('equal-card-wall', 'many same-size box nodes form a generic card wall; choose a relationship-led representation or split the figure'));
    }
  }
  const edges = Array.isArray(scene?.edges) ? scene.edges : [];
  if (edges.length && edges.filter(e => !e.label).length > Math.ceil(edges.length * .75)) {
    out.push(issue('unlabelled-edges', 'most connectors have no supplied relationship label; remove decorative arrows or name the actual relation', 'warning'));
  }
  if (strict && profile && nodes.length > 25) {
    out.push(issue('too-dense', 'more than 25 objects in one routed view; split into overview and detail'));
  }
  return out;
}

if (process.argv[1] && process.argv[1].endsWith('representation-lint.mjs')) {
  const file = process.argv[2];
  const strict = process.argv.includes('--strict');
  if (!file) { console.error('Usage: node representation-lint.mjs scene.json [--strict]'); process.exit(1); }
  const scene = JSON.parse(fs.readFileSync(file, 'utf8'));
  const issues = lintRepresentation(scene, {strict});
  console.log(JSON.stringify({ok: !issues.some(x => x.severity === 'error'), issues}, null, 2));
  if (issues.some(x => x.severity === 'error')) process.exitCode = 2;
}

