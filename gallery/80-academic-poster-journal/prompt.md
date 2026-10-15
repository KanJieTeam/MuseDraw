# 分级夜间巡视降低老年住院患者跌倒率

| | |
| --- | --- |
| 类别 Category | 科研 · research |
| 风格 Style | 科研期刊 · Journal Figure (`journal`) |
| 状态 Status | 已审图 · reviewed |
| 结构 Blocks | primitives |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> 用 MuseDraw 的「科研期刊」风格画一张图：分级夜间巡视降低老年住院患者跌倒率。作者 A，作者 B，作者 C ｜ 某三甲医院神经内科 ｜ 2026 年全国护理学术年会。数据为示例。

把这句话交给任何能读写文件、执行命令的智能体（Codex、Cursor 等），并让它使用 MuseDraw skill。
Give this sentence to any agent that can run commands, with the MuseDraw skill installed.

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/80-academic-poster-journal/scene.json
node skills/musedraw/scripts/musedraw.mjs render gallery/80-academic-poster-journal/scene.json --theme journal --out output/restyle
```

`scene.json` 是这张图的完整、可编辑来源；示例中的人名、机构与数字为说明用途。
`scene.json` is the complete editable source; names and numbers in examples are illustrative.
