import assert from 'node:assert/strict';
import {loadTheme} from '../skills/musedraw/scripts/musedraw.mjs';
import {render} from '../skills/musedraw/scripts/engine/render.mjs';
import {assertStaticSvg} from '../skills/musedraw/scripts/engine/safety.mjs';
const theme=await loadTheme('c4');
for(const name of ['../package','..\\package','/tmp/theme','file:theme']) await assert.rejects(()=>loadTheme(name));
const base={autoFit:false,size:[600,400],title:'Plain labels',nodes:[{id:'node',label:'A "quoted" <label>',x:80,y:180,w:300,h:100}]};
assert.ok(render(base,theme).includes('&lt;label&gt;'));
assert.ok(render({...base,texts:[{text:'ONLINE = OFFLINE',x:80,y:320}]},theme).includes('ONLINE = OFFLINE'));
for(const svg of ['<svg><script/></svg>','<svg onload="probe()"></svg>','<svg><image href="https://invalid.example/image"/></svg>','<svg><path fill="url(https://invalid.example/pattern)"/></svg>'])assert.throws(()=>assertStaticSvg(svg));
for(const altered of [
 {...base,texts:[{text:'safe',x:20,y:100,color:'" onload="probe()'}]},
 {...base,nodes:[{...base.nodes[0],shape:'" onload="probe()'}]}
]){let svg;try{svg=render(altered,theme);}catch{continue;}assert.doesNotMatch(svg, /\sonload="/);}
console.log('PASS scene theme boundaries, quoted labels, generated static SVG rejection and reported injection cases');
