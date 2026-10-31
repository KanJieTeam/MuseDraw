// Bounded synchronous teaching policy. No Kubernetes implementation equivalence.
export function cpuSequenceReplayModel(input){
 const obj=(v,keys,name)=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!keys.includes(k)))throw Error(name+': unsupported/missing object fields')};
 const integer=(n,lo,hi,name)=>{if(!Number.isSafeInteger(n)||n<lo||n>hi)throw Error(name+': integer out of scope');return n};
 const milli=(n,lo,hi,name)=>{if(typeof n!=='number'||!Number.isFinite(n)||n<lo||n>hi||!/^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/.test(String(n)))throw Error(name+': finite decimal with at most3 places required');const [a,b='']=String(n).split('.');return Number(a)*1000+Number(b.padEnd(3,'0'))};
 obj(input,['family','title','subtitle','dataStatus','assumptions','initialReplicas','requestCores','targetUtilization','tolerance','minReplicas','maxReplicas','evaluationSeconds','downscaleWindowSeconds','scaleUp','scaleDown','samples','note'],'input');
 if(input.family!=='cpu-sequence-replay'||!['synthetic-teaching','supplied-teaching'].includes(input.dataStatus))throw Error('Explicit teaching data status required');
 obj(input.assumptions,['allReplicasReady','metricsComplete','uniformDistribution'],'assumptions');if(input.assumptions.allReplicasReady!==true||input.assumptions.metricsComplete!==true||input.assumptions.uniformDistribution!==true)throw Error('This teaching model requires immediate readiness, complete metrics and uniform distribution assumptions');
 for(const k of ['title','subtitle','note'])if(typeof input[k]!=='string'||!input[k].trim()||input[k].length>240)throw Error(k+': bounded text required');
 const min=integer(input.minReplicas,1,100,'minReplicas'),max=integer(input.maxReplicas,min,100,'maxReplicas');
 const initial=integer(input.initialReplicas,min,max,'initialReplicas');
 const req=milli(input.requestCores,.001,16,'requestCores'),target=milli(input.targetUtilization,.01,1,'targetUtilization'),tolerance=milli(input.tolerance,0,.5,'tolerance');
 const dt=integer(input.evaluationSeconds,1,300,'evaluationSeconds'),window=integer(input.downscaleWindowSeconds,0,3600,'downscaleWindowSeconds');
 obj(input.scaleUp,['maxPercentIncrease','maxPodsIncrease'],'scaleUp');obj(input.scaleDown,['maxPercentDecrease'],'scaleDown');
 const percent=integer(input.scaleUp.maxPercentIncrease,0,200,'scaleUp.maxPercentIncrease'),pods=integer(input.scaleUp.maxPodsIncrease,0,100,'scaleUp.maxPodsIncrease'),down=integer(input.scaleDown.maxPercentDecrease,0,100,'scaleDown.maxPercentDecrease');
 if(!Array.isArray(input.samples)||input.samples.length<2||input.samples.length>96)throw Error('samples: requires2..96 evaluations');
 const samples=input.samples.map((s,i)=>{obj(s,['atSeconds','cpuCores'],'sample');if(s.atSeconds!==i*dt)throw Error('sample times must be0,dt,2dt,...; no gaps or same-time evaluations');return {...s,cpuMilli:milli(s.cpuCores,0,1000,'sample.cpuCores')}});
 let current=initial,history=[],upEvents=0,downEvents=0;
 const rows=samples.map((s,index)=>{
  const before=current,num=s.cpuMilli*1000,den=before*req*target,raw=Math.ceil(before*num/den),within=Math.abs(num-den)*1000<=tolerance*den,bounded=Math.max(min,Math.min(max,raw)),recommendation=within?before:bounded;
  history=history.filter(h=>h.atSeconds>=s.atSeconds-window);history.push({index,atSeconds:s.atSeconds,recommendation});
  const historyMax=Math.max(...history.map(h=>h.recommendation));
  const stabilized=recommendation<before?Math.min(before,historyMax):recommendation;
  const upAllowance=Math.max(Math.floor(before*percent/100),pods),downAllowance=Math.floor(before*down/100);
  current=stabilized>before?Math.min(stabilized,before+upAllowance):stabilized<before?Math.max(stabilized,before-downAllowance):before;
  const direction=current>before?'up':current<before?'down':'hold';if(direction==='up')upEvents++;if(direction==='down')downEvents++;
  return {index,atSeconds:s.atSeconds,cpuCores:s.cpuCores,before,raw,withinTolerance:within,bounded,recommendation,historyMax,historyIndices:history.map(h=>h.index),stabilized,upAllowance,downAllowance,applied:current,direction};
 });
 return {input,rows,upEvents,downEvents,peakReplicas:Math.max(...rows.map(r=>r.applied)),firstPeakSeconds:rows.find(r=>r.applied===Math.max(...rows.map(r=>r.applied))).atSeconds,scope:'finite synchronous per-evaluation teaching policy; empty initial history; no Kubernetes implementation equivalence'};
}
