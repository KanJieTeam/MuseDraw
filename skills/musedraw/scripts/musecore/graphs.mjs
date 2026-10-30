export function directedAcyclic(nodes,edges){
 const map=new Map(nodes.map((n,index)=>[n.id,{...n,index,predecessors:[],successors:[],level:0}]));
 if(map.size!==nodes.length)throw Error('Duplicate graph ID');const seen=new Set();
 for(const e of edges){const a=map.get(e.from),b=map.get(e.to),key=e.from+'>'+e.to;if(!a||!b||a===b)throw Error('Unknown or self graph edge');if(seen.has(key))throw Error('Duplicate graph edge');seen.add(key);a.successors.push(b.id);b.predecessors.push(a.id)}
 const incoming=new Map([...map.values()].map(n=>[n.id,n.predecessors.length])),queue=[...map.values()].filter(n=>!n.predecessors.length),order=[];
 while(queue.length){queue.sort((a,b)=>a.index-b.index);const n=queue.shift();n.level=n.predecessors.length?Math.max(...n.predecessors.map(id=>map.get(id).level))+1:0;order.push(n);for(const id of n.successors){incoming.set(id,incoming.get(id)-1);if(!incoming.get(id))queue.push(map.get(id))}}
 if(order.length!==nodes.length)throw Error('Cyclic dependency graph');return {nodes:[...map.values()],order,map};
}
export function criticalSchedule(tasks,edges){
 const g=directedAcyclic(tasks,edges);for(const n of g.order){if(typeof n.duration!=='number'||!Number.isFinite(n.duration)||n.duration<0)throw Error('Duration must be finite and nonnegative');n.earliestStart=n.predecessors.length?Math.max(...n.predecessors.map(id=>g.map.get(id).earliestFinish)):0;n.earliestFinish=n.earliestStart+n.duration;if(!Number.isFinite(n.earliestFinish))throw Error('Schedule exceeds numeric range')}
 const finish=Math.max(...g.nodes.map(n=>n.earliestFinish));for(const n of [...g.order].reverse()){n.latestFinish=n.successors.length?Math.min(...n.successors.map(id=>g.map.get(id).latestStart)):finish;n.latestStart=n.latestFinish-n.duration;n.float=Math.max(0,n.latestStart-n.earliestStart);n.critical=n.float<1e-8*Math.max(1,finish)}return {...g,finish};
}
export function rootedTree(nodes){
 const edges=nodes.filter(n=>n.parent!==null).map(n=>({from:n.parent,to:n.id})),g=directedAcyclic(nodes,edges),roots=g.nodes.filter(n=>!n.predecessors.length);if(roots.length!==1)throw Error('Hierarchy requires one root');
 const root=roots[0];for(const n of g.nodes){if(n.id!==root.id&&n.predecessors.length!==1)throw Error('Hierarchy child needs one parent');if(!Number.isSafeInteger(n.ownCount)||n.ownCount<0)throw Error('ownCount must be a nonnegative safe integer')}
 for(const n of [...g.order].reverse()){n.leafSlots=n.successors.length?n.successors.reduce((s,id)=>s+g.map.get(id).leafSlots,0):1;n.subtreeCount=n.ownCount+n.successors.reduce((s,id)=>s+g.map.get(id).subtreeCount,0);if(!Number.isSafeInteger(n.subtreeCount))throw Error('Hierarchy total exceeds safe integer range')}
 return {...g,root};
}
