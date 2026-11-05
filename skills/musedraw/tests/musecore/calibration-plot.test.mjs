import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import fixtureJson from '../../assets/musecore/calibration-plot-demo.json' with {type:'json'};
import {calibrationPlotModel} from '../../scripts/musecore/calibration-models.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const fixture=()=>structuredClone(fixtureJson),bad=(base,edit)=>{const b=structuredClone(base);edit(b);return b};

test('calibration model computes condition summaries and preserves traceability',()=>{
 const m=calibrationPlotModel(fixture());assert.equal(m.rows.length,8);assert.equal(m.covered,8);assert.equal(m.byCondition[0].count,4);assert.equal(m.byCondition[1].count,4);assert(m.rmse>0);assert.equal(m.sourceTraceability.at(-1).source,'实验记录 T · 行 4');assert(m.scope.includes('不能替代外部校准验证'));assert.deepEqual(fixture(),fixtureJson);
});

test('calibration figure renders as real SVG in Chromium at normal and narrow viewports',async()=>{
 const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({headless:true,...resolveBrowser(pw)}),dir=path.join(root,'output','calibration-plot-browser');await fs.mkdir(dir,{recursive:true});
 const modules=await Promise.all(['svg.mjs','visual-tools.mjs','calibration-models.mjs','calibration-figures.mjs'].map(async f=>{let c=await fs.readFile(path.join(root,'scripts/musecore',f),'utf8');return c.replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'')}));
 const html=`<!doctype html><meta charset=\"utf-8\"><style>body{margin:0;background:#eee}#out{background:white}</style><div id=\"out\"></div><script>${modules.join('\n')}const input=${JSON.stringify(fixture())};document.querySelector('#out').append(calibrationPlotFamilies()['calibration-plot'](input));window.ready=true;</script>`;
 const htmlPath=path.join(dir,'browser-demo.html');await fs.writeFile(htmlPath,html);
 try{const page=await browser.newPage({viewport:{width:2400,height:1600}});await page.goto(pathToFileURL(htmlPath).href);await page.waitForFunction(()=>window.ready===true);const normal=await page.evaluate(()=>{const s=document.querySelector('svg');return {width:s.width.baseVal.value,height:s.height.baseVal.value,points:s.querySelectorAll('[data-calibration-point]').length,intervals:s.querySelectorAll('[data-calibration-interval]').length,findings:[...s.querySelectorAll('text')].map(t=>{const b=t.getBBox();return {x:b.x,y:b.y,right:b.x+b.width,bottom:b.y+b.height}}).filter(b=>b.x<0||b.y<0||b.right>2200||b.bottom>s.height.baseVal.value)}});assert.equal(normal.points,8);assert.equal(normal.intervals,8);assert.deepEqual(normal.findings,[]);await page.screenshot({path:path.join(dir,'normal.png'),fullPage:true});await page.setViewportSize({width:390,height:900});const narrow=await page.evaluate(()=>{const s=document.querySelector('svg');return {width:s.width.baseVal.value,height:s.height.baseVal.value,points:s.querySelectorAll('[data-calibration-point]').length,scrollWidth:document.documentElement.scrollWidth}});assert.equal(narrow.points,8);assert(narrow.width===2200&&narrow.scrollWidth>=2200);await page.screenshot({path:path.join(dir,'narrow.png'),fullPage:false});await fs.writeFile(path.join(dir,'diagram.svg'),await page.locator('svg').evaluate(e=>e.outerHTML));await fs.writeFile(path.join(dir,'checks.json'),JSON.stringify({status:'browser-render-passed',normal,narrow},null,2)+'\n');}
 finally{await browser.close()}
});

test('calibration model rejects unsupported or ambiguous uncertainty inputs',()=>{
 const b=fixture();for(const [edit,re] of [[x=>x.rows[0].low=12,/bracket/],[x=>{x.rows[0].low=x.rows[0].predicted;x.rows[0].high=x.rows[0].predicted},/positive width/],[x=>x.rows[0].predicted=NaN,/finite/],[x=>x.rows[0].condition='missing',/unknown/],[x=>x.rows[1].id=x.rows[0].id,/duplicate row/],[x=>x.conditions.pop(),/2–4/],[x=>x.rows[0].source='',/nonempty/],[x=>x.rows[0].extra=1,/unsupported field/]]){assert.throws(()=>calibrationPlotModel(bad(b,edit)),re)}});


