function cap2SolidNeed(ok,message){if(!ok)throw Error('primary-solid-features: '+message)}
function cap2SolidFields(x,allowed){cap2SolidNeed(x&&typeof x==='object'&&!Array.isArray(x),'object required');for(const k of Object.keys(x))cap2SolidNeed(allowed.includes(k),'unsupported field '+k)}
function cap2SolidText(x,label,max){cap2SolidNeed(typeof x==='string'&&x.trim()&&[...x].length<=max,label+' requires bounded text')}
const CAP2_SOLID_ACTIVITIES={
 'touch-opposite':{kinds:['cuboid','cube'],text:'摸一摸平面，找一找相对的两个面。'},
 'trace-edges':{kinds:['cuboid','cube'],text:'沿着棱摸一摸，再找出棱相接的顶点。'},
 'compare-all':{kinds:['cube'],text:'转一转，比较六个面的形状和大小。'},
 'equal-circles':{kinds:['cylinder'],text:'找一找上下两个圆形底面，比较它们。'},
 'roll-and-stand':{kinds:['cylinder'],text:'在平桌面上侧着滚一滚，再用底面平放。'},
 'find-curved':{kinds:['cylinder','sphere'],text:'沿着曲面摸一摸，感受它和平面的不同。'},
 'turn-and-look':{kinds:['sphere'],text:'转一转，从不同方向看看它的外轮廓。'}
};
export function cap2PrimarySolidFeaturesModel(input){
 cap2SolidFields(input,['family','title','subtitle','edgeConvention','objects','note']);cap2SolidNeed(input.family==='primary-solid-features','family mismatch');for(const [k,max] of [['title',72],['subtitle',180],['note',260]])cap2SolidText(input[k],k,max);cap2SolidNeed(input.edgeConvention==='straight-edges','explicit straight-edges convention required; circular boundaries are not straight edges');cap2SolidNeed(Array.isArray(input.objects)&&input.objects.length>=2&&input.objects.length<=4,'two to four distinct ideal shape kinds required');
 const ids=new Set(),kinds=new Set(),objects=input.objects.map(o=>{cap2SolidFields(o,['id','kind','label','activities']);cap2SolidText(o.id,'object.id',24);cap2SolidText(o.label,'object.label',24);cap2SolidNeed(!ids.has(o.id),'duplicate object ID');ids.add(o.id);cap2SolidNeed(['cuboid','cube','cylinder','sphere'].includes(o.kind),'unsupported ideal shape');cap2SolidNeed(!kinds.has(o.kind),'this comparison requires distinct shape kinds');kinds.add(o.kind);cap2SolidNeed(Array.isArray(o.activities)&&o.activities.length>=1&&o.activities.length<=2&&new Set(o.activities).size===o.activities.length,'one or two unique catalogue activity IDs required');const activities=o.activities.map(id=>{const a=CAP2_SOLID_ACTIVITIES[id];cap2SolidNeed(a&&a.kinds.includes(o.kind),'activity does not apply to supplied ideal shape');return {id,text:a.text,status:'teaching-prompt-not-observed'}});
  let topology=null,features,facts,illustration;
  if(['cube','cuboid'].includes(o.kind)){const vertices=Array.from({length:8},(_,id)=>({id,coordinate:[id&1,(id>>1)&1,(id>>2)&1]})),edges=[];for(let a=0;a<8;a++)for(let b=a+1;b<8;b++)if(vertices[a].coordinate.filter((v,k)=>v!==vertices[b].coordinate[k]).length===1)edges.push({from:a,to:b});const faces=[0,1,2].flatMap(axis=>[0,1].map(value=>({axis,value,vertices:vertices.filter(v=>v.coordinate[axis]===value).map(v=>v.id)})));topology={vertices,edges,faces};features={planeFaces:faces.length,curvedSurfaces:0,straightEdges:edges.length,vertices:vertices.length,circularBoundaries:0};facts=[`${features.planeFaces} 个面，${features.straightEdges} 条棱，${features.vertices} 个顶点`,o.kind==='cube'?'6 个面都是同样的正方形':'相对的面形状和大小相同'];illustration=o.kind==='cube'?{width:1,depth:1,height:1}:{width:1.5,depth:.85,height:1.05}}
  else if(o.kind==='cylinder'){features={planeFaces:2,curvedSurfaces:1,straightEdges:0,vertices:0,circularBoundaries:2};facts=['2 个圆形底面，1 个曲面','没有顶点；圆周边界不是直棱'];illustration={radius:.65,height:1.6}}
  else{features={planeFaces:0,curvedSurfaces:1,straightEdges:0,vertices:0,circularBoundaries:0};facts=['只有 1 个曲面，没有顶点','从各个方向看，外轮廓都是圆'];illustration={radius:1}}
  return {id:o.id,kind:o.kind,label:o.label,activities,features,facts,topology,illustration,illustrationStatus:'unmeasured illustrative proportions; no size comparison'};
 });
 return {objects,shapeCount:objects.length,edgeConvention:input.edgeConvention,scope:'Two to four distinct ideal cuboids, cubes, cylinders or spheres. Straight edges and vertices are separated from circular boundaries; no Euler polyhedron formula is applied to curved solids. Catalogue activities are unobserved teaching prompts on ideal shapes, not a child assessment, measured object, mechanical simulation or volume calculation. Projection reuses existing solid objects; no image recognition, arbitrary meshes or solid solver is added.'};
}
