# E-commerce microservices

| | |
| --- | --- |
| 类别 Category | 工程 · engineering |
| 风格 Style | 包豪斯 · Bauhaus (`bauhaus`) |
| 状态 Status | 预览 · preview |
| 结构 Blocks | primitives |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> Use MuseDraw in the Bauhaus style to draw: E-commerce microservices. Shape tells the role: squares answer requests, circles react to events, the diamond routes traffic. Red lines are events on the bus.

把这句话交给任何能读写文件、执行命令的智能体（Codex、Cursor 等），并让它使用 MuseDraw skill。
Give this sentence to any agent that can run commands, with the MuseDraw skill installed.

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/09-microservices-bauhaus/scene.json
node skills/musedraw/scripts/musedraw.mjs render gallery/09-microservices-bauhaus/scene.json --theme journal --out output/restyle
```

`scene.json` 是这张图的完整、可编辑来源；示例中的人名、机构与数字为说明用途。
`scene.json` is the complete editable source; names and numbers in examples are illustrative.
