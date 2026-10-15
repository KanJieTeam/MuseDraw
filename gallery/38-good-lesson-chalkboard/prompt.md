# 《沉与浮》教学流程

| | |
| --- | --- |
| 类别 Category | 教学 · teaching |
| 风格 Style | 黑板教学 · Chalkboard (`chalkboard`) |
| 状态 Status | 精选 · flagship |
| 结构 Blocks | primitives |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> 用 MuseDraw 的「黑板教学」风格画一张图：《沉与浮》教学流程。五个环节按时长等比例排开；上排是老师做什么，下排是孩子做什么。

把这句话交给任何能读写文件、执行命令的智能体（Codex、Cursor 等），并让它使用 MuseDraw skill。
Give this sentence to any agent that can run commands, with the MuseDraw skill installed.

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/38-good-lesson-chalkboard/scene.json
node skills/musedraw/scripts/musedraw.mjs render gallery/38-good-lesson-chalkboard/scene.json --theme journal --out output/restyle
```

`scene.json` 是这张图的完整、可编辑来源；示例中的人名、机构与数字为说明用途。
`scene.json` is the complete editable source; names and numbers in examples are illustrative.
