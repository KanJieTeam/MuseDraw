# 成对测量一致性图

`agreement-plot` 把每对测量压缩成两个可追溯的量：两次读数的均值与“第二次减第一次”的有向差值。图中保留每一对原始读数、派生坐标和 `source`，并由调用方显式提供参考差值与上下界限。

程序不自动计算接受界限，不把平均差值解释成系统偏差，不执行一致性检验，不生成置信区间，也不推断总体、仪器有效性或因果关系。界限只是输入的绘图标注；它们的来源和适用条件必须在正文中说明。

输入范围为 5–120 对有限读数。每对必须有唯一 id、两个数值和来源；参考差值必须严格位于上下界限之间。未知字段、重复 id、缺少来源、非有限数值或无效界限会拒绝生成。

```powershell
node skills/musedraw/scripts/musedraw.mjs core render skills/musedraw/assets/musecore/agreement-plot-demo.json --out <new-directory>
node --test skills/musedraw/tests/musecore/agreement-plot.test.mjs
```
