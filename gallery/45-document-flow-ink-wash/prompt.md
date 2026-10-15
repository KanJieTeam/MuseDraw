# 公文办理流程

| | |
| --- | --- |
| 类别 Category | 办公 · office |
| 风格 Style | 水墨宣纸 · Ink Wash (`ink-wash`) |
| 状态 Status | 精选 · flagship |
| 结构 Blocks | primitives |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> 用 MuseDraw 的「水墨宣纸」风格画一张图：公文办理流程。一件来文经过八道手续，正常约 10 个工作日办结。朱砂色为需要领导签批的环节，虚线为退改回路。

把这句话交给任何能读写文件、执行命令的智能体（Codex、Cursor 等），并让它使用 MuseDraw skill。
Give this sentence to any agent that can run commands, with the MuseDraw skill installed.

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/45-document-flow-ink-wash/scene.json
node skills/musedraw/scripts/musedraw.mjs render gallery/45-document-flow-ink-wash/scene.json --theme journal --out output/restyle
```

`scene.json` 是这张图的完整、可编辑来源；示例中的人名、机构与数字为说明用途。
`scene.json` is the complete editable source; names and numbers in examples are illustrative.
