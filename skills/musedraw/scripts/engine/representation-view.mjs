// Identity-preserving views of supplied elements. Values are copied, never inferred.
// This adapter emits ordinary native scene objects; existing tensor inputs are untouched.
import {measure} from './text.mjs';

const need=(ok,message)=>{if(!ok)throw new Error(`representation: ${message}`)};
const fields=(o,keys,label)=>{need(o&&typeof o==='object'&&!Array.isArray(o),`${label} requires an object`);for(const key of Object.keys(o))need(keys.includes(key),`${label}.${key}: unsupported field`)};
function text(value,label,max){need(typeof value==='string'&&value.trim().length>0&&[...value].length<=max,`${label}: nonempty text, at most ${max} characters`);need(!/[\u0000-\u001f\u007f]/u.test(value),`${label}: control characters forbidden`);try{encodeURIComponent(value)}catch{need(false,`${label}: valid Unicode required`)}return value}
function shape(value,label,count){need(Array.isArray(value)&&value.length===2&&value.every(v=>Number.isSafeInteger(v)&&v>=1&&v<=24),`${label}: two integer dimensions in 1..24 required`);need(value[0]*value[1]===count,`${label}: shape must contain every source element exactly once`);return [...value]}

export function representationModel(input){
 fields(input,['method','theme','title','source','target','focusIds','width','note'],'input');need(input.method==='representation','method must be representation');text(input.title,'title',120);if(input.note!==undefined)text(input.note,'note',320);if(input.theme!==undefined)text(input.theme,'theme',32);
 fields(input.source,['id','shape','elements'],'source');text(input.source.id,'source.id',24);need(Array.isArray(input.source.elements)&&input.source.elements.length>=2&&input.source.elements.length<=24,'source.elements requires 2..24 supplied elements');
 const sourceShape=shape(input.source.shape,'source.shape',input.source.elements.length),ids=new Set();
 const elements=input.source.elements.map((element,index)=>{
  fields(element,['id','value','label'],'element');text(element.id,'element.id',24);need(!ids.has(element.id),`duplicate source element ID ${element.id}`);ids.add(element.id);text(element.label,'element.label',48);
  if(typeof element.value==='number')need(Number.isFinite(element.value),'element.value must be finite');else text(element.value,'element.value',24);
  return {...element,sourcePosition:{row:Math.floor(index/sourceShape[1]),column:index%sourceShape[1]}};
 });
 fields(input.target,['shape','order'],'target');const targetShape=shape(input.target.shape,'target.shape',elements.length);need(Array.isArray(input.target.order)&&input.target.order.length===elements.length,'target.order must contain every source element exactly once');
 const targetIds=new Set();for(const id of input.target.order){need(ids.has(id),`unknown target element ID ${String(id)}`);need(!targetIds.has(id),`duplicate target element ID ${id}`);targetIds.add(id)}
 const focusIds=input.focusIds??[];need(Array.isArray(focusIds)&&focusIds.length<=2&&new Set(focusIds).size===focusIds.length,'focusIds requires at most two distinct IDs');for(const id of focusIds)need(ids.has(id),`unknown focus element ID ${String(id)}`);
 const width=input.width??1800;need(Number.isFinite(width)&&width>=800&&width<=3200,'width must be finite pixels in 800..3200');
 const targetElements=input.target.order.map((id,index)=>({...elements.find(e=>e.id===id),targetPosition:{row:Math.floor(index/targetShape[1]),column:index%targetShape[1]}}));
 return {title:input.title,theme:input.theme??'journal',sourceId:input.source.id,sourceShape,targetShape,elements,targetElements,focusIds:[...focusIds],width,note:input.note??'',mapping:targetElements.map(e=>({id:e.id,value:e.value,label:e.label,from:{...e.sourcePosition},to:{...e.targetPosition}})),scope:'Row-major supplied source elements, explicitly reshaped or reordered without aggregation, deletion, duplication, inferred features or physical movement. Values and labels are copied from source identity; equal values remain distinct elements.'};
}

/** Optional measurement adapter returns {width,ascent,descent} for actual output fonts. */
export function composeRepresentation(input,{measureText,fontFamily="Arial, 'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif"}={}){
 const m=representationModel(input),font=fontFamily,ink='ink',muted='muted',focus='accent',margin=64,gap=80,inner=m.width-2*margin;
 const metrics=(value,size,weight=400)=>{const result=measureText?measureText(String(value),size,font,weight):{width:measure(value,size,font,0,weight)*1.18+size*.25,ascent:size*1.2,descent:size*.4};need(result&&[result.width,result.ascent,result.descent].every(v=>Number.isFinite(v)&&v>=0)&&result.ascent+result.descent>0,'invalid text metrics');return result};
 const plan=(value,width,size,weight,max)=>{const lines=[];let line='';for(const ch of String(value)){need(metrics(ch,size,weight).width<=width,'one glyph cannot fit; use a wider view');if(line&&metrics(line+ch,size,weight).width>width){lines.push(line);line=''}line+=ch}if(line)lines.push(line);need(lines.length<=max,`text exceeds ${max} lines at ${size}px; use a wider view or shorter supplied label`);const ms=lines.map(l=>metrics(l,size,weight)),ascent=Math.max(...ms.map(v=>v.ascent)),descent=Math.max(...ms.map(v=>v.descent)),step=Math.max(size*1.4,ascent+descent+5);return {lines,size,weight,ascent,step,height:ascent+descent+(lines.length-1)*step}};
 const typeScale=m.width/1200,sizes={id:Math.max(17,15*typeScale),label:Math.max(20,16*typeScale),value:Math.max(30,24*typeScale),title:Math.max(40,32*typeScale),view:Math.max(24,20*typeScale)};
 const cols=m.sourceShape[1]+m.targetShape[1],stackedW=inner/Math.max(m.sourceShape[1],m.targetShape[1]);let sideBySide=cols*136+gap<=inner,cellW=sideBySide?(inner-gap)/cols:stackedW;need(cellW>=136,'shape exceeds available width at minimum cell size; increase width or supply another explicit shape');
 const makePlans=width=>new Map(m.elements.map(e=>[e.id,{id:plan(e.id,width-32,sizes.id,700,3),value:plan(String(e.value),width-32,sizes.value,700,3),label:plan(e.label,width-32,sizes.label,400,6)}]));
 let plans;try{plans=makePlans(cellW)}catch(error){if(!sideBySide)throw error;sideBySide=false;cellW=stackedW;plans=makePlans(cellW)}
 // Compare whole arrangements, including the extra rows introduced by stacking.
 // Longer labels can justify more width, but never at the cost of unreadable height.
 const heightOf=ps=>Math.ceil(Math.max(...[...ps.values()].map(p=>16+p.id.height+12+p.value.height+12+p.label.height+18)));
 if(sideBySide&&stackedW>cellW*1.35){const stackedPlans=makePlans(stackedW),sideHeight=Math.max(m.sourceShape[0],m.targetShape[0])*heightOf(plans),stackedHeight=(m.sourceShape[0]+m.targetShape[0])*heightOf(stackedPlans)+100+sizes.view*1.6;if(stackedHeight<sideHeight){sideBySide=false;cellW=stackedW;plans=stackedPlans}}
 const cellH=Math.ceil(Math.max(...[...plans.values()].map(p=>16+p.id.height+12+p.value.height+12+p.label.height+18))),title=plan(m.title,inner,sizes.title,700,3),note=m.note?plan(m.note,inner,sizes.label,400,6):null;
 const viewLabel=(name,s)=>plan(`${name}  ${s[0]} × ${s[1]}`,inner,sizes.view,700,2),sourceLabel=viewLabel('源表示',m.sourceShape),targetLabel=viewLabel('目标表示',m.targetShape),labelH=Math.max(sourceLabel.height,targetLabel.height),top=50+title.height+56;
 let sourceX=margin,sourceY=top+labelH+20,targetX,targetY,targetLabelY;
 if(sideBySide){targetX=sourceX+m.sourceShape[1]*cellW+gap;targetY=sourceY;targetLabelY=top}
 else{sourceX=margin+(inner-m.sourceShape[1]*cellW)/2;targetX=margin+(inner-m.targetShape[1]*cellW)/2;targetLabelY=sourceY+m.sourceShape[0]*cellH+100;targetY=targetLabelY+targetLabel.height+20}
 const bottom=Math.max(sourceY+m.sourceShape[0]*cellH,targetY+m.targetShape[0]*cellH),noteY=bottom+48,height=Math.ceil(noteY+(note?.height??0)+50);need(height<=6000,'composition exceeds 6000px height; split the supplied views');
 const previewScale=Math.min(1,1200/m.width,1000/height);need(sizes.id*previewScale>=14,'content cannot preserve 14px text in a 1200×1000 preview; split the view or use shorter supplied labels');
 const scene={schemaVersion:1,theme:m.theme,size:[m.width,height],header:false,footer:false,autoFit:false,style:{canvas:{frameLabels:false}},nodes:[],texts:[],paths:[],meta:{composition:'representation',representation:'array-reorder',readerQuestion:'同一组元素在给定重排前后分别位于哪里，哪些身份和值保持不变？',arrayRepresentation:{sourceId:m.sourceId,sourceShape:m.sourceShape,targetShape:m.targetShape,mapping:m.mapping,scope:m.scope,orientation:'row-major',layout:sideBySide?'side-by-side':'stacked'}}};
 const draw=(id,x,y,p,color=ink)=>p.lines.forEach((line,i)=>scene.texts.push({id:`${id}-${i}`,x,y:y+p.ascent+i*p.step,text:line,size:p.size,weight:p.weight,color}));
 draw('representation-title',margin,50,title);draw('representation-source-label',sourceX,top,sourceLabel);draw('representation-target-label',targetX,targetLabelY,targetLabel);if(note)draw('representation-note',margin,noteY,note,muted);
 const views=[{id:'source',x:sourceX,y:sourceY,elements:m.elements,shape:m.sourceShape},{id:'target',x:targetX,y:targetY,elements:m.targetElements,shape:m.targetShape}];
 const geometry=[];
 for(const view of views)for(const [index,e] of view.elements.entries()){
  const token=encodeURIComponent(e.id).replace(/-/gu,'%2D'),x=view.x+(index%view.shape[1])*cellW,y=view.y+Math.floor(index/view.shape[1])*cellH,p=plans.get(e.id),selected=m.focusIds.includes(e.id),id=`representation-${view.id}-${token}`;
  scene.nodes.push({id,shape:'box',x:x+4,y:y+4,w:cellW-8,h:cellH-8,fill:'bg',stroke:selected?focus:'line',label:'',labelPos:'none',radius:0,overlap:true});
  draw(`${id}-id`,x+16,y+16,p.id,selected?focus:muted);draw(`${id}-value`,x+16,y+16+p.id.height+12,p.value);draw(`${id}-label`,x+16,y+16+p.id.height+12+p.value.height+12,p.label,muted);geometry.push({view:view.id,id:e.id,nodeId:id,x:x+4,y:y+4,w:cellW-8,h:cellH-8});
 }
 // A single operation arrow expresses representation change, not cell-by-cell flow.
 if(sideBySide){const y=sourceY+Math.min(m.sourceShape[0],m.targetShape[0])*cellH/2,x=sourceX+m.sourceShape[1]*cellW+18;scene.paths.push({id:'representation-operation',d:`M${x} ${y}H${targetX-18}M${targetX-28} ${y-7}L${targetX-18} ${y}L${targetX-28} ${y+7}`,stroke:ink,width:1.8,fill:'none'})}
 else{const x=m.width/2,y=sourceY+m.sourceShape[0]*cellH+20;scene.paths.push({id:'representation-operation',d:`M${x} ${y}V${targetLabelY-24}M${x-7} ${targetLabelY-34}L${x} ${targetLabelY-24}L${x+7} ${targetLabelY-34}`,stroke:ink,width:1.8,fill:'none'})}
 scene.meta.arrayRepresentation.geometry=geometry;return scene;
}
