# 门诊就诊流程优化

| | |
| --- | --- |
| 类别 Category | 办公 · office |
| 风格 Style | 柔和笔记 · Pastel Notes (`pastel`) |
| 状态 Status | 预览 · preview |
| 结构 Blocks | primitives |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> 用 MuseDraw 的「柔和笔记」风格画一张图：门诊就诊流程优化。线下 9 步里有 4 步在排队。把挂号、缴费、报告搬到手机上之后，患者在院时间从 2.5 小时降到 70 分钟。

把这句话交给任何能读写文件、执行命令的智能体（Codex、Cursor 等），并让它使用 MuseDraw skill。
Give this sentence to any agent that can run commands, with the MuseDraw skill installed.

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/46-outpatient-flow-pastel/scene.json
node skills/musedraw/scripts/musedraw.mjs render gallery/46-outpatient-flow-pastel/scene.json --theme journal --out output/restyle
```

`scene.json` 是这张图的完整、可编辑来源；示例中的人名、机构与数字为说明用途。
`scene.json` is the complete editable source; names and numbers in examples are illustrative.
