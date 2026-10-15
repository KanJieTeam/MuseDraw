# 2027 年度 OKR 进度

| | |
| --- | --- |
| 类别 Category | 办公 · office |
| 风格 Style | 商务墨蓝 · Enterprise Navy (`enterprise`) |
| 状态 Status | 精选 · flagship |
| 结构 Blocks | primitives |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> 用 MuseDraw 的「商务墨蓝」风格画一张图：2027 年度 OKR 进度。数据截至 6 月 30 日。条形为关键结果完成度，虚线为时间进度；条形停在虚线左侧，即进度落后于时间。

把这句话交给任何能读写文件、执行命令的智能体（Codex、Cursor 等），并让它使用 MuseDraw skill。
Give this sentence to any agent that can run commands, with the MuseDraw skill installed.

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/16-okr-tree-enterprise/scene.json
node skills/musedraw/scripts/musedraw.mjs render gallery/16-okr-tree-enterprise/scene.json --theme journal --out output/restyle
```

`scene.json` 是这张图的完整、可编辑来源；示例中的人名、机构与数字为说明用途。
`scene.json` is the complete editable source; names and numbers in examples are illustrative.
