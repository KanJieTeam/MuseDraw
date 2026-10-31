import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {approvalWorkflowModel} from '../../scripts/musecore/approval-models.mjs';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';
const fixture=async()=>JSON.parse(await fs.readFile(new URL('../../assets/musecore/procure-to-pay.json',import.meta.url),'utf8'));
const sourceRoles={apply:'applicant',department:'department',finance:'finance',compare:'procurement',order:'procurement',supplier:'supplier',receipt:'applicant',match:'finance',payment:'department'};
const sourceEdges=[['apply','department','control'],['department','finance','control'],['finance','compare','control'],['compare','order','control'],['order','supplier','control'],['supplier','receipt','data'],['supplier','match','data'],['receipt','match','data'],['order','match','data'],['match','payment','control']];

test('189 source-derived input retains all nine operations, original five responsibilities and ten supplied relations',async()=>{
 const input=await fixture(),model=approvalWorkflowModel(input);
 assert.deepEqual(input.roles.map(r=>r.label),['申请人','部门负责人','财务部','采购部','供应商']);
 assert.equal(model.nodes.length,9);assert.deepEqual(Object.fromEntries(model.nodes.map(n=>[n.id,n.role])),sourceRoles);
 assert.deepEqual(input.nodes.map(n=>n.label.split('\n')[0]),['提交采购申请','部门负责人审批','财务总监审批','询价比价','下达采购订单','发货并开票','收货确认','三单匹配','安排付款']);
 assert.deepEqual(model.edges.map(e=>[e.from,e.to,e.kind]),sourceEdges);
 assert.deepEqual(model.edges.filter(e=>e.to==='match').map(e=>e.from).sort(),['order','receipt','supplier']);
 assert.equal(model.record,null);assert.equal(model.decisionCount,0);assert.deepEqual(model.feedbackIds,[]);
 assert.equal(model.nodes.find(n=>n.id==='payment').roleLabel,'部门负责人');
 for(const fact of ['所有金额均需部门负责人审批','< ¥5,000','¥5,000–50,000','≥ ¥50,000','再加总经理','40 × ¥920 = ¥36,800','发票 ¥37,300','2026-11-05','账期 30 天','12 月 05 日为星期六','12 月 07 日星期一'])assert(input.note.includes(fact),fact);
 assert(input.nodes.find(n=>n.id==='compare').label.includes('需 3 家报价'));assert(input.nodes.find(n=>n.id==='match').label.includes('差异 +1.36%'));
 for(const key of ['amount','selectedApprovers','requiredQuotes','matchingDifference','paymentDate','approved','paid'])assert.equal(model[key],undefined);
 assert(input.note.includes('不是本程序的计算结果'));assert(input.subtitle.includes('未作制度核验'));
});

test('repository source identity and label correspondence when original gallery is present',async t=>{
 let bytes;try{bytes=await fs.readFile(new URL('../../../../gallery/collections/visual-cases/189-procure-to-pay/source.svg',import.meta.url));}catch(e){if(e.code==='ENOENT'){t.skip('Original gallery is outside the standalone Skill; input facts and rendering are checked independently.');return;}throw e;}
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'2e95c8a57a5055f990d5f0e2824b2478508a3c6fb05e200d7cb9b4c83716cfc5');
 const input=await fixture();for(const node of input.nodes)assert(bytes.toString('utf8').includes(node.label.split('\n')[0]));
});

test('procurement input does not add an amount policy engine or invent an approval outcome',async()=>{
 const input=await fixture();for(const mutate of [x=>x.nodes[0].role='unknown',x=>x.policy={amount:36800},x=>x.record={currentNode:'apply',status:'processing',outcome:'approved'}]){const bad=structuredClone(input);mutate(bad);assert.throws(()=>approvalWorkflowModel(bad));}
});

test('production renderer retains every procurement label, responsibility and data join at ordinary and +40 ascent', {timeout:120000},async()=>{
 const input=await fixture(),{pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{const page=await browser.newPage();await page.route(/^https?:\/\//,r=>r.abort());await page.setContent(await editorHtml(input));await page.waitForFunction(()=>window.MUSECORE_READY===true);let baseline;
 for(const pressure of [0,40]){const result=await page.evaluate(({input,pressure})=>{const original=CanvasRenderingContext2D.prototype.measureText;if(pressure)CanvasRenderingContext2D.prototype.measureText=function(value){const m=original.call(this,value);return new Proxy(m,{get(target,key){return key==='fontBoundingBoxAscent'?target.fontBoundingBoxAscent+pressure:Reflect.get(target,key,target)}})};try{const svg=window.MuseCore.render(input);document.getElementById('output').replaceChildren(svg);return {audit:window.MuseCore.audit(svg),edges:[...svg.querySelectorAll('[data-edge-id]')].map(e=>({id:e.dataset.edgeId,kind:e.dataset.edgeKind,dash:e.getAttribute('stroke-dasharray')})),text:svg.textContent,texts:[...svg.querySelectorAll('text')].map(t=>({text:t.textContent,size:Number(t.getAttribute('font-size'))}))}}finally{CanvasRenderingContext2D.prototype.measureText=original}},{input,pressure});
 assert.deepEqual(result.audit.findings,[]);const g=result.audit.geometry;assert.equal(g.nodes.length,9);assert.equal(result.edges.length,10);assert.equal(g.record,null);assert.deepEqual(Object.fromEntries(g.nodes.map(n=>[n.id,n.role])),sourceRoles);assert.deepEqual(g.edges.map(e=>[e.from,e.to,e.kind]),sourceEdges);for(const node of input.nodes){const drawn=g.nodes.find(n=>n.id===node.id);assert.equal(drawn.label,node.label);assert.equal(drawn.roleLabel,input.roles.find(r=>r.id===node.role).label);for(const line of node.label.split('\n'))assert(result.text.replaceAll(/\s/g,'').includes(line.replaceAll(/\s/g,'')));}for(const edge of g.edges){const target=g.nodes.find(n=>n.id===edge.to);assert.deepEqual(edge.points.at(-1),edge.rail?target.ports.top:target.ports.left);if(edge.kind==='data')assert.equal(result.edges.find(e=>e.id===edge.id).dash,'5 6');}assert(result.text.includes('未提供实例状态或批准结果'));assert(result.text.includes('再加总经理'));assert(result.text.includes('不是本程序的计算结果'));assert(result.texts.some(t=>t.text.includes('三单匹配')&&t.size===25));if(pressure)assert(g.height>baseline);else baseline=g.height;
 }
 }finally{await browser.close();}
});
