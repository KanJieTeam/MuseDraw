const rNeed=(ok,msg)=>{if(!ok)throw Error('roc-pr-curve: '+msg)};
const rFields=(o,keys,label)=>{rNeed(o&&typeof o==='object'&&!Array.isArray(o),label+' requires object');for(const k of Object.keys(o))rNeed(keys.includes(k),label+'.'+k+': unsupported field')};
const rText=(v,label,max,empty=false)=>rNeed(typeof v==='string'&&(empty||v.trim())&&[...v].length<=max,label+': nonempty text, at most '+max+' characters');
const rNum=(v,label,min=0,max=1)=>rNeed(typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max,label+': finite number in ['+min+', '+max+']');
const auc=(points,xKey,yKey)=>points.slice(1).reduce((sum,p,i)=>sum+(p[xKey]-points[i][xKey])*(p[yKey]+points[i][yKey])/2,0);

/**
 * A bounded paired ROC/precision-recall view for explicitly supplied operating
 * points. The renderer does not fit a classifier or infer a prevalence.
 */
export function rocPrCurveModel(input){
 rFields(input,['family','title','subtitle','thresholdLabel','dataStatus','points','note'],'input');
 rNeed(input.family==='roc-pr-curve','family must be roc-pr-curve');
 for(const [k,n] of [['title',100],['subtitle',220],['thresholdLabel',60],['dataStatus',180],['note',620]])rText(input[k],k,n,k==='note');
 rNeed(Array.isArray(input.points)&&input.points.length>=6&&input.points.length<=60,'points requires 6–60 operating points');
 const ids=new Set();
 const points=input.points.map((p,index)=>{
  rFields(p,['id','label','threshold','fpr','tpr','precision','recall','source'],'point');
  rText(p.id,'point.id',32);rNeed(!ids.has(p.id),'duplicate point id');ids.add(p.id);
  if(p.label!==undefined)rText(p.label,'point.label',36,true);
  rNum(p.threshold,'point.threshold');rNum(p.fpr,'point.fpr');rNum(p.tpr,'point.tpr');rNum(p.precision,'point.precision');rNum(p.recall,'point.recall');rText(p.source,'point.source',160);
  // In one binary evaluation recall and true-positive rate are the same
  // fraction TP / (TP + FN), not independent coordinates.
  rNeed(Math.abs(p.tpr-p.recall)<=1e-12,'point.tpr and point.recall must agree for the same operating point');
  if(index){rNeed(p.threshold<=input.points[index-1].threshold,'thresholds must be non-increasing');rNeed(p.fpr>=input.points[index-1].fpr,'false-positive rate must be non-decreasing');rNeed(p.tpr>=input.points[index-1].tpr,'true-positive rate must be non-decreasing');rNeed(p.recall>=input.points[index-1].recall,'recall must be non-decreasing')}
  return {...p,index};
 });
 rNeed(points[0].fpr===0&&points[0].tpr===0,'first operating point must begin ROC at (0, 0)');
 rNeed(points.at(-1).fpr===1&&points.at(-1).tpr===1,'last operating point must end ROC at (1, 1)');
 rNeed(points[0].recall===0&&points.at(-1).recall===1,'recall must span 0 to 1');
 const labels=points.filter(p=>p.label).slice(0,4);
 return {family:'roc-pr-curve',title:input.title,subtitle:input.subtitle,thresholdLabel:input.thresholdLabel,dataStatus:input.dataStatus,points,note:input.note??'',aucRoc:auc(points,'fpr','tpr'),aucPr:auc(points,'recall','precision'),labels,scope:'Explicit operating points only; no classifier fitting, prevalence, uncertainty interval, calibration, threshold recommendation or population conclusion is inferred.',sourceTraceability:points.map(p=>({id:p.id,threshold:p.threshold,fpr:p.fpr,tpr:p.tpr,precision:p.precision,recall:p.recall,source:p.source}))};
}

export const demoRocPrCurve={family:'roc-pr-curve',title:'分类器阈值下的辨别与查准',subtitle:'每个点保留登记的阈值与四项率值；两条曲线只重排同一组输入',thresholdLabel:'阈值',dataStatus:'合成教学数据；操作点为输入示例，不代表真实模型或人群表现',points:[
 {id:'op01',label:'起点',threshold:1,fpr:0,tpr:0,precision:1,recall:0,source:'评估表 A · 行 2'},
 {id:'op02',label:'低误报',threshold:.85,fpr:.03,tpr:.41,precision:0.889214536928,recall:0.41,source:'评估表 A · 行 3'},
 {id:'op03',label:'早期召回',threshold:.72,fpr:.08,tpr:.62,precision:0.819871336669,recall:0.62,source:'评估表 A · 行 4'},
 {id:'op04',label:'折中点',threshold:.60,fpr:.15,tpr:.74,precision:0.743415693728,recall:0.74,source:'评估表 A · 行 5'},
 {id:'op05',label:'高召回',threshold:.48,fpr:.26,tpr:.82,precision:0.649400684932,recall:0.82,source:'评估表 A · 行 6'},
 {id:'op06',threshold:.36,fpr:.41,tpr:.88,precision:0.557629731118,recall:0.88,source:'评估表 A · 行 7'},
 {id:'op07',threshold:.24,fpr:.58,tpr:.93,precision:0.484989429175,recall:0.93,source:'评估表 A · 行 8'},
 {id:'op08',threshold:.12,fpr:.77,tpr:.97,precision:0.425236966825,recall:0.97,source:'评估表 A · 行 9'},
 {id:'op09',threshold:0,fpr:1,tpr:1,precision:0.37,recall:1,source:'评估表 A · 行 10'}
],note:'横轴和纵轴均为输入率值；AUC 是沿登记点做的梯形面积汇总，不是置信区间或泛化性能证明。正文仍需说明样本划分、阳性比例、阈值选择和不确定性。'};
