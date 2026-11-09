import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {representationModel,composeRepresentation} from '../../scripts/engine/representation-view.mjs';
import {scientificMotif} from '../../scripts/engine/scientific-motifs.mjs';
import {render} from '../../scripts/engine/render.mjs';
import {validateScene} from '../../scripts/engine/validate.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

// Independent original records: duplicate values deliberately have different identities.
const sample=()=>({method:'representation',title:'采样位置转置，记录身份保持不变',source:{id:'paired-readings',shape:[2,3],elements:[{id:'A01',value:7.2,label:'东侧第一采样点'},{id:'A02',value:7.2,label:'东侧第二采样点'},{id:'A03',value:8.1,label:'东侧第三采样点'},{id:'B01',value:6.8,label:'西侧第一采样点'},{id:'B02',value:7.6,label:'西侧第二采样点'},{id:'B03',value:8.4,label:'西侧第三采样点'}]},target:{shape:[3,2],order:['A01','B01','A02','B02','A03','B03']},focusIds:['A02'],note:'自制演示记录；元素在源表示中按行优先登记，目标顺序由输入明确给定。箭头仅表示表示变换。'});
const mutate=edit=>{const input=sample();edit(input);return input};
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value)}return value};

test('one canonical source supplies exact values and labels to every explicit target position',()=>{
 const input=sample(),before=structuredClone(input),m=representationModel(freeze(input));assert.deepEqual(input,before);
 assert.deepEqual(m.targetElements.map(e=>e.id),input.target.order);assert.equal(m.mapping.length,6);
 assert.deepEqual(m.mapping.find(e=>e.id==='A02'),{id:'A02',value:7.2,label:'东侧第二采样点',from:{row:0,column:1},to:{row:1,column:0}});
 assert.equal(m.mapping.filter(e=>e.value===7.2).length,2);assert.notEqual(m.mapping[0].id,m.mapping[2].id);assert.equal(m.scope.includes('without aggregation'),true);
 const changed=sample();changed.source.elements[1].label='第二点的新名称';changed.source.elements[1].value=0;const updated=representationModel(changed);assert.equal(updated.targetElements.find(e=>e.id==='A02').label,'第二点的新名称');assert.equal(updated.targetElements.find(e=>e.id==='A02').value,0);
});

test('reshape, reorder and matrix-to-sequence use supplied order rather than infer an operation',()=>{
 for(const [shape,order] of [[[3,2],['A01','A02','A03','B01','B02','B03']],[[2,3],['B03','B02','B01','A03','A02','A01']],[[1,6],['A01','B01','A02','B02','A03','B03']]]){
  const input=sample();input.target={shape,order};const m=representationModel(input),scene=composeRepresentation(input);assert.deepEqual(m.targetShape,shape);assert.deepEqual(m.targetElements.map(e=>e.id),order);assert.equal(scene.nodes.length,12);assert.deepEqual(validateScene(scene),[]);
  for(const e of m.elements){const texts=scene.texts.filter(t=>t.id.startsWith(`representation-target-${encodeURIComponent(e.id).replace(/-/gu,'%2D')}-label-`)).map(t=>t.text).join('');assert.equal(texts,e.label)}
 }
});

test('reject invented, duplicated, omitted or overridden elements and unsupported input',()=>{
 for(const [edit,match] of [[b=>b.target.order[1]='A01',/duplicate target/],[b=>b.target.order[0]='NEW',/unknown target/],[b=>b.target.order.pop(),/every source element/],[b=>b.target.shape=[2,2],/shape must contain/],[b=>b.source.shape=[1,3],/shape must contain/],[b=>b.source.elements[1].id='A01',/duplicate source/],[b=>b.target.values=[1,2],/unsupported field/],[b=>b.source.elements[0].value=NaN,/finite/],[b=>b.focusIds=['unknown'],/unknown focus/],[b=>b.focusIds=['A01','A02','A03'],/at most two/],[b=>b.source.elements[0].label='长'.repeat(49),/48 characters/],[b=>b.source.elements[0].id='bad\nID',/control characters/]])assert.throws(()=>composeRepresentation(mutate(edit)),match);
});

test('content shape is preserved when layout stacks and excessive shape or text explicitly refuses',()=>{
 const wide=composeRepresentation(sample()),small=sample();small.width=800;small.source.elements=small.source.elements.slice(0,4).map(e=>({...e,label:'采样点'}));small.source.shape=[1,4];small.target={shape:[2,2],order:small.source.elements.map(e=>e.id)};delete small.note;const narrow=composeRepresentation(small);assert.equal(wide.meta.arrayRepresentation.layout,'side-by-side');assert.equal(narrow.meta.arrayRepresentation.layout,'stacked');assert.deepEqual(narrow.meta.arrayRepresentation.targetShape,[2,2]);
 const excessive=sample();excessive.source.shape=[4,6];excessive.source.elements=Array.from({length:24},(_,i)=>({id:'r'+i,value:i,label:'记录 '+i}));excessive.target={shape:[1,24],order:excessive.source.elements.map(e=>e.id)};excessive.focusIds=[];assert.throws(()=>composeRepresentation(excessive),/shape exceeds available width/);
 assert.throws(()=>composeRepresentation({...sample(),width:799}),/800..3200/);
 assert.throws(()=>composeRepresentation({...sample(),width:800}),/preserve 14px/);
 assert.throws(()=>composeRepresentation(sample(),{measureText:()=>({width:1e6,ascent:20,descent:5})}),/one glyph cannot fit/);
});

test('legacy tensor input remains unchanged and the new scene uses ordinary native objects',()=>{
 const input={type:'scientific',kind:'tensor',id:'legacy',x:10,y:20,w:300,h:160,cells:[['#FFFFFF','#000000'],['#000000','#FFFFFF']]},before=structuredClone(input),a=scientificMotif(input,{}),b=scientificMotif(input,{});assert.deepEqual(input,before);assert.deepEqual(a,b);assert.equal(a.nodes.length,5);
 const source=sample(),scene=composeRepresentation({...source,theme:'blueprint'});assert.equal(scene.theme,'blueprint');assert.equal(scene.schemaVersion,1);assert.equal(scene.blocks,undefined);assert.equal(scene.meta.arrayRepresentation.mapping.length,6);assert.deepEqual(validateScene(scene),[]);
});

test('source identity strings cannot collide with generated node or label identifiers',()=>{
 const input=sample(),ids=['a','a-id-0','a-label-0','b','b-value-0','%2D'],lookup=new Map(input.source.elements.map((e,i)=>[e.id,ids[i]]));input.source.elements.forEach((e,i)=>e.id=ids[i]);input.target.order=input.target.order.map(id=>lookup.get(id));input.focusIds=['a-id-0'];const scene=composeRepresentation(input),generated=[...scene.nodes,...scene.texts,...scene.paths].map(o=>o.id);assert.equal(new Set(generated).size,generated.length);assert.deepEqual(validateScene(scene),[]);assert.deepEqual(scene.meta.arrayRepresentation.mapping.map(e=>e.id),input.target.order);
});

test('real SVG keeps native labels and one-to-one identity through new content, font pressure and viewports',{timeout:240000},async()=>{
 const normal=sample(),sequence=sample();sequence.title='设备通道的显式读取顺序';sequence.source.id='channel-order';sequence.source.shape=[3,2];sequence.source.elements=sequence.source.elements.map((e,i)=>({id:e.id,value:['开','停','开','旁路','停','开'][i],label:['上游流量通道','备用温度通道','主温度通道','下游压力通道','环境温度通道','返回压力通道'][i]}));sequence.target={shape:[1,6],order:['B03','A02','B01','A01','B02','A03']};sequence.focusIds=['B03','A02'];sequence.note='自制通道登记，仅展示调用者给定的顺序，不推断接线或因果关系。';
 const long=sample();long.title='长记录名称的转置与身份核查';long.width=1400;long.source.elements.forEach((e,i)=>{e.label=`第${i+1}项采样记录需要完整保留的中文位置名称与现场说明`;e.value='原始读数 '+(i+1)});
 const out=process.env.MUSECORE_REPRESENTATION_OUT,root=path.resolve('skills/musedraw'),font="Arial, 'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif";
 const textModule=(await fs.readFile(path.join(root,'scripts/engine/text.mjs'),'utf8')).replace(/^export /gm,'');
 const module=(await fs.readFile(path.join(root,'scripts/engine/representation-view.mjs'),'utf8')).replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');
 const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)});
 try{for(const [name,input] of [['transpose',normal],['sequence',sequence],['long-labels',long]])for(const pressure of [0,32]){
  const page=await browser.newPage({viewport:{width:2200,height:1800}});
  try{
   await page.route(/^https?:\/\//,r=>r.abort());await page.setContent(`<!doctype html><meta charset="utf-8"><style>body{margin:0}svg{display:block;max-width:100%;height:auto}</style><div id="out"></div><script>${textModule}\n${module}\nwindow.composeRepresentation=composeRepresentation;</script>`);
   const scene=await page.evaluate(({input,pressure,font})=>{const ctx=document.createElement('canvas').getContext('2d');return composeRepresentation(input,{fontFamily:font,measureText:(text,size,family,weight)=>{ctx.font=`${weight} ${size}px ${family}`;const m=ctx.measureText(text);return {width:m.width+pressure,ascent:(m.fontBoundingBoxAscent??size*1.2)+pressure/2,descent:m.fontBoundingBoxDescent??size*.4}}})},{input,pressure,font});
   const theme=JSON.parse(await fs.readFile(path.join(root,'themes',input.theme??'journal')+'.json','utf8'));theme.fonts={body:font,display:font,mono:font};const svg=render(scene,theme);await page.evaluate(svg=>document.querySelector('#out').innerHTML=svg,svg);
   const observed=await page.evaluate(()=>{const svg=document.querySelector('svg'),texts=[...svg.querySelectorAll('text')].map(n=>{const b=n.getBBox();return {text:n.textContent,x:b.x,y:b.y,w:b.width,h:b.height}});return {texts,invalid:svg.outerHTML.match(/(?:="|[ ,])(?:NaN|Infinity|undefined)(?:[ ,"]|$)/g),canvas:[+svg.getAttribute('width'),+svg.getAttribute('height')]}});
   assert.equal(observed.invalid,null);assert.deepEqual(observed.canvas,scene.size);
   for(const t of observed.texts){assert(t.x>=0&&t.y>=0&&t.x+t.w<=scene.size[0]+.1&&t.y+t.h<=scene.size[1]+.1,`${name} pressure ${pressure}: text inside canvas ${t.text}`)}
   for(let i=0;i<observed.texts.length;i++)for(let j=i+1;j<observed.texts.length;j++){const a=observed.texts[i],b=observed.texts[j];assert(!(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>.5&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>.5),`${name}: text overlap ${a.text}/${b.text}`)}
   for(const g of scene.meta.arrayRepresentation.geometry){const prefix=g.nodeId,textBoxes=await page.evaluate(prefix=>[...document.querySelectorAll('[data-md-free-text]')].filter(n=>n.getAttribute('data-md-free-text').startsWith(prefix+'-')).flatMap(n=>[...n.querySelectorAll('text')]).map(n=>{const b=n.getBBox();return {x:b.x,y:b.y,w:b.width,h:b.height}}),prefix);assert(textBoxes.length>=3);for(const t of textBoxes)assert(t.x>=g.x&&t.y>=g.y&&t.x+t.w<=g.x+g.w&&t.y+t.h<=g.y+g.h,`${name}: label stays with ${g.view}/${g.id}`)}
   for(const width of [1440,1024,390]){await page.setViewportSize({width,height:1800});assert.equal(await page.evaluate(()=>innerWidth),width);assert(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=1,`no overflow at ${width}`)}
   if(out){const dir=path.join(out,`${name}-${pressure?'pressure':'normal'}`);await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'input.json'),JSON.stringify(input,null,2));await fs.writeFile(path.join(dir,'scene.json'),JSON.stringify(scene,null,2));await fs.writeFile(path.join(dir,'diagram.svg'),svg);await fs.writeFile(path.join(dir,'checks.json'),JSON.stringify({textBounds:observed,identityMapping:scene.meta.arrayRepresentation.mapping,fontPressure:pressure,viewports:[390,1024,1440]},null,2));await page.setViewportSize({width:2200,height:1800});await page.locator('svg').screenshot({path:path.join(dir,'diagram.png')})}
  }finally{await page.close()}
 }}finally{await browser.close()}
});
