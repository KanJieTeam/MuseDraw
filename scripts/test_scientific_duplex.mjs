import assert from 'node:assert/strict';
import {test} from 'node:test';
import {duplexParts} from '../skills/musedraw/scripts/engine/scientific-duplex.mjs';
import {scientificMotif} from '../skills/musedraw/scripts/engine/scientific-motifs.mjs';
import {pathCommands} from '../skills/musedraw/scripts/engine/drawio.mjs';

const p={focus:'#3563C4',warm:'#C65B59',neutral:'#9BA6B2'};
const base={id:'duplex',type:'scientific',kind:'duplex',x:25,y:30,w:500,h:130,turns:3,phase:17,amplitude:22,sites:[{id:'site/one',at:.08,marks:['a']},{id:'site two',at:.42,marks:['a','b']},{id:'empty',at:.7,marks:[]}]};
const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
function curves(path){let start;return pathCommands(path.d).flatMap(command=>{const result=command[0]==='curve'?[{start,c1:command.slice(1,3),c2:command.slice(3,5),end:command.slice(5,7)}]:[];if(command.length>1)start=command.slice(-2);return result;});}

test('markers have exact mathematical positions and remain native independent occupancy objects',()=>{
  const out=duplexParts(base,p),radius=4,margin=5.5,width=base.w-2*margin,phi=base.phase*Math.PI/180;
  assert.equal(out.nodes.length,3);assert.deepEqual(out.edges,[]);assert.deepEqual(out.texts,[]);
  assert.deepEqual(out.nodes.map(n=>n.id),['duplex-site-site%2Fone-a','duplex-site-site%20two-a','duplex-site-site%20two-b']);
  for(const site of base.sites)for(const strand of site.marks){
    const node=out.nodes.find(n=>n.id===`duplex-site-${encodeURIComponent(site.id)}-${strand}`);
    const x=base.x+margin+width*site.at,y=base.y+base.h/2+(strand==='a'?1:-1)*base.amplitude*Math.sin(phi+2*Math.PI*base.turns*site.at);
    near(node.x+radius,x);near(node.y+radius,y);assert.equal(node.shape,'circle');
    const backbone=out.paths.find(path=>path.id===`duplex-strand-${strand}`);
    assert.ok(curves(backbone).some(c=>Math.abs(c.end[0]-x)<1e-8&&Math.abs(c.end[1]-y)<1e-8),'marker must be on an exact cubic endpoint, not an approximate interpolant');
  }
});

test('native cubics have continuous positions and first derivatives and stay inside the frame',()=>{
  for(const phase of [0,17,90,-135,1e300]){
    const input={...base,phase,sites:[],turns:2.5,rungs:9},out=duplexParts(input,p);
    assert.equal(out.paths.length,11);assert.ok(out.paths.slice(0,9).every(path=>path.id.includes('-rung-')));
    for(const path of out.paths){
      assert.doesNotMatch(path.d,/NaN|Infinity|<|url|image/i);
      for(const c of pathCommands(path.d))for(let i=1;i<c.length;i+=2){assert.ok(c[i]>=base.x&&c[i]<=base.x+base.w);assert.ok(c[i+1]>=base.y&&c[i+1]<=base.y+base.h);}
      if(!path.id.includes('-strand-'))continue;
      const cs=curves(path);
      for(let i=1;i<cs.length;i++){
        const a=cs[i-1],b=cs[i];assert.deepEqual(a.end,b.start);
        near((a.end[1]-a.c2[1])/(a.end[0]-a.c2[0]),(b.c1[1]-b.start[1])/(b.c1[0]-b.start[0]),1e-6);
      }
    }
    const backbones=out.paths.slice(-2).map(curves);
    for(const rung of out.paths.slice(0,9))for(const [i,c]of pathCommands(rung.d).entries())assert.ok(backbones[i].some(segment=>Math.abs(segment.end[0]-c[1])<1e-8&&Math.abs(segment.end[1]-c[2])<1e-8),'rung must terminate at the actual backbone');
  }
});

test('changing marks alone preserves backbone geometry, IDs and half/full occupancy counts',()=>{
  const original=structuredClone(base),palette=structuredClone(p),half=duplexParts(base,p);
  const fullSpec=structuredClone(base);fullSpec.sites[0].marks=['a','b'];const full=duplexParts(fullSpec,p);
  assert.equal(half.nodes.length,3);assert.equal(full.nodes.length,4);assert.deepEqual(full.paths,half.paths);
  assert.deepEqual(base,original);assert.deepEqual(p,palette);
  const stable=full.nodes.find(n=>n.id===half.nodes[0].id);assert.deepEqual(stable,half.nodes[0]);
  const empty=duplexParts({...base,sites:[]},p);assert.equal(empty.nodes.length,0);assert.equal(empty.paths.length,2);
  assert.deepEqual(duplexParts({id:'d',x:0,y:0,w:300,h:100,sites:[]}),duplexParts({id:'d',x:0,y:0,w:300,h:100,sites:[]}));
});

test('invalid bounds, identities, unknown fields, unsafe colours and crossing collisions fail early',()=>{
  const invalid=[{sites:undefined},{turns:0},{turns:13},{turns:NaN},{phase:Infinity},{amplitude:0},{amplitude:70},{strandWidth:-1},{markerRadius:0},{markerRadius:100},{w:2},{x:NaN},{rungs:1.5},{rungs:49},{extra:1},
    {strands:[{id:'a',fill:'red'}]},{strands:[{id:'a',fill:'red'},{id:'a',fill:'blue'}]},
    {sites:[{id:'s',at:2,marks:[]}]},{sites:[{id:'s',at:NaN,marks:[]}]},{sites:[{id:'s',at:.2,marks:['missing']}]},{sites:[{id:'s',at:.2,marks:['a','a']}]},{sites:[{id:'s',at:.2,marks:[],oops:1}]},
    {sites:[{id:'same',at:.2,marks:[]},{id:'same',at:.7,marks:[]}]},
    {phase:0,sites:[{id:'crossing',at:0,marks:['a','b']}]},
    {sites:[{id:'near1',at:.08,marks:['a']},{id:'near2',at:.08001,marks:['a']}]},
    {strands:[{id:'c',fill:'red'},{id:'b-c',fill:'blue'}],sites:[{id:'s-b',at:.08,marks:['c']},{id:'s',at:.42,marks:['b-c']}]},
  ];
  for(const patch of invalid)assert.throws(()=>duplexParts({...base,...patch},p),/Scientific motif .*duplex/);
  for(const fill of ['url(https://invalid)','var(--paint)','red;stroke:black','<svg/>','currentColor','notacolour','rgb(NaN 0 0)']){
    assert.throws(()=>duplexParts({...base,strands:[{id:'a',fill},{id:'b',fill:'blue'}]},p),/safe static CSS/);
    assert.throws(()=>duplexParts({...base,sites:[{id:'s',at:.08,marks:['a'],fill}]},p),/safe static CSS/);
  }
  assert.throws(()=>duplexParts({...base,phase:0,sites:[{id:'cross',at:.5,marks:['a','b']}]},p),/move the site away from crossings/);
});

test('safe CSS and explicit arbitrary strand identities remain stable without adding marks',()=>{
  for(const fill of ['#abc','#ABCD','#123456','#12345678','rebeccapurple','rgb(20 30 40 / 50%)','hsl(120, 50%, 60%)']){
    const input={...base,strands:[{id:'upper/strand',fill},{id:'lower strand',fill}],sites:[{id:'selected',at:.08,marks:['lower strand'],fill}]};
    const out=duplexParts(input,p);assert.equal(out.nodes.length,1);assert.equal(out.nodes[0].id,'duplex-site-selected-lower%20strand');assert.equal(out.nodes[0].fill,fill);
    assert.equal(out.paths[0].id,'duplex-strand-upper%2Fstrand');
  }
});

test('short site labels are live native text with fixed marker geometry',()=>{
  const plain=duplexParts(base,p),labelled=structuredClone(base);labelled.sites[0].label='Me';
  const out=duplexParts(labelled,p);assert.deepEqual(out.paths,plain.paths);
  assert.deepEqual(out.nodes.map(n=>[n.id,n.x,n.y,n.w,n.h,n.fill]),plain.nodes.map(n=>[n.id,n.x,n.y,n.w,n.h,n.fill]));
  assert.equal(out.nodes[0].label,'Me');assert.equal(out.nodes[0].labelPos,'inside');assert.equal(out.nodes[0].size,3.6);
  assert.equal(out.nodes[1].label,'');
  for(const label of ['',42,'a\nb','unreasonably long label'])assert.throws(()=>duplexParts({...base,sites:[{id:'x',at:.08,marks:['a'],label}]},p),/site label/);
});

test('markerOffset moves only markers by the exact outward amount, leaving sites, backbone and IDs intact',()=>{
  const bare=duplexParts(base,p),zero=duplexParts({...base,markerOffset:0},p);
  assert.deepEqual(zero,bare,'omitted offset preserves the original output exactly');
  const input={...structuredClone(base),markerOffset:8.25},saved=structuredClone(input),offset=duplexParts(input,p);
  assert.deepEqual(input,saved);assert.deepEqual(offset.paths,bare.paths);assert.deepEqual(offset.edges,bare.edges);assert.deepEqual(offset.texts,bare.texts);
  assert.equal(offset.nodes.length,bare.nodes.length);
  for(let i=0;i<bare.nodes.length;i++){
    const a=bare.nodes[i],b=offset.nodes[i];
    assert.deepEqual({...b,y:a.y},a,'all marker properties except y are stable');
    const direction=Math.sign(a.y+a.h/2-(base.y+base.h/2));
    near(b.y-a.y,direction*8.25);
    assert.ok(b.y>=base.y&&b.y+b.h<=base.y+base.h);
  }
});

test('markerOffset rejects insufficient frame space and marked crossings without inventing an outer identity',()=>{
  for(const markerOffset of [-1,NaN,Infinity,'4',null])assert.throws(()=>duplexParts({...base,markerOffset},p),/markerOffset must be nonnegative finite/);
  assert.throws(()=>duplexParts({...base,markerOffset:40},p),/insufficient space/);
  // Even a single mark is rejected at a crossing when an outward offset is requested.
  for(const at of [0,.5,1])assert.throws(()=>duplexParts({...base,phase:0,markerOffset:2,sites:[{id:'crossing',at,marks:['a']}]},p),/move the site away from crossings/);
  assert.equal(duplexParts({...base,phase:0,markerOffset:2,sites:[{id:'unmarked crossing',at:0,marks:[]}]},p).nodes.length,0);
  assert.equal(duplexParts({...base,phase:0,sites:[{id:'original single crossing',at:0,marks:['a']}]},p).nodes.length,1);
});

test('external site names are one native text per named site with exact mathematical x alignment',()=>{
  const input=structuredClone(base);input.sites.forEach((s,i)=>s.name=['p','q','r'][i]);input.sites[0].label='Me';
  const original=structuredClone(input),out=duplexParts(input,p),plain=duplexParts({...input,sites:input.sites.map(({name,...site})=>site)},p);
  assert.deepEqual(input,original);assert.equal(out.texts.length,3,'an unmarked site still has its explicit name; paired marks do not duplicate names');
  assert.deepEqual(out.paths,plain.paths);assert.deepEqual(out.nodes,plain.nodes);assert.deepEqual(out.edges,plain.edges);
  for(const [i,site] of input.sites.entries()){
    const text=out.texts[i],expected=base.x+5.5+(base.w-11)*site.at;
    near(text.x,expected);assert.equal(text.anchor,'middle');assert.equal(text.text,site.name);
    assert.equal(text.id,`duplex-siteName-${encodeURIComponent(site.id)}`);
    assert.ok(text.x-text.w/2>=base.x&&text.x+text.w/2<=base.x+base.w);
    assert.ok(text.y-text.size>=base.y&&text.y+text.size*.3+4<=base.y+base.h/2-base.amplitude-5.5);
    for(const marker of out.nodes.filter(n=>n.id.startsWith(`duplex-site-${encodeURIComponent(site.id)}-`)))near(text.x,marker.x+marker.w/2);
  }
  assert.equal(out.nodes[0].label,'Me','circle chemical labels remain independent');
});

test('siteNames only toggles external names and preserves all existing output when there are no names',()=>{
  const plain=duplexParts(base,p);
  assert.deepEqual(duplexParts({...base,siteNames:true},p),plain);
  assert.deepEqual(duplexParts({...base,siteNames:false},p),plain);
  const named=structuredClone(base);named.sites[0].name='p';named.sites[0].label='Me';
  const shown=duplexParts(named,p),hidden=duplexParts({...named,siteNames:false},p);
  assert.equal(shown.texts.length,1);assert.deepEqual(hidden.texts,[]);
  assert.deepEqual(shown.nodes,hidden.nodes);assert.deepEqual(shown.paths,hidden.paths);assert.deepEqual(shown.edges,hidden.edges);
  assert.equal(hidden.nodes[0].label,'Me');
  assert.deepEqual(duplexParts({...named,siteNames:true},p),shown);
  const moved=duplexParts({...named,markerOffset:5},p);
  assert.deepEqual(moved.texts,shown.texts,'marker offset cannot relocate the site name');
});

test('site names reject unsafe text, unknown fields, collisions and insufficient space without moving geometry',()=>{
  for(const name of ['',null,42,' p','p ','p\nq','x'.repeat(25),'<svg/>','a&b','p\u0000q','p\u202eq','\ud800'])
    assert.throws(()=>duplexParts({...base,sites:[{id:'s',at:.2,marks:[],name}]},p),/site name/);
  for(const siteNames of [null,0,'false',{}])assert.throws(()=>duplexParts({...base,siteNames},p),/siteNames must be boolean/);
  assert.throws(()=>duplexParts({...base,sites:[{id:'s',at:.2,marks:[],name:'p',namePosition:'above'}]},p),/unknown site fields/);
  assert.throws(()=>duplexParts({...base,siteName:true},p),/unknown motif fields/);
  assert.throws(()=>duplexParts({...base,h:65,sites:[{id:'s',at:.2,marks:[],name:'p'}]},p),/site names do not fit above/);
  assert.throws(()=>duplexParts({...base,sites:[{id:'s',at:0,marks:[],name:'edge site'}]},p),/exceeds the frame/);
  assert.throws(()=>duplexParts({...base,sites:[{id:'s',at:.2,marks:[],name:'p'},{id:'t',at:.201,marks:[],name:'q'}]},p),/site names collide/);
  assert.throws(()=>duplexParts({...base,sites:[{id:'s',at:.2,marks:[],name:'p'}]},{...p,ink:'url(https://invalid)'}),/safe static CSS/);
  assert.doesNotThrow(()=>duplexParts({...base,h:65,siteNames:false,sites:[{id:'s',at:0,marks:[],name:'edge site'}]},p),'hidden names do not reserve space or change the curve');
});

test('scientificMotif exposes siteNames and owns each independent native name',()=>{
  const input=structuredClone(base);input.siteNames=true;input.sites[0].name='p';input.sites[1].name='q';
  const out=scientificMotif(input,{});
  assert.equal(out.texts.length,2);assert.deepEqual(out.nativeModules,[{id:base.id}]);
  assert.ok(out.texts.every(t=>t.nativeModule===base.id&&t.anchor==='middle'));
  const hidden=scientificMotif({...input,siteNames:false},{});assert.equal(hidden.texts.length,0);
  assert.deepEqual(hidden.nodes,out.nodes);assert.deepEqual(hidden.paths,out.paths);
  assert.throws(()=>scientificMotif({...input,siteNames:'true'},{}),/siteNames must be boolean/);
  assert.throws(()=>scientificMotif({id:'other',kind:'graph',x:0,y:0,w:100,h:100,points:[{id:'p',x:.5,y:.5}],siteNames:true},{}),/unsupported field siteNames/);
});
