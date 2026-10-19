import assert from 'node:assert/strict';
import {loadTheme} from '../skills/musedraw/scripts/musedraw.mjs';
import {render} from '../skills/musedraw/scripts/engine/render.mjs';
import {assertStaticSvg} from '../skills/musedraw/scripts/engine/safety.mjs';
import {port} from '../skills/musedraw/scripts/engine/route.mjs';
const theme=await loadTheme('c4');
for(const name of ['../package','..\\package','/tmp/theme','file:theme']) await assert.rejects(()=>loadTheme(name));
const base={autoFit:false,size:[600,400],title:'Plain labels',nodes:[{id:'node',label:'A "quoted" <label>',x:80,y:180,w:300,h:100}]};
assert.ok(render(base,theme).includes('&lt;label&gt;'));
const unchangedTheme=JSON.stringify(theme),unchangedSvg=render(base,theme);
const localStyle={...base,style:{palette:{ink:'#123456'},node:{radius:13},tones:{default:{fill:'#fedcba',text:'#123456'}}}};
const styledSvg=render(localStyle,theme);
assert.ok(styledSvg.includes('#fedcba')&&styledSvg.includes('#123456'));
assert.equal(JSON.stringify(theme),unchangedTheme,'Scene styles must not mutate a shared theme');
assert.equal(render(base,theme),unchangedSvg,'Later drawings must keep their original theme');
assert.throws(()=>render({...base,style:'invalid'},theme));
assert.throws(()=>render({...base,style:{extends:'other-theme'}},theme));
assert.throws(()=>render({...base,style:{tones:{default:{fill:'url(https://invalid.example/pattern)'}}}},theme));
assert.ok(render({...base,texts:[{text:'ONLINE = OFFLINE',x:80,y:320}]},theme).includes('ONLINE = OFFLINE'));
for(const svg of ['<svg><script/></svg>','<svg onload="probe()"></svg>','<svg><image href="https://invalid.example/image"/></svg>','<svg><path fill="url(https://invalid.example/pattern)"/></svg>'])assert.throws(()=>assertStaticSvg(svg));
for(const altered of [
 {...base,texts:[{text:'safe',x:20,y:100,color:'" onload="probe()'}]},
 {...base,nodes:[{...base.nodes[0],shape:'" onload="probe()'}]}
]){let svg;try{svg=render(altered,theme);}catch{continue;}assert.doesNotMatch(svg, /\sonload="/);}
console.log('PASS scene theme boundaries, quoted labels, generated static SVG rejection and reported injection cases');
const vector={type:'vector',theme:'c4',size:[600,400],nativeSvg:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400" data-theme="c4"><rect width="600" height="400" fill="white"/><text x="20" y="40">Native text</text></svg>'};
assert.equal(render(vector,theme),vector.nativeSvg);
for(const patch of [
 {nativeSvg:undefined}, {nativeSvg:42}, {size:[601,400]}, {size:[9000,400]},
 {theme:'enterprise'}, {style:{palette:{ink:'#000'}}}, {nodes:base.nodes},
 {nativeSvg:vector.nativeSvg.replace('<text','<image href="https://invalid.example/x"/><text')},
 {nativeSvg:vector.nativeSvg.replace('<text','<script/><text')},
 {nativeSvg:vector.nativeSvg.replace('data-theme="c4"','data-theme="enterprise"')},
 {nativeSvg:vector.nativeSvg.replace('0 0 600 400','1 0 600 400')},
 {nativeSvg:vector.nativeSvg.replace('</svg>','<svg/></svg>')}
])assert.throws(()=>render({...vector,...patch},theme));
console.log('PASS exact vector replay, native text, canvas limits, theme boundaries and unsafe artwork rejection');

// Folder ports keep `at` as a bounding-box fraction and intersect the visible
// contour along the requested side axis. The gap remains an axis offset.
const folder={shape:'folder',x:815,y:565,w:190,h:100};
const nearPoint=(actual,expected)=>actual.forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<1e-8,`${actual} != ${expected}`));
for(const [at,roof]of [[0,565],[.3,565],[.36,565],[.405,576],[.45,587],[.7,587],[1,587]]) {
  nearPoint(port(folder,'t',at,0),[815+190*at,roof]);
  nearPoint(port(folder,'t',at,2),[815+190*at,roof-2]);
}
for(const at of [.36-1e-9,.36+1e-9,.45-1e-9,.45+1e-9]) {
  const offset=at<=.36?0:at>=.45?22:22*(at-.36)/.09;
  nearPoint(port(folder,'t',at,0),[815+190*at,565+offset]);
}
// At the horizontal roof's y, a ray from the right hits the rightmost point;
// immediately above that y it instead hits the sloping tab edge.
for(const [at,x]of [[0,883.4],[.11,891.95],[.22-1e-9,815+190*(.36+.09*(.22-1e-9)/.22)],[.22,1005],[.22+1e-9,1005],[.5,1005],[1,1005]]) {
  nearPoint(port(folder,'r',at,0),[x,565+100*at]);
  nearPoint(port(folder,'r',at,2),[x+2,565+100*at]);
}
const movedFolder={...folder,x:-40,y:12,w:380,h:200};
nearPoint(port(movedFolder,'t',.7,2),[226,54]);
nearPoint(port(movedFolder,'t',.405,2),[113.9,32]);
nearPoint(port(movedFolder,'r',.11,2),[115.9,34]);
for(const at of [0,.11,.22,.5,1]) {
  nearPoint(port(folder,'l',at,2),[813,565+100*at]);
  nearPoint(port(folder,'b',at,2),[815+190*at,667]);
  nearPoint(port({...folder,shape:'box'},'t',at,2),[815+190*at,563]);
  nearPoint(port({...folder,shape:'doc'},'r',at,2),[1007,565+100*at]);
}
for(const shape of ['circle','station','person'])nearPoint(port({shape,x:10,y:20,w:100,h:100},'t',.1,2),[60,18]);
nearPoint(port(folder,'t',.7,2),[948,585]); // Observed archive: roof y587, gap2.
const folderSvg=render({autoFit:false,header:false,footer:false,size:[1200,720],nodes:[
  {id:'source',label:'',x:900,y:400,w:96,h:50},{id:'archive',label:'Archive',...folder}
],edges:[{from:'source',to:'archive',fromSide:'b',toSide:'t',toAt:.7,toGap:2,route:'straight'}]},theme);
const folderMetadata=folderSvg.match(/data-connection="([^"]+)"/)[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&');
nearPoint(JSON.parse(folderMetadata).points.at(-1),[948,585]);
console.log('PASS folder contour ports, bbox fractions, boundary rays, sizing, gap and resolved SVG endpoint metadata');
