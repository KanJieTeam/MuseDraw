import {el} from './svg.mjs';
import {visualPage,visualText,visualFinish,stroke} from './visual-tools.mjs';
import {niceDomain,linearScale} from './quantitative.mjs';
import {equationTextPlan,equationDrawPlan} from './equation-figures.mjs';
import {cpuSequenceReplayModel} from './autoscale-models.mjs';

export function autoscaleReplayFamilies(h){
function cpuSequenceReplay(b){
 const r=cpuSequenceReplayModel(b),W=1800,white='#F1F3F5',muted='#969AA5',cyan='#83E8D2',purple='#A3A6FF',dark='#08090C';
 const text=(v,w,size=26,weight=400,max=4)=>equationTextPlan(v,w,{size,weight,max});
 const title=text(b.title,1640,58,700,3),sub=text(b.subtitle,1640,27,400,3),formula=text('原始建议副本数 = ⌈ 当前副本数 × 当前CPU使用率 ÷ 目标使用率 ⌉',1640,34,500,3);
 let y=64,titleY=y;y+=title.height+16;const subY=y;y+=sub.height+36;const formulaY=y;y+=formula.height+24;
 const first=r.rows[0],util=first.cpuCores/(first.before*b.requestCores),percent=n=>Number((n*100).toFixed(2))+'%',fmt=n=>Number(n.toFixed(3)).toLocaleString('en-US');
 const milli=n=>{const [a,f='']=String(n).split('.');return Number(a)*1000+Number(f.padEnd(3,'0'))},usageNum=milli(first.cpuCores),usageDen=first.before*milli(b.requestCores),exactUtil=usageNum*10000%usageDen===0,exampleLiteral=exactUtil?`⌈ ${first.before} × ${percent(util)} ÷ ${percent(b.targetUtilization)} ⌉ = ${first.raw}`:`⌈ ${fmt(first.cpuCores)} ÷ (${fmt(b.requestCores)} × ${percent(b.targetUtilization)}) ⌉ = ${first.raw}`; const example=text(exampleLiteral,1040,70,700,2),summary=text(`${r.upEvents} 次扩容 · ${r.downEvents} 次缩容\n峰值 ${r.peakReplicas} 个副本\n${r.rows.length} 点${b.dataStatus==='synthetic-teaching'?'合成':'给定'}教学序列`,540,27,500,4),exampleY=y;y+=Math.max(example.height,summary.height)+50;
 const cpuLegend=text('给定CPU需求 / 每副本请求',650,26,400,1),replicaLegend=text('逐次应用副本数',450,26,400,1),legendY=y;y+=Math.max(cpuLegend.height,replicaLegend.height)+32;const plotTop=y,plotH=350,plotBottom=y+plotH,left=150,right=1710;
 const equivalent=r.rows.map(v=>v.cpuCores/b.requestCores),yd=niceDomain([0,b.maxReplicas,...equivalent],{steps:5}),X=linearScale([0,r.rows.at(-1).atSeconds],[left,right]),Y=linearScale(yd.domain,[plotBottom,plotTop]);
 const timeLabel=text('经过时间（分:秒）',400,23,400,1),timeLabelY=plotBottom+58;y=timeLabelY+timeLabel.height+18;const unit=text(`共享纵轴：副本数 / CPU请求量当量；1 当量 = 每副本请求 ${fmt(b.requestCores)} 核。灰线仅连接给定采样点。`,1600,23,400,3),unitY=y;y+=unit.height+45;
 const params=[['最少副本',b.minReplicas+' 个'],['最多副本',b.maxReplicas+' 个'],['目标CPU使用率',percent(b.targetUtilization)],['比例容忍带','±'+percent(b.tolerance)],['缩容稳定窗口',b.downscaleWindowSeconds+' 秒']].map(([label,value])=>({label:text(label,290,24,400,2),value:text(value,290,40,700,2)}));
 const paramsY=y,paramH=Math.max(...params.map(p=>p.value.height+12+p.label.height));y+=paramH+35;
 const rule=text(`每 ${b.evaluationSeconds} 秒评估；初始 ${b.initialReplicas} 副本。每次评估：扩容至多 max(⌊当前数 × ${b.scaleUp.maxPercentIncrease}%⌋, ${b.scaleUp.maxPodsIncrease})；缩容至多 ⌊当前数 × ${b.scaleDown.maxPercentDecrease}%⌋。`,1640,24,400,3),ruleY=y;y+=rule.height+18;
 const assumptions=text('教学约定：初始推荐历史为空；缩容窗口含两端。所有副本立即就绪、指标完整、总需求均匀分摊；逐次限速不等同 Kubernetes 滚动周期策略。',1640,24,400,3),assumptionsY=y;y+=assumptions.height+22;
 const note=text(b.note,1640,23,400,4),noteY=y,H=y+note.height+60,s=visualPage(W,H,dark),defs=el('defs',{},s),g=el('linearGradient',{id:'autoscale-glow',gradientUnits:'userSpaceOnUse',x1:0,y1:0,x2:W,y2:0},defs);el('stop',{offset:0,'stop-color':cyan},g);el('stop',{offset:1,'stop-color':purple},g);
 const area=el('linearGradient',{id:'autoscale-area',x1:0,y1:0,x2:0,y2:1},defs);el('stop',{offset:0,'stop-color':'#737782','stop-opacity':.7},area);el('stop',{offset:1,'stop-color':'#737782','stop-opacity':.08},area);
 equationDrawPlan(s,80,titleY,title,{fill:white});equationDrawPlan(s,80,subY,sub,{fill:muted});equationDrawPlan(s,80,formulaY,formula,{fill:white});equationDrawPlan(s,80,exampleY,example,{fill:'url(#autoscale-glow)'});equationDrawPlan(s,1180,exampleY+6,summary,{fill:muted});
 el('rect',{x:150,y:legendY+cpuLegend.ascent-18,width:25,height:18,fill:'#777C88'},s);equationDrawPlan(s,190,legendY,cpuLegend,{fill:muted});el('rect',{x:920,y:legendY+cpuLegend.ascent-10,width:40,height:5,fill:'url(#autoscale-glow)'},s);equationDrawPlan(s,975,legendY,replicaLegend,{fill:muted});
 for(const tick of yd.ticks){stroke(s,[[left,Y(tick)],[right,Y(tick)]],'#272B32',1);visualText(s,left-20,Y(tick)+8,fmt(tick),{size:23,fill:muted,anchor:'end'})}
 const points=r.rows.map((v,i)=>[X(v.atSeconds),Y(equivalent[i])]);el('path',{d:`M ${left} ${Y(0)} `+points.map(p=>'L '+p.join(' ')).join(' ')+` L ${right} ${Y(0)} Z`,fill:'url(#autoscale-area)'},s);stroke(s,points,'#8C919D',1.8);points.forEach((p,i)=>el('circle',{cx:p[0],cy:p[1],r:2.7,fill:'#B8BDC8','data-role':'cpu-demand-sample','data-index':i,'data-cpu-cores':r.rows[i].cpuCores},s));
 const stairs=[[X(0),Y(b.initialReplicas)]];for(const row of r.rows)stairs.push([X(row.atSeconds),stairs.at(-1)[1]],[X(row.atSeconds),Y(row.applied)]);stroke(s,stairs,'url(#autoscale-glow)',4.5,{'data-role':'applied-replica-staircase'});r.rows.filter((v,i)=>v.applied!==v.before||i===r.rows.length-1).forEach(v=>el('circle',{cx:X(v.atSeconds),cy:Y(v.applied),r:5,fill:purple},s));
 const time=t=>String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');const ticks=[...new Set([0,...Array.from({length:5},(_,i)=>Math.round((i+1)*r.rows.at(-1).atSeconds/5))])];ticks.forEach(t=>visualText(s,X(t),plotBottom+38,time(t),{size:23,fill:muted,anchor:'middle'}));equationDrawPlan(s,right,timeLabelY,timeLabel,{fill:muted,anchor:'end'});equationDrawPlan(s,150,unitY,unit,{fill:muted});
 params.forEach((p,i)=>{const x=90+i*345;equationDrawPlan(s,x,paramsY,p.value,{fill:white});equationDrawPlan(s,x,paramsY+p.value.height+12,p.label,{fill:muted})});equationDrawPlan(s,80,ruleY,rule,{fill:'#B8BEC9'});equationDrawPlan(s,80,assumptionsY,assumptions,{fill:muted});equationDrawPlan(s,80,noteY,note,{fill:muted});
 return visualFinish(s,{family:b.family,width:W,height:H,compositionReference:'103-hpa-autoscaling',model:r,example:{literal:exampleLiteral,style:exactUtil?'exact-utilization':'exact-cpu-capacity'},plot:{left,right,top:plotTop,bottom:plotBottom,domain:yd.domain,axisTicks:yd.ticks,demandEquivalent:equivalent,points,stairs,units:'replica count / demandCores per requestCores; common zero baseline',sampleConnection:'straight segments for display only; no intermediate observations or evaluations computed'},policies:{window:'inclusive [t-window,t]',history:'empty initially, no prehistory invented',rate:'per-evaluation integer allowances, not rolling-period HPA behavior'},scope:r.scope});
}



 return {'cpu-sequence-replay':cpuSequenceReplay};
}
