# Contract review triage

| | |
| --- | --- |
| 类别 Category | 办公 · office |
| 风格 Style | 纸墨编辑 · Editorial Ink (`editorial`) |
| 状态 Status | 预览 · preview |
| 结构 Blocks | primitives |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> Use MuseDraw in the Editorial Ink style to draw: Contract review triage. Standard paper on our template goes straight to signature. Only the exceptions — non-standard terms, high value, personal data — get human review.

把这句话交给任何能读写文件、执行命令的智能体（Codex、Cursor 等），并让它使用 MuseDraw skill。
Give this sentence to any agent that can run commands, with the MuseDraw skill installed.

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/49-contract-review-editorial/scene.json
node skills/musedraw/scripts/musedraw.mjs render gallery/49-contract-review-editorial/scene.json --theme journal --out output/restyle
```

`scene.json` 是这张图的完整、可编辑来源；示例中的人名、机构与数字为说明用途。
`scene.json` is the complete editable source; names and numbers in examples are illustrative.
