# 文献管理工作流

| | |
| --- | --- |
| 类别 Category | 科研 · research |
| 风格 Style | 柔和笔记 · Pastel Notes (`pastel`) |
| 状态 Status | 已审图 · reviewed |
| 结构 Blocks | primitives |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> 用 MuseDraw 的「柔和笔记」风格画一张图：文献管理工作流。从检索到写作，每篇文献只录入一次。五个工具各管一步，靠同一个引用键串起来。

把这句话交给任何能读写文件、执行命令的智能体（Codex、Cursor 等），并让它使用 MuseDraw skill。
Give this sentence to any agent that can run commands, with the MuseDraw skill installed.

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/84-reference-workflow-pastel/scene.json
node skills/musedraw/scripts/musedraw.mjs render gallery/84-reference-workflow-pastel/scene.json --theme journal --out output/restyle
```

`scene.json` 是这张图的完整、可编辑来源；示例中的人名、机构与数字为说明用途。
`scene.json` is the complete editable source; names and numbers in examples are illustrative.
