# Explicit polygon footprints with holes

Use this helper for a caller-supplied material outline and named empty regions.
It returns native SVG compound-path geometry. It does not infer a material,
dimension, hole count or scientific structure from a description.

From the repository root, the following runs as an ES module:

```js
import { materialFootprint } from './skills/musedraw/scripts/engine/material-footprint.mjs';

const model = {
  id: 'cut-sheet',
  outer: [[0, 0], [240, 0], [240, 60], [215, 75], [240, 90], [240, 150], [0, 150]],
  holes: [
    { id: 'opening', points: [[60, 40], [110, 40], [110, 90], [60, 90]] }
  ]
};
const separated = materialFootprint(model, [1, 0.1, 0.2, 0.8, 40, 30]);
const contact = materialFootprint(model, [1, 0.1, 0.2, 0.8, 340, 130]);
const nativePath = `<path d="${separated.d}" fill="#79aabb" ` +
  `stroke="#304955" fill-rule="${separated.fillRule}"/>`;

// A source edit is explicitly regenerated for every view.
const moved = structuredClone(model);
moved.holes[0].points = moved.holes[0].points.map(([x, y]) => [x + 8, y]);
const updatedViews = [separated, contact].map(view =>
  materialFootprint(moved, view.affine));
console.log(nativePath, updatedViews.map(view => view.holeIds));
```

Use `d` and `fillRule` in the native SVG scene route described in
[scene-schema.md](scene-schema.md#exact-replay-of-art-directed-vectors), then
render through the current engine. This module does not add a scene field or
CLI command. SVG attributes here are actual geometry, not a white cover over
an opaque sheet. Holes use the opposite winding to the transformed outer ring
with the default `nonzero` fill rule, including reflected views.

Inputs must explicitly provide a simple outer polygon, uniquely named simple
hole polygons strictly inside it, and a nonsingular six-number SVG affine
`[a,b,c,d,e,f]`. Hole boundaries cannot touch or intersect the outer boundary
or each other; holes cannot nest. Supply vertices without a duplicate closing
vertex. The helper validates this bounded input and rejects invalid geometry;
it does not repair it.

The result includes `id`, `holeIds`, `affine` and full transformed `vertices`.
Metadata preserves caller vertex order; path serialization reverses hole rings
where necessary. Preserve that model to regenerate all views after a change.
Source footprint/hole IDs identify geometry in the source model. Holes are SVG
subpaths; preserve the source model to regenerate them after a parameter change.

Coordinates must be finite drawing coordinates at an appropriate diagram scale.
The path serializes to six decimal places; metadata retains JavaScript number
precision. Fixed numerical tolerances and rounding do not guarantee topology
for arbitrarily tiny gaps, near-degenerate polygons, extreme coordinates or
nearly singular transforms. Check the rendered geometry for the intended size.

This is not arbitrary Boolean geometry, automatic extrusion, material/physical
simulation or a general illustration capability. It supplies only the explicit
polygon outline and genuine empty regions given by the caller.
