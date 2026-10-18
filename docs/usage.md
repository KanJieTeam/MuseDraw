# Using MuseDraw

[简体中文](usage.zh-CN.md) · [Back to README](../README.en.md) · [Live gallery](https://kanjieteam.github.io/MuseDraw/)

MuseDraw is a professional drawing Skill for AI agents working on research, office, teaching and engineering diagrams. The main workflow uses the scene engine: the agent interprets a short request, chooses composition and style, creates a scene, renders it and checks the report before delivering PNG and native editable draw.io.

## Install and start

Use Node.js 22+ and an agent that can read and write files and execute commands. Install the Skill once, reuse an existing browser/runtime when possible, or install only the runtime:

```bash
npx skills add KanJieTeam/MuseDraw
npm install --prefix skills/musedraw/output/runtime --no-save --ignore-scripts --no-audit --no-fund --fetch-timeout=15000 --fetch-retries=0 playwright@1.56.0
```

Adjust the path to the actual Skill directory. This minimal setup skips fonts and Chromium downloads. Run `doctor --json` to check for a reusable runtime and Chrome/Edge. For the RAG workflow, `quickstart rag --out output/rag --strict` produces a bounded JPEG preview before the final PNG and native draw.io, using system fonts. Other drawings can use `render ... --font-mode system --preview-first --cache`. New diagrams should use `header: false, footer: false`; headings, figure numbers and attribution are opt-in. The CLI also defaults the header off: title/subtitle metadata is invisible unless `header: true`. See the [fast-path guide](fast-start.zh-CN.md).

Official font families are optional: the full `npm --prefix skills/musedraw install` installs them and attempts a Chromium download. Use `--font-mode bundled` when those fonts are required. System mode needs fonts covering the scene language and may look different across machines.

Then ask your agent:

Describe the content and style. Rendering, automatic checks, and delivery
of PNG plus native editable draw.io are default Skill rules; users do not need
to repeat them, and gallery prompts omit this boilerplate. An explicit request
for another output format takes precedence.

For PNG only, say “PNG only” or use the gallery's **快速 PNG** copy button.
The Skill selects `--no-drawio` internally; execution parameters stay out of the
copied request. This skips native export while retaining PNG and layout checks.
Default rendering still exports both formats. See the Skill's required execution
route: PNG comes directly from the scene engine and needs no draw.io application.

```text
Use MuseDraw's 科研期刊 style for a research roadmap.
The question is how metabolic reprogramming in hepatic stellate cells drives fibrosis.
The three workstreams are a clinical cohort, cell mechanisms and animal validation,
followed by integration of mechanisms and targets.
```

Other subjects include procurement swimlanes, classroom flows, OKRs, project Gantt plans and system architecture. Supply the purpose, content and known relationships; you need not write coordinates, color codes or `scene.json`. Real projects use your supplied facts. Mark generic examples explicitly; illustrative counts are not research findings or real business data.

For a repository-URL request, the agent should reuse an installed Skill or obtain the repository and read the [complete Skill](../skills/musedraw/SKILL.md). A URL does not give a plain chat page execution tools. MuseDraw requires no additional model API key; the host's own access requirements still apply.

## Reuse a template and keep editing

Approved gallery scenes are reusable source files: render them directly or adapt
their content while preserving the composition and visual hierarchy. For a new
reference image, the agent views it and draws with the scene engine; there is no
recognition or transcription pipeline. Review the preview to assess the design.

Use `patch` for exact text changes, preserving the original and unrelated fields.
See the [editing workflow](../skills/musedraw/references/editing-workflow.md).
System fonts, early preview, cache and phase timings are the rendering defaults.

## Choose the diagram and style

The [live gallery](https://kanjieteam.github.io/MuseDraw/) contains 108 current scene-engine cases. Filter by style, open a full-size preview, copy a prompt or download drawio. Switch between Chinese and English: the previewed prompt, copied request and reproduction instructions follow your choice. Each directory retains the original prompt, full scene, SVG and preview; [prompts.json](../gallery/prompts.json) contains the bilingual briefs. Use the cases to learn composition, not to limit new subjects or supply facts about your project. Gallery states distinguish flagship cases, reviewed cases and previews awaiting design review; they do not imply equal human acceptance of every case.

The [style atlas](../skills/musedraw/references/style-atlas.md) explains the fonts, lines, textures and annotations of 20 styles. Ask by Chinese name, English name or ID, such as 科研期刊, 商务墨蓝, 黑板教学 or `blueprint`. The agent chooses based on the purpose when no style is specified.

Structured diagrams can use tree, mindmap, timeline, Gantt, matrix, funnel, cycle, fishbone, swimlane and table blocks, plus sequence diagrams and free primitives. The agent follows the [composition guide](../skills/musedraw/references/composition-patterns.md) and [scene schema](../skills/musedraw/references/scene-schema.md); users need not supply internal parameters.

## Revise and receive the result

```text
Keep the research content and relationships unchanged; switch to 水墨宣纸.
```

```text
Move animal validation after the cell-mechanism work, preserving the other content.
```

The agent edits the existing scene, preserving unrelated content and stable IDs, then rerenders. Primary outputs are `diagram@2x.png` and native editable `diagram.drawio`. Retain `scene.json` and `diagram.svg` as supporting source and vector files; checks are written to `checks.json`. PNG preserves paper textures, blur and glow. The draw.io file contains editable shapes, text and connected edges, without promising identical rendering of every PNG effect.

## Render and replay

These commands are for the agent or developer; `<skill>` is the installed directory:

```sh
node <skill>/scripts/musedraw.mjs validate path/to/scene.json
node <skill>/scripts/musedraw.mjs render path/to/scene.json --out output/new-run
node <skill>/scripts/musedraw.mjs render path/to/scene.json --theme 水墨宣纸 --out output/restyled
node <skill>/scripts/musedraw.mjs themes
```

`validate` checks scene structure and references with Node.js alone, without
installing rendering dependencies or writing output. Errors include the file
and JSON Pointer path. Rendering performs the same preflight before browser
startup. This does not replace browser layout checks; optional visual review follows the Skill policy. See the
[validation reference](../skills/musedraw/references/scene-schema.md#validate-before-rendering).

Output defaults to the scene directory. Use `--out` with a new directory to preserve earlier versions. Rerendering writes files with the same output names, so check the destination first. A full checkout can run `npm run gallery` to rerender the entire gallery.

The same scene, engine, theme, fonts and rendering environment allow repeatable generation. Fonts and antialiasing can affect cross-platform results. Asking another model to interpret a short request and design a new figure is separate: it does not guarantee a pixel-identical case or success from every model.

Without a browser, add `--svg-only` and disclose that PNG, native draw.io and browser layout checks are incomplete. After a normal render, read `checks.json` and fix warnings. When checks pass and requested files exist, deliver with the small preview; no mandatory full-PNG read, CDN upload, OCR or vision-model call. Review images only on explicit request, a reported visible defect, or a concrete issue that cannot be resolved from scene data, starting with `preview.jpg`. Automatic checks do not establish visual inspection, aesthetic quality or factual correctness.

This is not a raw-data statistical plotting tool; use matplotlib or ggplot for scatter plots and similar charts. The old small-component engine remains a [compatibility route](semantic-graph.zh-CN.md); use the scene engine for new work. See the [contribution guide](../CONTRIBUTING.md) before contributing.
