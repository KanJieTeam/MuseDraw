function need(ok,message){if(!ok)throw Error(message)}
function fields(o,keys,label){need(o&&typeof o==='object'&&!Array.isArray(o),label+': object required');for(const k of Object.keys(o))need(keys.includes(k),label+'.'+k+': unsupported field')}
function text(v,label,max){need(typeof v==='string'&&v.trim()&&[...v].length<=max,label+': nonempty text, at most '+max+' characters')}
function finite(v,label){need(typeof v==='number'&&Number.isFinite(v),label+': finite number required')}
function hex(v,label){need(typeof v==='string'&&/^#[\da-f]{6}$/i.test(v),label+': six-digit hex colour required')}
export function calibrationPlotModel(input){
 fields(input,['family','title','subtitle','xLabel','yLabel','unit','conditions','rows','note','dataStatus'],'calibration-plot');
 need(input.family==='calibration-plot','family must be calibration-plot');
 for(const [k,max] of [['title',120],['subtitle',240],['xLabel',50],['yLabel',50],['unit',20],['note',420],['dataStatus',120]])text(input[k],k,max);
 need(Array.isArray(input.conditions)&&input.conditions.length>=2&&input.conditions.length<=4,'conditions requires 2–4 explicit conditions');
 const ids=new Set();const conditions=input.conditions.map((c,i)=>{fields(c,['id','label','color','source'],'condition '+i);text(c.id,'condition.id',20);text(c.label,'condition.label',30);text(c.source,'condition.source',140);hex(c.color,'condition.color');need(!ids.has(c.id),'duplicate condition id');ids.add(c.id);return {...c,index:i}});
 need(Array.isArray(input.rows)&&input.rows.length>=6&&input.rows.length<=120,'rows requires 6–120 explicit observations');
 const rowIds=new Set();const rows=input.rows.map((r,i)=>{fields(r,['id','condition','observed','predicted','low','high','source'],'row '+i);text(r.id,'row.id',24);text(r.source,'row.source',140);need(!rowIds.has(r.id),'duplicate row id');rowIds.add(r.id);need(ids.has(r.condition),'row.condition unknown');for(const k of ['observed','predicted','low','high'])finite(r[k],'row.'+k);need(r.low<=r.predicted&&r.predicted<=r.high,'row interval must bracket prediction');need(r.high>r.low,'row interval must have positive width');return {...r,conditionIndex:conditions.find(c=>c.id===r.condition).index,residual:r.predicted-r.observed,covered:r.observed>=r.low&&r.observed<=r.high}});
 const observed=rows.map(r=>r.observed),predicted=rows.map(r=>r.predicted),values=[...observed,...rows.map(r=>r.low),...rows.map(r=>r.high),...predicted];let min=Math.min(...values),max=Math.max(...values),span=max-min;if(!(span>0))span=1;const pad=span*.08;const domain={min:min-pad,max:max+pad};
 const byCondition=conditions.map(c=>{const rs=rows.filter(r=>r.condition===c.id),bias=rs.reduce((a,r)=>a+r.residual,0)/rs.length,rmse=Math.sqrt(rs.reduce((a,r)=>a+r.residual*r.residual,0)/rs.length),coverage=rs.filter(r=>r.covered).length/rs.length;return {...c,count:rs.length,bias,rmse,covered:rs.filter(r=>r.covered).length,coverage}});
 const bias=rows.reduce((a,r)=>a+r.residual,0)/rows.length,rmse=Math.sqrt(rows.reduce((a,r)=>a+r.residual*r.residual,0)/rows.length),coverage=rows.filter(r=>r.covered).length/rows.length;
 return {family:'calibration-plot',title:input.title,subtitle:input.subtitle,xLabel:input.xLabel,yLabel:input.yLabel,unit:input.unit,note:input.note,dataStatus:input.dataStatus,conditions,rows,domain,byCondition,bias,rmse,covered:rows.filter(r=>r.covered).length,coverage,scope:'每一行是一个给定观测与预测配对；竖线是给定预测区间，不由图形反推；覆盖率仅描述这些输入行，不能替代外部校准验证或因果结论。',sourceTraceability:rows.map(r=>({id:r.id,condition:r.condition,source:r.source}))};
}
