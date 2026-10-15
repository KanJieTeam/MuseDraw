# LLM evaluation pipeline

| | |
| --- | --- |
| 类别 Category | 工程 · engineering |
| 风格 Style | 观测夜空 · Observatory (`observatory`) |
| 状态 Status | 预览 · preview |
| 结构 Blocks | primitives |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> Use MuseDraw in the Observatory style to draw: LLM evaluation pipeline. A fixed set of cases, three kinds of graders, and a CI gate. The LLM judge is calibrated against humans on a sample every week — otherwise it quietly drifts.

把这句话交给任何能读写文件、执行命令的智能体（Codex、Cursor 等），并让它使用 MuseDraw skill。
Give this sentence to any agent that can run commands, with the MuseDraw skill installed.

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/73-llm-eval-observatory/scene.json
node skills/musedraw/scripts/musedraw.mjs render gallery/73-llm-eval-observatory/scene.json --theme journal --out output/restyle
```

`scene.json` 是这张图的完整、可编辑来源；示例中的人名、机构与数字为说明用途。
`scene.json` is the complete editable source; names and numbers in examples are illustrative.
