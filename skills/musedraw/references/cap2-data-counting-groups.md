# Optional exact counting groups (candidate)

The existing `unit-chart` has correct exact symbols and quantities. This adds
the source d10 counting aid: visible gaps after a specified number of symbols,
with complete groups moving together to another row. Default inputs remain in
their original branch. No additional family is registered.

Set `countingGroups` explicitly to an integer from 2 to 20. All original unit
chart fields remain required. Each `value` must divide exactly by positive safe
integer `perSymbol`; there are 2–12 categories and at most 600 symbols overall.
The model also refuses an unsafe total or unsafe group value. No partial icon,
rounding, missing-to-zero conversion, implicit sample population or percentage
is supported. Zero categories retain their label and optional note, with no
symbols. Category order stays exactly as supplied.

Items may supply an additional nonempty `note` and six-digit hex `color`.
Every label, item note and overall note is retained. Colours affect symbols;
labels remain dark for readability. Group count is a reading aid, not a data
stratum. The legend states both the quantity per symbol and per full group.
Partial final groups have exactly the remaining symbols. Metadata preserves
symbol index, item identity, quantity, counting-group identity and coordinates.

Geometry uses fixed 20 × 46 px symbols, 27 px symbol steps and 27 px whitespace
between full groups. The program calculates complete groups per row from the
available width, wraps labels and recomputes category/page height from text
metrics. It never shrinks the reading sizes. Short final CJK lines are balanced
across the same number of lines to avoid a lone character. Budgets: title 3,
subtitle 4, item label 4, item note 6 and overall note 10 lines; canvas 8000 px.
Unsupported prose or group widths explicitly refuse.

`assets/musecore/cap2-data-commuting-counts.json` preserves the source's printed
category totals 38, 18, 17, 14, 9, 4 and total 100. These are supplied example
counts, not reconstructed individual survey records. The source headline's
18 + 17 = 35 comparison is preserved. This is a source adapter and counting
construction, not a complete original reproduction or aesthetic approval.

```sh
node tests/musecore/cap2-data-counting-harness.mjs assets/musecore/cap2-data-commuting-counts.json output/grouped-counts
node --test tests/musecore/cap2-data-counting.test.mjs
```

Optional test variables: `MUSECORE_CAP2_COUNTING_OUTPUT` records full artifacts;
`MUSECORE_NOTO_FONT` provides a local Noto Sans SC TTF for the test browser.
Tests check independent integer totals, exact per-item symbols, full/partial
groups, changed per-symbol units, row reflow, explicit zero, negative inputs,
actual text/symbol intersections, system/Noto normal/+40 font-height pressure
and byte-identical default SVG/PNG. Passing is a functional and geometry result.

Integrate `cap2-data-counting-models.mjs` after existing data helpers, followed
by `cap2-data-counting-figures.mjs` before `distribution-families.mjs`.
Import `cap2DataGroupedUnitChart` in that existing family module and use only
the explicit guard `Object.hasOwn(b,'countingGroups')` at the beginning of
`unitChart(b)`. Exports are uniquely named `cap2DataCountingModel` and
`cap2DataGroupedUnitChart`. Candidate harness exports need no production bundle.
