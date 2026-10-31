import {el} from './svg.mjs';
import {visualPage,visualText,visualLines,visualFontBounds,visualFinish,stroke,measureVisual} from './visual-tools.mjs';
import {cap2TCPBase62Model} from './cap2-tcp-base62-models.mjs';

export function cap2TCPBase62Families(){
 function base62Encoding(input){
  const m=cap2TCPBase62Model(input),ink='#163b56',muted='#526d7a',blue='#247db7',teal='#087f83',paper='#f5f9fc',W=1600,M=64,content=W-2*M;
  const plan=(text,size,width=content,weight=400,max=8)=>{const lines=text.split('\n').flatMap(paragraph=>{const ls=visualLines(paragraph,width,{size,weight,max});if(ls.length>1){const chars=[...ls.slice(-2).join('')];let best;for(let i=1;i<chars.length;i++){const a=chars.slice(0,i).join(''),b=chars.slice(i).join(''),wa=measureVisual(a,size,'sans',weight),wb=measureVisual(b,size,'sans',weight);if(wa>width||wb>width)continue;const cost=(wa-wb)**2+(/^[，。；：！？、）]/.test(b)?1e6:0);if(!best||cost<best.cost)best={a,b,cost}}if(best)ls.splice(-2,2,best.a,best.b)}return ls});if(lines.length>max)throw Error('Base62 text exceeds '+max+' lines at fixed '+size+'px');const metrics=lines.map(line=>visualFontBounds(line,size,'sans',weight)),ascent=Math.max(size,...metrics.map(b=>b.ascent)),descent=Math.max(size*.3,...metrics.map(b=>b.descent)),step=Math.ceil(ascent+descent+8);return {lines,size,weight,ascent,descent,step,height:lines.length*step}};
  const draw=(parent,x,top,p,fill=ink,anchor='start')=>p.lines.forEach((line,i)=>visualText(parent,x,top+p.ascent+i*p.step,line,{size:p.size,weight:p.weight,fill,anchor}));
  const title=plan(m.title,48,content,800,3),sub=plan(m.subtitle,23,content,400,4);let y=48;
  const titleY=y;y+=title.height+12;const subY=y;y+=sub.height+36;
  const inLabel=plan(m.inputLabel,23,470,700,3),inNumber=plan(m.decimal,43,500,700,2),outLabel=plan(m.outputLabel+' · '+m.digits.length+' 个字符',23,770,700,3),digitP=plan('Ag国',68,160,700,1),valueP=plan('值 61',20,160,400,1);
  const heroY=y,heroH=Math.max(inLabel.height+18+inNumber.height,outLabel.height+18+digitP.height+valueP.height)+40,heroEnd=heroY+heroH;
  y=heroEnd+42;const divisionTitle=plan('反复除以 62，先取得最低位',28,content,700,2),divisionTitleY=y;y+=divisionTitle.height+22;
  const columnWidths=[350,330,230,230],xs=[M+16,M+390,M+760,M+1050],headers=['被除数','整数商','余数（0—61）','余数对应字符'];
  const headerPlans=headers.map((h,i)=>plan(h,21,columnWidths[i],700,3)),headerH=Math.max(...headerPlans.map(p=>p.height))+14,tableY=y;y+=headerH;
  const rowPlans=m.divisions.map(d=>[d.dividend+' ÷ 62',d.quotient,String(d.remainder),d.character].map((t,i)=>plan(t,i===3?32:25,columnWidths[i],i===3?700:400,2)));
  const rows=rowPlans.map((ps,index)=>{const height=Math.max(...ps.map(p=>p.height))+26,r={index,y,height,plans:ps};y+=height;return r});
  y+=20;const reverse=plan('从最后一行向上读字符 → '+m.encoded,25,content,700,3),reverseY=y;y+=reverse.height+38;
  const verifyTitle=plan('位值回算：每一位都能对回原整数',28,content,700,2),verifyTitleY=y;y+=verifyTitle.height+16;
  const expression=m.digits.map(d=>`${d.value} × 62^${d.exponent}`).join(' + ')+' = '+m.decimal,verify=plan(expression,25,content,400,4),verifyY=y;y+=verify.height+26;
  const alphabetLabel=plan('字符表 · 从左到右索引 0—61',21,content,700,2),alphabetLabelY=y;y+=alphabetLabel.height+10;
  const alphabet=plan(m.alphabet,23,content,400,2),alphabetY=y;y+=alphabet.height+24;
  const note=plan(m.note,22,content,400,10),noteY=y,H=y+note.height+54,s=visualPage(W,H,paper);
  el('rect',{x:0,y:0,width:W,height:12,fill:blue},s);draw(s,M,titleY,title);draw(s,M,subY,sub,muted);
  el('rect',{x:M,y:heroY-12,width:content,height:heroH+12,fill:'#e4f0f8',rx:8},s);
  draw(s,M+24,heroY+12,inLabel,muted);draw(s,M+24,heroY+12+inLabel.height+18,inNumber);
  stroke(s,[[M+535,heroY+heroH/2],[M+605,heroY+heroH/2]],blue,3);el('polygon',{points:`${M+614},${heroY+heroH/2} ${M+601},${heroY+heroH/2-6} ${M+601},${heroY+heroH/2+6}`,fill:blue},s);
  draw(s,M+650,heroY+12,outLabel,muted);const digitW=Math.min(112,770/m.digits.length),digitStart=M+650;
  for(const d of m.digits){const x=digitStart+digitW*(d.index+.5),top=heroY+12+outLabel.height+18;draw(s,x,top,plan(d.character,68,digitW,700,1),d.index%2?blue:teal,'middle');draw(s,x,top+digitP.height,plan('值 '+d.value,20,digitW,400,1),muted,'middle')}
  draw(s,M,divisionTitleY,divisionTitle);headerPlans.forEach((p,i)=>draw(s,xs[i],tableY,p,muted));stroke(s,[[M,tableY+headerH-8],[W-M,tableY+headerH-8]],blue,2);
  for(const row of rows){if(row.index%2===0)el('rect',{x:M,y:row.y,width:content,height:row.height,fill:'#eaf3f7'},s);row.plans.forEach((p,i)=>draw(s,xs[i],row.y+12,p,i===3?teal:ink));stroke(s,[[M,row.y+row.height],[W-M,row.y+row.height]],'#c9dce7',1)}
  draw(s,M,reverseY,reverse,teal);draw(s,M,verifyTitleY,verifyTitle);draw(s,M,verifyY,verify);draw(s,M,alphabetLabelY,alphabetLabel,muted);draw(s,M,alphabetY,alphabet,muted);stroke(s,[[M,noteY-12],[W-M,noteY-12]],'#b6ccd9',1);draw(s,M,noteY,note,muted);
  return visualFinish(s,{family:'base62-encoding',width:W,height:H,compositionReference:'e01-duanlianjie-zujian auxiliary computation only',decimal:m.decimal,encoded:m.encoded,decoded:m.decoded,digits:m.digits,divisions:m.divisions,rows:rows.map(({index,y,height})=>({index,y,height})),scopeLimit:m.scopeLimit});
 }
 return {'base62-encoding':base62Encoding};
}
