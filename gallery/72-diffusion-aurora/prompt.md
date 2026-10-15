# Denoising diffusion: training and sampling

| | |
| --- | --- |
| 类别 Category | 科研 · research |
| 风格 Style | 极光玻璃 · Aurora Glass (`aurora`) |
| 状态 Status | 预览 · preview |
| 结构 Blocks | primitives |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> Use MuseDraw in the Aurora Glass style to draw: Denoising diffusion: training and sampling. Training adds Gaussian noise in 1,000 small steps and teaches one network to predict it. Generation runs the chain backwards, about 30–50 steps with a modern sampler, steered by the text.

把这句话交给任何能读写文件、执行命令的智能体（Codex、Cursor 等），并让它使用 MuseDraw skill。
Give this sentence to any agent that can run commands, with the MuseDraw skill installed.

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/72-diffusion-aurora/scene.json
node skills/musedraw/scripts/musedraw.mjs render gallery/72-diffusion-aurora/scene.json --theme journal --out output/restyle
```

`scene.json` 是这张图的完整、可编辑来源；示例中的人名、机构与数字为说明用途。
`scene.json` is the complete editable source; names and numbers in examples are illustrative.
