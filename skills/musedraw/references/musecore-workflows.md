# Structures, time and calculations

Use a family only when the given relationships and reading task fit its scope.
These constructions own geometry and calculated encodings. The host supplies
facts, labels, units and explicit relationships; it does not supply coordinates
or redesign the family to force an incompatible brief into it.

```sh
node scripts/musedraw.mjs core list --compact
node scripts/musedraw.mjs core example critical-path --out output/project.json
node scripts/musedraw.mjs core render output/project.json --out output/project
```

All examples contain fictional or simulated development content. Write the
input for the user rather than asking them for JSON. Inspect the actual PNG at
delivery size and preserve its SVG, offline editor and content source.

## Select by meaning

| Family | Accepted content and computed decisions | Boundary |
| --- | --- | --- |
| `critical-path` | 3–18 identified tasks with label and nonnegative duration; 1–30 explicit directed dependencies; a unit. Compute earliest/latest times, total float and zero-float tasks. One task network and one time chart share those calculations. Graph supports at most 8 dependency levels and 4 tasks per level. | Durations are continuous calculation units. This does not add calendars, resource constraints, lags, buffers or deadlines. Cycles are rejected. Zero-duration tasks are milestones. A gold task is zero-float under the given assumptions, not a risk prediction. |
| `hierarchy` | One or two panels, 3–24 identified nodes each, one explicit parent per non-root node, and nonnegative integer `ownCount`. Allocate horizontal space from leaf subtrees, place levels, and compute subtree totals and per-level counts. `expectSameTotal` explicitly requests an equal-total comparison. | `ownCount` is direct membership excluding descendants; do not enter already-aggregated totals there. Unknown headcount is not zero. No multiple reporting lines, arbitrary networks or inferred restructuring. Dense leaf counts may require another view. |
| `journey` | 2–6 identified role lanes, 1–7 identified dated events per lane, explicit milestone flags, min/max day and 2–7 phases partitioning that range. Event positions use actual relative days. Dense labels add tracks and increase only the affected lane. | At most 365 relative days; no calendar or weekday inference. Events are points, not activity-duration bars. No inferred handoffs or invented sentiment curve. Keep observed and planned events distinct in the supplied wording. |
| `planner` | 2–18 tasks with explicit importance/urgency booleans and positive minute estimates; 2–7 named days; 0–32 explicit sessions. A priority board and daily time grid keep task IDs/colours aligned. Compute planned totals and show estimates exceeded. | One daily window of at most 12 hours. Sessions last at least 30 minutes, stay inside the window and cannot overlap on one day. Named days are supplied labels, not inferred calendar dates. Unscheduled tasks remain unscheduled; estimates are not an enforced cap. Short blocks use IDs linked to full task names on the board. |
| `timezone` | 2–8 offices with explicit fixed UTC offsets, daily work start/end, valid UTC reference date and `recurringDaily:true`; meeting duration 15–240 minutes. Quarter-hour slots feed circular work bands, concurrency, pairwise overlap and the first complete common start. | Fixed supplied offsets, not an IANA timezone/DST service. Offsets range −720..840 minutes in 15-minute steps. Work bounds use 0..1440 and may cross midnight; 0..1440 means all day, equal bounds mean empty and are rejected. No common full-duration window yields no recommendation. Meetings may cross the UTC date boundary because recurrence is explicit. |
| `formula` | 1–8 labelled numeric variables with units and number/percent display; a bounded expression; output label/unit; 2–24 ordered numeric scenario positions with explicit value overrides. The formula text, base result, trace and scenario curve derive from the same expression. | Supported operators: add, subtract, multiply, divide, ceil, floor, min and max. No arbitrary code, symbolic algebra, unit conversion, dimensional checking or domain policy validation. Expressions have at most 48 nodes and depth 8. Division by zero and nonfinite outputs are refused; every displayed variable must be used. Scenario lines only connect supplied examples. |
| `states` | 2–6 explicit states with labels/descriptions, 1–14 identified transitions and their labels, plus a given initial state, duration and 0–30 ordered transition events. Compute occupancy segments and final state; maintain state identity in diagram and trace. | Textual guards are explanatory, not executed or semantically proved. Each event must follow a transition from the current state. No self-transitions, nested/concurrent states or automatic circuit-breaker policy simulation. Crowded edge captions may require a separate view. |
| `deployment` | Actor, entry service, 2–4 named runtime zones with 1–5 ordered components each, and 2–28 explicit links. Components are services or one final data object per zone. Recompute boundaries, component heights and routing when membership changes. | Simplified replicated deployment view, not a formal C4 validator or general network. Request routes join actor→entry, entry→first service, or components in the same zone. Cross-zone sync joins data objects only. No inferred communication, replica behaviour, availability guarantee or operational configuration validation. |

The `timezone` office rows retain each explicitly supplied fixed UTC offset and local work interval. The selected meeting end is its first feasible UTC start plus `meetingMinutes`; each local endpoint carries its own day offset relative to `referenceDate`. Daily common working minutes are accumulated overlap, which may be split across intervals; they are not the selected meeting duration. No common complete meeting means no local meeting endpoints.

Every family also accepts title, subtitle and note. Titles and condition text
remain the host's semantic responsibility. A numerical trace passing validation
does not establish a factual or causal claim about a real project.

## Public reusable mechanisms

- `graphs.mjs`: deterministic topological ordering, dependency levels,
  critical-path calculations and rooted-tree aggregation. No page coordinates.
- `time-windows.mjs`: fixed-offset recurring work intervals and complete meeting
  overlap. No location lookup or hidden daylight-saving assumptions.
- `calculation.mjs`: bounded arithmetic expression evaluation and generated
  symbolic/numeric text. No `eval` or execution of user-supplied code.
- `state-trace.mjs`: validate transition continuity and compute actual state
  intervals from an explicit event sequence.
- `visualHeadingPlan`: measure the heading before placing the main subject.
  New routing bands can reserve space without moving content by hand.

These mechanisms support other constructions; a new family need not rewrite
them. Typography, objects and material still belong to each composition. A
blueprint schedule, editorial hierarchy, priority board, observatory clock and
neon state trace are separate visual constructions.

## Checks and current evidence

`node tests/musecore/workflows.test.mjs` checks known calculations, data identity,
changed bottlenecks, aggregate counts, dense label reflow, calendars, expressions,
transition continuity and explicit scope exits. Seeded graph trials are algorithm
checks, not additional reviewed artworks or aesthetic comparisons.

Source case identities and hashes are registered in `assets/musecore/index.json`.
They record provenance and a bounded related capability, not a claim that every
part of every source has been parameterised. Keep accepted source files unchanged.
This development revision has no independent host-transfer or aesthetic verdict;
visual judgement and execution results remain separate.
