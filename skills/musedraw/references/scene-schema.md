# Scene schema · scene.json 字段说明

A scene is plain JSON. Coordinates are canvas pixels (1× — the PNG is exported
at 2×). Extra fields remain allowed for compatibility. Copy a gallery scene and edit it.
The bundled [JSON Schema](scene.schema.json) describes core fields, primitives
and all ten layout blocks; associate it with your scene in a JSON-aware editor
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

`type: "sequence"` (top level) lays out a sequence diagram:
`participants[{id, label, sub, tone}]`, `messages[{from, to, label, kind, step}]`,
`sections[{from, to, label}]` (message index ranges), `top`, `rowGap`.

## Primitives

**zones** — groups and boundaries: `{id, label, sub, x, y, w, h, tone, style}`;
`style`: `outline | dashed | fill | band | lane | bracket | rule`.

**nodes** — `{id, label, tag, sub, x, y, w, h, shape, tone, icon, step, align, labelPos}`

- `label` the name (keep it short), `tag` a small typed line (tech, owner,
  timing), `sub` one descriptive line. `\n` breaks lines.
- `shape`: `box` (default) `pill chip circle station cylinder queue hex diamond
  doc browser person cloud stack chevron trapezoid parallelogram text`.
- `tone`: a name from the theme (see the style atlas). `accent` is the focus.
- `icon`: `user users browser phone server db queue stream cloud lock key gear
  globe bolt spark doc chart cpu shield search cache box git eye card bank mail
  clock gamepad device sensor layers table brain tool map check alert refresh balance`.
  Use one only when it adds meaning.
- `step`: a number or letter badge at the top-left (`stepAt: [dx, dy]` moves it).
- `labelPos`: `inside` (default) or `right / left / above / below`.

**edges** — `{from, to, kind, label, step, fromSide, toSide, fromAt, toAt, mid, via, both, route, labelAt}`

- `kind`: from the theme (`primary`, `async`, …). The legend reuses it.
- Sides `l r t b` are chosen automatically; set them when the auto choice
  crosses a node. `fromAt / toAt` (0–1) place the port along the side.
  Several edges with the same `toAt: 0.5` merge into a clean trunk.
- `mid`: x (horizontal sides) or y (vertical sides) of the middle segment.
- `via`: explicit waypoints `[[x, y], …]`; `route`: `ortho | curve | straight`.
- `labelAt`: a fraction (0–1) along the path or an `[x, y]` point.

**notes** — `{x, y, w, text, num, title, target, style, variant}`; `style`
`margin | sticky | callout | comment`; `target` draws a leader to a node.

**bars** — progress, ranges and time spans: `{x, y, w, h, from, value, max, fill, track, radius, text, textPos: inside|right|after|left, textColor, size}`. Draw axes with `lines` + `texts`.

**texts** — free typography: `{x, y, text, size, font, weight, color, w, anchor, rotate}`.
**lines** — `{points: [[x, y], …], color, width, dash}`. **paths** — `{d, fill, stroke, width}`.

## Output

`diagram.svg` (native text, editable), `diagram@2x.png`, `preview.jpg`
(README-size), `checks.json` (real-glyph overflow, collisions, labels on nodes,
off-canvas text). `passed: true` means geometry is clean, not that the design is good.
