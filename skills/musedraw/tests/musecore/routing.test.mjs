import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {routeMuseCore} from '../../scripts/musecore/router.mjs';
import {MuseCore} from '../../scripts/musecore/runtime.mjs';

const skillRoot=new URL('../../',import.meta.url);
const base={readerQuestion:'读者需要看见同一问题的证据如何分层回答。',evidenceType:'quantitative',hasRawData:true,hasSourceAsset:false,hasCoordinates:false,hasSharedSubstrate:false,panelCount:4,plotPanelCount:2,objectCount:8,labelCount:18};

test('explicit reader task routes to a bounded family',()=>{
 const r=routeMuseCore({...base,readerTask:'multi-panel-evidence'});assert.deepEqual({decision:r.decision,family:r.family},{decision:'route',family:'multi-panel-evidence'});
 const s=routeMuseCore({...base,readerTask:'swimlane',evidenceType:'workflow'});assert.equal(s.family,'lanes');
 const a=routeMuseCore({...base,readerTask:'apparatus-measurement',evidenceType:'apparatus',hasCoordinates:true});assert.equal(a.family,'device-measurement');
 const c=routeMuseCore({...base,readerTask:'cohort-flow',flowKind:'nested-funnel'});assert.equal(c.family,'funnel');
 const m=routeMuseCore({...base,readerTask:'mechanism-chain',evidenceType:'mechanism'});assert.equal(m.family,'mechanism-chain');
 const o=routeMuseCore({...base,readerTask:'operations-board',evidenceType:'status'});assert.equal(o.family,'operations-board');
 const ms=routeMuseCore({...base,readerTask:'measurement-scales',evidenceType:'quantitative'});assert.equal(ms.family,'measurement-scales');
});

test('router refuses missing evidence facts instead of inventing them',()=>{
 const noData=routeMuseCore({...base,readerTask:'multi-panel-evidence',hasRawData:false});assert.equal(noData.decision,'refuse');assert.equal(noData.code,'raw-data-required');
 const noCoords=routeMuseCore({...base,readerTask:'apparatus-measurement',evidenceType:'apparatus'});assert.equal(noCoords.code,'coordinates-required');
 const noImage=routeMuseCore({...base,readerTask:'image-evidence',evidenceType:'image'});assert.equal(noImage.code,'source-image-required');
 const tooMany=routeMuseCore({...base,readerTask:'entity-chain',objectCount:26});assert.equal(tooMany.code,'too-many-objects');
});

test('unknown or malformed tasks do not silently fall back',()=>{
 assert.throws(()=>routeMuseCore({...base,readerTask:'unknown'}),/readerTask must be one of/);
 const r=routeMuseCore({...base,readerTask:'chart',evidenceType:'table',hasRawData:true});assert.equal(r.decision,'select-data-grammar');assert.equal(Object.hasOwn(r,'family'),false);
 const u=routeMuseCore({...base,readerTask:'condition-comparison',hasSharedSubstrate:false});assert.equal(u.code,'shared-substrate-required');
 const branch=routeMuseCore({...base,readerTask:'cohort-flow',flowKind:'branch-rejoin'});assert.equal(branch.code,'cohort-flow-capability-pending');
});

test('every routed candidate names an executable registered family and an existing scope reference',()=>{
 const cases=[
  ['multi-panel-evidence',{},'multi-panel-evidence'],
  ['condition-comparison',{hasSharedSubstrate:true},'condition-comparison'],
  ['apparatus-measurement',{evidenceType:'apparatus',hasCoordinates:true},'device-measurement'],
  ['cohort-flow',{flowKind:'nested-funnel'},'funnel'],
  ['spatial-field',{evidenceType:'spatial',hasCoordinates:true,fieldKind:'regular-height-grid',objectCount:100},'contour-field'],
  ['swimlane',{evidenceType:'workflow'},'lanes'],
  ['timeline',{evidenceType:'workflow'},'schedule'],
  ['entity-chain',{evidenceType:'workflow'},'association'],
  ['mechanism-chain',{evidenceType:'mechanism'},'mechanism-chain'],
  ['operations-board',{evidenceType:'status'},'operations-board']
  ,['measurement-scales',{evidenceType:'quantitative'},'measurement-scales']
 ];
 for(const [readerTask,extra,family] of cases){
  const result=routeMuseCore({...base,readerTask,...extra});
  assert.equal(result.decision,'route',readerTask);assert.equal(result.family,family);
  assert.ok(MuseCore.families.includes(result.family),`${readerTask}: nonexistent renderer ${result.family}`);
  assert.ok(fs.existsSync(new URL(result.reference,skillRoot)),`${readerTask}: missing reference`);
 }
 const funnel=routeMuseCore({...base,readerTask:'cohort-flow',flowKind:'nested-funnel'});
 assert.match(fs.readFileSync(new URL(funnel.reference,skillRoot),'utf8'),/`funnel`/);
});

test('multi-panel candidates require actual plot declarations, data and supported panel media',()=>{
 for(const evidenceType of ['quantitative','status','mechanism','table']){
  const noData=routeMuseCore({...base,readerTask:'multi-panel-evidence',evidenceType,hasRawData:false});
  assert.equal(noData.decision,'refuse');assert.equal(noData.code,'raw-data-required');
 }
 const missing={...base,readerTask:'multi-panel-evidence'};delete missing.plotPanelCount;
 assert.equal(routeMuseCore(missing).code,'plot-panel-count-required');
 for(const plotPanelCount of [0,5])assert.equal(routeMuseCore({...base,readerTask:'multi-panel-evidence',plotPanelCount}).code,'plot-panel-count-out-of-range');
 for(const panelCount of [2,5])assert.equal(routeMuseCore({...base,readerTask:'multi-panel-evidence',panelCount}).code,'panel-count-out-of-range');
 assert.equal(routeMuseCore({...base,readerTask:'multi-panel-evidence',evidenceType:'image',hasSourceAsset:true}).code,'image-panel-unsupported');
});

test('spatial route requires an explicit regular height grid instead of treating every spatial quantity as terrain',()=>{
 const spatial={...base,readerTask:'spatial-field',evidenceType:'spatial'};
 assert.equal(routeMuseCore(spatial).code,'coordinates-required');
 assert.equal(routeMuseCore({...spatial,hasCoordinates:true,hasRawData:false}).code,'raw-data-required');
 for(const fieldKind of [undefined,'other-spatial-field'])assert.equal(routeMuseCore({...spatial,hasCoordinates:true,fieldKind}).code,'spatial-field-scope-required');
});

test('generic charts request grammar selection and never report a fabricated executable family',()=>{
 const result=routeMuseCore({...base,readerTask:'chart',objectCount:1000,requestedFormat:'svg'});
 assert.equal(result.decision,'select-data-grammar');assert.equal(Object.hasOwn(result,'family'),false);
 assert.ok(fs.existsSync(new URL(result.script,skillRoot)));
 assert.ok(fs.existsSync(new URL(result.reference,skillRoot)));
 assert.deepEqual(result.supportedKinds,['line','scatter','bar','interval','heatmap','paired','observations']);
 assert.equal(routeMuseCore({...base,readerTask:'chart',hasRawData:false}).code,'raw-data-required');
 assert.equal(routeMuseCore({...base,readerTask:'chart',requestedFormat:'html'}).code,'unsupported-output-format');
});

test('requested native presentations are not silently fulfilled by vector or bitmap output',()=>{
 for(const readerTask of ['multi-panel-evidence','mechanism-chain','condition-comparison','apparatus-measurement','cohort-flow','spatial-field','swimlane','timeline','entity-chain','operations-board','measurement-scales','image-evidence','chart']){
  const result=routeMuseCore({...base,readerTask,requestedFormat:'pptx'});
  assert.equal(result.decision,'refuse');assert.equal(result.code,'unsupported-output-format');
 }
 for(const requestedFormat of ['svg','png','html'])assert.equal(routeMuseCore({...base,readerTask:'swimlane',requestedFormat}).decision,'route');
});

test('malformed declarations and unqualified cohort requests remain explicit',()=>{
 assert.equal(routeMuseCore({...base,readerTask:'cohort-flow'}).code,'no-bounded-family');
 assert.equal(routeMuseCore({...base,readerTask:'image-evidence',evidenceType:'image',hasSourceAsset:true}).decision,'preserve-source');
 assert.throws(()=>routeMuseCore({...base,readerTask:'chart',requestedFormat:'pdf'}),/requestedFormat must be one of/);
 assert.throws(()=>routeMuseCore({...base,readerTask:'multi-panel-evidence',plotPanelCount:1.5}),/plotPanelCount/);
 assert.throws(()=>routeMuseCore({...base,readerTask:'spatial-field',fieldKind:'temperature-map'}),/fieldKind/);
 assert.equal(routeMuseCore({...base,readerTask:'mechanism-chain',evidenceType:'quantitative'}).code,'mechanism-evidence-required');
 assert.equal(routeMuseCore({...base,readerTask:'mechanism-chain',evidenceType:'mechanism',hasRawData:false}).code,'raw-data-required');
 assert.equal(routeMuseCore({...base,readerTask:'operations-board',evidenceType:'quantitative'}).code,'status-evidence-required');
 assert.equal(routeMuseCore({...base,readerTask:'operations-board',evidenceType:'status',hasRawData:false}).code,'raw-data-required');
 assert.equal(routeMuseCore({...base,readerTask:'measurement-scales',evidenceType:'table'}).code,'quantitative-evidence-required');
 assert.equal(routeMuseCore({...base,readerTask:'measurement-scales',evidenceType:'quantitative',hasRawData:false}).code,'raw-data-required');
});
