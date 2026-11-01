const vNeed=(ok,msg)=>{if(!ok)throw Error('volcano-plot: '+msg)};
function vFields(o,keys,label){vNeed(o&&typeof o==='object'&&!Array.isArray(o),label+' requires object');for(const k of Object.keys(o))vNeed(keys.includes(k),label+'.'+k+': unsupported field')}
function vText(v,label,max,empty=false){vNeed(typeof v==='string'&&(empty||v.trim())&&[...v].length<=max,label+': nonempty text, at most '+max+' characters')}
function vNum(v,label,min,max){vNeed(typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max,label+': finite number in ['+min+', '+max+']')}
export function volcanoPlotModel(b){
 vFields(b,['family','title','subtitle','xLabel','yLabel','thresholdP','thresholdEffect','dataStatus','points','note'],'input');
 vNeed(b.family==='volcano-plot','family must be volcano-plot');
 for(const [k,n] of [['title',100],['subtitle',220],['xLabel',60],['yLabel',60],['dataStatus',140]])vText(b[k],k,n);
 if(b.note!==undefined)vText(b.note,'note',600,true);
 vNum(b.thresholdP,'thresholdP',1e-12,.5);vNum(b.thresholdEffect,'thresholdEffect',0,8);
 vNeed(Array.isArray(b.points)&&b.points.length>=8&&b.points.length<=160,'points requires 8–160 observations');
 const ids=new Set();
 const points=b.points.map((p,i)=>{vFields(p,['id','label','effect','pValue','group'],'point');vText(p.id,'point.id',28);vNeed(!ids.has(p.id),'duplicate point id');ids.add(p.id);if(p.label!==undefined)vText(p.label,'point.label',28,true);vNum(p.effect,'point.effect',-8,8);vNum(p.pValue,'point.pValue',1e-12,1);if(p.group!==undefined)vText(p.group,'point.group',20,true);const score=-Math.log10(p.pValue),significant=p.pValue<=b.thresholdP&&Math.abs(p.effect)>=b.thresholdEffect;return {...p,score,significant,index:i}});
 vNeed(points.some(p=>p.effect<0)&&points.some(p=>p.effect>0),'points must span both effect directions');
 const maxEffect=Math.max(b.thresholdEffect+1,...points.map(p=>Math.abs(p.effect)));const maxScore=Math.max(-Math.log10(b.thresholdP)+1,...points.map(p=>p.score));
 const labels=points.filter(p=>p.label).sort((a,z)=>z.score-a.score||Math.abs(z.effect)-Math.abs(a.effect)).slice(0,3);
 const groups=[...new Set(points.map(p=>p.group).filter(Boolean))];
 const counts={up:points.filter(p=>p.significant&&p.effect>0).length,down:points.filter(p=>p.significant&&p.effect<0).length,other:points.filter(p=>!p.significant).length};
 return {family:'volcano-plot',title:b.title,subtitle:b.subtitle,xLabel:b.xLabel,yLabel:b.yLabel,thresholdP:b.thresholdP,thresholdEffect:b.thresholdEffect,dataStatus:b.dataStatus,note:b.note??'',points,labels,groups,maxEffect,maxScore,counts,scope:'explicit effect estimates and p-values only; thresholding is descriptive and does not assert biological importance, multiplicity correction, or causality'};
}
export const demoVolcanoPlot={family:'volcano-plot',title:'处理差异的效应量与证据强度',subtitle:'每个点是一项预先登记的比较；虚线只标出本页声明的筛选阈值',xLabel:'效应量（对数比例）',yLabel:'−log10（p 值）',thresholdP:0.01,thresholdEffect:1.2,dataStatus:'合成教学数据；p 值与效应量为输入示例，不代表真实实验结论',points:[{id:'g01',label:'转录因子 A',effect:2.1,pValue:.0004,group:'上调'},{id:'g02',label:'代谢通路 B',effect:-1.8,pValue:.0012,group:'下调'},{id:'g03',label:'应激响应 C',effect:1.4,pValue:.006,group:'上调'},{id:'g04',label:'膜蛋白 D',effect:-1.25,pValue:.009,group:'下调'},{id:'g05',effect:.8,pValue:.0002},{id:'g06',effect:-.7,pValue:.0008},{id:'g07',effect:2.8,pValue:.08},{id:'g08',effect:-2.2,pValue:.06},{id:'g09',effect:.25,pValue:.32},{id:'g10',effect:-.4,pValue:.21},{id:'g11',effect:1.05,pValue:.02},{id:'g12',effect:-1.1,pValue:.014},{id:'g13',effect:.55,pValue:.11},{id:'g14',effect:-.65,pValue:.15},{id:'g15',effect:1.7,pValue:.018},{id:'g16',effect:-1.45,pValue:.025}],note:'阈值由输入明确给出；达到筛选线不等于效应具有实际意义。请在正文中说明多重比较、效应量不确定性和研究设计。'};
