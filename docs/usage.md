# Using MuseDraw

[简体中文](usage.zh-CN.md) · [Back to README](../README.en.md) · [Styles and examples](https://kanjieteam.github.io/MuseDraw/)

MuseDraw is a professional drawing Skill for an existing AI agent. The agent interprets your request and organizes components, ownership and relationships; the installed drawing code produces native shapes, text, connectors and images. The current public workflow offers two component-diagram styles for new business subjects.

## Install, then start with a few sentences

With Node.js 22.20+, run the installation command and choose your agent or client:

```bash
npx skills add KanJieTeam/MuseDraw
```

Ask an agent that can read and write files and execute tools:

```text
Use MuseDraw to draw a hospital appointment component diagram in 手绘线稿 style.
The patient app sends requests to the appointment service. It queries the scheduling
service and writes appointments to the appointment store.
Use it in a product proposal; return PNG and editable SVG.
```

Replace the subject and relationships with your own. You do not need a case number, coordinates, color codes or drawing code. Supply available facts for a real system; clarify only missing facts that materially affect the diagram. For an imagined example, ask for a “generic reference” so the proposed content is identified as such.

Installation supplies instructions, references and tools; execution depends on the host. Sending a repository URL to a plain chat page does not install it or provide an execution environment. MuseDraw requires no additional model API key, MCP server or CAD engine; the host's own access requirements still apply.

## Choose a style

| Style | Visual treatment | What to say |
| --- | --- | --- |
| 手绘线稿 · Hand-drawn linework | White paper, ink/green outlines, role shapes and hatched storage | “Use 手绘线稿.” |
| 终端色域 · Terminal fields | Light canvas, clean geometry, warm/cool fields for supplied ownership | “Use 终端色域.” |

If no style is specified, the agent selects one of these two based on the content and purpose. 终端色域 uses a light canvas; its name does not request a dark terminal theme.

Both styles share the same drawing mechanics and work with different subjects. Composition can follow graph relationships from left to right (`flow`) or arrange supplied flat ownership groups into regions (`planes`). You need not choose these internal settings. The agent uses the supplied facts and does not invent control/data planes or relationships from a style name.

The [public examples](https://kanjieteam.github.io/MuseDraw/) include short requests, PNG, SVG and semantic documents. Records archives and device platforms are example content, not the only topics these styles can draw.

## Revise in the same conversation

For example:

```text
Rename the appointment service to appointment management service.
Keep the other components and relationships unchanged.
```

```text
Add a notification service. The appointment management service sends confirmations to it.
```

```text
Keep components and relationships unchanged; switch to 终端色域.
```

The agent edits the existing semantic document and generates a fresh output directory. Small content changes use rename, add and remove operations for nodes and relationships, preserving unaffected object identities. Reflow may move shapes without changing facts. New relationships must come from your request.

## Outputs and replay

Outputs include a full PNG, a 1200px preview, editable native SVG, `document.json`, separate content and presentation data, and check results. SVG text and shapes remain editable; the semantic document preserves components, groups, relationships and the style choice.

To redraw the same diagram, give the downloaded `document.json` to the agent:

```text
Use MuseDraw to rerender this semantic document, preserving content and presentation.
```

The same normalized document, code version, fonts and runtime can reproduce the same native geometry. Two verified documents produced byte-identical SVG on replay; PNG antialiasing can still vary slightly. Asking another model to interpret a short request and create a new drawing is a separate task. It does not promise an identical result or 100% success from every model.

[Implementation, verification scope and limits](semantic-graph.zh-CN.md) · [Actual outputs and real-model verification](verification/graph-workflow-20261014/README.md)

## Host and runtime requirements

The agent should read [skills/musedraw/SKILL.md](../skills/musedraw/SKILL.md) in full and retain the complete `skills/musedraw/` directory. The root [SKILL.md](../SKILL.md) is a navigation entry, not a second installable Skill. Component diagrams use the [semantic graph workflow](../skills/musedraw/references/graph-workflow.md); users need not write the tool commands below.

PNG and rendered checks require existing Node.js 22+, Playwright, a Chromium-compatible browser (Chrome/Edge can be reused), and fonts covering the figure's language. Missing dependencies are not silently installed. If the runtime is unavailable, report the missing files and checks.

After organizing semantic JSON, the agent runs the installed command. `<skill>` means the installed Skill directory, and the output directory must be new:

```sh
node <skill>/scripts/render_graph.mjs brief.json new-output --playwright <existing-module> --browser <existing-browser>
```

To replay a saved document:

```sh
node <skill>/scripts/render_graph.mjs current-output/document.json next-output --playwright <existing-module> --browser <existing-browser>
```

Read the check results and actually inspect the full figure and dense details, including labels, group boundaries, arrow direction, connectors and crossings. A successful process exit does not establish architecture correctness or aesthetic acceptance.

The current route supports at most 80 nodes, 12 flat ownership groups and 160 explicit relationships. Nested groups, self-relations, repeated endpoint pairs and overly dense layouts can be rejected. Preserve the input and errors rather than removing facts to obtain a pass. Research workflows and statistical plots are not released workflows.

Before contributing, read [CONTRIBUTING.md](../CONTRIBUTING.md) and run `python scripts/check.py`. Changes affecting figures also require actual rendering and visual inspection.
