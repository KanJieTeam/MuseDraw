const fNeed=(ok,msg)=>{if(!ok)throw Error('forest-plot: '+msg)};
function fFields(o,keys,label){fNeed(o&&typeof o==='object'&&!Array.isArray(o),label+' requires object');for(const k of Object.keys(o))fNeed(keys.includes(k),label+'.'+k+': unsupported field')}
function fText(v,label,max,empty=false){fNeed(typeof v==='string'&&(empty||v.trim())&&[...v].length<=max,label+': nonempty text, at most '+max+' characters')}
function fNum(v,label,min=-1e9,max=1e9){fNeed(typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max,label+': finite number in ['+min+', '+max+']')}

/**
 * A bounded forest plot for explicitly supplied effect estimates and intervals.
 * Intervals are drawn as declared; no confidence level, pooling, weighting or
 * statistical inference is invented by MuseCore.
 */
export function forestPlotModel(b){
 fFields(b,['family','title','subtitle','xLabel','unit','reference','intervalLabel','dataStatus','rows','note'],'input');
 fNeed(b.family==='forest-plot','family must be forest-plot');
 for(const [k,n] of [['title',100],['subtitle',220],['xLabel',60],['unit',24],['intervalLabel',48],['dataStatus',160]])fText(b[k],k,n);
 if(b.note!==undefined)fText(b.note,'note',620,true);
 fNum(b.reference,'reference',-1e8,1e8);
 fNeed(Array.isArray(b.rows)&&b.rows.length>=4&&b.rows.length<=24,'rows requires 4–24 observations');
 const ids=new Set();
 const rows=b.rows.map((row,index)=>{
  fFields(row,['id','label','estimate','low','high','weight','source'],'row');
  fText(row.id,'row.id',32);fNeed(!ids.has(row.id),'duplicate row id');ids.add(row.id);
  fText(row.label,'row.label',48);fNum(row.estimate,'row.estimate',-1e8,1e8);fNum(row.low,'row.low',-1e8,1e8);fNum(row.high,'row.high',-1e8,1e8);fNeed(row.low<=row.estimate&&row.estimate<=row.high,'row interval must contain estimate');
  if(row.weight!==undefined)fNum(row.weight,'row.weight',0,1e6);fText(row.source,'row.source',160);
  return {...row,index,weight:row.weight??1};
 });
 const all=[b.reference,...rows.flatMap(r=>[r.low,r.high,r.estimate])],rawMin=Math.min(...all),rawMax=Math.max(...all),span=Math.max(rawMax-rawMin,1),pad=span*.08;
 const min=rawMin-pad,max=rawMax+pad,weightMax=Math.max(...rows.map(r=>r.weight));
 return {family:'forest-plot',title:b.title,subtitle:b.subtitle,xLabel:b.xLabel,unit:b.unit,reference:b.reference,intervalLabel:b.intervalLabel,dataStatus:b.dataStatus,rows,note:b.note??'',domain:{min,max},weightMax,scope:'Explicit effect estimates, interval endpoints and optional display weights only. Intervals are not assigned a confidence level or probability; no pooled estimate, heterogeneity, multiplicity correction, causality or clinical recommendation is inferred.',sourceTraceability:rows.map(r=>({id:r.id,label:r.label,source:r.source}))};
}

export const demoForestPlot={family:'forest-plot',title:'多项实验比较的效应量与区间',subtitle:'每一行保留输入的估计值、区间端点和来源；竖线是本页声明的参照值',xLabel:'效应量（相对参照值）',unit:'标准化效应',reference:0,intervalLabel:'输入区间',dataStatus:'合成教学数据；估计值与区间为已登记示例，不代表真实临床或生物学结论',rows:[{id:'study-a',label:'干预 A · 细胞应激',estimate:.42,low:.12,high:.71,weight:5,source:'实验记录 A，表 2'},{id:'study-b',label:'干预 B · 代谢通路',estimate:-.18,low:-.46,high:.09,weight:4,source:'实验记录 B，表 1'},{id:'study-c',label:'干预 C · 屏障完整性',estimate:.63,low:.28,high:.94,weight:3,source:'实验记录 C，补充表 3'},{id:'study-d',label:'干预 D · 迁移响应',estimate:.07,low:-.21,high:.35,weight:2,source:'实验记录 D，表 4'},{id:'study-e',label:'干预 E · 代偿信号',estimate:-.51,low:-.83,high:-.19,weight:2,source:'实验记录 E，表 2'},{id:'study-f',label:'干预 F · 组织恢复',estimate:.29,low:.02,high:.57,weight:1,source:'实验记录 F，表 1'}],note:'区间端点由输入直接给出；本图不把区间解释成某一特定置信水平，也不计算合并效应。请在正文中说明研究设计、区间定义和不确定性来源。'};
