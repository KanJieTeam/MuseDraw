# Brand launch, planned backwards from launch day

| | |
| --- | --- |
| 类别 Category | 办公 · office |
| 风格 Style | 产品发布 · Product Clean (`product`) |
| 状态 Status | 已审图 · reviewed |
| 结构 Blocks | gantt |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> Use MuseDraw in the Product Clean style to draw: Brand launch, planned backwards from launch day. Start from the date and work back. Trademark clearance and the first production run are the two long poles; everything else fits around them.

把这句话交给任何能读写文件、执行命令的智能体（Codex、Cursor 等），并让它使用 MuseDraw skill。
Give this sentence to any agent that can run commands, with the MuseDraw skill installed.

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/94-brand-launch-product/scene.json
node skills/musedraw/scripts/musedraw.mjs render gallery/94-brand-launch-product/scene.json --theme journal --out output/restyle
```

`scene.json` 是这张图的完整、可编辑来源；示例中的人名、机构与数字为说明用途。
`scene.json` is the complete editable source; names and numbers in examples are illustrative.
