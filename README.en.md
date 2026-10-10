# MuseDraw

A scientific-figure assistant for turning research and ideas into clear visuals.

[Quick start](#quick-start) · [Usage guide](docs/usage.md) · [Contribute](#contribute) · [简体中文](README.md)

MuseDraw is an open-source drawing Skill project for researchers. It brings figure-design methods, visual guidance and production workflows to the AI agent you already use, helping you turn your material into clear, considered figures.

You supply the content and requirements. Your agent interprets and executes them; MuseDraw provides the drawing workflow. Keep refining the figure in the same conversation.

## Quick start

Install in an agent that supports Skills, file access and local tools:

```bash
npx skills add KanJieTeam/MuseDraw
```

Choose your client when prompted, then describe your task:

```text
Use MuseDraw to turn the following system description into an architecture diagram
for a technical presentation.
[Paste your material and requirements]
```

You can also give this repository URL to an agent with repository access and execution tools, and ask it to load the complete MuseDraw Skill before drawing.

The install command requires Node.js 18+. Rendering and export requirements are covered in the [usage guide](docs/usage.md). MuseDraw uses your existing agent and model; it does not require an additional MCP service.

## From content to figures

- **Structure the information first.** Identify hierarchy, groups and relationships, then choose a composition for the purpose and audience.
- **Let design serve the content.** Coordinate typography, spacing, color and emphasis without letting decoration obscure the information.
- **Refine through conversation.** Preserve confirmed content during visual changes and unaffected elements during content edits.
- **Deliver usable images.** Export PNG and retain the SVG source; inspect the rendered text, boundaries and connectors.

Start with the figure's purpose and the material it should contain. If you have a preferred visual style, share that too.

## Current scope

The available `musedraw` Skill covers software and data-platform capability maps, component and integration views, and deployment views based on supplied deployment facts.

We aim to expand into research methods, experimental workflows, algorithm diagrams and Python/R data visualization. These workflows are not released yet; contributions grounded in specific needs are welcome.

MuseDraw organizes its capabilities as **a Skill, design guides and supporting tools**. See the [usage guide](docs/usage.md) and [Skill entry](skills/musedraw/SKILL.md).

## Contribute

Researchers, designers and developers are welcome. You can:

- Improve composition, color, typography and readability guidance.
- Add scientific-figure workflows that go from input to image delivery.
- Improve generation tools, checks, documentation and client instructions.
- Report problems and suggest improvements from actual use.

Read the [contribution guide](CONTRIBUTING.md). Discuss substantial new directions in [Issues](https://github.com/KanJieTeam/MuseDraw/issues), and run this check before submitting changes:

```bash
python scripts/check.py
```

Your first contribution may be in English or Chinese. Changes affecting figures also need visual inspection alongside rule and tool checks.

## License

[Apache-2.0](LICENSE). Use, modify and contribute; check permissions and credit sources when introducing third-party material.
