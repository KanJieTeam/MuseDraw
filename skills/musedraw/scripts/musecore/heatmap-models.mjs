const hNeed=(ok,msg)=>{if(!ok)throw Error('heatmap: '+msg)};
function hFields(o,keys,label){hNeed(o&&typeof o==='object'&&!Array.isArray(o),label+' requires object');for(const k of Object.keys(o))hNeed(keys.includes(k),label+'.'+k+': unsupported field')}
function hText(v,label,max,empty=false){hNeed(typeof v==='string'&&(empty||v.trim())&&[...v].length<=max,label+': nonempty text, at most '+max+' characters')}
function hNum(v,label,min=-1e9,max=1e9){hNeed(typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max,label+': finite number in ['+min+', '+max+']')}

/**
 * A bounded matrix heatmap for explicitly supplied measurements.
 * Cell colour is a visual encoding of the supplied value only; no clustering,
 * normalization, imputation or biological interpretation is inferred.
 */
export function heatmapModel(b){
 hFields(b,['family','title','subtitle','rowLabel','columnLabel','unit','min','max','dataStatus','columns','rows','note'],'input');
 hNeed(b.family==='heatmap','family must be heatmap');
 for(const [k,n] of [['title',100],['subtitle',220],['rowLabel',60],['columnLabel',60],['unit',24],['dataStatus',180]])hText(b[k],k,n);
 if(b.note!==undefined)hText(b.note,'note',620,true);
 hNum(b.min,'min');hNum(b.max,'max');hNeed(b.min<b.max,'min must be smaller than max');
 hNeed(Array.isArray(b.columns)&&b.columns.length>=3&&b.columns.length<=18,'columns requires 3–18 entries');
 hNeed(Array.isArray(b.rows)&&b.rows.length>=3&&b.rows.length<=24,'rows requires 3–24 entries');
 const colIds=new Set(),columns=b.columns.map((c,i)=>{hFields(c,['id','label'],'column');hText(c.id,'column.id',28);hText(c.label,'column.label',32);hNeed(!colIds.has(c.id),'duplicate column id');colIds.add(c.id);return {...c,index:i}});
 const rowIds=new Set(),rows=b.rows.map((row,ri)=>{hFields(row,['id','label','values'],'row');hText(row.id,'row.id',32);hText(row.label,'row.label',48);hNeed(!rowIds.has(row.id),'duplicate row id');rowIds.add(row.id);hNeed(Array.isArray(row.values)&&row.values.length===columns.length,'row.values must match column count');const seen=new Set();const values=row.values.map((cell,ci)=>{hFields(cell,['value','source'],'cell');hNum(cell.value,`cell ${row.id}/${columns[ci].id}`);hText(cell.source,`cell ${row.id}/${columns[ci].id}.source`,160);hNeed(!seen.has(columns[ci].id),'duplicate cell column');seen.add(columns[ci].id);return {...cell,columnId:columns[ci].id,columnIndex:ci}});return {...row,index:ri,values}});
 return {family:'heatmap',title:b.title,subtitle:b.subtitle,rowLabel:b.rowLabel,columnLabel:b.columnLabel,unit:b.unit,min:b.min,max:b.max,dataStatus:b.dataStatus,columns,rows,note:b.note??'',scope:'Explicit rectangular measurements only. Colour is a bounded encoding of supplied values; no clustering, ordering, normalization, imputation, significance, causality or biological interpretation is inferred.',sourceTraceability:rows.flatMap(r=>r.values.map(v=>({rowId:r.id,columnId:v.columnId,source:v.source}))) };
}

export const demoHeatmap={family:'heatmap',title:'样本 × 条件的测量矩阵',subtitle:'每个格子保留一项已登记测量；色阶只编码输入数值，不替代统计检验',rowLabel:'样本组',columnLabel:'条件',unit:'相对信号',min:-2,max:2,dataStatus:'合成教学数据；数值与来源为登记示例，不代表真实实验结论',columns:[{id:'c1',label:'基线'},{id:'c2',label:'轻度处理'},{id:'c3',label:'中度处理'},{id:'c4',label:'恢复期'},{id:'c5',label:'对照批次'}],rows:[{id:'r1',label:'样本组甲',values:[{value:-.8,source:'记录甲-1'},{value:.2,source:'记录甲-2'},{value:1.1,source:'记录甲-3'},{value:.5,source:'记录甲-4'},{value:-.1,source:'记录甲-5'}]},{id:'r2',label:'样本组乙',values:[{value:-.4,source:'记录乙-1'},{value:.7,source:'记录乙-2'},{value:1.6,source:'记录乙-3'},{value:.9,source:'记录乙-4'},{value:.2,source:'记录乙-5'}]},{id:'r3',label:'样本组丙',values:[{value:-1.4,source:'记录丙-1'},{value:-.6,source:'记录丙-2'},{value:.3,source:'记录丙-3'},{value:.1,source:'记录丙-4'},{value:-.5,source:'记录丙-5'}]},{id:'r4',label:'样本组丁',values:[{value:-.1,source:'记录丁-1'},{value:.9,source:'记录丁-2'},{value:1.3,source:'记录丁-3'},{value:.4,source:'记录丁-4'},{value:.6,source:'记录丁-5'}]},{id:'r5',label:'样本组戊',values:[{value:-.9,source:'记录戊-1'},{value:-.2,source:'记录戊-2'},{value:.4,source:'记录戊-3'},{value:-.2,source:'记录戊-4'},{value:-.7,source:'记录戊-5'}]}],note:'行列顺序、测量单位、缺失处理和统计检验需在正文中另行说明；本图未进行聚类或显著性判断。'};
