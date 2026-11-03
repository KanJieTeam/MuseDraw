# Ordered series with a declared target band

Use `trend-band` for 1–5 explicitly supplied series at 3–16 ordered categories,
with an optional target interval. Every series uses the same value unit and
category order. The program owns the common scale, markers, legend and text
reflow; the host supplies the facts and labels.

```sh
node scripts/musedraw.mjs core example trend-band-demo --out output/series.json
node scripts/musedraw.mjs core render output/series.json --out output/series
```

The example contains synthetic data. Replace `periods`, every series' `values`,
the labels and `dataStatus` together. Supply `unit` when known (for example
`mg L⁻¹`). If omitted, the output explicitly says the unit is undeclared;
it never assumes counts, percentages or a denominator. Do not combine different
units on this shared axis. `target.min` and `target.max` are supplied endpoints,
not estimated confidence bounds. Equal endpoints produce one reference line.

`periods` are equally spaced **ordered categories**. This family does not parse
dates or infer elapsed time from their names. For irregular numeric times,
missing observations or mixed units, use the corresponding data-plot route in
[data figures](data-figures.md); never relabel this category axis as elapsed time.

## Bounds and exits

- Unique category labels, each at most 32 characters; unique series IDs and
  complete finite values at every supplied category are required.
- Values and target endpoints must lie within ±1e9. No missing value is replaced
  by zero and no point is added, smoothed or forecast.
- Labels, target descriptions and the note have explicit text budgets. Long
  blocks grow their region at the same reading size. If a block cannot fit,
  rendering rejects it instead of silently dropping or shrinking text.
- Line patterns and marker shapes accompany colour, so series identity remains
  available in monochrome. Colour is not a severity or performance score.
- A passed geometry audit is not aesthetic approval or evidence of significance,
  causality, seasonality or a statistical trend.

## Verification

```sh
node --test tests/musecore/trend-band.test.mjs
```

Tests independently recompute plotted points and target endpoints, inspect actual
SVG text boxes for overlap/overflow, preserve long labels, distinguish tiny and
large-offset tick values, and resize the editor to 1440/1024/390 pixels. This is a
native-size chart in a scrollable editor, not a claim that 16 long categories are
readable simultaneously at mobile width. Optional `MUSECORE_TREND_NOTO_DIR`
loads checksum-verified fonts from a local `font-sources.json`; no download is
implicit. `MUSECORE_TREND_OUT` retains inputs, SVG, PNG and checks for inspection.
