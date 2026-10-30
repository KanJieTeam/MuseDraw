# Explicit field counts and supplied association results

`quadrat-density` draws a bounded rectangular field and explicit quadrat
coordinates. It accepts supplied point coordinates or explicitly pre-counted
records; it does not identify organisms from photographs. A declared edge rule
controls boundary inclusion. Density is total included count divided by total
sampled area, including when quadrat areas differ. Locator lines are layout
guides, not evidence of random or representative sampling. The example points
are synthetic and do not justify extrapolating a population over the full field.

`gwas-overview` draws supplied variants using cumulative chromosome positions and
`-log10(p)`. The input declares chromosome lengths, assembly, coordinates,
thresholds, local-region records and any LD values or gene tracks. The Manhattan,
QQ and local panels use that supplied input; the QQ panel describes only the
given set. It does not run association tests, calculate LD, infer independent
loci, population stratification, risk, biological mechanism or causality. It does
not infer a complete analysis from the illustrative subset or report lambda-GC.

Both routes own their measured labels, scales, visual hierarchy and bounded
reflow. Read the examples and enforced input limits before use. Numeric checks
and source-case links show bounded execution, not a verified scientific result
or approval of the resulting appearance.

Use `core example quadrat-density` or `core example gwas-overview`, then
`core render` with the generated JSON. Work outside these data shapes needs a
different route rather than invented observations or squeezed labels.
