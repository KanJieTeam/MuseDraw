import {pairedStats,niceDomain} from './quantitative.mjs';

// Descriptive paired observations only. No inferred outliers, causal statements,
// missing-value imputation or tests of significance.
export function cap2DataScatterModel(input){
 const need=(ok,message)=>{if(!ok)throw Error(message)};
 const fields=(o,keys,label)=>{need(o&&typeof o==='object'&&!Array.isArray(o),label+': object required');for(const key of Object.keys(o))need(keys.includes(key),label+'.'+key+': unsupported field')};
 const text=(v,label)=>need(typeof v==='string'&&v.trim().length>0,label+': nonempty text required');
 fields(input,['family','title','subtitle','note','groups','xLabel','yLabel','fit','xDomain','yDomain'],'scatter evidence');
 need(input.family==='scatter-evidence','scatter-evidence family required');
 for(const key of ['title','subtitle','note','xLabel','yLabel'])text(input[key],key);
 need(typeof input.fit==='boolean','fit must explicitly be boolean');
 need(Array.isArray(input.groups)&&input.groups.length>=2&&input.groups.length<=6,'groups: requires 2–6 groups');
 const ids=new Set(),groups=input.groups.map(group=>{
  fields(group,['id','label','note','points'],'group');for(const key of ['id','label','note'])text(group[key],'group.'+key);
  need(!ids.has(group.id),'duplicate group id');ids.add(group.id);
  need(Array.isArray(group.points)&&group.points.length>=3&&group.points.length<=120,'points: requires 3–120 pairs');
  for(const point of group.points){fields(point,['x','y'],'point');for(const key of ['x','y'])need(typeof point[key]==='number'&&Number.isFinite(point[key])&&Math.abs(point[key])<=1e12,key+': finite numeric value within ±1e12 required')}
  const stats=pairedStats(group.points);
  need(Object.values(stats).every(v=>v===null||Number.isFinite(v)),'statistics exceed finite arithmetic bounds');
  return {...group,stats,fitShown:input.fit&&stats.slope!==null};
 });
 const domain=(key,axis)=>{
  const values=groups.flatMap(g=>g.points.map(p=>p[axis]));
  if(input[key]===undefined)return niceDomain(values,{zero:false});
  const d=input[key];need(Array.isArray(d)&&d.length===2&&d.every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1e12)&&d[1]>d[0],key+': increasing finite pair within ±1e12 required');
  need(values.every(v=>v>=d[0]&&v<=d[1]),key+': every supplied observation must be inside the declared range');
  return {domain:[...d],ticks:Array.from({length:5},(_,i)=>d[0]+(d[1]-d[0])*i/4)};
 };
 return {...input,groups,xScale:domain('xDomain','x'),yScale:domain('yDomain','y'),varianceConvention:'sample variance, denominator n−1',interpretation:'Caller statements retained verbatim; no automatic causal, outlier or significance claims.'};
}
