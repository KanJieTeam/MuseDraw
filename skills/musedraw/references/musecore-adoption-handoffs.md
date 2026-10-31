# Adoption scenarios and dated responsibility handoffs

These are separate tasks with separate encodings. `adoption-scenario` plots a conditional Bass first-adoption model; `dated-handoffs` lays out explicitly planned responsibilities and logical handoffs.

## Adoption scenario

- Start from `assets/musecore/adoption-scenario.json`. Declare constant per-week p/q, fixed population, two to 52 weeks, target fraction and provenance.
- Cumulative counts, one-week increments and the continuous instantaneous peak are calculated separately. Modelled expected people may be fractional. They are not actual adoption records.
- The bar for week k is the interval total N(k)-N(k-1), centered at k-0.5 with width 0.6 week, entirely inside [k-1,k]. Curve and observation positions remain their exact time endpoints. A bar is not an instantaneous rate at its center or endpoint.
- Up to 26 supplied observations remain separate; null remains missing. Residuals are descriptive, not parameter fitting, validation, uncertainty or causal evidence.
- q=0 and q<=p remain valid cases; the continuous peak is then at the start. Targets outside the display window are not pulled inside it.
- Week labels retain the usual one-decimal display. If this would turn a strictly positive model time into zero, they instead show an approximate three-significant-digit value (using an exponent when needed). True zero remains zero. This is a conditional model time, not an observed completion event; display precision does not improve the numerical model or establish forecasting accuracy.
- No retention, active-use rate, forced migration, shutdown decision or rollout guarantee is inferred.

## Dated handoffs

- Start from `assets/musecore/dated-handoffs.json`. Supply two to seven lanes, zero to 24 tasks, at most 12 milestone days and 40 directed acyclic links.
- Days are declared offsets from a named origin. Columns show ordered milestones with measured reading widths: horizontal distance does not encode equal elapsed time.
- Up to three tasks may share a lane/day, ordered by the explicit dependency graph. All declared edges remain visible; no invented edge fills a gap.
- Key/support means importance, not planned/completed status. Empty lanes and missing dependencies remain explicit.
- Reject backward-day dependencies, unknown endpoints, cycles and capacity excess. This is not automatic scheduling, critical-path analysis or a diagnosis of student results.

Normal core rendering exports SVG/PNG and an editable page. Preserve the supplied note and check delivery-size legibility; numerical and geometric validation alone does not prove aesthetic improvement.
