# 直方图：已分箱频数与外部给定摘要

`grouped-test-scores.json` 使用 `histogram` 的可选 `dataMode: "binned"` 分支。它不替换原始记录示例 `histogram.json`。省略 `dataMode` 的旧原始记录分支保持原计算与画法。

来源是 `gallery/collections/visual-cases/155-histogram/source.svg`、作者说明和来源 metadata。原作是作者生成的教学示例，不是已经核实的真实班级调查。给定边界为 `[40,50,60,70,80,90,100]`，频数为 `[0,5,12,21,6,6]`。SVG 写有均值 74.3、中位数 72.5、最低 53、最高 100；这些材料没有提供用于复算的 50 条原始成绩。

分箱输入必须显式提供 `counts`、`edges`、`closure: "left-closed-last-inclusive"`、`density` 与 `frequencyPolygon: "none" | "midpoints"`。它与 `values` 互斥，不生成虚拟原始记录。允许 3–16 个有限递增箱、非负整数频数、总频数 1–2000；零频数箱保留，总频数 0 拒绝。边界绝对值不超过 10⁹、跨度至少 10⁻⁹，每箱宽至少为总跨度的 1%。这些是该数值和构成域的限制，不是统计定律。

`calculated` 只包含从箱数据可确定的量：总频数、箱宽、相对频数、柱高、最高频数组和最高柱组。计数柱仅用于等宽箱；不等宽箱强制使用频率密度 `count / (n × width)`，所有柱面积之和为 1，纵轴单位为横轴单位的倒数。最高频数组和最高密度组分别保存。屏幕上的 `bars` 几何与数值箱宽分开保存，避免混淆单位。

等宽箱可选择频数折线。顶点是实际给定箱的中点及该箱频数；本例恰有六点 `(45,0)…(95,6)`。不在两侧添加虚构的零频数记录。不等宽箱不画频数折线。最后一个箱包含右端点，但它的数值宽度仍为 `100−90=10`，不因包含端点而变宽。

可选 `reportedSummary` 必须有 `given: true` 和 `source`，可提供数值 `mean`、`median`，以及成对的 `minimum`、`maximum`。它们在图上单列为“外部给定摘要”；输出 `reported` 保留原值、出处与未由原始记录复算的状态。给定极值之差 47 只来自 `100−53`，不是对极值的独立验证。未给摘要时不制造均值、中位数或零值。字段与支持区间检查不等于已验证摘要和未知原始记录一致。

仅有分箱信息不能恢复原始数据的精确均值或中位数；组中值加权均值也只是估计，本分支不自动计算它。[OpenStax：分组频数表的均值](https://openstax.org/books/introductory-statistics-2e/pages/2-5-measures-of-the-center-of-the-data)、[OpenStax：直方图与频数折线](https://openstax.org/books/introductory-statistics-2e/pages/2-2-histograms-frequency-polygons-and-time-series-graphs)。

构成按完整数字的实测宽度分配柱图宽度，画布预算为 3200 px；超出时明确拒绝，报告所需宽度与最窄箱宽。可由调用方选择按频数求和合并相邻给定箱，或分图；程序不自动改箱、缩字号或截断数字。源外辅助闭合点与缺失的原始 50 条成绩均不在该来源输入覆盖范围内，不声称全部原图复刻。
