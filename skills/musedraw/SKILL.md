---
name: musedraw
description: Create or refine software and data-platform architecture diagrams using reference-led composition, restrained visual hierarchy and readable labels. Use for capability maps, component/integration views and deployment views. This first MuseDraw workflow produces original SVG and PNG; it does not yet cover research workflows or statistical plots.
---

# MuseDraw

Make the user's architecture legible: choose an appropriate view, preserve the
facts, and use deliberate hierarchy, spacing and color. This is the first
workflow of MuseDraw, a professional drawing assistant. It currently covers software
architecture, not experimental pipelines, organization charts or statistical
plots.

## Start from the user's words

Accept a few ordinary sentences, for example:

> 用 MuseDraw 画一张客户互动营销应用架构图，突出多渠道接入、活动、内容和消息服务。
> 做成适合产品方案汇报的通用参考，简洁、层次清楚。

Choose the view, composition, canvas, palette, typography and routing yourself.
Do not ask the user for coordinates, hex colors, module IDs, a full node list or
a production specification. Ask only for missing system facts that materially
change a real-system diagram. For an explicitly generic reference, propose
reasonable example content and identify that scope outside the artwork.

The 100 curated gallery cases are **design references, not an allowlist or a
fixed-template engine**. New industries, modules and structures need original
compositions. Do not reject an unfamiliar topic, force it into a gallery case,
or copy the case's business modules into the user's system. Arbitrary supported
architecture topics do not require a matching reference, case number or URL.

When visual inspiration would help, optionally use
[find_reference.py](scripts/find_reference.py) to discover a few cases, then read
only a suitable case's design card. No match means proceed with the view and
visual guides below—not ask the user to choose a template. The helper reads the
bundled [index](references/gallery-index.json) without loading all 100 cases into
the conversation. A case's example content is opt-in and is never evidence of
the user's architecture. Exact reproduction is a separate, explicit request:
use the selected source/production reference, not a thousand-word user prompt.

## Choose the view

- **What belongs where?** Read [capability-map](references/capability-map.md).
  Use layers, parallel domains and cross-cutting support. The bundled Python
  renderer implements one data-platform skeleton, not a general layout engine.
  Use it only when the user's brief fits; otherwise create an original SVG.
- **Which components interact?** Read
  [architecture-views](references/architecture-views.md). Draw actual endpoints,
  interfaces and boundaries. A list of capabilities is not a sequence of calls.
  For a worked visual reference, optionally inspect the bundled
  [inspection example](references/inspection-example.md) and its native SVG/PNG.
- **Where is it deployed?** Read the deployment section of the same guide. Show
  only supplied instances, environments and network boundaries. A database
  capability does not imply a server count or cloud provider.

Deliver the view the user needs, not two alternatives by default. For style-only
changes, read [visual-decisions](references/visual-decisions.md).

## Make the diagram

1. Extract the components or capabilities, groups, known relationships and scope
   from the brief. If a repository is supplied, inspect the relevant actual
   source/configuration before making architecture claims; a README or folder
   name alone is not evidence of runtime interactions. State what was inspected.
   A short brief is an input to design, not a request to reproduce every detail
   of a gallery screenshot. Preserve supplied constraints; design the rest.
2. When the user asks for a generic example without system facts, proceed with a
   clearly marked **reference architecture**. For their actual system, ask only
   about missing facts that materially change the diagram. Do not silently add
   protocols, vendors, performance claims or deployment instances.
3. Choose a composition by reading task, then one visual family. The default is
   a compact blue-and-white figure with white subcomponents, quiet group fields
   and limited emphasis when no other design direction is given. Select other
   restrained families when the content or user direction calls for them; do
   not make every new diagram look like the same gallery case. A user's explicit
   reference takes precedence. Reference
   images inform design decisions; do not reproduce another author's branded
   template or insert their screenshot into the deliverable.
4. Create native SVG text and geometry, with meaningful stable element IDs and
   a title/description. The fixed capability helper can generate repeated
   geometry from a short JSON brief; other views are designed in SVG by the
   agent. Preserve all requested facts even if that requires a larger canvas or
   a separate detail view. Do not load the full study catalog into the prompt.
5. Render a PNG and inspect the full figure, a dense detail and the intended
   display size. Use the browser checker when available and read its JSON:
   `passed: null` means container bounds were not checked. Supply non-empty
   `layout-metadata.bounds` or disclose that gap. The checker does not assess
   architectural truth, connector routing or aesthetic quality; inspect those
   separately. Never describe an unrendered or uninspected result as verified.
6. For palette or typography changes, keep the content and relationships fixed.
   For content edits, preserve unaffected labels and objects. Return the PNG
   preview and source SVG, with a short scope note; do not require an editor or
   an account merely to view the result.

## Helpers

Paths below are relative to a repository checkout. When installed independently,
use the scripts inside this skill folder and the host's existing render tools.

```sh
python skills/musedraw/scripts/render_capability.py brief.json output/diagram.svg --theme blue
python scripts/export_png.py output/diagram.svg output/diagram.png
```

In an independently installed skill, the capability helper and its sample are
still available:

```sh
python <skill>/scripts/render_capability.py <skill>/assets/data-platform.json output/diagram.svg --theme blue
```

Optional design-reference lookup, not a required step or a renderer:

```sh
python <skill>/scripts/find_reference.py "客户互动营销"
python <skill>/scripts/find_reference.py --id 97
```

The first command returns a few design candidates; the second returns that
case's composition and palette hints without its example modules. Only add
`--include-content` for an explicit request to reuse the generic case content.
Custom briefs remain supported when lookup returns no candidates.

This is a Chinese reference brief, not the user's system. Optional JSON fields
`portalTitle` and `foundationTitle` override the helper's two default Chinese
headings. Use short titles that fit their columns; use original SVG when the
requested structure or text cannot fit the fixed skeleton.

The renderer uses Python 3.10+ and the standard library. PNG export uses existing
Node.js 22+, Playwright, a Chromium-compatible browser and fonts covering the
figure's language. The repository wrapper discovers available tools or accepts
explicit paths; it never silently installs anything. The direct preview command
requires the existing Playwright module path explicitly.
In an installed skill without the repository wrapper, run:

```sh
node <skill>/scripts/preview.mjs diagram.svg diagram.png --playwright <playwright/index.mjs> --browser <browser-executable>
```

If a rendering dependency is unavailable, deliver the SVG and state that PNG or
layout verification is incomplete, rather than substituting a fake preview.

## Reference study

[Study provenance](references/study-provenance.md) describes the public references
and their limits. Load it for provenance questions, not every drawing task.
The package contains original rules, examples and helpers, not a downloaded
community-template collection. Reference inspection is not model training.
No fair model comparison has established token savings or superiority over
other figure tools.
