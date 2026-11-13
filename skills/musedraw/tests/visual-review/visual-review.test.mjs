import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {deflateSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {prepare,check,consensus,calibrate,verifyPacket,inspectPng,crc32} from '../../scripts/visual-review.mjs';

// Original tiny synthetic fixtures, never user screenshots. They test plumbing,
// not whether a model can judge visual quality.
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]), length = Buffer.alloc(4), crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(body)); return Buffer.concat([length,body,crc]);
}
function png(rgb = [255,0,0], width = 2, extra = [], height = 2) {
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height,4); header[8] = 8; header[9] = 2;
  const row = Buffer.from([0,...Array.from({length:width}, () => rgb).flat()]);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),...extra,chunk('IDAT',deflateSync(Buffer.concat(Array.from({length:height}, () => row)))),chunk('IEND',Buffer.alloc(0))]);
}
const write = (target,value) => fs.writeFile(target,JSON.stringify(value,null,2));
async function fixture(t, extraCases = false) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(),'musedraw-visual-review-'));
  t.after(() => fs.rm(root,{recursive:true,force:true}));
  await fs.writeFile(path.join(root,'original-condition.png'),png());
  await fs.writeFile(path.join(root,'revised-condition.png'),png([0,100,255]));
  const cases = [{id:'private-subject',brief:'Two equally sized synthetic color panels for a packaging test.',candidates:[
    {id:'original-condition',images:[{view:'full',path:'original-condition.png'}]},
    {id:'revised-condition',images:[{view:'full',path:'revised-condition.png'}]},
  ]}];
  if (extraCases) cases.push({...structuredClone(cases[0]),id:'private-subject-two'});
  const spec = {schemaVersion:1,cases}, input = path.join(root,'cases.json'); await write(input,spec);
  return {root,spec,input,packet:path.join(root,'packet'),private:path.join(root,'map.json')};
}
async function setup(t, extraCases = false) {
  const f = await fixture(t,extraCases); await prepare({...f,order:'forward'}); return f;
}
async function report(f, id = 'reviewer-1', choice = 'b', file = 'report.json') {
  const manifest = JSON.parse(await fs.readFile(path.join(f.packet,'manifest.json'),'utf8'));
  const value = {schemaVersion:1,packetDigest:manifest.packetDigest,reviewer:{id,independent:true,visualAccess:true},cases:manifest.cases.map(c => ({
    caseId:c.caseId,choice,observations:[{evidence:[...c.candidates.a,...c.candidates.b].map(i => i.file),location:'Entire two by two panel',observation:'The a panel is uniformly red; the b panel is uniformly blue.',effect:'The panels are distinguishable at this supplied size.'}],reason:'The synthetic choice exercises report accounting only.',preserve:'Preserve equal image sizes.',uncertainty:'No aesthetic claim is made by these synthetic fixtures.',
  }))};
  const target = path.join(f.root,file); await write(target,value); return {value,target};
}
async function bundle(f, reviews) {
  const target = path.join(f.root,'bundle.json'); await write(target,{schemaVersion:1,reviews}); return target;
}

test('prepare copies real PNG bytes anonymously and leaves identities in a separate map', async t => {
  const f = await setup(t), manifest = await verifyPacket(f.packet), map = JSON.parse(await fs.readFile(f.private,'utf8'));
  assert.equal(manifest.cases[0].caseId,'case-001'); assert.equal(map.cases[0].privateCaseId,'private-subject');
  assert.equal(map.cases[0].candidates.a.candidateId,'original-condition');
  assert.deepEqual(await fs.readFile(path.join(f.packet,'images/case-001/a-full.png')),await fs.readFile(path.join(f.root,'original-condition.png')));
  for (const name of ['manifest.json','REVIEW.md','response-template.json']) {
    const text = await fs.readFile(path.join(f.packet,name),'utf8');
    assert.doesNotMatch(text,/private-subject|original-condition|revised-condition/);
    assert.ok(!text.includes(f.root));
  }
  assert.match(await fs.readFile(path.join(f.packet,'REVIEW.md'),'utf8'),/fresh context/);
  assert.match(await fs.readFile(path.join(f.packet,'REVIEW.md'),'utf8'),/not production aesthetic certification/);
});

test('preparation refuses overwrite before changing either existing destination', async t => {
  const f = await setup(t), before = await fs.readFile(f.private);
  await assert.rejects(prepare({...f,order:'reverse'}),/overwrite/); assert.deepEqual(await fs.readFile(f.private),before);
  await assert.rejects(prepare({...f,packet:path.join(f.root,'another-packet')}),/overwrite/);
  await assert.rejects(fs.stat(path.join(f.root,'another-packet')),e => e.code === 'ENOENT');
});

test('a supplied frozen rubric is copied exactly and bound into the digest', async t => {
  const f = await fixture(t), rubric = path.join(f.root,'frozen-rubric.md'), bytes = Buffer.from('Fresh independent image inspection only.\r\nSynthetic rubric, no private human labels.\r\n');
  await fs.writeFile(rubric,bytes); const prepared = await prepare({...f,rubric,order:'forward'});
  assert.deepEqual(await fs.readFile(path.join(f.packet,'REVIEW.md')),bytes);
  await verifyPacket(f.packet);
  const other = {...f,packet:path.join(f.root,'other'),private:path.join(f.root,'other-map.json')};
  await fs.appendFile(rubric,'Changed before a different experiment.'); const changed = await prepare({...other,rubric,order:'forward'});
  assert.notEqual(prepared.packetDigest,changed.packetDigest);
  await fs.appendFile(path.join(f.packet,'REVIEW.md'),'Tampering'); await assert.rejects(verifyPacket(f.packet),/prompt changed/);
});

test('reject private mapping or unknown human-label fields in a reviewer packet', async t => {
  const f = await fixture(t);
  await assert.rejects(prepare({...f,private:path.join(f.packet,'hidden-map.json')}),/outside/);
  f.spec.labels = [{caseId:'private-subject',choice:'revised-condition'}]; await write(f.input,f.spec);
  await assert.rejects(prepare(f),/Unknown input field: labels/);
  delete f.spec.labels; await write(f.input,f.spec); await prepare(f);
  await write(path.join(f.packet,'human-labels.json'),{secret:'never reveal'});
  await assert.rejects(verifyPacket(f.packet),/unexpected or missing files/);
});

test('validate actual PNG structure, dimensions and metadata instead of trusting extensions', async t => {
  assert.deepEqual(inspectPng(png()),{width:2,height:2});
  assert.throws(() => inspectPng(Buffer.from('not a screenshot')),/actual PNG/);
  const damaged = png(); damaged[damaged.length-1] ^= 1; assert.throws(() => inspectPng(damaged),/CRC/);
  assert.throws(() => inspectPng(png([1,2,3],2,[chunk('tEXt',Buffer.from('Author\0private identity'))])),/metadata/);
  const f = await fixture(t); await fs.writeFile(path.join(f.root,'revised-condition.png'),png([0,0,255],3));
  await assert.rejects(prepare(f),/dimensions differ/);
});

test('natural full-page height is explicit, symmetric and preserves exact bytes', async t => {
  const f = await fixture(t), tall = png([0,100,255],2,[],5);
  await fs.writeFile(path.join(f.root,'revised-condition.png'),tall);
  await assert.rejects(prepare({...f,order:'forward'}),/dimensions differ/);
  f.spec.cases[0].candidates[0].images[0].heightMode = 'natural'; await write(f.input,f.spec);
  await assert.rejects(prepare({...f,order:'forward'}),/Asymmetric heightMode/);
  f.spec.cases[0].candidates[1].images[0].heightMode = 'unknown'; await write(f.input,f.spec);
  await assert.rejects(prepare({...f,order:'forward'}),/heightMode must be natural/);
  f.spec.cases[0].candidates[1].images[0].heightMode = 'natural'; await write(f.input,f.spec);
  await fs.writeFile(path.join(f.root,'revised-condition.png'),png([0,100,255],3,[],5));
  await assert.rejects(prepare({...f,order:'forward'}),/equal width/);
  await fs.writeFile(path.join(f.root,'revised-condition.png'),tall); await prepare({...f,order:'forward'});
  const manifest = await verifyPacket(f.packet), c = manifest.cases[0];
  assert.equal(c.candidates.a[0].heightMode,'natural'); assert.equal(c.candidates.a[0].height,2); assert.equal(c.candidates.b[0].height,5);
  assert.deepEqual(await fs.readFile(path.join(f.packet,'images/case-001/b-full.png')),tall);
  const r = await report(f); await check({...f,report:r.target});
});

test('check binds a complete evidence-based report to frozen packet images', async t => {
  const f = await setup(t), r = await report(f), result = await check({...f,report:r.target});
  assert.equal(result.valid,true); assert.equal(result.available,true); assert.equal(result.abstentions,0);
  await fs.writeFile(path.join(f.packet,'images/case-001/a-full.png'),png([10,20,30]));
  await assert.rejects(check({...f,report:r.target}),/tampered image/);
});

test('stale report digests, prompt changes and unfilled templates are rejected', async t => {
  const f = await setup(t), r = await report(f); r.value.packetDigest = '0'.repeat(64); await write(r.target,r.value);
  await assert.rejects(check({...f,report:r.target}),/stale/);
  await assert.rejects(check({...f,report:path.join(f.packet,'response-template.json')}),/outside/);
  const target = path.join(f.root,'unfilled.json'); await fs.copyFile(path.join(f.packet,'response-template.json'),target);
  await assert.rejects(check({...f,report:target}),/Reviewer identity/);
  await fs.appendFile(path.join(f.packet,'REVIEW.md'),'Altered rubric');
  await assert.rejects(verifyPacket(f.packet),/prompt changed/);
});

test('missing, duplicated, unknown cases, choices and evidence fail closed', async t => {
  const f = await setup(t,true), r = await report(f);
  const bad = async (mutate,pattern) => { const value = structuredClone(r.value); mutate(value); await write(r.target,value); await assert.rejects(check({...f,report:r.target}),pattern); };
  await bad(v => v.cases.pop(),/missing or extra/);
  await bad(v => v.cases[1] = v.cases[0],/Duplicate report case/);
  await bad(v => v.cases[0].caseId = 'unknown',/Unknown report case/);
  await bad(v => v.cases[0].choice = 'original-condition',/Unknown choice/);
  await bad(v => v.cases[0].observations[0].evidence.push('../private.png'),/Unknown evidence/);
  await bad(v => v.cases[0].observations[0].evidence.pop(),/cite all/);
  await bad(v => v.cases[0].observations = [],/at least 1/);
  await bad(v => v.cases[0].observations[0].observation = '',/visual observation/);
  await bad(v => v.cases[0].score = 9,/Unknown report case field/);
});

test('no independent vision is honestly unavailable; fabricated votes are rejected', async t => {
  const f = await setup(t), r = await report(f,'blind-reviewer','abstain');
  r.value.reviewer.visualAccess = false; r.value.cases[0].observations = []; r.value.cases[0].reason = 'Images cannot be inspected in this context.';
  await write(r.target,r.value); const checked = await check({...f,report:r.target});
  assert.equal(checked.available,false); assert.equal(checked.abstentions,1);
  r.value.cases[0].choice = 'a'; await write(r.target,r.value); await assert.rejects(check({...f,report:r.target}),/unavailable/);
});

test('reversed labels selecting the same actual image agree and calibrate to separate human labels', async t => {
  const f = await setup(t), reversed = {...f,packet:path.join(f.root,'reversed'),private:path.join(f.root,'reverse-map.json')};
  await prepare({...reversed,order:'reverse'});
  const r1 = await report(f,'independent-1','b','r1.json'), r2 = await report(reversed,'independent-2','a','r2.json');
  const bundleFile = await bundle(f,[{packet:f.packet,private:f.private,report:r1.target},{packet:reversed.packet,private:reversed.private,report:r2.target}]);
  const result = await consensus({bundle:bundleFile}); assert.equal(result.cases[0].consensus,'revised-condition');
  assert.equal(result.cases[0].counts['revised-condition'],2); assert.equal(result.disagreementCases.length,0);
  const labels = path.join(f.root,'human.json'); await write(labels,{schemaVersion:1,labels:[{caseId:'private-subject',choice:'revised-condition'}]});
  const calibrated = await calibrate({bundle:bundleFile,labels});
  assert.deepEqual(calibrated.byReviewer.map(r => [r.matched,r.comparable,r.agreementRate]),[[1,1,1],[1,1,1]]);
  assert.match(calibrated.advisory,/tiny calibration sample/); assert.match(calibrated.limits,/does not establish production/);
  await assert.rejects(calibrate({bundle:bundleFile,labels:path.join(f.packet,'human.json')}),/outside/);
  await assert.rejects(consensus({bundle:bundleFile,out:path.join(reversed.packet,'result.json')}),/outside/);
});

test('disagreement, ties and abstentions are distinct and coverage is explicit', async t => {
  const f = await setup(t), r1 = await report(f,'r1','a','r1.json'), r2 = await report(f,'r2','tie','r2.json'), r3 = await report(f,'r3','abstain','r3.json');
  const bundleFile = await bundle(f,[r1,r2,r3].map(r => ({packet:f.packet,private:f.private,report:r.target})));
  const result = await consensus({bundle:bundleFile}); assert.equal(result.cases[0].agreement,'disagreement');
  assert.equal(result.cases[0].consensus,null); assert.equal(result.cases[0].majority,null); assert.equal(result.cases[0].abstentions,1); assert.equal(result.cases[0].cast,2);
  const labels = path.join(f.root,'human.json'); await write(labels,{schemaVersion:1,labels:[{caseId:'private-subject',choice:'tie'}]});
  let calibrated = await calibrate({bundle:bundleFile,labels}); assert.deepEqual(calibrated.byReviewer.map(v => [v.matched,v.mismatched,v.reviewerAbstentions]),[[0,1,0],[1,0,0],[0,0,1]]);
  assert.equal(calibrated.byReviewer[2].agreementRate,null);
  await write(labels,{schemaVersion:1,labels:[{caseId:'private-subject',choice:'abstain'}]}); calibrated = await calibrate({bundle:bundleFile,labels});
  assert.ok(calibrated.byReviewer.every(v => v.humanAbstentions === 1 && v.comparable === 0 && v.agreementRate === null));
});

test('duplicate reviewer IDs, partial campaigns and changed candidate mappings are rejected', async t => {
  const f = await setup(t), r1 = await report(f,'same-reviewer','b','r1.json');
  let bundleFile = await bundle(f,[{packet:f.packet,private:f.private,report:r1.target},{packet:f.packet,private:f.private,report:r1.target}]);
  await assert.rejects(consensus({bundle:bundleFile}),/Duplicate reviewer ID/);
  const r2 = await report(f,'other-reviewer','a','r2.json'), reversed = {...f,packet:path.join(f.root,'reverse'),private:path.join(f.root,'reverse-map.json')}; await prepare({...reversed,order:'reverse'});
  const rr = await report(reversed,'third-reviewer','a','rr.json');
  const map = JSON.parse(await fs.readFile(reversed.private,'utf8')); [map.cases[0].candidates.a.candidateId,map.cases[0].candidates.b.candidateId] = [map.cases[0].candidates.b.candidateId,map.cases[0].candidates.a.candidateId]; await write(reversed.private,map);
  bundleFile = await bundle(f,[{packet:f.packet,private:f.private,report:r2.target},{packet:reversed.packet,private:reversed.private,report:rr.target}]);
  await assert.rejects(consensus({bundle:bundleFile}),/swapped private identity mismatch/);
});

test('a campaign cannot silently drop cases from one reviewer', async t => {
  const f = await setup(t), r1 = await report(f,'one-case','b','r1.json');
  const larger = {...f,packet:path.join(f.root,'larger'),private:path.join(f.root,'larger-map.json')};
  f.spec.cases.push({...structuredClone(f.spec.cases[0]),id:'private-subject-two'}); await write(f.input,f.spec); await prepare({...larger,order:'forward'});
  const r2 = await report(larger,'two-cases','b','r2.json'), bundleFile = await bundle(f,[{packet:f.packet,private:f.private,report:r1.target},{packet:larger.packet,private:larger.private,report:r2.target}]);
  await assert.rejects(consensus({bundle:bundleFile}),/missing or extra comparison case/);
});

test('all abstentions produce unavailable consensus, never a winner', async t => {
  const f = await setup(t), r = await report(f,'unavailable-reviewer','abstain');
  r.value.reviewer.independent = false; r.value.reviewer.visualAccess = false; r.value.cases[0].observations = []; await write(r.target,r.value);
  const bundleFile = await bundle(f,[{packet:f.packet,private:f.private,report:r.target}]), result = await consensus({bundle:bundleFile});
  assert.equal(result.cases[0].agreement,'unavailable'); assert.equal(result.cases[0].consensus,null); assert.equal(result.cases[0].majority,null);
  assert.equal(result.cases[0].cast,0); assert.equal(result.reviewers[0].available,false);
});

test('both human and reviewer abstentions are counted independently', async t => {
  const f = await setup(t), r = await report(f,'unavailable-reviewer','abstain');
  r.value.reviewer.visualAccess = false; r.value.cases[0].observations = []; await write(r.target,r.value);
  const frozenManifest = await fs.readFile(path.join(f.packet,'manifest.json'));
  const bundleFile = await bundle(f,[{packet:f.packet,private:f.private,report:r.target}]), labels = path.join(f.root,'human.json');
  await write(labels,{schemaVersion:1,labels:[{caseId:'private-subject',choice:'abstain'}]});
  const result = await calibrate({bundle:bundleFile,labels}), reviewer = result.byReviewer[0];
  assert.equal(reviewer.humanAbstentions,1); assert.equal(reviewer.reviewerAbstentions,1);
  assert.equal(reviewer.matched,0); assert.equal(reviewer.mismatched,0); assert.equal(reviewer.comparable,0); assert.equal(reviewer.agreementRate,null);
  assert.equal(result.cases[0].abstentions,1); assert.equal(result.cases[0].agreement,'unavailable');
  await verifyPacket(f.packet); assert.deepEqual(await fs.readFile(path.join(f.packet,'manifest.json')),frozenManifest);
});

test('matched multiple views are required and each presented image needs evidence', async t => {
  const f = await fixture(t); f.spec.cases[0].candidates[0].images.push({view:'detail',path:'original-condition.png'}); await write(f.input,f.spec);
  await assert.rejects(prepare(f),/View sets differ/);
  f.spec.cases[0].candidates[1].images.push({view:'detail',path:'revised-condition.png'}); await write(f.input,f.spec); await prepare(f);
  const r = await report(f); assert.equal(r.value.cases[0].observations[0].evidence.length,4); await check({...f,report:r.target});
  r.value.cases[0].observations[0].evidence.pop(); await write(r.target,r.value); await assert.rejects(check({...f,report:r.target}),/cite all/);
});

test('human labels require exact case coverage, valid choices and no duplicates', async t => {
  const f = await setup(t,true), r = await report(f), bundleFile = await bundle(f,[{packet:f.packet,private:f.private,report:r.target}]), labels = path.join(f.root,'human.json');
  const run = async (values,pattern) => { await write(labels,{schemaVersion:1,labels:values}); await assert.rejects(calibrate({bundle:bundleFile,labels}),pattern); };
  await run([{caseId:'private-subject',choice:'revised-condition'}],/missing or extra/);
  await run([{caseId:'private-subject',choice:'tie'},{caseId:'private-subject',choice:'tie'}],/Duplicate human label/);
  await run([{caseId:'private-subject',choice:'unknown'},{caseId:'private-subject-two',choice:'tie'}],/Unknown human choice/);
  await run([{caseId:'private-subject',choice:'tie'},{caseId:'unknown',choice:'tie'}],/Unknown human label/);
});

test('CLI is portable, dependency-free and preserves existing output files', async t => {
  const f = await setup(t), r = await report(f), script = fileURLToPath(new URL('../../scripts/visual-review.mjs',import.meta.url)), out = path.join(f.root,'checked.json');
  let result = spawnSync(process.execPath,[script,'check','--packet',f.packet,'--report',r.target,'--out',out],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr); assert.equal(JSON.parse(await fs.readFile(out,'utf8')).valid,true);
  const before = await fs.readFile(out); result = spawnSync(process.execPath,[script,'check','--packet',f.packet,'--report',r.target,'--out',out],{encoding:'utf8'});
  assert.notEqual(result.status,0); assert.match(result.stderr,/overwrite/); assert.deepEqual(await fs.readFile(out),before);
  result = spawnSync(process.execPath,[script,'prepare','--input',f.input,'--input',f.input],{encoding:'utf8'}); assert.notEqual(result.status,0); assert.match(result.stderr,/repeated/);
});
