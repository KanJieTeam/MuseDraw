// MuseDraw scene renderer: scene JSON + theme JSON -> native SVG string.
//
// The scene carries art direction (where things sit, what they mean, what to
// emphasise). The theme carries the visual system (type, colour, line, texture).
// Swap the theme and the same scene re-renders in a different style.

import rough from '../vendor/rough.esm.js';
import { ICONS, iconSvg } from './icons.mjs';
import { esc, measure, wrap, applyCase, textBlock, rd } from './text.mjs';
import { autoSides, port, orthoPoints, roundedPath, curvePath, bezierPoint, along, longestSegmentMid, shorten, f } from './route.mjs';
import { prepareScene } from './validate.mjs';
import { assertStaticSvg } from './safety.mjs';
import { renderVectorScene } from './vector.mjs';

const gen = rough.generator();

function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) % 2147483647 || 7; }
const deepMerge = (a, b) => { const o = { ...a }; for (const [k, v] of Object.entries(b ?? {})) o[k] = v && typeof v === 'object' && !Array.isArray(v) && a?.[k] && typeof a[k] === 'object' ? deepMerge(a[k], v) : v; return o; };

export function render(scene, theme) {
  if (scene?.type === 'vector') return renderVectorScene(scene, theme);
  // Scene-local art direction preserves an approved composition without adding
  // another named theme or mutating the shared theme used by later drawings.
  theme = deepMerge(theme, scene?.style ?? {});
  scene = prepareScene(scene, theme);
  const ctx = new Ctx(scene, theme);
  return assertStaticSvg(ctx.build());
}

class Ctx {
  constructor(scene, theme) {
    this.s = scene;
    this.t = theme;
    this.W = scene.size?.[0] ?? 1600;
    this.H = scene.size?.[1] ?? 1000;
    this.defs = [];
    this.defIds = new Set();
    this.nodes = new Map((scene.nodes ?? []).map((n) => [n.id, this.normNode(n)]));
    this.warnings = [];
    this.portUse = new Map();
  }

  // ---------- tokens ----------
  c(v) { if (v == null) return v; const p = this.t.palette ?? {}; return p[v] ?? v; }
  font(k) { return this.t.fonts?.[k] ?? k ?? this.t.fonts.body; }
  tone(name) { const tones = this.t.tones; const base = tones.default; const t = tones[name] ?? base; return Object.fromEntries(Object.entries({ ...base, ...t }).map(([k, v]) => [k, typeof v === 'string' ? this.c(v) : v])); }
  zoneTone(name) { const z = this.t.zone.tones ?? {}; const t = { ...(z.default ?? {}), ...(z[name] ?? {}) }; return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, typeof v === 'string' ? this.c(v) : v])); }
  def(id, markup) { if (!this.defIds.has(id)) { this.defIds.add(id); this.defs.push(markup); } return id; }

  normNode(n) {
    const d = { shape: 'box', w: 160, h: 64, ...n };
    if (d.shape === 'station') { d.w = d.w ?? 22; d.h = d.h ?? 22; }
    return d;
  }

  // ---------- build ----------
  // Close the dead band between header and content: shift everything up and
  // shrink the canvas so the first element sits a fixed gap below the header.
  autoFit() {
    const s = this.s;
    if (s.autoFit === false) return;
    this.headerBottom = null;
    this.header();
    const hb = this.headerBottom;
    if (hb == null) return;
    const ys = [];
    for (const z of s.zones ?? []) ys.push(z.y - ((this.t.zone.labelStyle === 'outside' || z.labelPos === 'outside') ? 26 : this.t.zone.labelStyle === 'notch' || this.t.zone.labelStyle === 'tab' ? 12 : 0));
    for (const n of this.nodes.values()) if (!(n.shape === 'text' && !n.label)) ys.push(n.y - (n.shape === 'stack' ? 10 : 0) - (n.step != null ? 12 : 0) - (n.labelPos === 'above' ? 40 : 0));
    for (const n of s.notes ?? []) ys.push(n.y - 8);
    for (const t of s.texts ?? []) ys.push(t.y - (t.size ?? 14));
    for (const l of s.lines ?? []) for (const p of l.points) ys.push(p[1]);
    for (const b of s.bars ?? []) ys.push(b.y);
    if (s.legend) ys.push(s.legend.y);
    if (!ys.length) return;
    const gap = this.t.header?.contentGap ?? 60;
    const shift = Math.floor(Math.min(...ys) - hb - gap);
    if (shift < 24) return;
    const up = (o) => { if (o && typeof o.y === 'number') o.y -= shift; };
    const upPt = (p) => (Array.isArray(p) ? [p[0], p[1] - shift] : p);
    (s.zones ?? []).forEach(up); (s.notes ?? []).forEach((n) => { up(n); if (Array.isArray(n.to)) n.to = upPt(n.to); if (Array.isArray(n.from)) n.from = upPt(n.from); });
    (s.texts ?? []).forEach(up); (s.bars ?? []).forEach(up); if (s.legend) up(s.legend);
    for (const l of s.lines ?? []) l.points = l.points.map(upPt);
        for (const n of this.nodes.values()) up(n);
    for (const e of s.edges ?? []) {
      if (e.via) e.via = e.via.map(upPt);
      if (Array.isArray(e.labelAt)) e.labelAt = upPt(e.labelAt);
      const a = this.nodes.get(e.from), b = this.nodes.get(e.to);
      if (a && b && e.mid != null) {
        const [fa, fb] = autoSides(a, b);
        const fs = e.fromSide ?? fa, ts = e.toSide ?? fb;
        if ((fs === 't' || fs === 'b') && (ts === 't' || ts === 'b')) e.mid -= shift;
      }
    }
    this.H -= shift;
    this.fitShift = shift;
  }

  // Trim dead space at the bottom: snap the legend under the content and
  // shrink the canvas. Never grows the canvas.
  trimBottom() {
    const s = this.s;
    if (s.autoFit === false || s.trimBottom === false) return;
    const ys = [];
    for (const z of s.zones ?? []) ys.push(z.y + (z.h ?? 0));
    for (const n of this.nodes.values()) if (!(n.shape === 'text' && !n.label)) ys.push(n.y + n.h + (n.labelPos === 'below' || n.shape === 'person' ? 40 : 0));
    for (const n of s.notes ?? []) { const lines = Math.ceil(measure(n.text ?? '', n.size ?? this.t.note?.size ?? 14, this.font(this.t.note?.font ?? 'body')) / Math.max(60, (n.w ?? 220) - 30)); ys.push(n.y + lines * (n.size ?? this.t.note?.size ?? 14) * 1.5 + 30 + (n.title ? 22 : 0)); }
    for (const t of s.texts ?? []) { const lines = t.w ? Math.ceil(measure(t.text, t.size ?? 14, this.font(t.font ?? 'body')) / t.w) : String(t.text).split('\n').length; ys.push(t.y + (lines - 1) * (t.size ?? 14) * 1.3 + 6); }
    for (const l of s.lines ?? []) for (const p of l.points) ys.push(p[1]);
    for (const b of s.bars ?? []) ys.push(b.y + b.h);
    if (!ys.length) return;
    const maxY = Math.max(...ys);
    const m = this.t.canvas.margin ?? 56;
    let bottom = maxY;
    if (s.legend && s.legend.y > maxY) {
      const ly = Math.min(s.legend.y, maxY + 44);
      s.legend.y = ly;
      bottom = ly + 24;
    }
    const H = Math.ceil(bottom + m + 16 + (this.t.header?.layout === 'titleblock' ? 96 : 0));
    if (H < this.H - 24) this.H = H;
  }

  build() {
    this.autoFit();
    this.trimBottom();
    const s = this.s, t = this.t;
    const layers = {
      bg: this.background(),
      zones: (s.zones ?? []).map((z) => this.zone(z)).join('') + (s.bars ?? []).map((b, i) => this.barEl(b, i)).join('') + (s.lines ?? []).map((l, i) => this.lineEl(l, i)).join('') + (s.paths ?? []).map((p, i) => this.pathEl(p, i)).join(''),
      edges: '', nodes: '', labels: '', notes: '', legend: '', texts: '', header: '', footer: '',
    };
    this.assignPorts();
    const edgeParts = (s.edges ?? []).map((e, i) => this.edge(e, i));
    layers.edges = edgeParts.map((p) => p.line).join('');
    layers.labels = edgeParts.map((p) => p.label).join('');
    layers.nodes = [...this.nodes.values()].map((n) => this.node(n)).join('');
    layers.notes = (s.notes ?? []).map((n, i) => this.note(n, i)).join('');
    layers.legend = s.legend ? this.legend(s.legend) : '';
    layers.texts = (s.texts ?? []).map((x) => this.freeText(x)).join('');
    layers.header = this.header();
    layers.footer = this.footer();
    const blend = t.effects?.blend ? ` style="mix-blend-mode:${t.effects.blend}"` : '';
    const body = `<g id="zones">${layers.zones}</g><g id="edges"${blend}>${layers.edges}</g><g id="nodes"${blend}>${layers.nodes}</g><g id="edge-labels">${layers.labels}</g><g id="notes">${layers.notes}</g><g id="legend">${layers.legend}</g><g id="texts">${layers.texts}</g><g id="header">${layers.header}</g><g id="footer">${layers.footer}</g>`;
    const title = esc(s.title ?? 'Diagram');
    const desc = esc(s.description ?? s.subtitle ?? '');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.W} ${this.H}" width="${this.W}" height="${this.H}" role="img" aria-labelledby="md-title md-desc" data-theme="${esc(t.id)}"><title id="md-title">${title}</title><desc id="md-desc">${desc}</desc><defs>${this.defs.join('')}</defs>${layers.bg}${body}</svg>`;
  }

  // ---------- background & texture ----------
  background() {
    const cv = this.t.canvas, W = this.W, H = this.H;
    let out = `<rect id="canvas" width="${W}" height="${H}" fill="${this.c(cv.bg)}"/>`;
    for (const g of cv.glows ?? []) {
      const id = this.def(`glow-${hash(JSON.stringify(g))}`, `<radialGradient id="glow-${hash(JSON.stringify(g))}" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${this.c(g.color)}" stop-opacity="${g.opacity ?? 0.5}"/><stop offset="1" stop-color="${this.c(g.color)}" stop-opacity="0"/></radialGradient>`);
      out += `<ellipse cx="${g.x * W}" cy="${g.y * H}" rx="${g.r * W}" ry="${(g.ry ?? g.r) * W}" fill="url(#${id})"/>`;
    }
    const tc = this.c(cv.textureColor ?? 'muted'), op = cv.textureOpacity ?? 0.35;
    const tex = cv.texture ?? 'none';
    if (tex === 'dots') {
      const g = cv.textureGap ?? 24;
      this.def('tex-dots', `<pattern id="tex-dots" width="${g}" height="${g}" patternUnits="userSpaceOnUse"><circle cx="${g / 2}" cy="${g / 2}" r="1.1" fill="${tc}"/></pattern>`);
      out += `<rect width="${W}" height="${H}" fill="url(#tex-dots)" opacity="${op}"/>`;
    } else if (tex === 'grid' || tex === 'blueprint') {
      const g = cv.textureGap ?? 20, M = g * 5;
      this.def('tex-grid', `<pattern id="tex-grid" width="${g}" height="${g}" patternUnits="userSpaceOnUse"><path d="M${g} 0H0V${g}" fill="none" stroke="${tc}" stroke-width="0.6"/></pattern>`);
      this.def('tex-grid-major', `<pattern id="tex-grid-major" width="${M}" height="${M}" patternUnits="userSpaceOnUse"><path d="M${M} 0H0V${M}" fill="none" stroke="${tc}" stroke-width="1.2"/></pattern>`);
      out += `<rect width="${W}" height="${H}" fill="url(#tex-grid)" opacity="${op}"/><rect width="${W}" height="${H}" fill="url(#tex-grid-major)" opacity="${op * 1.4}"/>`;
    } else if (tex === 'lines') {
      const g = cv.textureGap ?? 28;
      this.def('tex-lines', `<pattern id="tex-lines" width="${g}" height="${g}" patternUnits="userSpaceOnUse"><path d="M0 ${g - 0.5}H${g}" stroke="${tc}" stroke-width="1"/></pattern>`);
      out += `<rect width="${W}" height="${H}" fill="url(#tex-lines)" opacity="${op}"/>`;
    } else if (tex === 'scan') {
      this.def('tex-scan', `<pattern id="tex-scan" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 3.5H4" stroke="${tc}" stroke-width="1"/></pattern>`);
      out += `<rect width="${W}" height="${H}" fill="url(#tex-scan)" opacity="${op}"/>`;
    }
    if (cv.grain) {
      this.def('tex-grain', `<filter id="tex-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${cv.grain.frequency ?? 0.9}" numOctaves="3" seed="7" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 ${cv.grain.r ?? 0.3}  0 0 0 0 ${cv.grain.g ?? 0.25}  0 0 0 0 ${cv.grain.b ?? 0.2}  0 0 0 ${cv.grain.alpha ?? 0.6} 0"/></filter>`);
      out += `<rect width="${W}" height="${H}" filter="url(#tex-grain)" opacity="${cv.grain.opacity ?? 0.18}"/>`;
    }
    if (cv.vignette) {
      this.def('tex-vignette', `<radialGradient id="tex-vignette" cx="50%" cy="45%" r="75%"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${cv.vignette}"/></radialGradient>`);
      out += `<rect width="${W}" height="${H}" fill="url(#tex-vignette)"/>`;
    }
    if (cv.frame === 'sheet') {
      const m = cv.frameInset ?? 24;
      out += `<rect x="${m}" y="${m}" width="${W - 2 * m}" height="${H - 2 * m}" fill="none" stroke="${this.c(cv.frameColor ?? 'ink')}" stroke-width="2"/><rect x="${m + 8}" y="${m + 8}" width="${W - 2 * m - 16}" height="${H - 2 * m - 16}" fill="none" stroke="${this.c(cv.frameColor ?? 'ink')}" stroke-width="0.75"/>`;
      // Zone reference ticks along the frame, like a drawing sheet.
      const cols = 8, rows = 6;
      for (let i = 1; i < cols; i++) { const x = m + ((W - 2 * m) * i) / cols; out += `<path d="M${f(x)} ${m}v8M${f(x)} ${H - m}v-8" stroke="${this.c(cv.frameColor ?? 'ink')}" stroke-width="0.75"/>`; }
      for (let i = 1; i < rows; i++) { const y = m + ((H - 2 * m) * i) / rows; out += `<path d="M${m} ${f(y)}h8M${W - m} ${f(y)}h-8" stroke="${this.c(cv.frameColor ?? 'ink')}" stroke-width="0.75"/>`; }
      const ff = this.font('mono');
      for (let i = 0; i < cols; i++) { const x = m + ((W - 2 * m) * (i + 0.5)) / cols; out += `<text x="${f(x)}" y="${m + 6.5}" font-family="${esc(ff)}" font-size="7" fill="${this.c(cv.frameColor ?? 'ink')}" text-anchor="middle">${i + 1}</text>`; }
      for (let i = 0; i < rows; i++) { const y = m + ((H - 2 * m) * (i + 0.5)) / rows; out += `<text x="${m + 4}" y="${f(y + 2.5)}" font-family="${esc(ff)}" font-size="7" fill="${this.c(cv.frameColor ?? 'ink')}" text-anchor="middle">${'ABCDEFGH'[i]}</text>`; }
    } else if (cv.frame === 'border') {
      const m = cv.frameInset ?? 20;
      out += `<rect x="${m}" y="${m}" width="${W - 2 * m}" height="${H - 2 * m}" fill="none" stroke="${this.c(cv.frameColor ?? 'ink')}" stroke-width="${cv.frameWidth ?? 1}"/>`;
    }
    return `<g id="background">${out}</g>`;
  }

  // ---------- zones ----------
  zone(z) {
    const T = this.t.zone, tn = this.zoneTone(z.tone ?? 'default');
    const style = z.style ?? T.style ?? 'outline';
    const r = z.radius ?? T.radius ?? 0;
    const sw = T.stroke ?? 1;
    const dash = (style === 'dashed' || tn.dash) ? ` stroke-dasharray="${tn.dash ?? T.dash ?? '6 5'}"` : '';
    const lf = this.font(z.labelFont ?? T.labelFont ?? 'mono');
    const ls = z.labelSize ?? T.labelSize ?? 12;
    const lsp = z.letterSpacing ?? T.letterSpacing ?? 0;
    const label = applyCase(z.label ?? '', z.labelCase ?? T.labelCase);
    let out = '';
    const sketch = this.t.node.sketch;
    if (sketch && style !== 'lane') {
      out += this.roughShape('rectangle', [z.x, z.y, z.w, z.h], { stroke: tn.stroke ?? 'none', fill: tn.fill && tn.fill !== 'none' ? tn.fill : undefined, fillStyle: tn.fillStyle ?? 'hachure', hachureGap: 10, fillWeight: 0.6, strokeWidth: sw, strokeLineDash: dash ? [8, 6] : undefined }, z.id);
    } else if (style === 'band') {
      const bh = T.bandHeight ?? 32;
      out += `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="${r}" fill="${tn.fill ?? 'none'}" stroke="${tn.stroke ?? 'none'}" stroke-width="${sw}"${dash}/>`;
      out += `<path d="M${z.x} ${z.y + bh}V${z.y + r}q0 -${r} ${r} -${r}H${z.x + z.w - r}q${r} 0 ${r} ${r}V${z.y + bh}z" fill="${tn.band ?? tn.stroke}"/>`;
    } else if (style === 'lane') {
      out += `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" fill="${tn.fill ?? 'none'}"/>`;
      out += `<path d="M${z.x} ${z.y}H${z.x + z.w}M${z.x} ${z.y + z.h}H${z.x + z.w}" stroke="${tn.stroke}" stroke-width="${sw}"${dash}/>`;
    } else if (style === 'bracket') {
      const k = 14;
      out += `<path d="M${z.x + k} ${z.y}H${z.x}V${z.y + z.h}H${z.x + k}M${z.x + z.w - k} ${z.y}H${z.x + z.w}V${z.y + z.h}H${z.x + z.w - k}" fill="none" stroke="${tn.stroke}" stroke-width="${sw}"/>`;
    } else if (style === 'rule') {
      out += `<path d="M${z.x} ${z.y}H${z.x + z.w}" stroke="${tn.stroke}" stroke-width="${T.ruleWidth ?? 2}"/>`;
    } else {
      const fill = tn.pattern || tn.gradient ? this.fillFor(tn) : (tn.fill ?? 'none');
      out += `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="${r}" fill="${fill}" stroke="${tn.stroke ?? 'none'}" stroke-width="${sw}"${dash}/>`;
    }
    // Label
    const lc = tn.text ?? this.c('muted');
    const lw = z.labelWeight ?? tn.labelWeight ?? T.labelWeight ?? 600;
    const pad = z.pad ?? T.labelPad ?? 14;
    if (label) {
      if (style === 'band') {
        out += textBlock({ x: z.x + pad, y: z.y + (T.bandHeight ?? 32) / 2 + ls * 0.36, lines: [label], size: ls, family: lf, weight: lw, color: tn.bandText ?? '#fff', letterSpacing: lsp });
      } else if (style === 'lane') {
        const lx = z.x + pad, ly = z.y + z.h / 2;
        out += `<text x="${lx}" y="${ly}" transform="rotate(-90 ${lx} ${ly})" font-family="${esc(lf)}" font-size="${ls}" font-weight="${lw}" fill="${lc}" text-anchor="middle" dominant-baseline="hanging" letter-spacing="${lsp}">${esc(label)}</text>`;
      } else if (T.labelStyle === 'vertical' || z.labelPos === 'vertical') {
        // Traditional vertical CJK label down the left edge.
        const lx = z.x + pad + ls / 2, ly = z.y + pad;
        out += `<text x="${f(lx)}" y="${f(ly)}" writing-mode="vertical-rl" font-family="${esc(lf)}" font-size="${ls}" font-weight="${lw}" fill="${lc}" letter-spacing="${lsp}">${esc(label)}</text>`;
        if (T.verticalRule) out += `<path d="M${f(z.x + pad * 2 + ls)} ${z.y + pad}V${z.y + z.h - pad}" stroke="${tn.stroke ?? lc}" stroke-width="0.8"/>`;
      } else if (z.labelPos === 'outside' || T.labelStyle === 'outside') {
        out += textBlock({ x: z.x, y: z.y - 10, lines: [label], size: ls, family: lf, weight: lw, color: lc, letterSpacing: lsp });
      } else if (T.labelStyle === 'tab') {
        const tw = measure(label, ls, lf, lsp, lw) + pad * 2;
        const th = ls + 12;
        out += `<rect x="${z.x}" y="${z.y - (T.tabOverlap ? th / 2 : 0)}" width="${f(tw)}" height="${th}" rx="${T.tabRadius ?? 0}" fill="${tn.tab ?? tn.stroke}"/>`;
        out += textBlock({ x: z.x + pad, y: z.y - (T.tabOverlap ? th / 2 : 0) + th / 2 + ls * 0.36, lines: [label], size: ls, family: lf, weight: lw, color: tn.tabText ?? '#fff', letterSpacing: lsp });
      } else if (T.labelStyle === 'notch') {
        const tw = measure(label, ls, lf, lsp, lw) + 16;
        out += `<rect x="${z.x + pad - 8}" y="${z.y - ls / 2 - 4}" width="${f(tw)}" height="${ls + 8}" fill="${this.c(this.t.canvas.bg)}"/>`;
        out += textBlock({ x: z.x + pad, y: z.y + ls * 0.36, lines: [label], size: ls, family: lf, weight: lw, color: lc, letterSpacing: lsp });
      } else if (style === 'rule') {
        out += textBlock({ x: z.x + pad, y: z.y + ls + (T.ruleGap ?? 12), lines: [label], size: ls, family: lf, weight: lw, color: lc, letterSpacing: lsp });
      } else {
        out += textBlock({ x: z.x + pad, y: z.y + pad + ls * 0.8, lines: [label], size: ls, family: lf, weight: lw, color: lc, letterSpacing: lsp });
      }
      if (z.sub && !(T.labelStyle === 'vertical' || z.labelPos === 'vertical')) {
        const sy = style === 'band' ? z.y + (T.bandHeight ?? 32) + 18 : z.y + pad + ls * 0.8 + ls + 4;
        const ss = z.subSize ?? T.subSize ?? ls - 1, sf = this.font(T.subFont ?? 'body');
        out += textBlock({ x: z.x + pad, y: sy, lines: wrap(z.sub, z.w - pad * 2, ss, sf), size: ss, family: sf, weight: 400, color: tn.sub ?? this.c('muted'), lineHeight: 1.45 });
      }
    }
    return `<g id="${esc(z.id ?? 'zone-' + hash(z.label))}" data-md="zone">${out}</g>`;
  }

  pathEl(p, i) {
    if (!/^[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]+$/.test(p.d)) throw new Error('path d may contain only SVG path commands and numbers');
    const fill = p.fill && p.fill !== 'none' ? this.c(p.fill) : 'none';
    const stroke = p.stroke && p.stroke !== 'none' ? this.c(p.stroke) : 'none';
    return `<path id="path-${i + 1}"${this.fitShift ? ` transform="translate(0 ${-this.fitShift})"` : ''} d="${p.d}" fill="${fill}" stroke="${stroke}" stroke-width="${p.width ?? 1}"${p.dash ? ` stroke-dasharray="${p.dash}"` : ''} stroke-linecap="round" stroke-linejoin="round"${p.opacity ? ` opacity="${p.opacity}"` : ''}/>`;
  }

  // Bars: progress, ranges and time spans. {x,y,w,h, from?, value, max, fill, track, radius, text, textPos, textColor, size}
  barEl(b, i) {
    const max = b.max ?? 1, from = b.from ?? 0;
    const r = b.radius ?? Math.min(b.h / 2, this.t.node.radius ?? 4);
    const x0 = b.x + (b.w * from) / max, x1 = b.x + (b.w * (b.value ?? max)) / max;
    let out = '';
    if (b.track !== false) out += `<rect x="${f(b.x)}" y="${f(b.y)}" width="${f(b.w)}" height="${f(b.h)}" rx="${r}" fill="${this.c(b.track ?? 'line')}"${b.trackOpacity ? ` opacity="${b.trackOpacity}"` : ''}/>`;
    const fw = Math.max(0, x1 - x0);
    out += `<rect x="${f(x0)}" y="${f(b.y)}" width="${f(fw)}" height="${f(b.h)}" rx="${Math.min(r, fw / 2)}" fill="${this.c(b.fill ?? 'accent')}"${b.stroke ? ` stroke="${this.c(b.stroke)}" stroke-width="${b.strokeWidth ?? 1}"` : ''}${b.dash ? ` stroke-dasharray="${b.dash}"` : ''}/>`;
    if (b.text) {
      const size = b.size ?? 12.5, fam = this.font(b.font ?? 'body');
      const pos = b.textPos ?? 'inside';
      const tx = pos === 'right' ? x1 + 8 : pos === 'after' ? b.x + b.w + 10 : pos === 'left' ? b.x - 10 : x0 + 8;
      const anchor = pos === 'left' ? 'end' : 'start';
      out += textBlock({ x: tx, y: b.y + b.h / 2 + size * 0.36, lines: [b.text], size, family: fam, weight: b.weight ?? 600, color: this.c(b.textColor ?? (pos === 'inside' ? '#FFFFFF' : 'ink')), anchor });
    }
    return `<g id="${esc(b.id ?? 'bar-' + (i + 1))}" data-md="bar">${out}</g>`;
  }

  lineEl(l, i) {
    const S = { color: 'muted', width: 1, ...(this.t.lines?.[l.kind ?? 'default'] ?? {}), ...l };
    const d = roundedPath(l.points, S.radius ?? 0);
    return `<path id="line-${i + 1}" d="${d}" fill="none" stroke="${this.c(S.color)}" stroke-width="${S.width}"${S.dash ? ` stroke-dasharray="${S.dash}"` : ''} stroke-linecap="round"${S.opacity ? ` opacity="${S.opacity}"` : ''}/>`;
  }

  // ---------- ports ----------
  assignPorts() {
    const groups = new Map();
    (this.s.edges ?? []).forEach((e, i) => {
      const a = this.nodes.get(e.from), b = this.nodes.get(e.to);
      if (!a || !b) throw new Error(`Edge ${i} references a missing node: ${e.from} -> ${e.to}`);
      const [sa, sb] = autoSides(a, b);
      e._fs = e.fromSide ?? sa; e._ts = e.toSide ?? sb;
      for (const [node, side, other, key, at] of [[a, e._fs, b, 'from', e.fromAt], [b, e._ts, a, 'to', e.toAt]]) {
        if (at != null) continue;
        const k = node.id + ':' + side;
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push({ e, key, other, side });
      }
    });
    for (const list of groups.values()) {
      const side = list[0].side;
      const horiz = side === 't' || side === 'b';
      list.sort((p, q) => (horiz ? p.other.x + p.other.w / 2 - (q.other.x + q.other.w / 2) : p.other.y + p.other.h / 2 - (q.other.y + q.other.h / 2)));
      const n = list.length;
      const node = this.nodes.get(list[0].key === 'from' ? list[0].e.from : list[0].e.to);
      if (['diamond', 'circle', 'station', 'person'].includes(node.shape)) { list.forEach((p) => { p.e['_' + p.key + 'At'] = 0.5; }); continue; }
      // Prefer straight connectors: align with the other node's centre when it faces this side.
      const span = horiz ? node.w : node.h, start = horiz ? node.x : node.y;
      const aligned = list.map((p) => ((horiz ? p.other.x + p.other.w / 2 : p.other.y + p.other.h / 2) - start) / span);
      const ok = aligned.every((a) => a >= 0.04 && a <= 0.96) && aligned.every((a, i) => i === 0 || (a - aligned[i - 1]) * span > 14);
      const spread = this.t.edge.portSpread ?? 0.6;
      list.forEach((p, i) => { p.e['_' + p.key + 'At'] = ok && (n > 1 || Math.abs(aligned[0] - 0.5) * span > 2) ? aligned[i] : n === 1 ? 0.5 : 0.5 - spread / 2 + (spread * i) / (n - 1); });
    }
  }

  edgeStyle(e) {
    const E = this.t.edge;
    const k = { ...(E.kinds?.default ?? {}), ...(E.kinds?.[e.kind ?? 'default'] ?? {}) };
    const st = { color: E.color, width: E.width ?? 1.5, dash: E.dash, arrow: E.arrow ?? 'triangle', route: E.route ?? 'ortho', radius: E.radius ?? 8, opacity: 1, glow: E.glow, ...k };
    if (e.color) st.color = e.color; if (e.width) st.width = e.width; if (e.dash) st.dash = e.dash; if (e.route) st.route = e.route; if (e.arrow) st.arrow = e.arrow;
    st.color = this.c(st.color);
    return st;
  }

  // ---------- edges ----------
  edge(e, i) {
    const a = this.nodes.get(e.from), b = this.nodes.get(e.to);
    const st = this.edgeStyle(e);
    const gap = this.t.edge.gap ?? 2;
    const S = port(a, e._fs, e.fromAt ?? e._fromAt, e.fromGap ?? gap);
    const Ep = port(b, e._ts, e.toAt ?? e._toAt, e.toGap ?? gap);
    const aSize = st.arrow === 'none' ? 0 : (this.t.edge.arrowSize ?? 8) * Math.max(1, st.width / 1.6);
    let d, endDir, startDir, pts = null, curve = null;
    const both = e.both || e.direction === 'both';
    if (st.route === 'curve') {
      const shortenBy = st.arrow === 'triangle' ? aSize * 0.8 : 0;
      const [nx, ny] = { l: [-1, 0], r: [1, 0], t: [0, -1], b: [0, 1] }[e._ts];
      const E2 = [Ep[0] + nx * shortenBy, Ep[1] + ny * shortenBy];
      const [sx, sy] = { l: [-1, 0], r: [1, 0], t: [0, -1], b: [0, 1] }[e._fs];
      const S2 = both ? [S[0] + sx * shortenBy, S[1] + sy * shortenBy] : S;
      curve = curvePath(S2, e._fs, E2, e._ts, e.bend ?? 0.45);
      curve.S = S2; curve.E = E2;
      d = curve.d;
      endDir = [-nx, -ny]; startDir = [-sx, -sy];
    } else {
      pts = st.route === 'straight' ? [S, ...(e.via ?? []), Ep] : orthoPoints(S, e._fs, Ep, e._ts, e.via ?? [], e.mid);
      const last = pts[pts.length - 1], prev = pts[pts.length - 2];
      const len = Math.hypot(last[0] - prev[0], last[1] - prev[1]) || 1;
      endDir = [(last[0] - prev[0]) / len, (last[1] - prev[1]) / len];
      const s1 = pts[1], s0 = pts[0], len0 = Math.hypot(s1[0] - s0[0], s1[1] - s0[1]) || 1;
      startDir = [(s0[0] - s1[0]) / len0, (s0[1] - s1[1]) / len0];
      let drawPts = st.arrow === 'triangle' ? shorten(pts, aSize * 0.8) : pts;
      if (both && st.arrow === 'triangle') drawPts = shorten([...drawPts].reverse(), aSize * 0.8).reverse();
      d = roundedPath(drawPts, st.radius);
    }
    const dash = st.dash ? ` stroke-dasharray="${st.dash}"` : '';
    const op = st.opacity !== 1 ? ` opacity="${st.opacity}"` : '';
    const filter = st.glow ? ` filter="url(#${this.glowFilter(st.glow)})"` : '';
    let line;
    if (this.t.edge.sketch) {
      line = this.roughPath(d, { stroke: st.color, strokeWidth: st.width, roughness: this.t.edge.sketch, strokeLineDash: st.dash ? st.dash.split(' ').map(Number) : undefined }, e.from + e.to);
    } else {
      line = `<path d="${d}" fill="none" stroke="${st.color}" stroke-width="${st.width}" stroke-linecap="${st.cap ?? 'round'}" stroke-linejoin="round"${dash}${op}${filter}/>`;
      if (st.casing) line = `<path d="${d}" fill="none" stroke="${this.c(st.casing)}" stroke-width="${st.width + (st.casingWidth ?? 4)}" stroke-linecap="round" stroke-linejoin="round"/>` + line;
    }
    const tip = curve ? Ep : pts[pts.length - 1];
    if (st.arrow !== 'none') line += this.arrow(tip, endDir, st, aSize);
    if (both && st.arrow !== 'none') line += this.arrow(curve ? S : pts[0], startDir, st, aSize);
    if (st.startDot) line += `<circle cx="${f(S[0])}" cy="${f(S[1])}" r="${st.width + 1.6}" fill="${st.color}"/>`;

    // Label + step
    let label = '';
    if (e.label || e.step != null) {
      let at;
      if (Array.isArray(e.labelAt)) at = { p: e.labelAt, horizontal: true, explicit: true };
      else if (curve) {
        const tt = e.labelAt ?? 0.5;
        const p0 = bezierPoint(curve.S, curve.c1, curve.c2, curve.E, Math.max(0, tt - 0.02)), p1 = bezierPoint(curve.S, curve.c1, curve.c2, curve.E, Math.min(1, tt + 0.02));
        at = { p: bezierPoint(curve.S, curve.c1, curve.c2, curve.E, tt), horizontal: Math.abs(p1[0] - p0[0]) >= Math.abs(p1[1] - p0[1]) };
      }
      else if (typeof e.labelAt === 'number') at = along(pts, e.labelAt);
      else at = longestSegmentMid(pts);
      label = this.edgeLabel(e, at, st);
    }
    this.usedEdgeIds ??= new Set();
    let id = esc(e.id ?? `edge-${e.from}-${e.to}`);
    if (this.usedEdgeIds.has(id)) id = `${id}-${i + 1}`;
    this.usedEdgeIds.add(id);
    // Editable exports use the same resolved ports and route as the SVG.
    const route = pts ?? [S, curve.c1, curve.c2, Ep];
    const editable = esc(JSON.stringify({ from: e.from, to: e.to, points: route, curve: !!curve, arrow: st.arrow, both: !!both, color: st.color, width: st.width, dash: st.dash ?? '', opacity: st.opacity ?? 1 }));
    return { line: `<g id="${id}" data-md="edge" data-connection="${editable}">${line}</g>`, label: label ? `<g id="${id}-label" data-md="edge-label" data-edge="${id}">${label}</g>` : '' };
  }

  glowFilter(strength) {
    const id = `glow-f-${Math.round((typeof strength === 'number' ? strength : 4) * 10)}`;
    const s = typeof strength === 'number' ? strength : 4;
    return this.def(id, `<filter id="${id}" filterUnits="userSpaceOnUse" x="0" y="0" width="${this.W}" height="${this.H}"><feGaussianBlur stdDeviation="${s}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
  }

  arrow([x, y], [dx, dy], st, size) {
    const nx = -dy, ny = dx;
    const c = st.color;
    if (st.arrow === 'triangle') {
      const w = size * 0.55;
      return `<path d="M${f(x)} ${f(y)} L${f(x - dx * size + nx * w)} ${f(y - dy * size + ny * w)} L${f(x - dx * size - nx * w)} ${f(y - dy * size - ny * w)} Z" fill="${c}"/>`;
    }
    if (st.arrow === 'open' || st.arrow === 'chevron') {
      const w = size * 0.6;
      return `<path d="M${f(x - dx * size + nx * w)} ${f(y - dy * size + ny * w)} L${f(x)} ${f(y)} L${f(x - dx * size - nx * w)} ${f(y - dy * size - ny * w)}" fill="none" stroke="${c}" stroke-width="${st.width}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    if (st.arrow === 'dot') return `<circle cx="${f(x - dx * 3)}" cy="${f(y - dy * 3)}" r="${Math.max(3, st.width + 1.5)}" fill="${c}"/>`;
    if (st.arrow === 'bar') return `<path d="M${f(x + nx * 6)} ${f(y + ny * 6)} L${f(x - nx * 6)} ${f(y - ny * 6)}" stroke="${c}" stroke-width="${st.width + 0.5}"/>`;
    return '';
  }

  edgeLabel(e, at, st) {
    const L = this.t.edge;
    const fam = this.font(L.labelFont ?? 'mono');
    const size = L.labelSize ?? 12;
    const lsp = L.labelLetterSpacing ?? 0;
    const text = e.label ? applyCase(e.label, L.labelCase) : '';
    const lines = text ? text.split('\n') : [];
    const tw = Math.max(0, ...lines.map((l) => measure(l, size, fam, lsp, L.labelWeight ?? 400)));
    const lh = size * 1.25;
    const th = lines.length * lh;
    const stepSize = this.t.step?.size ?? 22;
    const hasStep = e.step != null;
    const padX = L.labelStyle === 'chip' || L.labelStyle === 'tag' ? 7 : 4;
    const totalW = tw + (hasStep ? stepSize + (text ? 6 : 0) : 0);
    let [cx, cy] = at.p;
    const off = e.labelOffset ?? [0, 0];
    let anchorX, topY;
    const placement = e.labelPlacement ?? L.labelPlacement ?? 'on';
    if (at.explicit || placement === 'on') { anchorX = cx - totalW / 2; topY = cy - th / 2; }
    else if (at.horizontal) { anchorX = cx - totalW / 2; topY = cy - th - (L.labelGap ?? 6); }
    else { anchorX = cx + (L.labelGap ?? 8); topY = cy - th / 2; }
    anchorX += off[0]; topY += off[1];
    let out = '';
    if (text && (L.labelStyle === 'chip' || L.labelStyle === 'tag' || placement === 'on' || at.explicit || e.labelBg)) {
      const bg = this.c(L.labelBg ?? this.t.canvas.bg);
      const bx = anchorX + (hasStep ? stepSize + 6 : 0) - padX, by = topY - 3;
      const stroke = L.labelStyle === 'tag' ? ` stroke="${this.c(L.labelBorder ?? st.color)}" stroke-width="1"` : '';
      out += `<rect x="${f(bx)}" y="${f(by)}" width="${f(tw + padX * 2)}" height="${f(th + 6)}" rx="${L.labelRadius ?? 3}" fill="${bg}"${stroke}/>`;
    }
    if (hasStep) out += this.stepBadge(anchorX + stepSize / 2, topY + th / 2 || cy, e.step, e.stepTone);
    if (text) {
      const color = this.c(e.labelColor ?? L.labelColor ?? st.color);
      out += textBlock({ x: anchorX + (hasStep ? stepSize + 6 : 0), y: topY + size * 0.95, lines, size, family: fam, weight: L.labelWeight ?? 400, color, letterSpacing: lsp, lineHeight: 1.25, italic: L.labelItalic });
    }
    return out;
  }

  stepBadge(cx, cy, n, toneName) {
    const S = this.t.step ?? {};
    const size = S.size ?? 22, r = size / 2;
    const fill = this.c(toneName ? this.tone(toneName).stroke : S.fill ?? 'accent');
    const color = this.c(S.text ?? '#fff');
    const fam = this.font(S.font ?? 'mono');
    let shape;
    if (S.shape === 'square') shape = `<rect x="${f(cx - r)}" y="${f(cy - r)}" width="${size}" height="${size}" fill="${fill}"/>`;
    else if (S.shape === 'outline') shape = `<circle cx="${f(cx)}" cy="${f(cy)}" r="${r}" fill="${this.c(this.t.canvas.bg)}" stroke="${fill}" stroke-width="1.5"/>`;
    else if (S.shape === 'diamond') shape = `<path d="M${f(cx)} ${f(cy - r - 2)}L${f(cx + r + 2)} ${f(cy)}L${f(cx)} ${f(cy + r + 2)}L${f(cx - r - 2)} ${f(cy)}Z" fill="${fill}"/>`;
    else shape = `<circle cx="${f(cx)}" cy="${f(cy)}" r="${r}" fill="${fill}"/>`;
    const tc = S.shape === 'outline' ? fill : color;
    return `${shape}<text x="${f(cx)}" y="${f(cy + (S.fontSize ?? size * 0.58) * 0.35)}" font-family="${esc(fam)}" font-size="${S.fontSize ?? size * 0.58}" font-weight="${S.weight ?? 700}" fill="${tc}" text-anchor="middle" class="md-step">${esc(n)}</text>`;
  }

  // ---------- nodes ----------
  node(n) {
    const N = this.t.node;
    const tn = { ...this.tone(n.tone ?? (n.emphasis ? 'accent' : 'default')) };
    if (n.fill) { tn.fill = this.c(n.fill); delete tn.pattern; delete tn.gradient; }
    if (n.stroke) tn.stroke = this.c(n.stroke);
    if (n.textColor) tn.text = this.c(n.textColor);
    const sw = tn.strokeWidth ?? N.stroke ?? 1.25;
    const r = n.radius ?? tn.radius ?? N.radius ?? 4;
    const { x, y, w, h } = n;
    let shape = '';
    const sketch = N.sketch;
    const shadow = tn.shadow ?? N.shadow ?? 'none';
    const filter = tn.glow ? ` filter="url(#${this.glowFilter(tn.glow)})"` : '';
    const fill = this.fillFor(tn);
    const strokeAttr = `stroke="${tn.stroke ?? 'none'}" stroke-width="${sw}"${tn.dash ? ` stroke-dasharray="${tn.dash}"` : ''}`;
    const shadowOff = N.shadowOffset ?? [6, 6];
    const sc = this.c(tn.shadowColor ?? N.shadowColor ?? 'ink');
    const body = (dx = 0, dy = 0, fillOverride, strokeOverride) => this.shapePath(n, x + dx, y + dy, w, h, r, fillOverride ?? fill, strokeOverride ?? strokeAttr, filter);
    if (sketch) {
      shape += this.roughNode(n, tn, sw);
    } else {
      if (shadow === 'hard') shape += body(shadowOff[0], shadowOff[1], sc, 'stroke="none"');
      if (shadow === 'offset') shape += body(shadowOff[0], shadowOff[1], 'none', `stroke="${sc}" stroke-width="${sw}"`);
      if (shadow === 'soft') shape += `<g filter="url(#${this.softShadow()})">${body(0, 0, fill, 'stroke="none"')}</g>`;
      if (n.shape === 'stack') {
        shape += this.shapePath({ ...n, shape: 'box' }, x + 10, y - 10, w, h, r, fill, strokeAttr, '');
        shape += this.shapePath({ ...n, shape: 'box' }, x + 5, y - 5, w, h, r, fill, strokeAttr, '');
      }
      shape += body();
      if (tn.accentBar) shape += `<rect x="${x}" y="${y}" width="${tn.accentBarWidth ?? 4}" height="${h}" fill="${this.c(tn.accentBar)}"/>`;
      if (tn.topBar) shape += `<rect x="${x}" y="${y}" width="${w}" height="${tn.topBarHeight ?? 4}" fill="${this.c(tn.topBar)}"/>`;
    }
    const content = this.nodeContent(n, tn);
    const step = n.step != null ? this.stepBadge(x + (n.stepAt?.[0] ?? 0), y + (n.stepAt?.[1] ?? 0), n.step, n.stepTone) : '';
    const labelMode = (n.labelPos ?? (n.shape === 'station' ? 'right' : n.shape === 'person' ? 'below' : 'inside'));
    return `<g id="${esc(n.id)}" data-md="node" data-box="${f(x)},${f(y)},${f(w)},${f(h)}" data-shape="${esc(n.shape)}" data-label="${esc(labelMode)}"${n.overlap ? ' data-overlap="1"' : ''}>${shape}${content}${step}</g>`;
  }

  fillFor(tn) {
    if (tn.pattern) {
      const p = tn.pattern; // {type:'dots'|'hatch', color, gap, size}
      const id = `pat-${hash(JSON.stringify(p))}`;
      const g = p.gap ?? 6, col = this.c(p.color);
      if (p.type === 'hatch') this.def(id, `<pattern id="${id}" width="${g}" height="${g}" patternUnits="userSpaceOnUse" patternTransform="rotate(${p.angle ?? 45})"><rect width="${g}" height="${g}" fill="${this.c(p.bg ?? 'none')}"/><path d="M0 0V${g}" stroke="${col}" stroke-width="${p.size ?? 1}"/></pattern>`);
      else this.def(id, `<pattern id="${id}" width="${g}" height="${g}" patternUnits="userSpaceOnUse" patternTransform="rotate(${p.angle ?? 20})"><rect width="${g}" height="${g}" fill="${this.c(p.bg ?? 'none')}"/><circle cx="${g / 2}" cy="${g / 2}" r="${p.size ?? 1.4}" fill="${col}"/></pattern>`);
      return `url(#${id})`;
    }
    if (tn.gradient) {
      const [c1, c2] = tn.gradient.map((c) => this.c(c));
      const id = `grad-${hash(c1 + c2)}`;
      this.def(id, `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`);
      return `url(#${id})`;
    }
    return tn.fill ?? 'none';
  }

  softShadow() {
    const S = this.t.node.softShadow ?? { dy: 6, blur: 10, opacity: 0.12, color: '#0B1020' };
    return this.def('soft-shadow', `<filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="${S.dy}" stdDeviation="${S.blur}" flood-color="${S.color}" flood-opacity="${S.opacity}"/><feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="${S.color}" flood-opacity="${S.opacity * 0.8}"/></filter>`);
  }

  shapePath(n, x, y, w, h, r, fill, strokeAttr, filter = '') {
    const s = n.shape;
 if (s === 'pill' || s === 'chip') return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(w, h) / 2}" fill="${fill}" ${strokeAttr}${filter}/>`;
    if (s === 'circle') return `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" fill="${fill}" ${strokeAttr}${filter}/>`;
    if (s === 'station') { const rr = Math.min(w, h) / 2; return `<circle cx="${x + w / 2}" cy="${y + h / 2}" r="${rr}" fill="${fill}" ${strokeAttr}${filter}/>`; }
    if (s === 'cylinder') {
      const ry = Math.min(14, h * 0.14);
      return `<path d="M${x} ${y + ry}V${y + h - ry}A${w / 2} ${ry} 0 0 0 ${x + w} ${y + h - ry}V${y + ry}A${w / 2} ${ry} 0 0 0 ${x} ${y + ry}Z" fill="${fill}" ${strokeAttr}${filter}/><path d="M${x} ${y + ry}A${w / 2} ${ry} 0 0 0 ${x + w} ${y + ry}" fill="none" ${strokeAttr}/>`;
    }
    if (s === 'queue') {
      const rx = Math.min(12, w * 0.08);
      return `<path d="M${x + rx} ${y}H${x + w - rx}A${rx} ${h / 2} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${h / 2} 0 0 1 ${x + rx} ${y}Z" fill="${fill}" ${strokeAttr}${filter}/><path d="M${x + w - rx} ${y}A${rx} ${h / 2} 0 0 0 ${x + w - rx} ${y + h}" fill="none" ${strokeAttr}/>`;
    }
    if (s === 'hex') {
      const k = Math.min(18, w * 0.15);
      return `<path d="M${x + k} ${y}H${x + w - k}L${x + w} ${y + h / 2}L${x + w - k} ${y + h}H${x + k}L${x} ${y + h / 2}Z" fill="${fill}" ${strokeAttr} stroke-linejoin="round"${filter}/>`;
    }
    if (s === 'diamond') return `<path d="M${x + w / 2} ${y}L${x + w} ${y + h / 2}L${x + w / 2} ${y + h}L${x} ${y + h / 2}Z" fill="${fill}" ${strokeAttr} stroke-linejoin="round"${filter}/>`;
    if (s === 'doc') {
      const k = 14;
      return `<path d="M${x} ${y}H${x + w - k}L${x + w} ${y + k}V${y + h}H${x}Z" fill="${fill}" ${strokeAttr} stroke-linejoin="round"${filter}/><path d="M${x + w - k} ${y}V${y + k}H${x + w}" fill="none" ${strokeAttr}/>`;
    }
    if (s === 'browser') {
      const bar = 18;
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${strokeAttr}${filter}/><path d="M${x} ${y + bar}H${x + w}" ${strokeAttr} fill="none"/>` + [0, 1, 2].map((i) => `<circle cx="${x + 10 + i * 9}" cy="${y + bar / 2}" r="2.4" fill="none" ${strokeAttr}/>`).join('');
    }
    if (s === 'person') {
      const cx = x + w / 2, hr = Math.min(16, h * 0.17), top = y + 4;
      return `<circle cx="${cx}" cy="${top + hr}" r="${hr}" fill="${fill}" ${strokeAttr}${filter}/><path d="M${cx - hr * 1.9} ${top + hr * 4.3}C${cx - hr * 1.9} ${top + hr * 2.6} ${cx - hr} ${top + hr * 2.25} ${cx} ${top + hr * 2.25}S${cx + hr * 1.9} ${top + hr * 2.6} ${cx + hr * 1.9} ${top + hr * 4.3}Z" fill="${fill}" ${strokeAttr} stroke-linejoin="round"/>`;
    }
    if (s === 'cloud') {
      const p = (u, v) => `${f(x + u * w)} ${f(y + v * h)}`;
      return `<path d="M${p(0.25, 0.9)}C${p(0.06, 0.9)} ${p(0.02, 0.55)} ${p(0.2, 0.5)}C${p(0.18, 0.2)} ${p(0.45, 0.08)} ${p(0.55, 0.3)}C${p(0.65, 0.1)} ${p(0.92, 0.2)} ${p(0.82, 0.48)}C${p(1.0, 0.5)} ${p(1.0, 0.9)} ${p(0.78, 0.9)}Z" fill="${fill}" ${strokeAttr}${filter}/>`;
    }
    if (s === 'chevron') {
      const k = n.notch ?? Math.min(22, h * 0.4);
      const first = n.first ? 0 : k;
      return `<path d="M${x} ${y}H${x + w - k}L${x + w} ${y + h / 2}L${x + w - k} ${y + h}H${x}L${x + first} ${y + h / 2}Z" fill="${fill}" ${strokeAttr} stroke-linejoin="round"${filter}/>`;
    }
    if (s === 'trapezoid' && n.flip) {
      const k = n.inset ?? w * 0.12;
      return `<path d="M${x + k} ${y}H${x + w - k}L${x + w} ${y + h}H${x}Z" fill="${fill}" ${strokeAttr} stroke-linejoin="round"${filter}/>`;
    }
    if (s === 'trapezoid') {
      const k = n.inset ?? w * 0.12;
      return `<path d="M${x} ${y}H${x + w}L${x + w - k} ${y + h}H${x + k}Z" fill="${fill}" ${strokeAttr} stroke-linejoin="round"${filter}/>`;
    }
    if (s === 'parallelogram') {
      const k = Math.min(20, w * 0.12);
      return `<path d="M${x + k} ${y}H${x + w}L${x + w - k} ${y + h}H${x}Z" fill="${fill}" ${strokeAttr} stroke-linejoin="round"${filter}/>`;
    }
    if (s === 'text') return '';
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${strokeAttr}${filter}/>`;
  }

  roughOpts(o, seedKey) {
    return { seed: hash(seedKey), roughness: this.t.node.sketch ?? 1, bowing: this.t.node.bowing ?? 1, ...o };
  }

  roughDraw(drawable, dash) {
    const da = dash ? ` stroke-dasharray="${dash.join(' ')}"` : '';
    return gen.toPaths(drawable).map((p) => `<path d="${p.d}" fill="${p.fill ?? 'none'}" stroke="${p.stroke ?? 'none'}" stroke-width="${p.strokeWidth ?? 1}" stroke-linecap="round" stroke-linejoin="round"${p.fill && p.fill !== 'none' ? '' : da}/>`).join('');
  }

  roughShape(kind, args, o, seedKey) {
    const opts = this.roughOpts({ fillWeight: 1, hachureGap: 6, ...o }, seedKey ?? JSON.stringify(args));
    if (!opts.fill) delete opts.fill;
    const dash = opts.strokeLineDash; delete opts.strokeLineDash;
    return this.roughDraw(gen[kind](...args, opts), dash);
  }

  roughPath(d, o, seedKey) {
    const opts = this.roughOpts(o, seedKey);
    const dash = opts.strokeLineDash; delete opts.strokeLineDash;
    opts.roughness = o.roughness ?? this.t.edge.sketch;
    opts.bowing = 0.6;
    return this.roughDraw(gen.path(d, opts), dash);
  }

  roughNode(n, tn, sw) {
    const { x, y, w, h } = n;
    const o = { stroke: tn.stroke, strokeWidth: sw, fill: tn.fill && tn.fill !== 'none' ? tn.fill : undefined, fillStyle: tn.fillStyle ?? 'hachure', hachureGap: tn.hachureGap ?? 7, hachureAngle: tn.hachureAngle ?? -41, fillWeight: tn.fillWeight ?? 1.2 };
    const key = n.id;
    if (n.shape === 'circle' || n.shape === 'station') return this.roughShape('ellipse', [x + w / 2, y + h / 2, w, h], o, key);
    if (n.shape === 'cylinder') {
      const ry = Math.min(14, h * 0.14);
      return this.roughPath(`M${x} ${y + ry}V${y + h - ry}A${w / 2} ${ry} 0 0 0 ${x + w} ${y + h - ry}V${y + ry}`, { ...o, roughness: this.t.node.sketch }, key + 'b') + this.roughShape('ellipse', [x + w / 2, y + ry, w, ry * 2], o, key);
    }
    if (n.shape === 'person') {
      const cx = x + w / 2, hr = Math.min(16, h * 0.17), top = y + 4;
      return this.roughShape('circle', [cx, top + hr, hr * 2], o, key) + this.roughPath(`M${cx - hr * 1.9} ${top + hr * 4.3}C${cx - hr * 1.9} ${top + hr * 2.6} ${cx - hr} ${top + hr * 2.25} ${cx} ${top + hr * 2.25}S${cx + hr * 1.9} ${top + hr * 2.6} ${cx + hr * 1.9} ${top + hr * 4.3}`, { ...o, roughness: this.t.node.sketch }, key + 'p');
    }
    if (n.shape === 'diamond') return this.roughShape('polygon', [[[x + w / 2, y], [x + w, y + h / 2], [x + w / 2, y + h], [x, y + h / 2]]], o, key);
    if (n.shape === 'text') return '';
    return this.roughShape('rectangle', [x, y, w, h], o, key);
  }

  nodeContent(n, tn) {
    const N = this.t.node;
    if (!n.label && !n.sub && !n.tag && !n.icon) return '';
    const fam = this.font(n.font ?? N.font ?? 'body');
    const size = n.size ?? tn.size ?? N.size ?? 16;
    const weight = n.weight ?? tn.weight ?? N.weight ?? 500;
    const lsp = N.letterSpacing ?? 0;
    const label = applyCase(n.label ?? '', tn.case ?? N.case);
    const subFam = this.font(N.subFont ?? 'body');
    const subSize = n.subSize ?? N.subSize ?? 12;
    const tagFam = this.font(N.tagFont ?? 'mono');
    const tagSize = n.tagSize ?? N.tagSize ?? 11;
    const pad = N.padding ?? 12;
    const align = n.align ?? (['diamond', 'circle', 'hex'].includes(n.shape) ? 'center' : null) ?? tn.align ?? N.align ?? 'center';
    const icon = n.icon && ICONS[n.icon] ? n.icon : null;
    const iconSize = N.iconSize ?? 20;
    const lh = N.lineHeight ?? 1.25;
    let { x, y, w, h } = n;

    // Outside labels (stations, persons in some themes, explicit labelPos).
    const pos = n.labelPos ?? (n.shape === 'station' ? 'right' : n.shape === 'person' ? 'below' : 'inside');
    if (n.shape === 'person' && pos === 'below') {
      const hr = Math.min(16, h * 0.17);
      const top = y + 4 + hr * 4.3 + 8;
      const lines = wrap(label, w + 24, size, fam, lsp, weight);
      let out = textBlock({ x: x + w / 2, y: top + size * 0.85, lines, size, family: fam, weight, color: tn.labelOut ?? tn.text, anchor: 'middle', lineHeight: lh, letterSpacing: lsp });
      if (n.sub) out += textBlock({ x: x + w / 2, y: top + size * 0.85 + lines.length * size * lh + 2, lines: wrap(n.sub, w + 40, subSize, subFam), size: subSize, family: subFam, color: tn.subOut ?? tn.sub, anchor: 'middle', lineHeight: 1.3 });
      return out;
    }
    if (pos !== 'inside') {
      const lines = label.split('\n');
      const subLines = n.sub ? n.sub.split('\n') : [];
      const blockH = lines.length * size * lh + (subLines.length ? subLines.length * subSize * 1.3 + 2 : 0);
      const gapO = n.labelGap ?? 10;
      let tx, ty, anchor;
      if (pos === 'right') { tx = x + w + gapO; ty = y + h / 2 - blockH / 2; anchor = 'start'; }
      else if (pos === 'left') { tx = x - gapO; ty = y + h / 2 - blockH / 2; anchor = 'end'; }
      else if (pos === 'above') { tx = x + w / 2; ty = y - gapO - blockH; anchor = 'middle'; }
      else { tx = x + w / 2; ty = y + h + gapO; anchor = 'middle'; }
      if (n.labelDx) tx += n.labelDx; if (n.labelDy) ty += n.labelDy;
      let out = textBlock({ x: tx, y: ty + size * 0.85, lines, size, family: fam, weight, color: n.labelColor ? this.c(n.labelColor) : (tn.labelOut ?? this.c('ink')), anchor, lineHeight: lh, letterSpacing: lsp });
      if (subLines.length) out += textBlock({ x: tx, y: ty + size * 0.85 + lines.length * size * lh + 2, lines: subLines, size: subSize, family: subFam, color: tn.subOut ?? this.c('muted'), anchor, lineHeight: 1.3 });
      return out;
    }

    const iconLeft = icon && align === 'left';
    const textX0 = x + pad + (iconLeft ? iconSize + 10 : 0);
    const avail = w - pad * 2 - (iconLeft ? iconSize + 10 : 0);
    const lines = wrap(label, avail, size, fam, lsp, weight);
    const tagLines = n.tag ? wrap(applyCase(n.tag, N.tagCase), avail, tagSize, tagFam) : [];
    const subLines = n.sub ? wrap(n.sub, avail, subSize, subFam) : [];
    const tagPos = N.tagPos ?? 'above';
    const gapA = N.gap ?? 5;
    const parts = [];
    if (tagLines.length && tagPos === 'above') parts.push({ kind: 'tag', lines: tagLines, size: tagSize, lh: 1.25 });
    parts.push({ kind: 'label', lines, size, lh });
    if (tagLines.length && tagPos === 'below') parts.push({ kind: 'tag', lines: tagLines, size: tagSize, lh: 1.25 });
    if (subLines.length) parts.push({ kind: 'sub', lines: subLines, size: subSize, lh: 1.32 });
    const blockH = parts.reduce((acc, p, i) => acc + p.lines.length * p.size * p.lh - (p.size * (p.lh - 1)) + (i ? gapA : 0), 0) + (icon && !iconLeft ? iconSize + 8 : 0);
    let top = y + (h - blockH) / 2;
    if (n.shape === 'cylinder') top += Math.min(14, h * 0.14) * 0.6;
    if (n.shape === 'browser') top += 9;
    if (n.valign === 'top') top = y + pad + (n.shape === 'browser' ? 18 : 0);
    let out = '';
    const anchor = align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle';
    const tx = align === 'left' ? textX0 : align === 'right' ? x + w - pad : x + w / 2;
    if (tn.plate) {
      const widest = Math.max(...parts.map((p) => Math.max(...p.lines.map((l) => measure(l, p.size, p.kind === 'label' ? fam : p.kind === 'tag' ? tagFam : subFam, p.kind === 'label' ? lsp : 0, p.kind === 'label' ? weight : 400)))));
      const px = anchor === 'start' ? tx - 8 : tx - widest / 2 - 8;
      out += `<rect x="${f(px)}" y="${f(top - 7)}" width="${f(widest + 16)}" height="${f(blockH + 14)}" fill="${this.c(tn.plate)}"/>`;
    }
    if (icon) {
      const ic = this.c(tn.icon ?? tn.text);
      if (iconLeft) out += iconSvg(icon, x + pad, y + (n.valign === 'top' ? pad : (h - iconSize) / 2), iconSize, ic, N.iconStroke ?? 1.6);
      else { out += iconSvg(icon, x + w / 2 - iconSize / 2, top, iconSize, ic, N.iconStroke ?? 1.6); top += iconSize + 8; }
    }
    parts.forEach((p, i) => {
      if (i) top += gapA;
      const isLabel = p.kind === 'label';
      const fam2 = isLabel ? fam : p.kind === 'tag' ? tagFam : subFam;
      const color = isLabel ? tn.text : p.kind === 'tag' ? (tn.tag ?? tn.sub) : tn.sub;
      const weight2 = isLabel ? weight : p.kind === 'tag' ? (N.tagWeight ?? 500) : 400;
      out += textBlock({ x: tx, y: top + p.size * 0.82, lines: p.lines, size: p.size, family: fam2, weight: weight2, color, anchor, lineHeight: p.lh, letterSpacing: isLabel ? lsp : p.kind === 'tag' ? (N.tagLetterSpacing ?? 0) : 0, italic: p.kind === 'sub' && N.subItalic, cls: `md-${p.kind}` });
      top += p.lines.length * p.size * p.lh - p.size * (p.lh - 1);
    });
    return out;
  }

  // ---------- notes ----------
  note(n, i) {
    const S = { ...(this.t.note ?? {}), ...(n.variant ? (this.t.noteStyles?.[n.variant] ?? {}) : {}) };
    const style = n.style ?? S.style ?? 'margin';
    const fam = this.font(S.font ?? 'body');
    const size = n.size ?? S.size ?? 14;
    const color = this.c(n.color ?? S.color ?? 'muted');
    const w = n.w ?? 220;
    const pad = style === 'sticky' || style === 'callout' ? 12 : 0;
    const numW = n.num != null && style === 'margin' ? Math.max(26, measure(String(n.num), size * 1.1, this.font(S.numFont ?? 'display'), 0, 700) + 12) : 0;
    const prefix = style === 'comment' ? (S.prefix ?? '// ') : '';
    const lines = wrap(prefix + n.text, w - pad * 2 - numW, size, fam, 0, S.weight ?? 400);
    const lh = S.lineHeight ?? 1.4;
    const th = lines.length * size * lh;
    let out = '';
    const x = n.x, y = n.y;
    const boxH = th + pad * 2 + (n.title ? size * 1.5 : 0);
    if (style === 'sticky') {
      const rot = n.rotate ?? ((hash(n.text) % 5) - 2) * 0.9;
      const fill = this.c(n.fill ?? S.fill ?? '#FFE58A');
      out += `<g transform="rotate(${rot} ${x + w / 2} ${y + boxH / 2})"><rect x="${x + 3}" y="${y + 4}" width="${w}" height="${boxH}" fill="#000" opacity="0.08"/><rect x="${x}" y="${y}" width="${w}" height="${boxH}" fill="${fill}"/>`;
      if (S.tape) out += `<rect x="${x + w / 2 - 28}" y="${y - 9}" width="56" height="18" fill="${this.c(S.tape)}" opacity="0.55" transform="rotate(-3 ${x + w / 2} ${y})"/>`;
    } else if (style === 'callout') {
      out += `<g><rect x="${x}" y="${y}" width="${w}" height="${boxH}" rx="${S.radius ?? 4}" fill="${this.c(S.fill ?? this.t.canvas.bg)}" stroke="${this.c(S.stroke ?? 'muted')}" stroke-width="1"${S.dash ? ` stroke-dasharray="${S.dash}"` : ''}/>`;
    } else out += '<g>';
    let ty = y + pad;
    if (n.title) {
      out += textBlock({ x: x + pad, y: ty + size, lines: [n.title], size: size, family: this.font(S.titleFont ?? S.font ?? 'body'), weight: 700, color: this.c(S.titleColor ?? 'ink') });
      ty += size * 1.5;
    }
    if (n.num != null && style === 'margin') {
      out += `<text x="${x}" y="${ty + size * 0.9}" font-family="${esc(this.font(S.numFont ?? 'display'))}" font-size="${size * 1.1}" font-weight="700" fill="${this.c(S.numColor ?? 'accent')}">${esc(n.num)}</text>`;
    }
    out += textBlock({ x: x + pad + numW, y: ty + size * 0.9, lines, size, family: fam, weight: S.weight ?? 400, color, lineHeight: lh, italic: S.italic });
    out += '</g>';
    // Leader to a target node or point.
    if (n.target || n.to) {
      const tgt = n.target ? this.nodes.get(n.target) : null;
      let px, py;
      if (Array.isArray(n.to)) [px, py] = n.to;
      else if (tgt) {
        const cx = tgt.x + tgt.w / 2, cy = tgt.y + tgt.h / 2;
        const nx = x + w / 2, ny = y + boxH / 2;
        if (Math.abs(nx - cx) > Math.abs(ny - cy)) { px = nx < cx ? tgt.x : tgt.x + tgt.w; py = cy; } else { px = cx; py = ny < cy ? tgt.y : tgt.y + tgt.h; }
      }
      if (px != null) {
        const from = n.from ?? (() => {
          const nx = Math.max(x, Math.min(px, x + w)), ny = Math.max(y, Math.min(py, y + boxH));
          if (px < x) return [x - 6, Math.min(Math.max(py, y + 8), y + boxH - 8)];
          if (px > x + w) return [x + w + 6, Math.min(Math.max(py, y + 8), y + boxH - 8)];
          return [nx, py < y ? y - 6 : y + boxH + 6];
        })();
        const lc = this.c(S.leader ?? color);
        const pts = n.elbow ? [from, [px, from[1]], [px, py]] : [from, [px, py]];
        out += `<path d="${roundedPath(pts, 6)}" fill="none" stroke="${lc}" stroke-width="${S.leaderWidth ?? 1}"${S.leaderDash ? ` stroke-dasharray="${S.leaderDash}"` : ''}/><circle cx="${f(px)}" cy="${f(py)}" r="${S.leaderDot ?? 2.6}" fill="${lc}"/>`;
      }
    }
    return `<g id="note-${i + 1}" data-md="note" data-box="${f(x)},${f(y)},${f(w)},${f(boxH)}">${out}</g>`;
  }

  // ---------- legend ----------
  legend(L) {
    const S = this.t.legend ?? {};
    const fam = this.font(S.font ?? 'mono');
    const size = S.size ?? 12;
    const color = this.c(S.color ?? 'muted');
    const dir = L.direction ?? 'row';
    let x = L.x, y = L.y;
    let out = '';
    if (L.title) { out += textBlock({ x, y: y + size, lines: [applyCase(L.title, S.titleCase)], size, family: fam, weight: 700, color: this.c(S.titleColor ?? 'ink'), letterSpacing: S.letterSpacing ?? 0 }); if (dir === 'row') x += measure(L.title, size, fam, S.letterSpacing ?? 0, 700) + 24; else y += size * 2; }
    for (const it of L.items ?? []) {
      let sw = '';
      const sy = y + size * 0.62;
      if (it.kind) {
        const st = this.edgeStyle({ kind: it.kind });
        sw = `<path d="M${x} ${sy}H${x + 34}" stroke="${st.color}" stroke-width="${st.width}"${st.dash ? ` stroke-dasharray="${st.dash}"` : ''} stroke-linecap="round"${st.glow ? ` filter="url(#${this.glowFilter(st.glow)})"` : ''}/>` + (st.arrow !== 'none' ? this.arrow([x + 38, sy], [1, 0], st, 7) : '');
      } else if (it.tone) {
        const tn = this.tone(it.tone);
        sw = `<rect x="${x}" y="${sy - 8}" width="22" height="16" rx="${Math.min(4, this.t.node.radius ?? 3)}" fill="${this.fillFor(tn)}" stroke="${tn.stroke ?? 'none'}" stroke-width="1.2"/>`;
      } else if (it.zone) {
        const zt = this.zoneTone(it.zone);
        sw = `<rect x="${x}" y="${sy - 8}" width="22" height="16" fill="${zt.fill ?? 'none'}" stroke="${zt.stroke ?? 'none'}" stroke-width="1"${zt.dash ? ` stroke-dasharray="4 3"` : ''}/>`;
      }
      const offset = it.kind ? 48 : 32;
      out += sw + textBlock({ x: x + offset, y: y + size * 0.98, lines: [it.label], size, family: fam, color });
      if (dir === 'row') x += offset + measure(it.label, size, fam) + 28; else y += size * 2;
    }
    return out;
  }

  freeText(t) {
    const fam = this.font(t.font ?? 'body');
    const lines = t.w ? wrap(t.text, t.w, t.size ?? 14, fam, t.letterSpacing ?? 0, t.weight ?? 400) : String(t.text).split('\n');
    let out = textBlock({ x: t.x, y: t.y, lines: lines.map((l) => applyCase(l, t.case)), size: t.size ?? 14, family: fam, weight: t.weight ?? 400, color: this.c(t.color ?? 'ink'), anchor: t.anchor ?? 'start', letterSpacing: t.letterSpacing ?? 0, italic: t.italic, opacity: t.opacity, lineHeight: t.lineHeight ?? 1.3 });
    if (t.rotate) out = `<g transform="rotate(${t.rotate} ${t.x} ${t.y})">${out}</g>`;
    return out;
  }

  // ---------- header & footer ----------
  header() {
    const H = this.t.header ?? {}, s = this.s;
    if (s.header === false) { this.headerBottom = 0; return ''; }
    const m = this.t.canvas.margin ?? 56;
    const fam = this.font(H.titleFont ?? 'display');
    const size = s.titleSize ?? H.titleSize ?? 40;
    const color = this.c(H.titleColor ?? 'ink');
    const kFam = this.font(H.kickerFont ?? 'mono');
    const kSize = H.kickerSize ?? 12;
    const kColor = this.c(H.kickerColor ?? 'accent');
    const subFam = this.font(H.subFont ?? 'body');
    const subSize = H.subSize ?? 17;
    const subColor = this.c(H.subColor ?? 'muted');
    const lsp = H.kickerLetterSpacing ?? 2;
    const title = applyCase(s.title ?? '', H.titleCase);
    const layout = H.layout ?? 'minimal';
    const subW = s.subtitleWidth ?? H.subWidth ?? 980;
    let out = '';
    if (layout === 'editorial' || layout === 'minimal' || layout === 'poster') {
      let y = m;
      if (s.kicker && layout !== 'minimal') { out += textBlock({ x: m, y: y + kSize, lines: [applyCase(s.kicker, H.kickerCase ?? 'upper')], size: kSize, family: kFam, weight: H.kickerWeight ?? 600, color: kColor, letterSpacing: lsp }); y += kSize + (H.kickerGap ?? 18); }
      const tl = title.split('\n');
      out += textBlock({ x: m, y: y + size * 0.86, lines: tl, size, family: fam, weight: H.titleWeight ?? 600, color, letterSpacing: H.titleLetterSpacing ?? 0, lineHeight: H.titleLineHeight ?? 1.08 });
      y += size * (tl.length - 1) * (H.titleLineHeight ?? 1.08) + size + 14;
      if (s.subtitle) { const sl = wrap(s.subtitle, subW, subSize, subFam); out += textBlock({ x: m, y: y + subSize, lines: sl, size: subSize, family: subFam, color: subColor, lineHeight: 1.45, italic: H.subItalic }); y += sl.length * subSize * 1.45 + 6; }
      this.headerBottom = y + (H.rule ? 16 : 0);
      if (H.rule) out += `<path d="M${m} ${y + 16}H${this.W - m}" stroke="${this.c(H.rule)}" stroke-width="${H.ruleWidth ?? 1}"/>`;
      if (s.figure ?? H.figure) out += textBlock({ x: this.W - m, y: m + kSize, lines: [applyCase(s.figure ?? H.figure, 'upper')], size: kSize, family: kFam, color: this.c(H.figureColor ?? 'muted'), anchor: 'end', letterSpacing: lsp });
    } else if (layout === 'banner') {
      const bh = H.bandHeight ?? 96;
      out += `<rect width="${this.W}" height="${bh}" fill="${this.c(H.band ?? 'ink')}"/>`;
      out += textBlock({ x: m, y: bh / 2 + size * 0.34, lines: [title], size, family: fam, weight: H.titleWeight ?? 700, color: this.c(H.bandText ?? '#fff'), letterSpacing: H.titleLetterSpacing ?? 0 });
      if (s.kicker) out += textBlock({ x: this.W - m, y: bh / 2 + kSize * 0.36, lines: [applyCase(s.kicker, 'upper')], size: kSize, family: kFam, color: this.c(H.bandMuted ?? kColor), anchor: 'end', letterSpacing: lsp });
      this.headerBottom = bh;
      if (s.subtitle) { const sl = wrap(s.subtitle, subW, subSize, subFam); out += textBlock({ x: m, y: bh + 34, lines: sl, size: subSize, family: subFam, color: subColor, lineHeight: 1.45 }); this.headerBottom = bh + 34 + sl.length * subSize * 1.45; }
    } else if (layout === 'terminal') {
      const prompt = s.kicker ?? 'musedraw render scene.json';
      const pc = this.c(H.promptColor ?? 'accent');
      out += `<text x="${m}" y="${m + kSize}" font-family="${esc(kFam)}" font-size="${kSize + 2}" fill="${subColor}"><tspan fill="${pc}">❯</tspan> ${esc(prompt)}</text>`;
      out += textBlock({ x: m, y: m + kSize + 24 + size * 0.86, lines: [title], size, family: fam, weight: H.titleWeight ?? 700, color });
      this.headerBottom = m + kSize + 24 + size + 6;
      if (s.subtitle) { const sl = wrap((H.subPrefix ?? '# ') + s.subtitle, subW, subSize, subFam); out += textBlock({ x: m, y: m + kSize + 24 + size + 30, lines: sl, size: subSize, family: subFam, color: subColor, lineHeight: 1.45 }); this.headerBottom = m + kSize + 24 + size + 30 + (sl.length - 1) * subSize * 1.45 + 6; }
      if (H.windowDots) out += [0, 1, 2].map((i) => `<circle cx="${this.W - m - 40 + i * 18}" cy="${m + 6}" r="5" fill="${this.c(H.windowDots[i])}"/>`).join('');
    } else if (layout === 'seal') {
      out += textBlock({ x: m, y: m + size * 0.9, lines: [title], size, family: fam, weight: H.titleWeight ?? 400, color, letterSpacing: H.titleLetterSpacing ?? 4 });
      const tw = measure(title, size, fam, H.titleLetterSpacing ?? 4);
      const sealChars = s.seal ?? H.seal ?? '墨图';
      const sx = m + tw + 28, sy = m + 6, ss = size * 0.95;
      out += `<rect x="${f(sx)}" y="${sy}" width="${f(ss)}" height="${f(ss)}" rx="3" fill="${this.c(H.sealColor ?? 'accent')}"/>`;
      const chars = [...sealChars];
      const cs = chars.length > 2 ? ss * 0.38 : ss * 0.4;
      chars.slice(0, 4).forEach((ch, k) => {
        const col = chars.length > 2 ? 1 - Math.floor(k / 2) : 0; const row = chars.length > 2 ? k % 2 : k;
        const cx = chars.length > 2 ? sx + ss * (0.3 + col * 0.4) : sx + ss / 2;
        const cy = sy + ss * (chars.length > 1 ? 0.42 + row * 0.4 : 0.6);
        out += `<text x="${f(cx)}" y="${f(cy)}" font-family="${esc(fam)}" font-size="${f(chars.length > 1 ? cs * 1.05 : ss * 0.6)}" fill="${this.c(H.sealText ?? '#F6EFE1')}" text-anchor="middle">${esc(ch)}</text>`;
      });
      if (s.kicker) out += textBlock({ x: m, y: m + size + 34, lines: [s.kicker], size: kSize, family: kFam, color: kColor, letterSpacing: lsp });
      this.headerBottom = m + size + 34 + (s.kicker ? 4 : -20);
      if (s.subtitle) { const sl = wrap(s.subtitle, subW, subSize, subFam); out += textBlock({ x: m, y: m + size + 34 + (s.kicker ? kSize + 16 : 0), lines: sl, size: subSize, family: subFam, color: subColor, lineHeight: 1.6 }); this.headerBottom = m + size + 34 + (s.kicker ? kSize + 16 : 0) + (sl.length - 1) * subSize * 1.6 + 6; }
    } else if (layout === 'titleblock') {
      const fm = this.t.canvas.frameInset ?? 24;
      out += textBlock({ x: m, y: m + size * 0.9, lines: [title], size, family: fam, weight: H.titleWeight ?? 600, color });
      this.headerBottom = m + size;
      if (s.subtitle) { const sl = wrap(s.subtitle, subW, subSize, subFam); out += textBlock({ x: m, y: m + size + 22, lines: sl, size: subSize, family: subFam, color: subColor, lineHeight: 1.4 }); this.headerBottom = m + size + 22 + (sl.length - 1) * subSize * 1.4 + 6; }
      const meta = s.meta ?? {};
      const rows = [[H.labels?.title ?? 'TITLE', s.shortTitle ?? s.title], [H.labels?.dwg ?? 'DWG NO.', meta.dwg ?? 'MD-0001'], [H.labels?.rev ?? 'REV', meta.rev ?? 'A'], [H.labels?.scale ?? 'SCALE', meta.scale ?? 'NTS'], [H.labels?.date ?? 'DATE', meta.date ?? ''], [H.labels?.by ?? 'DRAWN', meta.by ?? 'MuseDraw']];
      const bw = H.blockWidth ?? 420, rh = 22, bx = this.W - fm - 8 - bw, by = this.H - fm - 8 - rh * 4;
      const ink = this.c('ink');
      out += `<rect x="${bx}" y="${by}" width="${bw}" height="${rh * 4}" fill="${this.c(this.t.canvas.bg)}" stroke="${ink}" stroke-width="1.5"/>`;
      out += `<path d="M${bx} ${by + rh * 2}H${bx + bw}M${bx} ${by + rh * 3}H${bx + bw}M${bx + bw / 3} ${by + rh * 2}V${by + rh * 4}M${bx + (bw * 2) / 3} ${by + rh * 2}V${by + rh * 4}" stroke="${ink}" stroke-width="0.75"/>`;
      const lf = this.font('mono');
      out += `<text x="${bx + 8}" y="${by + 12}" font-family="${esc(lf)}" font-size="8" fill="${subColor}">${esc(rows[0][0])}</text>`;
      out += textBlock({ x: bx + 8, y: by + 34, lines: [rows[0][1]], size: 15, family: this.font('display'), weight: 600, color: ink });
      rows.slice(1).forEach(([k, v], idx) => {
        const cx = bx + (bw / 3) * (idx % 3), cy = by + rh * 2 + rh * Math.floor(idx / 3);
        out += `<text x="${cx + 6}" y="${cy + 8.5}" font-family="${esc(lf)}" font-size="7" fill="${subColor}">${esc(k)}</text><text x="${cx + 6}" y="${cy + 18.5}" font-family="${esc(lf)}" font-size="10" fill="${ink}">${esc(v)}</text>`;
      });
    }
    return out;
  }

  footer() {
    const F = this.t.footer;
    if (!F || this.s.footer === false) return '';
    const m = this.t.canvas.margin ?? 56;
    const text = (this.s.footer ?? F.text ?? 'MuseDraw').replace('{style}', this.t.name);
    const fam = this.font(F.font ?? 'mono');
    const pos = F.position ?? 'right';
    return textBlock({ x: pos === 'left' ? m : this.W - m, y: this.H - (F.bottom ?? m * 0.55), lines: [applyCase(text, F.case)], size: F.size ?? 11, family: fam, color: this.c(F.color ?? 'muted'), anchor: pos === 'left' ? 'start' : 'end', letterSpacing: F.letterSpacing ?? 1 });
  }
}
