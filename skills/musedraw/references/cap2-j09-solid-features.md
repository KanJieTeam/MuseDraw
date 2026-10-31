# Primary solid features

`primary-solid-features` serves early mathematics: identify flat/curved surfaces, straight edges, vertices and simple touch/look activities. It does not replace `solids`, whose reader task is dimensions and volume.

Supply two to four distinct kinds from `cuboid`, `cube`, `cylinder`, `sphere`; each object has `id`, `kind`, `label`, and one or two catalogue `activities`. `edgeConvention` must explicitly be `straight-edges`. Cuboid/cube counts are derived from eight binary-coordinate vertices, one-coordinate-different edges and six coordinate faces. Cylinder circular boundaries are recorded separately from straight edges; curved solids are not subjected to a polyhedron Euler formula.

Activities: cuboid/cube accept `touch-opposite` and `trace-edges`; cube also `compare-all`; cylinder accepts `equal-circles`, `roll-and-stand`, `find-curved`; sphere accepts `find-curved`, `turn-and-look`. These are teaching prompts, never observations or developmental assessments.

The Bauhaus plate reuses `cuboidFaces`, `drawFaces`, and `isometricPoint`; cylinders and spheres retain the existing ideal illustration language. Shapes use illustrative proportions and independent scale. Fixed-size text is measured; row boundaries follow the longest complete caption, so the dark separator cannot overwrite the preceding explanation. The sphere's dashed guide is explicitly not an edge.

The review CLI is `scripts/cap2-j09-render.mjs`; the source-derived asset is `assets/musecore/cap2-j09-primary-solids.json`. Scratch registration proposals, independent incidence/count checks, changed input, real Noto normal/+40 PNGs and compatibility evidence accompany the output handoff. Figure metadata uses `compositionReference`; original source-case ownership is not moved by this addition.

Ordinary CLI discovery uses this example’s declared reference. Shared family registration is included in the main integration; measured tests and package verification remain separate from aesthetic approval.
