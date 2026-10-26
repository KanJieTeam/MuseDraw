// Annotations only: does not invent, crop, rescale or validate inset contents.
export function detailLink(b) {
  const {roi,detail}=b;
  for(const [name,rect] of Object.entries({roi,detail}))
    if(!Array.isArray(rect)||rect.length!==4||!rect.every(Number.isFinite)||rect[2]<=0||rect[3]<=0)
      throw new Error(`Detail link ${b.id}: ${name} must be [x,y,positive width,positive height]`);
  const [x,y,w,h]=roi,[X,Y,W,H]=detail;
  if(x<X+W&&x+w>X&&y<Y+H&&y+h>Y)throw new Error(`Detail link ${b.id}: ROI and detail frames must not overlap`);
  const side=b.side??(X>=x+w?'r':X+W<=x?'l':Y>=y+h?'b':'t');
  const corners=(rect,side)=>{const [x,y,w,h]=rect;return side==='r'?[[x+w,y],[x+w,y+h]]:side==='l'?[[x,y],[x,y+h]]:side==='b'?[[x,y+h],[x+w,y+h]]:[[x,y],[x+w,y]];};
  const opposite={r:'l',l:'r',b:'t',t:'b'},a=corners(roi,side),z=corners(detail,opposite[side]);
  const frame=([x,y,w,h])=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]];
  const style={layer:'foreground',color:b.color??'accent',width:b.width??1.4};
  return {lines:[
    ...a.map((p,i)=>({id:`${b.id}-leader-${i+1}`,...style,points:[p,z[i]]})),
    {id:`${b.id}-roi`,...style,points:frame(roi),dash:'5 4'},
    {id:`${b.id}-detail`,...style,points:frame(detail)}
  ]};
}
