export function directedAcyclic(nodes,edges){
 const map=new Map(nodes.map((n,index)=>[n.id,{...n,index,predecessors:[],successors:[],level:0}]));
 if(map.size!==nodes.length)throw Error('Duplicate graph ID');const seen=new Set();
 for(const e of edges){const a=map.get(e.from),b=map.get(e.to),key=e.from+'>'+e.to;if(!a||!b||a===b)throw Error('Unknown or self graph edge');if(seen.has(key))throw Error('Duplicate graph edge');seen.add(key);a.successors.push(b.id);b.predecessors.push(a.id)}
 const incoming=new Map([...map.values()].map(n=>[n.id,n.predecessors.length])),queue=[...map.values()].filter(n=>!n.predecessors.length),order=[];
 while(queue.length){queue.sort((a,b)=>a.index-b.index);const n=queue.shift();n.level=n.predecessors.length?Math.max(...n.predecessors.map(id=>map.get(id).level))+1:0;order.push(n);for(const id of n.successors){incoming.set(id,incoming.get(id)-1);if(!incoming.get(id))queue.push(map.get(id))}}
 if(order.length!==nodes.length)throw Error('Cyclic dependency graph');return {nodes:[...map.values()],order,map};
}
export function criticalSchedule(tasks,edges){
 const g=directedAcyclic(tasks,edges);
 // Exact base-ten arithmetic on the canonical supplied Number representations.
 // This accepts 0.1 + 0.2 = 0.3 across tasks without classifying positive slack
 // as zero merely because another path has a large duration.
 const decimals=g.nodes.map(n=>{if(typeof n.duration!=='number'||!Number.isFinite(n.duration)||n.duration<0)throw Error('Duration must be finite and nonnegative');if(n.duration>Number.MAX_SAFE_INTEGER)throw Error('Duration exceeds safe numeric range');const [mantissa,exponent='0']=String(n.duration).split('e'),[whole,fraction='']=mantissa.split('.');return {coefficient:BigInt(whole+fraction),places:fraction.length-Number(exponent)}}),places=Math.max(0,...decimals.map(d=>d.places)),factor=10n**BigInt(places),safe=BigInt(Number.MAX_SAFE_INTEGER)*factor,exact=new Map(g.nodes.map((n,i)=>[n.id,{duration:decimals[i].coefficient*10n**BigInt(places-decimals[i].places)}])),max=values=>values.reduce((a,z)=>a>z?a:z,0n),min=values=>values.reduce((a,z)=>a<z?a:z),numeric=v=>{const value=Number(v.toString()+'e-'+places),[mantissa,exponent='0']=String(value).split('e'),[whole,fraction='']=mantissa.split('.'),p=fraction.length-Number(exponent),coefficient=BigInt(whole+fraction);if(p<=places?coefficient*10n**BigInt(places-p)!==v:coefficient!==v*10n**BigInt(p-places))throw Error('Schedule decimal result is not representable as a canonical Number');return value};
 for(const n of g.order){const x=exact.get(n.id);x.earliestStart=max(n.predecessors.map(id=>exact.get(id).earliestFinish));x.earliestFinish=x.earliestStart+x.duration;if(x.earliestFinish>safe)throw Error('Schedule exceeds safe numeric range');n.earliestStart=numeric(x.earliestStart);n.earliestFinish=numeric(x.earliestFinish)}
 const finishExact=max([...exact.values()].map(n=>n.earliestFinish));
 for(const n of [...g.order].reverse()){const x=exact.get(n.id);x.latestFinish=n.successors.length?min(n.successors.map(id=>exact.get(id).latestStart)):finishExact;x.latestStart=x.latestFinish-x.duration;x.float=x.latestStart-x.earliestStart;for(const k of ['latestFinish','latestStart','float'])n[k]=numeric(x[k]);n.critical=x.float===0n}
 return {...g,finish:numeric(finishExact),criticalEdges:edges.filter(e=>g.map.get(e.from).critical&&g.map.get(e.to).critical&&exact.get(e.from).earliestFinish===exact.get(e.to).earliestStart).map(e=>({...e}))};
}
export function rootedTree(nodes){
 const edges=nodes.filter(n=>n.parent!==null).map(n=>({from:n.parent,to:n.id})),g=directedAcyclic(nodes,edges),roots=g.nodes.filter(n=>!n.predecessors.length);if(roots.length!==1)throw Error('Hierarchy requires one root');
 const root=roots[0];for(const n of g.nodes){if(n.id!==root.id&&n.predecessors.length!==1)throw Error('Hierarchy child needs one parent');if(!Number.isSafeInteger(n.ownCount)||n.ownCount<0)throw Error('ownCount must be a nonnegative safe integer')}
 for(const n of [...g.order].reverse()){n.leafSlots=n.successors.length?n.successors.reduce((s,id)=>s+g.map.get(id).leafSlots,0):1;n.subtreeCount=n.ownCount+n.successors.reduce((s,id)=>s+g.map.get(id).subtreeCount,0);if(!Number.isSafeInteger(n.subtreeCount))throw Error('Hierarchy total exceeds safe integer range')}
 return {...g,root};
}
