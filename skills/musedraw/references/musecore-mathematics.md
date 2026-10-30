# Mathematical objects and finite outcomes

Use these for teaching a stated mathematical relationship. The supplied numbers
drive the drawing, labels and worked examples together. The host writes content
for the user; it does not provide page coordinates or manually change a correct
answer to fit an illustration. Inspect the actual PNG at intended delivery size.

```sh
node scripts/musedraw.mjs core list --compact
node scripts/musedraw.mjs core example symmetry --out output/symmetry.json
node scripts/musedraw.mjs core render output/symmetry.json --out output/symmetry
```

Preserve the SVG, content and offline editor. The material belongs to these
teaching tasks, not to every report: Bauhaus angle plates, a two-colour printed
symmetry study, terminal number operations and a finite-outcome arcade grid.

## Select by the relationship

| Family | Input and recomputed decisions | Boundary |
| --- | --- | --- |
| `angles` | Three to six identified angles, each with a caption and integer degrees 0–360. Derive the category, true sector and ray positions. Captions attach to the actual lower extent; row heights follow the extent, including reflex/full angles. | Only integer degree measures, at most one turn. Zero draws no false sector; a full turn is a full disk. Radius is a layout size, not another encoding of angle magnitude. Supplied captions must not contradict the computed category. |
| `symmetry` | Three to six objects: upright isosceles triangle by base/height; regular polygon with 3–8 sides and radius; rectangle; parallelogram with width/height/shear; or circle. Calculate polygon axes from actual vertex and edge reflections. A butterfly motif uses mirrored Bézier control points, with span/height factors 0.7–1.3. | Object dimensions are 0.1–10, shear within ±10; aspect ratios too thin to read exit. Equal rectangle dimensions produce four axes, and an equilateral special case produces three, regardless of the supplied name. Circle has infinitely many axes; six drawn examples are not a finite count. Butterfly is a decorative teaching motif, not anatomy. No arbitrary imported shapes or symmetry proof for images. |
| `binary` | Unsigned value with a declared width of 4, 8, 12 or 16 bits. Compute fixed-width indicator bits, repeated division and weighted expansion. Optional nonnegative operands fit that width; addition retains the full carry. An optional table start selects up to nine values in range. | No signed/two's-complement, fractional encodings or machine arithmetic policy. Primary value must fit. The addition display uses at least four positions and expands for the full result; it never silently wraps. Python statements are explanatory displays, not executed code. |
| `dice-grid` | Two independent outcomes numbered 1..N, each with 2–12 nonnegative integer face weights up to 1000000 and positive total weight. Require `independent:true`. Enumerate sums, joint weights and a closed event: sum-equals, sum-at-least, sum-at-most or equal-values. Compute exact reduced fraction and marginal sum distribution. | This is a finite probability model, not observed frequencies. Independence cannot be inferred from marginal weights. Zero-weight combinations remain marked as zero probability. Uniform weights use combination counts; unequal weights use a probability axis. Selected portions within a mixed sum bin remain partial. No arbitrary event code or dependent joint model. |

The dice grid's base colour describes the **sum's aggregate probability**, not
the individual cell's probability. Borders/dots mark positive-weight combinations
meeting the event; diagonal marks denote zero probability. The actual face
weights are visible when unequal. These encodings are stated on the output.

## Reusable mechanisms and checks

`math-models.mjs` exposes classification and geometric angle bounds, reflection,
polygon axes, unsigned representation, carry traces and independent weighted
outcome enumeration. These models contain no page coordinates. Shape outlines
and the mirrored motif are native editable geometry, not raster substitutions.

`node tests/musecore/mathematics.test.mjs` checks known geometry, transformed
polygons, independent number reconstruction, exact outcome counts, content changes
and actual browser layout. It also reads the actual SVG digits to reconstruct
the displayed operands and result; correct internal numbers alone do not pass.
Enumerated numeric trials are algorithm checks, not additional artworks or
aesthetic comparisons. Registry identities/hashes preserve the original source
works and identify a bounded related capability. Host transfer and visual
approval remain unproven until separately assessed.
