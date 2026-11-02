# Raincloud 分布图

`raincloud` 在同一条数值轴上协调三种信息：每组原始观测的散点、由原始值线性插值得到的四分位箱体，以及固定规则计算的密度云形。每个分组保留 `source`，几何结果也写入 `sourceTraceability`，便于报告回查。

云形只是显示摘要，不是置信区间、显著性检验或概率分布拟合。程序不删除离群值、不比较组间差异、不推断因果或总体结论；需要这些判断时，应在数据和正文中显式提供适用的方法与范围。

输入为 2–6 组，每组 5–200 个有限数值。组名和来源必填，数值轴由所有输入值共同计算。未知字段、重复 id、空组、过长标签和非有限数值会拒绝生成。

```powershell
node skills/musedraw/scripts/musedraw.mjs core render skills/musedraw/assets/musecore/raincloud-demo.json --out <new-directory>
node --test skills/musedraw/tests/musecore/raincloud.test.mjs
```
