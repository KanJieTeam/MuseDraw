import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';

const skill=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const base=JSON.parse(await fs.readFile(path.join(skill,'assets/musecore/survey.json'),'utf8'));
const out=process.env.MUSECORE_SURVEY_BOUNDS_OUT,tests=[],near=(a,b)=>assert(Math.abs(a-b)<=1e-12*Math.max(1,Math.abs(a),Math.abs(b)));
const change=counts=>{const b=structuredClone(base);b.items[0].counts=counts;return b};
const {pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({...resolveBrowser(pw),headless:true}),page=await browser.newPage({viewport:{width:2100,height:1600}});
async function draw(input){return page.evaluate(input=>{try{
 const snapshot=JSON.stringify(input),svg=MuseCore.render(input);document.querySelector('#output').replaceChildren(svg);
 const audit=MuseCore.audit(svg),texts=[...svg.querySelectorAll('text')],rects=[...svg.querySelectorAll('rect')];
 return {svg:svg.outerHTML,audit,inputUnchanged:snapshot===JSON.stringify(input),text:svg.textContent,
  rows:audit.geometry.items.map(item=>({id:item.id,nText:texts.find(t=>+t.getAttribute('x')===1550&&Math.abs(+t.getAttribute('y')-(item.y+8))<1e-8)?.textContent,
   agreeText:texts.find(t=>+t.getAttribute('x')===1440&&Math.abs(+t.getAttribute('y')-(item.y+8))<1e-8)?.textContent,
   bars:rects.filter(r=>Math.abs(+r.getAttribute('y')-(item.y-18))<1e-8&&+r.getAttribute('height')===36).map(r=>({x:+r.getAttribute('x'),width:+r.getAttribute('width'),fill:r.getAttribute('fill')}))}))};
 }catch(e){return {error:e.message}}},input)}
async function save(id,input,r){if(!out)return;const target=path.join(out,id);await fs.mkdir(target,{recursive:true});await fs.writeFile(path.join(target,'input.json'),JSON.stringify(input,null,2));await fs.writeFile(path.join(target,'checks.json'),JSON.stringify(r,null,2));if(r.svg){await fs.writeFile(path.join(target,'diagram.svg'),r.svg);await page.locator('#output svg').screenshot({path:path.join(target,'diagram.png')})}}
function facts(input,r){assert.equal(r.error,undefined);assert(r.inputUnchanged);const g=r.audit.geometry;assert.equal(g.items.length,input.items.length);
 for(const original of input.items){const item=g.items.find(x=>x.id===original.id),v=r.rows.find(x=>x.id===original.id),total=original.counts.reduce((s,n)=>s+BigInt(n),0n);assert.deepEqual(item.counts,original.counts);assert.equal(item.n,Number(total));assert(Number.isSafeInteger(item.n)&&item.n>0);assert(item.counts.every(Number.isSafeInteger));assert(item.segments.every(p=>Number.isSafeInteger(p.count)));assert.equal(v.nText,'n='+total);const agree=(original.counts[3]+original.counts[4])/Number(total);near(item.agree,agree);assert.equal(v.agreeText,(item.agree*100).toFixed(1)+'%');near(item.p.reduce((s,v)=>s+v,0),1);assert(item.p.every(Number.isFinite));assert(Number.isFinite(item.agree));assert.equal(v.bars.length,5);for(const [i,p]of item.segments.entries()){const bar=v.bars[i];near(p.proportion,original.counts[i]/Number(total));near(bar.width,p.proportion*410);near(bar.x,p.x);assert.equal(bar.fill,g.colors[i])}
 }assert(!r.text.includes('Infinity'));assert(!r.text.includes('NaN'));assert(r.text.includes(input.note));}
try{
 await page.setContent(await editorHtml(base));await page.waitForFunction(()=>window.MUSECORE_READY===true);
 for(const[id,input]of[
  ['normal-five',base],['legal-zero-cells',change([0,0,1,0,0])],['one-billion-visible-total',change([200000000,200000000,200000000,200000000,200000000])],
  ['one-billion-all-agree',change([0,0,0,0,1000000000])]
 ]){const r=await draw(input);facts(input,r);assert.deepEqual(r.audit.findings,[],id);await save(id,input,r);tests.push(id+' exact safe counts, sample size and real SVG proportions')}
 for(const[id,counts]of[['safe-integer-maximum',[Number.MAX_SAFE_INTEGER,0,0,0,0]],['safe-integer-maximum-mixed',[Number.MAX_SAFE_INTEGER-4,1,1,1,1]]]){
  const input=change(counts),r=await draw(input);facts(input,r);assert(r.audit.findings.some(f=>f.type==='text-overlap'&&[f.text,f.other].includes('n='+Number.MAX_SAFE_INTEGER)),'pre-existing typography limit stays reported by unchanged audit');await save(id,input,r);tests.push(id+' valid exact arithmetic; pre-existing n-column overlap remains an explicit audit refusal')
 }
 for(const[id,counts,pattern]of[
  ['finite-overflow-was-accepted',[1e308,1e308,1e308,1e308,1e308],/safe integers/],
  ['individual-unsafe-integer',[Number.MAX_SAFE_INTEGER+1,0,0,0,0],/safe integers/],
  ['individually-safe-but-sum-unsafe',[4503599627370496,4503599627370496,0,0,0],/total.*safe integer/],
  ['safe-max-plus-one',[Number.MAX_SAFE_INTEGER,1,0,0,0],/total.*safe integer/],
  ['nan-count',[NaN,0,1,0,0],/finite/],['infinite-count',[Infinity,0,1,0,0],/finite/],['negative-infinite-count',[-Infinity,0,1,0,0],/finite/],
  ['null-count',[null,0,1,0,0],/finite/],['string-count',['1',0,1,0,0],/finite/],['negative-count',[-1,0,1,0,0],/nonnegative/],
  ['fractional-count',[.5,0,1,0,0],/safe integers/],['empty-question',[0,0,0,0,0],/empty survey response/]
 ]){const r=await draw(change(counts));assert.match(r.error,pattern,id);tests.push(id+' truly refused by production browser')}
 const later=structuredClone(base);later.items.at(-1).counts=[Number.MAX_SAFE_INTEGER,1,0,0,0];assert.match((await draw(later)).error,/total.*safe integer/);tests.push('unsafe total in any question is refused before SVG creation');
 const normal=await draw(base);facts(base,normal);assert.deepEqual(normal.audit.findings,[]);tests.push('a refused input does not poison later valid rendering');
 console.log(JSON.stringify({passed:tests.length,tests},null,2));if(out)await fs.writeFile(path.join(out,'results.json'),JSON.stringify({passed:tests.length,tests},null,2));
}finally{await browser.close()}
