export function evidenceMatrixModel(b){
 const need=(ok,msg)=>{if(!ok)throw Error(msg)};
 const text=(v,p,max)=>{need(typeof v==='string'&&v.trim().length>0,`${p}: nonempty text required`);need([...v].length<=max,`${p}: exceeds ${max} characters`);return v};
 need(b&&typeof b==='object'&&!Array.isArray(b),'evidence-matrix input required');
 const allowed=['family','title','subtitle','columns','rows','legend','dataStatus','note'];
 for(const k of Object.keys(b))need(allowed.includes(k),`evidence-matrix.${k}: unsupported field`);
 need(b.family==='evidence-matrix','family must be evidence-matrix');
 text(b.title,'title',72);text(b.subtitle,'subtitle',160);text(b.dataStatus,'dataStatus',100);text(b.note,'note',260);
 need(Array.isArray(b.columns)&&b.columns.length>=2&&b.columns.length<=5,'columns requires 2–5 objects');
 need(Array.isArray(b.rows)&&b.rows.length>=3&&b.rows.length<=10,'rows requires 3–10 objects');
 const ids=new Set();
 const columns=b.columns.map((c,i)=>{need(c&&typeof c==='object'&&!Array.isArray(c),'column must be object');need(!ids.has(c.id),'duplicate column id');ids.add(c.id);text(c.id,`columns[${i}].id`,32);text(c.label,`columns[${i}].label`,30);return {id:c.id,label:c.label}});
 const rowIds=new Set();
 const statusSet=new Set(['confirmed','partial','missing','blocked','not-applicable']);
 const rows=b.rows.map((r,ri)=>{need(r&&typeof r==='object'&&!Array.isArray(r),'row must be object');need(!rowIds.has(r.id),'duplicate row id');rowIds.add(r.id);text(r.id,`rows[${ri}].id`,32);text(r.label,`rows[${ri}].label`,42);need(Array.isArray(r.values)&&r.values.length===columns.length,`rows[${ri}].values must match columns`);const values=r.values.map((v,ci)=>{need(v&&typeof v==='object'&&!Array.isArray(v),'cell must be object');need(statusSet.has(v.status),`rows[${ri}].values[${ci}].status unsupported`);if(v.note!==undefined)text(v.note,`rows[${ri}].values[${ci}].note`,48);return {status:v.status,note:v.note??null}});return {id:r.id,label:r.label,values}});
 const legend=b.legend??[{status:'confirmed',label:'已确认'},{status:'partial',label:'部分证据'},{status:'missing',label:'未提供'},{status:'blocked',label:'待处理'},{status:'not-applicable',label:'不适用'}];
 need(Array.isArray(legend)&&legend.length===5,'legend requires five statuses');
 for(const [i,l] of legend.entries()){need(l&&statusSet.has(l.status),`legend[${i}] status invalid`);text(l.label,`legend[${i}].label`,18)}
 return {family:b.family,title:b.title,subtitle:b.subtitle,dataStatus:b.dataStatus,note:b.note,columns,rows,legend};
}
