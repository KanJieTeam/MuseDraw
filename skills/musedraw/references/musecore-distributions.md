# Distributions, comparisons and conserved flows

These families carry the coordinated drawing, statistical and labelling choices
of existing original data figures. The host supplies actual observations and
their meaning; the program measures text and recomputes scales, marks and layout.
Do not give it invented data to make a demonstration look like a user result.

```sh
node scripts/musedraw.mjs core example histogram --out output/distribution.json
node scripts/musedraw.mjs core render output/distribution.json --out output/distribution
```

Do not ask the user to fill JSON or coordinates. Select by reader task and data
shape. Examples have fictional development data; replace the values and claims.
Read only the selected family's requirements, then view its real PNG at delivery
size. Keep the supplied native SVG and offline editor for revisions.

| Family | Inputs and recomputed decisions | Boundary |
| --- | --- | --- |
| `slope` | 3–12 identified items with numeric `before`/`after`, period labels, unit and 0–3 explicit highlighted IDs. A common fitted value axis sets both endpoints. Separate tracks place endpoint labels without moving the observations; the axis range is printed. | Numeric paired observations, not categorical rank. The vertical axis may exclude zero and is disclosed. If identifying lines becomes unworkable, use `dumbbell`, a table or another composition rather than changing the values. |
| `small-multiples` | 2–9 identified series, 3–16 shared categories and aligned nonnegative values. Two panels use two columns; larger groups use three. All panels share one zero-based vertical scale; maxima, including ties, are highlighted. | No automatic per-panel normalization. Category intervals are categorical, not elapsed time. Missing values must not be silently converted to zero. Long labels can exceed the available categorical grid. |
| `pyramid` | 4–24 identified bands supplied youngest-to-oldest, each with nonnegative `left` and `right` counts, side labels and unit. Display reverses band order; both sides share a numeric scale and totals. | Do not infer age bands or denominators. This represents counts on matching units; two independently normalized proportions need a declared comparison design. A categorical name is not permission to claim an age interval. |
| `scatter-panels` | 2–6 identified groups, 3–120 numeric `(x,y)` observations each, axis labels and explicit `fit`. Panels share x/y domains. Compute sample means/variances, Pearson correlation and ordinary least-squares parameters. | These are descriptive summaries, not a significance test, uncertainty interval, causal claim or validated model. With constant x, slope and correlation are undefined and no fit is drawn. `fit:false` retains all observations without fitted lines. |
| `bump` | 3–12 identified objects across 3–10 categorical periods; each period is a strict permutation of ranks 1..N. Highlight 0–3 explicit IDs. Position rank 1 at the top, interpolate only as a visual connection and retain supplied ranks. | No ties, missing ranks or changing participant populations. For those use another ranking view; never silently invent a tie-break. Period spacing is categorical, not a timeline. |
| `unit-chart` | 2–12 identified category counts, positive integer `perSymbol`, unit, `person` or `square` icon. Each count must divide exactly by `perSymbol`; at most 600 symbols. Reflow long rows and labels. | No rounding people or implying a representative sample. If the quantities cannot share an exact useful unit, change chart. Categories may overlap only if the supplied text states that their sum is not a population total. |
| `histogram` | 3–2000 raw numeric observations, 4–17 increasing bin edges, unit and explicit `density`. Compute bins, n, mean, median and range. Intervals are left-closed/right-open, except the last also includes its upper endpoint. | Every observation must lie within the bins. Unequal-width bins require probability density so area carries probability. Count labels still show actual frequency. No fabricated raw values from a preaggregated table. |
| `sankey` | 2–4 ordered columns, 4–20 identified coloured nodes and 2–32 positive amount links. Each column has 1–7 nodes; links only join adjacent columns. All bands use one amount-to-width scale. Internal nodes and column totals must conserve amounts. | Not counts of overlapping people, cycles, arbitrary dependencies or net negative amounts. No automatic balancing into Other; add a real residual with an explicit meaning or choose another view. Tiny bands can fall below visible resolution and be refused. |

All accept a title, subtitle and note. Data integrity includes the host's words:
the runtime cannot verify a title's causal or evaluative claim. Keep units,
sample populations, missingness and observation status clear in the work.

The shared `labelTrack` preserves numeric point positions while moving labels
within a declared reading budget. `pairedStats` computes descriptive paired
statistics; `binObservations` applies explicit interval boundaries. These helpers
can be reused in other constructions without imposing a whole-page template.

`sankey` requires supplied colours as six-digit hex values. Choose a coherent
set for the amount categories; do not let a colour change the identity or amount
of a node. Source and target ports partition the actual node height. The graph
is recomputed without changing input order to hide an imbalance.

Run `node tests/musecore/distribution.test.mjs` for data, geometry and scope
checks. These are developmental constructions, not proof that all hosts now have
the source author's taste. Original sources and their hashes are registered in
`assets/musecore/index.json`; existing files and aesthetic baselines stay intact.
