// Normalize SVG path commands for geometric regression checks.
export function pathCommands(d) {
  const tokens=d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g)||[];
  const out=[];let i=0,cmd,x=0,y=0,sx=0,sy=0,last='',control=null;
  const counts={M:2,L:2,H:1,V:1,C:6,S:4,Q:4,T:2,A:7};
  while(i<tokens.length){
    if(/^[a-zA-Z]$/.test(tokens[i]))cmd=tokens[i++];
    const upper=cmd?.toUpperCase(),relative=cmd!==upper;
    if(upper==='Z'){out.push(['close']);x=sx;y=sy;last='Z';control=null;cmd=null;continue;}
    const count=counts[upper];if(!count||i+count>tokens.length)throw new Error(`Invalid SVG path near ${tokens.slice(i,i+8).join(' ')}`);
    const a=tokens.slice(i,i+count).map(Number);if(a.some(v=>!Number.isFinite(v)))throw new Error('Non-finite SVG path');i+=count;
    const px=v=>v+(relative?x:0),py=v=>v+(relative?y:0);let nextControl=null;
    if(upper==='M'||upper==='L'){x=px(a[0]);y=py(a[1]);out.push([upper==='M'?'move':'line',x,y]);if(upper==='M'){sx=x;sy=y;cmd=relative?'l':'L';}}
    else if(upper==='H'){x=px(a[0]);out.push(['line',x,y]);}
    else if(upper==='V'){y=py(a[0]);out.push(['line',x,y]);}
    else if(upper==='C'){const p=[px(a[0]),py(a[1]),px(a[2]),py(a[3]),px(a[4]),py(a[5])];out.push(['curve',...p]);nextControl=p.slice(2,4);[x,y]=p.slice(4);}
    else if(upper==='S'){const c=last==='C'||last==='S'?[2*x-control[0],2*y-control[1]]:[x,y];const p=[...c,px(a[0]),py(a[1]),px(a[2]),py(a[3])];out.push(['curve',...p]);nextControl=p.slice(2,4);[x,y]=p.slice(4);}
    else if(upper==='Q'||upper==='T'){const c=upper==='Q'?[px(a[0]),py(a[1])]:(last==='Q'||last==='T'?[2*x-control[0],2*y-control[1]]:[x,y]);const p=upper==='Q'?[px(a[2]),py(a[3])]:[px(a[0]),py(a[1])];out.push(['quad',...c,...p]);nextControl=c;[x,y]=p;}
    else if(upper==='A'){const end=[px(a[5]),py(a[6])];out.push(...arcCurves(x,y,...a.slice(0,5),...end));[x,y]=end;}
    last=upper;control=nextControl;
  }
  return out;
}

function arcCurves(x0,y0,rx,ry,angle,large,sweep,x,y){
  rx=Math.abs(rx);ry=Math.abs(ry);if(!rx||!ry)return [['line',x,y]];if(x===x0&&y===y0)return [];
  const phi=angle*Math.PI/180,c=Math.cos(phi),s=Math.sin(phi),dx=(x0-x)/2,dy=(y0-y)/2,u=c*dx+s*dy,v=-s*dx+c*dy;
  const ratio=u*u/(rx*rx)+v*v/(ry*ry);if(ratio>1){rx*=Math.sqrt(ratio);ry*=Math.sqrt(ratio);}
  const factor=(large===sweep?-1:1)*Math.sqrt(Math.max(0,(rx*rx*ry*ry-rx*rx*v*v-ry*ry*u*u)/(rx*rx*v*v+ry*ry*u*u)));
  const uc=factor*rx*v/ry,vc=-factor*ry*u/rx,cx=c*uc-s*vc+(x0+x)/2,cy=s*uc+c*vc+(y0+y)/2;
  const start=Math.atan2((v-vc)/ry,(u-uc)/rx),end=Math.atan2((-v-vc)/ry,(-u-uc)/rx);let delta=end-start;
  if(!sweep&&delta>0)delta-=2*Math.PI;if(sweep&&delta<0)delta+=2*Math.PI;
  const steps=Math.ceil(Math.abs(delta)/(Math.PI/2)),step=delta/steps,result=[];
  const at=t=>[cx+c*rx*Math.cos(t)-s*ry*Math.sin(t),cy+s*rx*Math.cos(t)+c*ry*Math.sin(t)];
  const derivative=t=>[-c*rx*Math.sin(t)-s*ry*Math.cos(t),-s*rx*Math.sin(t)+c*ry*Math.cos(t)];
  for(let k=0;k<steps;k++){const t=start+k*step,t2=t+step,alpha=4/3*Math.tan(step/4),a=at(t),b=at(t2),da=derivative(t),db=derivative(t2);result.push(['curve',a[0]+alpha*da[0],a[1]+alpha*da[1],b[0]-alpha*db[0],b[1]-alpha*db[1],...b]);}
  return result;
}
