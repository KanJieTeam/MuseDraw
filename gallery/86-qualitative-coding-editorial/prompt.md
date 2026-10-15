# 三级编码：从原话到核心范畴

| | |
| --- | --- |
| 类别 Category | 科研 · research |
| 风格 Style | 纸墨编辑 · Editorial Ink (`editorial`) |
| 状态 Status | 已审图 · reviewed |
| 结构 Blocks | primitives |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> 用 MuseDraw 的「纸墨编辑」风格画一张图：三级编码：从原话到核心范畴。16 位老年住院患者半结构访谈。左列是原话片段，中列是归并后的主范畴，右侧是统领全部范畴的核心解释。示例数据。

把这句话交给任何能读写文件、执行命令的智能体（Codex、Cursor 等），并让它使用 MuseDraw skill。
Give this sentence to any agent that can run commands, with the MuseDraw skill installed.

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/86-qualitative-coding-editorial/scene.json
node skills/musedraw/scripts/musedraw.mjs render gallery/86-qualitative-coding-editorial/scene.json --theme journal --out output/restyle
```

`scene.json` 是这张图的完整、可编辑来源；示例中的人名、机构与数字为说明用途。
`scene.json` is the complete editable source; names and numbers in examples are illustrative.
