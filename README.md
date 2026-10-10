# MuseDraw

Professional scientific figures for your AI agent. Starting with software architecture.

[简体中文](README.zh-CN.md)

![Original data-platform capability architecture](examples/data-platform/diagram.png)

MuseDraw gives your existing AI agent design guidance, original examples and a figure-making workflow. It is a self-contained Skill, not a standalone web app or an MCP server.

## Start with one prompt

Ask an agent that can read repository files, run local tools and save output:

```text
Use https://github.com/KanJieTeam/MuseDraw to draw a data-platform architecture diagram.
Show data sources, batch and streaming ingestion, a warehouse/lake, data services
and consumption, with governance and operations alongside.
Treat this as a generic reference. Return PNG and editable SVG.
```

The agent should read the repository's [SKILL.md](SKILL.md), then load [skills/musedraw/SKILL.md](skills/musedraw/SKILL.md) and the relevant resources. Pasting a URL does not automatically install a Skill or give a chat page file and execution tools. See the [usage guide](docs/usage.md) for the complete workflow.

<details>
<summary>Optional: install with the Skills CLI</summary>

Requires Node.js 18+:

```bash
npx skills add KanJieTeam/MuseDraw
```

Follow the interactive prompts to choose your agent/client. Installation registers the Skill; it does not supply the host's execution environment or PNG dependencies.

</details>

## What this release does

- Capability maps: layers, grouped capabilities and cross-cutting support.
- Component and integration views: components, interfaces, exchanges and boundaries.
- Deployment views: instances, environments and network boundaries supplied in your brief.

Default delivery is PNG plus editable SVG, built from native text and geometry. The bundled Python renderer implements a fixed data-platform capability layout—not a general-purpose architecture layout engine. Other views are designed as original SVG according to the brief.

Research workflows and Python/R statistical plots are future directions, not supported features in this release. Organizational charts and generic business flowcharts are also outside the current architecture scope.

## Another view: inspection software

![Original inspection-software component architecture](examples/inspection-platform/diagram.png)

A logical component view with 10 nodes and 10 relationships. It separates API access, business services, storage and messaging without inventing deployment instances or a cloud vendor.

- Data platform: [SVG](examples/data-platform/diagram.svg), [brief](examples/data-platform/brief.md), [review](examples/data-platform/review.md).
- Inspection platform: [SVG](examples/inspection-platform/diagram.svg), [brief](examples/inspection-platform/brief.md), [review](examples/inspection-platform/review.md).

These are original reference examples, not customer-system evidence or external acceptance reports.

## Tools and revisions

The bundled renderer requires Python 3.10+. PNG preview/export uses existing Node.js 22+, Playwright and Chrome/Chromium or another compatible browser. The agent must check what its environment actually provides and report missing dependencies. No separate CAD engine is required; MuseDraw itself adds no model API key or MCP requirement.

Continue asking the same agent to adjust grouping, spacing, typography or color. For a visual-only revision, ask it to keep the supplied components and relationships unchanged. SVG is available for further editing.

See [usage](docs/usage.md) for rendering, checks and dependency limits.

## Contribute

Design improvements, reproducible cases and actionable bug reports are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md), then run the repository check:

```bash
python scripts/check.py
```

Automated checks do not replace looking at the exported figure or reviewing its architecture semantics.

## License

[Apache-2.0](LICENSE). Original examples and their source files are included; community reference templates are not redistributed.
