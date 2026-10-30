import {el} from './svg.mjs';
export const VISUAL_TYPE={sans:"Arial, 'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif",serif:"Georgia, 'SimSun', 'Noto Serif CJK SC', serif",mono:"Consolas, 'Microsoft YaHei', monospace"};
const widths=new Map();let context;
export function measureVisual(value,size=24,role='sans',weight=400){
 const family=VISUAL_TYPE[role];if(!family)throw Error('Unknown type role');
 const key=JSON.stringify([value,size,role,weight]);if(widths.has(key))return widths.get(key);
 context??=document.createElement('canvas').getContext('2d');context.font=`${weight} ${size}px ${family}`;
 const w=context.measureText(String(value)).width;widths.set(key,w);return w;
}
export function visualFontBounds(value,size=24,role='sans',weight=400){
 const family=VISUAL_TYPE[role];if(!family)throw Error('Unknown type role');context??=document.createElement('canvas').getContext('2d');context.font=`${weight} ${size}px ${family}`;const metrics=context.measureText(String(value));return {ascent:metrics.fontBoundingBoxAscent??size*1.05,descent:metrics.fontBoundingBoxDescent??size*.30};
}
export function visualLines(text,width,{size=24,role='sans',weight=400,max=3}={}){
 if(typeof text!=='string'||!text.trim())throw Error('Nonempty text required');
 const lines=[];
 for(const para of text.split('\n')){if(!para.trim())throw Error('Empty explicit text line');let part='';for(const ch of para){if(part&&measureVisual(part+ch,size,role,weight)>width){lines.push(part);part=''}if(measureVisual(ch,size,role,weight)>width)throw Error('Glyph exceeds available text width');part+=ch}if(part)lines.push(part)}
 if(lines.length>max)throw Error(`Text exceeds ${max} lines at ${size}px: ${text.slice(0,60)}`);
 return lines;
}
export function visualPage(W,H,bg){
 if(!Number.isFinite(W)||!Number.isFinite(H)||W<300||H<200||W>8000||H>8000)throw Error('Visual canvas outside limits');
 const svg=el('svg',{xmlns:'http://www.w3.org/2000/svg',viewBox:`0 0 ${W} ${H}`,width:W,height:H});el('rect',{width:W,height:H,fill:bg},svg);return svg;
}
export function visualText(svg,x,baseline,text,{size=24,role='sans',weight=400,fill='#1a1a1a',anchor='start',italic=false}={}){
 const node=el('text',{x,y:baseline,'font-family':VISUAL_TYPE[role],'font-size':size,'font-weight':weight,fill,'text-anchor':anchor,'font-style':italic?'italic':null},svg);node.textContent=text;return node;
}
export function backedVisualText(svg,x,baseline,text,{background='#FFFFFF',...options}={}){
 const size=options.size??24,role=options.role??'sans',weight=options.weight??400,anchor=options.anchor??'start',width=measureVisual(text,size,role,weight),left=anchor==='middle'?x-width/2:anchor==='end'?x-width:x;
 const metrics=visualFontBounds(text,size,role,weight);let top=size*1.05,height=size*1.35;
 // Preserve the authored padding when it already fits; CJK collection faces
 // on Linux can have taller line boxes and need a genuinely covering mask.
 if(metrics.ascent+1>top||metrics.descent+1>size*.30){top=Math.max(top,metrics.ascent+1);height=top+Math.max(size*.30,metrics.descent+1)}
 el('rect',{x:left-5,y:baseline-top,width:width+10,height,fill:background,'data-role':'label-backing'},svg);
 return visualText(svg,x,baseline,text,options);
}
export function visualBlock(svg,x,top,lines,options={}){
 const size=options.size??24,leading=options.leading??1.3;
 lines.forEach((line,i)=>visualText(svg,x,top+size+i*size*leading,line,options));return lines.length*size*leading;
}
export function visualHeadingPlan(title,subtitle,{top=58,width=1260,size=54,role='sans',max=2}={}){
 const titleLines=visualLines(title,width,{size,role,weight:800,max}),h=titleLines.length*size*1.3,sub=visualLines(subtitle,width,{size:22,max:2}),sh=sub.length*22*1.3;
 return {titleLines,sub,h,sh,bottom:top+h+14+sh+34};
}
export function visualHeading(svg,title,subtitle,{x=70,top=58,width=1260,size=54,fill='#17191d',subFill='#59616a',role='sans',max=2}={}){
 const plan=visualHeadingPlan(title,subtitle,{top,width,size,role,max});visualBlock(svg,x,top,plan.titleLines,{size,role,weight:800,fill});visualBlock(svg,x,top+plan.h+14,plan.sub,{size:22,fill:subFill});return plan.bottom;
}
export function visualFinish(svg,geometry){svg.dataset.family=geometry.family;svg.dataset.geometry=JSON.stringify(geometry);return svg}
export const stroke=(svg,points,color,width=2,extra={})=>el('polyline',{points:points.map(p=>p.join(',')).join(' '),fill:'none',stroke:color,'stroke-width':width,...extra},svg);
export function number(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw Error(label+': finite numeric value required');return value}
export function hex(value){if(typeof value!=='string'||!/^#[\da-f]{6}$/i.test(value))throw Error('Use a six-digit hex colour');return value}
export function blend(a,b,t){hex(a);hex(b);return '#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('')}
