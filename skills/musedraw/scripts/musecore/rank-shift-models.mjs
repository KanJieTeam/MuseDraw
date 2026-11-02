const rankNeed=(ok,msg)=>{if(!ok)throw Error('rank-shift: '+msg)};
const rankFields=(o,keys,label)=>{rankNeed(o&&typeof o==='object'&&!Array.isArray(o),label+' requires object');for(const k of Object.keys(o))rankNeed(keys.includes(k),label+'.'+k+': unsupported field')};
const rankText=(v,label,max)=>{rankNeed(typeof v==='string'&&v.trim(),label+': nonempty text required');rankNeed([...v].length<=max,label+': exceeds '+max+' characters')};
const rankInt=(v,label,min,max)=>rankNeed(Number.isInteger(v)&&v>=min&&v<=max,label+': integer '+min+'..'+max+' required');

/**
 * A bounded two-period ranking comparison. It draws only supplied ranks and
 * derives movement direction from the rank numbers; it does not infer scores,
 * causes, recommendations, ties or a hidden third period.
 */
export function rankShiftModel(input){
 rankFields(input,['family','title','subtitle','periods','dataStatus','items','note'],'rank-shift');
 rankNeed(input.family==='rank-shift','family must be rank-shift');
 for(const [k,n] of [['title',100],['subtitle',220],['dataStatus',180],['note',620]])rankText(input[k],k,n);
 rankNeed(Array.isArray(input.periods)&&input.periods.length===2,'periods requires exactly two supplied periods');
 const periodIds=new Set();
 const periods=input.periods.map((p,i)=>{rankFields(p,['id','label'],'period');rankText(p.id,'period.id',32);rankNeed(/^[a-z][a-z0-9_-]*$/i.test(p.id),'period.id must be alphanumeric');rankNeed(!periodIds.has(p.id),'duplicate period id');periodIds.add(p.id);rankText(p.label,'period.label',40);return {...p,index:i}});
 rankNeed(Array.isArray(input.items)&&input.items.length>=3&&input.items.length<=12,'items requires 3–12 ranked objects');
 const ids=new Set();
 const n=input.items.length;
 const items=input.items.map((row,index)=>{
  rankFields(row,['id','label','beforeRank','afterRank','source'],'item');rankText(row.id,'item.id',32);rankNeed(/^[a-z][a-z0-9_-]*$/i.test(row.id),'item.id must be alphanumeric');rankNeed(!ids.has(row.id),'duplicate item id');ids.add(row.id);rankText(row.label,'item.label',40);rankInt(row.beforeRank,'item.beforeRank',1,n);rankInt(row.afterRank,'item.afterRank',1,n);rankText(row.source,'item.source',160);const change=row.beforeRank-row.afterRank;return {...row,index,change,direction:change>0?'up':change<0?'down':'same'};
 });
 for(const key of ['beforeRank','afterRank']){const values=items.map(row=>row[key]);rankNeed(new Set(values).size===values.length,'all '+key+' values must be unique; ties are outside this bounded family')}
 const counts={up:items.filter(row=>row.direction==='up').length,down:items.filter(row=>row.direction==='down').length,same:items.filter(row=>row.direction==='same').length};
 return {family:'rank-shift',title:input.title,subtitle:input.subtitle,periods,dataStatus:input.dataStatus,items,note:input.note,counts,scope:'Two supplied periods and one supplied rank per object. Movement is arithmetic beforeRank − afterRank: upward means a smaller numeric rank. No score, cause, recommendation, tie, third period or winner is inferred.',sourceTraceability:items.map(row=>({id:row.id,label:row.label,beforeRank:row.beforeRank,afterRank:row.afterRank,source:row.source}))};
}

export const demoRankShift={family:'rank-shift',title:'项目优先级的名次变化',subtitle:'同一组事项在两个评审时点的名次移动；连线只表达输入的前后位置',periods:[{id:'opening',label:'初评 · 4 月'},{id:'review',label:'复评 · 6 月'}],dataStatus:'合成教学数据；名次来自已登记的两次评审，不代表真实项目结论',items:[{id:'field',label:'现场采样',beforeRank:5,afterRank:2,source:'评审表 A · 行 4'},{id:'schema',label:'数据字典',beforeRank:2,afterRank:1,source:'评审表 A · 行 7'},{id:'model',label:'预测模型',beforeRank:1,afterRank:4,source:'评审表 B · 行 2'},{id:'report',label:'报告整编',beforeRank:4,afterRank:5,source:'评审表 B · 行 8'},{id:'archive',label:'资料归档',beforeRank:3,afterRank:3,source:'评审表 C · 行 1'}],note:'名次数值越小位置越靠上；蓝线表示名次前移，赭线表示名次后移，灰线表示没有变化。图中不解释变化原因，也不把名次当作分数。'};
