<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/brand/wordmark-dark.svg">
  <img src="assets/brand/wordmark-light.svg" alt="MuseDraw" width="360">
</picture>

<h3>A professional drawing assistant</h3>

<p>Bring figure-design practice to your AI workflow.</p>

<p>
  <a href="https://github.com/KanJieTeam/MuseDraw/actions/workflows/check.yml"><img src="https://github.com/KanJieTeam/MuseDraw/actions/workflows/check.yml/badge.svg" alt="Repository checks"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache--2.0-24292f?style=flat-square" alt="Apache-2.0"></a>
</p>

<p>
  <a href="#quick-start">Quick start</a> ·
  <a href="https://kanjieteam.github.io/MuseDraw/">Gallery</a> ·
  <a href="docs/usage.md">Usage guide</a> ·
  <a href="#contribute">Contribute</a> ·
  <a href="README.md">简体中文</a>
</p>

</div>

---

MuseDraw is an open-source Skill for professional diagrams. Bring composition, color, typography and image-production workflows to the agent you already use, for technical, product and research communication. Draw and revise in the same conversation.

## Quick start

Install the Skill and choose your client when prompted:

```bash
npx skills add KanJieTeam/MuseDraw
```

Then ask your agent: **Use MuseDraw to draw an architecture diagram from this system description.** Supply the material, the figure's purpose and your visual preferences.

A few ordinary sentences are enough to start; MuseDraw handles composition, color and layout. The gallery is a design-reference collection, not a template allowlist. New subjects and structures do not require coordinates or per-module drawing parameters.

Installation with the command above requires Node.js 22.20+ and an agent with file access and execution tools. Rendering and PNG export requirements are in the [usage guide](docs/usage.md).

## Current capabilities

| View | What it communicates |
| :--- | :--- |
| Capability map | Functional layers, grouped capabilities and cross-cutting support |
| Components and integration | Software components, interfaces, known interactions and system boundaries |
| Deployment | Supplied instances, environments, networks and storage boundaries |

Delivery includes **PNG images and SVG source**. Continue refining content, composition and style through conversation; preserve confirmed information and relationships during style-only changes.

[Browse 100 original architecture diagrams](https://kanjieteam.github.io/MuseDraw/): zoom in, copy a prompt, or download PNG, SVG and individually editable drawio files.

The available Skill is [`musedraw`](skills/musedraw/SKILL.md). Research methods, experimental workflows, algorithm diagrams and Python/R data visualization are future directions, not released Skills.

## Design approach

- **Information first.** Identify the audience, content and relationships before choosing a view and composition.
- **Restrained expression.** Organize information through hierarchy, space and limited accent colors.
- **Inspect before delivery.** Render and check the text, boundaries and connectors, not just the generated code.

## Contribute

Engineers, researchers, product teams, designers and developers are welcome. Improve design guidance and production tools, or contribute a professional-diagram workflow that goes from input to image delivery.

[Contribution guide](CONTRIBUTING.md) · [Problems and suggestions](https://github.com/KanJieTeam/MuseDraw/issues)

Your first contribution may be in English or Chinese. Run `python scripts/check.py` before submitting; changes affecting figures also need visual inspection.

## License

[Apache-2.0](LICENSE) · [Brand assets](assets/brand/README.md)

Check permissions and credit sources when introducing third-party material.
