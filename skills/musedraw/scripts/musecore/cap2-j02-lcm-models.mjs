import {reactionBalanceModel} from './chemistry-models.mjs';
function cap2LCMNeed(ok,message){if(!ok)throw Error('reaction-lcm: '+message)}
export function cap2ReactionLCMModel(input){
 cap2LCMNeed(input&&typeof input==='object'&&!Array.isArray(input),'object required');
 const allowed=['family','title','subtitle','mode','reactants','products','condition','note','pivotElement'];for(const k of Object.keys(input))cap2LCMNeed(allowed.includes(k),'unsupported field '+k);
 cap2LCMNeed(input.family==='reaction-lcm','family must be reaction-lcm');const {pivotElement,...base}=input,r=reactionBalanceModel({...base,family:'reaction-balance'});
 cap2LCMNeed(r.species.length===3&&r.elements.length===2,'this teaching method requires exactly three neutral species and two elements');cap2LCMNeed(r.elements.includes(pivotElement),'pivotElement must be a supplied element');
 const terms=r.species.map((s,index)=>({index,id:s.id,formula:s.formula,side:s.side,count:s.atoms.find(a=>a.element===pivotElement)?.count??0})),left=terms.filter(t=>t.side==='reactants'&&t.count),right=terms.filter(t=>t.side==='products'&&t.count);cap2LCMNeed(left.length===1&&right.length===1,'pivot element must occur in exactly one species on each side');
 const a=left[0],b=right[0];let g=a.count,z=b.count;while(z){const next=g%z;g=z;z=next}const common=a.count/g*b.count,state=Array(3).fill(null);state[a.index]=common/a.count;state[b.index]=common/b.count;
 const remaining=terms.find(t=>state[t.index]===null),otherElement=r.elements.find(e=>e!==pivotElement),count=r.species[remaining.index].atoms.find(t=>t.element===otherElement)?.count??0;cap2LCMNeed(count>0,'remaining species must contain the other element');
 let knownSigned=0;for(let i=0;i<3;i++)if(state[i]!==null)knownSigned+=(r.species[i].side==='reactants'?1:-1)*state[i]*(r.species[i].atoms.find(t=>t.element===otherElement)?.count??0);const numerator=-knownSigned*(remaining.side==='reactants'?1:-1),coefficient=numerator/count;
 cap2LCMNeed(Number.isSafeInteger(coefficient)&&coefficient>0,'chosen pivot does not directly yield a positive integer for the remaining species; choose another pivot or use reaction-balance');const partial=[...state];state[remaining.index]=coefficient;
 cap2LCMNeed(state.every((c,i)=>c===r.coefficients[i]),'chosen LCM must directly produce the primitive ratio; use reaction-balance for another derivation');
 const equation=coeffs=>{const side=name=>r.species.filter(s=>s.side===name).map(s=>{const i=r.species.indexOf(s),c=coeffs[i];return (c===null?'□':c===1?'':c)+s.formula}).join(' + ');return side('reactants')+' → '+side('products')};
 const steps=[
  {id:'choose',label:'① 找两边的原子数',formula:`${a.formula} 中 ${pivotElement}：${a.count}；${b.formula} 中 ${pivotElement}：${b.count}`,explanation:`先选 ${pivotElement}；只数一个给定组成单位中的原子，下标不变。`,coefficients:[null,null,null]},
  {id:'lcm',label:'② 求最小公倍数',formula:`最小公倍数（${a.count}，${b.count}）= ${common}`,explanation:`最大公因数为 ${g}；${a.count} ÷ ${g} × ${b.count} = ${common}，两边的 ${pivotElement} 都先凑成 ${common} 个。`,coefficients:[null,null,null]},
  {id:'pivot',label:'③ 先配所选元素',formula:equation(partial),explanation:`${a.formula} 前填 ${common} ÷ ${a.count} = ${state[a.index]}；${b.formula} 前填 ${common} ÷ ${b.count} = ${state[b.index]}。□ 是尚未确定的系数。`,coefficients:partial},
  {id:'propagate',label:'④ 再配另一个元素',formula:equation(state),explanation:`核对 ${otherElement}：已知两边还相差 ${numerator} 个；用 ${remaining.formula} 补足，每个计数单位含 ${count} 个，所以系数 ${numerator} ÷ ${count} = ${coefficient}。`,coefficients:[...state]}
 ];
 return {...r,pivot:{element:pivotElement,left:a,right:b,gcd:g,lcm:common},propagation:{element:otherElement,speciesId:remaining.id,numerator,denominator:count,coefficient},steps,methodScope:'LCM-first derivation for exactly three supplied neutral species and two elements, where the selected element appears in one species per side and directly gives the primitive positive integer solution. All exact balance and atom-package validation reuse reactionBalanceModel; no prediction, formula parsing or new solver.'};
}
