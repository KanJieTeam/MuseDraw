import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {normalizeScene, composeScene, renderScene} from '../skills/musedraw/scripts/render_style.mjs';
import {protectedPage, previewDocument} from '../skills/musedraw/scripts/preview.mjs';

const root=path.resolve(import.meta.dirname,'..'), flags=process.argv.slice(2);
const get=name=>flags.includes(name)?flags[flags.indexOf(name)+1]:undefined;
const procurement=JSON.parse(await fs.readFile(path.join(root,'skills/musedraw/assets/semantic-procurement.json'),'utf8'));
const token=(style,variant='banded',view='capability')=>JSON.parse(execFileSync(get('--python')??'python',[path.join(root,'skills/musedraw/scripts/style_tokens.py'),style,'--variant',variant,'--view',view],{encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}}));
const measure=(s,size)=>[...s].reduce((width,c)=>width+size*(c.charCodeAt(0)>127?1:.6),0);
let assertions=0;
const check=(name,fn)=>{fn();assertions++;};
check('no old content',()=>assert.ok(!JSON.stringify(normalizeScene(procurement)).includes('主数据')));
check('duplicate IDs',()=>assert.throws(()=>normalizeScene({...procurement,top:{...procurement.top,id:'purchasing'}})));
check('generated ID collision',()=>assert.throws(()=>normalizeScene({...procurement,top:{...procurement.top,id:'diagram-title'}})));
check('marker ID collision',()=>assert.throws(()=>normalizeScene({...procurement,top:{...procurement.top,id:'arrow'}})));
check('metadata ID collision',()=>assert.throws(()=>normalizeScene({...procurement,top:{...procurement.top,id:'layout-metadata'}})));
check('dangling edge',()=>assert.throws(()=>normalizeScene({...procurement,edges:[{from:'missing',to:'entry'}]})));
check('empty semantic sections',()=>assert.throws(()=>normalizeScene({...procurement,sections:[]})));
check('invalid supports',()=>assert.throws(()=>normalizeScene({...procurement,supports:{}})));
check('XML escape',()=>assert.ok(composeScene(normalizeScene({...procurement,title:'研发 & 交付 <平台>'}),token('墨蓝'),measure).svg.includes('研发 &amp; 交付 &lt;平台&gt;')));
const scene=normalizeScene(procurement);
const layouts=['quiet','banded','compact'].map(v=>composeScene(scene,token('墨蓝',v),measure));
check('variant geometry differs',()=>assert.equal(new Set(layouts.map(d=>JSON.stringify(d.metadata.nodes.map(n=>n.box)))).size,3));
check('variant facts remain',()=>layouts.forEach(d=>assert.deepEqual(d.metadata.nodes.map(({id,label,parent})=>({id,label,parent})),layouts[0].metadata.nodes.map(({id,label,parent})=>({id,label,parent})))));
check('no guessed relations',()=>assert.ok(layouts.every(d=>d.metadata.paths.length===0)));
check('positive and bounded shapes',()=>layouts.forEach(d=>d.metadata.nodes.forEach(n=>assert.ok(n.box.every(Number.isFinite)&&n.box[2]>0&&n.box[3]>0&&n.box[0]+n.box[2]<d.width&&n.box[1]+n.box[3]<d.height))));

const linkScene={title:'设备巡检与照片归档',view:'component',sections:[
  {id:'clients',title:'使用端',groups:[{id:'clientgroup',title:'入口',items:[{id:'mobile',label:'巡检 App'},{id:'dispatch',label:'调度工作台'}]}]},
  {id:'service',title:'业务服务',groups:[{id:'apigroup',title:'应用服务',items:[{id:'api',label:'工单 API'},{id:'objects',label:'照片归档 / Object Storage'}]}]}
],edges:[{from:'mobile',to:'api'},{from:'dispatch',to:'api'},{from:'api',to:'objects'}]};
const longScene={title:'供应商准入与跨部门采购审核：从合同、验收到对账的业务全景',view:'capability',sections:[{title:'采购与供应商管理',groups:Array.from({length:9},(_,i)=>({id:`group${i}`,title:`采购环节 ${i+1}`,items:Array.from({length:1+i%7},(_,n)=>({id:`item${i}-${n}`,label:n%2?'供应商档案（营业执照、资质与到期时间）':'PurchaseOrder / financial reconciliation'}))}))}]};
const returnScene={title:'订单与财务对接',view:'component',sections:[{id:'system',title:'业务系统',groups:[{id:'services',title:'订单与财务',items:[{id:'order',label:'订单服务'},{id:'finance',label:'财务对接'}]}]}],edges:[{from:'order',to:'finance',label:'订单'},{from:'finance',to:'order',label:'处理状态'}]};
check('explicit routes only',()=>assert.equal(composeScene(normalizeScene(linkScene),token('石墨','quiet','component'),measure).metadata.paths.length,3));
check('labeled response routes reserve distinct ports and caption gutters',()=>{
  const drawing=composeScene(normalizeScene(returnScene),token('石墨','quiet','component'),measure);
  assert.equal(drawing.metadata.paths.length,2);
  assert.deepEqual(drawing.metadata.paths.map(({from,to,label})=>({from,to,label})),returnScene.edges);
  assert.notEqual(drawing.metadata.paths[0].points[0][1],drawing.metadata.paths[1].points.at(-1)[1]);
  assert.ok(!drawing.svg.includes('<rect id="edge-1-label-background"'));
});
console.log(JSON.stringify({offlineAssertions:assertions,passed:true}));

if(get('--playwright')){
  const destination=path.resolve(get('--output')??path.join(root,'output',`style-browser-${Date.now()}`));
  try{await fs.access(destination);throw Error('Use a new output directory');}catch(e){if(e.code!=='ENOENT')throw e;}
  const {chromium}=await import(pathToFileURL(path.resolve(get('--playwright'))).href);
  const browser=await chromium.launch({headless:true,...(get('--browser')?{executablePath:get('--browser')}:{})});
  const rows=[];
  try{
    for(const family of ['墨蓝','石墨','青灰','暖砂','松绿','柔彩','夜幕'])for(const variant of ['quiet','banded','compact']){
      const tokens=token(family,variant),name=`${tokens.id}-${variant}`;
      rows.push({name,...await renderScene(browser,procurement,tokens,path.join(destination,name))});
    }
    for(const [name,raw,style,variant]of [['long-content',longScene,'墨蓝','compact'],['relations',linkScene,'石墨','quiet'],['labeled-returns',returnScene,'石墨','quiet']]){
      rows.push({name,...await renderScene(browser,raw,token(style,variant,raw.view),path.join(destination,name))});
    }
    const page=await protectedPage(browser);
    await page.setContent(previewDocument(await fs.readFile(path.join(destination,'enterprise-blue-banded/diagram.svg'),'utf8')));
    const session=await page.context().newCDPSession(page);
    await session.send('DOM.enable');await session.send('CSS.enable');
    const {root:dom}=await session.send('DOM.getDocument');
    const {nodeId}=await session.send('DOM.querySelector',{nodeId:dom.nodeId,selector:'text'});
    const fonts=await session.send('CSS.getPlatformFontsForNode',{nodeId});
    await page.close();
    await fs.writeFile(path.join(destination,'report.json'),JSON.stringify({total:rows.length,failed:rows.filter(r=>r.checks.passed!==true).length,offlineAssertions:assertions,platformFonts:fonts,notAssessed:['aesthetic acceptance','real-model understanding'],cases:rows},null,2));
    console.log(JSON.stringify({browserCases:rows.length,passed:rows.every(r=>r.checks.passed===true),platformFonts:fonts}));
  }finally{await browser.close();}
}
