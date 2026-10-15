# 夜间如厕跌倒根因分析

| | |
| --- | --- |
| 类别 Category | 办公 · office |
| 风格 Style | 报刊黑白 · Newsprint (`newsprint`) |
| 状态 Status | 精选 · flagship |
| 结构 Blocks | fishbone |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> 用 MuseDraw 的「报刊黑白」风格画一张图：夜间如厕跌倒根因分析。数字为该原因在 23 份事件记录中出现的次数（可重复计入）。加粗的三项出现最多，进入对策拟定。数据为示例。

把这句话交给任何能读写文件、执行命令的智能体（Codex、Cursor 等），并让它使用 MuseDraw skill。
Give this sentence to any agent that can run commands, with the MuseDraw skill installed.

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/25-fishbone-falls-newsprint/scene.json
node skills/musedraw/scripts/musedraw.mjs render gallery/25-fishbone-falls-newsprint/scene.json --theme journal --out output/restyle
```

`scene.json` 是这张图的完整、可编辑来源；示例中的人名、机构与数字为说明用途。
`scene.json` is the complete editable source; names and numbers in examples are illustrative.
