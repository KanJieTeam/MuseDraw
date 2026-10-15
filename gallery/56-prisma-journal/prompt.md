# Fig. 1 | PRISMA 2020 flow diagram

| | |
| --- | --- |
| 类别 Category | 科研 · research |
| 风格 Style | 科研期刊 · Journal Figure (`journal`) |
| 状态 Status | 精选 · flagship |
| 结构 Blocks | primitives |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> Use MuseDraw in the Journal Figure style to draw: Fig. 1 | PRISMA 2020 flow diagram. Identification of studies via databases and registers for a systematic review of exercise interventions in older adults. Counts reconcile at every step (2,454 − 704 = 1,750; 1,750 − 1,512 = 238; 238 − 11 = 227; 227 − 191 = 36 reports).

把这句话交给任何能读写文件、执行命令的智能体（Codex、Cursor 等），并让它使用 MuseDraw skill。
Give this sentence to any agent that can run commands, with the MuseDraw skill installed.

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/56-prisma-journal/scene.json
node skills/musedraw/scripts/musedraw.mjs render gallery/56-prisma-journal/scene.json --theme journal --out output/restyle
```

`scene.json` 是这张图的完整、可编辑来源；示例中的人名、机构与数字为说明用途。
`scene.json` is the complete editable source; names and numbers in examples are illustrative.
