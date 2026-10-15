# 办公楼装修工程 · 进度计划

| | |
| --- | --- |
| 类别 Category | 办公 · office |
| 风格 Style | 工程蓝图 · Blueprint (`blueprint`) |
| 状态 Status | 预览 · preview |
| 结构 Blocks | gantt |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> 用 MuseDraw 的「工程蓝图」风格画一张图：办公楼装修工程 · 进度计划。16 周、4 个阶段、2 个验收节点。黄色竖线为当前进度（第 7 周），关键路径：管线 → 隐蔽验收 → 吊顶 → 涂料 → 竣工。

把这句话交给任何能读写文件、执行命令的智能体（Codex、Cursor 等），并让它使用 MuseDraw skill。
Give this sentence to any agent that can run commands, with the MuseDraw skill installed.

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/29-renovation-gantt-blueprint/scene.json
node skills/musedraw/scripts/musedraw.mjs render gallery/29-renovation-gantt-blueprint/scene.json --theme journal --out output/restyle
```

`scene.json` 是这张图的完整、可编辑来源；示例中的人名、机构与数字为说明用途。
`scene.json` is the complete editable source; names and numbers in examples are illustrative.
