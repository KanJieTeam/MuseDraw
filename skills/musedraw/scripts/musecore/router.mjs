const need=(ok,msg)=>{if(!ok)throw Error(msg)};
const text=(v,label,max=180)=>{need(typeof v==='string'&&v.trim().length>0,`${label}: nonempty text required`);need([...v].length<=max,`${label}: exceeds ${max} characters`)};
const enumValue=(v,values,label)=>{need(values.includes(v),`${label} must be one of ${values.join(', ')}`);return v};

const TASKS=['multi-panel-evidence','condition-comparison','apparatus-measurement','cohort-flow','spatial-field','swimlane','timeline','entity-chain','image-evidence','chart'];
const EVIDENCE=['quantitative','status','mechanism','apparatus','spatial','image','table','workflow'];

/**
 * Explicit routing only. This does not classify prose or infer geometry from a
 * topic; a host must declare the reader task and evidence facts first.
 */
export function routeMuseCore(input){
 need(input&&typeof input==='object'&&!Array.isArray(input),'route input must be an object');
 const allowed=['readerTask','readerQuestion','evidenceType','hasRawData','hasSourceAsset','hasCoordinates','hasSharedSubstrate','flowKind','fieldKind','panelCount','plotPanelCount','objectCount','labelCount','requestedFormat'];
 for(const k of Object.keys(input))need(allowed.includes(k),`route input.${k}: unsupported field`);
 enumValue(input.readerTask,TASKS,'readerTask');text(input.readerQuestion,'readerQuestion',240);enumValue(input.evidenceType,EVIDENCE,'evidenceType');
 for(const k of ['hasRawData','hasSourceAsset','hasCoordinates','hasSharedSubstrate'])need(typeof input[k]==='boolean',`${k} must be boolean`);
 if(input.flowKind!==undefined)enumValue(input.flowKind,['nested-funnel','branch-rejoin'],'flowKind');
 if(input.fieldKind!==undefined)enumValue(input.fieldKind,['regular-height-grid','other-spatial-field'],'fieldKind');
 for(const k of ['panelCount','objectCount','labelCount']){need(Number.isInteger(input[k])&&input[k]>=0,`${k} must be a nonnegative integer`);}
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
 if(input.readerTask==='image-evidence')return input.hasSourceAsset?{decision:'preserve-source',family:'source-image',reason:'retain authorized image, channel identity and scale bar'}:refuse('source-image-required','图像证据必须保留源图。',['provide-source-image']);
 if(input.readerTask==='spatial-field'){
  if(!input.hasCoordinates)return refuse('coordinates-required','空间场需要明确的坐标；不能从名称或截图推断空间位置。',['provide-coordinates']);
  if(!input.hasRawData)return refuse('raw-data-required','等高线能力需要明确的高程网格数据。',['provide-data','image-evidence']);
  if(input.fieldKind!=='regular-height-grid')return refuse('spatial-field-scope-required','当前路由仅支持以米为单位的规则高程网格；其他场量或采样结构需另选能力。',['declare-regular-height-grid','custom-representation']);
  return {decision:'route',family:'contour-field',reference:'references/musecore-terrain-response.md',reason:'explicit regular height grid; the family validates metric units, spacing and topology'};
 }
 const routes={
  'cohort-flow':{family:'funnel',reference:'references/musecore-spatial-data.md',reason:'nested cohort counts use the bounded funnel family'},
  swimlane:{family:'lanes',reference:'references/musecore-runtime.md',reason:'ownership is the primary relation'},
  timeline:{family:'schedule',reference:'references/musecore-runtime.md',reason:'one time axis is the primary relation'},
  'entity-chain':{family:'association',reference:'references/musecore-runtime.md',reason:'entities and shared keys are the primary relation'}
 };
 if(input.readerTask==='cohort-flow'&&input.flowKind==='branch-rejoin')return refuse('cohort-flow-capability-pending','分支、排除、交叉和回流需要独立的守恒流能力；当前 funnel 只接受单一嵌套队列。',['split-into-stages','custom-representation']);
 if(routes[input.readerTask]&&(!['cohort-flow'].includes(input.readerTask)||input.flowKind==='nested-funnel'))return {decision:'route',...routes[input.readerTask]};
 if(input.readerTask==='chart'){
  if(!input.hasRawData)return refuse('raw-data-required','数据图需要原始或明确汇总数据。',['provide-data','image-evidence']);
  if(input.requestedFormat==='html')return refuse('unsupported-output-format','数据绘图工具直接输出 SVG 和 PNG；HTML 交互页面需要另一条制作路线。',['svg','png','custom-representation']);
  return {decision:'select-data-grammar',reference:'references/data-figures.md',script:'scripts/plot_data.py',supportedKinds:['line','scatter','bar','interval','heatmap','paired','observations'],reason:'data availability does not identify a chart; choose the comparison and explicit axis, pairing or uncertainty semantics before invoking the plotting script'};
 }
 return refuse('no-bounded-family','没有匹配的窄能力；必须声明 custom representation，不得静默回退到卡片网格。',['custom-representation','clarify-reader-task']);
}
