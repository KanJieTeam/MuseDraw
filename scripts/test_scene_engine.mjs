import assert from 'node:assert/strict';
import {loadTheme} from '../skills/musedraw/scripts/musedraw.mjs';
import {render} from '../skills/musedraw/scripts/engine/render.mjs';
import {assertStaticSvg} from '../skills/musedraw/scripts/engine/safety.mjs';
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
