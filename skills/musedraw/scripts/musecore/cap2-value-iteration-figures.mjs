import {el} from './svg.mjs';
import {visualText,visualFinish} from './visual-tools.mjs';
import {electionTextPlan} from './election-figures.mjs';
import {learningFamilies} from './learning-figures.mjs';
import {cap2ValueIterationModel} from './cap2-value-iteration-models.mjs';
export function cap2ValueIterationFamilies(h){
 function valueIteration(b){
  const m=cap2ValueIterationModel(b),displayTrajectory={...m.trajectory,grid:{...m.trajectory.grid,cells:m.trajectory.grid.cells.map(c=>({...c,stateValue:c.stateValue===null?null:Number(c.stateValue.toPrecision(6))}))}},s=learningFamilies(h)['rl-trajectory'](displayTrajectory),old=JSON.parse(s.dataset.geometry),bg='#0E0620',white='#FFE3F2';
  for(const e of s.querySelectorAll('text'))e.textContent=e.textContent.replace('给定轨迹折扣和','计算轨迹折扣和').replace('青线：给定动作路径','青线：计算动作路径').replace('小数 V：输入值','小数 V：计算值').replace('只计给定记录','只计此段记录').replace(/^给定 (\d+ × \d+ 状态空间)$/,'显式 $1').replace(/^V /,'V ≈ ');
  const arrows=[];
  for(const p of m.policy){const c=old.cellGeometry.find(c=>c.id===p.state),cx=c.x+c.size*.68,cy=c.y+c.size*.50,[dx,dy]={north:[0,-1],east:[1,0],south:[0,1],west:[-1,0]}[p.action],x1=cx-dx*18,y1=cy-dy*18,x2=cx+dx*18,y2=cy+dy*18,g=el('g',{'data-computed-policy':p.state,'data-policy-action':p.action,'data-next-state':p.nextState,'data-bounced':String(p.bounced)},s);
   el('line',{x1,y1,x2,y2,stroke:white,'stroke-width':3},g);el('polygon',{points:[[x2,y2],[x2-dx*10-dy*6,y2-dy*10+dx*6],[x2-dx*10+dy*6,y2-dy*10-dx*6]].map(p=>p.join(',')).join(' '),fill:white},g);arrows.push({state:p.state,action:p.action,nextState:p.nextState,bounced:p.bounced,x:cx-21,y:cy-21,width:42,height:42});
  }
  const text='白箭头：各非终止格的计算策略；青线：由起点执行的一段记录。碰壁仍选原动作，记录显示原地，奖励取当前格。\n已知确定性模型 · 同步价值迭代 '+m.iterations+' 轮 · Bellman 残差约 '+m.residual.toExponential(2)+' · V 误差界约 '+m.valueErrorBound.toExponential(2)+'\n格内 V 约取 6 位有效数字，完整计算值保留在数据中。策略损失界约 '+m.greedyPolicyLossBound.toExponential(2)+'，为浮点估计界。\n终止后价值为 0；达到记录上限明确截断，不保证到达终点。',p=electionTextPlan(text,old.width-160,23),top=old.height+15,H=Math.ceil(top+p.height+60);
  // The former bottom margin becomes a measured solver explanation panel.
  s.setAttribute('height',H);s.setAttribute('viewBox',`0 0 ${old.width} ${H}`);s.querySelector('rect').setAttribute('height',H);p.lines.forEach((line,i)=>visualText(s,80,top+p.ascent+i*p.step,line,{size:p.size,weight:p.weight,role:p.role,fill:white}));
  const {sourceCase,input,...kept}=old;return visualFinish(s,{...kept,family:b.family,input:b,height:H,solver:{...m,trajectory:undefined,validatedTrajectory:undefined},displayPrecision:{stateValueSignificantDigits:6,approximationSign:true,fullValues:'solver.values'},policyArrows:arrows,solverPanel:{x:80,y:top,width:old.width-160,height:p.height},compositionReferences:['s08-qianghua-xuexi']});
 }return {'grid-value-iteration':valueIteration};
}
