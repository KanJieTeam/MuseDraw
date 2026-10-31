# 招聘漏斗：给定渠道计数、费用口径与用时箱

`recruiting-channel-review.json` 是既有 `funnel` 的可选 `recruitment` 视图，不替换 `funnel.json`。省略 recruitment 时保留旧计算与画法；不是排班、招聘优化、个人流失原因推断或招聘结果预测。

来源为 `gallery/collections/visual-cases/187-recruiting-funnel/source.svg`、`author-notes.md` 与 `source-meta.json`。这些是作者生成的示例，不是真实招聘记录。七阶段给定计数为2400、480、210、96、38、22、17。来源底表给定四渠道投递180、1600、120、500；原标“入职”6、5、4、2；原给每人成本8000、24000、90000、30000元，未给单价取整精度或独立总费用记录。

原稿有一处事件口径歧义：最后阶段为“接受录用”，顶端和来源列又称“入职”；用时标题明确写“投递到接受录用”。本输入把主链和用时绑定到接受录用，渠道保留原标入职并标未核对。合计都是17不证明两者是同一事件或同一人群。官方资料也区分 offer-accepted 与 entry-on-duty 的结束事件；这里只借其术语区分，不引入美国政府的招聘目标天数。[美国内政部 IBC：Time to Hire](https://ibc.doi.gov/HRD/hr-services/supervisor-toolkit/time-to-hire)

## 阶段与辅助口径

主链必须是调用方声明的同一嵌套队列，3–8阶段、唯一id、非增的非负safe整数人数，首阶段大于0。扩展视图的各计数在0–10000000之间。逐关转化为本阶段/上一阶段，总转化为末阶段/首阶段；上一阶段为0时逐关比率未定义。log长度明确为log10(人数+1)，所有阶段必须正数；linear可有零结果。像素材料不代表一块对应一个人。

`recruitment.mainEndpoint` 只给 `{stageId:最后阶段id}`；名字从该阶段派生。辅助endpoint可以是 `{type:"stage",stageId}`，名字同样从已知阶段派生，不另给label；或 `{type:"external",id,label}` 显式不同事件，其id不得冒用已知stage。用时start只引用已有stageId。

渠道/用时的 `relationship` 必须明确为 `same-cohort` 或 `unverified`。前者是调用方给出的同队列声明，程序另核对终点身份和计数合计；不是凭数字证明真实身份。后者只计算该辅助数据自己的比率，分别记录numericMatches、endpointMatches，并保留reconciled:false。来源渠道正是后者。至少提供一种辅助视图；省略另一种可以，显式null/false拒绝。用时的reported摘要显式null也拒绝，不吞成缺省。

渠道2–6行，应用数与结果数非负整数、结果不大于应用数；denominatorStageId必须指首stage。每行转换率=结果/应用数，零分母为null。合并转换率=sum(结果)/sum(应用数)，不平均渠道百分比。来源合并比率17/2400≈0.7083%，四渠道率的算术平均约1.8448%，不是总体率。

## 给定单价与可计算单价分开

cost缺省或null表示未知，不画0。仅支持明确CNY整数分 `amountMinor`，范围0–1000000000000分；这是数值/构成范围。`precision` 必须为 unspecified、nearest-yuan、nearest-cent 或 exact-minor-unit，source必填。nearest-yuan给定值必须是整元。整数分是输入表示单位，不会把来源未说明的实际精度提升为精确到分。

- `kind:"given-per-outcome"` 保存外部给定单价，图中带*与给定精度说明；reportedPerOutcome保留，总费和perOutcomeRatio为null。不乘结果人数恢复未知实际总费。该行结果为0时拒绝未定义的给定单价口径。
- `kind:"given-total"` 保存明确给定总费用，按该行结果数计算单价；结果为0时单价null。metadata的perOutcomeRatio保留整数分分子、结果数分母、roundedMinor及舍入口径。展示为非负half-up四舍五入至分，只在发生舍入时加≈。例如1分/3结果显示≈0元，不能解释为精确零成本。精确整数分结果不加约号。
- 只有每行均给explicit total时才以整数分求合计；混合单价/总费或未知费用不推出组合总费。6行允许的分金额之和仍在safe整数域；不把浮点尾差叫作精确费用对账。

来源单价的precision为unspecified，totalExpense保持null。作者说明的猎头费估算并未提供整个渠道的独立费用流水，不能补造。

## 给定用时箱与源给摘要分开

本辅助视图接收等宽edges/counts，3–12箱、日单位、非负递增边界0–3650、每箱宽至少占总域4%，总频数1–2000。零频数箱保留，总频数0或不等宽箱明确拒绝；不等宽密度图可使用现有histogram能力单独呈现。这些是构成域，不是招聘规律。

原SVG的七组可见方块数为 `[0,4,6,3,3,1,0]`，共17；原标签为10–19、20–29、…、70–79天。公开材料未提供17条个人用时或形式化闭合约定。本来源输入明确采用 `[10,20)` … `[70,80)`、`closure:"left-closed-right-open"` 来解释这些给定箱，并在asset的note/source中声明这一解释；不宣称恢复原始分箱算法，不用它验证未知原始记录。图中保留明确区间符号。

原给中位数34天、最快22天、最慢64天保存于reported，必须given:true/source；不从箱数据计算相同的精确摘要，也不补造17条原始用时，rawObservations为null。程序只核对字段、支持区间、极值次序与摘要之间基本一致，不证明摘要与未知原始值相符。省略摘要则不制造中位数。分箱信息不足以恢复精确原始统计量。[OpenStax：分组频数与中心度量](https://openstax.org/books/introductory-statistics-2e/pages/2-5-measures-of-the-center-of-the-data)

same-cohort用时视图start须引用首stage，end须引用末stage，频数之和须等于末阶段人数。对来源输入，它表示按原稿的投递→接受录用定义呈现给定示例计数；不验证个人身份、实际录用日期或实际入职天数。

## 构成与退出范围

视图保留霓虹网格、像素关卡、粉色终点；主链、来源表和给定用时箱各保自己的数值口径。标题、注释和标签保全，按实际字宽/字体高度重排；箱端点只在逗号处换行，不拆数字，不缩小字号硬塞。完整数字超过单箱宽度时明确拒绝，要求减少同页箱数或拆成独立辅助图。共有SVG画布范围仍适用，全部文字上限同时叠加不保证能塞进一页。

源图1600×1000，候选默认约1600×1272，画布增加是完整可读信息的代价；不声称原图坐标或全部视觉细节复刻。原费用总额、个人时长、岗位级别与真实事件对齐仍是缺失项。通过数值/几何检查不等于审美批准。
