const mpeNeed=(ok,msg)=>{if(!ok)throw Error(msg)};
const mpeOwn=(o,keys,label)=>{mpeNeed(o&&typeof o==='object'&&!Array.isArray(o),`${label}: object required`);for(const k of Object.keys(o))mpeNeed(keys.includes(k),`${label}.${k}: unsupported field`)};
const mpeText=(v,label,max=240)=>{mpeNeed(typeof v==='string'&&v.trim().length>0,`${label}: nonempty text required`);mpeNeed([...v].length<=max,`${label}: exceeds ${max} characters`)};
const mpeId=(v,label)=>{mpeText(v,label,64);mpeNeed(/^[a-z][a-z0-9_-]*$/i.test(v),`${label}: id must be alphanumeric`)};
const mpeFinite=(v,label)=>mpeNeed(typeof v==='number'&&Number.isFinite(v),`${label}: finite number required`);
const mpeHex=(v,label)=>mpeNeed(typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v),`${label}: six-digit hex colour required`);
const mpeStatuses=['confirmed','partial','missing','blocked','not-applicable'];

/**
 * A bounded composition for a scientific multi-panel figure. The input names
 * the reading roles and evidence provenance; it never asks the host to choose
 * arbitrary coordinates or invent a relationship between panels.
 */
export function multiPanelEvidenceModel(input){
 mpeOwn(input,['family','title','subtitle','question','note','evidenceKind','scalePolicy','sources','groups','panels'],'multi-panel-evidence');
 mpeNeed(input.family==='multi-panel-evidence','multi-panel-evidence family required');
 for(const [k,n] of [['title',100],['subtitle',240],['question',240],['note',420]])mpeText(input[k],k,n);
 mpeNeed(['supplied-data','synthetic-teaching','source-adapted-teaching'].includes(input.evidenceKind),'evidenceKind must be explicit');
 mpeNeed(input.scalePolicy==='shared-zero','multi-panel-evidence currently requires an explicit shared-zero scale policy');
 mpeNeed(Array.isArray(input.sources)&&input.sources.length>=1&&input.sources.length<=12,'sources requires 1–12 traceable sources');
 const sourceIds=new Set();
 for(const [i,s] of input.sources.entries()){
  mpeOwn(s,['id','label'],'source');mpeId(s.id,`sources[${i}].id`);mpeText(s.label,`sources[${i}].label`,110);mpeNeed(!sourceIds.has(s.id),'duplicate source id');sourceIds.add(s.id);
 }
 mpeNeed(Array.isArray(input.groups)&&input.groups.length>=1&&input.groups.length<=4,'groups requires 1–4 plot groups');
 const groupIds=new Set();
 for(const [i,g] of input.groups.entries()){
  mpeOwn(g,['id','label','color'],'group');mpeId(g.id,`groups[${i}].id`);mpeText(g.label,`groups[${i}].label`,50);mpeHex(g.color,`groups[${i}].color`);mpeNeed(!groupIds.has(g.id),'duplicate group id');groupIds.add(g.id);
 }
 mpeNeed(Array.isArray(input.panels)&&input.panels.length>=3&&input.panels.length<=4,'panels requires 3–4 evidence panels');
 const roles=['overview','comparison','detail','validation'],panelIds=new Set(),roleSet=new Set(),plotCategories=[];
 const panels=input.panels.map((p,pi)=>{
  mpeOwn(p,['id','role','title','sampleDefinition','sourceIds','kind','weight','categories','series','columns','rows','blocks'],'panel');
  mpeId(p.id,`panels[${pi}].id`);mpeText(p.title,`panels[${pi}].title`,100);mpeText(p.sampleDefinition,`panels[${pi}].sampleDefinition`,190);
  mpeNeed(roles.includes(p.role),`panels[${pi}].role must be overview, comparison, detail or validation`);mpeNeed(!panelIds.has(p.id),'duplicate panel id');mpeNeed(!roleSet.has(p.role),`panel role ${p.role} must appear once`);panelIds.add(p.id);roleSet.add(p.role);
  mpeNeed(Number.isInteger(p.weight)&&p.weight>=1&&p.weight<=3,`panels[${pi}].weight must be integer 1–3`);
  mpeNeed(Array.isArray(p.sourceIds)&&p.sourceIds.length>=1&&p.sourceIds.length<=8,`panels[${pi}].sourceIds required`);for(const sid of p.sourceIds){mpeId(sid,`panels[${pi}].sourceIds`);mpeNeed(sourceIds.has(sid),`panels[${pi}]: unknown source ${sid}`)}
  mpeNeed(['plot','table','text'].includes(p.kind),`panels[${pi}].kind must be plot, table or text`);
  if(p.kind==='plot'){
   mpeNeed(Array.isArray(p.categories)&&p.categories.length>=2&&p.categories.length<=10,`panels[${pi}].categories requires 2–10 labels`);p.categories.forEach((c,i)=>mpeText(c,`panels[${pi}].categories[${i}]`,42));mpeNeed(new Set(p.categories).size===p.categories.length,'plot categories must be unique');
   mpeNeed(Array.isArray(p.series)&&p.series.length>=1&&p.series.length<=groupIds.size,`panels[${pi}].series requires 1–${groupIds.size} series`);const seen=new Set();
   const series=p.series.map((s,si)=>{
    mpeOwn(s,['groupId','values','uncertainty'],'series');mpeId(s.groupId,`panels[${pi}].series[${si}].groupId`);mpeNeed(groupIds.has(s.groupId),`panels[${pi}]: unknown group ${s.groupId}`);mpeNeed(!seen.has(s.groupId),'duplicate plot group');seen.add(s.groupId);
    mpeNeed(Array.isArray(s.values)&&s.values.length===p.categories.length,`panels[${pi}].series values must match categories`);s.values.forEach((v,j)=>{mpeFinite(v,`panels[${pi}].series[${si}].values[${j}]`);mpeNeed(v>=0,`panels[${pi}].series values must be nonnegative under shared-zero policy`)});
    let uncertainty=null;if(s.uncertainty!==undefined){mpeOwn(s.uncertainty,['low','high'],'uncertainty');uncertainty={low:s.uncertainty.low,high:s.uncertainty.high};for(const key of ['low','high']){mpeNeed(Array.isArray(uncertainty[key])&&uncertainty[key].length===p.categories.length,`uncertainty.${key} must match categories`);uncertainty[key].forEach((v,j)=>{mpeFinite(v,`uncertainty.${key}[${j}]`);mpeNeed(v>=0,`uncertainty.${key} must be nonnegative`)});}mpeNeed(uncertainty.low.every((v,j)=>v<=s.values[j]),'uncertainty.low cannot exceed value');mpeNeed(uncertainty.high.every((v,j)=>v>=s.values[j]),'uncertainty.high cannot be below value')}
    return {...s,uncertainty,group:input.groups.find(g=>g.id===s.groupId)};
   });
   plotCategories.push({id:p.id,categories:[...p.categories]});return {...p,series};
  }
  if(p.kind==='table'){
   mpeNeed(Array.isArray(p.columns)&&p.columns.length>=2&&p.columns.length<=5,`panels[${pi}].columns requires 2–5 columns`);const colIds=new Set();const columns=p.columns.map((c,ci)=>{mpeOwn(c,['id','label'],'column');mpeId(c.id,`panels[${pi}].columns[${ci}].id`);mpeText(c.label,`panels[${pi}].columns[${ci}].label`,40);mpeNeed(!colIds.has(c.id),'duplicate table column');colIds.add(c.id);return {...c}});
   mpeNeed(Array.isArray(p.rows)&&p.rows.length>=2&&p.rows.length<=8,`panels[${pi}].rows requires 2–8 rows`);const rowIds=new Set();const rows=p.rows.map((r,ri)=>{mpeOwn(r,['id','label','cells'],'row');mpeId(r.id,`panels[${pi}].rows[${ri}].id`);mpeText(r.label,`panels[${pi}].rows[${ri}].label`,70);mpeNeed(!rowIds.has(r.id),'duplicate table row');rowIds.add(r.id);mpeNeed(Array.isArray(r.cells)&&r.cells.length===columns.length,`panels[${pi}].rows[${ri}].cells must match columns`);const cells=r.cells.map((c,ci)=>{mpeOwn(c,['status','note'],'cell');mpeNeed(mpeStatuses.includes(c.status),`panels[${pi}].rows[${ri}].cells[${ci}].status unsupported`);if(c.note!==undefined)mpeText(c.note,`panels[${pi}].rows[${ri}].cells[${ci}].note`,48);return {...c}});return {...r,cells}});return {...p,columns,rows};
  }
  mpeNeed(Array.isArray(p.blocks)&&p.blocks.length>=2&&p.blocks.length<=6,`panels[${pi}].blocks requires 2–6 blocks`);const blockIds=new Set();const blocks=p.blocks.map((b,bi)=>{mpeOwn(b,['id','label','text'],'block');mpeId(b.id,`panels[${pi}].blocks[${bi}].id`);mpeText(b.label,`panels[${pi}].blocks[${bi}].label`,60);mpeText(b.text,`panels[${pi}].blocks[${bi}].text`,180);mpeNeed(!blockIds.has(b.id),'duplicate text block');blockIds.add(b.id);return {...b}});return {...p,blocks};
 });
 mpeNeed(roleSet.has('overview'),'panels must include one overview role');
 if(plotCategories.length>1){const first=JSON.stringify(plotCategories[0].categories);mpeNeed(plotCategories.every(p=>JSON.stringify(p.categories)===first),'all plot panels must share category identities under shared-zero policy')}
 const values=panels.flatMap(p=>p.kind==='plot'?p.series.flatMap(s=>s.values):[]),max=Math.max(...values,0);mpeNeed(max>0,'at least one positive plot observation required');
 return {family:input.family,title:input.title,subtitle:input.subtitle,question:input.question,note:input.note,evidenceKind:input.evidenceKind,scalePolicy:input.scalePolicy,sources:input.sources.map(s=>({...s})),groups:input.groups.map(g=>({...g})),panels,sharedDomain:[0,max],scope:'Bounded multi-panel evidence composition: one explicit overview plus comparison/detail/validation roles. Plot panels share categories and a zero-based domain; table/text panels retain supplied statuses and declarations. No statistics, source-image reconstruction, causal claim or panel relation is inferred.',traceability:{panelSources:panels.map(p=>({panelId:p.id,role:p.role,sourceIds:[...p.sourceIds]}))}};
}
