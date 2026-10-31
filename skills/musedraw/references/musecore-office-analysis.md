# Office analysis constructions

Use these when the reader needs to trace costs, goal progress, meeting workload
or sampled seat use. The numerical and composition programs cooperate: a host
supplies facts and explicit policies, while the program owns geometry and
recalculates the encodings. These are not general business recommendations.

```sh
node scripts/musedraw.mjs core list --compact
node scripts/musedraw.mjs core example meeting-audit --out output/audit.json
node scripts/musedraw.mjs core render output/audit.json --out output/audit
```

Write the input for the user. Inspect the real PNG at delivery size and preserve
the content, SVG and offline editor. Development examples are fictional.

## Select by the calculation and reading task

| Family | Inputs and computed decisions | Boundary |
| --- | --- | --- |
| `cost-allocation` | Two to six named business units and two to six identified cost pools. Each pool has an amount in integer `minorUnits`, a named allocation basis and a nonnegative weight for every unit. Allocate each pool using largest remainders, then total and rank the unit bars. Tied remainders follow input order. | A currency has 100 minor units in this construction. No exchange rates, tax, invoice validation or inference of which basis is fair. The basis must be supplied; zero total weight is refused. All money totals must remain safe integers. A zero-weight unit receives zero from that pool. |
| `objectives` | One shared objective, two to four teams, two to five key results per team. Each result has a baseline `start`, `actual`, `target`, positive weight and unit; each team has a positive rollup weight. Compute linear attainment in the direction of the target, cap the score to 0–1, and roll up the given weights. Baseline, actual and target remain visible under a shared field key. Original weights are shown at each rollup scope: an equal-weight scope can state the common raw value once; unequal weights retain individual raw values and their local sum. KR weights affect their team rollup, and team weights affect the shared rollup; neither changes an individual KR score. | A score is progress under this declared convention, not effectiveness, causality or a performance grade. Baseline must differ from target. Colour bands 0.4/0.7 are disclosed display conventions. No inferred links, confidence levels, deadlines or weights. Additional results grow their own column; more teams redistribute the available width. |
| `meeting-audit` | Two to seven named days; a daily window up to twelve hours; 30- or 60-minute slots; team size; one to eighteen meetings with duration, attendee count and 1–20 explicitly listed occurrences. Cell workload, total person-hours, per-person average, window share, estimated cost and ranking derive from those occurrences. | This is aggregate demand, not an individual calendar. Overlaps add and can exceed team capacity; the output discloses such cells, without inventing participant identities or declaring individual conflicts. No recurrence, lunch breaks, future savings or hourly rate is inferred. The cost is a uniform-rate estimate. Duplicate occurrences and time outside the window are refused. |
| `space-use` | Two to six zones of 1–200 seats, at most 600 seats total; two to twelve named snapshots with an integer occupied count for every zone; one explicitly selected snapshot. Recompute quantity marks, vacancy, selected totals and zone/snapshot heatmap together. Each snapshot row shows total occupied / total capacity. The summary distinguishes the selected snapshot, the equal-weight mean and the highest supplied snapshot total, retaining every tied snapshot name with wrapping and page growth. | Marks represent quantities, not actual desk positions or an architectural floor plan. A missing observation is unknown, not zero. Explicit zero counts remain zero observations, including ties at zero. Average use is the equal-weight mean of supplied snapshots, not a time-weighted daily rate or a causal property of a policy. The highest supplied total is not a continuous-time peak; labels alone provide no sampling duration or person-hours. Selected snapshot must exist; counts cannot exceed capacity. |

The program refuses text that cannot fit the fixed typographic budget. Do not
silently abbreviate facts, lower the type size, invent omitted observations or
switch allocation policies to make an input pass.

## Shared mechanisms and evidence

`office-analysis.mjs` exposes coordinate-free cost apportionment, two-level
objective rollup, occurrence-based meeting workload and sampled occupancy.
Each can feed another view without repeating the arithmetic. The compositions
retain different visual languages: enterprise cost ledger, editorial objectives,
terminal workload audit and Bauhaus seat quantities.

`node tests/musecore/office-analysis.test.mjs` checks known totals, decreasing
targets, weight effects, rounding conservation, explicit occurrence accounting,
changed snapshots, actual browser layout and rejection boundaries. Seeded
apportionment checks test arithmetic, not additional artworks or aesthetic
approval. Source identities/hashes live in the example registry; the original
works are preserved. This revision has not independently demonstrated aesthetic
transfer through WorkBuddy or ZCode.


## Explicit retained costs and derived shared costs

The optional `allocationMode: "retained-direct-cost"` selects a separate bounded
view of the same `cost-allocation` family. Inputs without this field keep the
existing allocation and presentation path. An unknown mode is refused.

Copy `assets/musecore/cost-retained-derived.json` for a distinct fictional
example. It has the same 2–6 units and 2–6 pools and currency scale of 100. A
direct pool retains its explicit complete `weights`. Its optional
`retained: {minorUnits, label}` gives a nonnegative integer amount no greater
than the pool amount. The label is mandatory, including for an explicit zero.
The remainder is distributed with the existing largest remainder allocator. A
positive finite weight sum is still required for fully retained or zero pools.
Unused weight percentages never imply retained costs.

At most one shared pool may use `directCostPoolIds`, a nonempty unique list
of direct pool IDs, instead of hand-entered weights. Its basis for each unit is
the sum of that unit's already rounded integer allocations in exactly those
selected direct pools. Retained amounts are excluded. No self-reference,
shared-to-shared reference, manual shared weight or retained shared amount is
accepted. Presentation order does not control dependency calculation.

The selected direct basis must have a positive denominator. A zero-amount
shared pool is accepted when that denominator is positive and allocates zeros.
A zero denominator is refused for both zero and positive shared amounts; the
program does not invent weights or divide 0 by 0. A zero direct-only ledger is
allowed and displays undefined percentages explicitly. All amounts and summed
totals must be safe integers; existing allocation precision refusals remain.

`allocateRetainedCostPools(units,pools)` reuses `allocateMinorUnits`. It
returns pool allocations, explicit retained records, unit parts, and a shared
`derivedBasis` containing selected pool IDs, each computed integer unit basis
and their denominator. The caller's `basis` text stays intact. Every pool
conserves allocations plus retained; the complete account conserves all unit
totals plus retained. Warm retained records stay separate from unit ranking.
Unit percentages divide by the complete account including retained; retained
percentages divide by their identified pool. Shared provenance shows the
selected direct pools and direct-cost-to-shared amounts. Additional categories
and long text expand measured layout or are refused without smaller type.

The 118 source supplies its pool totals, 11,700 yuan retained compute cost and
final unit totals, but not the complete pool allocation weights. Its SVG
segment widths are not treated as independently supplied data, and the new
fictional example does not fit or reproduce those source totals. The original
source describes rounding to whole yuan; this existing construction continues
to allocate in integer minor units at scale 100. No claim of identical source
rounding, actual idle utilization, waste, savings, fairness or recommended
operational action follows from retained money. The composition reference is
separate from the actual input source. Caller title, basis, labels and note are
retained in full.

`node tests/musecore/cost-retained-derived.test.mjs` checks independent
integer rational apportionment, both allocation stages, multiple retained
pools, explicit zero rules, selected dependencies and conservation, real SVG
unit/pool identities and bar geometry, full caller text, measured typography
under ascent pressure, and actual rejection boundaries. The original office
analysis tests remain unchanged.
