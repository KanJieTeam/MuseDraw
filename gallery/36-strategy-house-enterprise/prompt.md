# 2027–2029 战略地图

| | |
| --- | --- |
| 类别 Category | 办公 · office |
| 风格 Style | 商务墨蓝 · Enterprise Navy (`enterprise`) |
| 状态 Status | 精选 · flagship |
| 结构 Blocks | primitives |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> 用 MuseDraw 的「商务墨蓝」风格画一张图：2027–2029 战略地图。一个愿景、三项总目标、四根支柱。每根支柱只用一个指标衡量，并写明逐年目标与负责人。数据为示例。

把这句话交给任何能读写文件、执行命令的智能体（Codex、Cursor 等），并让它使用 MuseDraw skill。
Give this sentence to any agent that can run commands, with the MuseDraw skill installed.

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/36-strategy-house-enterprise/scene.json
node skills/musedraw/scripts/musedraw.mjs render gallery/36-strategy-house-enterprise/scene.json --theme journal --out output/restyle
```

`scene.json` 是这张图的完整、可编辑来源；示例中的人名、机构与数字为说明用途。
`scene.json` is the complete editable source; names and numbers in examples are illustrative.
