const treeNeed=(ok,msg)=>{if(!ok)throw Error('decision-tree: '+msg)};
const treeFields=(o,keys,label)=>{treeNeed(o&&typeof o==='object'&&!Array.isArray(o),label+' object required');for(const k of Object.keys(o))treeNeed(keys.includes(k),label+'.'+k+' unsupported')};
const treeText=(v,label,max=120)=>{treeNeed(typeof v==='string'&&v.trim(),label+' requires nonempty text');treeNeed([...v].length<=max,label+' exceeds '+max+' characters')};
const treeId=(v,label)=>{treeText(v,label,40);treeNeed(/^[a-z][a-z0-9_-]*$/i.test(v),label+' id must be alphanumeric')};
export function decisionTreeModel(input){
 treeFields(input,['family','title','subtitle','question','nodes','edges','note'],'input');
 treeNeed(input.family==='decision-tree','family decision-tree required');
 for(const [k,max] of [['title',120],['subtitle',220],['question',160],['note',320]])treeText(input[k],k,max);
 treeNeed(Array.isArray(input.nodes)&&input.nodes.length>=3&&input.nodes.length<=18,'nodes requires 3..18 entries');
 const ids=new Set();
 const nodes=input.nodes.map((n,i)=>{treeFields(n,['id','label','kind','level'],'nodes['+i+']');treeId(n.id,'nodes['+i+'].id');treeNeed(!ids.has(n.id),'duplicate node id: '+n.id);ids.add(n.id);treeText(n.label,'nodes['+i+'].label',100);treeNeed(['decision','outcome'].includes(n.kind),'nodes['+i+'].kind must be decision or outcome');treeNeed(Number.isInteger(n.level)&&n.level>=0&&n.level<=5,'nodes['+i+'].level must be integer 0..5');return {...n}});
 const byId=new Map(nodes.map(n=>[n.id,n]));
 treeNeed(nodes.filter(n=>n.level===0).length===1,'exactly one root at level 0');
 const root=nodes.find(n=>n.level===0);treeNeed(root.kind==='decision','root must be a decision node');
 treeNeed(Array.isArray(input.edges)&&input.edges.length>=2&&input.edges.length<=24,'edges requires 2..24 links');
 const incoming=new Map(nodes.map(n=>[n.id,[]])),outgoing=new Map(nodes.map(n=>[n.id,[]])),edgeKeys=new Set();
 const edges=input.edges.map((e,i)=>{treeFields(e,['from','to','label'],'edges['+i+']');treeId(e.from,'edges['+i+'].from');treeId(e.to,'edges['+i+'].to');treeText(e.label,'edges['+i+'].label',48);treeNeed(byId.has(e.from)&&byId.has(e.to),'edge references unknown node');treeNeed(e.from!==e.to,'edge cannot self-reference');const key=e.from+'>'+e.to;treeNeed(!edgeKeys.has(key),'duplicate edge: '+key);edgeKeys.add(key);const a=byId.get(e.from),b=byId.get(e.to);treeNeed(b.level===a.level+1,'edge must connect adjacent levels');treeNeed(b.kind==='outcome'||a.kind==='decision','outcome cannot branch');incoming.get(e.to).push(e);outgoing.get(e.from).push(e);return {...e}});
 treeNeed(outgoing.get(root.id).length>=2&&outgoing.get(root.id).length<=4,'root requires 2..4 branches');
 for(const n of nodes){if(n.id===root.id){treeNeed(incoming.get(n.id).length===0,'root cannot have a parent')}else{treeNeed(incoming.get(n.id).length===1,n.id+' must have exactly one parent');treeNeed(n.kind==='outcome'||outgoing.get(n.id).length>=2&&outgoing.get(n.id).length<=4,n.id+' decision requires 2..4 branches')}}
 const seen=new Set();const walk=(id)=>{treeNeed(!seen.has(id),'cycle or repeated path detected at '+id);seen.add(id);for(const e of outgoing.get(id))walk(e.to)};walk(root.id);treeNeed(seen.size===nodes.length,'every node must be reachable from root');
 const leaves=nodes.filter(n=>n.kind==='outcome'),decisions=nodes.filter(n=>n.kind==='decision');treeNeed(leaves.length>=2,'at least two outcomes required');treeNeed(decisions.length<=8,'at most eight decisions');
 const maxLevel=Math.max(...nodes.map(n=>n.level));treeNeed(maxLevel<=4,'tree has at most five levels');
 const levels=Array.from({length:maxLevel+1},(_,level)=>nodes.filter(n=>n.level===level).map(n=>n.id));
 return {...input,nodes,edges,rootId:root.id,levels,maxLevel,decisions,leaves,children:Object.fromEntries([...outgoing].map(([id,es])=>[id,es.map(e=>e.to)])),scope:'Bounded decision tree for one question: each node has one parent, branches are explicit labels, and every outcome is reachable. It does not infer probabilities, confidence, ownership, timing, or recommendations beyond supplied labels.'};
}
export const demoDecisionTree={family:'decision-tree',title:'样本是否进入下一轮',subtitle:'把一次判断拆成可追溯的分支，结果停在明确的出口',question:'按当前记录，是否具备继续验证的条件？',nodes:[{id:'root',label:'资料是否完整？',kind:'decision',level:0},{id:'complete',label:'质量门槛是否达标？',kind:'decision',level:1},{id:'missing',label:'补齐资料后再审',kind:'outcome',level:1},{id:'ready',label:'保留为候选',kind:'decision',level:2},{id:'weak',label:'退回补测',kind:'outcome',level:2},{id:'approve',label:'进入下一轮验证',kind:'outcome',level:3},{id:'hold',label:'暂缓，记录原因',kind:'outcome',level:3}],edges:[{from:'root',to:'complete',label:'是'},{from:'root',to:'missing',label:'否'},{from:'complete',to:'ready',label:'是'},{from:'complete',to:'weak',label:'否'},{from:'ready',to:'approve',label:'条件满足'},{from:'ready',to:'hold',label:'仍有缺口'}],note:'示例只表达给定规则的分支，不代表真实审批标准；每个出口都保留原始判断词。'};
