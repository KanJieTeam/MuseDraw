# Scene schema · scene.json 字段说明

A scene is plain JSON. Coordinates are canvas pixels (1× — the PNG is exported
at 2×). Extra fields remain allowed for compatibility. Copy a gallery scene and edit it.
The bundled [JSON Schema](scene.schema.json) describes core fields, primitives
and the layout blocks; associate it with your scene in a JSON-aware editor
for completion and structural diagnostics. Existing scenes need no changes.

## Validate before rendering

```sh
node <skill>/scripts/musedraw.mjs validate path/to/scene.json
node <skill>/scripts/musedraw.mjs validate first.json second.json --theme journal
```

Validation uses Node.js only: no npm install, fonts, browser or output writes.
It checks field types, finite coordinates, required layout inputs, duplicate
node IDs, connector/note targets, sequence participants and message ranges,
swimlane lanes/columns, table cell counts and Gantt ranges. References to
block-generated nodes are resolved after layout expansion. Like `render`, it
requires a scene theme or `--theme` and stops at the first invalid file with
exit code 1. The failing file and JSON Pointer paths identify the errors:

```text
scene.json: Invalid scene:
  /nodes/1/id: duplicate ID "api"; first defined at /nodes/0/id
```

`render` runs the same validation before browser startup or writing that scene's
artifacts. Errors labelled `after layout expansion` use paths into the expanded
primitive arrays, which include generated nodes and edges. In a batch, earlier
valid scenes may already have been rendered when a later scene fails.

`schemaVersion` is optional; omitted means version 1, and an explicit value must
be `1`. Unknown fields are still allowed, not a guarantee that the renderer uses
them. The offline validator reads the bundled schema with its supported keyword
subset; the regression suite guards that vocabulary when the schema changes.
The schema alone cannot check cross-object relationships: use `validate` for
those. Validation success does not certify typography, collisions, static SVG
safety, visual quality or factual accuracy. Render and read `checks.json` for
browser measurements; visual review is optional under the policy in SKILL.md.

```json
{
  "theme": "journal",
  "size": [1640, 1000],
  "kicker": "Fig. 2 · Study design",
  "title": "CONSORT 2010 participant flow",
  "subtitle": "One sentence the reader should take away. Mark example data as an example.",
  "blocks": [], "zones": [], "nodes": [], "edges": [],
  "notes": [], "texts": [], "lines": [], "paths": [],
  "legend": { "x": 64, "y": 940, "items": [{ "kind": "primary", "label": "request path" }] }
}
```

## Header

| Field | Meaning |
| --- | --- |
| `kicker` | Small line above the title (category, figure number, prompt in `terminal`). |
| `title` | Headline. `\n` forces a line break (poster styles). |
| `subtitle` | The claim of the figure in one or two sentences. `subtitleWidth` wraps it. |
| `figure` | Right-aligned tag, e.g. `Fig. 3`. |
| `seal` | `ink-wash` only: 1–4 characters in the cinnabar seal. |
| `meta` | `blueprint` title block: `{dwg, rev, scale, date, by}`. |
| `autoFit` | `false` keeps your coordinates exactly; default closes the gap under the header. |
| `header` | `false` hides the entire page header (title, subtitle, kicker, figure and rule), and auto-fit moves the diagram up. Use this for new document figures; `true` enables a requested heading. |
| `footer` | `false` hides attribution. The CLI omits unsolicited theme signatures; a string supplies attribution explicitly requested by the user. |

## Blocks — structure without coordinates

Each block takes a bounding box and content, and expands into ordinary nodes,
edges and zones (so you can still add primitives around it).

| `type` | Key fields |
| --- | --- |
| `tree` | `x, y, w, direction: down/right, root{label, tag, sub, tone, children[], stack}, nodeW, nodeH, levelGap, siblingGap` (arrays per depth allowed) |
| `mindmap` | `cx, cy, root{label, children[{label, tone, children[]}]}, spreadX, rowH, nodeW` |
| `timeline` | `x, y, w, items[{date, label, sub, tone, at}], alternate, gap, itemW` |
| `gantt` | `x, y, w, columns[], labelW, rowH, tasks[{label, start, end, tone, milestone, group}], today` |
| `matrix` | `x, y, w, h, xAxis[], yAxis[], quadrants[{title, sub, tone, items[]}×4: TL, TR, BL, BR], points[{label, x, y, tone}]` |
| `funnel` | `x, y, w, stages[{label, value, sub, tone}], stageH, gap, minRatio` |
| `cycle` | `cx, cy, r, steps[{label, sub, tone}], nodeW, nodeH, center{label, sub}` |
| `fishbone` | `x, y, w, h, head{label, sub}, categories[{label, causes[]}]` |
| `swimlane` | `x, y, w, lanes[{id, label}], laneH, labelW, cols, steps[{id, lane, col, label, sub, shape, tone}], flows[{from, to, label, kind}]` |
| `table` | `x, y, columns[{label, w, align}], rows[{cells[str or {text, tone, bold}], tone}], rowH, headH` |
| `grid` | `x, y, w, h?, columns` (integer), `items[{id,label,sub,shape,tone,...}]`, `size, gap, padding, cellPadding, rowH?, label?, cellFill, cellStroke, textColor, radius` |
| `object-views` | `id,x,y,w,h,entities[],views[]`, `columns?,gap?,rowGap?,headingH?,size?`; repeats the same native objects across states without card backgrounds |

Grids calculate cell positions and wrap text at the configured size. Omit `h`
for content-driven height, or supply a fixed frame. A frame/row too small for
its content fails before export; it never silently reduces all font sizes.
An optional grid label occupies its own heading row. Adding items changes only
that grid's geometry; neighbouring blocks retain their coordinates.

### Object views — transformations and matched comparisons

Define each primitive entity once (`id,label,shape`, optional `tone,fill,stroke,
textColor,labelPos,size,radius,openSide`). These are not arbitrary node fields;
for example, entity `weight` and `layer` are unsupported.
For a persistent object, define `extent:[w,h]` once there and omit per-pose sizes;
the block reuses its dimensions in every view. `size` on an entity remains font
size. A pose's `size:[w,h]` overrides extent only when the content calls for an
actual deformation or scale change; do not vary the length of the same pin or
the width of the same document between states accidentally.
Each view has `id,label,items[{entity,at:[cx,cy],size?:[w,h],showLabel?,overlap?}]`.
Positions and sizes are fractions of that view's drawing area, not canvas pixels;
`at` is its centre. Bounds must fit within 0–1. Panel placement is calculated from
the block frame and columns. Use short view labels; `headingH` reserves their
space. Default labels identify an entity at its first appearance; `showLabel`
controls a particular appearance. Outside labels still need breathing room.
Primitive entity labels default to `below`, unlike ordinary nodes. For text
inside an instrument or container, set entity `labelPos:"inside"`; use pose
`showLabel:true` when it should appear in each view. Scientific motif labels
remain outside or `none`.
`overlap:true` marks an intentional physical overlay, not ordinary layout errors.
Each entity can appear once per view; give distinct objects their own IDs.

Within a view, primitive `items` paint in their listed order. Put an opaque
shell first and its internal particles/parts after it. Keep those parts in the
same view rather than adding top-level nodes: block-generated nodes paint after
the initial scene nodes. `overlap:true` permits overlap; it does not change paint
order or prove visibility. Nodes do not support `layer:"foreground"`; that field
belongs to explicit edges, lines and paths.

```json
{"type":"object-views","id":"assembly","x":80,"y":100,"w":1000,"h":400,
 "columns":2,"entities":[
   {"id":"base","label":"底座","shape":"box","tone":"gray","extent":[0.65,0.12]},
   {"id":"lid","label":"上盖","shape":"parallelogram","tone":"blue","extent":[0.65,0.12]}],
 "views":[
   {"id":"apart","label":"分离","items":[
     {"entity":"base","at":[0.5,0.7]},
     {"entity":"lid","at":[0.5,0.25]}]},
   {"id":"aligned","label":"对齐","items":[
     {"entity":"base","at":[0.5,0.7]},
     {"entity":"lid","at":[0.5,0.52]}]}]}
```

Generated node IDs are `blockId-viewId-entityId`, e.g. `assembly-aligned-lid`.
Each component is URI-encoded, including hyphens as `%2D`, so IDs containing
separators cannot collide; simple alphanumeric IDs need no encoding.
Scene edges can connect these native nodes. No transitions are invented: add
arrows only for transitions in the brief; a comparison need not have any.
Entity shape/tone/label remain shared across views. `patch` on an entity's ID
renames every appearance without touching its geometry. View IDs keep existing
node identities stable when another view is inserted. Use the matching method
in [object composition](object-composition.md); this block does not infer physics,
quantitative data, counts or a transformation from a text prompt.

An entity may instead contain `scientific:{kind,...parameters}` plus `id` and
`extent`. Omit `shape`, tone and other primitive appearance fields. The motif
definition never owns `id,type,x,y,w,h`; the view supplies that stable frame.
All scientific kinds can repeat unchanged. A pose's optional sparse `state`
currently supports `duplex: {marks:{existingSiteId:[strandIds]}}` or
`laminate: {deflection:0..0.4,load:"F"}` only. Omitted sites keep their canonical
marks; `[]` explicitly removes marks. An omitted load inherits the definition;
leave load out of the canonical laminate when only some views are loaded.
Other kinds reject state overrides. Define one canonical object, not a separate
motif per condition. Parts remain independently editable inside each native
module, and ordinary edges can target the stable view anchor above.
Duplex `sites[].name` creates an aligned external site label. By default these
names appear only at the entity's first labelled occurrence. A pose can select
`showSiteNames:true|false` explicitly, without changing occupancy or inner marker
text. Use this instead of placing p/q/r text with guessed coordinates.

`type: "sequence"` (top level) lays out a sequence diagram:
`participants[{id, label, sub, tone}]`, `messages[{from, to, label, kind, step}]`,
`sections[{from, to, label}]` (message index ranges), `top`, `rowGap`.

## Primitives

For a reviewed composition, optional `style` stores local visual tokens over the
named `theme`: `palette`, `fonts`, `canvas`, `node`, `tones`, `zone`, `edge`,
`step`, `note` and `legend`. These values are already sized; no additional type
scale is applied. The override stays in this scene and does not mutate the
shared theme. It works with ordinary `render scene.json` and gallery replay;
omit it when the named theme is sufficient. SVG safety checks still apply.

**zones** — groups and boundaries: `{id, label, sub, x, y, w, h, tone, style}`;
`style`: `outline | dashed | fill | band | lane | bracket | rule`.

**nodes** — `{id, label, tag, sub, x, y, w, h, shape, tone, icon, step, align, labelPos}`

- `label` the name (keep it short), `tag` a small typed line (tech, owner,
  timing), `sub` one descriptive line. `\n` breaks lines.
- `shape`: `box` (default) `pill chip circle station cylinder queue hex diamond
  doc folder frame tray browser person cloud stack chevron trapezoid parallelogram text`.
- `tone`: a name from the theme (see the style atlas). `accent` is the focus.
- `icon`: `user users browser phone server db queue stream cloud lock key gear
  globe bolt spark doc chart cpu shield search cache box git eye card bank mail
  clock gamepad device sensor layers table brain tool map check alert refresh balance`.
  Use one only when it adds meaning.
- `step`: a number or letter badge at the top-left (`stepAt: [dx, dy]` moves it).
- Explicit appearance overrides: `fill`, `stroke`, `textColor`, `radius`, `size`
  and `weight`. `size` controls node label text; `labelSize` is not a node field.
- `labelPos`: `inside` (default) or `right / left / above / below`.

**edges** — `{from, to, kind, label, step, fromSide, toSide, fromAt, toAt, mid, via, both, route, labelAt}`

- `kind`: from the theme (`primary`, `async`, …). The legend reuses it.
- Sides `l r t b` are chosen automatically; set them when the auto choice
  crosses a node. `fromAt / toAt` (0–1) place the port along the side.
  Several edges with the same `toAt: 0.5` merge into a clean trunk.
- `mid`: x (horizontal sides) or y (vertical sides) of the middle segment.
- `via`: explicit waypoints `[[x, y], …]`; `route`: `ortho | curve | straight`.
- `labelAt`: a fraction (0–1) along the path or an `[x, y]` point.
- `layer: "foreground"` draws an explicit connector above object fills (e.g.
  a penetration path in a section); default `background` keeps graph wires behind
  nodes. It remains a node-attached native connector in draw.io. Use this only
  for an intended internal/overlaid relation, not to hide bad ordinary routing.
  A foreground connector's label stays in an editable overlay group to remain
  legible; moving that connector does not automatically reposition its label.
  Ordinary background connectors retain attached labels even in mixed scenes.

**notes** — `{x, y, w, text, num, title, target, style, variant}`; `style`
`margin | sticky | callout | comment`; `target` draws a leader to a node.

**bars** — progress, ranges and time spans: `{x, y, w, h, from, value, max, fill, track, radius, text, textPos: inside|right|after|left, textColor, size}`. Draw axes with `lines` + `texts`.

**texts** — free typography: `{x, y, text, size, font, weight, color, w, anchor, rotate}`.
**lines** — `{points: [[x, y], …], color, width, dash}`. **paths** — `{d, fill, stroke, width}`.
Both accept `layer: "foreground"` for detail leaders, internal wiring or a seal
that must appear over a filled object. Default primitives stay behind nodes.
The editable draw.io preserves this explicit foreground layer too.

Browser checks report `text-edge-collision` when an authored free text's measured
font box meets an `edge` centerline or an explicit `line`. They follow curves,
rotation and individual wrapped lines, and report the text/connector `id` when
provided. Arrowheads and arbitrary `paths` artwork are excluded. This is a
scoped geometry check, not a general artwork-overlap or visual-quality audit.

## Output

### Scientific objects and native modules

`blocks[].type: "scientific"` provides explicit graph, adjacent-layer network,
feature tensor, sequence/alignment, projected layer, circular motion and spherical
wireframe, fixed-end laminate states, paired-strand site markers and native scripted formula objects. See [scientific composition](scientific-design.md) for their
small parameter contracts and matching original composition examples.

Each expanded object has a stable native module group containing its live text,
shapes and graph nodes. Processing relations remain ordinary source/target
edges. Alignment guides, thermal arrows and cycle silhouettes are editable
geometry and do not become causal edges. Internally `nativeModules:[{id}]` and
`nativeModule:id` preserve the grouping; an unknown group reference is rejected.
`graph-view` derives an induced subgraph from a direct scientific graph in the
same scene: `id,source,select[],x,y,w,h`, optional positive `padding,labelSize`
and two `guidePoints`. Source order does not matter. Names, positions, colours
and all internal links come from the original definition. It is not an image
crop or a calibrated enlargement; see [linked details](scientific-details.md).

Use the scientific block rather than manually authoring this internal metadata.

### Exact replay of art-directed vectors

Gallery cases 102–105 use `type: "vector"`, `theme`, `size` and `nativeSvg`.
They preserve approved native text and geometry through the same render/export
command. Static-SVG safety checks and matching width/height/viewBox are required.
The SVG root must also declare a matching `data-theme` (for example,
`data-theme="journal"` when the scene has `theme: "journal"`).
Images, scripts and external resources are rejected. Graph primitives cannot be
mixed into this format. Edit the native artwork for revisions; changing a named
theme does not restyle fixed vector artwork. Use ordinary graph scenes for
automatic theme switching. These four cases export editable text and shapes;
their hand-directed connectors are vector paths, not node-attached graph edges.

短需求表达设计方向；精确复刻上述案例时直接渲染其 `scene.json`。
改内容可以编辑 draw.io 或 `nativeSvg`，不应承诺任意模型凭短提示词逐像素重画。

`diagram.svg` (native text, editable), `diagram@2x.png`, `preview.jpg`
(README-size), `checks.json` (real-glyph overflow, collisions, labels on nodes,
off-canvas text). `passed: true` means geometry is clean, not that the design is good.
`run.json` always records render phase timings. System fonts, preview-first and
cache are the CLI defaults; `--font-mode bundled` and `--no-cache` opt out.
