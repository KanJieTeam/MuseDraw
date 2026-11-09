# Identity-preserving array views

Use this composition when the reader needs to follow the same explicit elements
through a matrix reshape or reorder. The source defines each element once;
the target declares its shape and the order of existing IDs. The program owns
the two layouts, repeated labels/values and the correspondence map.

From the installed Skill directory:

```sh
node scripts/musedraw.mjs compose assets/starters/representation.json --out output/representation --strict
```

Copy the starter to a new source file and replace its synthetic content. Keep
the source outside the output directory. Deliver the PNG, SVG and editable
scene produced by the normal native renderer; the composition input is also
useful for further content changes.

Run `node scripts/representation-lint.mjs output/representation/scene.json --strict`
on the exported scene. The compiler declares the `array-reorder` profile and
stores its element correspondence in `meta.arrayRepresentation`. This profile
does not exempt an arbitrary grid: the linter checks the two complete arrays,
their cell geometry and the ID, value and label attached to every cell.

## Content contract

- `method`: `"representation"`.
- `title`: the supplied description of the operation.
- `source`: an `id`, a two-integer `shape: [rows, columns]`, and `elements` in
  row-major order. Every element has a unique `id`, its `value` and its `label`.
- `target`: a two-integer `shape` and `order`, listing every source ID exactly
  once, again in row-major order. Do not repeat values or labels in the target.
- `focusIds`: optional, at most two source IDs to emphasize. Matching IDs,
  rather than matching values or colors, establish correspondence.
- `note`, `width` and `theme`: optional supplied annotation, supported canvas
  width and an existing native theme. No host coordinates are needed.

The supported input contains 2–24 elements. Both shape products must equal
that count. Duplicate, unknown or missing IDs are refused. New labels, changed
values, aggregation, projection, physical movement and newly created features
are outside this contract; use a representation that states those operations
explicitly. A one-row target is a sequence. Unequal values are not converted
into inferred categories, measurements or a statistical color scale.

Canvas width is 800–3200px. Title, source/element IDs, labels, string values and
note are bounded at 120, 24, 48, 24 and 320 characters respectively. The layout
may place views side by side or stack them; content that cannot retain 14px
type in the normal 1200×1000 preview is refused. Narrow-screen viewing can
scale the complete image and is not a promise of 14px type on a phone.
Native themes remain available. This composition omits decorative sheet
reference labels because they do not identify the supplied elements; actual
element IDs, values and labels are all retained.

Inspect the finished image at its intended reading size. A preserved mapping
does not prove that the surrounding scientific explanation or visual design
is correct. If labels cannot fit the supported reading size, revise the scope
or split the figure instead of deleting content or shrinking type.
