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
 const allowed=['readerTask','readerQuestion','evidenceType','hasRawData','hasSourceAsset','hasCoordinates','hasSharedSubstrate','panelCount','objectCount','labelCount','requestedFormat'];
 for(const k of Object.keys(input))need(allowed.includes(k),`route input.${k}: unsupported field`);
 enumValue(input.readerTask,TASKS,'readerTask');text(input.readerQuestion,'readerQuestion',240);enumValue(input.evidenceType,EVIDENCE,'evidenceType');
 for(const k of ['hasRawData','hasSourceAsset','hasCoordinates','hasSharedSubstrate'])need(typeof input[k]==='boolean',`${k} must be boolean`);
 for(const k of ['panelCount','objectCount','labelCount']){need(Number.isInteger(input[k])&&input[k]>=0,`${k} must be a nonnegative integer`);}
 if(input.requestedFormat!==undefined)enumValue(input.requestedFormat,['svg','png','html','pptx'],'requestedFormat');
 const refuse=(code,message,alternatives=[])=>({decision:'refuse',code,message,alternatives,readerTask:input.readerTask,readerQuestion:input.readerQuestion});
 if(input.objectCount>25)return refuse('too-many-objects','超过单页 25 个对象；拆页或改用专门的密集表格/数据视图。',['split-page','evidence-matrix']);
 if(input.evidenceType==='image'&&!input.hasSourceAsset)return refuse('source-image-required','图像是证据本体，但没有授权源图；不能用示意图伪造实证像素。',['provide-source-image','text-or-schematic']);
 if(input.readerTask==='multi-panel-evidence'){
  if(input.panelCount<3||input.panelCount>4)return refuse('panel-count-out-of-range','多面板证据能力只接受 3–4 个有角色的面板。',['split-page','evidence-chain']);
  if(!input.hasRawData&&input.evidenceType==='quantitative')return refuse('raw-data-required','量化面板需要原始或明确汇总数据；不能从预览图反推数值。',['provide-data','image-evidence']);
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
 const routes={
  'cohort-flow':{family:'cohort',reason:'start/branch/exclusion/rejoin are the primary relation'},
  'spatial-field':{family:'field',reason:'coordinates and spatial quantity are the primary relation'},
  swimlane:{family:'lanes',reason:'ownership is the primary relation'},
  timeline:{family:'schedule',reason:'one time axis is the primary relation'},
  'entity-chain':{family:'association',reason:'entities and shared keys are the primary relation'}
 };
 if(routes[input.readerTask])return {decision:'route',...routes[input.readerTask]};
 if(input.readerTask==='chart'){
  if(!input.hasRawData)return refuse('raw-data-required','数据图需要原始或明确汇总数据。',['provide-data','image-evidence']);
  return {decision:'route',family:'data-backend',reason:'choose a data family after declaring axis and uncertainty semantics'};
 }
 return refuse('no-bounded-family','没有匹配的窄能力；必须声明 custom representation，不得静默回退到卡片网格。',['custom-representation','clarify-reader-task']);
}
