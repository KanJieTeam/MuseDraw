# Vendor scoring matrix: CRM selection

| | |
| --- | --- |
| 类别 Category | 办公 · office |
| 风格 Style | 报刊黑白 · Newsprint (`newsprint`) |
| 状态 Status | 预览 · preview |
| 结构 Blocks | table |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> Use MuseDraw in the Newsprint style to draw: Vendor scoring matrix: CRM selection. Agree the criteria and their weights first, score each vendor 1–10 against them, and let the arithmetic start the discussion — not end it.

把这句话交给任何能读写文件、执行命令的智能体（Codex、Cursor 等），并让它使用 MuseDraw skill。
Give this sentence to any agent that can run commands, with the MuseDraw skill installed.

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/43-vendor-scoring-newsprint/scene.json
node skills/musedraw/scripts/musedraw.mjs render gallery/43-vendor-scoring-newsprint/scene.json --theme journal --out output/restyle
```

`scene.json` 是这张图的完整、可编辑来源；示例中的人名、机构与数字为说明用途。
`scene.json` is the complete editable source; names and numbers in examples are illustrative.
