import {createStage,THREE} from './stage.mjs';
const water=new URLSearchParams(location.search).get('case')==='water';
const $=id=>document.getElementById(id);
const config=water?{
 id:'water',theme:'light',brand:'清源再生水厂',title:'设施运行总览',eyebrow:'QINGYUAN / WATER REUSE',summary:'当日生产概况',snapshot:'2026.10.25 09:20',initial:'W02',
 metrics:[['累计回用水量','24,800','m³','演示计划 26,000 m³'],['在线设施','14 <span>/ 15</span>','处','包含运行与备用设备'],['待复核项目','1','项','关注澄清池当前记录','alert']],
 objects:{
 W01:{label:'曝气区',name:'生化曝气区',sub:'W01 · 四通道处理单元',status:'运行中',value:'1,800',unit:'m³/h',figure:'当前处理流量',progress:75,progressText:'运行鼓风机 6 / 8 台',facts:[['运行机组','6 / 8 台'],['备用机组','2 台'],['最近巡检','07:40'],['当前工单','无待办']],heading:'处理单元运行中',note:'最近一次巡检为 07:40，当前暂无待办。关注处理流量与设备运行状态。',foot:'快照 09:20 · 示意工况。'},
 W02:{label:'澄清池',name:'二号澄清池',sub:'W02 · 出水记录复核',status:'待复核',alert:true,value:'1.2',unit:'NTU',figure:'当前出水浊度',progress:null,progressText:'演示内部目标 ≤ 1.0 NTU',facts:[['记录时间','09:20'],['较演示目标','+0.2 NTU'],['复核人员','待指派'],['最近清理','昨日 16:00']],heading:'复核当前读数与采样记录',note:'当前读数较演示内部目标高 0.2 NTU。先复核采样记录与仪表状态，再判断处理状态。',foot:'快照 09:20 · 演示内部目标 1.0 NTU。'},
 W03:{label:'回用泵房',name:'回用泵房',sub:'W03 · 供水与设备保障',status:'运行中',value:'1,240',unit:'m³/h',figure:'当前回用流量',progress:75,progressText:'运行泵组 3 / 4 台',facts:[['运行泵组','3 / 4 台'],['备用泵组','1 台'],['计划检查','11:00'],['记录时间','09:20']],heading:'准备计划巡检',note:'11:00 对备用泵组进行计划检查，维持运行与备用状态分别可查。',foot:'快照 09:20 · 泵组运行与备用状态分别记录。'}},
 chartTitle:'累计回用水量',chartSub:'00:00—09:20 / 千 m³；各点为累计量',values:[0,3.8,8.3,14.2,20.6,24.8],chartLabels:['00:00','02:00','04:00','06:00','08:00','09:20'],
 scheduleTitle:'当班安排',schedule:[['09:30　澄清池读数复核','待指派'],['11:00　备用泵组检查','巡检一组'],['12:00　当班运行记录汇总','值班室']],handoffTitle:'待复核项目',handoffValue:'1',handoffUnit:'项 / 澄清池记录',handoff:'先核对采样记录与仪表状态。确认记录仅改变复核状态，不自动消除当前读数偏差。',footer:'体积 m³ · 流量 m³/h · 浊度 NTU'
}:{
 id:'harbor',theme:'dark',brand:'海岚港',title:'夜航调度',eyebrow:'WEST TERMINAL / NIGHT SHIFT',summary:'本班作业概况',snapshot:'2026.10.25 22:40',initial:'B02',
 metrics:[['本班已完成','1,884','箱','17:00—22:40 · 计划 2,220 箱'],['投入岸桥','9 <span>/ 12</span>','台','3 台备用'],['待确认引航','1','艘','最迟截止 22:55','alert']],
 objects:{B01:{label:'01 泊位',name:'远汐 07',sub:'B01 · YX-007 · 集装箱船',status:'作业正常',value:'80',unit:'%',figure:'装船进度',progress:80,progressText:'已装 768 / 960 箱 · 余 192 箱',facts:[['投入岸桥','4 台'],['当前合计效率','240 箱/时'],['预计完工','23:28'],['计划离泊窗口','00:10—00:30']],heading:'装船与保障按计划推进',note:'引航及 2 艘拖轮均已确认。预计完工到离泊窗口预留 42 分钟。',foot:'预计完工按当前合计效率不变计算。'},B02:{label:'02 泊位',name:'海岚 18',sub:'B02 · HL-018 · 集装箱船',status:'待确认引航',alert:true,value:'95',unit:'%',figure:'装船进度',progress:95,progressText:'已装 684 / 720 箱 · 余 36 箱',facts:[['投入岸桥','2 台'],['当前合计效率','84 箱/时'],['预计完工','23:06'],['计划离泊窗口','23:20—23:40']],heading:'22:55 前确认引航',note:'引航尚未确认；2 艘拖轮已就绪。距计划离泊窗口开启 40 分钟。',foot:'快照 22:40 · 引航安排待确认。'},B03:{label:'03 泊位',name:'宁川 32',sub:'B03 · NC-032 · 集装箱船',status:'作业正常',value:'80',unit:'%',figure:'装船进度',progress:80,progressText:'已装 432 / 540 箱 · 余 108 箱',facts:[['投入岸桥','3 台'],['当前合计效率','162 箱/时'],['预计完工','23:20'],['计划离泊窗口','23:45—00:05']],heading:'离泊保障已确认',note:'引航与 1 艘拖轮均已确认。预计完工到离泊窗口预留 25 分钟。',foot:'时间窗跨日按次日顺延。'}},
 chartTitle:'本班装船节奏',chartSub:'每柱为该时段装船量；最后一柱为 40 分钟',values:[186,242,318,366,438,334],chartLabels:['17—18','18—19','19—20','20—21','21—22','22—22:40'],
 scheduleTitle:'接下来 · 离泊窗口',schedule:[['02　海岚 18','23:20—23:40'],['03　宁川 32','23:45—00:05'],['01　远汐 07','00:10—00:30']],handoffTitle:'夜班交接',handoffValue:'336',handoffUnit:'箱待完成 / 计划 2,220 箱',handoff:'三个泊位持续作业。先核实 02 泊位引航安排，再按计划窗口依次离泊。',footer:'时间 CST · 数量单位 自然箱 · 非 TEU'
};
document.body.classList.toggle('light',water);document.title=`${config.brand} · ${config.title}`;
for(const [id,text] of Object.entries({'brand-name':config.brand,'page-title':config.title,eyebrow:config.eyebrow,'summary-title':config.summary,snapshot:config.snapshot,'chart-title':config.chartTitle,'chart-sub':config.chartSub,'schedule-title':config.scheduleTitle,'handoff-title':config.handoffTitle,'handoff-copy':config.handoff,'footer-context':config.footer}))$(id).textContent=text;
$('metrics').innerHTML=config.metrics.map(([label,value,unit,caption,alert])=>`<dl class="metric ${alert||''}"><dt>${label}</dt><dd>${value}<small>${unit}</small></dd><p>${caption}</p></dl>`).join('');
$('handoff-reading').innerHTML=`${config.handoffValue}<small>${config.handoffUnit}</small>`;
$('schedule-list').innerHTML=config.schedule.map(([a,b])=>`<li><span>${a}</span><b>${b}</b></li>`).join('');
$('selector').innerHTML=Object.entries(config.objects).map(([id,o])=>`<button type="button" data-select="${id}" aria-pressed="false">${o.label}</button>`).join('');
const chart=$('mini-chart'),max=Math.max(...config.values)*1.15;
chart.setAttribute('aria-label',`${config.chartTitle}：${config.values.map((v,i)=>`${config.chartLabels[i]} ${v}`).join('，')}`);
chart.innerHTML=config.values.map((v,i)=>{const x=15+i*78,h=v/max*58;return `<text x="${x+23}" y="20" text-anchor="middle" font-size="12" fill="var(--ink)">${v}</text><rect x="${x}" y="${91-h}" width="46" height="${h}" fill="var(--chart)" opacity="${i===5?1:.7}"/><text x="${x+23}" y="113" text-anchor="middle" font-size="10" fill="var(--muted)">${config.chartLabels[i]}</text>`}).join('');
let selected=config.initial,stage,model;
function select(id,announce=true){const o=config.objects[id];if(!o)return;selected=id;
 $('object-name').textContent=o.name;$('object-sub').textContent=o.sub;$('status').textContent=o.status;$('status').classList.toggle('alert',!!o.alert);$('figure-label').textContent=o.figure;$('figure-value').innerHTML=`${o.value}<small>${o.unit}</small>`;$('progress-text').textContent=o.progressText;$('track').hidden=o.progress===null;$('fill').style.width=`${o.progress??0}%`;
 $('facts').innerHTML=o.facts.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');$('attention-title').textContent=o.heading;$('attention-copy').textContent=o.note;$('attention-note').classList.toggle('normal',!o.alert);$('detail-footnote').textContent=o.foot;
 document.querySelectorAll('[data-select]').forEach(e=>e.setAttribute('aria-pressed',String(e.dataset.select===id)));model?.select?.(id);stage?.render();projectAnchors();
 if(announce)$('announcement').textContent=`已选择${o.label}，${o.name}，${o.status}。相关读数和场景高亮已更新。`;
}
document.addEventListener('click',e=>{const button=e.target.closest('[data-select]');if(button)select(button.dataset.select);});select(selected,false);
function projectAnchors(){
 if(!stage||!model)return;
 const host=$('scene-host'),width=host.clientWidth,height=host.clientHeight,placed=[],segments=[];
 const ordered=[...model.anchors].sort((a,b)=>(a.id===selected?-1:b.id===selected?1:0));
 for(const a of ordered){
  const p=stage.project(a.point),button=document.querySelector(`.scene-pin[data-select="${a.id}"]`);if(!button)continue;
  const w=button.offsetWidth,h=button.offsetHeight;
  const offsets=[[0,-25],[0,-65],[-80,-25],[80,-25],[0,-105],[-80,-65],[80,-65],[-130,-25],[130,-25]];
  let chosen;
  for(const [dx,dy] of offsets){const x=Math.max(w/2+8,Math.min(width-w/2-8,p.x+dx)),y=Math.max(h+8,Math.min(height-12,p.y+dy)),rect={x:x-w/2,y:y-h,w,h};
   if(!placed.some(q=>rect.x<q.x+q.w+7&&rect.x+rect.w+7>q.x&&rect.y<q.y+q.h+7&&rect.y+rect.h+7>q.y)){chosen={x,y,rect};break;}}
  if(!chosen)chosen={x:p.x,y:p.y-25,rect:{x:p.x-w/2,y:p.y-25-h,w,h}};
  placed.push(chosen.rect);button.style.left=chosen.x+'px';button.style.top=chosen.y+'px';
  const color=config.objects[a.id].alert?'var(--alert)':'var(--accent)';
  segments.push(`<path d="M${chosen.x},${chosen.y+1} L${chosen.x},${p.y-8} L${p.x},${p.y}" fill="none" stroke="${color}" stroke-width="1" opacity=".7"/><circle cx="${p.x}" cy="${p.y}" r="2.6" fill="${color}"/>`);
 }
 const svg=$('callout-leaders');if(svg){svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.innerHTML=segments.join('');}
}
try{
 stage=createStage($('scene-host'),{theme:config.theme,span:82});
 const factory=await import(water?'./water-scene.mjs':'./harbor-scene.mjs');model=factory.buildScene(stage);
 if(model.recommendedCamera){stage.camera.position.set(...model.recommendedCamera);stage.camera.lookAt(...(model.recommendedTarget||[0,0,0]));}
 if(model.recommendedSpan)stage.setSpan(model.recommendedSpan);
 $('scene-labels').innerHTML='<svg id="callout-leaders" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"></svg>'+model.anchors.map(a=>`<button type="button" class="scene-pin ${config.objects[a.id].alert?'attention':''}" data-select="${a.id}" aria-label="${a.label}，${config.objects[a.id].status}" aria-pressed="false">${a.label}</button>`).join('');
 const update=()=>{stage.render();projectAnchors();};new ResizeObserver(()=>requestAnimationFrame(update)).observe($('scene-host'));select(selected,false);stage.render();projectAnchors();
 const initialPosition=stage.camera.position.clone(),initialQuaternion=stage.camera.quaternion.clone(),target=new THREE.Vector3(...(model.recommendedTarget||[0,0,0]));$('reset-view').addEventListener('click',()=>{stage.camera.position.copy(initialPosition);stage.camera.quaternion.copy(initialQuaternion);$('reset-view').setAttribute('aria-pressed','true');$('top-view').setAttribute('aria-pressed','false');update();});$('top-view').addEventListener('click',()=>{stage.camera.position.copy(target).add(new THREE.Vector3(10,125,55));stage.camera.lookAt(target);$('reset-view').setAttribute('aria-pressed','false');$('top-view').setAttribute('aria-pressed','true');update();});
 window.spatialDemo={config,get selected(){return selected},stage,model,projectAnchors,ready:true};document.body.dataset.renderReady='true';
}catch(e){$('failure').classList.add('show');window.spatialError=String(e);console.error(e);document.body.dataset.renderReady='failed';}
