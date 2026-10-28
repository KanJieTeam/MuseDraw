# Measured data and report charts

Use a statistical plotting tool for measured data, not a collection of manually
positioned bars or a workflow that merely mentions the measurements. Keep the
input table and plotting code. A scientific report may need data plots,
study diagrams, apparatus drawings and a composed evidence figure; these are
different decisions. Use [scientific composition](scientific-design.md) for
mechanisms and physical objects.

Choose the visual comparison from the question. Trends need actual time
spacing; paired changes need the pairing; distributions need observations or
supplied summaries; intervals need their stated meaning. A heatmap needs a
meaningful common colour scale. Survival curves need censoring information
and the supplied risk-set convention. Neither a chart name nor a polished
frame establishes those facts.

## Reusable plotting route

For a line, scatter, grouped bar, supplied interval, paired observation or
measured heatmap, translate the
actual data into the corresponding JSON below and run:

```sh
python <skill>/scripts/plot_data.py data.json --out output/figure
```

Use this helper for the data field when its grammar fits. A report heading or
an explanatory note alone is not a reason to rebuild coordinate handling,
missing-value segmentation and font fallback from scratch. For a custom
composition, `plot_data.py` also exposes `build_figure(spec, width, height)`;
extend the returned figure rather than replacing the measured data artists.

This route uses Matplotlib in the selected Python environment. Reuse an
available plotting environment; it is not installed by the scene renderer.
If missing, report the unavailable dependency or use another already available
statistical plotting tool. Do not replace measured data with illustrative
geometry just to get a PNG. `--font` selects an installed font; the default
tries common CJK fonts before DejaVu Sans. Missing-glyph warnings fail the
export check. No font download or installation is implicit.

For a custom Matplotlib script, keep a glyph fallback chain. A CJK font file
existing on disk does not mean it contains scientific unit characters: a
Chinese font can render the label while omitting `⁻` in `mg L⁻¹`. With an
installed primary font use `font.family: [primary_font, "DejaVu Sans"]` before
creating text. The helper already does this; its returned `font_families`
metadata can be reused for added annotations. Inspect render warnings and
the final unit. Outlining a missing glyph or suppressing its warning does
not repair it; do not change the supplied unit to hide the defect.

Outputs: `figure.png`, `figure.svg` with live text, retained `data.json`, and
`checks.json`. Default PNG is 1800×1100; `--width` and `--height` choose the
requested output size. A supplied `title` is optional. This plotting route is
separate from `render scene.json`; it does not require a scene or an additional
PNG exporter. Continue edits in the data specification or plotting code.

Line/scatter series have explicit numeric x/y pairs. A line requires increasing
x and leaves `null` observations as gaps; it never replaces a missing result
with zero or connects through it. Scatter points are not connected and have
no inferred trend line, correlation coefficient or causal arrow.

```json
{
  "kind":"line",
  "xLabel":"Elapsed time / h",
  "yLabel":"Concentration / mg L⁻¹",
  "series":[
    {"name":"Control","points":[{"x":0,"y":1.2},{"x":2,"y":null},{"x":6,"y":2.1},{"x":10,"y":1.8}]},
    {"name":"Treatment","points":[{"x":0,"y":1.1},{"x":2,"y":1.6},{"x":6,"y":2.8},{"x":10,"y":2.4}]}
  ]
}
```

For scatter use `kind:"scatter"` with the same series structure and finite
observations. Do not turn independent observations into a paired trajectory.

Bar series supply one value per category. The baseline includes zero, even
with negative values. Values already expressed as percentages stay in their
supplied units; the helper does not choose a denominator or normalise them.

```json
{
  "kind":"bar", "xLabel":"Workstream", "yLabel":"Hours",
  "categories":["Preparation","Review","Delivery"],
  "series":[{"name":"Planned","values":[18,12,9]},
            {"name":"Actual","values":[21,10,11]}]
}
```

Intervals keep the supplied endpoints, including asymmetric intervals.
`intervalLabel` must state their actual meaning. `reference` is optional and
must come from the request; zero is not inserted as a meaningful null value
for ratios or other scales. This helper does not estimate an interval or
infer sample sizes, significance or an appropriate comparison model.

```json
{
  "kind":"interval", "xLabel":"Mean difference / s",
  "intervalLabel":"Supplied 95% confidence intervals", "reference":0,
  "rows":[
    {"label":"Procedure A","estimate":-1.2,"lower":-2.0,"upper":-0.3},
    {"label":"Procedure B","estimate":0.4,"lower":-0.2,"upper":1.5}
  ]
}
```

Optional `xDomain:[min,max]` and `yDomain:[min,max]` preserve an explicit linear
scale. They cannot hide supplied values/endpoints; bar y ranges must contain
zero. Heatmaps use labelled positions and a separate `colorDomain`; paired
rows use a shared numeric x axis. Unsupported fields fail rather than being
silently ignored. The helper supports 1–4 series, 12 bar categories, 16 interval
or paired rows, or a 12×12 measured matrix. Larger plots,
logarithmic axes, dates, distributions, survival and multiple panels
need an appropriate custom Matplotlib/R/host plotting implementation, not a
mislabelled use of one of these grammars.

## Paired observations

Use `paired` when the same identified unit was measured twice in comparable
units. Each row remains the same unit; the helper joins its two observations
on a common numeric axis without independently sorting either condition.
Rows preserve the supplied identity order. Open circles and filled diamonds
also distinguish conditions when printed without colour. An unchanged pair
keeps both concentric marks. No change estimate, p-value or interval is added.

```json
{
  "kind":"paired", "xLabel":"Task time / min",
  "conditions":["Before","After"],
  "rows":[{"id":"P01","before":8,"after":7},
          {"id":"P02","before":12,"after":9},
          {"id":"P03","before":10,"after":13},
          {"id":"P04","before":11,"after":11}]
}
```

Both observations and unique identities are required. Independent groups,
unknown pairings, incomplete pairs, unequal units and more than two conditions
need a plot that explicitly supports that structure; do not silently discard
participants or invent partners. The row layout trades the common before/after
slope view for traceable identities and a shared measurement axis. Choose a
custom slope plot when temporal direction itself is the intended comparison.

## Measured matrices

Heatmap `values` is a full row-by-column matrix, with a finite measurement or
explicit `null` in every cell. `colorLabel` carries the measured variable and
unit. One scale covers all rows; no row normalisation, clustering or reordering
is performed. `null` uses a hatched neutral cell and a required `missingLabel`;
an observed zero stays numeric and uses the same scale as other measurements.

```json
{
  "kind":"heatmap", "xLabel":"Sampling time / h", "yLabel":"Site",
  "rowLabels":["East","South"], "columnLabels":["08","10","12"],
  "values":[[0,2,null],[1,0,5]],
  "colorLabel":"Concentration / mg L⁻¹", "colorDomain":[0,6],
  "missingLabel":"Not measured; not imputed"
}
```

The default sequential scale encodes the measured magnitudes. Set
`colorCenter` only when the brief supplies a meaningful centre, together with
a `colorDomain` that contains it; this selects a diverging scale. The domain
cannot clip measurements. Do not substitute a row-relative percentage for
absolute measurements, or treat visually blank cells as zero. Cell labels keep
their supplied numerical values rather than rounding nearby values together.
If dense or long values fail the cell bounds check, adjust the actual plot
size or use a custom layout; do not round away a distinction without agreement.

## Preserve the evidence

Keep SD, SE, CI, ranges and quantiles distinct. Show the stated sample unit,
denominator, pairing and missing-data convention when they affect the reading
task. Do not add fitted curves, significance stars, sample sizes, causal claims
or precision that the data did not provide. A crop or inset must preserve its
link to the overview and disclose a changed scale.

For a report or multi-panel figure, make linked conditions share the same
encoding; share an axis only when units and comparisons justify it. Compose
the real plots with the explanatory schematic rather than replacing them with
summary cards. Inspect the final figure at its delivery size. Export checks
only report clipping/font warnings; they do not certify the statistical
analysis, all label collisions or visual quality.
