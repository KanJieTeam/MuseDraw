# All-maxima small-multiple summaries (candidate)

Optional `peakSummary:"all-maxima"` extends `small-multiples` with a directly
readable list of peak categories. This carries the d02 reader task when a peak
occurs at a category omitted from a sparse axis. It preserves the default route.

All original fields remain required: title, subtitle, note, unit, 3–16 unique
ordered category labels and 2–9 identified series with one given value for each
category. Series may include an additional nonempty `note`. Values are finite,
nonnegative and at most 1e12. Missing values are refused, never treated as zero.
The program calculates total, maximum, **every** tied index and its complete
category label. An all-zero series has all categories tied at zero. It does not
choose the first tied month or fabricate a nonzero peak.

Every panel retains one common zero-based scale; nothing is normalized to its
own maximum. All categories appear in a shared ordered key, and every peak
category is printed in its panel even when an intermediate axis label is omitted
for space. All series names, notes and input order remain. The measured layout
allocates header, summary, note, axis and row height at fixed sizes. Two series
use two columns; larger inputs use three. Excess prose, numeric axis width or a
canvas exceeding 8000 px refuses. Peak summaries allow 18 lines, series notes 8,
shared category key 8 and overall note 10.

`cap2-data-peak-panel-demo.json` is explicitly fictional development data, not
the source's monthly table. The source has printed totals and peak-month labels,
but no complete numeric monthly table. No raw monthly data are inferred from
bar coordinates. `compositionReference` records a studied reading task only;
the d02 source-data claim should not move to this demo.

```sh
node tests/musecore/cap2-data-peak-panel-harness.mjs assets/musecore/cap2-data-peak-panel-demo.json output/peak-panels
node --test tests/musecore/cap2-data-peak-panel.test.mjs
```

`MUSECORE_CAP2_PEAK_OUTPUT` records artifacts and `MUSECORE_NOTO_FONT` supplies
a local Noto Sans SC TTF for browser-only testing. Tests independently scan
integer values for totals and all maxima, preserve ties and explicit zero,
refuse missing/duplicate/unsupported inputs, check actual bars and text at
system/Noto normal/+40 font metrics, and compare legacy SVG/PNG bytes. These
are functional and geometry checks, not aesthetic approval.

Bundle `cap2-data-peak-panel-models.mjs`, then
`cap2-data-peak-panel-figures.mjs` after existing data/font helpers and before
`distribution-families.mjs`. Import `cap2DataPeakPanelFigure` there and add
only `if(Object.hasOwn(b,'peakSummary'))return cap2DataPeakPanelFigure(b);` at
the beginning of `smallMultiples(b)`. Unique exports: `cap2DataPeakPanelModel`
and `cap2DataPeakPanelFigure`.
