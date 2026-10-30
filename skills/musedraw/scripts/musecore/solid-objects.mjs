import {el} from './svg.mjs';

export function isometricPoint(x,y,z,scale=1){return [(x-y)*Math.sqrt(3)/2*scale,((x+y)/2-z)*scale]}
export function cuboidFaces(width,depth,height){
 return [
  {kind:'top',points:[[0,0,height],[width,0,height],[width,depth,height],[0,depth,height]]},
  {kind:'right',points:[[width,0,0],[width,depth,0],[width,depth,height],[width,0,height]]},
  {kind:'front',points:[[0,depth,0],[width,depth,0],[width,depth,height],[0,depth,height]]}
 ];
}
export function drawFaces(svg,faces,{scale=1,x=0,y=0,colors={top:'#E5C74C',right:'#3475A2',front:'#BE432F'},stroke='#212522',lineWidth=1.4}={}){
 return faces.map(face=>{const points=face.points.map(p=>{const q=isometricPoint(...p,scale);return [q[0]+x,q[1]+y]});el('polygon',{points:points.map(p=>p.join(',')).join(' '),fill:colors[face.kind],stroke,'stroke-width':lineWidth,'stroke-linejoin':'round'},svg);return {...face,screen:points}});
}
export function solidMeasure(object){
 const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;let dims,volume;
 if(object.kind==='cube'){if(!valid(object.size))throw Error('Cube requires positive size');dims=[object.size,object.size,object.size];volume=object.size**3}
 else if(object.kind==='cuboid'){dims=[object.width,object.depth,object.height];if(!dims.every(valid))throw Error('Cuboid requires positive width/depth/height');volume=dims.reduce((a,n)=>a*n,1)}
 else if(object.kind==='cylinder'){if(!valid(object.radius)||!valid(object.height))throw Error('Cylinder requires positive radius/height');dims=[object.radius*2,object.radius*2,object.height];volume=Math.PI*object.radius**2*object.height}
 else if(object.kind==='sphere'){if(!valid(object.radius))throw Error('Sphere requires positive radius');dims=[object.radius*2,object.radius*2,object.radius*2];volume=4/3*Math.PI*object.radius**3}
 else throw Error('Unknown solid object');if(!Number.isFinite(volume)||!dims.every(Number.isFinite))throw Error('Solid measure exceeds numeric range');return {dimensions:dims,volume};
}
export function columnSolid(heights){
 if(!Array.isArray(heights)||heights.length<2||heights.length>6||!Array.isArray(heights[0])||heights[0].length<2||heights[0].length>6)throw Error('Height map requires 2..6 rows and columns');const rows=heights.length,cols=heights[0].length;
 for(const row of heights)if(row.length!==cols||!row.every(v=>Number.isInteger(v)&&v>=0&&v<=8))throw Error('Rectangular height map values must be integers in 0..8');const count=heights.flat().reduce((s,v)=>s+v,0);if(count<1||count>120)throw Error('Solid requires 1..120 unit cubes');const front=Array.from({length:cols},(_,x)=>Math.max(...heights.map(row=>row[x]))),side=heights.map(row=>Math.max(...row)),top=heights.map(row=>row.map(v=>v>0));const faces=[],cubes=[];
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)for(let z=0;z<heights[y][x];z++){cubes.push({x,y,z});const all=cuboidFaces(1,1,1);for(const face of all){const visible=face.kind==='top'?z===heights[y][x]-1:face.kind==='right'?(heights[y]?.[x+1]??0)<=z:(heights[y+1]?.[x]??0)<=z;if(visible){const points=face.points.map(p=>[p[0]+x,p[1]+y,p[2]+z]),depth=points.reduce((sum,p)=>sum+p[0]+p[1]+p[2],0)/points.length;faces.push({kind:face.kind,points,depth,cube:{x,y,z}})}}}
 faces.sort((a,b)=>a.depth-b.depth);return {rows,cols,count,front,side,top,faces,cubes,maxHeight:Math.max(...heights.flat())};
}
