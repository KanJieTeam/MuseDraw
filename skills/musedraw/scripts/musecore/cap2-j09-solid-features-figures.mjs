import {el} from './svg.mjs';
import {visualPage,visualFinish,stroke} from './visual-tools.mjs';
import {equationTextPlan,equationDrawPlan} from './equation-figures.mjs';
import {cuboidFaces,drawFaces,isometricPoint} from './solid-objects.mjs';
import {cap2PrimarySolidFeaturesModel} from './cap2-j09-solid-features-models.mjs';
export function cap2PrimarySolidFeaturesFamilies(){
 function primarySolids(b){
  const m=cap2PrimarySolidFeaturesModel(b),W=1600,margin=80,cw=720,artH=330,ink='#171B18',dim='#626D64',p=(text,width,size,max=4,weight=400)=>equationTextPlan(text,width,{size,max,weight}),title=p(b.title,W-160,62,2,800),sub=p(b.subtitle,W-160,25,3),titleY=48,subY=titleY+title.height+18,objects=m.objects.map((o,index)=>({...o,index,left:margin+(index%2)*cw,labelPlan:p(o.label,cw-80,36,3,700),factPlan:p(o.facts.join('\n'),cw-80,28,4,700),activityPlan:p(o.activities.map(a=>a.text).join('\n'),cw-80,26,5)}));
  let cursor=subY+sub.height+45;const rows=[];for(let at=0;at<objects.length;at+=2){const group=objects.slice(at,at+2),labelY=cursor+artH+24,factY=labelY+Math.max(...group.map(o=>o.labelPlan.height))+15,activityY=factY+Math.max(...group.map(o=>o.factPlan.height))+21,bottom=activityY+Math.max(...group.map(o=>o.activityPlan.height));for(const o of group)Object.assign(o,{y:cursor,labelY,factY,activityY});rows.push({top:cursor,bottom,ids:group.map(o=>o.id)});cursor=bottom+85}
  const note=p(b.note+' 球上的虚线只是帮助看立体，不是棱。',W-160,23,5),noteY=cursor-20,H=noteY+note.height+55,s=visualPage(W,H,'#EEEAE1');equationDrawPlan(s,margin,titleY,title,{fill:ink});equationDrawPlan(s,margin,subY,sub,{fill:dim});
  const bounds=points=>({left:Math.min(...points.map(p=>p[0])),right:Math.max(...points.map(p=>p[0])),top:Math.min(...points.map(p=>p[1])),bottom:Math.max(...points.map(p=>p[1]))});
  for(const o of objects){const px=o.left+cw/2,py=o.y+artH,g=el('g',{'data-primary-solid-id':o.id,'data-solid-kind':o.kind},s);let geometry,objectBounds;
   if(['cube','cuboid'].includes(o.kind)){const q=o.illustration,faces=cuboidFaces(q.width,q.depth,q.height),box=bounds(faces.flatMap(f=>f.points.map(v=>isometricPoint(...v)))),scale=Math.min((cw-95)/(box.right-box.left),artH/(box.bottom-box.top)),colors=o.kind==='cube'?{top:'#F0D467',right:'#BB9218',front:'#E9BC18'}:{top:'#E55242',right:'#8F211F',front:'#CB3028'};geometry=drawFaces(g,faces,{scale,x:px-(box.left+box.right)/2*scale,y:py-box.bottom*scale,colors,stroke:ink,lineWidth:1.6});objectBounds=bounds(geometry.flatMap(f=>f.screen));o.scale=scale}
   else if(o.kind==='cylinder'){const q=o.illustration,rx=q.radius*Math.sqrt(1.5),ry=q.radius/Math.sqrt(2),scale=Math.min((cw-95)/(2*rx),artH/(q.height+2*ry)),a=rx*scale,d=ry*scale,base=py-d,upper=base-q.height*scale;el('path',{d:`M ${px-a} ${upper} L ${px-a} ${base} A ${a} ${d} 0 0 0 ${px+a} ${base} L ${px+a} ${upper} Z`,fill:'#3568AD'},g);el('ellipse',{cx:px,cy:upper,rx:a,ry:d,fill:'#628CCA'},g);geometry={cx:px,upper,base,rx:a,ry:d};objectBounds={left:px-a,right:px+a,top:upper-d,bottom:base+d};o.scale=scale}
   else{const radius=artH/2,cy=py-radius;el('circle',{cx:px,cy,r:radius,fill:ink},g);el('ellipse',{cx:px,cy,rx:radius*.96,ry:radius*.4,fill:'none',stroke:'#EEEAE1','stroke-width':1.8,'stroke-dasharray':'4 4'},g);geometry={cx:px,cy,radius};objectBounds={left:px-radius,right:px+radius,top:cy-radius,bottom:cy+radius};o.scale=radius/o.illustration.radius}
   const x=o.left+30;equationDrawPlan(g,x,o.labelY,o.labelPlan,{fill:ink});equationDrawPlan(g,x,o.factY,o.factPlan,{fill:ink});equationDrawPlan(g,x,o.activityY,o.activityPlan,{fill:dim});Object.assign(o,{geometry,objectBounds,captionX:x});
  }
  for(const row of rows.slice(0,-1))stroke(s,[[0,row.bottom+38],[W,row.bottom+38]],ink,8);equationDrawPlan(s,margin,noteY,note,{fill:dim});return visualFinish(s,{family:'primary-solid-features',width:W,height:H,...m,objects,rows,columns:2,artHeight:artH,noteTop:noteY,compositionReference:'j09-liti-tuxing',encoding:'Ideal shape features and unobserved catalogue touch/look prompts. Per-object illustrative scale; measured caption heights reserve row dividers outside all text.'});
 }
 return {'primary-solid-features':primarySolids};
}
