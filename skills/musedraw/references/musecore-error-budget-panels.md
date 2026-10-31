# 错误预算的可选计算双表

沿用 `error-budget`。缺省不提供 `panels` 时，原输入、原计算及原构成保持兼容；`rolling-update` 不受影响。新增的是预算对照与恒定率教学情景换算，不是告警器、真实监控采样、滑动窗口控制器或发布策略执行器。

## 原稿与默认身份

构成参考 `101-error-budget`，原SVG SHA-256：
`d53f4156316c2cafd8976d5cdee3c08fde34cb984b4f56230a97a117fe2dd58a`。
原稿/作者说明给出30天、SLO99.9%、43分12秒额度、五档目标预算与三行速率/窗口换算。原月曲线标明示例，三次故障12.5/21/6分钟合计39.5，另含每天0.12–0.32分钟零星消耗；未发布逐日原始数组或精确故障时刻。不得凭这三次时长、图形像素或“第26天耗尽”文字反造原始日志。

新 `error-budget-evidence.json` 的双表参数取自来源明确示例；上方8/15/25分钟消费事件仍是明确合成输入，不声称复现源逐日曲线、首次耗尽日期或未发布算法。`evidenceKind:source-adapted-teaching` 是调用者来源声明，不是程序验真的观测结论。新分支metadata只用 `compositionReference`，不把任意新输入称为来源原始数据。原 `error-budget.json` 保留。

## 输入与计算

原主模型 `timeErrorBudget` 不改：根 `windowMinutes` 1–129600分钟、`target`0.5–1、已观察截止及0–12个正时长事件。仍取重叠/相接区间并集、计算额度/消耗/有符号余额/耗尽时刻，未观察未来不补0；时间型预算不变成请求型SLI。

可选 `panels` 必须为对象，显式null/空对象不是缺省。严格字段：

- `evidenceKind`：synthetic-teaching / supplied-teaching / source-adapted-teaching。
- `comparisonTargets`：2–6条 `{id,target}`，ID唯一、目标不重复，数学有效域0–1；必须包含根target用于同值强调，不把表中目标按颜色反推。对照目标允许0/100%；根target仍保持原主模型0.5–1域。
- `burnRateScenarios`：0–4条 `{id,rate,windowMinutes,action}`。ID唯一，rate0–1000000，情景窗口>0且≤根窗口。空数组只显示对照表，不造空告警表。rate0是明确零，未知/null不代0。
- `note`：完整给定注记1–300字；action为完整调用者文字1–40字，只显示，不发通知、提工单或推断组织已经执行。根note和panel note均保留。

启用面板时，根window/target与所有新数值只接最多6位小数的十进制Number（最短十进制表示，支持1e-6），超出精度明确拒绝；不靠epsilon修补边界。时间输入统一分钟，不接隐式hours等单位。helper直接接同一 `b.windowMinutes/b.target`，不另行换算或舍入后交给曲线。主模型原Number计算和双表精确十进制有理数描述同一输入。

独立helper `errorBudgetPanelsModel({windowMinutes,target,panels})` 用BigInt约分，exact返回JSON可序列化的numerator/denominator字符串；图形可用有限Number副本。计算：

1. 每档额度 = 统计窗口 × (1 − 该档target)。
2. 情景恒定不可用比例 = rate × (1 − 根target)。
3. 情景不可用分钟 = 恒定比例 × 情景窗口。
4. 消耗预算份额 = rate × 情景窗口 / 统计窗口。

恒定不可用比例>1拒绝（时间型不可用比例不能超过100%），恰1允许；预算份额>1允许且明确标“超预算”，不截断100%。根target=1且情景非空时归一燃烧速率无定义，拒绝；可以只做包含100%零额度的对照表。两张表不从主曲线测得rate，也不根据某行参数判定真实告警已经触发。

显示最多6有效位；若需舍入明确≈，正小量不得显示成精确0；exact有理数留在metadata。主额度时间显示至秒（保留明确舍入说明），公式的近似用≈而非伪造等号。非整天统计窗口显示原分钟值，避免暗中按天舍入。

## 来源参数与权威边界

五档99/99.5/99.9/99.95/99.99%在43200分钟中分别为432/216/43.2/21.6/4.32分钟。
三行14.4×60/43200=2%、6×360/43200=5%、1×4320/43200=10%；在99.9%根目标下，分别对应0.864/2.16/4.32分钟不可用。

这些关系见Google官方[Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)的燃烧速率说明与Table5-6。该表给的是需按服务调整的起点；同章后续多窗口策略另要求长短窗口条件，不能把本单窗口参数表说成完整Google告警配置。源“暂停功能发布”也只是示例政策；[Example Error Budget Policy](https://sre.google/workbook/error-budget-policy/)不能推出所有组织的发布决定。

## 构成与验证

可选分支保留大数字与出血红带，以同一trace构成零线上黑面积、零线下红面积；分离几何clip不改变消费数值。双表用独立的比例/分钟列，速率、窗口、额度份额、不可用时长及给定动作同源。全部原事件与两份note保留，文字按实际font metrics重排，固定字号与明确行数预算；超过预算拒绝，不截字、不删用户注记。零额度且无消费只画0基线，不造0..1预算量轴。数值单元格保持完整单行字符串（含科学计数与≈），按实际22px字体、字重测量列宽；页面仅增加超出默认列宽的部分，主曲线、红带、事件列及注记同步扩宽。默认保持1200px，已验证数量上限算例为1250px（增加50px），微小量的完整科学计数字符串算例为1332px（增加132px）；不以缩字号或硬拆数字适配。

纯测试使用400组独立直接scaled-integer方程交叉相乘，不调用产品有理数运算/GCD；核对五档/三行手算、0目标对照、100%目标、rate0、小正量、恰等/透支和>100%不可用拒绝。正式浏览器测试只经 `editorHtml/MuseCore.render/audit`；逐单元格实际getBBox包含、全部原事件/动作/note、观察截止与曲线比例、普通/+40均单独检查。独立Skill缺gallery时仅来源hash项明确skip，其他测试仍执行。审计不代表审美认可。

repo外证据目录 `outputs/musecore-error-budget-gap-runtime-20261031` 保留源图、旧成图、6正6负真实CLI边界、独立并集和几何核验、三次明示时长仅39.5的证据、scratch契约/精确oracle、01/02/03草稿、正式生产结果和旧default/rolling-update SVG/PNG兼容记录。开发preview与正式registry证据区分。
