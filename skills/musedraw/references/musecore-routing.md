# MuseCore 能力路由

路由器先回答“读者要看什么关系”，再选择窄能力。它不读取主题词猜风格，
也不把未知请求静默降级成卡片网格。

```powershell
node skills/musedraw/scripts/musedraw.mjs core route route-input.json
```

最小输入必须声明：

- `readerTask`：读者任务，如 `multi-panel-evidence`、`apparatus-measurement`、
  `swimlane` 或 `timeline`；
- `readerQuestion`：一句可观察的阅读问题；
- `evidenceType`：量化、状态、机制、装置、空间、图像、表格或流程；
- `hasRawData`、`hasSourceAsset`、`hasCoordinates`、`hasSharedSubstrate`：证据事实，
  不由路由器推断；
- `panelCount`、`objectCount`、`labelCount`：规模声明；`labelCount` 当前只保留为描述，字宽和标签密度由各能力检查，不能据此推断文字已经放得下。
- `requestedFormat`（可选）：`svg`、`png`、`html` 或 `pptx`。现有能力输出前三种；`pptx` 会明确拒绝并建议原生演示对象路线，不会把插入一张图片当成可编辑演示文稿。

按任务追加的声明：

- `multi-panel-evidence` 必须有 `plotPanelCount`，取值为 1 到 `panelCount`，并声明有数据。当前模型必须包含至少一个正值数据图，只接受数据图、状态表、说明文字，不接受纯表格/纯文字或源图面板。声明不等于验证，实际数据仍须通过模型的共用类别、数值域及来源检查。
- `operations-board` 必须声明 `evidenceType: "status"` 并有原始或汇总趋势数据。它只接受一个当前指标、2–4 个登记状态信号、一个 3–12 点趋势和 2–8 个明确的队列事项；不会把主题词推断成实时状态、负责人或优先级。
- `risk-matrix` 必须声明 `evidenceType: "status"`、`hasRawData: true` 和 `riskKind: "likelihood-impact"`。当前能力只接受 1–18 个事项、两条已登记的离散等级轴和连续的严重度分段；不会从“风险”一词推断概率、损失或责任。
- `decision-tree` 必须声明 `evidenceType: "workflow"`、`decisionKind: "explicit-branch"` 和 3–18 个节点。当前能力只接受一个问题、相邻层级的显式分支和可达出口；不会从主题词推断概率、置信度、责任人或推荐结论。
- `evidence-matrix` 必须声明 `evidenceType: "table"`、`hasRawData: true`、`matrixKind: "evidence-status"`，并明确 `columnCount` 为 2–5、`rowCount` 为 3–10。每格只能是已确认、部分证据、未提供、待处理或不适用等登记状态；不会自动计算得分、排名、完整度或因果。
- `capacity-plan` 必须声明 `evidenceType: "quantitative"`、`hasRawData: true`、`capacityKind: "period-stream-gap"`，并明确 `periodCount` 为 2–8、`streamCount` 为 1–6。程序只计算 `capacity - demand`；不会把缺口推断成延期、人员建议、预测或质量结论。
- `dashboard-focus` 必须声明 `dashboardKind: "single-question"`、`hasRawData: true` 和一个 `heroRelation`（`spatial`、`process`、`comparison`、`trend`、`inventory`），并保持 2–8 个主视图/辅助证据对象。当前看板只服务一个运营问题；不会用装饰主图、重复 KPI 或未声明时点冒充态势。
- `measurement-scales` 必须声明 `evidenceType: "quantitative"` 和已提供的尺度事实。类别、等间隔、零点和单位必须由输入明确给出；程序不从变量名称猜测定类、定序、定距或定比。
- `claim-trace` 必须声明 `evidenceType: "status"` 或 `"table"`，并提供至少 3 条主张、3–12 条来源和逐条关系。主张层级、来源状态及支持/相反/待核关系均由输入声明；不会从语气补造因果、置信度或缺失证据。
- `chart` 若声明 `chartKind: "scatter-evidence"`，必须同时声明 `evidenceType: "quantitative"`、`hasRawData: true` 和 2–6 个观测组（`objectCount`）。此路线保留每个原始观测点，只计算描述性摘要与可选的逐组普通最小二乘线；不会补造显著性、因果或异常值结论。未声明 `chartKind` 的普通数据图仍返回 `select-data-grammar`，不静默选择散点结构。
- `cohort-flow` 必须声明 `flowKind: "nested-funnel"` 才能选择 `funnel`。`branch-rejoin` 明确拒绝，未声明时不猜测。funnel 的 3–8 层、计数非递增和嵌套队列含义由对应契约继续检查。
- `spatial-field` 必须声明坐标、数据以及 `fieldKind: "regular-height-grid"`，才会选择真实存在的 `contour-field`。这仅是规则高程网格的候选路线；以米为单位、网格间距、等高线拓扑等由模型验证。其他场量或散点采样不能直接套用高程能力。

路由结果有四种：

- `route`：选择一个已注册的候选能力族及其范围说明，仍需填写和验证该族的输入；
- `select-data-grammar`：未声明专门 `chartKind` 的普通 `chart` 请求尚不足以确定具体图形，返回真实的 `scripts/plot_data.py` 路线和 `references/data-figures.md`，要求按比较任务选择 line、scatter、bar、interval、heatmap、paired 或 observations。它不是 MuseCore family，也不是已经通过的数据规格。该工具直接输出 SVG/PNG，HTML 需另选路线；
- `preserve-source`：源图本身是证据，保留它并只添加受控标注；
- `refuse`：列出越界原因和可行替代路线。

对象数的 25 个路由上限只用于当前的结构/面板候选；普通数据图和规则网格不把观测值数量误当成对象上限，密度和容量由具体绘图工具检查。`preserve-source` 的 `source-image` 是处理策略标识，不是可传给 `core render` 的 family。

当前路由只承诺选择能力，不替调用者填写内容。比如装置测量没有二维坐标时会
明确拒绝；多面板没有数据图或原始数据时不会从预览图反推；未知任务不会自动套用
四列卡片。路由通过后仍需运行对应能力的输入契约、浏览器几何审计和目标尺寸
人工审阅。

`node skills/musedraw/tests/musecore/routing.test.mjs` 会核对路由返回的 family 确实注册在当前运行时中、引用文件实际存在，并覆盖缺失数据、源图面板、场量范围、分支队列和输出媒介拒绝。这些是候选选择的执行测试，不证明宿主声明真实、语义映射正确或审美达标。
