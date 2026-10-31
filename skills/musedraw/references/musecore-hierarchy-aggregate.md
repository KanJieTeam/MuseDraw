# Aggregate organization comparison

Use `family: "hierarchy", view: "aggregate"` for supplied level totals and a
department distribution of one named role. This is a separate view of the
existing hierarchy family. Omitting `view` preserves the explicit-parent tree
route; aggregate inputs do not enter `rootedTree`.

```sh
node scripts/musedraw.mjs core example org-restructure-aggregate --out output/org.json
node scripts/musedraw.mjs core render output/org.json --out output/org
```

The example uses the published illustrative counts from source
`185-org-restructure`: five level counts, before `[1,8,26,58,219]`, after
`[1,5,22,46,238]`; each total is312. Explicit management-role flags select the
first four named categories, giving93 and74. Source circles have an explicit
one-circle-one-director key: the eight before departments contain
`[4,4,3,3,3,3,3,3]` directors and the five after departments `[5,5,4,4,4]`.
These are source example figures, not actual employee records. Neither input
nor renderer invents the missing manager/staff allocation or individual parents.

Inputs contain nonempty `title`, `subtitle`, `note`, explicit
`expectSameTotal`, and:

- `roles`: 2–8 unique `{id,label,management:boolean}` categories, shared by all
  panels. Their row order is supplied. Management membership never comes from
  position, label wording or visual depth.
- `countedRole`: a supplied role ID whose people are shown again by department.
  This second view does not add people to the organization total.
- `panels`: 1–2 unique panels with `id`, `label`, complete `levelCounts`,
  `departmentScope` and `departments`. Every role count is an explicit
  nonnegative safe integer. Missing/null/NaN is unknown and refused.
- `departments`: 1–10 unique `{id,label,count}` entries. `count` means only the
  number of `countedRole` people in that department. Other department-level
  counts remain unspecified. Up to80 exact circles per department and400 per
  panel are supported; zero produces no circle.

`departmentScope: "full"` is the caller's assertion that all departments and
the complete selected-role distribution are listed. Department counts must sum
exactly to that role's level total. `"listed"` permits a partial catalogue:
its sum may not exceed the role total, and the view visibly says “所列部门”
and shows the covered role count / role total. Unlisted departments receive no
invented names, zero counts or inferred allocation. Arithmetic reconciliation
does not establish that a real-world catalogue is complete.

Panel total is the sum of level counts. Management total sums only categories
whose explicit flag is true. `expectSameTotal:true` requires two equal totals.
Role bars share `[0, largest panel total]` and a common people-to-length scale,
including when panel totals differ. Zero remains exactly zero length. Filled
versus outlined bars encode the supplied management classification; adjacent
levels are not reporting edges. Every department circle represents exactly one
supplied selected-role person, with a complete label and numeric count.

Optional panel `span:{relationCount,basis}` requires an explicit nonnegative
safe integer relation count and nonempty basis text. The denominator is the
positive management total. The visible result is “给定关系数 / 管理岗”, with
the numerator, denominator and complete basis. The renderer checks arithmetic,
not whether the caller's basis establishes an observed average management span.
It never derives relations from `N−1`, headcount or department count. Omit the
field when relations or their basis are unknown; a zero denominator is refused.
The source author separately reports3.3→4.2 under a single-root convention,
but publishes no full individual reporting roster. This example therefore
contains no computed relation ratio.

The composition reuses measured text, quantity marks and shared numeric scales.
It keeps fixed type sizes while text/mark counts determine wrapping, row heights
and page growth. Inputs exceeding the mark/text/canvas budgets are refused.
No personnel placement, merger mapping, legal process, efficiency or causal
effect is inferred. A source association is a bounded content/composition
relationship, not a claim of complete reproduction or aesthetic approval.

`hierarchy-aggregate.test.mjs` uses the production editor/render/audit path,
independent arithmetic expectations, actual SVG role/department groups, exact
circle counts, full/partial scope checks and optional tall-font/Noto profiles.
