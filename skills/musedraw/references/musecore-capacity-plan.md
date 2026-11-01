# 容量轨道（capacity-plan）

容量轨道用于办公排程、科研交付和大屏监测中的“工作流 × 周期”对照。每个单元格同时画出调用者提供的容量和需求，程序只计算 `gap = capacity - demand`，并将它标为余量、平衡或缺口。

## 输入范围

- 周期 2–8 个；工作流 1–6 个。
- 每个工作流为每个周期提供非负的 `demand` 与 `capacity`，可带一条短注记。
- 数值不代表预测、人员数量或质量承诺；单位由工作流输入声明。

## 构图约定

每行是一个工作流，每列是一个周期。灰色轨道表示容量，彩色短线表示需求；颜色只表达差值状态，不能被解释为优先级。数字贴在对应单元格上，避免单独的 KPI 卡片遮断阅读路径。

## 拒绝条件

周期或工作流数量超出范围、ID 重复、每行数值数量不匹配、数值为负或超出上限、文字超长、页面高度不可读时拒绝生成。程序不会补齐缺失周期，不会把缺口转译成延期、风险或人员建议。

## 验证

```text
node scripts/musedraw.mjs core render assets/musecore/capacity-plan-demo.json --out <new-directory>
node --test skills/musedraw/tests/musecore/capacity-plan.test.mjs
```

测试覆盖差值计算、状态保真、非法形状与超量拒绝、浏览器 SVG/PNG 输出、390/1024/1440 窄屏和中文字体高度压力。
