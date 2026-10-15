# 客诉处理闭环与时限

| | |
| --- | --- |
| 类别 Category | 办公 · office |
| 风格 Style | 暖陶 · Terracotta (`terracotta`) |
| 状态 Status | 已审图 · reviewed |
| 结构 Blocks | primitives |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> 用 MuseDraw 的「暖陶」风格画一张图：客诉处理闭环与时限。五步，每一步都有时限。处理环节最长也最容易超时；最后一步“复盘”才是闭环：同一类问题不再出现，才算真的处理完。数据为示例。

把这句话交给任何能读写文件、执行命令的智能体（Codex、Cursor 等），并让它使用 MuseDraw skill。
Give this sentence to any agent that can run commands, with the MuseDraw skill installed.

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/95-complaint-loop-terracotta/scene.json
node skills/musedraw/scripts/musedraw.mjs render gallery/95-complaint-loop-terracotta/scene.json --theme journal --out output/restyle
```

`scene.json` 是这张图的完整、可编辑来源；示例中的人名、机构与数字为说明用途。
`scene.json` is the complete editable source; names and numbers in examples are illustrative.
