# Service dependency star maps

`constellation` remains a bounded, supplied-data diagram. It accepts 3–12
services, 1–24 explicit directed edges, one center at tier 0, at most five
tier-1 services and at most eight tier-2 services, within the total limit.
Node `value` must be finite and positive. Node area is proportional to that
supplied value; positions, orbit membership and distance are layout facts,
not latency, causal strength or service level. An overcrowded graph or text
budget is rejected rather than silently dropping objects or relationships.

Each node supplies exactly one of:

- `errorRate`: an exact, caller-supplied finite rate in `[0, 1]`. Existing
  all-exact inputs retain their previous rendering and metadata.
- `errorRateState: {"kind":"below","upperExclusive":0.005}`: the strict
  interval `0 ≤ rate < 0.005`, without an exact value. The positive bound must
  be finite and at most 1. This is not the interval midpoint or a zero rate.
- `errorRateState: {"kind":"unknown"}`: no rate or bound is supplied. This
  is distinct from an exact zero and from a known upper bound.

Thresholds satisfy `0 ≤ warningAt < criticalAt ≤ 1`. Exact rates use
`rate < warningAt`, `warningAt ≤ rate < criticalAt`, and
`rate ≥ criticalAt`. A strict upper bound receives a threshold color only
when its entire possible interval belongs to one category. Thus `< 0.5%`
is wholly in the low category when `warningAt=0.005`, whereas `< 0.6%`
crosses categories and receives neutral gray. With `warningAt=0`, a bound
below or equal to `criticalAt` is wholly in the warning category. Unknown
rates also receive neutral gray, while their label explicitly says `未给出`.
Rates and bounds are supplied evidence; the renderer does not infer them
from a service name or from a source picture's color.

Inputs containing a new evidence state use measured text boxes, 28px node
names, 20px numeric annotations and a content-dependent page height.
Bounded tier-order swaps and angular adjustments reduce crossings and
reject straight routes that pass through a non-endpoint service. Every
edge remains its original `from → to`. Dotted lines without arrows attach
distant labels; they are not additional service calls. No caller-supplied
free coordinates, graph discovery, causal analysis, alert guarantee or
monitoring integration is provided.

## Source-derived example 107

`assets/musecore/service-dependency-star-map.json` preserves the eleven
services, thirteen directed relationships and printed service totals from
`107-service-star-map`, together with the four printed elevated rates:
recommendation 0.6%, order 1.8%, stock 0.5%, and payment 0.9%. The seven
blue-white services are represented only as strictly below 0.5%, as the
source legend states; no exact rate is invented for them. These are the
source's illustrative values, not verified production tracing data.

The source author notes state that service totals were generated from
incoming edge sums, and that gateway traffic equals its outgoing sum under
a stated single-backend-forwarding assumption. The distributed SVG prints
node totals but not individual edge amounts or a numeric line-width
formula. This implementation therefore preserves all thirteen directed
edges and the printed totals, but **does not reproduce or verify that
edge-sum calculation**. Edges accept only `from` and `to`; unsupported
amount fields are rejected. No amount is recovered by measuring source
geometry. The source's additive radius formula is also not copied: this
family keeps its existing exact area-to-value encoding.

The original SVG SHA-256 is
`ec0539e9c39415cc739c5b22f2c05cc653d395b86f22d95b2b3b56a3a50db420`.
The source hash test is optional when a standalone Skill has no repository
gallery; all input facts, strict-bound classification and actual production
render tests still run. `compositionReference` records visual provenance
for the new branch and does not assert that an arbitrary caller's content
comes from source 107. Passing geometry is not an aesthetic approval.

Run the source example with:

```sh
node scripts/musedraw.mjs core render assets/musecore/service-dependency-star-map.json --out output/service-star-map
node --test tests/musecore/constellation-source.test.mjs
```
