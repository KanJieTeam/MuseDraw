const trendBandNeed=(ok,msg)=>{if(!ok)throw Error('trend-band: '+msg)};
const trendBandObject=(v,label)=>trendBandNeed(v&&typeof v==='object'&&!Array.isArray(v),`${label} object required`);
const trendBandFields=(v,allowed,label)=>{trendBandObject(v,label);for(const k of Object.keys(v))trendBandNeed(allowed.includes(k),`${label}.${k} unsupported field`)};
const trendBandText=(v,label,max=180)=>{trendBandNeed(typeof v==='string'&&v.trim().length>0,`${label} nonempty text required`);trendBandNeed([...v].length<=max,`${label} exceeds ${max} characters`);return v};
const trendBandId=(v,label)=>{trendBandText(v,label,48);trendBandNeed(/^[a-z][a-z0-9_-]*$/i.test(v),`${label} id must be alphanumeric`);return v};
const trendBandFinite=(v,label)=>{trendBandNeed(typeof v==='number'&&Number.isFinite(v),`${label} finite number required`);return v};
export function trendBandModel(input){
 trendBandFields(input,['family','title','subtitle','periods','series','target','unit','dataStatus','note'],'input');
 trendBandNeed(input.family==='trend-band','family must be trend-band');
 for(const k of ['title','subtitle','dataStatus','note'])trendBandText(input[k],k,k==='note'?260:220);
 if(input.unit!==undefined)trendBandText(input.unit,'unit',48);
 trendBandNeed(Array.isArray(input.periods)&&input.periods.length>=3&&input.periods.length<=16,'periods requires 3–16 labels');
 const periods=input.periods.map((v,i)=>trendBandText(v,`periods[${i}]`,32));trendBandNeed(new Set(periods).size===periods.length,'periods must be unique');
 trendBandNeed(Array.isArray(input.series)&&input.series.length>=1&&input.series.length<=5,'series requires 1–5 lines');
 const ids=new Set();const series=input.series.map((s,i)=>{trendBandFields(s,['id','label','color','values'],'series');trendBandId(s.id,`series[${i}].id`);trendBandNeed(!ids.has(s.id),`duplicate series id: ${s.id}`);ids.add(s.id);trendBandText(s.label,`series[${i}].label`,48);trendBandText(s.color,`series[${i}].color`,16);trendBandNeed(/^#[0-9a-f]{6}$/i.test(s.color),`series[${i}].color must be #RRGGBB`);trendBandNeed(Array.isArray(s.values)&&s.values.length===periods.length,`series[${i}].values must match periods`);const values=s.values.map((v,j)=>trendBandFinite(v,`series[${i}].values[${j}]`));trendBandNeed(values.every(v=>Math.abs(v)<=1e9),'series value outside ±1e9');return {...s,values}});
 let target=null;if(input.target!==undefined&&input.target!==null){trendBandFields(input.target,['label','min','max'],'target');trendBandText(input.target.label,'target.label',60);trendBandFinite(input.target.min,'target.min');trendBandFinite(input.target.max,'target.max');trendBandNeed(Math.abs(input.target.min)<=1e9&&Math.abs(input.target.max)<=1e9,'target outside ±1e9');trendBandNeed(input.target.min<=input.target.max,'target min must be <= max');target={...input.target}}
 const all=series.flatMap(s=>s.values);let min=Math.min(...all,target?.min??Infinity),max=Math.max(...all,target?.max??-Infinity);
 // Leave sufficient representable distance for distinct ticks even when values
 // differ by only a few floating-point steps at a large absolute magnitude.
 const span=max-min,pad=span===0?Math.max(1,Math.abs(min)*.08):Math.max(span*.08,Number.EPSILON*Math.max(Math.abs(min),Math.abs(max))*32);
 min-=pad;max+=pad;
 return {...input,unit:input.unit??null,periods,series,target,domain:{min,max},scope:'Explicit ordered period labels, supplied series values, and optional declared target band. Periods are equally spaced categories, not elapsed-time coordinates. No forecast, smoothing, causality, or trend significance is inferred.'};
}
export const demoTrendBand={family:'trend-band',title:'响应负荷的周内变化',subtitle:'多条已登记序列共享同一时间轴；浅色带只表示给定的目标区间',periods:['周一','周二','周三','周四','周五','周六','周日'],series:[{id:'active',label:'活跃事项',color:'#286A78',values:[42,48,45,53,57,51,46]},{id:'resolved',label:'已完成事项',color:'#B6693A',values:[36,41,44,46,49,48,47]},{id:'waiting',label:'待处理',color:'#6B7D54',values:[18,21,19,24,22,20,17]}],target:{label:'目标带',min:40,max:52},dataStatus:'合成教学数据；数值为登记示例，不代表业务预测',note:'曲线仅连接已提供的期点；目标带不等于警报阈值，也不解释序列之间的因果关系。'};
