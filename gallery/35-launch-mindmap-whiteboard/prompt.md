# 新品发布会筹备清单

| | |
| --- | --- |
| 类别 Category | 办公 · office |
| 风格 Style | 白板手绘 · Whiteboard (`whiteboard`) |
| 状态 Status | 已审图 · reviewed |
| 结构 Blocks | mindmap |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> 用 MuseDraw 的「白板手绘」风格画一张图：新品发布会筹备清单。每一项写上负责人和截止日期。红色三项是上次发布会最后一周才想起来的风险，这次提前定好预案。

把这句话交给任何能读写文件、执行命令的智能体（Codex、Cursor 等），并让它使用 MuseDraw skill。
Give this sentence to any agent that can run commands, with the MuseDraw skill installed.

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/35-launch-mindmap-whiteboard/scene.json
node skills/musedraw/scripts/musedraw.mjs render gallery/35-launch-mindmap-whiteboard/scene.json --theme journal --out output/restyle
```

`scene.json` 是这张图的完整、可编辑来源；示例中的人名、机构与数字为说明用途。
`scene.json` is the complete editable source; names and numbers in examples are illustrative.
