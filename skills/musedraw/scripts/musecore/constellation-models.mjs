// Error evidence is supplied independently of a node's traffic value. An upper
// bound is never converted to an exact rate or to the midpoint of its interval.
export function constellationErrorEvidence(node,warningAt,criticalAt){
 const constellationFail=message=>{throw Error('node.errorRateState: '+message)},constellationFinite=x=>typeof x==='number'&&Number.isFinite(x),constellationPercent=x=>Number((x*100).toPrecision(12)).toString()+'%';
 if(!constellationFinite(warningAt)||!constellationFinite(criticalAt)||warningAt<0||criticalAt<=warningAt||criticalAt>1)constellationFail('invalid warning thresholds');
 const hasRate=Object.hasOwn(node,'errorRate'),hasState=Object.hasOwn(node,'errorRateState');
 if(hasRate===hasState)constellationFail('provide exactly one of errorRate or errorRateState');
 if(hasRate){const rate=node.errorRate;if(!constellationFinite(rate)||rate<0||rate>1)constellationFail('exact errorRate must be finite and in 0–1');return {kind:'exact',exactRate:rate,classification:rate>=criticalAt?'critical':rate>=warningAt?'warning':'normal',display:constellationPercent(rate)}}
 const state=node.errorRateState;if(!state||typeof state!=='object'||Array.isArray(state))constellationFail('object required');
 if(state.kind==='unknown'){if(Object.keys(state).some(k=>k!=='kind'))constellationFail('unknown state only accepts kind');return {kind:'unknown',exactRate:null,classification:'uncertain',possibleClasses:warningAt===0?['warning','critical']:['normal','warning','critical'],display:'未给出'}}
 if(state.kind!=='below')constellationFail('kind must be below or unknown');
 if(Object.keys(state).some(k=>!['kind','upperExclusive'].includes(k)))constellationFail('unsupported below field');
 const p=state.upperExclusive;if(!constellationFinite(p)||p<=0||p>1)constellationFail('upperExclusive must be finite, positive and at most 1');
 const possibleClasses=[];if(warningAt>0)possibleClasses.push('normal');if(p>warningAt)possibleClasses.push('warning');if(p>criticalAt)possibleClasses.push('critical');
 return {kind:'below',upperExclusive:p,exactRate:null,classification:possibleClasses.length===1?possibleClasses[0]:'uncertain',possibleClasses,display:'< '+constellationPercent(p)};
}
