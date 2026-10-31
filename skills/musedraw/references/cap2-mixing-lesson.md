# RYB mixing and complementary-colour lesson (candidate)

`ryb-colour-lesson` carries the complete named six-colour teaching task from
T06: three primary shapes, three explicit pair mixes, a six-sector colour wheel
and three opposite/complementary pairs. It supplements the existing `colour`
family without changing that family or its general explicit-swatch workflow.

```sh
node scripts/cap2-mixing-render.mjs assets/musecore/cap2-mixing-ryb-lesson.json --out output/ryb-lesson
```

This standalone runner makes PNG, SVG, an editable offline HTML page, complete
input and geometry checks. An existing Noto Sans SC/CJK font file may be passed
with `--noto` or `MUSEDRAW_CAP2_NOTO`; the runner embeds it in the offline editor.
The family is registered in the ordinary route:
`node scripts/musedraw.mjs core render assets/musecore/cap2-mixing-ryb-lesson.json --out output/ryb-lesson`.

Input must declare `system: "ryb-classroom"` and all six identities: `red`,
`orange`, `yellow`, `green`, `blue`, `violet`. Each colour has a caller-supplied
`label` and six-digit hex `color`; a primary also requires `shape` (`triangle`,
`square` or `circle`). An optional `note` belongs to that colour. Primary notes
stay below the matching shape; secondary notes stay below the matching mix.
Top-level `title`, `subtitle`, `mixHeading`, `wheelHeading` and `note` remain
visible in full or cause an explicit capacity rejection.

The three `mixes` declare `id`, `a`, `b`, `result`, `label` and optional `note`.
They must supply each RYB pair exactly once: red/yellow → orange, yellow/blue →
green, red/blue → violet. Pair order can reverse, and the three examples can
reorder. The program does not derive secondary swatches by averaging RGB values.
It checks the named classroom rules and draws the supplied result swatch in a
calculated overlap lens.

`wheelStart` selects the top sector. `direction` is `clockwise` or
`counterclockwise`. Sector order, paths, attached labels and opposite pairs all
recompute. Optional `focus` names one of the six colours and emphasizes that
opposite diameter and pair. Every diameter joins sector midlines exactly 180°
apart; all sectors have equal area, which does not encode pigment quantity.

Names remain intact in formula terms; a term too wide for its column is refused.
Actual font ascent/descent determine text rows, wheel label tracks and total
height. Shape/swatch labels and explanations use the paper background rather
than relying on contrast against arbitrary supplied colours.

This is a named idealized RYB art-class catalogue, not a general colour model.
It rejects RGB-light substitution, missing swatches, contradictory mixes and
unknown identities. Labels and swatches remain caller responsibilities; the
catalogue does not infer that an arbitrary hex value physically represents its
named hue. It predicts no spectral reflectance, real pigment proportions,
print process, additive light, perceptual uniformity or measured colour match.

`tests/musecore/cap2-mixing.test.mjs` checks source colours, reordered/rotated
inputs, full per-colour/per-mix notes, Chinese Noto normal/+40 font-height
pressure, exact opposite identities and geometry, and an independent numerical
integration oracle for overlap area. It also checks that old `colour` SVG/PNG
remain byte identical before and after invoking the new renderer. Set
`MUSECORE_NOTO_FONT` to an existing font file when needed; the older
`MUSEDRAW_CAP2_NOTO` alias and standard Linux/Windows Noto CJK font paths are
also accepted. A missing Noto dependency produces an explicit failure rather
than skipping font verification. Optional `MUSEDRAW_CAP2_MIXING_OUT` preserves
actual PNGs, complete inputs and failures.
Passing execution checks is not aesthetic approval or full source reproduction.
