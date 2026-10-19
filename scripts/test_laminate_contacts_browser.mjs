// Existing laminate contact contracts: actual browser/native export, no PNG,
// installs, handwritten XML or editor drag claim. Fixtures are original.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {render} from '../skills/musedraw/scripts/engine/render.mjs';
import {prepareScene} from '../skills/musedraw/scripts/engine/validate.mjs';
import {loadTheme} from '../skills/musedraw/scripts/musedraw.mjs';
import {resolveBrowser,withSystemFonts} from '../skills/musedraw/scripts/engine/environment.mjs';
import {loadPlaywrightInfo} from '../skills/musedraw/scripts/engine/export.mjs';
import {collectEditableScene,toDrawio} from '../skills/musedraw/scripts/engine/drawio.mjs';

const options={out:'output/laminate-contacts-browser'};
for(let i=2;i<process.argv.length;i++){
  const flag=process.argv[i];
  if(flag==='--help'){console.log('node scripts/test_laminate_contacts_browser.mjs [--out directory] [--playwright module] [--browser executable]');process.exit(0);}
  if(!['--out','--playwright','--browser'].includes(flag)||!process.argv[i+1])throw Error(`Invalid option ${flag}`);
  options[flag.slice(2)]=process.argv[++i];
}
const out=path.resolve(options.out);fs.mkdirSync(out,{recursive:true});
const report={scope:'Existing documented laminate electrode terminals; browser SVG/native collector/export, not a new feature or UI movement test',negativeCases:[],cases:[]};
const theme=await loadTheme('journal');
const layers=[{id:'cover',fill:'#AFC4CA',thickness:8},{id:'active/膜',fill:'#D9B78D',thickness:10},{id:'base',fill:'#BFC8CC',thickness:14}];
const motif={kind:'laminate',layers,gap:0,electrodes:{layer:1,width:18},labelSide:'none'};
const base={theme:'journal',size:[1050,650],header:false,footer:false,autoFit:false};
function withReadouts(block,contacts){
  return {...base,blocks:[block],nodes:contacts.map((c,i)=>({id:'readout-'+i,x:120+i*340,y:440,w:170,h:70,label:'Readout '+i,size:18})),
    edges:contacts.flatMap((c,i)=>['left','right'].map((side,j)=>({id:`lead-${i}-${side}`,from:c.prefix+'-electrode-'+side,to:'readout-'+i,fromSide:'b',fromAt:.5,toSide:'t',toAt:j?.7:.3,fromGap:2,toGap:2,route:'straight'})))};
}
const specs=[
  {name:'direct',contacts:[{prefix:'section',module:'section'}],block:{type:'scientific',id:'section',x:70,y:100,w:580,h:220,...structuredClone(motif),deflection:.25}},
  // Object-view components encode slashes and hyphens independently.
  {name:'object-views',contacts:[{prefix:'device%2Dset-rest%2F0-patch%2DA',module:'device%2Dset-rest%2F0-patch%2DA'}],
    block:{type:'object-views',id:'device-set',x:70,y:70,w:650,h:300,headingH:0,
      entities:[{id:'patch-A',extent:[.85,.8],scientific:structuredClone(motif)}],views:[{id:'rest/0',items:[{entity:'patch-A',at:[.5,.5],state:{deflection:.25}}]}]}},
  {name:'states',contacts:[{prefix:'series-state-rest',module:'series'},{prefix:'series-state-load%2F%E5%8E%8B',module:'series'}],
    block:{type:'scientific',id:'series',x:60,y:100,w:680,h:220,...structuredClone(motif),size:16,
      states:[{id:'rest',label:'Rest',deflection:0},{id:'load/压',label:'Load',deflection:.25}]}}
];
function near(actual,expected,message){assert.equal(actual.length,expected.length);actual.forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<.003,`${message}: ${actual} != ${expected}`));}
const computedFill=hex=>`rgb(${[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(', ')})`;
const nativeNode=(native,id)=>{const g=native.groups.find(g=>g.kind==='node'&&g.sourceId===id);assert.ok(g,`Missing native node ${id}`);return g;};
// These rejection assertions run before any browser is launched.
const noElectrodes=structuredClone(specs[0]);delete noElectrodes.block.electrodes;
for(const[name,scene]of [
  ['electrode-source-without-declaration',withReadouts(noElectrodes.block,noElectrodes.contacts)],
  ['layer-path-is-not-node',(()=>{const s=withReadouts(structuredClone(specs[0].block),specs[0].contacts);s.edges[0].from='section-layer-active%2F%E8%86%9C';return s;})()]
]){assert.throws(()=>prepareScene(structuredClone(scene),theme),/unknown node ID/);report.negativeCases.push({name,rejectedBeforeBrowser:true,passed:true});}

const {pw}=await loadPlaywrightInfo(options.playwright),found=resolveBrowser(pw,{browser:options.browser});
const browser=await pw.chromium.launch({headless:true,executablePath:found.executablePath});
try{
  for(const spec of specs){let prior;
    for(const dx of [0,30]){
      const source=withReadouts(structuredClone(spec.block),spec.contacts);source.blocks[0].x+=dx;
      const prepared=prepareScene(structuredClone(source),theme),svg=withSystemFonts(render(source,theme));
      const dir=path.join(out,spec.name+(dx?'-moved':'-original'));fs.mkdirSync(dir,{recursive:true});
      fs.writeFileSync(path.join(dir,'scene.json'),JSON.stringify(source,null,2)+'\n');fs.writeFileSync(path.join(dir,'diagram.svg'),svg);
      const page=await browser.newPage();await page.route(/^https?:\/\//,r=>r.abort());await page.setContent(svg);await page.evaluate(async()=>await document.fonts.ready);
      const native=await page.evaluate(collectEditableScene),xml=toDrawio(native);
      fs.writeFileSync(path.join(dir,'native.json'),JSON.stringify(native,null,2)+'\n');fs.writeFileSync(path.join(dir,'diagram.drawio'),xml);
      const cells=await page.evaluate(xml=>{const doc=new DOMParser().parseFromString(xml,'application/xml');if(doc.querySelector('parsererror'))throw Error('Invalid native XML');return Object.fromEntries([...doc.querySelectorAll('mxCell')].map(c=>[c.id,Object.fromEntries([...c.attributes].map(a=>[a.name,a.value]))]));},xml);
      assert.equal(native.edges.length,spec.contacts.length*2);
      const edges=[];
      for(const contact of spec.contacts){
        const group=native.groups.find(g=>g.kind==='module'&&g.sourceId==='scientific-'+contact.module);assert.ok(group);
        const layerId=contact.prefix+'-layer-active%2F%E8%86%9C';
        assert.ok(prepared.paths.some(p=>p.id===layerId));assert.ok(!prepared.nodes.some(p=>p.id===layerId));
        for(const layer of layers){const id=contact.prefix+'-layer-'+encodeURIComponent(layer.id),shape=native.shapes.find(s=>s.attributes.id===id);assert.ok(shape,`Missing actual layer path ${id}`);assert.equal(shape.parent,group.id);assert.equal(cells[shape.id].parent,group.id);assert.equal(shape.fill,computedFill(layer.fill));}
        for(const side of ['left','right']){
          const id=contact.prefix+'-electrode-'+side,node=prepared.nodes.find(n=>n.id===id),g=nativeNode(native,id);
          assert.equal(g.parent,group.id);assert.equal(cells[g.id].parent,group.id);
          const inside=await page.evaluate(({layerId,x,y})=>document.getElementById(layerId).isPointInFill(new DOMPoint(x,y)),{layerId,x:node.x+node.w/2,y:node.y+node.h/2});assert.ok(inside,'Electrode centre must lie in the selected layer');
          const edge=native.edges.find(e=>e.from===id);assert.ok(edge);const target=prepared.nodes.find(n=>n.id===edge.to),targetGroup=nativeNode(native,edge.to);
          assert.equal(targetGroup.parent,null);assert.equal(cells[targetGroup.id].parent,'1');
          near(edge.points[0],[node.x+node.w/2,node.y+node.h+2],'actual source contact');
          near(edge.points.at(-1),[target.x+target.w*(side==='left'?.3:.7),target.y-2],'independent fixed readout');
          const index=native.edges.indexOf(edge),cell=cells['connector-'+(index+1)];assert.equal(cell.source,g.id);assert.equal(cell.target,targetGroup.id);assert.equal(cell.parent,'1');
          edges.push({from:edge.from,to:edge.to,source:edge.points[0],target:edge.points.at(-1),nativeSource:cell.source,nativeTarget:cell.target});
        }
      }
      if(prior){
        assert.deepEqual(source.nodes,prior.source.nodes,'Readout model must remain fixed');
        for(const edge of edges){const old=prior.edges.find(e=>e.from===edge.from);near(edge.source,[old.source[0]+30,old.source[1]],'source translates with patch');near(edge.target,old.target,'readout port stays fixed');}
        for(const contact of spec.contacts)for(const side of ['left','right']){const id=contact.prefix+'-electrode-'+side,a=prior.prepared.nodes.find(n=>n.id===id),b=prepared.nodes.find(n=>n.id===id);near([b.x-a.x,b.y-a.y],[30,0],'Contact translation');assert.deepEqual({...b,x:a.x},a,'Contact identity, dimensions and layer-relative placement retained');}
        for(const old of prior.native.shapes.filter(s=>s.attributes.id?.includes('-layer-'))){const current=native.shapes.find(s=>s.attributes.id===old.attributes.id);near(current.box,[old.box[0]+30,...old.box.slice(1)],'Material contour translates without changing extent');assert.equal(current.parent,old.parent);assert.equal(current.fill,old.fill);}
      }
      report.cases.push({name:spec.name,translation:[dx,0],contacts:spec.contacts,connectedEdges:edges,layerPathsNotTerminals:true,nativeMembershipVerified:true,passed:true});
      prior={source,prepared,native,edges};await page.close();
    }
  }
  report.passed=true;console.log(JSON.stringify(report,null,2));
}finally{await browser.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');}
