import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const flags=process.argv.slice(2);
function option(name,fallback){const index=flags.indexOf(name);if(index===-1)return fallback;assert.ok(flags[index+1]&&!flags[index+1].startsWith('--'),`${name} requires a value`);return flags[index+1];}
const playwright=option('--playwright');assert.ok(playwright,'Pass --playwright path/to/existing/playwright/index.mjs');
const output=path.resolve(repo,option('--output','output/gallery-qa'));await fs.mkdir(output,{recursive:true});
const scratch=await fs.mkdtemp(path.join(os.tmpdir(),'musedraw-gallery-qa-')),scratchReal=await fs.realpath(scratch);
const report={checks:[],screenshots:[],downloads:[],httpAssets:[]};
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
let server,browser,page;
async function check(name,fn){try{const detail=await fn();report.checks.push({name,status:'passed',...(detail?{detail}:{})});console.log(`PASS ${name}`);}catch(error){report.checks.push({name,status:'failed',error:error.message});throw error;}}
async function serve(){
 const root=path.resolve(repo,option('--site','output/site')),realRoot=await fs.realpath(root);
 const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.md':'text/plain; charset=utf-8'};
 server=http.createServer(async(request,response)=>{try{if(!['GET','HEAD'].includes(request.method)){response.writeHead(405).end();return;}const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);let target=path.resolve(root,`.${pathname}`);let relative=path.relative(root,target);if(relative.startsWith('..')||path.isAbsolute(relative)){response.writeHead(403).end();return;}if((await fs.stat(target)).isDirectory())target=path.join(target,'index.html');const real=await fs.realpath(target);relative=path.relative(realRoot,real);if(relative.startsWith('..')||path.isAbsolute(relative)){response.writeHead(403).end();return;}const bytes=await fs.readFile(real);response.writeHead(200,{'Content-Type':mime[path.extname(real)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});response.end(request.method==='HEAD'?undefined:bytes);}catch{response.writeHead(404).end('Not found');}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});return `http://127.0.0.1:${server.address().port}/`;
}
async function fetchBytes(url){const response=await fetch(url,{signal:AbortSignal.timeout(30000)});assert.equal(response.status,200,`${url}: HTTP ${response.status}`);return Buffer.from(await response.arrayBuffer());}
function matches(actual,expected,format){if(actual.equals(expected))return true;if(format==='preview.jpg')return false;try{const decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});return decoder.decode(actual).replace(/\r\n/g,'\n')===decoder.decode(expected).replace(/\r\n/g,'\n');}catch{return false;}}
async function noOverflow(){assert.deepEqual(await page.evaluate(()=>['html','body','.collection-tools','.case-grid','#preview','#copy-dialog'].flatMap(selector=>[...document.querySelectorAll(selector)].filter(element=>element.clientWidth&&element.scrollWidth>element.clientWidth+1).map(element=>({selector,width:element.clientWidth,scrollWidth:element.scrollWidth})))),[],'Horizontal overflow');}
async function screenshot(name){await page.screenshot({path:path.join(output,name),animations:'disabled'});report.screenshots.push(name);}
async function selectFilter(key,value){const data=key==='theme'?'style':key;await page.locator(`[data-${data}="${value}"]`).click();}
function prompt(markdown){const match=markdown.match(/(?:^|\n)>[ \t]+([^\n]+(?:\n>[ \t]+[^\n]+)*)/);assert.ok(match,'Original user prompt missing');return match[1].replace(/\n>[ \t]+/g,'\n').trim().replace(/\r\n/g,'\n');}
async function copiedBrief(item,original){const name=await page.locator(`#theme option[value="${item.theme}"]`).textContent();return `请使用 MuseDraw 最新版（https://github.com/KanJieTeam/MuseDraw），先读取完整 Skill，采用“${name}”风格。\n${original}`;}
function noDeliveryBoilerplate(text){assert.doesNotMatch(text,/请渲染并看图检查|交付 PNG|Deliver PNG|Do not embed an SVG|not an embedded SVG|不要把 SVG/);}

try{
 const requested=option('--url')||await serve();
 const {chromium}=await import(pathToFileURL(path.resolve(playwright)).href);
 browser=await chromium.launch({headless:true,...(option('--browser')?{executablePath:path.resolve(option('--browser'))}:{})});
 const external=[],errors=[];
 async function observe(context){await context.route('**/*',async route=>{const request=route.request(),url=new URL(request.url());if(url.origin!==new URL(requested).origin&&['http:','https:'].includes(url.protocol)){external.push(request.url());await route.abort();}else{assert.ok(['GET','HEAD'].includes(request.method()),'Static gallery must not call an API');await route.continue();}});context.on('page',opened=>opened.on('pageerror',error=>errors.push(error.message)));}
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true,reducedMotion:'reduce'});await observe(context);page=await context.newPage();
 await page.goto(requested,{waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelectorAll('.case-card').length===100);
 const url=page.url(),catalog=JSON.parse((await fetchBytes(new URL('gallery/catalog.json',url))).toString('utf8'));
 assert.deepEqual(catalog,JSON.parse(await fs.readFile(path.join(repo,'gallery/catalog.json'),'utf8')));
 const items=catalog.items,themes=[...new Set(items.map(item=>item.theme))];assert.equal(items.length,100);assert.equal(themes.length,20);
 const bilingual=JSON.parse((await fetchBytes(new URL('gallery/prompts.json',url))).toString('utf8'));
 assert.deepEqual(bilingual,JSON.parse(await fs.readFile(path.join(repo,'gallery/prompts.json'),'utf8')));
 const styleIndex=JSON.parse((await fetchBytes(new URL('styles.json',url))).toString('utf8'));
 assert.deepEqual(styleIndex,JSON.parse(await fs.readFile(path.join(repo,'assets/gallery/styles.json'),'utf8')));
 report.caseCount=100;report.themeCount=20;
 const assets=new Map(),prompts=new Map();
 await check('all-100-user-cases-published-assets-match-source',async()=>{
  const tasks=items.flatMap(item=>['scene.json','prompt.md','diagram.svg','diagram.drawio','preview.jpg','checks.json'].map(filename=>({item,filename})));
  for(let index=0;index<tasks.length;index+=12)await Promise.all(tasks.slice(index,index+12).map(async({item,filename})=>{const source=`${item.path}/${filename}`;assert.equal(item.path,`gallery/${item.slug}`);const remote=await fetchBytes(new URL(source,url)),local=await fs.readFile(path.join(repo,source));assert.ok(matches(remote,local,filename),`${source}: published content differs from original`);const entry={slug:item.slug,format:filename,bytes:remote.length,sha256:hash(remote)};assets.set(source,entry);report.httpAssets.push(entry);if(filename==='prompt.md'){prompt(remote.toString('utf8'));prompts.set(item.slug,bilingual.items[item.slug].zh);}}));
  return {cases:100,files:600};
 });
 await check('all-100-default-featured-optional-and-decoded-previews',async()=>{
  const displayed=await page.locator('.case-card').evaluateAll(cards=>cards.map(card=>card.dataset.item));assert.deepEqual(displayed,items.map(item=>item.slug));assert.equal(await page.locator('[data-collection="all"]').getAttribute('aria-pressed'),'true');await noOverflow();await screenshot('desktop.png');
  await selectFilter('collection','flagship');assert.deepEqual(await page.locator('.case-card').evaluateAll(cards=>cards.map(card=>card.dataset.item)),items.filter(item=>item.status==='flagship').map(item=>item.slug));await selectFilter('collection','all');assert.equal(await page.locator('.case-card').count(),100);
  for(const item of items){const image=page.locator(`[data-item="${item.slug}"] img`);await image.scrollIntoViewIfNeeded();await image.evaluate(async image=>{await image.decode();if(!image.naturalWidth||!image.naturalHeight)throw Error('Preview did not decode');});}
  return {defaultCases:100,optionalFlagship:20,decodedPreviews:100};
 });
 await check('all-20-theme-filters-retain-catalog-facts',async()=>{
  assert.equal(await page.locator('#theme option').count(),21);
  for(const theme of themes){await selectFilter('theme',theme);const displayed=await page.locator('.case-card').evaluateAll(cards=>cards.map(card=>card.dataset.item));assert.deepEqual(displayed,items.filter(item=>item.theme===theme).map(item=>item.slug));}
  await selectFilter('theme','all');await selectFilter('collection','all');assert.equal(await page.locator('.case-card').count(),100);
 });
 const samples=[items[0],items.find(item=>item.lang==='zh')??items[20],items.at(-1)];
 await check('chinese-styles-search-category-favorites-and-persistence',async()=>{
  assert.equal(await page.locator('#theme option[value="journal"]').textContent(),'科研期刊');
  for(const category of ['research','office','teaching','engineering']){await selectFilter('category',category);assert.deepEqual(await page.locator('.case-card').evaluateAll(cards=>cards.map(card=>card.dataset.item)),items.filter(item=>item.category===category).map(item=>item.slug));}
  await page.locator('#reset-filters').click();await page.locator('#search').fill('科研期刊');assert.equal(await page.locator('.case-card').count(),items.filter(item=>item.theme==='journal').length);
  await page.locator('#search').fill('没有这个图-qa');assert.equal(await page.locator('.case-card').count(),0);assert.equal(await page.locator('#empty').isVisible(),true);
  await page.locator('#reset-filters').click();const item=items[0];await page.locator(`#gallery [data-favorite="${item.slug}"]`).click();assert.equal(await page.locator('#favorite-count').textContent(),'1');await page.locator('#favorites').click();assert.equal(await page.locator('.case-card').count(),1);
  await page.reload({waitUntil:'networkidle'});await page.locator('#favorites').click();assert.equal(await page.locator('.case-card').count(),1);assert.equal(await page.locator('.case-card').getAttribute('data-item'),item.slug);
  await page.locator(`#gallery [data-favorite="${item.slug}"]`).click();assert.equal(await page.locator('.case-card').count(),0);await page.locator('#reset-filters').click();assert.equal(await page.locator('.case-card').count(),100);
 });
 await check('native-clipboard-copies-original-user-prompts',async()=>{
  await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:new URL(url).origin});
  for(const item of samples){await page.evaluate(()=>navigator.clipboard.writeText('QA clipboard marker'));const expected=await copiedBrief(item,prompts.get(item.slug));await page.locator(`#gallery [data-copy="${item.slug}"]`).click();await page.waitForFunction(async expected=>(await navigator.clipboard.readText()).replace(/\r\n/g,'\n')===expected,expected);assert.ok(expected.includes('MuseDraw 最新版'));noDeliveryBoilerplate(expected);assert.ok(expected.includes(prompts.get(item.slug)));}
  return {copiedOriginalPrompts:samples.map(item=>item.slug)};
 });
 await check('denied-clipboard-uses-selected-manual-fallback',async()=>{
  const fallback=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await observe(fallback);await fallback.addInitScript(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(new DOMException('Permission denied','NotAllowedError'))}});document.execCommand=()=>false;});const original=page;
  try{
   page=await fallback.newPage();await page.goto(url,{waitUntil:'networkidle'});const item=items.find(item=>item.status==='flagship'),expected=await copiedBrief(item,prompts.get(item.slug));
   await page.locator(`#gallery [data-copy="${item.slug}"]`).click();await page.locator('#copy-dialog').waitFor({state:'visible'});assert.equal(await page.locator('#copy-text').inputValue(),expected);assert.equal(await page.locator('#copy-text').evaluate(element=>element.selectionEnd-element.selectionStart),expected.length);await noOverflow();await screenshot('mobile-copy-fallback.png');await page.locator('#close-copy').click();
   await page.locator(`#gallery [data-replay="${item.slug}"]`).click();await page.locator('#copy-dialog').waitFor({state:'visible'});noDeliveryBoilerplate(await page.locator('#copy-text').inputValue());await page.keyboard.press('Escape');assert.equal(await page.locator('#copy-dialog').evaluate(element=>element.open),false);
  }finally{await fallback.close();page=original;}
 });
 await check('exact-replay-copies-latest-repository-and-raw-scene',async()=>{
  const item=items[0];await page.locator(`#gallery [data-replay="${item.slug}"]`).click();const text=await page.evaluate(()=>navigator.clipboard.readText());assert.ok(text.includes('仓库最新版'));assert.ok(text.includes(`https://raw.githubusercontent.com/KanJieTeam/MuseDraw/main/gallery/${item.slug}/scene.json`));assert.ok(text.includes('直接渲染'));assert.ok(text.includes('不要要求我提供坐标'));noDeliveryBoilerplate(text);assert.ok(text.split('\n').length<=6);
 });
 await check('PNG-only-copy-expresses-format-without-execution-details',async()=>{
  const item=items[0],expected=(await copiedBrief(item,prompts.get(item.slug)))+'\n只需 PNG。';
  await page.locator(`#gallery [data-fast="${item.slug}"]`).click();
  await page.waitForFunction(async expected=>(await navigator.clipboard.readText()).replace(/\r\n/g,'\n')===expected,expected);
  assert.doesNotMatch(expected,/--no-drawio|--font-mode|npm |musedraw\.mjs/);
  await page.locator(`#gallery [data-preview="${item.slug}"]`).click();
  await page.locator('#preview-details [data-prompt-language="en"]').click();
  await page.locator('#preview-details [data-fast]').click();
  await page.waitForFunction(async text=>(await navigator.clipboard.readText()).endsWith(text),'\nPNG only.');
  await page.locator('#preview-details [data-prompt-language="zh"]').click();
  await page.locator('#close-preview').click();
 });
 await check('svg-preview-zoom-fit-close-and-mobile-layout',async()=>{
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:width===390?844:1000});await selectFilter('collection','flagship');await page.evaluate(()=>window.scrollTo(0,0));await noOverflow();await screenshot(width===390?'mobile.png':'desktop-flagship.png');
   const item=items.find(item=>item.status==='flagship');await page.locator(`[data-preview="${item.slug}"]`).click();await page.locator('#preview-image').evaluate(async image=>{await image.decode();});assert.equal(new URL(await page.locator('#preview-image').getAttribute('src'),url).href,new URL(`${item.path}/diagram.svg`,url).href);
   const transform=()=>page.locator('#preview-image').evaluate(image=>getComputedStyle(image).transform);const initial=await transform();await page.locator('#zoom-in').click();assert.notEqual(await transform(),initial);await page.locator('#fit').click();assert.equal(await transform(),initial);await page.locator('#zoom-out').click();assert.notEqual(await transform(),initial);await page.locator('#fit').click();await noOverflow();await screenshot(width===390?'mobile-preview.png':'desktop-preview.png');await page.locator('#close-preview').click();await page.locator(`[data-preview="${item.slug}"]`).click();await page.keyboard.press('Escape');assert.equal(await page.locator('#preview').evaluate(element=>element.open),false);
  }
 });
 await check('preview-details-retain-prompt-actions-and-downloads',async()=>{
  await selectFilter('collection','all');const item=items[0];await page.locator(`#gallery [data-preview="${item.slug}"]`).click();await page.waitForFunction(expected=>document.querySelector('.detail-prompt').textContent===expected,prompts.get(item.slug));
  for(const filename of ['diagram.drawio','diagram.svg','scene.json'])assert.equal(await page.locator(`#preview-details a[download][href="${item.path}/${filename}"]`).count(),1);
  const expected=await copiedBrief(item,prompts.get(item.slug));await page.locator(`#preview-details [data-copy="${item.slug}"]`).click();await page.waitForFunction(async expected=>(await navigator.clipboard.readText()).replace(/\r\n/g,'\n')===expected,expected);
  await page.locator(`#preview-details [data-replay="${item.slug}"]`).click();await page.waitForFunction(async expected=>(await navigator.clipboard.readText()).includes(expected),`https://raw.githubusercontent.com/KanJieTeam/MuseDraw/main/gallery/${item.slug}/scene.json`);await page.locator('#close-preview').click();
 });
 await check('real-drawio-svg-and-scene-downloads-match-published-bytes',async()=>{
  await selectFilter('collection','all');for(const item of [items[0],items.at(-1)])for(const filename of ['diagram.drawio','diagram.svg','scene.json']){
   const source=`${item.path}/${filename}`,locator=page.locator(`[data-item="${item.slug}"] a[download][href="${source}"]`);const [download]=await Promise.all([page.waitForEvent('download'),locator.click()]);assert.equal(await download.failure(),null);const target=path.join(scratch,`download-${report.downloads.length}-${filename}`);await download.saveAs(target);const bytes=await fs.readFile(target);assert.equal(hash(bytes),assets.get(source).sha256);report.downloads.push({source,filename:download.suggestedFilename(),bytes:bytes.length,sha256:hash(bytes)});
  }return {byteExactDownloads:6,formats:['drawio','svg','json']};
 });
 await check('restored-web-gallery-navigation-sharing-install-and-legacy-entry',async()=>{
  await page.setViewportSize({width:1440,height:1000});await page.locator('#reset-filters').click();assert.equal(await page.locator('#style-options [data-style]').count(),21);
  for(const theme of themes)assert.equal(await page.locator(`[data-style="${theme}"] .swatches i`).count(),styleIndex[theme].swatches.length);
  await page.locator('#gallery [data-preview]').first().click();const first=await page.locator('#preview-title').textContent();await page.locator('#next').click();assert.notEqual(await page.locator('#preview-title').textContent(),first);await page.locator('#previous').click();assert.equal(await page.locator('#preview-title').textContent(),first);
  await page.keyboard.press('ArrowRight');assert.notEqual(await page.locator('#preview-title').textContent(),first);await page.keyboard.press('ArrowLeft');assert.equal(await page.locator('#preview-title').textContent(),first);
  await page.locator('#preview-details [data-share]').click();const shared=await page.evaluate(()=>navigator.clipboard.readText());assert.ok(shared.includes(`#${items[0].slug}`));await page.reload({waitUntil:'networkidle'});await page.locator('#preview[open]').waitFor();assert.equal(await page.locator('#preview-title').textContent(),first);await page.locator('#close-preview').click();assert.equal(new URL(page.url()).hash,'');
  await page.locator('#install').click();assert.equal(await page.locator('#install-dialog').evaluate(el=>el.open),true);await page.locator('#copy-install').click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'npx skills add KanJieTeam/MuseDraw');await page.locator('#close-install').click();await page.keyboard.press('/');assert.equal(await page.locator('#search').evaluate(el=>el===document.activeElement),true);await page.locator('#search').blur();
  await page.goto(new URL('docs/gallery/',url).href,{waitUntil:'networkidle'});assert.equal(new URL(page.url()).pathname,new URL(url).pathname);await page.locator('.case-card').first().waitFor();
 });
 await check('bilingual-prompts-preview-clipboard-replay-and-preference',async()=>{
  const item=items[0];await page.locator(`#gallery [data-preview="${item.slug}"]`).click();
  await page.locator('#preview-details [data-prompt-language="en"]').click();await page.waitForFunction(expected=>document.querySelector('.detail-prompt').textContent===expected,bilingual.items[item.slug].en);await page.locator('#preview-details [data-copy]').click();await page.waitForFunction(async expected=>(await navigator.clipboard.readText()).includes(expected),bilingual.items[item.slug].en);const en=await page.evaluate(()=>navigator.clipboard.readText());assert.ok(en.includes('Use the latest MuseDraw'));noDeliveryBoilerplate(en);
  await page.locator('#preview-details [data-replay]').click();await page.waitForFunction(async()=>(await navigator.clipboard.readText()).startsWith('Reproduce this MuseDraw'));noDeliveryBoilerplate(await page.evaluate(()=>navigator.clipboard.readText()));await page.reload({waitUntil:'networkidle'});await page.locator('#preview[open]').waitFor();await page.waitForFunction(expected=>document.querySelector('.detail-prompt').textContent===expected,bilingual.items[item.slug].en);await screenshot('english-prompt.png');
  await page.locator('#preview-details [data-prompt-language="zh"]').click();await page.waitForFunction(expected=>document.querySelector('.detail-prompt').textContent===expected,bilingual.items[item.slug].zh);await page.locator('#preview-details [data-copy]').click();await page.waitForFunction(async expected=>(await navigator.clipboard.readText()).includes(expected),bilingual.items[item.slug].zh);assert.ok((await page.evaluate(()=>navigator.clipboard.readText())).startsWith('请使用 MuseDraw 最新版'));await page.locator('#close-preview').click();
 });
 await check('readable-type-and-prefilled-style-request-entrypoints',async()=>{
  const inspectLink=async(selector,expected=[])=>{const node=page.locator(selector),target=new URL(await node.getAttribute('href'));assert.equal(target.origin,'https://github.com');assert.equal(target.pathname,'/KanJieTeam/MuseDraw/issues/new');assert.equal(target.searchParams.get('template'),'style-request.md');assert.ok(target.searchParams.get('title').startsWith('[Style request]'));for(const text of expected)assert.ok(target.searchParams.get('body').includes(text),text);assert.equal(await node.getAttribute('target'),'_blank');assert.ok((await node.getAttribute('rel')).includes('noopener'));assert.ok((await node.getAttribute('rel')).includes('noreferrer'));return target;};
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:width===390?844:1000});await page.locator('#reset-filters').click();assert.equal(await page.locator('.case-card').count(),100);
   for(const [selector,min]of [['.style-option strong',14],['.case-heading h2',16],['.case-meta',12],['.case-info>.case-actions button',13],['.case-info>.downloads',13],['.prompt-language button',14]])assert.ok(await page.locator(selector).first().evaluate((node,min)=>parseFloat(getComputedStyle(node).fontSize)>=min,min),`${width}px: ${selector} too small`);
   await inspectLink('#request-top',['所有风格']);await inspectLink('#request-style',['全部作品']);await page.locator('#request-style').scrollIntoViewIfNeeded();await noOverflow();await screenshot(width===390?'mobile-request.png':'desktop-request.png');
   await selectFilter('theme','editorial');await selectFilter('category','engineering');await page.locator('#search').fill('private-brief-not-for-github');assert.equal(await page.locator('#empty').isVisible(),true);const request=await inspectLink('#request-empty',['纸墨编辑','工程']);assert.ok(!request.href.includes('private-brief-not-for-github'));assert.ok(!request.searchParams.get('body').includes('private-brief-not-for-github'));
   await page.locator('#reset-filters').click();const item=items[0];await page.locator(`#gallery [data-preview="${item.slug}"]`).click();await page.waitForFunction(()=>document.querySelector('.detail-prompt')?.textContent.length>30);assert.ok(await page.locator('.detail-prompt').evaluate(node=>parseFloat(getComputedStyle(node).fontSize)>=16));await inspectLink('#request-detail',[item.title,`#${item.slug}`]);await page.locator('#preview-details').evaluate(node=>{node.scrollTop=node.scrollHeight;});await noOverflow();await screenshot(width===390?'mobile-readable-detail.png':'desktop-readable-detail.png');await page.locator('#close-preview').click();
  }
  await page.locator('.collection-caption [data-prompt-language="en"]').click();await inspectLink('#request-style',['What would you like to draw','All examples']);await page.locator('.collection-caption [data-prompt-language="zh"]').click();
 });
 await check('static-gallery-has-no-external-network-or-runtime-errors',async()=>{assert.deepEqual(external,[]);assert.deepEqual(errors,[]);assert.equal(await page.locator('iframe').count(),0);});
 await check('lightweight-skill-download-has-matching-manifest',async()=>{
  const manifest=JSON.parse((await fetchBytes(new URL('downloads/musedraw-skill.json',url))).toString('utf8'));
  const bytes=await fetchBytes(new URL('downloads/musedraw-skill.zip',url));
  assert.equal(bytes.length,manifest.bytes);assert.equal(hash(bytes),manifest.sha256);
  assert.ok(bytes.length<1024*1024);assert.equal(bytes.readUInt32LE(0),0x04034b50);
  assert.equal(await page.locator('#download-skill').getAttribute('href'),'downloads/musedraw-skill.zip');
 });
 report.status='passed';console.log(`Gallery browser QA passed: ${report.checks.length} checks; 100 cases, 20 themes, 6 byte-exact downloads.`);
}catch(error){report.status='failed';report.error=error.message;if(page&&!page.isClosed())await screenshot('failure.png').catch(()=>{});console.error(error.stack);process.exitCode=1;}
finally{await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));const real=await fs.realpath(scratch).catch(()=>null),temp=await fs.realpath(os.tmpdir()),relative=real&&path.relative(temp,real);assert.ok(real===scratchReal&&relative&&!relative.startsWith('..')&&!path.isAbsolute(relative)&&path.basename(scratch).startsWith('musedraw-gallery-qa-'),'Refusing an unverified scratch cleanup');await fs.rm(scratch,{recursive:true,force:true});}
