const need=(ok,msg)=>{if(!ok)throw Error(msg)};
const text=(v,label,max=180)=>{need(typeof v==='string'&&v.trim().length>0,`${label}: nonempty text required`);need([...v].length<=max,`${label}: exceeds ${max} characters`)};
const enumValue=(v,values,label)=>{need(values.includes(v),`${label} must be one of ${values.join(', ')}`);return v};

const TASKS=['multi-panel-evidence','mechanism-chain','condition-comparison','apparatus-measurement','cohort-flow','spatial-field','swimlane','timeline','entity-chain','operations-board','risk-matrix','decision-tree','evidence-matrix','capacity-plan','dashboard-focus','decision-register','calibration-plot','measurement-scales','image-evidence','chart'];
const EVIDENCE=['quantitative','status','mechanism','apparatus','spatial','image','table','workflow'];

/**
 * Explicit routing only. This does not classify prose or infer geometry from a
 * topic; a host must declare the reader task and evidence facts first.
 */
export function routeMuseCore(input){
 need(input&&typeof input==='object'&&!Array.isArray(input),'route input must be an object');
 const allowed=['readerTask','readerQuestion','evidenceType','hasRawData','hasSourceAsset','hasCoordinates','hasSharedSubstrate','flowKind','fieldKind','riskKind','decisionKind','matrixKind','capacityKind','dashboardKind','heroRelation','panelCount','plotPanelCount','columnCount','rowCount','periodCount','streamCount','objectCount','labelCount','requestedFormat'];
 for(const k of Object.keys(input))need(allowed.includes(k),`route input.${k}: unsupported field`);
 enumValue(input.readerTask,TASKS,'readerTask');text(input.readerQuestion,'readerQuestion',240);enumValue(input.evidenceType,EVIDENCE,'evidenceType');
 for(const k of ['hasRawData','hasSourceAsset','hasCoordinates','hasSharedSubstrate'])need(typeof input[k]==='boolean',`${k} must be boolean`);
 if(input.flowKind!==undefined)enumValue(input.flowKind,['nested-funnel','branch-rejoin'],'flowKind');
 if(input.fieldKind!==undefined)enumValue(input.fieldKind,['regular-height-grid','other-spatial-field'],'fieldKind');
 if(input.riskKind!==undefined)enumValue(input.riskKind,['likelihood-impact','other-risk-register'],'riskKind');
 if(input.decisionKind!==undefined)enumValue(input.decisionKind,['explicit-branch','register','other-decision'],'decisionKind');
 if(input.matrixKind!==undefined)enumValue(input.matrixKind,['evidence-status','other-matrix'],'matrixKind');
 if(input.capacityKind!==undefined)enumValue(input.capacityKind,['period-stream-gap','other-capacity'],'capacityKind');
 if(input.dashboardKind!==undefined)enumValue(input.dashboardKind,['single-question','other-dashboard'],'dashboardKind');
 if(input.heroRelation!==undefined)enumValue(input.heroRelation,['spatial','process','comparison','trend','inventory'],'heroRelation');
 for(const k of ['panelCount','objectCount','labelCount','columnCount','rowCount','periodCount','streamCount']){if(input[k]!==undefined)need(Number.isInteger(input[k])&&input[k]>=0,`${k} must be a nonnegative integer`);}
 if(input.plotPanelCount!==undefined)need(Number.isInteger(input.plotPanelCount)&&input.plotPanelCount>=0,'plotPanelCount must be a nonnegative integer');
 if(input.requestedFormat!==undefined)enumValue(input.requestedFormat,['svg','png','html','pptx'],'requestedFormat');
 const refuse=(code,message,alternatives=[])=>({decision:'refuse',code,message,alternatives,readerTask:input.readerTask,readerQuestion:input.readerQuestion});
 if(input.requestedFormat==='pptx')return refuse('unsupported-output-format','这些能力输出 SVG、PNG 和离线 HTML；不能把可编辑 PPTX 请求当成已经满足。',['native-presentation-objects','confirm-static-image-in-slide']);
 if(!['chart','spatial-field'].includes(input.readerTask)&&input.objectCount>25)return refuse('too-many-objects','超过当前路由的单页 25 个对象范围；拆页或改用专门的密集表格/数据视图。',['split-page','evidence-matrix']);
 if(input.evidenceType==='image'&&!input.hasSourceAsset)return refuse('source-image-required','图像是证据本体，但没有授权源图；不能用示意图伪造实证像素。',['provide-source-image','text-or-schematic']);
 if(input.readerTask==='multi-panel-evidence'){
  if(input.panelCount<3||input.panelCount>4)return refuse('panel-count-out-of-range','多面板证据能力只接受 3–4 个有角色的面板。',['split-page','evidence-chain']);
  if(input.evidenceType==='image')return refuse('image-panel-unsupported','当前多面板能力只容纳数据图、状态表和说明文字；不能替换需要保留的源图面板。',['image-evidence','custom-representation']);
  if(!input.hasRawData)return refuse('raw-data-required','当前多面板能力至少需要一个含正值观测的数据图；纯状态表或纯文字不在范围内。',['provide-data','evidence-matrix','custom-representation']);
  if(input.plotPanelCount===undefined)return refuse('plot-panel-count-required','请声明实际数据图面板数；有数据不等于页面包含数据图。',['declare-plot-panel-count']);
  if(input.plotPanelCount<1||input.plotPanelCount>input.panelCount)return refuse('plot-panel-count-out-of-range','数据图面板数必须为 1 到 panelCount；其余面板只能是状态表或文字。',['custom-representation']);
  return {decision:'route',family:'multi-panel-evidence',reference:'references/musecore-multi-panel-evidence.md',reason:'explicit panel roles and shared evidence question'};
 }
 if(input.readerTask==='condition-comparison'){
  if(!input.hasSharedSubstrate)return refuse('shared-substrate-required','条件对照必须声明共同 substrate、方向和相位。',['multi-panel-evidence','custom-representation']);
  return {decision:'route',family:'condition-comparison',reference:'references/musecore-condition-comparison.md',reason:'same substrate with declared condition marks'};
 }
 if(input.readerTask==='apparatus-measurement'){
  if(!input.hasCoordinates)return refuse('coordinates-required','装置测量图需要每个部件的二维位置；没有坐标只能画概念关系。',['provide-coordinates','custom-representation']);
  return {decision:'route',family:'device-measurement',reference:'references/musecore-device-measurement.md',reason:'explicit apparatus geometry and measurement path'};
 }
 if(input.readerTask==='mechanism-chain'){
  if(input.evidenceType!=='mechanism')return refuse('mechanism-evidence-required','机制链需要声明 mechanism 证据类型；不要把主题词当成机制关系。',['declare-mechanism-evidence','custom-representation']);
  if(!input.hasRawData)return refuse('raw-data-required','机制链需要节点读数、区间和来源指针；没有这些事实不能补画机制链。',['provide-data','custom-representation']);
  return {decision:'route',family:'mechanism-chain',reference:'references/musecore-mechanism-chain.md',reason:'one declared molecular-to-organism chain with explicit evidence modes'};
 }
 if(input.readerTask==='image-evidence')return input.hasSourceAsset?{decision:'preserve-source',family:'source-image',reason:'retain authorized image, channel identity and scale bar'}:refuse('source-image-required','图像证据必须保留源图。',['provide-source-image']);
 if(input.readerTask==='spatial-field'){
  if(!input.hasCoordinates)return refuse('coordinates-required','空间场需要明确的坐标；不能从名称或截图推断空间位置。',['provide-coordinates']);
  if(!input.hasRawData)return refuse('raw-data-required','等高线能力需要明确的高程网格数据。',['provide-data','image-evidence']);
  if(input.fieldKind!=='regular-height-grid')return refuse('spatial-field-scope-required','当前路由仅支持以米为单位的规则高程网格；其他场量或采样结构需另选能力。',['declare-regular-height-grid','custom-representation']);
  return {decision:'route',family:'contour-field',reference:'references/musecore-terrain-response.md',reason:'explicit regular height grid; the family validates metric units, spacing and topology'};
 }
 if(input.readerTask==='operations-board'){
  if(input.evidenceType!=='status')return refuse('status-evidence-required','运营看板需要声明 status 证据类型；不要把主题词当成实时状态。',['declare-status-evidence','custom-representation']);
  if(!input.hasRawData)return refuse('raw-data-required','运营看板需要显式趋势观测和登记状态；没有数据不能补画当前态势。',['provide-data','custom-representation']);
  return {decision:'route',family:'operations-board',reference:'references/musecore-operations-board.md',reason:'one declared operational headline, measured trend and explicit work queue'};
 }
 if(input.readerTask==='risk-matrix'){
  if(input.evidenceType!=='status')return refuse('status-evidence-required','风险矩阵需要声明 status 证据类型；不要把主题词当成风险登记。',['declare-status-evidence','custom-representation']);
  if(!input.hasRawData)return refuse('raw-data-required','风险矩阵需要明确的可能性、影响等级和登记事项；没有数据不能补画风险。',['provide-risk-register','custom-representation']);
  if(input.riskKind!=='likelihood-impact')return refuse('risk-matrix-scope-required','当前风险矩阵只支持已声明的“可能性 × 影响”二维登记；其他风险结构需另选能力。',['declare-likelihood-impact','custom-representation']);
  if(input.objectCount<1||input.objectCount>18)return refuse('risk-item-count-out-of-range','当前风险矩阵只接受 1–18 个登记事项；超出后应拆页或换密集清单。',['split-page','evidence-matrix']);
  return {decision:'route',family:'risk-matrix',reference:'references/musecore-risk-matrix.md',reason:'explicit likelihood × impact register with supplied axis scores and actions'};
 }
 if(input.readerTask==='decision-tree'){
  if(input.evidenceType!=='workflow')return refuse('workflow-evidence-required','决策树需要声明 workflow 证据类型；不要把主题词当成分支关系。',['declare-workflow-evidence','custom-representation']);
  if(input.decisionKind!=='explicit-branch')return refuse('decision-tree-scope-required','当前决策树只支持已声明的显式分支判断；概率、置信度或责任分配需另选能力。',['declare-explicit-branch','custom-representation']);
  if(input.objectCount<3||input.objectCount>18)return refuse('decision-node-count-out-of-range','当前决策树只接受 3–18 个节点；超出后应拆成多个问题或换密集结构。',['split-question','evidence-matrix']);
  return {decision:'route',family:'decision-tree',reference:'references/musecore-decision-tree.md',reason:'one explicit question with reachable adjacent-level branches and declared outcomes'};
 }
 if(input.readerTask==='evidence-matrix'){
  if(input.evidenceType!=='table')return refuse('table-evidence-required','证据矩阵需要声明 table 证据类型；不要把状态核验误当成数据图。',['declare-table-evidence','custom-representation']);
  if(!input.hasRawData)return refuse('raw-data-required','证据矩阵需要明确的证据状态和来源；没有输入状态不能补画核验结果。',['provide-evidence-statuses','custom-representation']);
  if(input.matrixKind!=='evidence-status')return refuse('evidence-matrix-scope-required','当前矩阵只支持已声明的证据状态表；评分、排名或因果矩阵需另选能力。',['declare-evidence-status','custom-representation']);
  if(!Number.isInteger(input.columnCount)||input.columnCount<2||input.columnCount>5)return refuse('evidence-column-count-out-of-range','证据矩阵只接受 2–5 个列对象。',['split-matrix','custom-representation']);
  if(!Number.isInteger(input.rowCount)||input.rowCount<3||input.rowCount>10)return refuse('evidence-row-count-out-of-range','证据矩阵只接受 3–10 个核验项。',['split-matrix','custom-representation']);
  return {decision:'route',family:'evidence-matrix',reference:'references/musecore-evidence-matrix.md',reason:'explicit evidence-status cells with named objects and criteria'};
 }
 if(input.readerTask==='capacity-plan'){
  if(input.evidenceType!=='quantitative')return refuse('quantitative-evidence-required','容量轨道需要声明 quantitative 证据类型；不要把主题词当成容量事实。',['declare-quantitative-evidence','custom-representation']);
  if(!input.hasRawData)return refuse('raw-data-required','容量轨道需要每个周期和工作流的需求、容量数值；没有数据不能补画缺口。',['provide-demand-capacity','custom-representation']);
  if(input.capacityKind!=='period-stream-gap')return refuse('capacity-plan-scope-required','当前容量轨道只支持已声明的“工作流 × 周期”需求/容量差值；预测、人员配置和利用率模型需另选能力。',['declare-period-stream-gap','custom-representation']);
  if(!Number.isInteger(input.periodCount)||input.periodCount<2||input.periodCount>8)return refuse('capacity-period-count-out-of-range','容量轨道只接受 2–8 个周期。',['split-periods','custom-representation']);
  if(!Number.isInteger(input.streamCount)||input.streamCount<1||input.streamCount>6)return refuse('capacity-stream-count-out-of-range','容量轨道只接受 1–6 条工作流。',['split-streams','custom-representation']);
  return {decision:'route',family:'capacity-plan',reference:'references/musecore-capacity-plan.md',reason:'explicit period-by-stream demand and capacity values with computed gaps'};
 }
 if(input.readerTask==='dashboard-focus'){
  if(!['quantitative','status'].includes(input.evidenceType))return refuse('dashboard-evidence-required','运营看板需要声明 quantitative 或 status 证据类型；不要把主题词当成运营事实。',['declare-dashboard-evidence','custom-representation']);
  if(!input.hasRawData)return refuse('raw-data-required','运营看板需要明确的主视图数据、指标和时点；没有数据不能补画态势。',['provide-dashboard-data','custom-representation']);
  if(input.dashboardKind!=='single-question')return refuse('dashboard-focus-scope-required','当前看板只支持一个运营问题对应一个主视图；多问题总览需拆成多个看板。',['declare-single-question','split-dashboard']);
  if(input.heroRelation===undefined)return refuse('hero-relation-required','请声明主视图关系：spatial、process、comparison、trend 或 inventory。',['declare-hero-relation']);
  if(input.objectCount<2||input.objectCount>8)return refuse('dashboard-object-count-out-of-range','当前看板只接受 2–8 个主视图与辅助证据对象。',['split-dashboard','custom-representation']);
  return {decision:'route',family:'dashboard-focus',reference:'references/musecore-dashboard-focus.md',reason:'one explicit operational question with one matching hero relation and bounded support evidence'};
 }
 if(input.readerTask==='decision-register'){
  if(input.evidenceType!=='status')return refuse('status-evidence-required','决策登记册需要声明 status 证据类型；不要把主题词当成已登记的决定。',['declare-status-evidence','custom-representation']);
  if(!input.hasRawData)return refuse('raw-data-required','决策登记册需要明确的状态、责任人、截止偏移和下一步；没有这些事实不能补画登记项。',['provide-decision-register','custom-representation']);
  if(input.decisionKind!=='register')return refuse('decision-register-scope-required','当前登记册只接受已声明的提案、已决和受阻状态；分支判断应使用决策树。',['declare-decision-register','decision-tree']);
  if(!Number.isInteger(input.objectCount)||input.objectCount<0||input.objectCount>12)return refuse('decision-count-out-of-range','决策登记册只接受 0–12 条登记项；超出后应拆册或换密集清单。',['split-register','evidence-matrix']);
  return {decision:'route',family:'decision-register',reference:'references/musecore-decision-register.md',reason:'explicit decision statuses, owners, due offsets and next steps'};
 }
 if(input.readerTask==='calibration-plot'){
  if(input.evidenceType!=='quantitative')return refuse('quantitative-evidence-required','预测校准图需要声明 quantitative 证据类型；不要把主题词当成观测与预测配对。',['declare-quantitative-evidence','custom-representation']);
  if(!input.hasRawData)return refuse('raw-data-required','预测校准图需要逐行的观测、预测、区间端点和来源；没有这些事实不能补画不确定性。',['provide-calibration-data','custom-representation']);
  if(!Number.isInteger(input.rowCount)||input.rowCount<6||input.rowCount>120)return refuse('calibration-row-count-out-of-range','预测校准图只接受 6–120 条观测–预测配对；超出后应拆页或改用密集数据表。',['split-calibration','custom-representation']);
  if(!Number.isInteger(input.columnCount)||input.columnCount<2||input.columnCount>4)return refuse('calibration-condition-count-out-of-range','预测校准图只接受 2–4 个已声明条件。',['split-conditions','custom-representation']);
  return {decision:'route',family:'calibration-plot',reference:'references/musecore-calibration-plot.md',reason:'explicit observed-predicted pairs with supplied intervals and condition summaries'};
 }
 if(input.readerTask==='portfolio-health'){
  if(input.evidenceType!=='status')return refuse('status-evidence-required','项目健康地图需要声明 status 证据类型；不要从主题词推断健康状态。',['declare-status-evidence','custom-representation']);
  if(!input.hasRawData)return refuse('raw-data-required','项目健康地图需要明确的阶段、健康状态、负责人、下一节点和截止偏移。',['provide-portfolio-data','custom-representation']);
  if(input.objectCount<1||input.objectCount>16)return refuse('portfolio-stream-count-out-of-range','项目健康地图只接受 1–16 条工作流；超出后应拆页或改用清单。',['split-portfolio','custom-representation']);
  return {decision:'route',family:'portfolio-health',reference:'references/musecore-portfolio-health.md',reason:'explicit phase-by-health map with checkpoint rail'};
 }
 if(input.readerTask==='measurement-scales'){
  if(input.evidenceType!=='quantitative')return refuse('quantitative-evidence-required','测量尺度示例需要声明 quantitative 证据类型；不能从变量名称推断尺度。',['declare-quantitative-evidence','custom-representation']);
  if(!input.hasRawData)return refuse('raw-data-required','测量尺度示例需要调用者提供明确的类别、单位、等间隔和零点声明。',['provide-data','custom-representation']);
  return {decision:'route',family:'measurement-scales',reference:'references/musecore-chance-scales.md',reason:'explicit nominal, ordinal, interval or ratio declarations before comparison'};
 }
 const routes={
  'cohort-flow':{family:'funnel',reference:'references/musecore-spatial-data.md',reason:'nested cohort counts use the bounded funnel family'},
  swimlane:{family:'lanes',reference:'references/musecore-runtime.md',reason:'ownership is the primary relation'},
  timeline:{family:'schedule',reference:'references/musecore-runtime.md',reason:'one time axis is the primary relation'},
  'entity-chain':{family:'association',reference:'references/musecore-runtime.md',reason:'entities and shared keys are the primary relation'}
 };
 if(input.readerTask==='cohort-flow'&&input.flowKind==='branch-rejoin')return {decision:'route',family:'cohort-branch-rejoin',reference:'references/musecore-cohort-branch-rejoin.md',reason:'explicit branch and rejoin counts with conservation checks'};
 if(routes[input.readerTask]&&(!['cohort-flow'].includes(input.readerTask)||input.flowKind==='nested-funnel'))return {decision:'route',...routes[input.readerTask]};
 if(input.readerTask==='chart'){
  if(!input.hasRawData)return refuse('raw-data-required','数据图需要原始或明确汇总数据。',['provide-data','image-evidence']);
  if(input.requestedFormat==='html')return refuse('unsupported-output-format','数据绘图工具直接输出 SVG 和 PNG；HTML 交互页面需要另一条制作路线。',['svg','png','custom-representation']);
  return {decision:'select-data-grammar',reference:'references/data-figures.md',script:'scripts/plot_data.py',supportedKinds:['line','scatter','bar','interval','heatmap','paired','observations'],reason:'data availability does not identify a chart; choose the comparison and explicit axis, pairing or uncertainty semantics before invoking the plotting script'};
 }
 return refuse('no-bounded-family','没有匹配的窄能力；必须声明 custom representation，不得静默回退到卡片网格。',['custom-representation','clarify-reader-task']);
}

