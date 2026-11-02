const aNeed=(ok,msg)=>{if(!ok)throw Error('agreement-plot: '+msg)};
const aFields=(o,keys,label)=>{aNeed(o&&typeof o==='object'&&!Array.isArray(o),label+' requires object');for(const k of Object.keys(o))aNeed(keys.includes(k),label+'.'+k+': unsupported field')};
const aText=(v,label,max,empty=false)=>aNeed(typeof v==='string'&&(empty||v.trim())&&[...v].length<=max,label+': nonempty text, at most '+max+' characters');
const aNum=(v,label,min=-1e6,max=1e6)=>aNeed(typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max,label+': finite number in ['+min+', '+max+']');

/**
 * A bounded mean-difference view for paired measurements. Reference and limit
 * lines are supplied explicitly; no agreement test or population claim is made.
 */
export function agreementPlotModel(input){
 aFields(input,['family','title','subtitle','xLabel','yLabel','unit','referenceDifference','lowerLimit','upperLimit','dataStatus','pairs','note'],'input');aNeed(input.family==='agreement-plot','family must be agreement-plot');
 for(const [k,n] of [['title',100],['subtitle',220],['xLabel',60],['yLabel',80],['unit',24],['dataStatus',180],['note',620]])aText(input[k],k,n,k==='note');
 aNum(input.referenceDifference,'referenceDifference');aNum(input.lowerLimit,'lowerLimit');aNum(input.upperLimit,'upperLimit');aNeed(input.lowerLimit<input.referenceDifference&&input.referenceDifference<input.upperLimit,'limits must bracket referenceDifference');
 aNeed(Array.isArray(input.pairs)&&input.pairs.length>=5&&input.pairs.length<=120,'pairs requires 5–120 paired observations');
 const ids=new Set(),pairs=input.pairs.map((p,index)=>{aFields(p,['id','label','first','second','source'],'pair');aText(p.id,'pair.id',32);aNeed(!ids.has(p.id),'duplicate pair id');ids.add(p.id);if(p.label!==undefined)aText(p.label,'pair.label',36,true);aNum(p.first,'pair.first');aNum(p.second,'pair.second');aText(p.source,'pair.source',160);const mean=(p.first+p.second)/2,difference=p.second-p.first;return {...p,index,mean,difference}});
 const differences=[...pairs.map(p=>p.difference),input.referenceDifference,input.lowerLimit,input.upperLimit],rawMin=Math.min(...differences),rawMax=Math.max(...differences),xSpan=Math.max(...pairs.map(p=>p.mean))-Math.min(...pairs.map(p=>p.mean)),xPad=Math.max(xSpan*.08,1),ySpan=Math.max(rawMax-rawMin,1),yPad=ySpan*.08;
 return {family:'agreement-plot',title:input.title,subtitle:input.subtitle,xLabel:input.xLabel,yLabel:input.yLabel,unit:input.unit,referenceDifference:input.referenceDifference,lowerLimit:input.lowerLimit,upperLimit:input.upperLimit,dataStatus:input.dataStatus,pairs,note:input.note??'',domain:{xMin:Math.min(...pairs.map(p=>p.mean))-xPad,xMax:Math.max(...pairs.map(p=>p.mean))+xPad,yMin:rawMin-yPad,yMax:rawMax+yPad},meanDifference:pairs.reduce((s,p)=>s+p.difference,0)/pairs.length,sourceTraceability:pairs.map(p=>({id:p.id,label:p.label??null,first:p.first,second:p.second,mean:p.mean,difference:p.difference,source:p.source})),scope:'Paired input values with arithmetic means and differences only. Supplied reference and limit lines are descriptive annotations; no agreement test, bias conclusion, confidence interval or population inference is added.'};
}

export const demoAgreementPlot={family:'agreement-plot',title:'两种测量的成对差值',subtitle:'每个点连接同一对象的两次读数；参考线与界限由输入明确提供',xLabel:'两次读数的均值',yLabel:'第二次 − 第一次',unit:'相对单位',referenceDifference:0,lowerLimit:-.42,upperLimit:.42,dataStatus:'合成教学数据；成对读数用于说明图形，不代表仪器验证或总体一致性',pairs:[
 {id:'p01',label:'样本 01',first:2.1,second:2.0,source:'配对表 A · 行 2'},
 {id:'p02',label:'样本 02',first:2.8,second:3.0,source:'配对表 A · 行 3'},
 {id:'p03',label:'样本 03',first:3.4,second:3.2,source:'配对表 A · 行 4'},
 {id:'p04',label:'样本 04',first:4.1,second:4.4,source:'配对表 A · 行 5'},
 {id:'p05',label:'样本 05',first:4.8,second:4.6,source:'配对表 A · 行 6'},
 {id:'p06',label:'样本 06',first:5.3,second:5.5,source:'配对表 A · 行 7'},
 {id:'p07',label:'样本 07',first:6.0,second:5.7,source:'配对表 A · 行 8'},
 {id:'p08',label:'样本 08',first:6.8,second:6.9,source:'配对表 A · 行 9'}
],note:'纵轴是每对读数的有向差值；水平线仅表示本页输入的参考差值和界限，不是自动计算的接受标准。请在正文中说明仪器、配对条件、单位和界限来源。'};
