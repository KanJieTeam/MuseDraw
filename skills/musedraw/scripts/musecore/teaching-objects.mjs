import {el} from './svg.mjs';
import {visualPage,stroke} from './visual-tools.mjs';

export function teachingSurface(W,H,material){
 if(material==='chalk'){
  const svg=visualPage(W,H,'#634C35');el('rect',{x:25,y:25,width:W-50,height:H-50,fill:'#294C40',stroke:'#8C6B45','stroke-width':9},svg);
  for(let i=0;i<18;i++)el('ellipse',{cx:80+(i*317%(W-160)),cy:90+(i*197%(H-180)),rx:130+(i*41%130),ry:18+(i*13%23),fill:i%2?'#A9BD9E':'#101E19','fill-opacity':.022},svg);
  return {svg,ink:'#E2E8CD',muted:'#9CB7A3',accent:'#E8D36B',second:'#E09999',background:'#294C40'};
 }
 if(material==='blueprint'){
  const svg=visualPage(W,H,'#1D4C78');for(let x=25;x<W;x+=25)stroke(svg,[[x,25],[x,H-25]],'#D1E9ED',1,{'stroke-opacity':x%100===0?.12:.035,'data-role':'background-grid'});for(let y=25;y<H;y+=25)stroke(svg,[[25,y],[W-25,y]],'#D1E9ED',1,{'stroke-opacity':y%100===0?.12:.035,'data-role':'background-grid'});for(const inset of [24,33])el('rect',{x:inset,y:inset,width:W-2*inset,height:H-2*inset,fill:'none',stroke:'#D1E9ED','stroke-width':1},svg);
  return {svg,ink:'#D1E9ED',muted:'#94B4CE',accent:'#E9C76B',second:'#DAB4BD',background:'#1D4C78'};
 }
 throw Error('Unknown teaching material');
}
export function directedStroke(svg,from,to,color,{width=2.5,head=11,dash=false,headAt=1}={}){
 const dx=to[0]-from[0],dy=to[1]-from[1],length=Math.hypot(dx,dy);if(length===0)return;const ux=dx/length,uy=dy/length,end=[from[0]+dx*headAt,from[1]+dy*headAt];stroke(svg,[from,to],color,width,dash?{'stroke-dasharray':'6 5'}:{});el('polygon',{points:`${end.join(',')} ${end[0]-ux*head-uy*head*.42},${end[1]-uy*head+ux*head*.42} ${end[0]-ux*head+uy*head*.42},${end[1]-uy*head-ux*head*.42}`,fill:color},svg);
}
export function clockGeometry(hour,minute,radius){
 if(!Number.isInteger(hour)||hour<0||hour>23||!Number.isInteger(minute)||minute<0||minute>59)throw Error('Clock time requires hour 0..23 and minute 0..59');
 const hourDegrees=(hour%12+minute/60)*30,minuteDegrees=minute*6,point=(angle,r)=>[Math.sin(angle*Math.PI/180)*r,-Math.cos(angle*Math.PI/180)*r];return {hourDegrees,minuteDegrees,hourEnd:point(hourDegrees,radius*.55),minuteEnd:point(minuteDegrees,radius*.74)};
}
export function planeReflection(angleDegrees,tiltDegrees=0){
 if(!Number.isFinite(angleDegrees)||angleDegrees<0||angleDegrees>80||!Number.isFinite(tiltDegrees)||Math.abs(tiltDegrees)>20)throw Error('Reflection view supports incidence 0..80 degrees and mirror tilt -20..20 degrees');
 const a=angleDegrees*Math.PI/180,t=tiltDegrees*Math.PI/180,tangent=[Math.cos(t),Math.sin(t)],normal=[Math.sin(t),-Math.cos(t)],incident=[-normal[0]*Math.cos(a)+tangent[0]*Math.sin(a),-normal[1]*Math.cos(a)+tangent[1]*Math.sin(a)],reflected=[normal[0]*Math.cos(a)+tangent[0]*Math.sin(a),normal[1]*Math.cos(a)+tangent[1]*Math.sin(a)];return {angleDegrees,tiltDegrees,tangent,normal,incident,reflected};
}
export function thinLens(focalLength,objectDistance,objectHeight){
 if(![focalLength,objectDistance,objectHeight].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>0))throw Error('Converging thin-lens inputs must be positive and finite');
 if(objectDistance===focalLength)return {focalLength,objectDistance,objectHeight,imageDistance:null,imageHeight:null,magnification:null,kind:'parallel outgoing rays; no finite image'};
 const imageDistance=focalLength*objectDistance/(objectDistance-focalLength),magnification=-imageDistance/objectDistance,imageHeight=magnification*objectHeight;if(![imageDistance,magnification,imageHeight].every(Number.isFinite))throw Error('Thin-lens calculation exceeds numeric range');return {focalLength,objectDistance,objectHeight,imageDistance,magnification,imageHeight,kind:imageDistance>0?'real inverted':'virtual upright'};
}
export function leverBalance(kind,effortArm,loadArm,loadForce){
 if(!['first','second','third'].includes(kind)||![effortArm,loadArm,loadForce].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>0))throw Error('Lever requires a known class and positive arms/force');if(kind==='second'&&effortArm<=loadArm||kind==='third'&&effortArm>=loadArm)throw Error('Lever class contradicts the supplied arm ordering');
 const effortForce=loadForce*loadArm/effortArm;if(!Number.isFinite(effortForce))throw Error('Lever result exceeds numeric range');return {kind,effortArm,loadArm,loadForce,effortForce,effortPosition:kind==='first'?-effortArm:effortArm,loadPosition:loadArm,pivotPosition:0,effortDirection:kind==='first'?'down':'up',loadDirection:'down',loadMoment:loadForce*loadArm,effortMoment:effortForce*effortArm};
}
