import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cap2TierBandModel} from '../../scripts/musecore/cap2-tierband-models.mjs';
const input=JSON.parse(fs.readFileSync(new URL('../../assets/musecore/cap2-leave-thresholds.json',import.meta.url),'utf8'));
const probe=(value,i)=>({id:'p'+i,label:'输入 '+value,value,note:'调用者的原文备注'});
test('source thresholds preserve half-open boundaries, unknown initial range and open last band',()=>{const values=[0,.99,1,9.99,10,19.99,20,30,100000],r=cap2TierBandModel({...input,probes:values.map(probe)});assert.deepEqual(r.probes.map(p=>p.amount),[null,null,5,5,10,10,15,15,15]);assert.deepEqual(r.unknown,[{min:0,max:1,amount:null,status:'unlisted'}]);assert.equal(r.bands.at(-1).continuesRight,true);assert.equal(r.probes.at(-1).outsideDisplay,true);assert.ok(r.probes.every(p=>p.note==='调用者的原文备注'))});
test('explicit zero differs from a missing interval',()=>{const b=structuredClone(input);b.bands[0].amount=0;b.bands[1].min=12;const r=cap2TierBandModel({...b,probes:[1,10,11.99,12].map(probe)});assert.deepEqual(r.probes.map(p=>p.amount),[0,null,null,10]);assert.deepEqual(r.probes.map(p=>p.status),['declared-band-match','unlisted','unlisted','declared-band-match'])});
test('display clipping does not change the rule or invent a finite upper endpoint',()=>{const r=cap2TierBandModel({...input,domain:[5,25]});assert.equal(r.bands[0].min,1);assert.equal(r.bands[0].visibleMin,5);assert.equal(r.bands[0].continuesLeft,true);assert.equal(r.bands[2].max,null);assert.equal(r.bands[2].visibleMax,25)});
test('caller labels, conditions, provenance text and notes remain complete without mutation',()=>{const before=JSON.stringify(input),r=cap2TierBandModel(input);assert.equal(JSON.stringify(input),before);assert.equal(r.note,input.note);assert.equal(r.sourceText,input.sourceText);assert.deepEqual(r.conditions,input.conditions);assert.deepEqual(r.bands.map(s=>[s.label,s.note]),input.bands.map(s=>[s.label,s.note]))});
test('ambiguous and unsupported rules explicitly reject',()=>{
 const changes=[b=>b.bands[1].min=9,b=>b.bands.reverse(),b=>b.bands[0].max=null,b=>b.bands[0].max=1,b=>b.bands[0].amount=null,b=>b.bands[0].min='1',b=>b.bands[0].min=.001,b=>b.bands[0].amount=Infinity,b=>b.bands[1].id=b.bands[0].id,b=>b.bands[0].color='red',b=>b.bands[0].x=20,b=>b.domain=[10,10],b=>b.domain=[50,60],b=>b.estimatedEligibility=true,b=>b.probes=[probe(-1,0)],b=>b.conditions=null];
 for(const change of changes){const b=structuredClone(input);change(b);assert.throws(()=>cap2TierBandModel(b))}
});
