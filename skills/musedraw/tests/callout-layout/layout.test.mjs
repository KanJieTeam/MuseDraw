import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutCallouts,wrapText,pack,appendCallouts} from '../../scripts/engine/callout-layout.mjs';
const measure=async s=>({left:0,right:[...s].length*10,ascent:15,descent:5});
const plan=()=>({subjectBBox:{x:220,y:40,w:160,h:320},blankSides:['left','right'],fontSize:18,fontFamily:'sans-serif',margin:20,gutter:20,gap:12,annotations:[{id:'a',text:'Long label with preserved facts 42 μm',anchor:[240,100],side:'left'},{id:'b',text:'Another label near the first anchor',anchor:[270,101],side:'left'},{id:'c',text:'保留中文和日本語と영문',anchor:[350,240],side:'right'}]});
function invariants(result,source) {
  for(const a of result.labels) {
    const original=source.annotations.find(b=>b.id===a.id),r=result.regions[a.side];
    assert.equal(a.lines.map(l=>l.text+l.breakAfter).join(''),original.text);
    assert.deepEqual(a.anchor,original.anchor); assert.deepEqual(a.leader[0],original.anchor);
    assert.ok(a.x>=r.x-1e-7 && a.x+a.w<=r.x+r.w+1e-7);
    assert.ok(a.y>=r.y-1e-7 && a.y+a.h<=r.y+r.h+1e-7);
    for(const l of a.lines) {
      assert.ok(l.baseline-l.metrics.ascent>=a.y-1e-7);
      assert.ok(l.baseline+l.metrics.descent<=a.y+a.h+1e-7);
    }
  }
  for(const side of ['left','right']) {
    const labels=result.labels.filter(a=>a.side===side);
    for(let i=1;i<labels.length;i++) assert.ok(labels[i].y>=labels[i-1].y+labels[i-1].h+source.gap-1e-7);
  }
}
test('all text, supplied anchors, readable font, side bounds and nonoverlap survive dense anchors',async()=>{
  const p=plan(),snapshot=structuredClone(p),r=await layoutCallouts([600,400],p,measure);
  invariants(r,p); assert.deepEqual(p,snapshot); assert.equal(r.fontSize,18);
});
test('graphemes, unbroken words, multilingual strings, whitespace and newlines survive wrapping',async()=>{
  for(const text of ['supercalifragilisticexpialidocious','中文日本語한국어العربية','e\u0301👩‍🔬👨‍👩‍👧‍👦  next\n\nlast\n',' preserve  repeated   spaces ']) {
    const lines=await wrapText(text,100,measure);
    assert.equal(lines.map(l=>l.text+l.breakAfter).join(''),text);
    for(const l of lines) assert.ok((l.metrics?.right || 0)<=100);
    assert.ok(!lines.some(l=>/^[\u0300-\u036f\u200d]/u.test(l.text)));
  }
});
test('capacity fails instead of shrinking or silently omitting labels',async()=>{
  const p=plan(); p.annotations=Array.from({length:12},(_,i)=>({id:`item${i}`,text:'long label repeated repeatedly',anchor:[240,100+i],side:'left'}));
  await assert.rejects(layoutCallouts([600,400],p,measure),e=>e.code==='CAPACITY'&&e.details.required>e.details.available);
});
test('narrow lane and indivisible grapheme fail honestly',async()=>{
  const p=plan(); p.subjectBBox.x=25; p.annotations=[{...p.annotations[0],anchor:[30,100]}];
  await assert.rejects(layoutCallouts([600,400],p,measure),e=>e.code==='WIDTH');
  await assert.rejects(wrapText('👨‍👩‍👧‍👦',5,measure),e=>e.code==='GLYPH_TOO_WIDE');
});
test('duplicate IDs, out of subject anchors and undeclared blank lanes are invalid',async()=>{
  const p=plan();p.annotations[1].id='a'; await assert.rejects(layoutCallouts([600,400],p,measure),e=>e.code==='ID');
  const q=plan();q.annotations[0].anchor=[0,0];await assert.rejects(layoutCallouts([600,400],q,measure),e=>e.code==='ANCHOR');
  const r=plan();delete r.blankSides;await assert.rejects(layoutCallouts([600,400],r,measure),e=>e.code==='BLANK_DECLARATION');
});
test('packing preserves order and minimizes squared displacement in a known binding cluster',()=>{
  const items=[{anchor:[0,100],h:40},{anchor:[0,100],h:40},{anchor:[0,100],h:40}];
  const packed=pack(items,0,300,10);assert.deepEqual(packed.map(a=>a.y),[30,80,130]);
  const bounded=pack([{anchor:[0,-30],h:40},{anchor:[0,400],h:40}],0,200,10);assert.deepEqual(bounded.map(a=>a.y),[0,160]);
});
test('dense distinct anchor heights never create shared positive-length vertical leader trunks',async()=>{
  const p=plan();p.annotations=Array.from({length:5},(_,i)=>({id:`dense${i}`,text:'A long label identifying a separate supplied anchor',anchor:[250,195+i],side:'left'}));
  const result=await layoutCallouts([600,600],p,measure);invariants(result,p);
  assert.deepEqual(result.warnings,[]);
  const segments=result.labels.flatMap(a=>a.leader.slice(1).map((to,i)=>[a.leader[i],to]));
  const vertical=segments.filter(([a,b])=>a[0]===b[0] && a[1]!==b[1]);
  for(let i=0;i<vertical.length;i++) for(let j=i+1;j<vertical.length;j++) {
    const [a,b]=vertical[i],[c,d]=vertical[j];
    assert.ok(a[0]!==c[0] || Math.min(Math.max(a[1],b[1]),Math.max(c[1],d[1]))<=Math.max(Math.min(a[1],b[1]),Math.min(c[1],d[1])));
  }
  const same=plan();same.annotations[1].anchor[1]=same.annotations[0].anchor[1];
  assert.ok((await layoutCallouts([600,400],same,measure)).warnings.some(w=>w.code==='DUPLICATE_ANCHOR_Y'));
});
test('each line uses its own taller actual glyph metrics',async()=>{
  const p=plan();p.annotations=[{...p.annotations[0],text:'🙂'}];
  const r=await layoutCallouts([600,400],p,async s=>({...await measure(s),...(s.includes('🙂')?{ascent:35,descent:10}:{})}));invariants(r,p);assert.ok(r.labels[0].h>=45);
});
test('SVG extension preserves artwork bytes and escapes labels without arrowheads',async()=>{
  const p=plan();p.annotations[0].text='A < B & "C"';const r=await layoutCallouts([600,400],p,measure);
  const original='<svg><path id="subject" d="M 220 40 L 380 360"/></svg>';
  const scene=appendCallouts({type:'vector',size:[600,400],nativeSvg:original},r);
  assert.ok(scene.nativeSvg.startsWith(original.slice(0,-6)));assert.ok(scene.nativeSvg.includes('&lt;'));assert.ok(!scene.nativeSvg.includes('marker-end'));assert.equal(scene.autoFit,false);
});
test('annotation IDs resembling line suffixes cannot collide with generated text IDs',async()=>{
  const p=plan();p.annotations[0].id='a';p.annotations[1].id='a-line-0';
  const r=await layoutCallouts([600,400],p,measure),scene=appendCallouts({type:'vector',nativeSvg:'<svg></svg>'},r);
  const ids=[...scene.nativeSvg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
});
test('deterministic seeded stress: 400 layouts satisfy measurable invariants',async()=>{
  let seed=48271; const rand=()=>((seed=seed*16807%2147483647)/2147483647);
  for(let i=0;i<400;i++) {
    const p=plan();p.annotations=Array.from({length:1+Math.floor(rand()*8)},(_,j)=>({id:`l${j}`,text:'x'.repeat(1+Math.floor(rand()*70)),anchor:[240+rand()*80,40+rand()*320],side:rand()<.5?'left':'right'}));
    try {invariants(await layoutCallouts([600,400],p,measure),p);} catch(e) {if(e.code!=='CAPACITY') throw e;}
  }
});
