const cpNeed=(ok,msg)=>{if(!ok)throw Error(msg)};
const cpFields=(o,keys,label)=>{cpNeed(o&&typeof o==='object'&&!Array.isArray(o),`${label}: object required`);for(const k of Object.keys(o))cpNeed(keys.includes(k),`${label}.${k}: unsupported field`)};
const cpText=(v,label,max)=>{cpNeed(typeof v==='string'&&v.trim().length>0,`${label}: nonempty text required`);cpNeed([...v].length<=max,`${label}: exceeds ${max} characters`);return v};
const cpId=(v,label)=>{cpText(v,label,40);cpNeed(/^[a-z][a-z0-9_-]*$/i.test(v),`${label}: id must be alphanumeric`)};
const cpNum=(v,label)=>cpNeed(typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1000000,`${label}: finite number 0..1000000 required`);

export function capacityPlanModel(input){
 cpFields(input,['family','title','subtitle','periods','streams','dataStatus','note'],'capacity-plan');
 cpNeed(input.family==='capacity-plan','family must be capacity-plan');
 cpText(input.title,'title',90);cpText(input.subtitle,'subtitle',180);cpText(input.dataStatus,'dataStatus',100);cpText(input.note,'note',300);
 cpNeed(Array.isArray(input.periods)&&input.periods.length>=2&&input.periods.length<=8,'periods requires 2–8 entries');
 const periodIds=new Set();
 const periods=input.periods.map((p,i)=>{cpFields(p,['id','label'],'period');cpId(p.id,`periods[${i}].id`);cpNeed(!periodIds.has(p.id),`duplicate period id: ${p.id}`);periodIds.add(p.id);cpText(p.label,`periods[${i}].label`,28);return {id:p.id,label:p.label}});
 cpNeed(Array.isArray(input.streams)&&input.streams.length>=1&&input.streams.length<=6,'streams requires 1–6 entries');
 const streamIds=new Set();
 const streams=input.streams.map((stream,si)=>{
  cpFields(stream,['id','label','unit','values'],'stream');cpId(stream.id,`streams[${si}].id`);cpNeed(!streamIds.has(stream.id),`duplicate stream id: ${stream.id}`);streamIds.add(stream.id);cpText(stream.label,`streams[${si}].label`,40);cpText(stream.unit,`streams[${si}].unit`,18);cpNeed(Array.isArray(stream.values)&&stream.values.length===periods.length,`streams[${si}].values must match periods`);
  const values=stream.values.map((v,vi)=>{cpFields(v,['demand','capacity','note'],'capacity cell');cpNum(v.demand,`streams[${si}].values[${vi}].demand`);cpNum(v.capacity,`streams[${si}].values[${vi}].capacity`);if(v.note!==undefined)cpText(v.note,`streams[${si}].values[${vi}].note`,45);const gap=v.capacity-v.demand,state=gap<0?'over':gap===0?'balanced':'spare';return {demand:v.demand,capacity:v.capacity,gap,state,note:v.note??null}});
  const scale=Math.max(1,...values.flatMap(v=>[v.demand,v.capacity]));
  return {id:stream.id,label:stream.label,unit:stream.unit,values,scale};
 });
 return {family:'capacity-plan',title:input.title,subtitle:input.subtitle,dataStatus:input.dataStatus,note:input.note,periods,streams,scope:'Bounded period-by-stream capacity ledger. Demand and capacity are supplied values; gap sign is calculated per cell. No staffing recommendation, forecast, utilization law or causal claim is inferred.'};
}

export const demoCapacityPlan={family:'capacity-plan',title:'研究交付容量盘',subtitle:'把每个工作流在各周期的需求与可用容量放在同一条轨道上',dataStatus:'虚构演示数据 · 单位：工时',periods:[{id:'p1',label:'第1周'},{id:'p2',label:'第2周'},{id:'p3',label:'第3周'},{id:'p4',label:'第4周'}],streams:[{id:'analysis',label:'样本分析',unit:'工时',values:[{demand:32,capacity:40},{demand:46,capacity:40},{demand:38,capacity:42},{demand:28,capacity:36}]},{id:'field',label:'现场核验',unit:'工时',values:[{demand:20,capacity:18},{demand:18,capacity:24},{demand:30,capacity:24,note:'预约集中'},{demand:22,capacity:28}]},{id:'report',label:'报告编制',unit:'工时',values:[{demand:12,capacity:16},{demand:14,capacity:16},{demand:20,capacity:20},{demand:34,capacity:26}]}],note:'容量为当前登记的可用工时，需求为任务估计；缺口只表示两者差值，不等同于延期或质量结论。'};
