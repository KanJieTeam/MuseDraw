// A content-driven plan composition: dated targets and undated work stay distinct.
// Compile to existing native primitives; no inferred dates, achievements or ratios.
import {measure, wrap} from './text.mjs';

const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const fail=(p,m)=>{throw new Error(`Invalid composition ${p}: ${m}`);};
const fields=(v,keys,p)=>{if(!object(v))fail(p,'expected an object');for(const k of Object.keys(v))if(!keys.includes(k))fail(`${p}/${k}`,'unsupported field');};
const text=(v,p,max=120)=>{if(typeof v!=='string'||!v.trim()||v.length>max)fail(p,`requires nonempty text, at most ${max} characters`);return v;};
const list=(v,p,min,max)=>{if(!Array.isArray(v)||v.length<min||v.length>max)fail(p,`requires ${min}..${max} items`);};
const round=v=>Math.round(v*100)/100;

// Conservative fallback advance, including wide Latin identifiers; browser QA
// still measures actual glyphs. Never truncate the user's copy to fit a box.
function lines(s,width,size,weight=400){
  const result=[];
  const advance=s=>Math.max(measure(s,size,'sans-serif',0,weight)*1.15,[...s].reduce((n,c)=>n+(/[^\x00-\xff]/u.test(c)?1.08:/[MW@]/.test(c)?1:.73),0)*size);
  for(const line of wrap(s,width,size,'sans-serif',0,weight)){
    let part='';for(const c of line){if(part&&advance(part+c)>width){result.push(part);part='';}part+=c;}result.push(part);
  }
  return result;
}

export function composePlan(b){
  fields(b,['method','theme','width','title','periods','metrics','work','support','encoding'],'/');
  if(b.title!==undefined)text(b.title,'/title',160);
  if(b.theme!==undefined)text(b.theme,'/theme',50);
  const width=b.width??1440;
  if(!Number.isFinite(width)||width<1000||width>1800)fail('/width','requires 1000..1800 pixels');
  const encoding=b.encoding??'values';
  if(!['values','bars'].includes(encoding))fail('/encoding','use values or bars; neither denotes completion');
  list(b.periods,'/periods',2,5);list(b.metrics,'/metrics',1,3);list(b.work,'/work',1,5);list(b.support,'/support',1,4);
  b.periods.forEach((p,i)=>text(p,`/periods/${i}`,24));
  if(new Set(b.periods).size!==b.periods.length)fail('/periods','period names must be distinct');
  const ids=new Set();
  const id=(v,p)=>{text(v,p,80);if(ids.has(v))fail(p,'duplicate content ID');ids.add(v);return v;};
  b.metrics.forEach((m,i)=>{
    const p=`/metrics/${i}`;
    if(object(m)&&Object.hasOwn(m,'encoding'))fail(p+'/encoding','encoding belongs at the composition root, alongside metrics; remove it from each metric');
    fields(m,['id','label','unit','values'],p);id(m.id,p+'/id');text(m.label,p+'/label',60);text(m.unit,p+'/unit',24);
    if(!Array.isArray(m.values)||m.values.length!==b.periods.length)fail(p+'/values','one supplied value per period is required');
    m.values.forEach((v,j)=>{if(!Number.isFinite(v)||v<0||v>1e12)fail(`${p}/values/${j}`,'requires a nonnegative finite target up to 1e12');});
  });
  b.work.forEach((w,i)=>{const p=`/work/${i}`;fields(w,['id','label','actions'],p);id(w.id,p+'/id');text(w.label,p+'/label',60);list(w.actions,p+'/actions',1,4);w.actions.forEach((a,j)=>text(a,`${p}/actions/${j}`,100));});
  b.support.forEach((s,i)=>text(s,`/support/${i}`,80));

  const W=1200,M=56,right=W-M,labelW=236,plotX=M+labelW,plotW=right-plotX,colW=plotW/b.periods.length;
  const nodes=[],texts=[],paths=[],edges=[],rules=[];
  const addText=(id,s,x,y,w,size,weight=400,color='ink',anchor='start')=>{
    const ls=lines(s,w,size,weight);
    texts.push({id,text:ls.join('\n'),x,y,w,size,weight,color,anchor,lineHeight:1.3});
    return ls.length*size*1.3;
  };
  const rule=(id,y,x1=M,x2=right,color='muted')=>rules.push({id,points:[[x1,y],[x2,y]],color,width:.7});
  let y=56;
  if(b.title){const h=addText('plan-heading',b.title,M,y+44,right-M,44,650);texts.at(-1).font='display';y+=h+38;}
  addText('targets-heading','未来目标',M,y+24,labelW-24,24,650);
  if(encoding==='bars'){
    // Comparison uses long, aligned horizontal marks, with period labels beside
    // each series. Values and units stay explicit, including nonmonotonic data.
    y+=56;const panelCols=Math.min(2,b.metrics.length),panelGap=56,panelW=(right-M-panelGap*(panelCols-1))/panelCols;
    const periodW=Math.min(120,panelW*.24),periodHeights=b.periods.map(p=>Math.max(50,lines(p,periodW-12,20).length*26+16));
    for(let row=0;row<Math.ceil(b.metrics.length/panelCols);row++){
      const group=b.metrics.slice(row*panelCols,(row+1)*panelCols);
      const headH=Math.max(...group.map(m=>lines(m.label,panelW,22,550).length*29+lines(m.unit,panelW,18).length*24+24));
      for(const [column,m] of group.entries()){
        const index=row*panelCols+column,key=`metric-${encodeURIComponent(m.id)}`,x=M+column*(panelW+panelGap);
        const labelH=addText(key+'-label',m.label,x,y+22,panelW,22,550);
        addText(key+'-unit',m.unit,x,y+labelH+28,panelW,18,400,'muted');
        const numberW=Math.max(...m.values.map(v=>Math.max(measure(String(v),22,'sans-serif',0,600)*1.2,String(v).length*22*.78))),barX=x+periodW+12,barW=panelW-periodW-numberW-38;
        if(barW<70)fail(`/metrics/${index}/values`,'numeric labels need more width; use fewer panels or a custom large-format comparison');
        let py=y+headH;const max=Math.max(...m.values);
        for(const [i,v] of m.values.entries()){
          const cy=py+periodHeights[i]/2,len=max===0?0:v/max*barW;
          const periodId=index===0?`period-${encodeURIComponent(b.periods[i])}`:`${key}-period-${encodeURIComponent(b.periods[i])}`;
          addText(periodId,b.periods[i],x,py+24,periodW-12,20);
          if(len>0)nodes.push({id:`${key}-bar-${encodeURIComponent(b.periods[i])}`,shape:'box',tone:'planMark',label:'',x:barX,y:cy-10,w:len,h:20,fill:index%2===0?'accent':'ink',stroke:'none',radius:0,padding:0});
          addText(`${key}-value-${encodeURIComponent(b.periods[i])}`,String(v),barX+len+10,cy+8,numberW+2,22,600,'ink');
          py+=periodHeights[i];
        }
        rules.push({id:`${key}-base`,points:[[barX,y+headH],[barX,py]],color:'muted',width:.7});
      }
      y+=headH+periodHeights.reduce((n,h)=>n+h,0)+24;
    }
    rule('target-bottom',y);y+=26;
  }else{
  b.periods.forEach((p,i)=>addText(`period-${encodeURIComponent(p)}`,p,plotX+i*colW,y+24,colW-16,20,550,'ink'));
  y+=Math.max(48,...b.periods.map(p=>lines(p,colW-16,20,550).length*26+22));rule('target-top',y);y+=28;
  for(const [index,m] of b.metrics.entries()){
    const key=`metric-${encodeURIComponent(m.id)}`;
    const labelLines=lines(m.label,labelW-36,22,550),unitLines=lines(m.unit,labelW-36,18);
    const valueFont=Math.min(44,Math.max(22,(colW-26)/Math.max(...m.values.map(v=>String(v).length))/.78));
    if((colW-26)/Math.max(...m.values.map(v=>String(v).length))/.78<22)fail(`/metrics/${index}/values`,'values cannot fit at a readable size; reduce the number of periods or choose a large-format custom composition');
    const rowH=Math.max(112,labelLines.length*29+unitLines.length*24+48);
    addText(key+'-label',m.label,M,y+26,labelW-36,22,550);
    addText(key+'-unit',m.unit,M,y+26+labelLines.length*29+8,labelW-36,18,400,'muted');
    m.values.forEach((v,i)=>{
      const x=plotX+i*colW;
      addText(`${key}-value-${encodeURIComponent(b.periods[i])}`,String(v),x,y+49,colW-16,valueFont,600,'ink');
    });
    y+=rowH;rule(key+'-separator',y);y+=26;
  }
  }
  y+=22;addText('work-heading','工作与共同支撑',M,y+27,right-M,27,650);y+=64;
  addText('work-timing','工作事项未按时段分配',plotX,y-37,right-plotX,18,400,'muted');
  // A single undated row uses the page width independently of the period grid.
  // Dense five-stream plans keep a vertical relation layout rather than forcing
  // five narrow text columns. Both routes retain the same owned work IDs.
  const columns=b.work.length<=4,workX=columns?M:M+310;
  const workW=columns?(right-M-36*(b.work.length-1))/b.work.length:right-workX,workTop=y;
  const workFrames=[];
  for(const [i,w] of b.work.entries()){
    const titleLines=lines(w.label,workW-28,23,600);
    const actionLines=w.actions.flatMap(a=>lines(a,workW-28,20));
    const h=titleLines.length*23*1.3+10+actionLines.length*20*1.32+6;
    const n={id:`work-${encodeURIComponent(w.id)}`,shape:'text',tone:'planWork',x:columns?M+i*(workW+36):workX,y:columns?workTop:y,w:workW,h,label:titleLines.join('\n'),sub:actionLines.join('\n'),size:23,subSize:20,weight:600,align:'left',padding:0,valign:'top',labelPos:'inside',radius:0};
    nodes.push(n);workFrames.push(n);if(!columns)y+=h+18;
  }
  if(columns){const height=Math.max(...workFrames.map(n=>n.h));workFrames.forEach(n=>n.h=height);y=workTop+height+48;}
  const supportW=columns?right-M:238,supportCopy=columns?lines(b.support.join(' · '),supportW-32,20):b.support.flatMap(s=>lines(s,supportW-32,20));
  const supportH=Math.max(columns?92:118,30+supportCopy.length*26.4+30);
  const supportY=columns?y:workTop+Math.max(0,(y-18-workTop-supportH)/2);
  nodes.push({id:'shared-support',shape:'box',tone:'planSupport',x:M,y:supportY,w:supportW,h:supportH,label:'共同支撑',sub:supportCopy.join('\n'),size:22,subSize:20,weight:600,padding:16,align:'left',fill:'none',stroke:'muted',radius:0});
  const trunk=M+supportW+32;
  for(const [i,n] of workFrames.entries()){
    if(columns){
      const busY=supportY-30,sx=M+supportW/2,tx=n.x+n.w/2;
      edges.push({id:`support-${encodeURIComponent(b.work[i].id)}`,from:'shared-support',to:n.id,fromSide:'t',toSide:'b',fromAt:.5,toAt:.5,via:[[sx,busY],[tx,busY]]});
    }else{
      const sy=supportY+supportH/2,ty=n.y+Math.min(n.h/2,36);
      edges.push({id:`support-${encodeURIComponent(b.work[i].id)}`,from:'shared-support',to:n.id,fromSide:'r',toSide:'l',fromAt:.5,toAt:Math.min(n.h/2,36)/n.h,via:[[trunk,sy],[trunk,ty]]});
    }
  }
  const H=Math.max(y-18,supportY+supportH)+M;
  // Reject oversize content explicitly, never shrink the required action copy.
  const previewScale=Math.min(1,1200/W,1000/H);
  if(18*previewScale<14)fail('/work','content exceeds a readable single-page plan; split the supplied plan or use a larger-format custom composition');
  const k=width/W;
  const scaleFields=(o,keys)=>{for(const f of keys)if(typeof o[f]==='number')o[f]=round(o[f]*k);};
  nodes.forEach(n=>scaleFields(n,['x','y','w','h','size','subSize','padding']));
  texts.forEach(t=>scaleFields(t,['x','y','w','size']));
  rules.forEach(l=>{l.points=l.points.map(p=>p.map(v=>round(v*k)));l.width*=k;});
  edges.forEach(e=>{e.via=e.via.map(p=>p.map(v=>round(v*k)));});
  return {schemaVersion:1,theme:b.theme??'journal',size:[width,round(H*k)],header:false,footer:false,autoFit:false,title:b.title,
    meta:{composition:'plan',encoding,workLayout:columns?'columns':'rows',datedMetrics:b.metrics.map(m=>m.id),undatedWork:b.work.map(w=>w.id),periods:[...b.periods],readingSize:18},
    style:{
      node:{font:'body',subFont:'body',subItalic:false,sketch:false,lineHeight:1.3,gap:8*k},
      // New method roles must not inherit a theme's decorative node furniture:
      // Swiss top bars strike text-only labels; nonexistent bg tokens paint black.
      tones:Object.fromEntries(['planWork','planSupport','planMark'].map(name=>[name,{fill:'none',stroke:'none',text:'ink',sub:name==='planSupport'?'muted':'ink',topBar:false,accentBar:false,plate:false,pattern:null,gradient:null,shadow:'none',glow:false,dash:null}])),
      edge:{width:1.5*k,color:'ink',arrowSize:7*k,gap:4*k,radius:4*k}
    },nodes,texts,edges,lines:rules,paths};
}
