import {pathwayMapModel} from './pathway-models.mjs';

// A deliberately smaller grammar than pathway-map: independent complete branches,
// optional shared origins, one common junction and one forward suffix.
export function cap2ConvergenceModel(input){
 if(input?.family!=='converging-pathways')throw Error('family must be converging-pathways');
 const model=pathwayMapModel({...input,family:'pathway-map'}),need=(ok,message)=>{if(!ok)throw Error(message)};
 need(input.meaning!=='knowledge-links','Convergence requires declared forward stages, not unoriented knowledge links');
 need(model.routes.every(r=>r.direction==='forward'),'Convergence requires forward routes');
 need(model.gaps.length===0,'Convergence requires every consecutive segment; missing segments must use pathway-map');
 need(model.routes.length>=3&&model.routes.length<=5,'Convergence requires 2–4 branches and one common suffix');
 const candidates=model.routes.filter(r=>model.routes.filter(q=>q.id!==r.id).every(q=>q.stations.at(-1)===r.stations[0]));
 need(candidates.length===1,'Declare one shared junction and one common suffix');
 const common=candidates[0],junctionId=common.stations[0],branches=model.routes.filter(r=>r!==common);
 need(common.stations.length<=5,'Common suffix supports at most five stations');
 const byId=new Map(model.stations.map(s=>[s.id,s]));
 for(const b of branches){
  need(b.stations.length>=3&&b.stations.length<=8,'Each branch needs an origin, 1–6 distinct intermediate stations, and the junction');
  for(const id of b.stations.slice(1,-1))need(byId.get(id).routeIds.length===1,'Shared intermediate stations require pathway-map');
  const origin=byId.get(b.stations[0]);
  need(!common.stations.includes(origin.id),'An origin cannot belong to the common suffix');
  need(branches.filter(q=>q.stations.includes(origin.id)).every(q=>q.stations[0]===origin.id),'Shared origins must start every containing branch');
 }
 for(const id of common.stations.slice(1))need(byId.get(id).routeIds.length===1,'Only the first common station may be shared');
 const origins=[...new Set(branches.map(b=>b.stations[0]))].map(id=>({id,branchIds:branches.filter(b=>b.stations[0]===id).map(b=>b.id)}));
 for(const o of origins){const rows=o.branchIds.map(id=>branches.findIndex(b=>b.id===id));need(Math.max(...rows)-Math.min(...rows)+1===rows.length,'Branches sharing an origin must be adjacent; reorder input routes or use pathway-map')}
 const geometryEdges=branches.flatMap(b=>b.segments.map(e=>({...e,routeId:b.id}))).concat(common.segments.map(e=>({...e,routeId:common.id})));
 return {...model,branches,common,junctionId,origins,geometryEdges,scope:'Complete independent forward branches with adjacent shared origins, one shared junction, and one common suffix. Position and station spacing encode neither duration nor equivalence. More general topologies and missing segments use pathway-map.'};
}
