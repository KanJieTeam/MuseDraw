# 全膝关节置换术临床路径（标准住院日 6 天）

| | |
| --- | --- |
| 类别 Category | 办公 · office |
| 风格 Style | 柔和笔记 · Pastel Notes (`pastel`) |
| 状态 Status | 已审图 · reviewed |
| 结构 Blocks | primitives |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> 用 MuseDraw 的「柔和笔记」风格画一张图：全膝关节置换术临床路径（标准住院日 6 天）。横向是住院日，纵向是谁负责。同一列读下来，就是这一天四方各自要完成的事。内容为示例，以本院路径为准。

把这句话交给任何能读写文件、执行命令的智能体（Codex、Cursor 等），并让它使用 MuseDraw skill。
Give this sentence to any agent that can run commands, with the MuseDraw skill installed.

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/87-clinical-pathway-pastel/scene.json
node skills/musedraw/scripts/musedraw.mjs render gallery/87-clinical-pathway-pastel/scene.json --theme journal --out output/restyle
```

`scene.json` 是这张图的完整、可编辑来源；示例中的人名、机构与数字为说明用途。
`scene.json` is the complete editable source; names and numbers in examples are illustrative.
