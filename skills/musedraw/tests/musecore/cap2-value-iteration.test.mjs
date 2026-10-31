import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {cap2ValueIterationModel} from '../../scripts/musecore/cap2-value-iteration-models.mjs';
const source=JSON.parse(await fs.readFile(new URL('../../assets/musecore/cap2-value-iteration-grid.json',import.meta.url),'utf8'));
const copy=()=>structuredClone(source);
test('supplied maze recomputes8-step terminal trace and closed-form return',()=>{
 const m=cap2ValueIterationModel(copy()),expected=-Array.from({length:7},(_,i)=>.9**i).reduce((a,z)=>a+z,0)+10*.9**7;
 assert.equal(m.trajectory.steps.length,8);assert.equal(m.traceEnd,'terminated');assert.ok(Math.abs(m.values.find(v=>v.id==='s40').value-expected)<1e-12);assert.ok(Math.abs(m.validatedTrajectory.returnSum-expected)<1e-12);assert.equal(m.policy.length,20);assert.equal(m.values.find(v=>v.id==='s12').value,null);
});
test('positive self-loop beats goal, wall action stays explicit, trace is truncated',()=>{
 const b=copy();b.grid={rows:2,columns:2,cells:Array.from({length:4},(_,i)=>({id:'c'+i,label:'格'+i,blocked:false,terminal:i===3,marker:i===3?'goal':'normal',entryReward:i===0?1:i===3?0:-1,stateValue:null}))};b.initial='c0';b.solver.traceLimit=3;
 const m=cap2ValueIterationModel(b),v=m.values.find(v=>v.id==='c0').value;assert.ok(Math.abs(v-10)<=b.solver.valueTolerance+1e-12);assert.equal(m.policy[0].action,'north');assert.equal(m.policy[0].bounced,true);assert.equal(m.trajectory.steps[0].action,'stay');assert.equal(m.trajectory.steps.at(-1).truncated,true);assert.equal(m.traceEnd,'truncated');assert.equal(m.trajectory.steps.length,3);assert.ok(m.valueErrorBound<=b.solver.valueTolerance);
});
test('zero discount uses immediate reward and supplied first-max action order',()=>{
 const b=copy();b.gamma=0;b.solver.actionOrder=['west','south','east','north'];const m=cap2ValueIterationModel(b);assert.equal(m.iterations,1);assert.equal(m.residual,0);assert.equal(m.policy.find(p=>p.state==='s00').action,'west');assert.equal(m.values.find(v=>v.id==='s03').value,10);
});
test('unknown rewards, prefilled values, ambiguous rules and insufficient budget refuse',()=>{
 const mutations=[b=>b.grid.cells[0].entryReward=null,b=>b.grid.cells[0].stateValue=0,b=>b.gamma=1,b=>b.solver.wallRule='ignore',b=>b.solver.actionOrder=['north','north','east','south'],b=>b.solver.maxIterations=1,b=>b.solver.traceLimit=25,b=>b.solver.valueTolerance=0,b=>b.grid.cells.pop(),b=>b.initial='unknown',b=>b.solver.probability=.1,b=>b.steps=[]];
 for(const change of mutations){const b=copy();change(b);assert.throws(()=>cap2ValueIterationModel(b));}
});
