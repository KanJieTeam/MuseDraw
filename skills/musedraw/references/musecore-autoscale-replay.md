# CPU sequence replay: a bounded synchronous teaching policy

Use `cpu-sequence-replay` for a finite, explicitly supplied total-CPU sequence
and an explicitly declared teaching policy. Its applied count feeds the next
evaluation. It is not a Kubernetes implementation, live-cluster simulator,
forecast, configuration validator or production scaling guarantee. The existing
`formula` family continues to evaluate independent arithmetic scenarios.

## Input and numeric scope

`hpa-cpu-teaching-replay.json` is an editable synthetic teaching example.
Required fields are `family`, `title`, `subtitle`, `dataStatus`, `assumptions`,
`initialReplicas`, `requestCores`, `targetUtilization`, `tolerance`,
`minReplicas`, `maxReplicas`, `evaluationSeconds`, `downscaleWindowSeconds`,
`scaleUp`, `scaleDown`, `samples`, and `note`. Unknown fields are rejected.
The title, subtitle and note each contain 1–240 nonblank characters, subject
to the figure's measured line budgets; no smaller font is substituted to fit.

- `dataStatus` explicitly says `synthetic-teaching` or `supplied-teaching`.
  Neither status verifies conditions in a real cluster.
- `assumptions` must explicitly declare `allReplicasReady:true`,
  `metricsComplete:true` and `uniformDistribution:true`. Every replica has
  the same requested CPU. False or missing assumptions are rejected.
- Replica counts are integers: `1 <= min <= initial <= max <= 100`.
  This CPU-utilization model excludes zero replicas rather than dividing by zero.
- `requestCores` is CPU cores per replica, .001–16. Target utilization is
  .01–1, and tolerance is 0–.5. These accept at most three decimal places.
  Tolerance is relative to a demand/target ratio of one, not CPU percentage points.
- Evaluation interval is an integer 1–300 seconds. Downscale window is an
  integer 0–3600 seconds; it need not be a multiple of the interval.
- `scaleUp` gives integer `maxPercentIncrease` 0–200 and `maxPodsIncrease`
  0–100. The larger allowance is selected. `scaleDown` gives integer
  `maxPercentDecrease` 0–100. Percentage allowances round DOWN to whole
  replicas; zero allowances are valid and can prevent movement.
- `samples` contains 2–96 `{atSeconds,cpuCores}` records. Times must be exactly
  `0, interval, 2*interval, ...`; irregular, duplicate or missing evaluations
  are rejected. CPU demand is 0–1000 cores, at most three decimal places.
  Explicit zero demand is valid. A missing/null metric is not zero.

The finite decimal inputs are parsed into integer thousandths. Tolerance
uses exact integer cross-products, including equality. All bounded integer
intermediates remain below 2^53. No epsilon changes a policy decision.

Missing metrics, unready replicas, startup delays, rolling-period policy
fields, caller-supplied recommendation prehistory, per-pod/multiple metrics,
external metrics, asynchronous changes and unknown fields are unsupported and
rejected. This route never fills missing observations or infers policy from prose.

## Evaluation order and explicit teaching conventions

For total demand D cores, equal request Q cores, target utilization T and
previous applied population N:

1. Compute mean utilization D/(N*Q), ratio R=D/(N*Q*T), and raw recommendation
   `ceil(N*R)`, equivalently `ceil(D/(Q*T))`. Record the raw value before bounds.
2. Clamp raw to `[min,max]`. If `abs(R-1) <= tolerance`, including BOTH equality
   boundaries, replace the recommendation with N. Rounded labels do not decide this.
3. Append the recommendation at this timestamp. History begins **empty**:
   no initial/prehistory recommendation is invented. Retain `[t-window,t]`,
   including both endpoints and the current recommendation. Window zero retains
   only the current evaluation.
4. Only for a recommendation below N, stabilize to the smaller of N and the
   maximum retained recommendation. This never turns a downscale into an upscale.
5. Limit an increase by `max(floor(N*upPercent/100), upPods)`, or a decrease by
   `floor(N*downPercent/100)`, moving toward but never beyond the stabilized
   candidate. The allowances use pre-evaluation N.
6. Feed the applied count into the next evaluation. Event totals include a
   change at t=0. Nothing after the last evaluation is predicted.

**Empty initial history, inclusive boundaries, this ordering and per-evaluation
allowances are teaching conventions.** They are not recovered source-algorithm
facts or claims about Kubernetes defaults. Full per-step recommendations,
active history indices, limits and applied counts remain in geometry/checks;
the picture emphasizes the formula, demand and actual applied staircase.

## Chart and equation semantics

CPU is in cores; replicas are counts. The grey series is explicitly normalized
to `D/Q`, CPU-request equivalents. One equivalent represents Q CPU cores.
This conversion is printed beside the common zero-based axis. Grey points are
the supplied observations; connecting segments/area do not assert measured
intermediate values. No intermediate demand or controller step is computed.
The colored staircase changes at the declared evaluation times, with an initial
vertical transition at t=0 if required, and stops at the last supplied time.
Elapsed-time labels are minutes:seconds, not civil clock time.

The large example uses an exact percentage only when it has at most two
percentage decimal places. Otherwise it displays the exact finite-decimal
CPU/capacity expression `ceil(D/(Q*T))`; a rounded utilization is never placed
inside a purported exact equality. Parameter labels keep the supplied values.
All supplied samples and the caller's complete note are retained.

## Source 103 versus the synthetic sequence

Composition reference: `103-hpa-autoscaling`, original SVG SHA-256
`179638b09100d67ba0f21764f0fb6f6076f321475a2adf60e4fbbc0becec7da8`.
The source supplies `ceil(4*.9/.6)=6`, one core requested per replica,
bounds 2–10, target .6, tolerance .1, a 15-second evaluation description,
a 300-second downscale stabilization description, a larger-of-double-or-add-four
scale-up description, and an immediate-readiness assumption.

Its author reports a 24-hour simulation with peak nine at 20:29 and 17 increases
plus 17 decreases. The original numeric CPU sequence, generator/seed and full
boundary/ordering implementation are not distributed. Those reported results
are provenance, not computed outputs of this route. Rounded SVG paths are not
used to manufacture a purported original numeric sequence.

The default uses source numerical settings with a separately declared,
**synthetic 31-point, 7.5-minute sequence**. Initial four, uniform distribution,
complete metrics, empty history, exact time grid, boundary/ordering choices and
per-step limits are explicit teaching declarations. It computes five increases,
one decrease and a peak ten first at 30 seconds. These are results for this
synthetic input; no fit to the source's 17/17 or full-day curve is attempted.
Metadata uses `compositionReference`, not a universal source-origin claim.

## Difference from the official controller

The official [Horizontal Pod Autoscaling documentation](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/),
sections *Algorithm details*, *Scaling policies*, *Stabilization window* and
*Default behavior*, describes a periodic control loop, basic ratio formula,
tolerance, historical downscale recommendations and period-based limits.
It also accounts for missing metrics and unready Pods. A per-evaluation
allowance is not its rolling policy-period history, and a raw ceil recommendation
is not necessarily an applied population. This capability intentionally has a
narrower, explicitly stated policy and makes no implementation-equivalence claim.

## Verification and portability

The dedicated test checks handwritten all-31 applied counts and detailed window,
tolerance and rate boundaries. An independent BigInt oracle directly divides
CPU by target capacity, rescans full recommendation prefixes and enumerates
permitted integer populations for 400 deterministic varied sequences. Production
browser tests check computed records, every sample position, actual staircase,
complete notes, units and explanations at ordinary and +40px ascent metrics.
Source-input facts run in an unpacked standalone Skill; only original-SVG hash
verification is explicitly skipped when the repository gallery is absent.
Font/geometry checks and numerical correctness do not establish aesthetic approval.
