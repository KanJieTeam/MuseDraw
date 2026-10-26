/** Bounded polygon footprint: one simple outer ring, explicitly named simple,
 * disjoint interior holes. No inferred geometry, Boolean union, extrusion or physics.
 * Coordinates and affine [a,b,c,d,e,f] must be supplied by caller.
 * Opposite winding makes real holes under native SVG's default nonzero fill. */
export const area = ring => ring.reduce((s,p,i)=>{const q=ring[(i+1)%ring.length];return s+p[0]*q[1]-q[0]*p[1]},0)/2;
export const transformPoint = ([x,y],[a,b,c,d,e,f]) => [a*x+c*y+e,b*x+d*y+f];
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const on=(a,b,p)=>Math.abs(cross(a,b,p))<1e-9&&p[0]>=Math.min(a[0],b[0])-1e-9&&p[0]<=Math.max(a[0],b[0])+1e-9&&p[1]>=Math.min(a[1],b[1])-1e-9&&p[1]<=Math.max(a[1],b[1])+1e-9;
const intersects=(a,b,c,d)=> (cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b);
const inside=(p,r)=>{let v=false;for(let i=0,j=r.length-1;i<r.length;j=i++){if(on(r[j],r[i],p))return false;if((r[i][1]>p[1])!==(r[j][1]>p[1])&&p[0]<(r[j][0]-r[i][0])*(p[1]-r[i][1])/(r[j][1]-r[i][1])+r[i][0])v=!v;}return v;};
const ringsIntersect=(a,b)=>a.some((p,i)=>b.some((q,j)=>intersects(p,a[(i+1)%a.length],q,b[(j+1)%b.length])));
function validateRing(r,name){
  if(!Array.isArray(r)||r.length<3||r.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v))))throw Error(`${name}: finite ring with >=3 explicit vertices required`);
  if(Math.abs(area(r))<1e-9)throw Error(`${name}: degenerate ring`);
  for(let i=0;i<r.length;i++)for(let j=i+1;j<r.length;j++){if(j===i+1||(i===0&&j===r.length-1))continue;if(intersects(r[i],r[(i+1)%r.length],r[j],r[(j+1)%r.length]))throw Error(`${name}: self intersection`);}
}
export function materialFootprint({id,outer,holes},affine){
  if(typeof id!=='string'||!id)throw Error('Explicit footprint id required');
  if(!Array.isArray(affine)||affine.length!==6||affine.some(v=>!Number.isFinite(v))||Math.abs(affine[0]*affine[3]-affine[1]*affine[2])<1e-9)throw Error('Explicit nonsingular affine required');
  validateRing(outer,'outer');if(!Array.isArray(holes))throw Error('Explicit holes array required');
  const ids=new Set();for(const h of holes){if(typeof h.id!=='string'||!h.id||ids.has(h.id))throw Error('Unique named hole required');ids.add(h.id);validateRing(h.points,h.id);if(ringsIntersect(outer,h.points)||h.points.some(p=>!inside(p,outer)))throw Error(`${h.id}: must lie strictly inside outer`);}
  for(let i=0;i<holes.length;i++)for(let j=i+1;j<holes.length;j++)if(ringsIntersect(holes[i].points,holes[j].points)||inside(holes[i].points[0],holes[j].points)||inside(holes[j].points[0],holes[i].points))throw Error('Holes must be disjoint and unnested');
  const vertices={outer:outer.map(p=>transformPoint(p,affine)),holes:holes.map(h=>({id:h.id,points:h.points.map(p=>transformPoint(p,affine))}))};
  const oriented=(r,sign)=>Math.sign(area(r))===sign?r:[...r].reverse();
  const command=r=>'M '+r.map(p=>p.map(v=>+v.toFixed(6)).join(' ')).join(' L ')+' Z';
  const sign=Math.sign(area(vertices.outer));
  return {id,fillRule:'nonzero',d:[command(vertices.outer),...vertices.holes.map(h=>command(oriented(h.points,-sign)))].join(' '),vertices,affine:[...affine],holeIds:holes.map(h=>h.id)};
}
