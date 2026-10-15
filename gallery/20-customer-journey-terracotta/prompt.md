# Customer journey map

| | |
| --- | --- |
| 类别 Category | 办公 · office |
| 风格 Style | 暖陶 · Terracotta (`terracotta`) |
| 状态 Status | 已审图 · reviewed |
| 结构 Blocks | primitives |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> Use MuseDraw in the Terracotta style to draw: Customer journey map. One customer type, six stages. The curve is how they feel; the clay cards are where a small fix removes a big dip.

把这句话交给任何能读写文件、执行命令的智能体（Codex、Cursor 等），并让它使用 MuseDraw skill。
Give this sentence to any agent that can run commands, with the MuseDraw skill installed.

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/20-customer-journey-terracotta/scene.json
node skills/musedraw/scripts/musedraw.mjs render gallery/20-customer-journey-terracotta/scene.json --theme journal --out output/restyle
```

`scene.json` 是这张图的完整、可编辑来源；示例中的人名、机构与数字为说明用途。
`scene.json` is the complete editable source; names and numbers in examples are illustrative.
