---
name: musedraw
description: Draw publication-quality diagrams for office work, research and engineering from a few sentences — research roadmaps, PRISMA/CONSORT flows, model architectures, OKR trees, swimlanes, Gantt plans, fishbone/PDCA, customer journeys, system architecture. 20 named visual styles, PNG and native editable draw.io, reproducible from a scene.json. Not for statistical charts of raw data.
---

# MuseDraw

You are the art director. The user gives a few sentences; you decide what the
reader must understand, choose a diagram type and a style, write a
`scene.json`, render it with the bundled engine, check the report and deliver.
The engine owns typography, colour, line, texture, ports and arrowheads; you own
content, composition and emphasis.

## Start here · required execution route

Create or edit `scene.json`, run `scripts/musedraw.mjs`, read `checks.json`,
then deliver with the small `preview.jpg`. For the shared-index RAG workflow,
run `quickstart rag`; for other diagrams, run `render scene.json`. The commands
below are the implementation instructions; keep them out of user-facing prompts.
When the user says “PNG only” / “只需 PNG”, select `--no-drawio` internally.
Both formats come from this engine. Do not handwrite draw.io XML, research its
format, install another drawio exporter or use app.diagrams.net to render PNG.

Choose one route after reading this file:

- **Gallery case / approved template:** reuse its `scene.json` directly. Render
  unchanged scenes immediately; adapt requested content and affected modules.
  Preserve the approved composition, hierarchy, spacing and visual details.
- **Reference image:** view the supplied image and build a scene using the
  appropriate composition pattern and primitives. Do not introduce OCR tools,
  pixel tracing, transcription contracts, voting or forced placeholder labels.
  Use the image's visual structure; users can judge the result from its preview.
- **Bundled RAG starter:** run
  `node <skill>/scripts/musedraw.mjs quickstart rag --lang zh --out output/rag --strict`
  immediately. Use `--lang en` for English; append `--no-drawio` for PNG only.
  Do not first read the scene schema, style atlas, theme JSON or exporter source.
  The later custom-composition instructions do not apply to this route. Diagnose
  a runtime failure once, fix that dependency, and retry the same command.
- **Existing scene or exact replay:** render that scene directly, then check
  its report. Read source/reference files only to resolve a concrete problem.
- **New custom composition:** use sections 1–3 and only the relevant reference
  fields before rendering. Do not read every theme or the exporter implementation.

## Default delivery · every drawing, every style

These rules apply automatically to new drawings, replays and revisions. Users
only need to describe the content and style; do not ask them to repeat these
rules or append them to copied gallery prompts.

1. Render with the scene engine. Default deliverables are `diagram@2x.png` and
   native `diagram.drawio`, with individually editable text, vector shapes and
   connected edges. Never flatten the diagram into an embedded SVG or screenshot.
   The exporter rejects unsupported primitives, invalid object IDs and broken
   native references before writing the draw.io file.
2. **Automatic checks are the default review.** Read `checks.json`; fix reported
   warnings, missing fonts or export failures. When checks pass and the requested
   files exist, deliver immediately with the small preview. Do not open the full
   PNG, upload it to a CDN, run OCR or call a vision service merely to satisfy a
   routine review step. Visual review is optional, under the policy below.
3. Deliver links to the requested primary files. Keep scene JSON, SVG and checks
   as supporting files. Describe a passing report as “automatic checks passed”,
   not “visually inspected”, “human reviewed” or proof of factual accuracy.
   If rendering or requested exports fail, report the incomplete step.
   Honor an explicit request for a different output format, such as PNG only
   (`--no-drawio`) or SVG only (`--svg-only`). The same automatic-first review
   policy applies to PNG-only requests.

Keep the delivery message brief: preview, requested file links and check status.
Mention an assumption only when it materially affects interpretation. Do not
recount version discovery, explain the entire pipeline again or add a long
quality-verification report unless asked.

### Optional visual review

Use visual review only when the user explicitly requests it, reports a visible
defect, or a concrete issue in the checks cannot be resolved from scene data.
A custom or dense diagram alone does not make review mandatory. Start with
`preview.jpg`; inspect a high-resolution detail only for a specific uncertainty.
If the host cannot display images, an external vision service is optional, never
an automatic fallback. Do not let unavailable image tools block ordinary output.
Report what was actually reviewed; an unfinished requested visual review does
not mean already generated files must be withheld. Gallery/style contributions
still follow the repository's publishing review requirements.

The pipeline is `scene.json` → SVG → PNG, with native draw.io as a parallel
export from the same browser page. No draw.io application is required.

## Fast path · get the first image on screen

If the engine files are not installed, use the
[lightweight Skill ZIP](https://kanjieteam.github.io/MuseDraw/downloads/musedraw-skill.zip)
and its [build/SHA-256 manifest](https://kanjieteam.github.io/MuseDraw/downloads/musedraw-skill.json).
Extract into a dedicated Skill directory and check the archive hash. It includes
all 20 themes, the engine, references and starters; it excludes the gallery, Git
history, fonts and runtime. Prepare the minimal runtime only if missing.
Do not repeatedly clone the full repository for a drawing. After one bounded
Git failure, stop that attempt and use the lightweight download; do not leave
parallel clone retries running, delete unrelated directories or kill all Git
processes. If both download routes fail, report that stage instead of retrying
indefinitely. Read this downloaded copy's complete Skill before executing it.

Read this Skill once. Use an already installed current copy; do not clone or
reinstall for every drawing. If the user requests the latest version, check
once against upstream `main` and reuse that checkout during the session. A clone
made today is not proof of freshness. If an installed Skill has only two styles
or lacks `quickstart`, update that copy; do not mix its legacy instructions with
the current scene workflow. If the network prevents verification, state that
the local version is unverified instead of calling it the latest.

For the end-to-end RAG brief (documents and questions sharing a vector index),
start with the bundled Chinese/English starter. It ships inside the Skill, so
you do not need to browse the gallery, read theme source or rewrite coordinates:

```sh
node <skill>/scripts/musedraw.mjs quickstart rag --lang zh --out output/rag --strict
```

For a PNG-only request, append `--no-drawio`. For other scenes use
`render scene.json --no-drawio`.
This skips native object collection and serialization; it does not remove the
browser or font/layout checks. Default rendering still produces both files.
Keep any existing draw.io file untouched in PNG-only mode and do not present it
as an updated deliverable. Switching back to the default mode exports it again.

The starter is a generic RAG workflow. For different facts, names, numbers or
relationships, edit its `scene.json` before delivering; it is not an interpreter
for arbitrary requests. An existing scene is preserved on repeat runs.

New drawings default to diagram content only: `header: false`, `footer: false`.
The render CLI applies these defaults even if the scene omits both fields;
`title`, `subtitle`, `kicker` and `figure` metadata alone do not enable a header.
Set `header: true` only when the user explicitly requests visible headings,
including an exact replay that is meant to retain a gallery image's headings.
Do not add a title, subtitle, kicker, figure number or MuseDraw signature unless
the user asks for these. Keep useful node labels, section labels and legends.
When adapting a gallery example, remove its figure tag, attribution, example
measurements, vendor choices and captions unless they belong to the new brief.

Render commands default to system fonts, early preview and cache, and reuse an
installed Chromium or Chrome/Edge. Bundled fonts are an explicit opt-in.
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

Show or link the bounded `preview.jpg` as soon as the command reports it; reading
the image with an analysis tool is not required. Check `checks.json`, then deliver
`diagram@2x.png` and `diagram.drawio` unless another format was requested.
The preview is at most 1200×1000. Every `run.json` records phase timings. Quickstart verifies
cached artifacts on repeat runs; use `--no-cache` for a fresh render.

For other diagrams, read only the relevant scene fields and closest case.
Inspect renderer source or dependency manifests only to diagnose a specific
error. Avoid a chain of repeated README/schema/theme/source reads before the
first render. Use the workflow below for custom composition and automatic checks.

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
   names, plausible counts that reconcile) — never “服务A / 模块甲 / 业务系统”.
   Add numbers and configurations only when the brief needs them; identify an
   illustrative value next to that value or briefly in the delivery note, not
   with an unsolicited subtitle or a generic warning paragraph inside the image.

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

For a new custom composition, read the relevant fields in the
[scene schema](references/scene-schema.md). Bundled starters and unchanged-scene
replays do not need this reference. In short:

- `theme`, `size` (≈1600–1760 × 900–1100), `header: false`, `footer: false`.
  Titles and subtitles are optional; `header: true` enables a requested heading.
- **Blocks** for structured diagrams — `tree`, `mindmap`, `timeline`, `gantt`,
  `matrix`, `funnel`, `cycle`, `fishbone`, `swimlane`, `table`, `grid` — give content
  and a bounding box; the block computes positions.
- `type: "sequence"` for time-ordered messages between participants.
- **Primitives** for everything else: `zones`, `nodes` (`label`, `tag`, `sub`,
  `shape`, `tone`, `icon`, `step`), `edges` (`kind`, `label`, `step`, sides,
  `mid`, `via`), `notes`, `texts`, `legend`. Coordinates are canvas pixels.
  Leave ~60 px under the header; the engine closes any larger gap itself.
- Copy the closest file in `gallery/` (in the repo, or fetch it from
  github.com/KanJieTeam/MuseDraw/tree/main/gallery) and change content — every gallery
  case is a working scene for an agent to imitate.

## 4 · Render and check

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
preflight success still requires rendering and reading the browser check report.

Read `checks.json`. Fix every `text-overflow`,
`text-collision`, `edge-label-on-node`, `node-overlap`, `outside-canvas`.
Once checks pass, deliver without a mandatory image-reading or vision-model call.
Checks cover measured geometry, not taste or factual correctness. Compare scene
content and relationships with the user's request; do not use image OCR for this.
Use the [anti-AI checklist](references/anti-ai-checklist.md) only for requested
design review or publishing a new gallery/style contribution. Rerender only after
a change, failed check or concrete unresolved issue, not to prove reproducibility.
Use `checks.drawio.native` and connected-edge checks as the export evidence;
do not research or audit the exporter source on each drawing. For a slow task,
compare `run.json` phase times with total task time and report them separately.
The CLI timer excludes agent reasoning, reference reads, installation and host
tool latency; do not attribute those minutes to draw.io serialization.
Deliver the PNG and native editable draw.io by default. Keep scene JSON, SVG and checks as supporting
files. Paper textures, blur and glow are PNG visual effects; draw.io preserves
editable shapes, text and connected edges, without promising identical rendering
of every effect. Never substitute an embedded image for editable draw.io objects.

## 5 · Edits in conversation

For text-only edits, use `patch` as documented in the
[editing workflow](references/editing-workflow.md). It preserves unrelated
content and reports the exact changes. For structural edits, edit the existing
`scene.json`; never regenerate unrelated content. Style
changes swap `theme` only. Keep ids stable so diffs stay readable.

## Legacy routes

`scripts/render_graph.mjs` (automatic layout for small component graphs, two
styles) and `scripts/render_style.py` remain for existing users; see
[graph workflow](references/graph-workflow.md). New work uses the scene engine.
