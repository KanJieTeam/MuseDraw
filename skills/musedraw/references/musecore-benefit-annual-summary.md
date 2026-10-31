# Annual benefit point aggregates

Use `assets/musecore/benefit-annual-summary.json` with the existing
`benefit-wallet` family. The optional `annualSummary` branch is an annual
aggregate viewing task. The original individual `budget/options/selections`
input remains supported and unchanged; these three fields cannot accompany
`annualSummary`.

Supply `family`, `title`, `subtitle`, `unit: "points"`, 3–6 identified
`categories`, `annualSummary` and the complete `note`. The annual block needs:

- A bounded `periodLabel`, explicit `evidenceKind` of `synthetic-aggregates` or
  `supplied-aggregates`, and
  `detailLevel: "overall-items-and-group-categories"`.
- 3–18 `itemUses`, each with an ID, literal label, category ID and nonnegative
  safe-integer `usedPoints`. Every category needs at least one explicit item,
  including categories whose use is zero. No price or purchase count is implied.
- 1–4 groups, each with an ID, literal label, integer `employees` in
  1–1,000,000, integer `pointsPerEmployee` in 0–1,000,000, and `categoryUses`
  containing each declared category exactly once with nonnegative safe-integer
  `usedPoints`.
- One `comparisonDenominator`, shared by all group bars: `group-used` or
  `group-budget`. It is not a per-group layout option.

Group allowance is `employees × pointsPerEmployee`; group use is the sum of
its category amounts. Unused points are their exact difference. Products,
totals and each overall-item/group-category margin are checked with integer
arithmetic. For every category, its overall item sum must equal its group use
sum. Unknown amounts, fractional counts, mismatched margins and group use
above its own allowance refuse. A group cannot spend another group's unused
allowance implicitly. This annual branch does not draw overspending as a
truncated circle; the original individual-wallet branch retains its explicit
negative-balance behavior.

The inner category band and outer item shades share the overall allowance
denominator; unused points span both bands in sand color. Group bars use the
declared denominator. `group-used` means composition of each group's used
points; `group-budget` means share of that group's allowance and includes unused
points. These are different denominators, named on the page. Neither group
percentages nor employee counts are averaged to fabricate the overall ring.
Colors identify the same categories across both views.

Positive shares below 0.01% display as `<0.01%`; a nonfull share that would
round to 100% displays as `>99.99%`. Zero and full utilization remain distinct.
Zero use with positive allowance has a genuine zero overall utilization.
A zero-used group has no defined `group-used` composition and gets an explicit
not-applicable state, not a fake normalized zero bar. Zero allowance permits
only zero use; utilization is undefined, with no full 100% ring. Literal names
remain intact, including any caller-supplied ID-like prefix. Internal item IDs
are metadata rather than automatically printed letters. Text, percentage
containment and external leader routes use measured layout at fixed type sizes;
inputs that exceed the reading-size capacity may refuse.

Only the two supplied aggregate margins are available. `groupItemDetail` is
explicitly null: there is no inferred group-by-item table or employee-level
sequence. Provenance is a caller declaration, not data authentication. This is
point accounting, not a policy, eligibility, mutual-exclusion, expiry, supplier
recommendation, satisfaction, causal-age-effect, tax or cash-conversion model.
The period label does not run a fiscal calendar.

Source `196-flexible-benefits` supplies a 2026 simulated annual review with
300 employees, 2,000 points each, five categories, twelve items and groups of
120/120/60. Its author reports 87.8% use; the graphic rounds that to 88% and
unused points to 7.3万. No exact employee-level or group-by-item raw ledger is
provided. The new example explicitly uses new synthetic item and group-category
amounts: allowance 600,000, used 468,000, unused 132,000, utilization 78%. It
does not fit rounded source percentages or reproduce the original random data,
recommendations or unprovided purchase prices.

```sh
node scripts/musedraw.mjs core render assets/musecore/benefit-annual-summary.json --out output/annual-benefits
node --test tests/musecore/benefit-annual-summary.test.mjs
```

Tests independently check integer margins, both denominators, missing-versus-zero
behavior, actual text bounding boxes inside bars and external leader clearance.
Inspect the actual full-page output as well; geometry checks do not establish
aesthetic approval.
