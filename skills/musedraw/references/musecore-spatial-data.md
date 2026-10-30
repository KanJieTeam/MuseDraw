# Spatial and quantitative constructions

Use these families for a matching reader task, not because the example has an
attractive palette. Each carries a particular arrangement of objects, labels,
scales, type roles and material. Measurement and export are shared with the
report and colour tools; the host does not edit page coordinates.

```sh
node scripts/musedraw.mjs core list
node scripts/musedraw.mjs core example waterfall --out output/changes.json
node scripts/musedraw.mjs core render output/changes.json --out output/changes
```

Write the content for the user; do not make them fill JSON. Begin with an example
to preserve its schema, then replace its fictional facts. All eight accept
`title`, `subtitle` and `note`. Inspect the actual PNG at its intended viewing
size. Text budgets apply at the family reading size: if content does not fit,
shorten with permission, split the work or choose another route. Do not silently
shrink labels, drop facts or move objects by hand to conceal a failed mapping.

## Choose by task and data

| Family | Accepted structure and computed decisions | Must not imply |
| --- | --- | --- |
| `blueprint` | 2–8 positive additive `layers` with `id`, `label`, `value`, `detail`; `unit`; optional 0–3 `excluded` amounts. Layer thickness is proportional to value. Independent label tracks connect back to the actual layers; excluded amounts sit separately and stay outside the total. | Ordinal layers are not measurable thickness. Do not put overlapping quantities into an additive stack, or inflate a tiny layer to make it visible. Dense labels and sub-resolution layers may be rejected before the nominal count limit. |
| `constellation` | 3–12 `nodes` with explicit `id`, `label`, positive `value`, `errorRate` in 0–1 and `tier`; supplied directed `edges`; a `center` using tier 0. Tiers 1 and 2 accept at most 5 and 8 objects respectively. Node area represents value; supplied warning/critical thresholds determine colour. Labels search available space. | Distance and orbit are layout devices, not latency, dependence strength or measured coordinates. Edges must be provided; the program does not infer them. This is a small radial network, not a general graph layout or an observability system. Crowding can require a different view. |
| `scroll` | 4–12 increasing integer years and nonnegative values, each with a short `event`. Real year differences set horizontal spacing; values set vertical positions on a common zero baseline. The quieter lower bars use the same observations. | Equal spacing for unequal years, a fitted historical trend, causality from events, or artwork in place of evidence. Tightly adjacent years with long event text require another treatment. |
| `dumbbell` | 3–14 identified items with `label`, nonnegative `before` and `after`; named comparison periods and `unit`. Sort by signed change, preserving input order for ties; row height follows label wrapping. Both endpoints share a zero-based scale. | Positive change automatically being good. Colours encode increase/decrease, not a recommendation or statistical significance. For signed measurements use another chart. |
| `waterfall` | Numeric `start`, 2–10 identified signed `changes`, start/end labels and `unit`; optional `expectedEnd`. Each bar is calculated from the previous cumulative total; negative totals may cross zero. `expectedEnd` must reconcile. | Treating independent categories as cumulative changes. Generated titles and explanatory claims remain the host's responsibility. This is a simple bridge, not the separate business-review editorial kit. |
| `funnel` | 3–8 non-increasing counts from one nested cohort, named stages, `unit` and explicit `scale` of `linear` or `log`. Compute stage-to-stage and overall conversion. Bar lengths are calculated; the pixel texture does not count people. | Using a funnel for unrelated populations. A log chart discloses `log10(count + 1)` and refuses zero counts; it cannot be read as linear population length. Linear zero tails are allowed; 0/0 conversion is undefined. |
| `survey` | Exactly five ordered response `levels`, from negative through neutral to positive, and 3–12 items with five integer `counts`. Normalize each question by its own response count, split neutral evenly about zero, and sort by positive share. Show each sample size. | Treating question samples as equal when they are not, converting missing responses into neutral, or asserting significance from share differences. Supply the ordered response scale; do not infer it from arbitrary category names. |
| `cohort` | 3–12 identified cohorts, 3–10 unique `periods`, two named `groups`, explicit `focusPeriod`. Each cohort has positive integer `size`, matching period-zero count and counts in 0..size. `null` is a trailing unobserved suffix. Table shares and group curves come from those counts. | Missing observations as zero. Curves pool numerator and denominator over observed cohorts separately at every period; the contributing set can change with maturity. Do not claim causal improvement or call it a fixed-population survival curve. |

`constellation` requires explicit thresholds with
`0 <= warningAt < criticalAt <= 1`. Use actual policy or clearly label a simulated
threshold. The display does not discover operational policy from the data.

## Preserve meaning during editing

- Keep IDs stable when labels change; graph edges and object identity use IDs.
- Preserve units, uncertainty and data status. Demo inputs are fictional, not
  user observations. A numeric input passing validation does not make it true.
- In `cohort`, `size` is the denominator for every observed period of that row.
  Counts need not decrease: the input may be active-user observations with
  returning users. That requires the appropriate meaning in the supplied text.
  Do not infer churn/survival from the shape.
- Do not add coordinate/style fields to bypass a family boundary. Use free
  SVG/HTML, the scene engine or another appropriate production route when no
  family fits; retain honest expectations about that route's design work.

## Delivery and checks

The CLI produces input JSON, native SVG, PNG, an offline editor and `checks.json`.
The editor renders locally and downloads SVG. The CLI widens its browser to the
native artifact width before PNG capture; wide artwork must retain its right edge.
The public examples and source case identities live in `assets/musecore/index.json`.

Run the dedicated test suite with
`node tests/musecore/spatial-data.test.mjs`. It checks proportional geometry,
directed identity, irregular dates, cumulative totals, conversion denominators,
question normalization, weighted cohort counts and full-width PNG export.
General geometry auditing checks text bounds, text overlaps and the supported
orthogonal line/text intersections. Decorative grids are explicitly marked and
are not semantic connectors. Clipped hatch strokes and arbitrary diagonal lines
are not fully assessed by that auditor; visual inspection remains necessary.

These are bounded development capabilities extracted from existing original
cases. Their tests establish execution and numerical behaviour, not general
aesthetic superiority or independent transfer to WorkBuddy/ZCode. New family
renders still need aesthetic judgement; source replay does not count as a newly
parameterised capability.
