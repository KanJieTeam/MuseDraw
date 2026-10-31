# Explicit pyramid focus sets (candidate)

Optional `focus` extends `pyramid` with the reader task studied in d07:
compare selected band totals directly while retaining the mirrored common
scale. It does not replace the existing default branch.

The caller must supply `focus:{numeratorIds,denominatorIds,numeratorLabel,
denominatorLabel,note}`. Both ID arrays are nonempty sets of known band IDs,
with no duplicate members. The model sums left and right counts in each named
band and calculates the ratio of these two explicit sums. No implicit total
population denominator, age interval or demographic index is introduced.
Overlapping sets are allowed and disclosed with their common members; they are
not displayed as mutually exclusive groups. A zero denominator gives an
explicit undefined ratio, never zero or infinity.

The original title, subtitle, note, unit, side labels and all band labels are
preserved. Counts must be finite, nonnegative and no greater than 1e12; the
existing 4–24-band scope remains. Extra fields, unknown members or nonfinite
ratio arithmetic refuse. The measured layout highlights the union of selected
rows, attaches selected row totals to their actual right endpoints, lists both
sets' memberships, totals and ratio, and reflows at fixed type sizes. Band
labels allow 3 lines, focus notes 10 and overall notes 10; excessive text or a
canvas beyond 8000 px refuses. The same amount-to-length scale applies to both
sides and every row.

The supplied `cap2-data-population-focus-demo.json` uses **fictional development
counts**, including 50/17 rather than the source's printed 4.81/1.89 totals.
The source does not provide its full male/female table. No detailed source
counts are reconstructed from bar dimensions. `compositionReference` identifies
the studied construction, not source-data provenance or complete reproduction.
The source claim should not move to this demo.

```sh
node tests/musecore/cap2-data-pyramid-focus-harness.mjs assets/musecore/cap2-data-population-focus-demo.json output/focus
node --test tests/musecore/cap2-data-pyramid-focus.test.mjs
```

`MUSECORE_CAP2_PYRAMID_OUTPUT` records artifacts. `MUSECORE_NOTO_FONT` provides a
local Noto Sans SC TTF for the test browser. Checks include an independent
integer sum/ratio oracle, multiple-member and overlapping sets, zero denominator,
unknown/missing/duplicate input refusal, actual bar/text intersections, system
and Noto normal/+40 font metrics, and exact legacy SVG/PNG compatibility.
Passing these checks is not aesthetic approval.

Bundle `cap2-data-pyramid-focus-models.mjs`, then
`cap2-data-pyramid-focus-figures.mjs` after data/font helpers and before
`distribution-families.mjs`. Import `cap2DataPyramidFocusFigure` there and add
only `if(Object.hasOwn(b,'focus'))return cap2DataPyramidFocusFigure(b);` at the
beginning of `pyramid(b)`. Unique exports: `cap2DataPyramidFocusModel` and
`cap2DataPyramidFocusFigure`.
