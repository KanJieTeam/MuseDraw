// Fail-closed checks at the generated static-SVG boundary. Not a general SVG
// sanitizer: active content is rejected rather than rewritten or executed.
export function assertStaticSvg(svg) {
  if (typeof svg !== 'string' || Buffer.byteLength(svg) > 4 * 1024 * 1024 ||
      !/^\s*<svg\b/.test(svg) || !/<\/svg>\s*$/.test(svg)) throw Error('Expected bounded static SVG');
  const attributeNames = (svg.match(/<[^>]*>/g) ?? []).map(tag => tag.replace(/"[^"]*"|'[^']*'/g, '""')).join('\n');
  if (/<!|<\?|<(?:script|foreignobject|image|iframe|object|embed|audio|video|animate\w*|set)\b/i.test(svg) ||
      /\son[a-z][a-z0-9_-]*\s*=/i.test(attributeNames) ||
      /\b(?:href|src)\s*=\s*["'](?!#)/i.test(svg) ||
      /@import\b|expression\s*\(|javascript\s*:/i.test(svg)) throw Error('Active or external SVG content is not supported');
  for (const match of svg.matchAll(/url\s*\(([^)]*)\)/gi)) {
    if (!/^\s*["']?#[A-Za-z][\w:.-]*["']?\s*$/.test(match[1])) throw Error('SVG resources must be local fragments');
  }
  return svg;
}
