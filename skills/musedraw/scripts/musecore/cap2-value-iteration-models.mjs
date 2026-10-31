import {learningTrajectoryModel} from './learning-models.mjs';
function cap2ViNeed(ok,message){if(!ok)throw Error('grid-value-iteration: '+message)}
export function cap2ValueIterationModel(b){
 const keys=['family','title','subtitle','view','evidenceKind','agent','environment','rewardUnit','gamma','grid','initial','solver','note'];
 cap2ViNeed(b&&typeof b==='object'&&!Array.isArray(b),'object required');for(const k of Object.keys(b))cap2ViNeed(keys.includes(k),'unsupported input field '+k);
 cap2ViNeed(b.family==='grid-value-iteration','family mismatch');
 const {solver,...rest}=b,base={...rest,family:'rl-trajectory',steps:[],focusStep:null};
 const checked=learningTrajectoryModel(base);
 cap2ViNeed(b.gamma<=.99,'gamma must be0..0.99 for this bounded solver');
 cap2ViNeed(solver&&typeof solver==='object'&&!Array.isArray(solver),'explicit solver required');
 for(const k of Object.keys(solver))cap2ViNeed(['wallRule','actionOrder','valueTolerance','maxIterations','traceLimit'].includes(k),'unsupported solver field '+k);
 cap2ViNeed(solver.wallRule==='stay-and-receive-current-entry-reward','explicit wallRule required');
 const delta={north:[-1,0],east:[0,1],south:[1,0],west:[0,-1]};
 cap2ViNeed(Array.isArray(solver.actionOrder)&&solver.actionOrder.length===4&&new Set(solver.actionOrder).size===4&&solver.actionOrder.every(a=>Object.hasOwn(delta,a)),'actionOrder must permute north/east/south/west');
 cap2ViNeed(Number.isFinite(solver.valueTolerance)&&solver.valueTolerance>=1e-9&&solver.valueTolerance<=.001,'valueTolerance requires1e-9..0.001');
 cap2ViNeed(Number.isSafeInteger(solver.maxIterations)&&solver.maxIterations>=1&&solver.maxIterations<=2000,'maxIterations requires1..2000');
 cap2ViNeed(Number.isSafeInteger(solver.traceLimit)&&solver.traceLimit>=1&&solver.traceLimit<=24,'traceLimit requires1..24');
 for(const c of checked.cells){cap2ViNeed(c.stateValue===null,'stateValue must be null; this branch computes it');if(!c.blocked)cap2ViNeed(Number.isFinite(c.entryReward)&&Math.abs(c.entryReward)<=1000,'every traversable entryReward requires explicit finite -1000..1000');}
 const cells=checked.cells,at=new Map(cells.map(c=>[c.id,c])),active=cells.filter(c=>!c.blocked&&!c.terminal),index=new Map(cells.map(c=>[c.id,c.index]));
 const transitions=new Map(active.map(c=>[c.id,solver.actionOrder.map(action=>{const [dr,dc]=delta[action],row=c.row+dr,col=c.column+dc,target=row<0||col<0||row>=b.grid.rows||col>=b.grid.columns?null:cells[row*b.grid.columns+col],next=!target||target.blocked?c:target;return {action,nextState:next.id,reward:next.entryReward,bounced:next===c};})]));
 const update=values=>{const next=values.slice();for(const c of active)next[c.index]=Math.max(...transitions.get(c.id).map(t=>t.reward+b.gamma*(at.get(t.nextState).terminal?0:values[index.get(t.nextState)])));return next;};
 let values=cells.map(()=>0),iterations=0,residual=Infinity;
 for(;iterations<solver.maxIterations;){values=update(values);iterations++;const next=update(values);residual=active.reduce((max,c)=>Math.max(max,Math.abs(next[c.index]-values[c.index])),0);if(residual<=(1-b.gamma)*solver.valueTolerance)break;}
 cap2ViNeed(residual<=(1-b.gamma)*solver.valueTolerance,'iteration budget exhausted before requested Bellman residual; increase maxIterations or relax tolerance');
 const policy=active.map(c=>{const choices=transitions.get(c.id).map(t=>({...t,q:t.reward+b.gamma*(at.get(t.nextState).terminal?0:values[index.get(t.nextState)])}));let best=choices[0];for(const t of choices.slice(1))if(t.q>best.q)best=t;return {state:c.id,value:values[c.index],...best,choices};});
 const byState=new Map(policy.map(p=>[p.state,p])),steps=[];let current=at.get(b.initial);
 for(let i=0;i<solver.traceLimit&&!current.terminal;i++){const p=byState.get(current.id),next=at.get(p.nextState);steps.push({id:'computed-'+(i+1),state:current.id,action:p.bounced?'stay':p.action,reward:p.reward,nextState:next.id,terminated:next.terminal,truncated:!next.terminal&&i===solver.traceLimit-1});current=next;}
 const trajectory={...base,grid:{...b.grid,cells:b.grid.cells.map(c=>({...c,stateValue:c.blocked||c.terminal?null:values[index.get(c.id)]}))},steps,focusStep:steps.at(-1)?.id??null};
 const validatedTrajectory=learningTrajectoryModel(trajectory),valueErrorBound=residual/(1-b.gamma);
 return {trajectory,validatedTrajectory,policy,values:cells.map(c=>({id:c.id,value:c.blocked?null:values[c.index]})),iterations,residual,valueErrorBound,greedyPolicyLossBound:2*b.gamma*valueErrorBound/(1-b.gamma),wallRule:solver.wallRule,actionOrder:[...solver.actionOrder],traceEnd:validatedTrajectory.endKind,scope:'Known deterministic rectangular2..6 grid MDP, four actions; walls/outside bounce and receive current entry reward, terminal continuation value0. Synchronous discounted Bellman iteration in floating point, residual-based approximate value and policy bounds (not interval-arithmetic certificates). All rewards and flags explicitly supplied. Numerical zero initialization is an algorithm choice, not imputation of unknown rewards. Greedy ties use first action in supplied order; path stops at terminal or explicit24-step-or-shorter cutoff. No learned dynamics, stochastic transitions, training, universal reachability or observed-performance claim.'};
}
