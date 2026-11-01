const need=(ok,msg)=>{if(!ok)throw Error(msg)};
const own=(o,keys,label)=>{need(o&&typeof o==='object'&&!Array.isArray(o),`${label}: object required`);for(const k of Object.keys(o))need(keys.includes(k),`${label}.${k}: unsupported field`)};
const text=(v,label,max=220)=>{need(typeof v==='string'&&v.trim().length>0,`${label}: nonempty text required`);need([...v].length<=max,`${label}: exceeds ${max} characters`)};
const id=(v,label)=>{text(v,label,64);need(/^[a-z][a-z0-9_-]*$/i.test(v),`${label}: id must be alphanumeric`)};
const finite=(v,label)=>{need(typeof v==='number'&&Number.isFinite(v),`${label}: finite number required`)};

export function evidenceChainModel(input){
 own(input,['family','title','subtitle','note','unit','categories','groups','sources','panels','evidenceKind'],'evidence-chain');
 need(input.family==='evidence-chain','evidence-chain family required');
 for(const [k,n] of [['title',100],['subtitle',240],['note',420],['unit',32]])text(input[k],k,n);
 need(['supplied-data','synthetic-teaching','source-adapted-teaching'].includes(input.evidenceKind),'evidenceKind must be explicit');
 need(Array.isArray(input.categories)&&input.categories.length>=3&&input.categories.length<=12,'categories requires 3–12 shared labels');
 input.categories.forEach((v,i)=>text(v,`categories[${i}]`,48));need(new Set(input.categories).size===input.categories.length,'duplicate shared category');
 need(Array.isArray(input.groups)&&input.groups.length>=1&&input.groups.length<=4,'groups requires 1–4 shared groups');
 const gids=new Set();for(const [i,g] of input.groups.entries()){own(g,['id','label','color'],'group');id(g.id,`groups[${i}].id`);text(g.label,`groups[${i}].label`,48);text(g.color,`groups[${i}].color`,16);need(/^#[0-9a-f]{6}$/i.test(g.color),`groups[${i}].color must be hex`);need(!gids.has(g.id),'duplicate group id');gids.add(g.id)}
 need(Array.isArray(input.sources)&&input.sources.length>=1&&input.sources.length<=16,'sources requires 1–16 traceable sources');
 const sids=new Set();for(const [i,s] of input.sources.entries()){own(s,['id','label'],'source');id(s.id,`sources[${i}].id`);text(s.label,`sources[${i}].label`,100);need(!sids.has(s.id),'duplicate source id');sids.add(s.id)}
 need(Array.isArray(input.panels)&&input.panels.length>=3&&input.panels.length<=4,'panels requires 3–4 evidence panels');
 const pids=new Set(),roles=new Set();
 const panels=input.panels.map((p,pi)=>{
  own(p,['id','role','title','sampleDefinition','sourceIds','series','note'],'panel');id(p.id,`panels[${pi}].id`);text(p.title,`panels[${pi}].title`,100);text(p.sampleDefinition,`panels[${pi}].sampleDefinition`,180);need(['overview','comparison','detail','validation'].includes(p.role),`panels[${pi}].role must be overview, comparison or detail`);need(!pids.has(p.id),'duplicate panel id');pids.add(p.id);need(!roles.has(p.role),`panel role ${p.role} must appear once`);roles.add(p.role);
  need(Array.isArray(p.sourceIds)&&p.sourceIds.length>=1&&p.sourceIds.length<=8,`panels[${pi}].sourceIds required`);for(const sid of p.sourceIds){id(sid,`panels[${pi}].sourceIds`);need(sids.has(sid),`panels[${pi}]: unknown source ${sid}`)}
  if(p.note!==undefined)text(p.note,`panels[${pi}].note`,220);
  need(Array.isArray(p.series)&&p.series.length>=1&&p.series.length<=gids.size,`panels[${pi}].series requires 1–${gids.size}`);
  const seen=new Set();
  const series=p.series.map((s,si)=>{
   own(s,['groupId','values','uncertainty'],'series');
   id(s.groupId,`panels[${pi}].series[${si}].groupId`);
   need(gids.has(s.groupId),`panels[${pi}]: unknown group ${s.groupId}`);
   need(!seen.has(s.groupId),'duplicate panel group');seen.add(s.groupId);
   need(Array.isArray(s.values)&&s.values.length===input.categories.length,`panels[${pi}].series values must match shared categories`);
   s.values.forEach((v,j)=>{finite(v,`panels[${pi}].series[${si}].values[${j}]`);need(v>=0,`panels[${pi}].series values must be nonnegative`)});
   if(s.uncertainty!==undefined){
    own(s.uncertainty,['low','high'],'uncertainty');
    for(const key of ['low','high']){
     need(Array.isArray(s.uncertainty[key])&&s.uncertainty[key].length===input.categories.length,`uncertainty.${key} must match shared categories`);
     s.uncertainty[key].forEach((v,j)=>{finite(v,`uncertainty.${key}[${j}]`);need(v>=0,`uncertainty.${key} must be nonnegative`)});
    }
    need(s.uncertainty.low.every((v,j)=>v<=s.values[j]),'uncertainty.low cannot exceed value');
    need(s.uncertainty.high.every((v,j)=>v>=s.values[j]),'uncertainty.high cannot be below value');
   }
   return {...s,group:input.groups.find(g=>g.id===s.groupId)};
  });
  return {...p,series};
 });
 need(roles.has('overview')&&roles.has('comparison')&&roles.has('detail'),'panels must include overview, comparison and detail roles');need(input.panels.length===3||roles.has('validation'),'4 panels require validation role');
 const all=panels.flatMap(p=>p.series.flatMap(s=>s.uncertainty?[...s.uncertainty.low,...s.uncertainty.high]:s.values));
 const max=Math.max(...all,0);need(max>0,'at least one positive observation required');
 return {family:input.family,title:input.title,subtitle:input.subtitle,note:input.note,unit:input.unit,evidenceKind:input.evidenceKind,categories:[...input.categories],groups:input.groups.map(g=>({...g})),sources:input.sources.map(s=>({...s})),panels,sharedDomain:[0,max],scope:'Three-role evidence chain: shared categories, group identity and zero-based linear scale. Values and uncertainty are supplied; no statistical inference, normalization or source-image reconstruction.',traceability:{panelSources:panels.map(p=>({panelId:p.id,sourceIds:[...p.sourceIds]}))}};
}
