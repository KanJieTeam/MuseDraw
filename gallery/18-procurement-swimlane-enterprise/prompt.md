# 采购审批跨部门泳道图

| | |
| --- | --- |
| 类别 Category | 办公 · office |
| 风格 Style | 商务墨蓝 · Enterprise Navy (`enterprise`) |
| 状态 Status | 精选 · flagship |
| 结构 Blocks | swimlane |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> 用 MuseDraw 的「商务墨蓝」风格画一张图：采购审批跨部门泳道图。五个角色、两道金额闸门、一次三单匹配。谁在什么时候做什么，一行看清；琥珀色是最容易卡住的节点。

把这句话交给任何能读写文件、执行命令的智能体（Codex、Cursor 等），并让它使用 MuseDraw skill。
Give this sentence to any agent that can run commands, with the MuseDraw skill installed.

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/18-procurement-swimlane-enterprise/scene.json
node skills/musedraw/scripts/musedraw.mjs render gallery/18-procurement-swimlane-enterprise/scene.json --theme journal --out output/restyle
```

`scene.json` 是这张图的完整、可编辑来源；示例中的人名、机构与数字为说明用途。
`scene.json` is the complete editable source; names and numbers in examples are illustrative.
