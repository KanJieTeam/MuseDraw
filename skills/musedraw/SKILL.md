---
name: musedraw
description: Draw publication-quality diagrams for office work, research and engineering from a few sentences — research roadmaps, PRISMA/CONSORT flows, model architectures, OKR trees, swimlanes, Gantt plans, fishbone/PDCA, customer journeys, system architecture. 20 named visual styles, PNG and native editable draw.io, reproducible from a scene.json. Not for statistical charts of raw data.
---

# MuseDraw

You are the art director. The user gives a few sentences; you decide what the
reader must understand, choose a diagram type and a style, write a
`scene.json`, render it with the bundled engine, look at the PNG and fix it.
The engine owns typography, colour, line, texture, ports and arrowheads; you own
content, composition and emphasis.

## Default delivery · every drawing, every style

These rules apply automatically to new drawings, replays and revisions. Users
only need to describe the content and style; do not ask them to repeat these
rules or append them to copied gallery prompts.

1. Render with the scene engine. Default deliverables are `diagram@2x.png` and
   native `diagram.drawio`, with individually editable text, vector shapes and
   connected edges. Never flatten the diagram into an embedded SVG or screenshot.
   The exporter rejects unsupported primitives, invalid object IDs and broken
   native references before writing the draw.io file.
2. Open `preview.jpg` or the PNG and read `checks.json`. Inspect content,
   legibility, layout and connectors; fix warnings and visible problems, then
   rerender and inspect again. Automated checks do not prove visual inspection.
3. Deliver links to both primary files after inspection. Keep scene JSON, SVG
   and checks as supporting files. If rendering or inspection cannot finish,
   report the incomplete step; do not claim a finished or visually checked result.
   Honor an explicit request for a different output format, such as SVG only.

## Fast path · get the first image on screen

Read this Skill once. Use an already installed current copy; do not clone or
reinstall for every drawing. If the user requests the latest version, check
once and reuse that checkout during the session.

For the end-to-end RAG brief (documents and questions sharing a vector index),
start with the bundled Chinese/English starter. It ships inside the Skill, so
you do not need to browse the gallery, read theme source or rewrite coordinates:

```sh
node <skill>/scripts/musedraw.mjs quickstart rag --lang zh --out output/rag --strict
```

The starter is a generic RAG workflow. For different facts, names, numbers or
relationships, edit its `scene.json` before delivering; it is not an interpreter
for arbitrary requests. An existing scene is preserved on repeat runs.

New drawings default to diagram content only: `header: false`, `footer: false`.
Do not add a title, subtitle, kicker, figure number or MuseDraw signature unless
the user asks for these. Keep useful node labels, section labels and legends.
When adapting a gallery example, remove its figure tag, attribution, example
measurements, vendor choices and captions unless they belong to the new brief.

The quick path uses system fonts and reuses an installed Chromium or Chrome/Edge.
Do not install the full font library or download Chromium while drawing if
these resources already exist. If the runtime is not known, diagnose once:

```sh
node <skill>/scripts/musedraw.mjs doctor --json
```

Reuse an existing Playwright module with `--playwright <module>` (or
`MUSEDRAW_PLAYWRIGHT`) and a browser with `--browser <executable>`. If Playwright
is missing, install only its pinned runtime with lifecycle scripts disabled:

```sh
npm install --prefix output/runtime --no-save --ignore-scripts --fetch-timeout=15000 --fetch-retries=0 playwright@1.56.0
```

If the npm registry is unreachable, the same minimal install can use
`--registry=https://registry.npmmirror.com`; do not repeat the full Skill install.
Do not silently retry an idle install for minutes; report the failed stage and
switch to a reachable registry or an existing runtime.
Browser preparation is separate if no Chromium-compatible browser is installed.
System fonts can differ from the official typefaces; the machine needs a font
covering the scene's language. Choose `--font-mode bundled` only when exact font
families are required and the appropriate fonts are already installed.

Open the bounded `preview.jpg` as soon as the command reports it; do not try to
preview a large 2x PNG first. Check `checks.json`, then deliver `diagram@2x.png`
and `diagram.drawio`. The preview is at most 1200×1000; text details can be
inspected in the full PNG. `run.json` records phase timings. Quickstart verifies
cached artifacts on repeat runs; use `--no-cache` for a fresh render.

For other diagrams, read only the relevant scene fields and closest case.
Inspect renderer source or dependency manifests only to diagnose a specific
error. Avoid a chain of repeated README/schema/theme/source reads before the
first render. Use the workflow below for custom composition and visual review.

## 1 · Read the request like an editor

1. **Who reads it, where?** Grant reviewer, journal, a team meeting, a README,
   a printed handout. This picks the style (see table) and the density.
2. **What is the one sentence the figure must prove?** Use this to guide the
   composition. Show it as a subtitle only when the user wants in-image context;
   ordinary document figures stay free of page headings.
3. **Which diagram type carries that sentence?** See
   [composition patterns](references/composition-patterns.md). A sequence of
   steps is a flow, not a grid of boxes; ownership is a nested map, not a flow.
4. **Show, don't label.** Numbers that can be compared go on a scale (the
   `bars` primitive, a day axis, proportional widths), not into tiny text.
   Titles name the figure plainly; no slogan titles, no “A · B” strings, no
   micro-label stacked on every box.
5. **Facts.** Use the user's names, numbers and relationships exactly. For a
   generic reference, use *specific, realistic* example content (real tool
   names, plausible counts that reconcile) and mark it as an example in the
   subtitle — never “服务A / 模块甲 / 业务系统”.

## 2 · Pick a style by its job

| Use for | Style id | 中文名 |
| --- | --- | --- |
| Papers, theses, 基金申请书 figures | `journal` | 科研期刊 |
| Essays, design docs, explainer posts | `editorial` | 纸墨编辑 |
| Grayscale print, replication / mechanism figures | `newsprint` | 报刊黑白 |
| 中文汇报、OKR、组织、流程、项目计划 | `enterprise` | 商务墨蓝 |
| 政务、公文、文化、典雅中文报告 | `ink-wash` | 水墨宣纸 |
| Onboarding, wikis, nursing / clinical QI, teaching notes | `pastel` | 柔和笔记 |
| Strategy canvases, journeys, workshops | `terracotta` | 暖陶 |
| Brainstorms, early design, retros | `whiteboard` | 白板手绘 |
| Lessons, classroom explanations | `chalkboard` | 黑板教学 |
| Step-by-step processes people must remember | `swiss` | 瑞士海报 |
| Roles shown by shape, team structures | `bauhaus` | 包豪斯 |
| Roadmaps, lineage, curricula, parallel journeys | `metro` | 地铁线路 |
| SaaS docs, product pages, investor decks | `product` | 产品发布 |
| C4 model, formal architecture review | `c4` | C4 标准 |
| Deployment / infrastructure drawings | `blueprint` | 工程蓝图 |
| Pipelines, CLIs, data/bioinformatics workflows | `terminal` | 终端暗色 |
| Typed data streams, observability, ML ops | `observatory` | 观测夜空 |
| AI products, keynotes | `aurora` | 极光玻璃 |
| Talks, zines, posters with personality | `riso` | 孔版套印 |
| Games, real-time systems, energetic talks | `neon` | 霓虹街机 |

Names in either language, or the id, all work (`--theme 科研期刊`). Read
[style atlas](references/style-atlas.md) only when choosing between two.

## 3 · Write the scene

Read [scene schema](references/scene-schema.md) once per session. In short:

- `theme`, `size` (≈1600–1760 × 900–1100), `header: false`, `footer: false`.
  Titles and subtitles are optional; `header: true` enables a requested heading.
- **Blocks** for structured diagrams — `tree`, `mindmap`, `timeline`, `gantt`,
  `matrix`, `funnel`, `cycle`, `fishbone`, `swimlane`, `table` — give content
  and a bounding box; the block computes positions.
- `type: "sequence"` for time-ordered messages between participants.
- **Primitives** for everything else: `zones`, `nodes` (`label`, `tag`, `sub`,
  `shape`, `tone`, `icon`, `step`), `edges` (`kind`, `label`, `step`, sides,
  `mid`, `via`), `notes`, `texts`, `legend`. Coordinates are canvas pixels.
  Leave ~60 px under the header; the engine closes any larger gap itself.
- Copy the closest file in `gallery/` (in the repo, or fetch it from
  github.com/KanJieTeam/MuseDraw/tree/main/gallery) and change content — every gallery
  case is a working scene for an agent to imitate.

## 4 · Render and look

```sh
node <skill>/scripts/musedraw.mjs validate path/to/scene.json      # optional preflight; Node.js only, no output files
node <skill>/scripts/musedraw.mjs render path/to/scene.json        # → diagram@2x.png, diagram.drawio; supporting SVG, preview and checks
node <skill>/scripts/musedraw.mjs render scene.json --theme journal --out restyled/   # same content, another style
node <skill>/scripts/musedraw.mjs themes
```

For a fast custom drawing, add `--font-mode system --preview-first --cache` to
`render`. Prepare the runtime as above. The full `npm install` inside the Skill
is optional for the official fonts; it can download a large font library and
Chromium. No browser available → add `--svg-only` and say PNG, native draw.io and
browser checks are incomplete.

Rendering validates scene structure and references before starting the browser
or writing that scene's output. Fix errors at the reported JSON Pointer paths;
preflight success still requires rendering and visual inspection.

Then **open the PNG** and read `checks.json`. Fix every `text-overflow`,
`text-collision`, `edge-label-on-node`, `node-overlap`, `outside-canvas`.
Checks catch geometry, not taste: also run the
[anti-AI checklist](references/anti-ai-checklist.md) on what you see.
Two passes are normal. Deliver the PNG and native editable draw.io by default,
plus one line on what was assumed. Keep scene JSON, SVG and checks as supporting
files. Paper textures, blur and glow are PNG visual effects; draw.io preserves
editable shapes, text and connected edges, without promising identical rendering
of every effect. Never substitute an embedded image for editable draw.io objects.

## 5 · Edits in conversation

Edit the existing `scene.json`; never regenerate unrelated content. Style
changes swap `theme` only. Keep ids stable so diffs stay readable.

## Legacy routes

`scripts/render_graph.mjs` (automatic layout for small component graphs, two
styles) and `scripts/render_style.py` remain for existing users; see
[graph workflow](references/graph-workflow.md). New work uses the scene engine.
