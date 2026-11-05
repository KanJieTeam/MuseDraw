const obNeed=(ok,msg)=>{if(!ok)throw Error(msg)};
const obFields=(v,allowed,label)=>{obNeed(v&&typeof v==='object'&&!Array.isArray(v),`${label}: object required`);for(const k of Object.keys(v))obNeed(allowed.includes(k),`${label}.${k}: unsupported field`)};
const obText=(v,label,max=160)=>{obNeed(typeof v==='string'&&v.trim().length>0,`${label}: nonempty text required`);obNeed([...v].length<=max,`${label}: exceeds ${max} characters`);return v};
const obFinite=(v,label)=>obNeed(typeof v==='number'&&Number.isFinite(v),`${label}: finite number required`);

export function operationsBoardModel(input){
 obFields(input,['family','title','subtitle','asOf','headline','headlineUnit','headlineState','signals','trend','queue','note'],'operations-board');
 obNeed(input.family==='operations-board','operations-board family required');
 for(const k of ['title','subtitle','asOf','headline','headlineUnit','headlineState','note'])obText(input[k],k,k==='title'?120: k==='note'?220:80);
 obNeed(['steady','watch','critical'].includes(input.headlineState),'headlineState must be steady, watch or critical');
 obNeed(Array.isArray(input.signals)&&input.signals.length>=2&&input.signals.length<=4,'signals requires 2–4 items');
 const signals=input.signals.map((s,i)=>{obFields(s,['label','value','unit','state','detail'],`signals[${i}]`);obText(s.label,`signals[${i}].label`,42);obText(String(s.value),`signals[${i}].value`,32);obText(s.unit,`signals[${i}].unit`,20);obText(s.detail,`signals[${i}].detail`,90);obNeed(['steady','watch','critical'].includes(s.state),`signals[${i}].state unsupported`);return {...s,value:String(s.value)}});
 obFields(input.trend,['unit','period','labels','values','emphasis'],'trend');obText(input.trend.unit,'trend.unit',20);obText(input.trend.period,'trend.period',40);obNeed(Array.isArray(input.trend.labels)&&Array.isArray(input.trend.values),'trend labels and values required');obNeed(input.trend.labels.length===input.trend.values.length&&input.trend.labels.length>=3&&input.trend.labels.length<=12,'trend needs 3–12 aligned points');input.trend.labels.forEach((v,i)=>obText(v,`trend.labels[${i}]`,24));input.trend.values.forEach((v,i)=>{obFinite(v,`trend.values[${i}]`)});obText(input.trend.emphasis,'trend.emphasis',40);
 obNeed(Array.isArray(input.queue)&&input.queue.length>=2&&input.queue.length<=8,'queue requires 2–8 items');
 const queue=input.queue.map((q,i)=>{obFields(q,['id','label','owner','due','state'],'queue');obText(q.id,`queue[${i}].id`,24);obText(q.label,`queue[${i}].label`,72);obText(q.owner,`queue[${i}].owner`,32);obText(q.due,`queue[${i}].due`,32);obNeed(['now','next','held'].includes(q.state),`queue[${i}].state unsupported`);return {...q}});
 return {...input,signals,trend:{...input.trend},queue,scope:'Bounded operations board: one headline, 2–4 status signals, one measured trend and 2–8 explicit work items. No inferred realtime state, causal claim, or decorative KPI grid.'};
}

export const demoOperationsBoard={family:'operations-board',title:'交付运行看板',subtitle:'把当前态势、变化方向和下一步动作放在同一条阅读路径上',asOf:'2026-11-05 14:00',headline:'86',headlineUnit:'% 按期完成',headlineState:'watch',signals:[{label:'进行中',value:12,unit:'项',state:'steady',detail:'按当前排程推进'},{label:'需关注',value:3,unit:'项',state:'watch',detail:'今日内确认阻塞点'},{label:'已逾期',value:1,unit:'项',state:'critical',detail:'已分派负责人'}],trend:{unit:'完成率 %',period:'近 7 个工作日',labels:['周一','周二','周三','周四','周五','周六','周日'],values:[72,75,74,79,81,84,86],emphasis:'按期完成'},queue:[{id:'Q-01',label:'确认数据口径',owner:'数据组',due:'今天 16:00',state:'now'},{id:'Q-02',label:'补齐验收截图',owner:'报告组',due:'明天 11:00',state:'next'},{id:'Q-03',label:'复核高风险项',owner:'项目组',due:'明天 15:00',state:'next'},{id:'Q-04',label:'处理接口回退',owner:'平台组',due:'已逾期',state:'held'}],note:'状态来自登记时点；趋势只描述观测值，不替代项目复盘。'};
