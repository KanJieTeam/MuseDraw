# Multi-tenant SaaS: pooled and silo tiers

| | |
| --- | --- |
| 类别 Category | 工程 · engineering |
| 风格 Style | 产品发布 · Product Clean (`product`) |
| 状态 Status | 已审图 · reviewed |
| 结构 Blocks | primitives |

![preview](preview.jpg)

## 一句话需求 · One-line prompt

> Use MuseDraw in the Product Clean style to draw: Multi-tenant SaaS: pooled and silo tiers. One codebase and one pipeline serve every tenant. The tier in the token decides where a request runs: shared infrastructure for Starter and Pro, a dedicated account for Enterprise.

把这句话交给任何能读写文件、执行命令的智能体（Codex、Cursor 等），并让它使用 MuseDraw skill。
Give this sentence to any agent that can run commands, with the MuseDraw skill installed.

## 复刻 · Reproduce

```sh
node skills/musedraw/scripts/musedraw.mjs render gallery/12-saas-tenancy-product/scene.json
node skills/musedraw/scripts/musedraw.mjs render gallery/12-saas-tenancy-product/scene.json --theme journal --out output/restyle
```

`scene.json` 是这张图的完整、可编辑来源；示例中的人名、机构与数字为说明用途。
`scene.json` is the complete editable source; names and numbers in examples are illustrative.
