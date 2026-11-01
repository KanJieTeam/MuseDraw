# 证据矩阵（evidence-matrix）

证据矩阵用于技术报告、方案评审、采购核验和办公复盘：列表示名对象，行表示明确的核验项，每个交叉单元格只保存调用者声明的证据状态。它把“已确认、部分证据、未提供、待处理、不适用”作为状态标记，避免把缺资料误画成低分或自动推断总评。

## 输入范围

- `columns` 为 2–5 个对象，每个对象有唯一 `id` 与短 `label`。
- `rows` 为 3–10 个核验项；每项的 `values` 必须与列数完全相等。
- 每个 `values[i].status` 必须是 `confirmed`、`partial`、`missing`、`blocked` 或 `not-applicable`；可选 `note` 只写输入中明确给出的短注记。
- `dataStatus` 与 `note` 必须说明数据状态和图的边界；程序不补写事实。

## 构图约定

行标题在左，候选对象在上；单元格用统一尺度的状态符号，颜色只区分状态，不表示数量、优先级或得分。整页使用纸面底色、细横线和单一青色主墨，保持核验表而不是仪表盘的阅读气质。状态说明固定放在矩阵下方，注记附着在所属单元格。

## 拒绝条件

列或行数量超出范围、列 ID 或行 ID 重复、单元格数量与列数不一致、状态不在封闭集合、文本超过上限、矩阵高度超出可读范围时拒绝生成。程序不会计算总分、排名、完整度、因果或“最佳方案”，也不会把空白单元格猜成缺失。

## 验证

运行：

```text
node scripts/musedraw.mjs core render assets/musecore/evidence-matrix.json --out <new-directory>
node --test skills/musedraw/tests/musecore/evidence-matrix.test.mjs
```

测试覆盖模型状态保真、非法状态与形状拒绝、真实 SVG/PNG 浏览器渲染、390/1024/1440 窄屏检查和中文字体高度压力。几何审计有发现、文本溢出或页面横向溢出时不得交付。
