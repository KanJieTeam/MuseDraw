const ctNeed=(ok,msg)=>{if(!ok)throw Error(`claim-trace: ${msg}`)};
const ctText=(v,label,max)=>{ctNeed(typeof v==='string'&&v.trim().length>0,`${label}: nonempty text required`);ctNeed([...v].length<=max,`${label}: exceeds ${max} characters`);ctNeed(!/[\u0000-\u001f]/u.test(v),`${label}: control character forbidden`);return v};
const ctFields=(o,allowed,label)=>{ctNeed(o&&typeof o==='object'&&!Array.isArray(o),`${label} requires object`);for(const k of Object.keys(o))ctNeed(allowed.includes(k),`${label}.${k}: unsupported field`)};

/** Explicit scientific claim–evidence–limitation register. No causal or numeric inference is performed. */
export function claimTraceModel(input){
 ctFields(input,['family','title','subtitle','dataStatus','claims','sources','links','note'],'input');
 ctNeed(input.family==='claim-trace','family must be claim-trace');ctText(input.title,'title',100);ctText(input.subtitle,'subtitle',220);ctText(input.dataStatus,'dataStatus',180);ctText(input.note,'note',420);
 ctNeed(Array.isArray(input.claims)&&input.claims.length>=3&&input.claims.length<=8,'claims requires 3–8 items');ctNeed(Array.isArray(input.sources)&&input.sources.length>=3&&input.sources.length<=12,'sources requires 3–12 items');ctNeed(Array.isArray(input.links)&&input.links.length>=3&&input.links.length<=32,'links requires 3–32 explicit relations');
 const claimLevels=new Set(['observed','inferred','hypothesis']);const claims=[];const claimIds=new Set();
 for(const [i,c] of input.claims.entries()){
  ctFields(c,['id','label','level','detail','limits'],'claims[]');ctText(c.id,`claims[${i}].id`,32);ctNeed(!claimIds.has(c.id),'duplicate claim id');claimIds.add(c.id);ctText(c.label,`claims[${i}].label`,72);ctText(c.detail,`claims[${i}].detail`,180);ctNeed(claimLevels.has(c.level),`claims[${i}].level must be observed, inferred or hypothesis`);
  ctNeed(Array.isArray(c.limits)&&c.limits.length>=1&&c.limits.length<=3,`claim ${c.id} requires 1–3 explicit limitations`);
  const limitIds=new Set();const limits=c.limits.map((l,li)=>{ctFields(l,['id','text','sourceId'],'claims[].limits[]');ctText(l.id,`claims[${i}].limits[${li}].id`,32);ctNeed(!limitIds.has(l.id),`duplicate limit id in ${c.id}`);limitIds.add(l.id);ctText(l.text,`claims[${i}].limits[${li}].text`,150);ctText(l.sourceId,`claims[${i}].limits[${li}].sourceId`,32);return {...l}});
  claims.push({...c,index:i,limits});
 }
 const sourceKinds=new Set(['observation','experiment','review','model','dataset','protocol','record','measurement','image']);const sourceStatuses=new Set(['direct','indirect','missing']);const sources=[];const sourceIds=new Set();
 for(const [i,s] of input.sources.entries()){
  ctFields(s,['id','label','kind','status','detail'],'sources[]');ctText(s.id,`sources[${i}].id`,32);ctNeed(!sourceIds.has(s.id),'duplicate source id');sourceIds.add(s.id);ctText(s.label,`sources[${i}].label`,70);ctText(s.detail,`sources[${i}].detail`,170);ctNeed(sourceKinds.has(s.kind),`sources[${i}].kind unsupported`);ctNeed(sourceStatuses.has(s.status),`sources[${i}].status unsupported`);sources.push({...s,index:i});
 }
 const relationSet=new Set(['supports','contradicts','qualifies','unclear']);const linkIds=new Set();const links=[];
 for(const [i,l] of input.links.entries()){
  ctFields(l,['claimId','sourceId','relation','note'],'links[]');ctNeed(claimIds.has(l.claimId),`links[${i}].claimId unknown`);ctNeed(sourceIds.has(l.sourceId),`links[${i}].sourceId unknown`);ctNeed(relationSet.has(l.relation),`links[${i}].relation unsupported`);const key=`${l.claimId}/${l.sourceId}`;ctNeed(!linkIds.has(key),'duplicate claim/source link');linkIds.add(key);if(l.note!==undefined)ctText(l.note,`links[${i}].note`,100);links.push({...l});
 }
 const linked=new Map(claims.map(c=>[c.id,[]]));for(const l of links)linked.get(l.claimId).push(l);
 for(const c of claims){const ls=linked.get(c.id);ctNeed(ls.length>0,`claim ${c.id} requires at least one source relation`);for(const lim of c.limits)ctNeed(sourceIds.has(lim.sourceId),`claim ${c.id} limitation ${lim.id} sourceId unknown`);if(c.level==='observed')ctNeed(ls.some(l=>l.relation==='supports'&&sources.find(s=>s.id===l.sourceId)?.status==='direct'),`observed claim ${c.id} requires a direct supporting source`);if(/\d/.test(c.detail))ctNeed(ls.some(l=>sources.find(s=>s.id===l.sourceId)?.status==='direct'),'numeric detail requires a direct source relation');}
 return {family:input.family,title:input.title,subtitle:input.subtitle,dataStatus:input.dataStatus,claims,sources,links,note:input.note,scope:'Explicit claim-to-source relations and claim limitations only. Levels, evidence types and source statuses are declared inputs; no score, pooled estimate, confidence probability, completeness, correlation or causality is inferred.',traceability:{claims:claims.map(c=>({id:c.id,level:c.level,sourceIds:linked.get(c.id).map(l=>l.sourceId),limitSources:c.limits.map(l=>l.sourceId)})),sources:sources.map(s=>({id:s.id,status:s.status,kind:s.kind}))}};
}

export const demoClaimTrace={
 family:'claim-trace',title:'从观测到解释：一条可回查的证据链',subtitle:'把主张层级、来源状态和限制条件分开画；图面不把“相关”写成“因果”',dataStatus:'演示数据；主张与来源均为虚构登记项，不代表实验结论',
 claims:[
  {id:'c1',label:'处理后信号在 24 h 内上升',level:'observed',detail:'直接观测；时间窗、单位和样本范围见来源 O1',limits:[{id:'c1-l1',text:'仅覆盖声明的时间窗与样本范围。',sourceId:'o1'}]},
  {id:'c2',label:'信号变化与屏障恢复同步出现',level:'inferred',detail:'由两组时间序列的共同变化提出，仍需独立干预验证',limits:[{id:'c2-l1',text:'同步变化不能单独证明因果方向。',sourceId:'o2'},{id:'c2-l2',text:'批次与测量条件的差异限制外推。',sourceId:'o3'}]},
  {id:'c3',label:'该信号可能参与屏障恢复',level:'hypothesis',detail:'待机制实验检验；本图不把假设当作已证实因果',limits:[{id:'c3-l1',text:'抑制实验尚未完成，机制关系仍属假设。',sourceId:'m1'}]},
  {id:'c4',label:'不同批次的方向一致性有限',level:'inferred',detail:'批次 B 的区间跨过零点，不能直接汇总为稳定效应',limits:[{id:'c4-l1',text:'区间定义与缺失值处理需在正文中说明。',sourceId:'o3'}]}
 ],
 sources:[
  {id:'o1',label:'O1 · 24 h 定时观测',kind:'observation',status:'direct',detail:'原始读数与时间点已登记；单位为相对信号'},
  {id:'o2',label:'O2 · 屏障恢复时间序列',kind:'experiment',status:'direct',detail:'同一实验批次；恢复指标与信号未做因果操控'},
  {id:'o3',label:'O3 · 批次 B 复测',kind:'experiment',status:'indirect',detail:'区间较宽；样本量与缺失值处理见实验记录'},
  {id:'r1',label:'R1 · 机制综述线索',kind:'review',status:'indirect',detail:'用于提出候选机制，不替代本项目的直接证据'},
  {id:'m1',label:'M1 · 待执行抑制实验',kind:'model',status:'missing',detail:'尚未完成；不能在图中当作支持证据'}
 ],
 links:[{claimId:'c1',sourceId:'o1',relation:'supports'},{claimId:'c2',sourceId:'o1',relation:'supports'},{claimId:'c2',sourceId:'o2',relation:'supports'},{claimId:'c3',sourceId:'r1',relation:'supports',note:'候选机制线索'},{claimId:'c3',sourceId:'m1',relation:'qualifies',note:'待执行；不作为当前证据'},{claimId:'c4',sourceId:'o3',relation:'supports'},{claimId:'c4',sourceId:'o1',relation:'contradicts',note:'与单批次方向不同'}],
 note:'读图顺序：先看主张层级，再看连到它的来源状态与限制。direct / indirect / missing 是输入登记，不是模型评分。请在正文中说明研究设计、区间定义和未完成实验。'
};
