# 多面板证据（multi-panel-evidence）

`multi-panel-evidence` 是 Nature 风格多面板图的一个窄能力。它把一张图里的
总览、比较、细节和核验分成明确的证据角色，再把每个角色绑定到来源和样本定义。
它解决的是整页统筹，不是把任意图形拼成网格。

## 输入契约

- 3–4 个面板，必须有且只有一个 `overview`；其余角色可为
  `comparison`、`detail`、`validation`。
- 每个面板声明 `plot`、`table` 或 `text`。绘图数据、状态和文字都由调用者提供，
  不从标题或相邻面板推断。
- `plot` 面板必须共享相同的类别身份和 `shared-zero` 标尺；数值非负，误差范围
  绑定到同一个类别。`table` 的每个单元格显式声明状态，`text` 的每个块显式声明
  标签和正文。
- 每个面板必须列出一个或多个 `sourceIds`，来源只做追溯，不证明内容真实。

## 构成规则

总览占第一阅读位置；3 面板时总览独占上排，比较和细节按权重分配下排；4 面板
时按总览/比较、细节/核验两排组织。`weight` 只控制同排的空间比例，不能改变
证据角色。量化面板共用类别、零点、组身份和图例；状态面板以状态点和标签表达
边界，不把缺口压成一个分数。

## 明确不支持

当前版本拒绝独立归一化、不同类别之间的硬对齐、从预览图反推数据、自动计算显著性
或因果关系，以及真实显微图、地图和装置照片的伪造。超出这些前提，应改用更合适的
单面板能力或保留原始资产。

## 使用与验证

```powershell
node skills/musedraw/scripts/musedraw.mjs core render `
  skills/musedraw/assets/musecore/multi-panel-evidence-demo.json `
  --out outputs/multi-panel-evidence-demo
node --test skills/musedraw/tests/musecore/multi-panel-evidence.test.mjs
```

几何通过不等于审美通过；仍需在实际目标尺寸看图，确认读者问题、主面板和证据边界
是否一眼可读。
