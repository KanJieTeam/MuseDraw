import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathwayMapModel} from '../../scripts/musecore/pathway-models.mjs';

const fixture=async id=>JSON.parse(await fs.readFile(new URL('../../assets/musecore/'+id+'.json',import.meta.url),'utf8'));
function members(model,label){return model.stations.find(s=>s.label===label)?.routeIds??[]}
function edge(input,from,to){const ids=Object.fromEntries(input.stations.map(s=>[s.label,s.id]));return input.routes.some(r=>r.segments.some(e=>e.from===ids[from]&&e.to===ids[to]))}

test('biology input preserves its three shared concepts and does not turn knowledge links into causal arrows',async()=>{
 const input=await fixture('biology-knowledge-map'),model=pathwayMapModel(input);
 assert.equal(model.stationCount,17);assert.equal(model.routeCount,4);assert.equal(model.interchangeCount,3);
 assert.deepEqual(members(model,'蛋白质'),['molecules','structure']);assert.deepEqual(members(model,'细胞膜'),['structure','energy']);assert.deepEqual(members(model,'细胞增殖'),['structure','life']);
 assert(input.routes.every(r=>r.direction==='unoriented'));assert.equal(input.meaning,'knowledge-links');
 assert.equal(input.stations.find(s=>s.label==='物质跨膜运输').note,'部分方式借助载体蛋白');
 assert.equal(model.query,null);assert(!input.stations.some(s=>s.label.includes('告警')));
});
test('mechanics input attaches all four kinematic equations and F=ma to their own concepts',async()=>{
 const input=await fixture('mechanics-knowledge-map'),model=pathwayMapModel(input);
 assert.equal(model.stationCount,19);assert.equal(model.interchangeCount,2);
 assert.deepEqual(members(model,'加速度'),['motion','kinematics','dynamics']);assert.deepEqual(members(model,'牛顿第二定律'),['dynamics','forces']);
 const notes=Object.fromEntries(input.stations.map(s=>[s.label,s.note]));assert.equal(notes['速度与时间'],'v = v₀ + at');assert.equal(notes['位移与时间'],'x = v₀t + ½at²');assert.equal(notes['速度与位移'],'v² − v₀² = 2ax');assert.equal(notes['自由落体'],'v = gt');assert.equal(notes['牛顿第二定律'],'F = ma');
 assert(input.routes.every(r=>r.direction==='unoriented'));assert.equal(model.query,null);
});
test('protein methods retain separate sample preparation and shared validation without invented measured timings',async()=>{
 const input=await fixture('protein-structure-routes'),model=pathwayMapModel(input);
 assert.equal(model.stationCount,17);assert.equal(model.interchangeCount,2);assert.equal(model.routeCount,4);
 assert.deepEqual(members(model,'表达与纯化'),['xray','cryoem']);assert.deepEqual(members(model,'结构模型'),['xray','cryoem','nmr','common']);
 assert(edge(input,'结晶','X 射线衍射'));assert(edge(input,'冷冻制样','电镜采集'));assert(edge(input,'同位素标记表达','多维谱采集'));assert(edge(input,'结构模型','模型验证'));assert(edge(input,'模型验证','提交 PDB'));
 assert.equal(input.meaning,'method-stages');assert(input.routes.every(r=>r.direction==='forward'));assert.equal(model.cycleTime,undefined);
});
test('sales handoff keeps all three shared handoffs and the source example periods as annotations only',async()=>{
 const input=await fixture('sales-handoff-map'),model=pathwayMapModel(input);
 assert.equal(model.stationCount,13);assert.equal(model.interchangeCount,3);assert.equal(model.segmentCount,12);
 assert.deepEqual(members(model,'合格线索'),['market','sales']);assert.deepEqual(members(model,'合同签订'),['sales','delivery']);assert.deepEqual(members(model,'验收'),['delivery','finance']);
 assert(input.routes.find(r=>r.id==='sales').note.includes('45 天'));assert(input.routes.find(r=>r.id==='delivery').note.includes('60 天'));assert(input.routes.find(r=>r.id==='finance').note.includes('30 天'));
 assert(edge(input,'开票','回款'));assert.equal(model.cycleTime,undefined);assert.equal(model.conversionRate,undefined);assert.equal(model.query,null);
});
