# ROC–PR 双曲面

`roc-pr-curve` 把同一组已登记的阈值操作点放在两个坐标面中：左侧使用假阳性率和真阳性率，右侧使用召回率和查准率。它只重排调用方提供的数值，保留每个点的阈值与 `source`，并计算沿输入顺序的梯形面积汇总。

它不训练分类器，不推断阳性比例，不生成置信区间，不选择推荐阈值，也不把面积解释为跨人群泛化性能。ROC 的对角线只是随机排序的几何参照；如果需要基线、校准或不确定性，调用方必须明确提供另一种适用的能力。

输入范围为 6–60 个操作点。阈值必须非递增；ROC 的两项横纵坐标和 PR 的召回率必须非递减，并分别覆盖 ROC 的 `(0,0)`、`(1,1)` 与召回率 `0→1`。每个点必须有唯一 id、有限率值和可追溯的 `source`。超出边界、顺序不明或混入未声明字段会拒绝生成。

```powershell
node scripts/musedraw.mjs core render skills/musedraw/assets/musecore/roc-pr-curve-demo.json --out <new-directory>
node --test skills/musedraw/tests/musecore/roc-pr-curve.test.mjs
```
