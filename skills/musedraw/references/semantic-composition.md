# Semantic composition

Use this route for ordinary directed flows (with or without responsibility
lanes), matched object states and explicit RACI responsibility matrices. Describe content and relationships; the code
owns page geometry, readable type and role styling. No extra installation.

```sh
node <skill>/scripts/musedraw.mjs compose composition.json --out output/diagram --strict
```

Default output is PNG with preview, SVG, checks, generated scene and a copy of
the composition.
Read `checks.json`, fix actual failures and deliver. No mandatory vision/OCR.
Reuse this command after editing the composition; use `render scene.json` for
fine adjustments outside these methods. Recomposing regenerates `scene.json`,
so edit one source consistently rather than expecting hand edits to survive it.

These methods default to `journal`, a white field with precise lines. Don't
invent a style-selection task when the user hasn't requested a style. All 20
named styles remain available via `theme` or `--theme`; a requested style takes
precedence. A method is not an interpreter for arbitrary natural language.

## Flow: actions, choices, shared routes, return paths

```json
{
  "method":"flow",
  "lanes":[{"id":"staff","label":"店员"},{"id":"repair","label":"维修人员"}],
  "nodes":[
    {"id":"report","label":"提交报修","lane":"staff"},
    {"id":"remote","label":"远程排查","lane":"repair"},
    {"id":"visit","label":"上门维修","lane":"repair"},
    {"id":"accept","label":"验收设备","lane":"staff"}
  ],
  "links":[
    {"from":"report","to":"remote"},
    {"from":"remote","to":"visit","label":"远程未解决"},
    {"from":"remote","to":"accept","label":"远程已解决"},
    {"from":"visit","to":"accept"},
    {"from":"accept","to":"remote","label":"验收未通过","feedback":true}
  ]
}
```

Add every required action and relationship from the actual brief. The example
does not imply that a repair process should end without closure. It shows the
input grammar only. Do not copy its facts into unrelated diagrams.

- `nodes`: persistent `id`, short factual `label`; `shape:"diamond"` for an
  actual decision, `emphasis:true` for a genuine focal action. No per-node colours.
- `lanes` is optional; with multiple lanes each node needs its factual `lane`.
- `links`: existing `from`/`to`, optional condition `label`. Mark actual returning
  edges `feedback:true` so the forward graph can be laid out without a cycle.
- Optional `width` starts at 1200. Layout grows rows for long labels, keeps
  conditions on their paths and routes long/returning connections in channels.
- Long flows with up to four roles automatically switch to responsibility
  columns and a downward sequence when the horizontal reading view is too wide.
  Keep the semantic brief intact; changing output resolution does not add room.
- Generated scenes retain `meta.flowContract`: operation text, decision shapes,
  conditions, relationships and responsibility bounds. Visual edits may change
  styling or move a node within its role. Moving it outside, removing an action
  or adding a shortcut fails validation. For a real content change, edit the
  composition and recompose; do not delete the contract to get a passing render.
  This protects the declared brief, not its interpretation of the user's facts.
- Don't hide branches or rework in explanatory notes. Don't add durations,
  metrics, states or conditions absent from the request. If a brief is too wide,
  the compiler reports the limit; simplify wording without deleting facts or
  use a deliberately designed custom scene. This is not an everything-layout.

## States: persistent objects, alignment, contact and containment

```json
{
  "method":"states",
  "entities":[
    {"id":"base","label":"底座","extent":[0.75,0.18],"role":"context"},
    {"id":"lid","label":"盖板","extent":[0.75,0.12],"role":"focus"}
  ],
  "views":[
    {"id":"apart","label":"分离","items":[
      {"entity":"base","at":[0.5,0.8]},
      {"entity":"lid","place":{"of":"base","relation":"above","gap":0.3}}
    ]},
    {"id":"contact","label":"接触","from":"apart","items":[
      {"entity":"lid","place":{"of":"base","relation":"above"}}
    ],"arrows":[{"from":[0.94,0.3],"to":[0.94,0.65]}]}
  ]
}
```

- `entities` define each object once. `extent:[width,height]` is a fraction of
  one view's drawing area, not pixels; dimensions and encoding stay fixed across
  states. Two separate pins require two IDs even if they share a label.
- Optional `shape`: `box` (default), `circle`, `parallelogram`, `cylinder`,
  `diamond`, `doc`, `folder`, `frame`, `tray`, `hex`, `pill`. A folder has its
  own tab, a frame has an opening, and a tray has a front lip/handle. Use these
  native objects when they explain the content, rather than labelling identical
  boxes. For a schematic cabinet/drawer, use an open `frame` and `tray`; don't
  invent a separate coloured rectangle called “opening” over a solid box. An
  opening is empty space in its enclosure, not another opaque physical object.
  Draw the actual after-state of each operation: after “insert”, the
  object is inside, with a motion arrow beside it if needed. An arrow aimed at
  an object still suspended outside is an in-progress state, not insertion done.
- Optional `role`: `context`, `focus`, `constraint`, `warning`. The same role
  keeps the same encoding; it is not a different colour for each panel. Use
  `tone` only when a requested theme needs its own supported tone.
- Each view has stable `id`, short operation/condition `label`, and `items`.
  Set an initial `at:[cx,cy]` in 0..1, or use `place` relative to another object.
  `place.relation` is `above`, `below`, `left`, `right`, `inside`, or `align`
  (same centre). `gap` defaults to zero: **above/below/left/right with zero gap
  makes the corresponding surfaces touch**. Optional `offset:[dx,dy]` shifts the
  centre in signed view fractions. `inside` supports rectangular `box`, `frame`
  and `tray` containers, plus the rectangular front pocket of a `folder`, and
  verifies the full object fits the opening. A frame reserves wall thickness;
  a tray reserves its front lip; a folder reserves its tab/top band. Curved containment
  needs a custom scene instead of a misleading bounding-box promise.
- `from:"earlier-view-id"` inherits its objects and placement constraints;
  supply only changed poses. Attached objects follow a moved reference. Input
  ordering does not control the constraint solver. Cycles are rejected.
- Item ordering controls overlap. The first view establishes object painting
  order, inherited views retain it; draw background objects before internal or
  foreground objects. No objects or quantities are added by the compiler.
- Optional `arrows:[{from:[x,y],to:[x,y],label?}]` show real local motion. Use a
  vertical vector for a vertical action; don't label a diagonal cross-panel
  connector “vertical”. No transition arrows are invented between comparisons.
- For a cutaway enclosure, `shape:"frame", openSide:"r"` leaves its right side
  open (`l`, `t`, `b` also work). Use a consistent front/side projection across
  all states: an enclosure opening and the real direction of a part's motion
  often explain insertion better than a closed panel with an external box.
- Names appear once in a readable key, not squeezed onto each small part.
  Short `doc` identities such as A1/A2 are placed inside when they fit, so the
  reader can follow individual documents through grouping/filing. Use
  `labelMode:"inside"`, `"above"` or `"key"` per entity to set this explicitly.
  Multiple differently named folders get labels above their actual bodies by
  default, with space reserved below the view heading. If documents occupy that
  space, automatic captions use the free lower side consistently across states.
  This keeps project names
  distinct without overprinting the documents inside. Keep identities visible
  when otherwise identical objects would become indistinguishable.
  `columns` may be 1..3; more views wrap to rows without shrinking the labels.

A state arrangement is schematic. This compiler cannot infer mechanical
correctness, deformation, perspective or a scientific mechanism. Use a custom
scene for changes in shape/scale, complex sections and anchored detail views.
It rejects unsupported fields instead of silently discarding them.

## Why these defaults

For a RACI matrix use `method:"responsibility"` with supplied role IDs,
deliverables and assignments, as described in [office diagrams](office-diagrams.md#responsibility-for-deliverables).
This is separate from flow ownership: being consulted on a deliverable does
not put its execution in that person's lane.

For dated targets plus undated work and shared resources, use the separate
[plan composition](plan-composition.md). It has a different input contract;
flows/states fields must not be mixed with plan fields.

The methods implement continuity, visible changes and final-size readability
from Nature's [overview-figure guidance](https://www.nature.com/articles/nmeth0511-365)
and [figure-building guide](https://research-figure-guide.nature.com/figures/building-and-exporting-figure-panels/).
They transfer design principles, not paper images or a claim of Nature-level
quality. The 1200px screen profile uses larger text than print-figure point sizes.
Passing automatic checks establishes measured geometry/export health; it does
not establish factual accuracy or taste.
