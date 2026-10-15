# Network of evidence for chronic insomnia treatments

| | |
| --- | --- |
| 类别 Category | 科研 · research |
| 风格 Style | 报刊黑白 · Newsprint (`newsprint`) |
| 状态 Status | 精选 · flagship |
| 结构 Blocks | primitives |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> Use MuseDraw in the Newsprint style to draw: Network of evidence for chronic insomnia treatments. 33 randomised trials, six treatments. Every line is at least one direct comparison; everything else is inferred. Counts are illustrative.

把这句话交给任何能读写文件、执行命令的智能体（Codex、Cursor 等），并让它使用 MuseDraw skill。
Give this sentence to any agent that can run commands, with the MuseDraw skill installed.

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/82-network-meta-newsprint/scene.json
node skills/musedraw/scripts/musedraw.mjs render gallery/82-network-meta-newsprint/scene.json --theme journal --out output/restyle
```

`scene.json` 是这张图的完整、可编辑来源；示例中的人名、机构与数字为说明用途。
`scene.json` is the complete editable source; names and numbers in examples are illustrative.
