import assert from 'node:assert/strict';
import {pathCommands,toDrawio} from '../skills/musedraw/scripts/engine/drawio.mjs';

// Both cases of each SVG command must preserve the current point. Smooth
// commands reflect the previous control point; arcs remain native curves.
const absolute=pathCommands('M10 20 L30 40 H50 V60 C55 60 60 65 65 70 S75 80 80 85 Q85 90 90 95 T100 105 A10 15 20 0 1 120 125 Z');
const relative=pathCommands('m10 20 l20 20 h20 v20 c5 0 10 5 15 10 s10 10 15 15 q5 5 10 10 t10 10 a10 15 20 0 1 20 20 z');
assert.deepEqual(absolute,relative,'Relative and absolute command streams must produce identical native geometry');
assert.deepEqual(absolute.slice(0,4),[['move',10,20],['line',30,40],['line',50,40],['line',50,60]]);
assert.deepEqual(absolute[5],['curve',70,75,75,80,80,85],'S reflects the previous cubic control point');
assert.deepEqual(absolute[7],['quad',95,100,100,105],'T reflects the previous quadratic control point');
assert.equal(absolute.at(-1)[0],'close');
assert.ok(absolute.slice(8,-1).every(command=>command[0]==='curve'&&command.slice(1).every(Number.isFinite)),'Arc is represented by native finite cubic curves');
const arcEnd=absolute.at(-2).slice(-2);
assert.ok(Math.abs(arcEnd[0]-120)<1e-8&&Math.abs(arcEnd[1]-125)<1e-8);
assert.deepEqual(pathCommands('M1 2 3 4 5 6'),[['move',1,2],['line',3,4],['line',5,6]],'Repeated move pairs become line commands');
assert.deepEqual(pathCommands('m1 2 3 4 5 6'),[['move',1,2],['line',4,6],['line',9,12]]);
assert.deepEqual(pathCommands('M10 20 l5 0 z m2 3 l1 1'),[['move',10,20],['line',15,20],['close'],['move',12,23],['line',13,24]],'Close restores the subpath current point');
for(const invalid of ['M0 0 B1 2','m0 0 b1 2','R0 0','M0 0 L1','M0 0 C1 2 3'])assert.throws(()=>pathCommands(invalid),undefined,invalid);

const source='First line\n第二行 & <editable>\nLast line';
const xml=toDrawio({size:[600,400],title:'Multiline export',groups:[],shapes:[],edges:[],texts:[{
 id:'text-multiline',parent:null,edgeParent:null,box:[20,30,320,100],value:source,
 size:18,family:'Inter, sans-serif',weight:'400',italic:false,color:'#123456',opacity:1,rotation:0,vertical:false,spacing:0
}]});
const attribute=xml.match(/<mxCell\b[^>]*\bid="text-multiline"[^>]*\bvalue="([^"]*)"/s)?.[1];
assert.ok(attribute,'Exported native text cell exists');
assert.ok(!attribute.includes('\n')&&!attribute.includes('\r'),'XML attribute line breaks must use numeric entities');
assert.equal((attribute.match(/&#(?:10|x0*a);/gi)||[]).length,2,'Every source line break must survive XML attribute normalization');
const decoded=attribute.replace(/&#(?:10|x0*a);/gi,'\n').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
assert.equal(decoded,source,'Native editable text preserves all lines and literal XML-sensitive content');
const native={size:[600,400],title:'Native contract',groups:[
 {id:'group-a',sourceId:'a',kind:'node',box:[10,10,100,50]},
 {id:'group-b',sourceId:'b',kind:'node',box:[200,10,100,50]}
],shapes:[{id:'shape-a',parent:'group-a',box:[10,10,100,50],tag:'rect',attributes:{x:10,y:10,width:100,height:50},matrix:[1,0,0,1,0,0],fill:'#ffffff',stroke:'#123456',width:1,opacity:1,fillOpacity:1,strokeOpacity:1,dash:'none',cap:'butt',join:'miter'}],texts:[],edges:[
 {id:'a-b',from:'a',to:'b',points:[[110,35],[200,35]],color:'#123456',width:1,opacity:1}
]};
const connected=toDrawio(native);
assert.match(connected,/source="group-a" target="group-b"/);
assert.match(connected,/shape=stencil\(/);
assert.doesNotMatch(connected,/<(?:svg|image|foreignObject)\b|shape=image|data:image/i);
function rejected(change,expected){const scene=structuredClone(native);change(scene);assert.throws(()=>toDrawio(scene),expected);}
for(const tag of ['image','svg','foreignObject'])rejected(s=>{s.shapes[0].tag=tag;},/Unsupported editable primitive/);
rejected(s=>{s.shapes[0].id='group-a';},/Duplicate or invalid native object ID/);
rejected(s=>{s.shapes[0].parent='missing';},/Unresolved native parent/);
rejected(s=>{s.shapes[0].box[0]=NaN;},/Invalid native geometry/);
rejected(s=>{s.shapes[0].matrix[0]=Infinity;},/Invalid native transform/);
rejected(s=>{s.groups[1].sourceId='a';},/Duplicate or invalid native node/);
rejected(s=>{s.edges[0].to='missing';},/Unresolved editable terminals/);
rejected(s=>{s.edges.push({...s.edges[0]});},/Duplicate native connector ID/);
rejected(s=>{s.shapes[0].id='connector-1';},/Duplicate native connector ID/);
rejected(s=>{s.edges[0].points[0][0]=NaN;},/Invalid native connector geometry/);
rejected(s=>{s.shapes[0].edgeParent='missing';},/Unresolved native edge label/);
console.log('PASS native drawio contract, multiline XML entities and absolute/relative SVG path commands');
