# 实时协同编辑（CRDT）架构

| | |
| --- | --- |
| 类别 Category | 工程 · engineering |
| 风格 Style | 柔和笔记 · Pastel Notes (`pastel`) |
| 状态 Status | 预览 · preview |
| 结构 Blocks | primitives |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> 用 MuseDraw 的「柔和笔记」风格画一张图：实时协同编辑（CRDT）架构。两个人同时改同一段文字，为什么不会互相覆盖？每个客户端都有完整副本，只交换“增量”，而合并结果与到达顺序无关。

把这句话交给任何能读写文件、执行命令的智能体（Codex、Cursor 等），并让它使用 MuseDraw skill。
Give this sentence to any agent that can run commands, with the MuseDraw skill installed.

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/15-crdt-collab-pastel/scene.json
node skills/musedraw/scripts/musedraw.mjs render gallery/15-crdt-collab-pastel/scene.json --theme journal --out output/restyle
```

`scene.json` 是这张图的完整、可编辑来源；示例中的人名、机构与数字为说明用途。
`scene.json` is the complete editable source; names and numbers in examples are illustrative.
