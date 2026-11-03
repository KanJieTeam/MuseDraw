import {paddedNumericExtent} from './quantitative.mjs';
const dNeed=(ok,msg)=>{if(!ok)throw Error('raincloud: '+msg)};
const dFields=(o,keys,label)=>{dNeed(o&&typeof o==='object'&&!Array.isArray(o),label+' requires object');for(const k of Object.keys(o))dNeed(keys.includes(k),label+'.'+k+': unsupported field')};
const dText=(v,label,max,empty=false)=>dNeed(typeof v==='string'&&(empty||v.trim())&&[...v].length<=max,label+': nonempty text, at most '+max+' characters');
const dNum=(v,label,min=-1e6,max=1e6)=>dNeed(typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max,label+': finite number in ['+min+', '+max+']');
const quantile=(xs,p)=>{const n=xs.length-1,i=n*p,lo=Math.floor(i),hi=Math.ceil(i);return xs[lo]+(xs[hi]-xs[lo])*(i-lo)};
function density(xs,x,bw){return xs.reduce((sum,v)=>sum+Math.exp(-.5*((x-v)/bw)**2),0)/(xs.length*bw*Math.sqrt(2*Math.PI))}

/**
 * A bounded raincloud distribution view. Raw observations, a computed quartile
 * interval and a deterministic kernel silhouette share one numeric axis.
 */
export function raincloudModel(input){
 dFields(input,['family','title','subtitle','valueLabel','unit','dataStatus','groups','note'],'input');dNeed(input.family==='raincloud','family must be raincloud');
 for(const [k,n] of [['title',100],['subtitle',220],['valueLabel',60],['unit',24],['dataStatus',180],['note',620]])dText(input[k],k,n,k==='note');
 dNeed(Array.isArray(input.groups)&&input.groups.length>=2&&input.groups.length<=6,'groups requires 2–6 distributions');
 const ids=new Set(),groups=input.groups.map((g,index)=>{dFields(g,['id','label','values','source'],'group');dText(g.id,'group.id',32);dNeed(!ids.has(g.id),'duplicate group id');ids.add(g.id);dText(g.label,'group.label',40);dNeed(Array.isArray(g.values)&&g.values.length>=5&&g.values.length<=200,'group.values requires 5–200 observations');g.values.forEach((v,i)=>dNum(v,`group.values[${i}]`));dText(g.source,'group.source',160);const values=[...g.values].sort((a,b)=>a-b),min=values[0],max=values.at(-1),q1=quantile(values,.25),median=quantile(values,.5),q3=quantile(values,.75),spread=Math.max(q3-q1,(max-min)/20),bandwidth=Math.max(spread*.7,(max-min)/40,Number.EPSILON*Math.max(Math.abs(min),Math.abs(max))*32,min===max?(Math.abs(min)||1)*.05:0,Number.MIN_VALUE*32),densityPoints=Array.from({length:41},(_,i)=>{const x=min+(max-min)*i/40;return {x,density:density(values,x,bandwidth)}});dNeed(densityPoints.every(p=>Number.isFinite(p.density)),'kernel density exceeds representable numeric range');return {...g,index,values,min,max,q1,median,q3,bandwidth,densityPoints,n:values.length}});
 const {min,max}=paddedNumericExtent(groups.flatMap(g=>[g.min,g.max]));
 return {family:'raincloud',title:input.title,subtitle:input.subtitle,valueLabel:input.valueLabel,unit:input.unit,dataStatus:input.dataStatus,groups,note:input.note??'',domain:{min,max},sourceTraceability:groups.map(g=>({id:g.id,label:g.label,n:g.n,source:g.source,values:g.values})),scope:'Raw observations, linear-interpolated quartiles and a deterministic density silhouette only; no group test, confidence interval, outlier removal, causal claim or population inference is added.'};
}

export const demoRaincloud={family:'raincloud',title:'三组观测的分布、区间与原始点',subtitle:'每一行保留原始观测；云形是固定核宽度的显示摘要，不替代统计检验',valueLabel:'观测值',unit:'相对单位',dataStatus:'合成教学数据；原始数值用于说明读法，不代表实验测量或人群结果',groups:[
 {id:'control',label:'基线组',values:[2.1,2.4,2.6,2.8,3.0,3.1,3.3,3.5,3.9],source:'记录表 A · 行 2–10'},
 {id:'pulse',label:'短脉冲组',values:[2.8,3.2,3.5,3.7,4.0,4.1,4.3,4.7,5.2],source:'记录表 B · 行 2–10'},
 {id:'recovery',label:'恢复组',values:[1.5,1.8,2.0,2.2,2.5,2.7,3.0,3.4,4.2],source:'记录表 C · 行 2–10'}
],note:'箱体显示由原始值计算的四分位区间，横线是中位数；云形只帮助观察分布形状，不能被读作置信区间或显著性。请在正文中说明样本、测量单位与研究设计。'};
