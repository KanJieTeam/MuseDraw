// Exact replay of art-directed vector scenes through the normal PNG/SVG
// exporter. The artwork stays native text and geometry, never a raster embed.
import { assertStaticSvg } from './safety.mjs';
import { validateScene, SceneValidationError } from './validate.mjs';

export function renderVectorScene(scene, theme) {
  const issues = validateScene(scene);
  if (issues.length) throw new SceneValidationError(issues);
  if (scene.theme !== theme.id || scene.style) {
    throw Error('Vector scenes preserve their approved artwork; edit nativeSvg to restyle it, or use a graph scene for theme switching.');
  }
  if (['nodes', 'edges', 'zones', 'blocks', 'texts', 'lines', 'paths', 'notes'].some(key => scene[key]?.length)) {
    throw Error('Vector scenes cannot silently discard graph primitives.');
  }
  const svg = assertStaticSvg(scene.nativeSvg);
  const root = svg.match(/^\s*<svg\b([^>]*)>/)?.[1];
  const attr = name => root?.match(new RegExp(`\\s${name}=["']([^"']*)["']`))?.[1];
  const size = [attr('width'), attr('height')].map(Number);
  const box = attr('viewBox')?.trim().split(/[\s,]+/).map(Number);
  if (!scene.size || size.some((v, i) => !Number.isFinite(v) || v <= 0 || v > 8000 || v !== scene.size[i]) ||
      !box || box.length !== 4 || box.some((v, i) => v !== [0, 0, ...size][i])) {
    throw Error('Vector width, height and viewBox must match scene.size within 8000 pixels.');
  }
  if ((svg.match(/<svg\b/g) ?? []).length !== 1 || !/<text\b/.test(svg)) {
    throw Error('Vector scenes need a single SVG root and native editable text.');
  }
  if (attr('data-theme') !== scene.theme) throw Error('Vector data-theme must match scene.theme.');
  return svg;
}
