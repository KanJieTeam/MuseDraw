import {el} from './svg.mjs';
import {visualPage,visualText,visualLines,visualHeadingPlan,visualBlock,visualFinish,measureVisual,stroke} from './visual-tools.mjs';
import {rankShiftModel} from './rank-shift-models.mjs';

export function rankShiftFigure(input){
 const m=rankShiftModel(input),W=1900,margin=86,ink='#17232A',muted='#65737A',grid='#D6DDDA',up='#2D6F82',down='#B24D3B',same='#8C9691',paper='#FAFBF8',amber='#C58B34';
 const head=visualHeadingPlan(m.title,m.subtitle,{top:54,width:W-margin*2,size:54,max:3}),status=visualLines(m.dataStatus,W-margin*2,{size:23,max:3}),note=visualLines(m.note,W-margin*2,{size:22,max:5});
 const plot={x:330,y:head.bottom+190,w:990,h:Math.max(560,m.items.length*78)},leftX=plot.x+150,rightX=plot.x+plot.w-150,axisTop=plot.y,axisBottom=plot.y+plot.h,rowStep=plot.h/m.items.length;
 const rankY=r=>axisTop+(r-.5)*rowStep,sideW=420,rightPanelX=plot.x+plot.w+90;
 const H=axisBottom+220+note.length*34,s=visualPage(W,H,paper);
 visualBlock(s,margin,54,head.titleLines,{size:54,weight:800,fill:ink,leading:1.25});visualBlock(s,margin,54+head.h+14,head.sub,{size:23,fill:muted,leading:1.3});visualBlock(s,margin,head.bottom+32,status,{size:23,fill:muted,leading:1.3});
 stroke(s,[[leftX-150,axisTop-46],[leftX-150,axisBottom+20]],grid,1);stroke(s,[[rightX+150,axisTop-46],[rightX+150,axisBottom+20]],grid,1);
 visualText(s,leftX,axisTop-92,m.periods[0].label,{size:28,weight:800,fill:ink,anchor:'middle'});visualText(s,rightX,axisTop-92,m.periods[1].label,{size:28,weight:800,fill:ink,anchor:'middle'});
 for(let rank=1;rank<=m.items.length;rank++){const y=rankY(rank);stroke(s,[[leftX+20,y],[rightX-20,y]],grid,1,{'data-role':'rank-grid'});visualText(s,leftX-205,y+7,String(rank),{size:21,fill:muted,anchor:'end'});visualText(s,rightX+205,y+7,String(rank),{size:21,fill:muted})}
 visualText(s,leftX-205,axisTop-20,'名次',{size:21,weight:700,fill:muted,anchor:'end'});visualText(s,rightX+205,axisTop-20,'名次',{size:21,weight:700,fill:muted});
 const lines=[];for(const row of m.items){const y1=rankY(row.beforeRank),y2=rankY(row.afterRank),color=row.direction==='up'?up:row.direction==='down'?down:same;stroke(s,[[leftX,y1],[rightX,y2]],color,row.direction==='same'?3:5,{'data-rank-shift-line':row.id,'data-direction':row.direction});el('circle',{cx:leftX,cy:y1,r:10,fill:paper,stroke:color,'stroke-width':3,'data-rank-shift-before':row.id},s);el('circle',{cx:rightX,cy:y2,r:10,fill:color,stroke:paper,'stroke-width':3,'data-rank-shift-after':row.id},s);visualText(s,leftX-28,y1+7,row.label,{size:22,fill:ink,anchor:'end'});visualText(s,rightX+28,y2+7,row.label,{size:22,fill:ink});lines.push({id:row.id,before:{rank:row.beforeRank,y:y1},after:{rank:row.afterRank,y:y2},direction:row.direction,change:row.change})}
 visualText(s,rightPanelX,plot.y+28,'读法',{size:28,weight:800,fill:ink});visualBlock(s,rightPanelX,plot.y+82,visualLines('每条线连接同一事项的两次名次\n名次数字越小，位置越靠上\n蓝：前移　赭：后移　灰：不变',sideW,{size:23,max:7}),{size:23,fill:muted,leading:1.45});
 visualText(s,rightPanelX,plot.y+295,'本页登记',{size:28,weight:800,fill:ink});visualBlock(s,rightPanelX,plot.y+350,visualLines(`前移 ${m.counts.up} 项\n后移 ${m.counts.down} 项\n不变 ${m.counts.same} 项`,sideW,{size:26,max:4,weight:700}),{size:26,weight:700,fill:up,leading:1.45});
 visualBlock(s,margin,axisBottom+130,visualLines(`${m.items.length} 个事项 · 两次名次均由输入提供`,W-margin*2,{size:22,max:2}),{size:22,fill:muted,leading:1.35});stroke(s,[[margin,H-note.length*34-45],[W-margin,H-note.length*34-45]],grid,1);visualBlock(s,margin,H-note.length*34-20,note,{size:22,fill:muted,leading:1.35});
 return visualFinish(s,{family:'rank-shift',width:W,height:H,input,model:m,plot:{...plot,leftX,rightX,rankY},lines,sourceTraceability:m.sourceTraceability,scope:m.scope});
}
export function rankShiftFamilies(){return {'rank-shift':rankShiftFigure};}
