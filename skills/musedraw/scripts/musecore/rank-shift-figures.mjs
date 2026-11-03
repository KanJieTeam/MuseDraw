import {el} from './svg.mjs';
import {visualPage,visualFinish,stroke,measuredVisualPlan,drawVisualPlan} from './visual-tools.mjs';
import {rankShiftModel} from './rank-shift-models.mjs';

export function rankShiftFigure(input){
 const m=rankShiftModel(input),W=1900,margin=86,ink='#17232A',muted='#65737A',grid='#D6DDDA',up='#2D6F82',down='#B24D3B',same='#8C9691',paper='#FFFFFF';
 const plan=(text,width,size=22,weight=400,max=6)=>measuredVisualPlan(text,width,{size,weight,max});
 const title=plan(m.title,W-2*margin,54,800,5),sub=plan(m.subtitle,W-2*margin,23),status=plan(m.dataStatus,W-2*margin,22),note=plan(m.note,W-2*margin,22,400,12);
 const titleY=54,subY=titleY+title.height+22,statusY=subY+sub.height+20,leftX=570,rightX=1290;
 const labels=new Map(m.items.map(row=>[row.id,plan(row.label,390,22,400,6)])),rowStep=Math.max(78,...[...labels.values()].map(p=>p.height+36));
 const periodPlans=m.periods.map(p=>plan(p.label,650,28,800,5)),periodTop=statusY+status.height+52;
 const axisTop=periodTop+Math.max(...periodPlans.map(p=>p.height))+40,axisBottom=axisTop+rowStep*m.items.length,rankY=rank=>axisTop+(rank-.5)*rowStep;
 const rankTitle=plan('名次',110,21,700,1),rankTitleY=axisTop-rankTitle.height-16;
 const readTitle=plan('读法',950,28,800),read=plan('线连接同一事项的两次名次；数字越小，位置越靠上。\n前移、后移与不变由两端名次计算，不依赖颜色。',950,23,400,6),summaryTitle=plan('本页登记',640,28,800),summary=plan(`前移 ${m.counts.up} 项　后移 ${m.counts.down} 项　不变 ${m.counts.same} 项\n${m.items.length} 个事项 · 两次名次均由输入提供`,640,24,700,6);
 const bottomY=axisBottom+60,bottomHeight=Math.max(readTitle.height+22+read.height,summaryTitle.height+22+summary.height),ruleY=bottomY+bottomHeight+46,noteY=ruleY+28,H=Math.ceil(noteY+note.height+50),s=visualPage(W,H,paper);
 const draw=(x,y,p,fill=ink,anchor='start',attrs={})=>drawVisualPlan(s,x,y,p,{fill,anchor,...attrs});
 draw(margin,titleY,title);draw(margin,subY,sub,muted);draw(margin,statusY,status,muted);
 for(const [i,x] of [leftX,rightX].entries())draw(x,periodTop,periodPlans[i],ink,'middle');
 draw(110,rankTitleY,rankTitle,muted,'end');draw(1790,rankTitleY,rankTitle,muted);
 for(let rank=1;rank<=m.items.length;rank++){const y=rankY(rank),p=plan(String(rank),90,21,400,1);stroke(s,[[leftX+20,y],[rightX-20,y]],grid,1,{'data-role':'rank-grid'});draw(110,y-p.height/2,p,muted,'end');draw(1790,y-p.height/2,p,muted)}
 const lines=m.items.map(row=>{const y1=rankY(row.beforeRank),y2=rankY(row.afterRank),color=row.direction==='up'?up:row.direction==='down'?down:same,label=labels.get(row.id);
  stroke(s,[[leftX,y1],[rightX,y2]],color,row.direction==='same'?3:4,{'data-rank-shift-line':row.id,'data-direction':row.direction});
  el('circle',{cx:leftX,cy:y1,r:9,fill:paper,stroke:color,'stroke-width':3,'data-rank-shift-before':row.id},s);el('circle',{cx:rightX,cy:y2,r:9,fill:color,stroke:paper,'stroke-width':3,'data-rank-shift-after':row.id},s);
  draw(leftX-28,y1-label.height/2,label,ink,'end',{'data-rank-label-before':row.id});draw(rightX+28,y2-label.height/2,label,ink,'start',{'data-rank-label-after':row.id});
  return {id:row.id,before:{rank:row.beforeRank,y:y1},after:{rank:row.afterRank,y:y2},direction:row.direction,change:row.change};
 });
 draw(margin,bottomY,readTitle);draw(margin,bottomY+readTitle.height+22,read,muted);draw(1180,bottomY,summaryTitle);draw(1180,bottomY+summaryTitle.height+22,summary,muted);
 stroke(s,[[margin,ruleY],[W-margin,ruleY]],grid,1);draw(margin,noteY,note,muted);
 return visualFinish(s,{family:'rank-shift',width:W,height:H,input,model:m,plot:{x:leftX,y:axisTop,w:rightX-leftX,h:rowStep*m.items.length,leftX,rightX,rowStep},lines,sourceTraceability:m.sourceTraceability,scope:m.scope});
}
export function rankShiftFamilies(){return {'rank-shift':rankShiftFigure};}
