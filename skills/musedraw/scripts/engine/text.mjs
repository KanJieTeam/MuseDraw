// Text helpers: escaping, approximate measurement and wrapping.
// Measurement here is an estimate used for layout decisions; the browser
// check (export.mjs) measures the real glyphs afterwards and reports overflow.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

const CJK = /[⺀-鿿豈-﫿＀-￯　-〿]/;

export function isMono(family = '') {
  return /mono|consolas|courier|plex mono|space mono/i.test(family.split(',')[0]);
}

/** Estimated advance width of a string in px. */
export function measure(text, size, family = '', letterSpacing = 0, weight = 400) {
  const mono = isMono(family);
  const bold = weight >= 600 ? 1.04 : 1;
  let w = 0;
  for (const ch of String(text)) {
    if (CJK.test(ch)) w += 1.0;
    else if (mono) w += 0.6;
    else if (ch === ' ') w += 0.27;
    else if (/[il.,:;'|!]/.test(ch)) w += 0.28;
    else if (/[mwMW@]/.test(ch)) w += 0.82;
    else if (/[A-Z]/.test(ch)) w += 0.66;
    else if (/[0-9]/.test(ch)) w += 0.57;
    else w += 0.53;
    w += letterSpacing / size;
  }
  return w * size * bold;
}

/** Wrap text to a width; respects explicit "\n". CJK may break anywhere, Latin at spaces. */
export function wrap(text, width, size, family, letterSpacing = 0, weight = 400) {
  const out = [];
  for (const para of String(text ?? '').split('\n')) {
    if (measure(para, size, family, letterSpacing, weight) <= width) { out.push(para); continue; }
    const tokens = para.match(/[⺀-鿿豈-﫿＀-￯　-〿]|[^\s⺀-鿿豈-﫿＀-￯　-〿]+|\s+/g) || [];
    let line = '';
    for (const t of tokens) {
      const next = line + t;
      if (line && measure(next.trimEnd(), size, family, letterSpacing, weight) > width) {
        out.push(line.trimEnd());
        line = t.trimStart();
      } else line = next;
    }
    if (line.trim()) out.push(line.trimEnd());
  }
  // Kinsoku: CJK closing punctuation never starts a line; it hangs on the previous one.
  for (let i = 1; i < out.length; i++) {
    while (out[i] && /^[，。、；：！？）」』》〉％,.;:!?)\]]/.test(out[i])) { out[i - 1] += out[i][0]; out[i] = out[i].slice(1); }
  }
  return out.filter((l, i) => l.length || i === 0);
}

export function applyCase(text, mode) {
  if (mode === 'upper') return String(text).toUpperCase();
  return String(text);
}

/** One <text> element with optional multiple lines (tspans). */
export function textBlock({ x, y, lines, size, family, weight = 400, color, anchor = 'start', lineHeight = 1.3, letterSpacing = 0, italic = false, opacity, cls = '', extra = '' }) {
  const ls = letterSpacing ? ` letter-spacing="${esc(letterSpacing)}"` : '';
  const it = italic ? ' font-style="italic"' : '';
  const op = opacity != null ? ` opacity="${esc(opacity)}"` : '';
  const c = cls ? ` class="${esc(cls)}"` : '';
  const spans = lines.map((l, i) => `<tspan x="${rd(x)}" ${i === 0 ? '' : `dy="${rd(size * lineHeight)}"`}>${esc(l)}</tspan>`).join('');
  return `<text${c} x="${rd(x)}" y="${rd(y)}" font-family="${esc(family)}" font-size="${esc(size)}" font-weight="${esc(weight)}" fill="${esc(color)}" text-anchor="${esc(anchor)}"${ls}${it}${op}${extra}>${spans}</text>`;
}

export const rd = (n) => Math.round(n * 100) / 100;
