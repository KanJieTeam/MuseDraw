export function transitionTrace(states,transitions,{initial,duration,events}){
 const ids=new Set(states.map(s=>s.id)),map=new Map(transitions.map(t=>[t.id,t]));if(!ids.has(initial))throw Error('Unknown initial state');if(map.size!==transitions.length)throw Error('Duplicate transition ID');if(!Number.isFinite(duration)||duration<=0)throw Error('Positive trace duration required');
 for(const t of transitions)if(!ids.has(t.from)||!ids.has(t.to))throw Error('Unknown transition endpoint');let current=initial,previous=0;const segments=[],changes=[];
 for(const e of events){if(typeof e.at!=='number'||!Number.isFinite(e.at)||e.at<0||e.at>duration||e.at<=previous&&changes.length)throw Error('Trace events must strictly increase inside duration');const t=map.get(e.transition);if(!t)throw Error('Unknown trace transition');if(t.from!==current)throw Error('Trace transition does not leave the current state');if(e.at>previous)segments.push({state:current,start:previous,end:e.at});changes.push({...e,from:t.from,to:t.to});current=t.to;previous=e.at}
 if(previous<duration)segments.push({state:current,start:previous,end:duration});return {initial,final:current,duration,segments,changes};
}
