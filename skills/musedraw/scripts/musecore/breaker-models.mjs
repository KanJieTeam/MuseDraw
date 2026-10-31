// Bounded, sequential, instantaneous custom teaching policy; not Resilience4j.
const breakerReplayNeed=(condition,message)=>{if(!condition)throw Error(message)};
const breakerReplayFields=(value,allowed,label)=>{breakerReplayNeed(value&&typeof value==='object'&&!Array.isArray(value),label+': object required');for(const key of Object.keys(value))breakerReplayNeed(allowed.includes(key),label+'.'+key+': unsupported field')};
function breakerReplayDecimal(value,places,max,label){breakerReplayNeed(typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=max,label+': finite nonnegative number outside range');const text=String(value),match=text.match(/^(\d+)(?:\.(\d+))?$/);breakerReplayNeed(match&&(match[2]?.length??0)<=places,label+': unsupported decimal precision');const denominator=10**places,numerator=Number(match[1])*denominator+Number((match[2]??'').padEnd(places,'0'));return {numerator,denominator}}
export function circuitBreakerReplayModel(input){
 breakerReplayFields(input,['family','title','subtitle','evidenceKind','view','policy','requests','assumptions','note'],'input');
 breakerReplayNeed(input.family==='circuit-breaker-replay','family must be circuit-breaker-replay');
 for(const [key,max]of [['title',100],['subtitle',180],['note',400]])breakerReplayNeed(typeof input[key]==='string'&&input[key].trim()&&[...input[key]].length<=max,key+': nonempty text exceeds budget');
 breakerReplayNeed(['source-transcribed-example','synthetic-teaching-example','caller-given-observations'].includes(input.evidenceKind),'explicit evidenceKind required');
 const view=input.view??'overview';breakerReplayNeed(['overview','detail'].includes(view),'view must be overview or detail');
 breakerReplayNeed(Array.isArray(input.assumptions)&&input.assumptions.length<=3,'assumptions: requires 0–3 explicit statements');for(const text of input.assumptions)breakerReplayNeed(typeof text==='string'&&text.trim()&&[...text].length<=150,'assumption exceeds text budget');
 const p=input.policy;
 breakerReplayFields(p,['windowSize','minimumCalls','failureThreshold','cooldownSeconds','cooldownBoundary','halfOpenProbeLimit','halfOpenPolicy'],'policy');
 for(const [key,min,max]of [['windowSize',1,100],['minimumCalls',1,p.windowSize],['halfOpenProbeLimit',1,20]])breakerReplayNeed(Number.isInteger(p[key])&&p[key]>=min&&p[key]<=max,'policy.'+key+': integer outside range');
 const threshold=breakerReplayDecimal(p.failureThreshold,6,1,'failureThreshold');breakerReplayNeed(threshold.numerator>0,'failureThreshold must be positive');const cooldown=breakerReplayDecimal(p.cooldownSeconds,3,3600,'cooldownSeconds').numerator;
 breakerReplayNeed(['strict-after','at-or-after'].includes(p.cooldownBoundary),'explicit cooldownBoundary required');breakerReplayNeed(p.halfOpenPolicy==='any-failure-opens','only custom any-failure-opens policy is supported');
 breakerReplayNeed(Array.isArray(input.requests)&&input.requests.length>=1&&input.requests.length<=180,'requests: requires 1–180 items');
 let state='closed',openedAt=null,window=[],probeSuccesses=0,previousMillis=-1;const records=[],events=[],counts={forwarded:0,successful:0,failed:0,rejected:0};
 const change=(to,request,reason)=>{events.push({order:events.length,requestSequence:request.sequence,atSeconds:request.atSeconds,from:state,to,reason});state=to};
 for(const [sequence,request]of input.requests.entries()){
  breakerReplayFields(request,['atSeconds','downstreamResult'],'request');const millis=breakerReplayDecimal(request.atSeconds,3,86400,'atSeconds').numerator;breakerReplayNeed(millis>=previousMillis,'request times must be nondecreasing; same-second order is input order');previousMillis=millis;
  breakerReplayNeed(['success','failure',null].includes(request.downstreamResult),'downstreamResult must be success, failure, or null');const before=state,eventStart=events.length,current={sequence,atSeconds:request.atSeconds};
  if(state==='open'){const elapsed=millis-openedAt,expired=p.cooldownBoundary==='strict-after'?elapsed>cooldown:elapsed>=cooldown;if(expired){change('half-open',current,'cooldown-expired-on-request');probeSuccesses=0}}
  const admissionState=state;let result;
  if(state==='open'){breakerReplayNeed(request.downstreamResult===null,'rejected request must have null unobserved downstreamResult');result='rejected';counts.rejected++}
  else{
   breakerReplayNeed(request.downstreamResult!==null,'admitted request requires an explicit downstream result');result=request.downstreamResult;counts.forwarded++;counts[result==='success'?'successful':'failed']++;
   if(state==='closed'){window.push({sequence,result});if(window.length>p.windowSize)window.shift();const failures=window.filter(r=>r.result==='failure').length;if(window.length>=p.minimumCalls&&failures*threshold.denominator>=threshold.numerator*window.length){change('open',current,'closed-window-threshold');openedAt=millis}}
   else if(result==='failure'){change('open',current,'probe-failed-custom-policy');openedAt=millis;probeSuccesses=0}
   else if(++probeSuccesses===p.halfOpenProbeLimit){change('closed',current,'all-probes-succeeded');window=[];probeSuccesses=0;openedAt=null}
  }
  const failures=window.filter(r=>r.result==='failure').length;
  records.push({sequence,atSeconds:request.atSeconds,before,admissionState,after:state,result,windowSamples:window.length,windowFailures:failures,windowSequences:window.map(r=>r.sequence),probeSuccesses,events:events.slice(eventStart)});
 }
 const admissionRuns=[];for(const r of records){const last=admissionRuns.at(-1);if(last?.state===r.admissionState)last.lastSequence=r.sequence;else admissionRuns.push({state:r.admissionState,firstSequence:r.sequence,lastSequence:r.sequence})}
 return {family:input.family,title:input.title,subtitle:input.subtitle,evidenceKind:input.evidenceKind,view,assumptions:[...input.assumptions],note:input.note,policy:{...p},finalState:state,counts,records,events,admissionRuns,axis:'request-sequence; equal spacing is not elapsed duration',scope:'Sequential instantaneous custom teaching policy. No concurrency, timeout/slow-call model, random generation, real downstream calls or Resilience4j equivalence.'};
}
