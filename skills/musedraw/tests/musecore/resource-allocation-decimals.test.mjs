import test from 'node:test';
import assert from 'node:assert/strict';
import {resourceAllocationModel,demoResourceAllocation} from '../../scripts/musecore/resource-allocation-models.mjs';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

function ledger(capacity,amounts){
 const input=structuredClone(demoResourceAllocation);
 input.resources=input.resources.slice(0,2).map(resource=>({...resource,capacity}));
 input.workstreams=amounts.map((amount,i)=>({id:`work${i}`,label:`工作流 ${i+1}`,source:`合成登记 ${i+1}`,
  allocations:input.resources.map(resource=>({resourceId:resource.id,amount,source:`登记 ${i+1}/${resource.id}`}))}));
 return input;
}

test('registered decimal allocations balance without binary residue',()=>{
 const input=ledger(.3,[.1,.2]),before=structuredClone(input),model=resourceAllocationModel(input);
 assert.deepEqual(model.summaries.map(row=>({load:row.load,spare:row.spare,state:row.state})),
  Array(2).fill({load:.3,spare:0,state:'balanced'}));
 assert.deepEqual(model.workstreams.map(row=>row.total),[.2,.4]);
 assert.equal(model.totalCapacity,.6);
 assert.deepEqual(input,before,'arithmetic must not mutate source allocations');
});

test('decimal remaining capacity is displayed without subtraction residue',()=>{
 const model=resourceAllocationModel(ledger(.6,[.1,.2]));
 assert.equal(model.summaries[0].load,.3);
 assert.equal(model.summaries[0].spare,.3);
 assert.equal(model.summaries[0].state,'spare');
});

test('a genuine small decimal excess is not suppressed by a tolerance',()=>{
 const model=resourceAllocationModel(ledger(.3,[.1,.20000000000000004]));
 assert.equal(model.summaries[0].spare,-4e-17);
 assert.equal(model.summaries[0].state,'over');
 const tiny=resourceAllocationModel(ledger(1,[1,1e-50]));
 assert.equal(tiny.summaries[0].spare,-1e-50);
 assert.equal(tiny.summaries[0].state,'over');
});

test('decimal arithmetic preserves scientific notation and subnormal inputs',()=>{
 for(const [capacity,amounts] of [[3e-7,[1e-7,2e-7]],[3e-300,[1e-300,2e-300]],[1e-323,[5e-324,5e-324]]]){
  const model=resourceAllocationModel(ledger(capacity,amounts));
  assert.equal(model.summaries[0].load,capacity);
  assert.equal(model.summaries[0].spare,0);
  assert.equal(model.summaries[0].state,'balanced');
 }
});

test('browser ledger shows the same balanced decimal state and exact visible totals',{timeout:120000},async()=>{
 const input=ledger(.3,[.1,.2]),{pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1600}});
  await page.route(/^https?:\/\//,route=>route.abort());
  await page.setContent(await editorHtml(input));
  await page.waitForFunction(()=>window.MUSECORE_READY===true);
  const result=await page.evaluate(()=>({checks:window.MUSECORE_RESULT,text:document.querySelector('#output svg')?.textContent}));
  assert.equal(result.checks.error,undefined);
  assert.deepEqual(result.checks.findings,[]);
  assert(result.checks.geometry.summaries.every(row=>row.state==='balanced'&&row.spare===0));
  assert(result.text.includes('平衡 0 工时'));
  assert(result.text.includes('资源总容量 0.6 工时'));
  assert(!result.text.includes('e-17'));
  const layout=result.checks.geometry.layout;
  assert.equal(100+layout.workstreamWidth+input.resources.length*layout.resourceWidth+44+layout.loadWidth,result.checks.geometry.width-100,
   'two-resource matrix fills the same content width as the heading and ledger');
  const png=await page.locator('#output svg').screenshot();
  assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 }finally{await browser.close()}
});
