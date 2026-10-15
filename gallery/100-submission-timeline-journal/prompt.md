# 图 7 | 论文投稿到出版的典型时间线

| | |
| --- | --- |
| 类别 Category | 科研 · research |
| 风格 Style | 科研期刊 · Journal Figure (`journal`) |
| 状态 Status | 精选 · flagship |
| 结构 Blocks | primitives |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> 用 MuseDraw 的「科研期刊」风格画一张图：图 7 | 论文投稿到出版的典型时间线。以一篇 SCI 临床研究为例，从选刊到见刊约 200 天，其中超过一半在等待审稿。天数为示例，不同期刊差异很大。

把这句话交给任何能读写文件、执行命令的智能体（Codex、Cursor 等），并让它使用 MuseDraw skill。
Give this sentence to any agent that can run commands, with the MuseDraw skill installed.

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/100-submission-timeline-journal/scene.json
node skills/musedraw/scripts/musedraw.mjs render gallery/100-submission-timeline-journal/scene.json --theme journal --out output/restyle
```

`scene.json` 是这张图的完整、可编辑来源；示例中的人名、机构与数字为说明用途。
`scene.json` is the complete editable source; names and numbers in examples are illustrative.
