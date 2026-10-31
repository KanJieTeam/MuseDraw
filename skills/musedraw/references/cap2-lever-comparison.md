# Common-scale lever-arm comparison (candidate)

`lever-arm-comparison` compares two or three supplied ideal horizontal levers.
It complements `lever`; it does not replace that positional-class lesson.
Choose it to compare effort/load arm lengths, equal arms and force advantage
on one common length scale, including a lesson with no supplied load forces.

Each example requires `id`, `label`, `kind` (`first`, `second` or `third`),
positive finite `effortArm`, `loadArm`, a caller-supplied `example` label and
`note`. The top level requires `title`, `subtitle`, `lengthUnit`, `examples`
and `note`. An optional positive `loadForce` requires top-level `forceUnit`.
Omit unknown load forces; `null`, zero and fabricated defaults are rejected.
Supplied wording remains visible in full or is explicitly refused when it
exceeds the declared text capacity; the renderer never reduces the type size.

```sh
node scripts/cap2-lever-render.mjs assets/musecore/cap2-lever-arm-comparison.json --out output/lever-comparison
```

The standalone preview produces PNG, SVG, an editable offline HTML page,
complete input and geometry checks. A Noto Sans SC/CJK font file can be passed
with `--noto` or `MUSEDRAW_CAP2_NOTO`; it is embedded in the offline editor.
The shared `core render` entry point includes this family.

One geometric scale determines all arm dimensions. Force arrows show direction
only; their lengths do not encode magnitude. Reactions are omitted, so these
are not complete free-body diagrams. Arms are horizontal and forces are
perpendicular, under ideal rigid equilibrium. Positions closer than 34 pixels
at the shared scale are refused. The family does not draw crowbars, tweezers
or fishing rods as physical silhouettes, and does not infer masses, material
properties or real-world performance from the example name.

The included T09 adapter preserves the original given arm lengths, equal-arm
case and life-example labels. It intentionally omits absolute load forces that
the source did not supply. Force ratios are rounded to four significant digits
and marked approximate when the rounding is material; supplied arm and load
numbers retain their numeric string representation.

`tests/musecore/cap2-lever.test.mjs` exercises symbolic and numeric forces,
changed first/second classes, long Chinese wording, font ascent +40 pressure,
common-scale dimensions, independent moment identities, scope exits and byte
identical old `lever` SVG/PNG before and after calling the added construction.
Tests accept the shared `MUSECORE_NOTO_FONT` variable and the older
`MUSEDRAW_CAP2_NOTO` alias, and probe standard Linux/Windows Noto CJK font paths.
If no Noto font is available, they fail with a dependency message instead of
skipping the required font review. `MUSEDRAW_CAP2_OUT` optionally retains all
actual renders and inputs.
Passing these checks is functional evidence, not aesthetic approval.
