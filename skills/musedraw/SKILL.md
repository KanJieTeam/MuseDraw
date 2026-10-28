---
name: musedraw
description: Create and revise visual work from a brief or selected example, including posters, illustrations, diagrams, scientific figures and frontend/UI. Choose native scenes, HTML/CSS/JavaScript or available image-generation tools to suit the work; deliver the requested image, runnable page or editable source without forcing every artifact into SVG.
---

# MuseDraw

Choose the production route from the requested work and its editing needs.
The bundled scene renderer is one tool within MuseDraw; it does not define the
scope of the assistant or require every artifact to be a diagram.

When the user requests sustained visual improvement or comparative design
review, use [visual revision](references/design-review.md) with actual renders,
separate factual/functional checks and a preserved best version. Independent
critique depends on the host; do not label self-review independent. This is not
an additional mandatory stage for ordinary scene delivery.

- **Painting, photographic imagery, textured illustration or image editing:**
  read [image work](references/image-work.md) and use an available host image
  generation/editing tool. Deliver the resulting PNG/JPEG or requested image
  format with useful source prompts/assets; do not manufacture an SVG or scene
  solely to satisfy the diagram workflow. Actual image synthesis requires that
  host capability; the scene engine does not generate painterly pixels.
- **Poster, brand visual or mixed composition:** choose native vector/HTML
  typography, image assets or a combination as the subject and editing needs
  require. Use the image route for raster imagery and the scene route for a
  native-vector example. Preserve the selected example's production medium.
- **Diagrams, structured information graphics and editable scientific figures:**
  use the scene routes below when they fit the content. Keep facts and
  relationships intact. SVG is an editable output here, not a global format rule.

For measured data, report charts and statistical figures, read
[data figures](references/data-figures.md). Use an available plotting tool;
the supplied data-plot helper handles line, scatter, bar, explicit intervals,
paired changes, raw observation distributions and measured heatmaps. This route
does not require scene geometry. For mechanisms and physical
objects use the scientific composition route below.

For everyday office processes, task ownership and project plans, read
[office diagrams](references/office-diagrams.md). Choose the appropriate flow,
responsibility matrix or time-based composition from the actual work; do not
turn every office brief into the same card grid or infer missing assignments.

For an interface prototype or work UI, read [frontend decisions](references/frontend-design.md).
For record review, coordination or operations, also read
[working applications](references/frontend-work-apps.md). Implement runnable
HTML/CSS/JavaScript or use the project's existing frontend stack, then deliver
source and browser previews. This route does not require a scene or scene-engine
render. The diagram instructions below apply to drawings and scene artifacts.

For a native-vector poster, information graphic, teaching explanation or scientific
multi-panel artwork, use the [visual case library](references/case-library.md) to
find a relevant example and its design method. The small registry covers 180
included cases; read only the selected case. Approved native-vector artwork uses
the existing replay route and keeps its composition, including a poster headline
or necessary figure panels. These examples are editable sources, not a promise of
automatic parameterised layouts or a reason to impose one style on every task.

Translate the user's facts into visible objects and relationships. MuseDraw
owns repeatable layout, reading size, role styling, ports and export. Use the
semantic `compose` route below when it fits; it avoids guessing a canvas,
coordinates, font sizes and colours. Free composition remains available for
relationships these methods do not cover.

For object changes, comparisons, feedback, shared routes, detail views and layers,
use the matching [object-composition method](references/object-composition.md).
Make the relationship visible in the drawing; don't replace it with explanatory
cards. The engine's `object-views` block keeps repeated native objects consistent.

## Scene drawings · required execution route

Create a composition or edit `scene.json`, run `scripts/musedraw.mjs`, read `checks.json`,
then deliver with the small `preview.jpg`. For the shared-index RAG workflow,
run `quickstart rag`; use `compose` for states/flows and `render scene.json` for other diagrams. The commands
below are the implementation instructions; keep them out of user-facing prompts.
The default is PNG with scene JSON and SVG retained for continued editing.
Use the bundled renderer for PNG; do not install another exporter.

Choose one route after reading this file:

When the user explicitly says this installed Skill was updated, reread this file
and the selected route's reference once before revising an older composition.
Conversation memory may describe older primitives. Do not inspect renderer source
or reinstall dependencies to discover the update.

If the installed Skill path is already known, use it directly. Its `scripts`,
`references` and `themes` paths are fixed; the lightweight install intentionally
has no `gallery` directory, and a new output directory need not exist yet. Read
the one relevant reference by its exact path, write the scene, and render. Do
not inventory directories, search for a gallery or repair PATH before attempting
the actual task. Diagnose once only if a needed read or render command fails.

- **Gallery case / approved template:** reuse its `scene.json` directly. Render
  unchanged scenes immediately; adapt requested content and affected modules.
  Preserve the approved composition, hierarchy, spacing and visual details.
- **Reference diagram or native-vector artwork:** view the supplied image and build a scene using the
  appropriate composition pattern and primitives. For scientific mechanisms,
  method overviews, device sections and Nature-style reference figures, use
  [scientific composition](references/scientific-design.md) before selecting
  primitives. Preserve the reference's material/category colours and object
  shapes; an ordinary flow/states layout is not a substitute for its artwork.
  Do not introduce OCR tools,
  pixel tracing, transcription contracts, voting or forced placeholder labels.
  Use the image's visual structure; users can judge the result from its preview.
  Before the first render, inspect the whole reference and at most two uncertain
  detail crops. Then write one scene and render it. Do not run image-coordinate
  measurement scripts, enumerate pixel colours or repeatedly crop every panel.
  Preserve the visible relationships, identities and proportions first; resolve
  a remaining fine detail locally after a first artifact exists. A request to
  reproduce a reference does not implicitly require pixel-identical tracing.
- **Bundled RAG starter:** run
  `node <skill>/scripts/musedraw.mjs quickstart rag --lang zh --out output/rag --strict`
  immediately. Use `--lang en` for English.
  Do not first read the scene schema, style atlas, theme JSON or exporter source.
  The later custom-composition instructions do not apply to this route. Diagnose
  a runtime failure once, fix that dependency, and retry the same command.
- **Existing scene or exact replay:** render that scene directly, then check
  its report. Read source/reference files only to resolve a concrete problem.
- **New scientific schematic:** read [scientific composition](references/scientific-design.md)
  and select its visual family in the [scientific atlas](references/scientific-atlas.md).
  Use ordinary scene objects/blocks and connected edges when relationships must
  stay attached during editing. The vector replay route preserves artwork;
  its free connector paths do not become node-attached graph edges.
  Read an example's method/scene only when its relationship actually fits.
  For paired sites and condition comparisons use the linked comparison method;
  for overview/detail correspondence use the [detail method](references/scientific-details.md).
  For long external part labels on a native vector scene with empty side lanes,
  use [measured callout layout](references/callout-layout.md). Keep short labels
  inside their objects when they fit; do not force grids or ordinary workflows
  into external callouts. The tool requires true anchors supplied by the caller.
  Unrelated architecture examples are not required reading. Use native object motifs and the
  composition the mechanism requires; preserve the supplied relationships.
  The worked examples teach composition; they are not a journal-quality guarantee.
- **New flow or object states:** for ordinary directed workflows and simple matched
  object states, read [semantic composition](references/semantic-composition.md),
  translate the actual objects/steps/conditions into `composition.json`, and run
  `node <skill>/scripts/musedraw.mjs compose composition.json --out output/diagram --strict`.
  This route owns page geometry, font sizes and routing. Do not read the raw
  schema, theme files, renderer or gallery beforehand. Do not choose a style
  when the content fits its quiet journal default. Use a requested named style
  via `theme`; for a reference or richer scientific composition use the routes
  above rather than forcing the semantic layout. Preserve every fact and exception.
  Long role-based flows can use automatic responsibility columns. Keep the
  generated flow contract during visual edits; change facts in the composition,
  not by moving actions into another person's lane or adding a shorter route.
- **Dated targets with undated work and shared support:** read
  [plan composition](references/plan-composition.md), supply the exact periods,
  metrics, work and support, then run `compose`. It provides readable typography
  and separate regions without turning targets into completion percentages or
  assigning undated activities to years. Use a custom scene for other relations.
- **New custom composition:** use sections 1–3 and only the relevant reference
  fields before rendering. Read the [anti-AI design guidance](references/anti-ai-checklist.md)
  once before composing a new design; apply it while choosing structure, text
  density and colour roles. It is not an extra image-review stage. Do not read
  every theme or the exporter implementation. The drawing field reference is
  `references/scene-schema.md`; the large `scene.schema.json` is for validators
  and editor completion. Layout/renderer source is not a drawing prerequisite;
  inspect it only when a reported failure cannot be resolved from this reference.

## Default delivery · scene drawings

These rules apply to scene-based drawings, replays and revisions. Image work,
statistical plots and frontend pages follow their selected production route. Users
only need to describe the content and style; do not ask them to repeat these
rules or append them to copied gallery prompts.

1. Render with the scene engine. Deliver `diagram@2x.png` and preserve
   `scene.json` for subsequent edits. Keep `diagram.svg` as a vector artifact.
2. **Automatic checks are the default review.** Read `checks.json`; fix reported
   warnings, missing fonts or export failures. When checks pass and the requested
   files exist, deliver immediately with the small preview. Do not open the full
   PNG, upload it to a CDN, run OCR or call a vision service merely to satisfy a
   routine review step. Visual review is optional, under the policy below.
3. Deliver links to the requested primary files. Keep scene JSON, SVG and checks
   as supporting files. Describe a passing report as “automatic checks passed”,
   not “visually inspected”, “human reviewed” or proof of factual accuracy.
   If rendering or requested exports fail, report the incomplete step.
   Honor an explicit request for a different output format, such as SVG only
   (`--svg-only`). The same automatic-first review
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

The pipeline is `scene.json` → SVG → PNG. Continued edits change the source scene
and rerender it with the bundled engine.

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

Rendering runs browser font/layout checks and produces PNG, SVG and scene JSON.
The cache verifies the bytes of every rendered artifact before reuse.

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
`diagram@2x.png`, retaining `scene.json` and `diagram.svg` for continued use.
The preview is at most 1200×1000. Every `run.json` records phase timings. Quickstart verifies
cached artifacts on repeat runs; use `--no-cache` for a fresh render.

For other diagrams, read only the relevant scene fields and closest case.
Inspect renderer source or dependency manifests only to diagnose a specific
error. Avoid a chain of repeated README/schema/theme/source reads before the
first render. Use the workflow below for custom composition and automatic checks.

## 1 · Read the request like an editor

Use the anti-AI guidance to make the diagram serve its relationships. Muted
colours, fewer words, a dark highlight or perfectly aligned cards alone do not
make a design professional. Peers can share a visual treatment; different roles
need a visible distinction. Preserve user facts while reducing decorative prose.

1. **Who reads it, where?** Grant reviewer, journal, a team meeting, a README,
   a printed handout. This picks the style (see table) and the density.
2. **What is the one sentence the figure must prove?** Use this to guide the
   composition. Show it as a subtitle only when the user wants in-image context;
   ordinary document figures stay free of page headings.
3. **Which diagram type carries that sentence?** See
   [composition patterns](references/composition-patterns.md). A sequence of
   steps is a flow, not a grid of boxes; ownership is a nested map, not a flow.
4. **Make comparisons visible.** Use aligned values for a short numeric summary;
   use a shared scale within a unit when magnitude or duration comparison is
   the question. Targets are not completion rates. Do not force every number
   into a bar or mix unrelated units into one scale.
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

- `theme`, `size` (start at 1200 px wide; height follows content), `header: false`, `footer: false`.
  Titles and subtitles are optional; `header: true` enables a requested heading.
  At the final 1200px preview, main labels should be 18–20px and relationship
  labels at least 14px. When using a wider canvas, scale type with it. Grow,
  wrap or reflow content before shrinking text. Print figures use their actual
  intended final size rather than treating screen pixels as print points.
- **Blocks** for structured diagrams — `tree`, `mindmap`, `timeline`, `gantt`,
  `matrix`, `funnel`, `cycle`, `fishbone`, `swimlane`, `table`, `grid` — give content
  and a bounding box; the block computes positions.
- `type: "scientific"` provides native graph, network, tensor, sequence,
  projected layers, fixed-end laminate states, paired-strand site markers, circular motion, spherical wireframes and scripted formula
  objects; see scientific composition.
- `type: "sequence"` for time-ordered messages between participants.
- **Primitives** for everything else: `zones`, `nodes` (`label`, `tag`, `sub`,
  `shape`, `tone`, `icon`, `step`), `edges` (`kind`, `label`, `step`, sides,
  `mid`, `via`), `notes`, `texts`, `legend`. Coordinates are canvas pixels.
  Leave ~60 px under the header; the engine closes any larger gap itself.
- An already available approved gallery scene can be adapted. A new custom
  composition does not require searching/downloading a gallery case: use the
  relevant method and native primitives directly.

## 4 · Render and check

```sh
node <skill>/scripts/musedraw.mjs validate path/to/scene.json      # optional preflight; Node.js only, no output files
node <skill>/scripts/musedraw.mjs render path/to/scene.json        # → diagram@2x.png; scene JSON, SVG, preview and checks
node <skill>/scripts/musedraw.mjs render scene.json --theme journal --out restyled/   # same content, another style
node <skill>/scripts/musedraw.mjs themes
```

For a fast custom drawing, add `--font-mode system --preview-first --cache` to
`render`. Prepare the runtime as above. The full `npm install` inside the Skill
is optional for the official fonts; it can download a large font library and
Chromium. No browser available → add `--svg-only` and say PNG and
browser checks are incomplete.

Rendering validates scene structure and references before starting the browser
or writing that scene's output. Fix errors at the reported JSON Pointer paths;
preflight success still requires rendering and reading the browser check report.

Read `checks.json`. Fix every `text-overflow`,
`text-collision`, `edge-label-on-node`, `node-overlap`, `outside-canvas`.
Once checks pass, deliver without a mandatory image-reading or vision-model call.
Checks cover measured geometry, not taste or factual correctness. Compare scene
content and relationships with the user's request; do not use image OCR for this.
Apply the anti-AI guidance during composition. A separate visual review is only
needed under the optional-review policy above or gallery/style publishing rules.
Do not add image uploads, OCR or multiple inspection rounds for this guidance. Rerender only after
a change, failed check or concrete unresolved issue, not to prove reproducibility.
For a slow task, compare `run.json` phase times with total task time and report
them separately.
The CLI timer excludes agent reasoning, reference reads, installation and host
tool latency.
Some Windows host shells return empty stdout or write redirected logs as UTF-16.
Check `checks.json` and the requested files once before retrying a render. Valid
outputs mean the render completed; missing console text alone is not a failure.
Deliver the PNG by default. Preserve scene JSON, SVG and checks for continued
editing and review. Paper textures, blur and glow are PNG visual effects; SVG
and scene JSON serve different editing needs. Do not promise arbitrary native
editing in a third-party application merely because a vector file exists.

## 5 · Edits in conversation

For text-only edits, use `patch` as documented in the
[editing workflow](references/editing-workflow.md). It preserves unrelated
content and reports the exact changes. For structural edits, edit the existing
`scene.json`; never regenerate unrelated content. Style
changes swap `theme` only. Keep ids stable so diffs stay readable.

One writer owns a scene at a time. Combine related edits into one write or apply
them sequentially; do not launch parallel replacements against the same file.
Render only after those edits finish, and verify the saved scene when the result
unexpectedly stays unchanged. Independent reference reads may run in parallel.

## Legacy routes

`scripts/render_graph.mjs` (automatic layout for small component graphs, two
styles) and `scripts/render_style.py` remain for existing users; see
[graph workflow](references/graph-workflow.md). New work uses the scene engine.
