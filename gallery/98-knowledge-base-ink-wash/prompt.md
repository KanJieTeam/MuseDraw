# 科室知识库目录结构

| | |
| --- | --- |
| 类别 Category | 办公 · office |
| 风格 Style | 水墨宣纸 · Ink Wash (`ink-wash`) |
| 状态 Status | 已审图 · reviewed |
| 结构 Blocks | tree |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> 用 MuseDraw 的「水墨宣纸」风格画一张图：科室知识库目录结构。一级目录按“用来做什么”分，不按部门分；文件统一以“年月日_名称_版本”命名，新人入职第一周就能自己找到。

把这句话交给任何能读写文件、执行命令的智能体（Codex、Cursor 等），并让它使用 MuseDraw skill。
Give this sentence to any agent that can run commands, with the MuseDraw skill installed.

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/98-knowledge-base-ink-wash/scene.json
node skills/musedraw/scripts/musedraw.mjs render gallery/98-knowledge-base-ink-wash/scene.json --theme journal --out output/restyle
```

`scene.json` 是这张图的完整、可编辑来源；示例中的人名、机构与数字为说明用途。
`scene.json` is the complete editable source; names and numbers in examples are illustrative.
