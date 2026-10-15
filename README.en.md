<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/brand/wordmark-dark.svg">
  <img src="assets/brand/wordmark-light.svg" alt="MuseDraw" width="360">
</picture>

<h3>The diagram skill for AI agents</h3>

<p>One sentence in, PNG and native editable draw.io out. 20 visual styles, 100 cases, reproducible from their scenes.</p>

<p>
  <a href="https://github.com/KanJieTeam/MuseDraw/actions/workflows/check.yml"><img src="https://github.com/KanJieTeam/MuseDraw/actions/workflows/check.yml/badge.svg" alt="Repository checks"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache--2.0-24292f?style=flat-square" alt="Apache-2.0"></a>
</p>

<p>
  <a href="#quick-start">Quick start</a> ·
  <a href="https://kanjieteam.github.io/MuseDraw/">Live gallery ↗</a> ·
  <a href="skills/musedraw/references/style-atlas.md">20 styles</a> ·
  <a href="README.md">中文</a>
</p>

</div>

[![MuseDraw flagship gallery](assets/gallery/flagship-grid.jpg)](https://kanjieteam.github.io/MuseDraw/)

<p align="center"><sub>Every image above comes from a single <code>scene.json</code>: grant roadmaps, PRISMA, CONSORT, model architectures, SEM, scale development, OKRs, swimlanes, PDCA, fishbone, lesson plans, system architecture.</sub></p>

## Quick start

```bash
npx skills add KanJieTeam/MuseDraw
npm --prefix skills/musedraw install     # open-source fonts + Playwright, identical renders on every OS
```

Then ask your agent (Codex, Cursor, …):

```text
Use MuseDraw in the Journal Figure style to draw a CONSORT flow for a two-arm trial:
412 assessed, 172 excluded, 240 randomised 1:1, follow-up losses 7 and 9, analysed 110 and 109.
```

The agent picks a layout, writes `scene.json`, renders, inspects and fixes, then delivers `diagram@2x.png` and native editable `diagram.drawio` by default. Keep `scene.json`, `diagram.svg` and `checks.json` as supporting source, vector and verification files.

PNG preserves paper textures, blur and glow. The draw.io file provides editable shapes, text and connected edges; it does not promise identical rendering of every PNG effect.

## Built for research and everyday office work

| Research | Office | Teaching | Engineering |
| --- | --- | --- | --- |
| Grant roadmaps · PRISMA · CONSORT · model architectures · SEM · scale development · lab workflows · project Gantt · moderated mediation | OKR trees · approval swimlanes · PDCA · fishbone · customer journeys · mind maps · RACI · risk heat maps · roadmaps | Lesson flow · curriculum maps · a day plan | RAG · Kubernetes · payments · AI agents · C4 · observability |

Ten layout blocks (tree, mind map, timeline, Gantt, matrix, funnel, cycle, fishbone, swimlane, table), sequence diagrams and free primitives. Blocks own structure, themes own beauty, you own the facts.

## Twenty styles, one flag

`journal` `editorial` `newsprint` `enterprise` `ink-wash` `pastel` `terracotta` `whiteboard` `chalkboard` `swiss` `bauhaus` `metro` `product` `c4` `blueprint` `terminal` `observatory` `aurora` `riso` `neon`

```bash
node skills/musedraw/scripts/musedraw.mjs render gallery/57-consort-journal/scene.json --theme newsprint --out output/print
```

A style is not a palette: each one has its own type, line grammar, texture, labelling and page layout. See the [style atlas](skills/musedraw/references/style-atlas.md).

## Reproduce any case

Choose a style and a diagram, switch between Chinese and English prompts, then copy the request to your agent. Download drawio to edit the diagram directly. Each case folder also holds its scene, original prompt, SVG and preview; `npm run gallery` re-renders them. [Source index](gallery/README.md) · [100-case catalog](gallery/catalog.json)

## Design method

- **One figure, one claim.** Write the subtitle first.
- **Specific beats generic.** Examples use real names and numbers that reconcile — never “Service A”.
- **One focal point, a numbered path, a note on why.**
- **Look before you ship.** `checks.json` measures real glyphs for overflow and collisions; the [anti-AI checklist](skills/musedraw/references/anti-ai-checklist.md) covers taste.

## Contributing

Copy a `gallery/` folder, change the content, render, look, and submit `scene.json` + `prompt.md`. Run `python scripts/check.py` first. [Contributing](CONTRIBUTING.md) · [Issues](https://github.com/KanJieTeam/MuseDraw/issues)

## Limits

Needs an agent that can run commands. PNG export needs Node.js 22+ and Chromium (installed by `npm install`); `--svg-only` otherwise. Not a statistical charting tool. Numbers in examples are illustrative. The legacy auto-layout route (`render_graph.mjs`) is kept for existing users.

## License

[Apache-2.0](LICENSE) · all bundled fonts are SIL OFL · [brand](assets/brand/README.md)
