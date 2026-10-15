# 文献综述写作流程

| | |
| --- | --- |
| 类别 Category | 科研 · research |
| 风格 Style | 柔和笔记 · Pastel Notes (`pastel`) |
| 状态 Status | 精选 · flagship |
| 结构 Blocks | primitives |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> 用 MuseDraw 的「柔和笔记」风格画一张图：文献综述写作流程。八步、约 14 周。左边是每一步占用的时间，中间是还剩多少篇文献，右边是这一步必须留下的记录。1,204 篇检索结果最终纳入 38 篇。数据为示例。

把这句话交给任何能读写文件、执行命令的智能体（Codex、Cursor 等），并让它使用 MuseDraw skill。
Give this sentence to any agent that can run commands, with the MuseDraw skill installed.

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/66-literature-review-pastel/scene.json
node skills/musedraw/scripts/musedraw.mjs render gallery/66-literature-review-pastel/scene.json --theme journal --out output/restyle
```

`scene.json` 是这张图的完整、可编辑来源；示例中的人名、机构与数字为说明用途。
`scene.json` is the complete editable source; names and numbers in examples are illustrative.
