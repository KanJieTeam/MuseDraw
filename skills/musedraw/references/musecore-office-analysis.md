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
| `objectives` | One shared objective, two to four teams, two to five key results per team. Each result has a baseline `start`, `actual`, `target`, positive weight and unit; each team has a positive rollup weight. Compute linear attainment in the direction of the target, cap the score to 0–1, and roll up the given weights. The raw actual and target stay visible. | A score is progress under this declared convention, not effectiveness, causality or a performance grade. Baseline must differ from target. Colour bands 0.4/0.7 are disclosed display conventions. No inferred links, confidence levels, deadlines or weights. Additional results grow their own column; more teams redistribute the available width. |
| `meeting-audit` | Two to seven named days; a daily window up to twelve hours; 30- or 60-minute slots; team size; one to eighteen meetings with duration, attendee count and 1–20 explicitly listed occurrences. Cell workload, total person-hours, per-person average, window share, estimated cost and ranking derive from those occurrences. | This is aggregate demand, not an individual calendar. Overlaps add and can exceed team capacity; the output discloses such cells, without inventing participant identities or declaring individual conflicts. No recurrence, lunch breaks, future savings or hourly rate is inferred. The cost is a uniform-rate estimate. Duplicate occurrences and time outside the window are refused. |
| `space-use` | Two to six zones of 1–200 seats, at most 600 seats total; two to twelve named snapshots with an integer occupied count for every zone; one explicitly selected snapshot. Recompute quantity marks, vacancy, selected totals and zone/snapshot heatmap together. | Marks represent quantities, not actual desk positions or an architectural floor plan. A missing observation is unknown, not zero. Average use is the equal-weight mean of supplied snapshots, not a time-weighted daily rate or a causal property of a policy. Selected snapshot must exist; counts cannot exceed capacity. |

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
