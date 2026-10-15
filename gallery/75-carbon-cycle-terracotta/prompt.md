# Global carbon cycle, annual fluxes

| | |
| --- | --- |
| 类别 Category | 科研 · research |
| 风格 Style | 暖陶 · Terracotta (`terracotta`) |
| 状态 Status | 预览 · preview |
| 结构 Blocks | primitives |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> Use MuseDraw in the Terracotta style to draw: Global carbon cycle, annual fluxes. Boxes are stocks in billions of tonnes of carbon (GtC); arrows are yearly flows. Of the ~11 GtC humans add each year, the land and ocean take back a little more than half.

把这句话交给任何能读写文件、执行命令的智能体（Codex、Cursor 等），并让它使用 MuseDraw skill。
Give this sentence to any agent that can run commands, with the MuseDraw skill installed.

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/75-carbon-cycle-terracotta/scene.json
node skills/musedraw/scripts/musedraw.mjs render gallery/75-carbon-cycle-terracotta/scene.json --theme journal --out output/restyle
```

`scene.json` 是这张图的完整、可编辑来源；示例中的人名、机构与数字为说明用途。
`scene.json` is the complete editable source; names and numbers in examples are illustrative.
