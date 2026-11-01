import {evidenceMatrixModel} from './evidence-matrix-models.mjs';
import {el} from './svg.mjs';
import {measureVisual,visualLines,visualPage,visualText,visualBlock,visualHeading,visualFinish,stroke} from './visual-tools.mjs';

export function evidenceMatrixFamilies(h){
 const {need,list,fields,str,unique,wrap}=h;
 const model=b=>evidenceMatrixModel(b);
 function evidenceMatrix(b){
  const m=model(b), W=1500, paper='#F7F5EF', ink='#20262A', muted='#687276', rule='#B9B8AE', accent='#2A6570';
  const labelW=330, right=140, left=90, gridLeft=left+labelW, gridW=W-gridLeft-right;
  const colW=gridW/m.columns.length;
  const titlePlan=visualLines(m.title,W-left-right,{size:58,weight:700,max:2});
  const subtitlePlan=visualLines(`${m.subtitle} · ${m.dataStatus}`,W-left-right,{size:23,max:2});
  const titleH=Math.max(58*1.2,titlePlan.length*58*1.25)+subtitlePlan.length*23*1.4+42;
  const headerH=110;
  const rowPlans=m.rows.map(r=>({label:visualLines(r.label,labelW-36,{size:24,weight:650,max:3}),notes:r.values.map(v=>v.note?visualLines(v.note,colW-22,{size:15,max:2}):[])}));
  const rowH=rowPlans.map(r=>Math.max(94,r.label.length*31+30,...r.notes.map(n=>n.length? n.length*21+65:0)));
  const legendH=92, notePlan=visualLines(m.note,W-left-right,{size:20,max:3});
  const H=titleH+headerH+rowH.reduce((a,z)=>a+z,0)+legendH+notePlan.length*27+90;
  need(H<=2600,'evidence matrix exceeds supported height; reduce rows or shorten labels');
  const s=visualPage(W,H,paper);
  let y=42;visualBlock(s,left,y,titlePlan,{size:58,weight:700,fill:ink});y+=titlePlan.length*58*1.25+12;visualBlock(s,left,y,subtitlePlan,{size:23,fill:muted});y+=subtitlePlan.length*23*1.4+28;
  const gridTop=y;stroke(s,[[left,gridTop],[W-right,gridTop]],ink,2);
  visualText(s,left+labelW-18,gridTop+40,'核验项',{size:18,weight:700,fill:muted,anchor:'end'});
  m.columns.forEach((c,i)=>{const p=visualLines(c.label,colW-24,{size:24,weight:700,max:3});visualBlock(s,gridLeft+i*colW+colW/2,gridTop+26,p,{size:24,weight:700,fill:ink,anchor:'middle'});});
  const statusColors={confirmed:'#2A6570',partial:'#C37C3F',missing:'#B9B8AE',blocked:'#7D4F59','not-applicable':'#F7F5EF'};
  const statusMarks={confirmed:'✓',partial:'△',missing:'—',blocked:'!', 'not-applicable':'·'};
  const cells=[];const rows=[];let cy=gridTop+headerH;
  rowPlans.forEach((rp,ri)=>{const row=m.rows[ri],rh=rowH[ri];if(ri%2===0)el('rect',{x:left,y:cy,width:W-left-right,height:rh,fill:'#F0EEE7'},s);visualBlock(s,left+18,cy+18,rp.label,{size:24,weight:650,fill:ink});const rowCells=[];row.values.forEach((v,ci)=>{const cx=gridLeft+ci*colW+colW/2,mark=statusMarks[v.status],color=statusColors[v.status],g=el('g',{'data-evidence-cell':`${row.id}:${m.columns[ci].id}`},s);el('circle',{cx,cy:cy+34,r:22,fill:v.status==='not-applicable'?paper:color,stroke:v.status==='not-applicable'?rule:'none','stroke-width':v.status==='not-applicable'?2:0},g);visualText(g,cx,cy+43,mark,{size:25,weight:800,fill:v.status==='missing'||v.status==='not-applicable'?ink:paper,anchor:'middle'});if(v.note){const np=rp.notes[ci];visualBlock(s,cx,cy+66,np,{size:15,fill:muted,anchor:'middle'});}rowCells.push({status:v.status,x:cx,y:cy+34,note:v.note});cells.push({row:row.id,column:m.columns[ci].id,status:v.status});});rows.push({id:row.id,y:cy,height:rh,cells:rowCells});stroke(s,[[left,cy+rh],[W-right,cy+rh]],rule,1);cy+=rh;});
  const legendY=cy+35;visualText(s,left,legendY,'状态只表示输入中声明的证据位置',{size:18,weight:700,fill:muted});let lx=left+420;m.legend.forEach(l=>{const c=statusColors[l.status];el('circle',{cx:lx,cy:legendY-7,r:10,fill:l.status==='not-applicable'?paper:c,stroke:l.status==='not-applicable'?rule:'none','stroke-width':l.status==='not-applicable'?1.5:0},s);visualText(s,lx+18,legendY,l.label,{size:18,fill:ink});lx+=measureVisual(l.label,18,'sans')+70;});
  const footerY=legendY+42;stroke(s,[[left,footerY-14],[W-right,footerY-14]],ink,1);visualBlock(s,left,footerY,notePlan,{size:20,fill:muted});
  return visualFinish(s,{family:'evidence-matrix',width:W,height:H,columns:m.columns,rows,cells,legend:m.legend,encoding:'status is explicit input; geometry does not infer evidence quality',scope:'2–5 named objects by 3–10 explicit criteria; each cell carries one declared evidence status; no scoring, ranking, causality or completeness inference',sourceCase:'office-research-evidence-matrix'});
 }
 return {'evidence-matrix':evidenceMatrix};
}



