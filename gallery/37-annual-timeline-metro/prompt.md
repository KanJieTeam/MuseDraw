# 公司 2026 年度大事记

| | |
| --- | --- |
| 类别 Category | 办公 · office |
| 风格 Style | 地铁线路 · Metro Map (`metro`) |
| 状态 Status | 预览 · preview |
| 结构 Blocks | timeline |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> 用 MuseDraw 的「地铁线路」风格画一张图：公司 2026 年度大事记。一条主线，八个站点。红色站点是改变公司规模的节点，其余是能力建设。

把这句话交给任何能读写文件、执行命令的智能体（Codex、Cursor 等），并让它使用 MuseDraw skill。
Give this sentence to any agent that can run commands, with the MuseDraw skill installed.

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/37-annual-timeline-metro/scene.json
node skills/musedraw/scripts/musedraw.mjs render gallery/37-annual-timeline-metro/scene.json --theme journal --out output/restyle
```

`scene.json` 是这张图的完整、可编辑来源；示例中的人名、机构与数字为说明用途。
`scene.json` is the complete editable source; names and numbers in examples are illustrative.
