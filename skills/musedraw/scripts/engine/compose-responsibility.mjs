// A responsibility matrix from supplied assignments, not inferred ownership.
import {measure} from './text.mjs';

const fail=(path,message)=>{throw new Error(`Invalid composition ${path}: ${message}`)};
const fields=(o,keys,path)=>{if(!o||typeof o!=='object'||Array.isArray(o))fail(path,'expected an object');for(const key of Object.keys(o))if(!keys.includes(key))fail(`${path}/${key}`,'unsupported field')};
const text=(s,path,max=120)=>{if(typeof s!=='string'||!s.trim()||s.length>max)fail(path,`requires nonempty text, at most ${max} characters`)};
const rd=n=>Math.round(n*100)/100;
function lines(text,width,size,weight=400){
 const result=[];
 const advance=s=>Math.max(measure(s,size,'sans-serif',0,weight)*1.15,[...s].reduce((n,c)=>n+(/[^\x00-\xff]/u.test(c)?1.08:/[MW@]/.test(c)?1:.75),0)*size);
 // Wrap once using the actual conservative estimate. Wrapping an already
 // wrapped line a second time can orphan its last CJK character on a new row.
 for(const paragraph of text.split('\n')){
  const tokens=paragraph.match(/[⺀-鿿豈-﫿＀-￯　-〿]|[^\s⺀-鿿豈-﫿＀-￯　-〿]+|\s+/gu)??[];
  let part='';
  for(const token of tokens)for(const piece of advance(token)>width?[...token]:[token]){
   if(part&&advance(part+piece)>width&&!/^[，。、；：！？）」』》〉,.;:!?)\]]/.test(piece)){result.push(part.trimEnd());part=piece.trimStart()}
   else part+=piece;
  }
  result.push(part.trimEnd());
 }
 return result;
}
const meanings={R:'执行',A:'拍板',C:'协商',I:'知会'};

export function composeResponsibility(b){
 fields(b,['method','title','theme','width','roles','items'],'/');
 if(b.title!==undefined)text(b.title,'/title',160);
 if(b.theme!==undefined)text(b.theme,'/theme',50);
 const width=b.width??1440;
 if(!Number.isFinite(width)||width<1200||width>1800)fail('/width','requires 1200..1800 pixels; type scales with the viewing width');
 if(!Array.isArray(b.roles)||b.roles.length<2||b.roles.length>6)fail('/roles','requires 2..6 explicitly named roles');
 if(!Array.isArray(b.items)||!b.items.length||b.items.length>12)fail('/items','requires 1..12 deliverables; split a larger responsibility matrix');
 const ids=new Set();
 for(const [i,role]of b.roles.entries()){
  const p=`/roles/${i}`;fields(role,['id','label'],p);text(role.id,p+'/id',160);text(role.label,p+'/label',100);
  if(ids.has(role.id))fail(p+'/id','duplicate role ID');ids.add(role.id);
 }
 const itemIds=new Set(),normalized=[];
 for(const [i,item]of b.items.entries()){
  const p=`/items/${i}`;fields(item,['id','label','assignments'],p);text(item.id,p+'/id',160);text(item.label,p+'/label',240);
  if(itemIds.has(item.id))fail(p+'/id','duplicate deliverable ID');itemIds.add(item.id);
  if(!item.assignments||typeof item.assignments!=='object'||Array.isArray(item.assignments))fail(p+'/assignments','requires an object keyed by supplied role IDs');
  let approvals=0,execution=0;const assignments=Object.create(null);
  for(const [role,values]of Object.entries(item.assignments)){
   if(!ids.has(role))fail(p+'/assignments/'+role,'unknown role; do not invent a role while laying out the matrix');
   if(!Array.isArray(values)||!values.length||values.some(v=>!Object.hasOwn(meanings,v))||new Set(values).size!==values.length)fail(p+'/assignments/'+role,'use a nonempty unique array of R, A, C and I');
   if(values.length>1&&!(values.length===2&&values.includes('R')&&values.includes('A')))fail(p+'/assignments/'+role,'only A and R may share a cell; C and I are distinct responsibilities');
   approvals+=Number(values.includes('A'));execution+=Number(values.includes('R'));
   assignments[role]=['A','R','C','I'].filter(v=>values.includes(v));
  }
  if(approvals!==1)fail(p+'/assignments','a RACI deliverable requires exactly one A; resolve ownership instead of assigning it automatically');
  if(execution<1)fail(p+'/assignments','a RACI deliverable needs at least one R; do not invent its executor');
  normalized.push({id:item.id,label:item.label,assignments});
 }
 const W=1440,M=54,right=W-M,labelW=378,roleW=(right-M-labelW)/b.roles.length;
 const texts=[],nodes=[],rules=[];
 const add=(id,value,x,y,w,size=24,weight=400,color='ink',anchor='start')=>{
  const ls=lines(value,w,size,weight);texts.push({id,text:ls.join('\n'),x,y,w,size,weight,color,anchor,lineHeight:1.3});return ls.length*size*1.3;
 };
 const line=(id,y,width=1,color='muted')=>rules.push({id,points:[[M,y],[right,y]],width,color});
 let y=48;
 if(b.title){y+=add('responsibility-title',b.title,M,y+38,right-M,38,650)+30;}
 const roleLines=b.roles.map(r=>lines(r.label,roleW-28,23,600));
 const headH=Math.max(60,...roleLines.map(v=>v.length*30+24));
 add('deliverable-heading','交付事项',M,y+30,labelW-24,24,600);
 for(const [i,role]of b.roles.entries())add(`role-${encodeURIComponent(role.id)}`,role.label,M+labelW+(i+.5)*roleW,y+30,roleW-28,23,600,'ink','middle');
 line('head-rule',y+headH,1.6,'ink');y+=headH;
 for(const [index,item]of normalized.entries()){
  const ls=lines(item.label,labelW-36,25,500),h=Math.max(80,ls.length*32.5+30),baseline=y+(h-ls.length*32.5)/2+25;
  add(`deliverable-${encodeURIComponent(item.id)}`,item.label,M,baseline,labelW-36,25,500);
  for(const [i,role]of b.roles.entries()){
   const values=Object.hasOwn(item.assignments,role.id)?item.assignments[role.id]:undefined,cx=M+labelW+(i+.5)*roleW;
   if(!values)continue; // An empty cell remains empty; no implied responsibility.
   const id=`assignment-${encodeURIComponent(item.id)}-${encodeURIComponent(role.id)}`;
   if(values.includes('A')||values.includes('R'))nodes.push({id:id+'-mark',shape:'box',label:'',x:cx-42,y:y+h/2-25,w:84,h:50,fill:values.includes('A')?'#183E62':'#E5EEF6',stroke:'none',radius:3,padding:0});
   add(id,values.join('/'),cx,y+h/2+9,roleW-24,26,values.includes('A')||values.includes('R')?650:400,values.includes('A')?'#FFFFFF':values.includes('R')?'#183E62':'muted','middle');
  }
  y+=h;line('row-'+index,y,.6);
 }
 y+=44;
 add('meaning-label','职责说明',M,y,180,21,600);
 for(const [i,[letter,meaning]]of Object.entries(meanings).entries())add('meaning-'+letter,`${letter} ${meaning}`,M+labelW+i*(right-M-labelW)/4,y,(right-M-labelW)/4-14,21,400);
 y+=37;add('dual-role-note','A/R 表示同一角色同时拍板并执行；空白不代表已分配职责。',M,y,right-M,20,400,'muted');
 const height=y+48,k=width/W;
 if(20*Math.min(1200/W,1000/height)<14)fail('/items','matrix is too tall for the standard preview; split deliverables rather than reducing all type');
 const scene={schemaVersion:1,theme:b.theme??'journal',size:[width,rd(height*k)],header:false,footer:false,autoFit:false,
  meta:{composition:'responsibility',roles:b.roles.map(r=>({...r})),items:structuredClone(normalized)},nodes,texts,lines:rules};
 for(const n of nodes)for(const key of ['x','y','w','h','padding','radius'])if(typeof n[key]==='number')n[key]=rd(n[key]*k);
 for(const t of texts)for(const key of ['x','y','w','size'])t[key]=rd(t[key]*k);
 for(const l of rules){l.points=l.points.map(p=>p.map(v=>rd(v*k)));l.width=rd(l.width*k);}
 return scene;
}
