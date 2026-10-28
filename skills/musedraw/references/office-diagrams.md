# Everyday office diagrams

Translate the user's ordinary description into its actual work, roles,
conditions and time information. Choose the diagram from the question being
answered. The user does not need to supply coordinates, JSON or a style name.

## Process and handoff

For who does what, conditional approval, shared downstream work and rework,
use the [flow composition](semantic-composition.md#flow-actions-choices-shared-routes-return-paths).
Keep each action in its actual role and put each condition on its actual path.
A return reaches the operation being repeated, not the nearest convenient box.
Draw genuinely shared payment/archive work once. Distinct decision outcomes
must be traceable independently; proximity or intersecting lines do not imply
an additional operation or a join.

Keep quantities and dates readable as units of meaning. Do not rewrite
“金额超过5000元” to shorten a label or discard the inclusive boundary on its
other branch. The composer keeps ordinary numeric spans intact; use a wider
custom composition if a value cannot fit at a readable size.

The repository's `examples/office-purchase-flow.json` is a fictional example
with four roles, an inclusive amount boundary, a return and shared payment.
It is a grammar example, not a procurement policy. For a new user's process,
replace its facts and conditions rather than reusing its approval threshold.

## Responsibility for deliverables

When the actual brief supplies RACI responsibilities, use `responsibility`:

```json
{
  "method":"responsibility",
  "title":"评审资料 · 职责分工",
  "roles":[
    {"id":"coordinator","label":"协调人"},
    {"id":"author","label":"资料编写人"},
    {"id":"reviewer","label":"评审人"}
  ],
  "items":[
    {"id":"draft","label":"准备评审材料",
     "assignments":{"coordinator":["A"],"author":["R"],"reviewer":["C"]}},
    {"id":"decision","label":"记录评审结论",
     "assignments":{"coordinator":["I"],"author":["C"],"reviewer":["A","R"]}}
  ]
}
```

```sh
node <skill>/scripts/musedraw.mjs compose composition.json --out output/roles --strict
```

R means execution, A the final decision, C consultation and I notification.
Each supplied deliverable needs exactly one A and at least one R; the same
role may hold A/R. A missing cell remains empty. Conflicting or missing
assignments fail explicitly instead of being invented by the layout engine.
The method supports 2–6 roles and 1–12 deliverables; long names grow the
header/rows at the same reading size. It produces the normal PNG, SVG and
editable composition/scene sources.

Use this only when those distinctions are actually given. “负责人” alone
does not establish both execution and final decision power. For ordinary
task-owner lists, retain that literal relationship in a table. For reporting
lines, use a tree. Never turn a responsibility matrix into an organisational
hierarchy merely because both contain people.

Change assignments in the composition and recompose. The retained matrix
metadata is provenance, not a semantic lock on subsequent manual scene edits.

## Project time and dependencies

Use a proportional Gantt when durations or dates are supplied. Preserve the
time convention: elapsed workdays, calendar dates and named phases are different.
Show parallel tasks on the same time scale; do not add their durations as if
they were sequential. A task with two predecessors cannot start before both
have finished. A slack interval is distinct from a task's working interval.

When earliest/critical-path calculations are part of the request, compute them
from the supplied dependency graph before drawing. Keep the task durations,
predecessors and start/finish convention visible enough to check. Mark a
critical route with text or line weight as well as colour. This route does not
provide resource-constrained project scheduling or infer actual calendar dates.

Use the existing `gantt` block in a custom scene for these schedules. Use
[plan composition](plan-composition.md) instead when the facts are dated targets,
undated workstreams and shared support. Do not assign an undated activity to
a year simply to fill a column. If only ordering is known, show ordering rather
than inventing durations, completion percentages or calendar positions.

## Inspect the office question

Trace one normal route and one exception in a process, one deliverable across
its actual roles, or one parallel section of a schedule. Check those facts
separately from the actual rendered labels and line routes. Passing geometry
checks does not establish factual correctness or aesthetic superiority.
