import {el} from './svg.mjs';
import {visualPage,visualText,visualLines,visualHeadingPlan,visualBlock,visualFinish,stroke} from './visual-tools.mjs';
import {rocPrCurveModel} from './roc-pr-models.mjs';

function panel(s,{x,y,w,h,title,xLabel,yLabel,points,xKey,yKey,strokeColor,diagonal=false,labels}){
 const ink='#1D2A33',muted='#637176',grid='#D7DFDC',paper='#F9FBF9',px=x+82,py=y+62,pw=w-118,ph=h-112;
 el('rect',{x,y,width:w,height:h,fill:paper,stroke:'#B8C5C0','stroke-width':1.2,'data-roc-panel':title},s);
 visualText(s,x+24,y+34,title,{size:30,weight:800,fill:ink});
 for(let i=0;i<=4;i++){const xx=px+pw*i/4,yy=py+ph*i/4;stroke(s,[[xx,py],[xx,py+ph]],grid,1,{'data-role':'grid'});stroke(s,[[px,yy],[px+pw,yy]],grid,1,{'data-role':'grid'});visualText(s,xx,py+ph+32,(i/4).toFixed(2),{size:18,anchor:'middle',fill:muted});visualText(s,px-15,yy+6,(1-i/4).toFixed(2),{size:18,anchor:'end',fill:muted})}
 stroke(s,[[px,py],[px,py+ph],[px+pw,py+ph]],ink,2);
 if(diagonal)stroke(s,[[px,py+ph],[px+pw,py]],'#B1BDB8',2,{'stroke-dasharray':'8 8','data-roc-reference':'chance'});
 const X=v=>px+v*pw,Y=v=>py+ph-v*ph,pts=points.map(p=>[X(p[xKey]),Y(p[yKey])]);
 stroke(s,pts,strokeColor,4,{'data-roc-curve':xKey});
 points.forEach(p=>el('circle',{cx:X(p[xKey]),cy:Y(p[yKey]),r:6,fill:strokeColor,stroke:paper,'stroke-width':2,'data-roc-point':p.id},s));
 visualText(s,px+pw/2,y+h+22,xLabel,{size:20,anchor:'middle',fill:muted});visualText(s,x-18,py+ph/2,yLabel,{size:20,anchor:'middle',fill:muted,transform:`rotate(-90 ${x-18} ${py+ph/2})`});
 for(const [i,p] of labels.entries()){const xx=X(p[xKey]),yy=Y(p[yKey]),right=xx<px+pw*.66,dx=right?12:-12,anchor=right?'start':'end';visualText(s,xx+dx,yy-(i%2?13:3),p.label,{size:17,anchor,fill:ink})}
 return {x,y,w,h,plot:{x:px,y:py,w:pw,h:ph},points:points.map(p=>({id:p.id,x:X(p[xKey]),y:Y(p[yKey])}))};
}

export function rocPrCurveFamilies(){return {'roc-pr-curve':input=>{
 const m=rocPrCurveModel(input),W=2200,margin=100,ink='#1D2A33',muted='#637176',accent='#2B7280',plum='#8A536D',paper='#F8FAF8';
 const head=visualHeadingPlan(m.title,m.subtitle,{top:54,width:2000,size:54,max:3}),status=visualLines(m.dataStatus,2000,{size:23,max:3}),note=visualLines(m.note,2000,{size:22,max:6});
 const top=head.bottom+160,panelW=820,panelH=710,gap=58,left=margin,right=left+panelW+gap,summaryX=right+panelW+48,summaryW=W-summaryX-margin;
 const H=top+panelH+note.length*34+330,s=visualPage(W,H,paper);
 visualBlock(s,margin,54,head.titleLines,{size:54,weight:800,fill:ink,leading:1.25});visualBlock(s,margin,54+head.h+14,head.sub,{size:23,fill:muted,leading:1.3});visualBlock(s,margin,head.bottom+34,status,{size:23,fill:muted,leading:1.3});
 const roc=panel(s,{x:left,y:top,w:panelW,h:panelH,title:'ROC · 辨别排序',xLabel:'假阳性率',yLabel:'真阳性率',points:m.points,xKey:'fpr',yKey:'tpr',strokeColor:accent,diagonal:true,labels:[]});
 const pr=panel(s,{x:right,y:top,w:panelW,h:panelH,title:'PR · 阳性查准',xLabel:'召回率',yLabel:'查准率',points:m.points,xKey:'recall',yKey:'precision',strokeColor:plum,labels:[]});
 visualText(s,summaryX,top+34,'输入摘要',{size:30,weight:800,fill:ink});visualBlock(s,summaryX,top+90,visualLines(`${m.points.length} 个阈值点\n阈值：${m.points[0].threshold} → ${m.points.at(-1).threshold}\nROC 梯形面积：${m.aucRoc.toFixed(3)}\nPR 梯形面积：${m.aucPr.toFixed(3)}`,summaryW,{size:23,max:6,weight:650}),{size:23,weight:650,fill:ink,leading:1.45});
 visualText(s,summaryX,top+310,'读法',{size:30,weight:800,fill:ink});visualBlock(s,summaryX,top+365,visualLines('同一组阈值点在两种坐标中重排。\nROC 对照虚线仅是随机排序的几何参照；\n它不是模型基线或统计检验。\n曲线颜色只区分两个坐标面。',summaryW,{size:22,max:8}),{size:22,fill:muted,leading:1.42});
 visualText(s,summaryX,top+760,'追溯',{size:30,weight:800,fill:ink});visualBlock(s,summaryX,top+815,visualLines('每个点的阈值、四项率值和 source\n都保留在输入与 geometry.sourceTraceability。',summaryW,{size:22,max:4}),{size:22,fill:muted,leading:1.42});
 stroke(s,[[margin,H-note.length*34-48],[W-margin,H-note.length*34-48]],'#B8C5C0',1);visualBlock(s,margin,H-note.length*34-22,note,{size:22,fill:muted,leading:1.35});
 return visualFinish(s,{family:'roc-pr-curve',width:W,height:H,input,model:m,panels:{roc,pr},sourceTraceability:m.sourceTraceability,scope:m.scope});
}}}
