# Policy matrices and point allocations

`service-priority` uses the user's explicit impact/urgency policy. Provide
2–5 levels on each axis, 2–6 identified priorities and a complete matrix whose
cells refer to those priorities. Each of 0–30 tickets supplies an ID and its
two declared levels. The program derives its priority, cell, counts and detail
listing; the host cannot pass a contradictory precomputed priority. Unknown
levels, IDs and incomplete matrices refuse. Do not infer impact from a ticket
title or present the example policy as a universal ITIL rule. The neon matrix
is a lookup surface; equal cells intentionally represent equal policy slots.

`benefit-wallet` accepts integer point budgets, 1–6 categories, 1–16 identified
options with integer point prices and 0–24 selections. Selection quantities
and `confirmed`/`planned` status determine confirmed and projected spending.
The ledger preserves `confirmed + planned + remaining = budget`; negative
remaining allowance stays visible. The inner ring aggregates categories, the
outer separates confirmed/planned selections, and all percentages/bars share
one stated denominator. When spending exceeds the budget, the view explicitly
uses selected spending as its visual denominator rather than clipping it.
Unallocated basis points participate in the common 10,000-part rounding.

Only points are supported: do not mix money and points, convert units silently,
or infer tax, entitlement or benefits-law conclusions. The pure model reuses
`allocateMinorUnits` for conserved category shares. It supplies quantities;
the terracotta drawing supplies the coordinated objects and material.

```sh
node scripts/musedraw.mjs core example benefit-wallet --out output/benefits.json
node scripts/musedraw.mjs core render output/benefits.json --out output/benefits
```

Inspect the actual matrix, legend, rings, labels and numerical summaries.
A geometry pass alone cannot detect a legend populated from the wrong array or
a misleading percentage denominator. Keep those semantic regressions tested.
