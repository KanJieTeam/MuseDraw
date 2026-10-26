# Plan composition · targets, work and shared support

Use when a brief supplies dated numeric targets, undated workstreams and shared
support. This method owns a typographic hierarchy, measured text allocation,
aligned periods, separate metric scales and a distinct work/support region.
It compiles into the existing scene engine; no extra runtime is needed.

```json
{
  "method":"plan",
  "encoding":"values",
  "title":"社区服务计划",
  "periods":["第一阶段","第二阶段","第三阶段"],
  "metrics":[
    {"id":"locations","label":"服务点目标","unit":"个","values":[4,7,9]},
    {"id":"sessions","label":"月活动目标","unit":"场","values":[12,20,28]}
  ],
  "work":[
    {"id":"route","label":"站点运营","actions":["记录需求","调整服务安排"]},
    {"id":"training","label":"岗位协作","actions":["统一交接清单","开展岗位培训"]}
  ],
  "support":["需求台账","服务手册"]
}
```

The example is illustrative, not user data. Write the actual facts and render:

```sh
node <skill>/scripts/musedraw.mjs compose composition.json --out output/plan --strict
```

Keep IDs stable for edits. Change this composition and recompose; do not edit the
generated scene and then expect recomposition to preserve those manual changes.

## Decisions built into this method

- `title` is optional. Supplying it means the brief requests a visible heading;
  omitting it produces no page heading. It does not add a slogan or subtitle.
- `periods`: two to five supplied labels in their supplied order; no new dates.
- `metrics`: one to three series, a stable `id`, exact `label`, supplied `unit`
  and one nonnegative numeric target per period. Different units are not mixed
  into one scale. A number is a target, never an inferred achieved result.
- `encoding:"values"` is the default: aligned large numeric values, no invented
  chart scale. **This field belongs at the composition root, alongside `metrics`,
  never inside a metric.** Select `"bars"` when the brief asks to compare changes,
  growth, decline or magnitudes; do not keep a value table for that task merely
  because it looks cleaner. These are horizontal bars in separate metric panels,
  with a period label beside every mark. Bars start
  at zero and share a maximum within each metric, with the exact values visible.
  They have no completion tracks or percentage labels. This is a small planning
  comparison, not a replacement for a statistical plotting tool.
- `work`: one to five undated workstreams, each with a stable `id`, `label` and
  one to four actual `actions`. Up to four form unboxed columns across the page;
  five use a vertical relation layout. Both are independent of the year
  columns. The compiler does not infer which year any action belongs to.
- `support`: one to four supplied resources, connected once to each workstream.
  This method assumes every listed resource supports all workstreams. Use a
  custom composition when support relationships differ.
- `theme` is optional and preserves a requested named MuseDraw style. The default
  is `journal`. Font roles and gaps belong to the method; colour and surface
  choices remain with the theme. Essential numeric labels use its ink colour;
  chart fills may use an accent. Text-only work nodes do not inherit card bars,
  plates or shadows that could obstruct their copy. One method is not one universal aesthetic.
- `width` defaults to 1440; geometry and text scale together. Content changes
  recalculate row heights before output. Overfull content fails explicitly;
  it is not truncated or globally shrunk to force a fit.

PNG is the default, with composition JSON, generated scene JSON and SVG retained.
Read checks; ordinary output follows the main Skill's review policy. Inspect the
actual preview for explicit design review or gallery contributions. Passing
geometry/readability checks does not certify taste or factual accuracy.

## Choose another method when

Use a timeline/Gantt when work has actual dates or durations; a flow when the
main question is responsibility or conditional routing; statistical tools for
raw measurements; and a deliberate custom composition for mixed relationships,
unequal support membership or a reference whose visual language differs.
