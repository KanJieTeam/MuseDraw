import assert from 'node:assert/strict';
import {test} from 'node:test';
import {graphView} from '../skills/musedraw/scripts/engine/graph-view.mjs';
import {scientificMotif} from '../skills/musedraw/scripts/engine/scientific-motifs.mjs';
import {prepareScene,validateScene} from '../skills/musedraw/scripts/engine/validate.mjs';

const theme={fonts:{body:'Arial, sans-serif'}};
const source=()=>({type:'scientific',kind:'graph',id:'source',x:20,y:30,w:640,h:360,size:18,
  palette:{ink:'#345678',soft:'#DCEBE6'},points:[
    {id:'A',x:.08,y:.12,label:'Alpha',diameter:20,fill:'#AABBCC'},
    {id:'B/2',x:.39,y:.68,label:'Beta',diameter:34,stroke:'#226655'},
    {id:'C-3',x:.91,y:.37,label:'Gamma',diameter:12},
    {id:'outside',x:.72,y:.94,label:'Outside',diameter:28}],
  links:[{from:'A',to:'B/2',directed:true,color:'#664422',width:2.3,dash:'4 2'},
    {from:'B/2',to:'C-3'}, {from:'C-3',to:'A'}, {from:'C-3',to:'outside'}]});
const brief=()=>({type:'graph-view',id:'detail',source:'source',select:['C-3','A','B/2'],x:800,y:70,w:410,h:290});
const near=(a,b,message='')=>assert.ok(Math.abs(a-b)<1e-8,`${message}: ${a} != ${b}`);
const centre=n=>[n.x+n.w/2,n.y+n.h/2];
const node=(out,id)=>out.nodes.find(n=>n.id===id);
const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};

test('scene integration resolves later sources and reports actionable source errors before rendering',()=>{
  const scene={theme:'journal',size:[1300,500],header:false,footer:false,blocks:[brief(),source()]};
  const prepared=prepareScene(scene,theme);
  assert.ok(prepared.nodes.some(n=>n.id==='detail-B%2F2'));
  assert.equal(prepared.edges.filter(e=>e.nativeModule==='detail').length,3);
  for(const change of [s=>s.blocks[0].source='missing',s=>s.blocks[1]={...brief(),id:'source',source:'detail'}]){
    const invalid=structuredClone(scene);change(invalid);
    assert.ok(validateScene(invalid).some(e=>e.path==='/blocks/0/source'));
  }
  const invalid=structuredClone(scene);invalid.blocks[0].select=['missing'];
  assert.throws(()=>prepareScene(invalid,theme),/unknown selected point/);
  const malformed=structuredClone(scene);delete malformed.blocks[0].source;
  assert.ok(validateScene(malformed).some(e=>e.path==='/blocks/0/source'));
});

test('one common affine transform preserves asymmetry, directions and unequal circle sizes',()=>{
  const s=source(),b=brief(),beforeS=structuredClone(s),beforeB=structuredClone(b);
  const out=graphView(freeze(b),freeze(s),theme),canonical=scientificMotif(s,theme);
  assert.deepEqual(s,beforeS);assert.deepEqual(b,beforeB);
  const sA=node(canonical,'source-A'),tA=node(out,'detail-A'),scale=tA.w/sA.w;
  assert.ok(scale>0);const [sx,sy]=centre(sA),[tx,ty]=centre(tA);
  for(const id of b.select){
    const a=node(canonical,'source-'+encodeURIComponent(id)),n=node(out,'detail-'+encodeURIComponent(id));
    near(n.w/a.w,scale,'one diameter scale');near(n.w,n.h);
    const [ax,ay]=centre(a),[nx,ny]=centre(n);near(nx-tx,(ax-sx)*scale);near(ny-ty,(ay-sy)*scale);
    assert.equal(n.fill,a.fill);assert.equal(n.stroke,a.stroke);assert.equal(n.nativeModule,b.id);
  }
  assert.equal(out.nodes.length,4);assert.ok(!node(out,'detail-outside'));
  assert.deepEqual(out.nativeModules,[{id:'detail'}]);
  assert.deepEqual([node(out,'detail').x,node(out,'detail').y,node(out,'detail').w,node(out,'detail').h],[800,70,410,290]);
  assert.deepEqual(Object.keys(out).sort(),['nodes','edges','texts','nativeModules'].sort());
});

test('the complete induced topology, direction and edge appearance come from the source',()=>{
  const out=graphView(brief(),source(),theme);
  assert.deepEqual(out.edges.map(e=>e.id),['detail-bond-0','detail-bond-1','detail-bond-2']);
  assert.deepEqual(out.edges.map(e=>[e.from,e.to]),[['detail-A','detail-B%2F2'],['detail-B%2F2','detail-C-3'],['detail-C-3','detail-A']]);
  assert.equal(out.edges[0].arrow,'triangle');assert.equal(out.edges[1].arrow,'none');
  assert.equal(out.edges[0].color,'#664422');assert.equal(out.edges[0].width,2.3);assert.equal(out.edges[0].dash,'4 2');
  assert.ok(out.edges.every(e=>e.nativeModule==='detail'));assert.ok(out.edges.every(e=>!JSON.stringify(e).includes('outside')));
  const reverse=brief();reverse.select.reverse();assert.deepEqual(graphView(reverse,source(),theme),out,'selection order is not new geometry or topology');
});

test('labels keep canonical source correspondence, explicit reading size and padded bounds',()=>{
  const b={...brief(),labelSize:23,padding:31},s=source(),out=graphView(b,s,theme);
  assert.deepEqual(out.texts.map(t=>[t.id,t.text]),[['detail-label-1','Alpha'],['detail-label-2','Beta'],['detail-label-3','Gamma']]);
  for(const t of out.texts){assert.equal(t.size,23);assert.equal(t.nativeModule,b.id);
    assert.ok(t.x-t.w/2>=b.x+31-1e-8&&t.x+t.w/2<=b.x+b.w-31+1e-8);
    assert.ok(t.y-23*1.15>=b.y+31-1e-8&&t.y+23*.45<=b.y+b.h-31+1e-8);}
  const only=graphView({...b,select:['C-3']},s,theme);
  assert.equal(only.texts[0].id,'detail-label-3','subset keeps the original source text suffix');
  assert.equal(only.texts[0].text,'Gamma');assert.equal(only.edges.length,0);
  const renamed=source();renamed.points[1].label='Beta prime';renamed.points[1].fill='#CCAA66';
  const changed=graphView(b,renamed,theme);assert.equal(changed.texts[1].text,'Beta prime');assert.equal(node(changed,'detail-B%2F2').fill,'#CCAA66');
});

test('editing source coordinates, diameter and links propagates without hand-maintained copies',()=>{
  const a=source(),before=graphView(brief(),a,theme);a.points[1].x=.53;a.points[1].diameter=25;
  a.links[1].directed=true;a.links.push({from:'A',to:'C-3',directed:true});
  const after=graphView(brief(),a,theme),canonical=scientificMotif(a,theme);
  assert.notDeepEqual(centre(node(before,'detail-B%2F2')),centre(node(after,'detail-B%2F2')));
  const scale=node(after,'detail-A').w/node(canonical,'source-A').w;
  near(node(after,'detail-B%2F2').w,25*scale);assert.equal(after.edges[1].arrow,'triangle');
  assert.equal(after.edges.length,4);assert.equal(after.edges.at(-1).arrow,'triangle');
});

test('requested leaders are only two root-level non-directional detail guides',()=>{
  const b={...brief(),guidePoints:['A','C-3']},out=graphView(b,source(),theme);
  const guides=out.edges.filter(e=>e.kind==='detail-guide');assert.equal(guides.length,2);
  assert.deepEqual(guides.map(e=>[e.from,e.to]),[['source-A','detail-A'],['source-C-3','detail-C-3']]);
  for(const g of guides){assert.equal(g.arrow,'none');assert.equal(g.route,'straight');assert.equal(g.nativeModule,undefined);assert.ok(g.width<=1);}
  assert.equal(graphView(brief(),source(),theme).edges.filter(e=>e.kind==='detail-guide').length,0);
});

test('degenerate point/line geometry and multiline labels still fit without nonuniform scaling',()=>{
  const s=source();s.points[0].label='Two\nlines';s.points[1].x=s.points[0].x;s.points[2].x=s.points[0].x;
  const out=graphView({...brief(),labelSize:20},s,theme);const xs=out.nodes.slice(1).map(n=>centre(n)[0]);
  xs.forEach(x=>near(x,xs[0]));assert.equal(out.texts[0].text,'Two\nlines');
  const single=graphView({...brief(),select:['A']},s,theme);assert.equal(single.nodes.length,2);assert.equal(single.texts.length,1);
});

test('invalid frames, sources, selection, guides and unknown fields fail explicitly',()=>{
  for(const mutation of [b=>b.type='roi',b=>b.source='missing',b=>b.id='source',b=>b.select=[],b=>b.select=['A','A'],b=>b.select=['unknown'],
    b=>b.padding=0,b=>b.padding=null,b=>b.padding=300,b=>b.labelSize=-2,b=>b.w=NaN,b=>b.h=0,b=>b.extra=true,
    b=>b.guidePoints=['A','A'],b=>b.guidePoints=['A','outside'],b=>b.guidePoints=['A'],b=>b.select=[1]]){
    const b=brief();mutation(b);assert.throws(()=>graphView(b,source(),theme),/graph-view/);
  }
  for(const mutation of [s=>s.kind='network',s=>s.type='vector',s=>s.extra=1,s=>s.points[0].id='',s=>s.points[1].id='A',
    s=>s.points[0].id='\ud800',s=>s.points[0].diameter=-1,s=>s.points[0].x=1.2,s=>s.points[0].label=42,
    s=>s.points[0].bondOrder=2,s=>s.links[0].order=2,s=>s.links[0].directed='yes',s=>s.links[0].to='unknown',
    s=>s.links[0].width=0,s=>s.points[3].diameter=Infinity,s=>s.links=null,s=>s.palette={ink:4}]){
    const s=source();mutation(s);assert.throws(()=>graphView(brief(),s,theme),/graph-view|Scientific motif/);
  }
  assert.throws(()=>graphView({...brief(),w:90,labelSize:100},source(),theme),/labels do not fit/);
});

test('native ID collisions are rejected within the source and across source/view namespaces',()=>{
  const s=source();s.points[0].id='bond-0';s.links[0].from='bond-0';s.links[2].to='bond-0';
  assert.throws(()=>graphView({...brief(),select:['bond-0']},s,theme),/ID collision/);
  const withLabel=source();withLabel.points[0].id='label-1';withLabel.links[0].from='label-1';withLabel.links[2].to='label-1';
  assert.throws(()=>graphView({...brief(),select:['label-1']},withLabel,theme),/ID collision/);
  const cross=source();cross.points.push({id:'nested-A',x:.2,y:.5});
  assert.throws(()=>graphView({...brief(),id:'source-nested'},cross,theme),/ID collision/);
  assert.throws(()=>graphView({...brief(),id:'scientific-source'},source(),theme),/ID collision/);
  const groupCollision={type:'scientific',kind:'graph',id:'scientific',x:0,y:0,w:100,h:100,points:[{id:'scientific',x:.5,y:.5}]};
  assert.throws(()=>graphView({...brief(),source:'scientific',select:['scientific']},groupCollision,theme),/ID collision/);
  const unicode=source();unicode.points[0].id='A/B';unicode.links[0].from='A/B';unicode.links[2].to='A/B';
  const out=graphView({...brief(),select:['A/B','B/2']},unicode,theme);
  assert.ok(node(out,'detail-A%2FB'));assert.equal(new Set([...out.nodes,...out.edges,...out.texts].map(p=>p.id)).size,out.nodes.length+out.edges.length+out.texts.length);
});
