# 留存队列：可选聚合与最小支持

沿用 `cohort`、factory `comparisonFamilies`。原输入不提供 `retentionSummary` 时，保留原pool计数计算、3–10期范围与SVG/PNG；其他comparison家族不改。新分支不是留存预测、统计检验或因果推断。

构成参考源183客户留存，原SVG SHA-256：`b2b671bc599ccfbf0b8363a5cfcebca02bc48d2d01f1ce927f3329abf57e4c1d`。源说明12期、各队列等权均值及曲线至少两个队列；报告M3为42.3/54.6，主图显示42/55。完整原始留存人数未随原稿发布，不能将舍入百分比乘队列规模造整数或反推原算法。新 `cohort-equal-summary.json` 明确是12队列×12期的合成整数教学数据，实际M3显示44.8/63.1，不声称复现源42/55。

## 输入

```json
"retentionSummary": {
  "aggregation": "equal-cohort",
  "minimumCohorts": 2,
  "note": "完整调用者聚合注记"
}
```

缺省关闭；null/空对象/缺字段/未知字段拒绝。aggregation必须显式选择 `pooled` 或 `equal-cohort`；minimumCohorts为整数1–12；note为1–300 Unicode字。根note及选项note完整保留，不自动改写调用者文字。

启用分支支持3–12个唯一共同离散成熟期、3–12个唯一队列、恰两组且各组至少一个队列。focusPeriod指非零已有期。分组由输入提供，不从月份名称或颜色推断干预；成熟期按明确输入顺序排布，不从标签推真实观察日期。每队列size为1–1000000整数，counts长度等于期数，首期严格等于size，后续为0–size整数或null；null只允许尾缀。允许已观察计数回升，不假定客户永久流失。0规模、分数人数、超界计数、内部缺测恢复、未知当0和自由weights/坐标均拒绝。

人数上限是本教学模型的有限精确计算与信息预算，不声称更大真实队列在数学或物理上不可能。文本同时受字号/行数/画布预算约束，超出时明确拒绝，不截字。新helper只有 `cohortRetentionSummaryModel` 是导出入口；连续分段函数是验证后模型的内部步骤，不是另一个用户API。

## 同源计算与支持

每组每期只取counts非null的队列；观察到0留存仍计作一个已观察队列。

- pooled = 已观察count总和 / 这些队列size总和，沿用原估计对象。
- equal-cohort = 各已观察队列(count/size)的等权均值，每个队列一票。

BigInt有理数计算并约分，可发布均值和焦点百分点差均有exact numerator/denominator字符串；绘图用有限Number副本。百分比显示舍入不参与后续计算，也不从热力表反造人数。

每期保留实际cohortIds、队列数、原人数分子/分母和三态：`no-observation`（0队列）、`insufficient-support`（>0但少于门槛）、`supported`。前两态value/exact严格为null，不能代0或发布不足支持的均值；已有个体队列计数/热力格仍保留。

曲线只连接连续supported段；null结束一段，不过滤缺口后跨接。当前尾缀观察约束下支持随成熟期减少，合法输入通常是尾部缺口，不因此推补未来或放开内部缺测。真正0均值仍有0基线上的点，与不画点的缺测/不足不同。图下逐期显示两组参与队列数，低于门槛的n灰显；不是固定相同队列组成的连续追踪。

任一组焦点不足，focus.values、differencePoints和differenceExactPoints全部null；红带只显示“焦点期支持不足”、两组n与门槛，不继续给成对百分比或差值。全组不足时无曲线/点，显示明确空状态，不伪造0留存。

## 构成和证据

可选视图保留瑞士海报大字/出血红带、阶梯热力表和同一成熟期曲线；热力表、曲线、支持数共享期序和横向网格。固定大标题71、有效hero104、表格/正文至少20px，行高/表行按实际字体重排；所有原人数、null、标签和notes保留。metadata使用compositionReference，调用者输入不因此成为来源原始数据。

独立手算：50/100与10/10等权=(1/2+1)/2=3/4，pooled=60/110=6/11；5/20与40/80等权3/8，pooled45/100=9/20。等权焦点差为-37.5百分点，允许负值。M2一组只有1队列不足，另一组两个已观察0值仍是有效0均值。

正式纯测试以220组新合成输入的独立非约分公共分母方程核验exact有理数、支持和分段，不调用产品GCD/有理数helper。scratch另有独立Python Fraction220场景/3342组期证据，不重做root已确认的旧14组期pooled检查。生产测试只用editorHtml/MuseCore.render/audit，检查真实格子边界、逐期参与数、缺口/0点和不支持焦点不出数。独立Skill缺gallery时仅来源hash项明确skip，其他输入事实/oracle/browser测试仍运行。审计不是审美批准。

repo外 `outputs/musecore-cohort-summary-gap-runtime-20261031` 保留来源、旧CLI、契约、失败首稿、独立Fraction、手算、普通/+40、Noto和正式兼容证据。兼容基准来自SHA `113a98ceed1925c88c543f97a93f9989f1f546a621d96a13d9bc04723619c4c6` 的已冻结survey修复文件；定点cohort入口/必要import/末尾独立view之外的原字节保留。
