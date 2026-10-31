# Scatter evidence panels (candidate)

`scatter-evidence` is an additional bounded construction for reading descriptive
statistics alongside paired observations. It preserves the existing
`scatter-panels` branch. It does not identify outliers, discover causal effects,
test significance or assess the caller's interpretation.

The input requires `title`, `subtitle`, `note`, `xLabel`, `yLabel`, explicit
boolean `fit` and 2–6 groups. Each group requires unique `id`, complete `label`,
complete `note` and 3–120 finite numeric `{x,y}` pairs. Unknown fields and missing
coordinates are refused. A supplied interpretation stays a caller statement.
Do not convert unknown observations to zero or recover a raw dataset from marks.

Optional `xDomain` and `yDomain` are increasing `[minimum,maximum]` pairs that
must include every observation. Otherwise common domains are calculated from
all groups. Values and explicit domain endpoints are bounded to ±1e12. Invalid
or nonfinite arithmetic is refused. The plot retains all pairs at their numeric
positions; a small internal pad keeps boundary circles visible. Both coordinates
share one scale across panels. The common domains are printed.

Each panel displays n, x/y means, x/y sample variances (denominator n−1), Pearson
r and, when requested, the ordinary least-squares equation. Constant x gives
undefined slope and r, without a fit line. Constant y gives zero slope and
undefined r. These differ. Fits are clipped to the panel and are descriptive.
Displayed summaries use three decimals, or scientific notation for magnitudes
below .001 or at least 1e6; full calculated values remain in SVG metadata.

Text plans use measured font ascent, descent, width and wrap count at fixed
sizes. Changed group notes, group count and fonts recalculate the panel rows and
page height. Excess text, crowded tick labels or canvas limits explicitly refuse
instead of shrinking or deleting content. Limits: title 3 lines, subtitle 4,
group heading 4, group note 6, overall note 10; maximum canvas 8000 px per side.
This does not promise every possible axis magnitude or prose length will fit.

The candidate fixture `assets/musecore/cap2-data-anscombe-evidence.json` carries
the 44 Anscombe pairs checked against the [R source data table](https://svn.r-project.org/R/trunk/src/library/datasets/data/anscombe.R),
whose [dataset documentation](https://stat.ethz.ch/R-manual/R-devel/library/datasets/html/anscombe.html)
attributes the teaching dataset. The source case d08 supplies the per-group
teaching notes and comparison task. Each group's summaries and fitted line are
recomputed from its own observations; near equality is not exact equality.

Candidate testing without changing shared runtime:

```sh
node tests/musecore/cap2-data-scatter-harness.mjs assets/musecore/cap2-data-anscombe-evidence.json output/scatter-evidence
node --test tests/musecore/cap2-data-scatter.test.mjs
```

`MUSECORE_CAP2_DATA_OUTPUT` optionally records complete browser validation
artifacts. `MUSECORE_NOTO_FONT` optionally points to a local Noto Sans SC TTF;
tests embed it only in the test browser and do not publish the local path.
The test uses an independent integer cross-product oracle for cent-precision
fixtures, malformed-input refusals, changed-content panels, system/Noto normal
and +40 ascent pressure, point-position checks, text bounds and byte-identical
legacy SVG/PNG comparisons. Tests establish these facts and geometry checks;
they do not constitute aesthetic approval or full source reproduction.

Integration order: `quantitative.mjs` and `visual-tools.mjs`, then
`cap2-data-scatter-models.mjs`, then `cap2-data-scatter-figures.mjs`, all before
`runtime.mjs`. The unique exports are `cap2DataScatterModel` and
`cap2DataScatterFamilies`; merge the latter's registry into runtime helpers.
The harness exports are for candidate review only and need no production bundle.
