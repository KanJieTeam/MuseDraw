---
name: musedraw
description: Draw and edit software component and integration diagrams from short natural-language briefs with the installed semantic graph renderer. Offers hand-drawn linework, light control/data fields, native SVG/PNG, stable identities and document replay. Requires a file/tool-capable agent; not statistical plots or a universal topology engine.
---

# MuseDraw

The user describes the system; you prepare semantic content; the installed code
draws and checks it. Use the same renderer for examples and new topics.

## Start with ordinary words

A user can say “画一个采购系统架构图，手绘线稿，员工提采购，经过审批后
生成订单，并对接财务”. Do not ask for coordinates, hex values, IDs or an example
number. For an actual system, use supplied facts and ask only about missing facts
that materially change the result. For an explicitly generic reference, propose
appropriate components without claiming they describe a deployed system.

The two published styles are:

| User choice | Visual treatment | Useful when |
| --- | --- | --- |
| 手绘线稿 | White paper, repeatable ink/green outlines, open client figures, hatched storage | Explaining components and their connections |
| 终端色域 | Light canvas, warm control fields, cool data fields, clean role shapes | Separating supplied ownership domains and external endpoints |

If the user gives no style, use 手绘线稿. They may pick either style for a new
topic, not only the demonstration systems. Do not route to the retired
hundred-case catalog or offer old families as verified workflows.

## Draw with the installed tool

Read [graph-workflow](references/graph-workflow.md) for the semantic schema,
composition choices and edit operations. Prepare `{scene,presentation}` JSON:
nodes with stable IDs and supplied roles, optional flat ownership groups, and
explicit relationships. `flow` follows graph ranks; `planes` lays out actual
domains. Do not invent control/data groups solely to fit the visual style.

```sh
node <skill>/scripts/render_graph.mjs brief.json new-output --playwright <existing-module> --browser <existing-browser>
```

Resolve the host's available Node.js 22+, Playwright, Chromium and language fonts;
do not require user coordinates or a separate model API key. If dependencies are
unavailable, explain the concrete runtime gap. A text-only chatbot cannot execute
this workflow; installing missing dependencies requires appropriate authorization.

Deliver PNG, SVG and `document.json`. Inspect the full figure and dense detail,
and read `checks.json`: technical checks do not establish architectural truth or
professional aesthetic acceptance. Native drawio export is not a verified
graph-route deliverable. Preserve facts if a layout is rejected; do not bypass
this route by hand-drawing SVG and claiming identical reproducibility.

## Continue the conversation

“把审批服务改成采购审批”, “增加供应商档案库”, or “让订单服务对接财务”
are ordinary edits. Read the current document and use the documented operation
list; do not regenerate unrelated facts, IDs or the full scene for a small edit.

```sh
node <skill>/scripts/render_graph.mjs current/document.json next-output --operations edits.json --playwright <existing-module> --browser <existing-browser>
```

Operations are validated atomically. Retain the current document on failure.
Removing a node removes its incident relationships; unrelated nodes and edges
remain. Reflow may move objects without changing their facts. When changing
style only, reuse the scene and change presentation, not labels or relationships.

## Repeat an example, or draw a new subject

For exact native-source replay, retrieve the selected published `document.json`
and use the same renderer version, presentation and fonts without reinterpreting
it. The page assets are at `docs/gallery/examples/sketch/document.json` and
`docs/gallery/examples/planes/document.json` in the repository. Fetch just the
selected document when installed independently; do not load old gallery content.
Generate into a fresh directory, not by copying the stored image.

SVG geometry is repeatable under the tested conditions; PNG anti-aliasing and
fonts may change pixels. Read [reproducibility](references/reproducibility.md)
when evaluating this distinction. For a new topic use its components and
relationships with the chosen treatment, not the example business labels.
Model interpretation of new content is not a 100% or cross-model guarantee.
Supported scope: 80 nodes, 12 flat groups, 160 relations. Nested domains,
self-loops, repeated endpoint pairs and some dense layouts are rejected rather
than silently simplified. Capability matrices, scientific plots and arbitrary
deployment topology are not currently published as verified workflows.
