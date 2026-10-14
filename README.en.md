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
  <a href="https://kanjieteam.github.io/MuseDraw/">Styles and examples</a> ·
  <a href="docs/usage.md">Usage guide</a> ·
  <a href="#contribute">Contribute</a> ·
  <a href="README.md">简体中文</a>
</p>

</div>

---

MuseDraw is an open-source Skill for professional diagrams. Give your agent a short request and system facts; the agent interprets the content, and MuseDraw's drawing code handles layout, shapes, connectors and export. Continue revising in the same conversation while preserving confirmed facts and relationships.

## Quick start

Install the Skill and choose your client when prompted:

```bash
npx skills add KanJieTeam/MuseDraw
```

Then ask your agent:

```text
Use MuseDraw to draw a records-archive component diagram in 手绘线稿 style.
The portal submits records to the archive service, which writes to the records store.
Use it in a technical proposal.
```

Replace the subject and relationships with your own. No coordinates, color codes or drawing code are required. The examples show reusable styles, not a list of supported business topics.

Installation with the command above requires Node.js 22.20+ and an agent with file access and execution tools. Rendering and PNG export requirements are in the [usage guide](docs/usage.md).

## Two ready-to-use styles

| 手绘线稿 · Hand-drawn linework | 终端色域 · Terminal fields |
| :--- | :--- |
| ![Hand-drawn records archive](docs/verification/graph-workflow-20261014/examples/archive-sketch/round-0/preview-1200.png) | ![Terminal-fields device platform](docs/verification/graph-workflow-20261014/examples/device-planes/round-0/preview-1200.png) |
| White paper, ink outlines, role shapes and hatched storage for discussing components and relationships. | A light canvas, warm and cool regions, and clean geometry for supplied ownership and system boundaries. |

Both use the same component-diagram workflow for new industries, components and relationships. Layout can follow graph relationships or supplied flat ownership groups; 终端色域 also supports a flow without grouped regions. Ask for either style by name.

Delivery includes **PNG, editable SVG and a semantic `document.json`**. Continue with requests such as “Rename the archive service to records service; preserve the other relationships.” The agent edits the existing document and rerenders it.

[Browse styles, short requests and downloadable examples](https://kanjieteam.github.io/MuseDraw/) · [Usage guide](docs/usage.md)

## Reuse and replay

The same semantic document, drawing-code version, fonts and runtime can reproduce the same native geometry. PNG antialiasing can vary slightly. New subjects still depend on the agent understanding the supplied facts; a short request does not guarantee identical drawings from every model.

The current code supports components, explicit relationships and flat ownership groups; nested groups are not supported. PNG requires existing Node.js 22+, Playwright, a Chromium-compatible browser and appropriate fonts. The host must read and write files and execute tools. MuseDraw requires no additional model API key.

The installable Skill is [`musedraw`](skills/musedraw/SKILL.md). See the [implementation and limits](docs/semantic-graph.zh-CN.md) and [real-model verification records](docs/verification/graph-workflow-20261014/README.md) for the checked scope. Research workflows and statistical plots are not released workflows.

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
