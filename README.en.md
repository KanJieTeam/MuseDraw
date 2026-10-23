<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/brand/wordmark-dark.svg">
  <img src="assets/brand/wordmark-light.svg" alt="MuseDraw" width="360">
</picture>

<p><strong>From a few words to an editable diagram</strong></p>
<p>A drawing Skill for AI agents. 20 styles for research, office work, teaching and engineering.</p>

<p>
  <a href="https://kanjieteam.github.io/MuseDraw/">Live gallery ↗</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="docs/usage.md">Documentation</a> ·
  <a href="README.md">中文</a>
</p>

</div>

[![MuseDraw photo collage: 24 overlapping diagrams spanning architecture, workflows, teaching, research and work plans](assets/gallery/readme-showcase.jpg)](https://kanjieteam.github.io/MuseDraw/)

## Quick start

Install in a Skill-capable agent that can read files and run commands:

```bash
npx skills add KanJieTeam/MuseDraw --skill musedraw
```

Then describe the content and relationships:

```text
Use MuseDraw's terminal style for a GitOps delivery pipeline:
commit → test → build → GitOps sync → canary release. Show failure rollback.
```

Requires Node.js 22+, Playwright and a compatible browser. The agent reuses an existing runtime when available; system fonts are sufficient.
If Git downloads stall, use the [lightweight Skill ZIP](https://kanjieteam.github.io/MuseDraw/downloads/musedraw-skill.zip). See the [fast-path guide](docs/fast-start.zh-CN.md) for setup details.

## Deliver, edit, repeat

- **PNG + native draw.io**: edit text, shapes and connected edges individually. Ask for “PNG only” to skip draw.io.
- **Keep the scene source**: revise content or restyle the same `scene.json`.
- **Diagram content by default**: no added page heading or attribution. Automatic checks cover overflow, collisions, bounds and native export.

Choose a style in the gallery, copy a brief or download an editable diagram. [20 styles](skills/musedraw/references/style-atlas.md) · [All 101 examples](gallery/README.md)

## Visual design judgment Skill

For composition, reading rhythm, emotional expression or storytelling, optionally install [visual-design-judgment](skills/visual-design-judgment/SKILL.md):

```bash
npx skills add KanJieTeam/MuseDraw --skill visual-design-judgment
```

It turns cross-media, literary, classical and Romantic research into task-specific design guidance, using your existing creation tools. See the [original information-grouping comparison](examples/visual-judgment-event/review.md) and [research and evaluation scope](skills/visual-design-judgment/references/evidence.md).

## Documentation and contributions

[Usage](docs/usage.md) · [Fast path](docs/fast-start.zh-CN.md) · [Contributing](CONTRIBUTING.md) · [Issues and style requests](https://github.com/KanJieTeam/MuseDraw/issues)

Contributions of cases, themes and layouts are welcome. MuseDraw draws structure and relationships; use a statistical plotting library for raw-data charts.

[Apache-2.0](LICENSE) · [Third-party notices](NOTICE)
