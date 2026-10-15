# 图 3 | 技术路线图

| | |
| --- | --- |
| 类别 Category | 科研 · research |
| 风格 Style | 科研期刊 · Journal Figure (`journal`) |
| 状态 Status | 精选 · flagship |
| 结构 Blocks | primitives |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> 用 MuseDraw 的「科研期刊」风格画一张图：图 3 | 技术路线图。示例课题：基于多组学的肝纤维化代谢重编程机制研究（国家自然科学基金面上项目申请书格式）。三条研究内容并行，最终汇聚到一个可验证的机制。

把这句话交给任何能读写文件、执行命令的智能体（Codex、Cursor 等），并让它使用 MuseDraw skill。
Give this sentence to any agent that can run commands, with the MuseDraw skill installed.

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/59-nsfc-roadmap-journal/scene.json
node skills/musedraw/scripts/musedraw.mjs render gallery/59-nsfc-roadmap-journal/scene.json --theme journal --out output/restyle
```

`scene.json` 是这张图的完整、可编辑来源；示例中的人名、机构与数字为说明用途。
`scene.json` is the complete editable source; names and numbers in examples are illustrative.
