# Executable MuseCore report compositions

Use for conventional monochrome technical-report figures. The runtime owns
type roles, wrapping, track sizes, object drawing and supported connections.
The host maps the brief into facts and explicit relationships; the user does
not need to write JSON. Other styles and production media retain their routes.

## Run

From this Skill directory:

```sh
node scripts/musedraw.mjs core list
node scripts/musedraw.mjs core example flow --out output/flow-input.json
node scripts/musedraw.mjs core render output/flow-input.json --out output/flow
```

Read the matching example, replace its fictional content, and render. Examples
are not operational policies or actual plans. The output includes `input.json`,
`diagram.svg`, `diagram.png`, `checks.json` and `editor.html`. The editor works
offline when opened directly; it supports content changes and SVG download.
Keep the input outside the output directory. `example` refuses an existing
destination; `render` refuses to overwrite its own source, including aliases.

Reuse the existing Playwright/browser with `--playwright MODULE` and
`--browser EXECUTABLE` if needed. No automatic package or browser download.
Rendering measures the actual browser font environment; a different installed
font can change wrapping. Do not promise identical typefaces across computers.

## Choose by relationship

| Family / example | Content and supported relations | Exit when |
| --- | --- | --- |
| `layers` | 2–6 layers; 1–3 groups per layer, 0–8 short items per group. Explicit links between neighbouring layers or neighbouring groups. Group tracks respond to content. | A link skips a layer, has no shared vertical span, or means something other than support/flow between the given objects. |
| `association` | 2–7 sources feed a record hub; original and structured records correspond; a 2–7-node chain names every linking key. Optional independently maintained reference strip. | The records form a branching or many-to-many network, or the hub's correspondence is not bidirectional. |
| `flow` | 1–3 input groups feed 2–5 ordered actions. Optional single decision after a non-final action, a continue path, a repair branch returning to that action. Optional checks attached to named actions. | Multiple decisions, a different return target, shared joins, or responsibilities need a more expressive flow. |
| `assembly` | 1–3 groups of reference requirements feed a content operation; 1–2 inputs, 1–5 operation items, 1–4 outputs. Optional review returns to the same content operation. | The sources do not constrain a shared output, review returns somewhere else, or there are multiple generation operations. |
| `lanes` | 2–4 roles and 2–6 ordered stages; at most one object per cell. Every directed link supplied, adjacent row or column only. Optional bottom feedback between distinct nodes in the last role. | Non-adjacent cross-links or multiple operations in a cell need another composition. |
| `schedule` | 2–12 equal time slots in explicit period groups, up to 16 tasks. Start inclusive/end exclusive slot boundaries. | Unequal durations, elapsed dates or dependencies need the existing proportional planning/data route. |
| `report` | 2–6 sections of supported figures, one or two columns. Original figure sizes are preserved; titles and row tracks are computed together. | The page exceeds 4000px, needs nested pages, or needs a different page hierarchy. Two columns produce a wide 1480px sheet, not a narrow Word figure. |

The schemas contain content fields rather than host-chosen coordinates,
colours or font sizes. Do not edit runtime coordinates to rescue one input.
Overlong labels fail at the allowed size instead of shrinking. Explicit lines
may keep a meaningful phrase together; automatic balanced wrapping does not
understand all Chinese word boundaries.

`flow.steps` order asserts process order. A `decision` explicitly names its
`after` step, its condition, both outcome labels, repair text and recheck label.
Each `checks` entry names the action it checks. Independent checks have no
arrows between them. Supply `checkLinks: [{from: STEP_ID, to: NEXT_STEP_ID}]`
only when the brief states that sequence. Do not infer it from their positions.

`layers` links use the ID of a layer or group; a label belongs to that link.
`association.chain.keys[i]` names the relation from node `i` to node `i+1`.
The original/structured correspondence and source-to-hub meaning are part of
that family's scope, not relationships inferred by the program.

For the full examples and exact field names, select only the matching JSON
under `assets/musecore/`. The `index.json` records status and content provenance.

## Check and edit

Inspect the actual PNG at the intended delivery size. The automatic audit
checks text bounds, text overlaps, orthogonal line/text crossings and translated
section bounds. It does not certify semantics, reading order, arbitrary path
intersections, glyph availability or aesthetic quality. A geometric pass is not
approval of a new design. Never invent data, remove a required relation, or
rewrite an uncertain claim merely to satisfy layout.

The first lanes/schedule development results received positive user feedback;
their six prior renderings are regression baselines. New families and combined
pages are development candidates. This revision has no independent host-transfer
or general aesthetic-improvement result.

The browser module is `scripts/musecore/runtime.mjs`. Its public API is
`MuseCore.render(content)` returning an SVG element, followed by
`MuseCore.audit(svg)` **after mounting it in the document**. The CLI bundles the
modules into its offline editor; no external resources or arbitrary code from
content are loaded. Reuse these functions rather than copying per-page geometry.
