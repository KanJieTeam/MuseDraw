# Using MuseDraw

[简体中文](usage.zh-CN.md) · [Back to README](../README.md)

MuseDraw is a Skill for an existing AI agent. The agent understands your request; the Skill supplies architecture design decisions, original cases and a file-generation workflow. The first release covers software architecture only.

## 1. Load the actual Skill

Start with a natural-language request:

```text
Use https://github.com/KanJieTeam/MuseDraw to draw a data-platform architecture diagram.
Use the facts below, return PNG and editable SVG, and identify anything not verified.
[Your architecture brief]
```

Your agent needs permission and the ability to obtain the repository, read files, execute tools and write outputs. It should:

1. Read the root [SKILL.md](../SKILL.md), which is a navigation entry, not a second installable Skill.
2. Read [skills/musedraw/SKILL.md](../skills/musedraw/SKILL.md) in full. The installable Skill name is `musedraw`.
3. Keep the complete `skills/musedraw/` folder available, including references and scripts. Load only the references needed for the selected view, and use helpers where they fit.

A URL alone is not an installation, and a web-page summary is not the full Skill. Do not assume an ordinary chat page, such as a Doubao chat page, has a writable execution environment. An agent without the required tools must explain the limitation rather than claim to have rendered a file.

Alternatively, use the Skills CLI with Node.js 18+:

```bash
npx skills add KanJieTeam/MuseDraw
```

Choose your agent/client interactively. The CLI installs instructions and resources; execution still depends on the host.

## 2. Give a brief, not just a topic

Include the intended reader, the components or capabilities, their groups, known relationships, and the desired output. Include deployment facts only when you have them. A reference image may guide visual choices, but does not supply facts about your system.

Choose the view by the question it should answer:

| View | Reading task | Useful input |
| --- | --- | --- |
| Capability map | What exists, and where does it belong? | Layers, groups, shared support |
| Component/integration | How do the parts work together? | Components, interfaces, known exchanges and boundaries |
| Deployment | Where does it run? | Instances, environments, networks and storage |

The agent should preserve the supplied facts. It should not invent protocols, instance counts, performance figures or technology choices. Without a real system brief, ask for an explicitly labeled generic reference.

For example:

```text
Draw a component architecture for inspection software.
The mobile app and dispatch web page share one API. The API accesses a work-order
service and a field-record service. Both services write structured records to the
business database. The field-record service stores photos in object storage.
Work-order changes go to a message service, which a notification service subscribes
to. An identity service validates API-call identity.
No deployment or network facts are available. Return PNG and SVG.
```

Compare the [original example](../examples/inspection-platform/diagram.png), its [brief](../examples/inspection-platform/brief.md) and [review](../examples/inspection-platform/review.md). It is a logical component view, not a deployment diagram.

## 3. Generate and inspect the files

The default result is PNG plus SVG with editable native text and geometry.

For a brief that actually fits the fixed data-platform capability layout, the included renderer requires Python 3.10+ and uses the standard library:

```bash
python skills/musedraw/scripts/render_capability.py examples/data-platform/brief.json output/data-platform.svg --theme blue
```

Run these commands from the repository root. The renderer is not a general topology or automatic layout engine. Component, integration and deployment diagrams are designed as original SVG; do not force them into the fixed capability grid or add its default modules to the user's system.

The sample has Chinese labels. Set the optional `portalTitle` and `foundationTitle` JSON fields to supply your own short headings; otherwise those two headings keep their Chinese defaults. All other content comes from the brief.

For optional PNG export:

```bash
python scripts/export_png.py output/data-platform.svg output/data-platform.png
```

The wrapper uses existing Node.js 22+, Playwright and a compatible browser. It can find repository `node_modules/playwright`; provide `--playwright path/to/index.mjs` or `--browser path/to/chrome` when needed. Existing Chrome/Edge can be reused. It does not silently install missing dependencies. If the environment cannot render PNG, the agent should use another available renderer or report the missing output and checks.

The exporter preserves earlier PNG and check files: choose an unused output path for each run. If only the Skill folder was installed, the repository-level wrapper may not be present; use the Skill's bundled `preview.mjs` as described in its instructions, or the host's existing render tools.

The agent should inspect the preview check results, then actually look at the full image and enlarged details. Check readable labels, grouping, connector endpoints and crossings. If a container-boundary check was not performed, say so. A successful script exit is not aesthetic acceptance or proof of architecture correctness.

No separate CAD engine is needed. MuseDraw itself requires no additional model API key or MCP server; your host agent's own access requirements still apply.

## 4. Continue revising

For visual-only changes, preserve the system content:

```text
Keep the components and relationships unchanged.
Use less saturated blue, tighter spacing and clearer layer headings.
Return the updated PNG and SVG.
```

For a content change, state the exact addition, removal or relationship change. The agent should update the relevant content and rerender; SVG is available for further editing.

## Current scope and checks

Research workflows and Python/R statistical plots are not implemented in this release. Deployment design guidance does not imply a universal automatic topology engine. Example review notes describe their own checks and limits, not customer validation.

For the repository's validation workflow, run:

```bash
python scripts/check.py
```

See [CONTRIBUTING.md](../CONTRIBUTING.md) before contributing changes.
