import test from 'node:test';
import assert from 'node:assert/strict';
import {routeMuseCore} from '../../scripts/musecore/router.mjs';

const base={readerQuestion:'读者需要看见同一问题的证据如何分层回答。',evidenceType:'quantitative',hasRawData:true,hasSourceAsset:false,hasCoordinates:false,hasSharedSubstrate:false,panelCount:4,objectCount:8,labelCount:18};

test('explicit reader task routes to a bounded family',()=>{
 const r=routeMuseCore({...base,readerTask:'multi-panel-evidence'});assert.deepEqual({decision:r.decision,family:r.family},{decision:'route',family:'multi-panel-evidence'});
 const s=routeMuseCore({...base,readerTask:'swimlane',evidenceType:'workflow'});assert.equal(s.family,'lanes');
 const a=routeMuseCore({...base,readerTask:'apparatus-measurement',evidenceType:'apparatus',hasCoordinates:true});assert.equal(a.family,'device-measurement');
 const c=routeMuseCore({...base,readerTask:'cohort-flow',flowKind:'nested-funnel'});assert.equal(c.family,'funnel');
});

test('router refuses missing evidence facts instead of inventing them',()=>{
 const noData=routeMuseCore({...base,readerTask:'multi-panel-evidence',hasRawData:false});assert.equal(noData.decision,'refuse');assert.equal(noData.code,'raw-data-required');
 const noCoords=routeMuseCore({...base,readerTask:'apparatus-measurement',evidenceType:'apparatus'});assert.equal(noCoords.code,'coordinates-required');
 const noImage=routeMuseCore({...base,readerTask:'image-evidence',evidenceType:'image'});assert.equal(noImage.code,'source-image-required');
 const tooMany=routeMuseCore({...base,readerTask:'entity-chain',objectCount:26});assert.equal(tooMany.code,'too-many-objects');
});

test('unknown or malformed tasks do not silently fall back',()=>{
 assert.throws(()=>routeMuseCore({...base,readerTask:'unknown'}),/readerTask must be one of/);
 const r=routeMuseCore({...base,readerTask:'chart',evidenceType:'table',hasRawData:true});assert.equal(r.family,'data-backend');
 const u=routeMuseCore({...base,readerTask:'condition-comparison',hasSharedSubstrate:false});assert.equal(u.code,'shared-substrate-required');
 const branch=routeMuseCore({...base,readerTask:'cohort-flow',flowKind:'branch-rejoin'});assert.equal(branch.code,'cohort-flow-capability-pending');
});
