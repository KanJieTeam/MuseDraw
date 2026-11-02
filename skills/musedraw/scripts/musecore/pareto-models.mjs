const paretoNeed=(ok,msg)=>{if(!ok)throw Error('pareto-analysis: '+msg)};
const paretoFields=(o,keys,label)=>{paretoNeed(o&&typeof o==='object'&&!Array.isArray(o),label+' requires object');for(const k of Object.keys(o))paretoNeed(keys.includes(k),label+'.'+k+': unsupported field')};
const paretoText=(v,label,max)=>{paretoNeed(typeof v==='string'&&v.trim(),label+': nonempty text required');paretoNeed([...v].length<=max,label+': exceeds '+max+' characters')};
const paretoNum=(v,label)=>paretoNeed(typeof v==='number'&&Number.isFinite(v)&&v>=0,label+': finite nonnegative number required');

/**
 * A bounded Pareto view for one declared set of additive categories.
 * Values remain in supplied order; the cumulative line is calculated only
 * from those values. No causal ranking, threshold recommendation or group
 * inference is made by the renderer.
 */
export function paretoAnalysisModel(input){
 paretoFields(input,['family','title','subtitle','categoryLabel','valueLabel','unit','targetShare','dataStatus','items','note'],'pareto-analysis');
 paretoNeed(input.family==='pareto-analysis','family must be pareto-analysis');
 for(const [k,n] of [['title',100],['subtitle',220],['categoryLabel',60],['valueLabel',60],['unit',24],['dataStatus',180],['note',620]])paretoText(input[k],k,n);
 paretoNeed(typeof input.targetShare==='number'&&Number.isFinite(input.targetShare)&&input.targetShare>0&&input.targetShare<1,'targetShare must be between 0 and 1');
 paretoNeed(Array.isArray(input.items)&&input.items.length>=3&&input.items.length<=16,'items requires 3–16 categories');
 const ids=new Set(),items=input.items.map((row,index)=>{
  paretoFields(row,['id','label','value','source'],'item');paretoText(row.id,'item.id',32);paretoNeed(/^[a-z][a-z0-9_-]*$/i.test(row.id),'item.id must be alphanumeric');paretoNeed(!ids.has(row.id),'duplicate item id: '+row.id);ids.add(row.id);paretoText(row.label,'item.label',48);paretoNum(row.value,'item.value');paretoText(row.source,'item.source',160);return {...row,index};
 });
 const total=items.reduce((sum,row)=>sum+row.value,0);paretoNeed(total>0,'item values must have a positive total');
 let running=0;const rows=items.map(row=>{running+=row.value;return {...row,share:row.value/total,cumulative:running/total}});
 const crossing=rows.find(row=>row.cumulative>=input.targetShare)?.index??null;
 return {family:'pareto-analysis',title:input.title,subtitle:input.subtitle,categoryLabel:input.categoryLabel,valueLabel:input.valueLabel,unit:input.unit,targetShare:input.targetShare,dataStatus:input.dataStatus,items:rows,note:input.note,total,crossing,scope:'One explicitly supplied additive category set. Bars retain supplied order; cumulative share is arithmetic over the supplied values. No cause, priority, threshold recommendation or hidden category is inferred.',sourceTraceability:rows.map(row=>({id:row.id,label:row.label,value:row.value,source:row.source}))};
}

export const demoParetoAnalysis={family:'pareto-analysis',title:'交付问题的构成与累计占比',subtitle:'类别值按登记顺序排列；折线只表示这些值的累计份额',categoryLabel:'问题类别',valueLabel:'登记次数',unit:'次',targetShare:.8,dataStatus:'合成教学数据；用于说明读法，不代表真实质量统计',items:[{id:'clarity',label:'口径未定',value:28,source:'复盘表 A · 行 3'},{id:'handoff',label:'交接缺项',value:21,source:'复盘表 A · 行 7'},{id:'source',label:'来源未标',value:16,source:'复盘表 B · 行 2'},{id:'format',label:'格式返工',value:11,source:'复盘表 B · 行 9'},{id:'export',label:'导出遗漏',value:7,source:'复盘表 C · 行 4'},{id:'other',label:'其他已登记项',value:5,source:'复盘表 C · 行 8'}],note:'柱高是输入的类别值；折线是从左到右的累计占比。80%线是本页选择的阅读参考，不是质量门槛或改进承诺。'};
