const $=id=>document.getElementById(id);
const response=await fetch('gallery/catalog.json');
if(!response.ok)throw Error('作品目录加载失败，请刷新重试');
const {items}=await response.json();
const statuses={flagship:'精选',reviewed:'已审阅',preview:'待审阅',planned:'计划中'};
const categories={engineering:'工程',research:'科研',office:'办公',teaching:'教学'};
const themeNames={journal:'科研期刊',editorial:'纸墨编辑',newsprint:'报刊黑白',enterprise:'商务墨蓝','ink-wash':'水墨宣纸',pastel:'柔和笔记',terracotta:'暖陶',whiteboard:'白板手绘',chalkboard:'黑板教学',swiss:'瑞士海报',bauhaus:'包豪斯',metro:'地铁线路',product:'产品发布',c4:'C4 标准',blueprint:'工程蓝图',terminal:'终端暗色',observatory:'观测夜空',aurora:'极光玻璃',riso:'孔版套印',neon:'霓虹街机'};
const topics={流程:'flow process pipeline workflow prisma consort',架构:'architecture rag kubernetes microservices system',计划:'roadmap gantt timeline plan strategy',审批:'procurement approval expense',科研:'study research experiment clinical literature sem mediation',教学:'lesson classroom curriculum',项目:'project roadmap milestone',思维导图:'mindmap',鱼骨:'fishbone',客户:'customer journey',风险:'risk',组织:'organization org',时间:'timeline gantt',数据:'data observability streaming'};
const themes=[...new Set(items.map(item=>item.theme))].sort((a,b)=>(themeNames[a]??a).localeCompare(themeNames[b]??b,'zh-CN'));
for(const theme of themes){const option=document.createElement('option');option.value=theme;option.textContent=themeNames[theme]??theme;$('theme').append(option);}
const savedKey='musedraw-favorites-v3';
let favorites=new Set();
try{const saved=JSON.parse(localStorage.getItem(savedKey)??'[]');if(Array.isArray(saved))favorites=new Set(saved.filter(slug=>items.some(item=>item.slug===slug)));}catch{}
let onlyFavorites=false,activeItem=null,toastTimer;
function element(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
function button(text,data,value,className=''){const node=element('button',className,text);node.type='button';node.dataset[data]=value;return node;}
function link(text,href,download=false){const a=element('a','',text);a.href=href;if(download)a.setAttribute('download','');return a;}
function toast(text){$('status').textContent=text;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('status').textContent='',3200);}
function favoriteButton(item){const saved=favorites.has(item.slug),node=button(saved?'♥':'♡','favorite',item.slug,'favorite-button');node.setAttribute('aria-label',`${saved?'取消收藏':'收藏'} ${item.title}`);node.setAttribute('aria-pressed',String(saved));return node;}
function downloads(item){const node=element('div','downloads');for(const [label,file]of [['drawio','diagram.drawio'],['SVG','diagram.svg'],['场景','scene.json']])node.append(link(label,`${item.path}/${file}`,true));node.append(link('原始需求',`${item.path}/prompt.md`));return node;}
function actions(item){const node=element('div','case-actions');node.append(button('复制简短需求','copy',item.slug,'copy-button'),button('原样复刻','replay',item.slug,'replay-button'));return node;}
function card(item){
 const article=element('article','case-card');article.dataset.item=item.slug;
 const art=button('','preview',item.slug,'case-art');art.setAttribute('aria-label',`放大查看 ${item.title}`);
 const image=element('img');image.src=`${item.path}/preview.jpg`;image.alt=item.title;image.loading='lazy';art.append(image,element('span','art-hint','查看大图与详情 ↗'));
 const info=element('div','case-info'),meta=element('div','case-meta');meta.append(element('span','',`${categories[item.category]??item.category} · ${themeNames[item.theme]??item.theme}`),element('span','',statuses[item.status]??item.status));
 const heading=element('div','case-heading');heading.append(element('h2','',item.title),favoriteButton(item));
 info.append(meta,heading,element('p','case-description',item.subtitle),actions(item),downloads(item));article.append(art,info);return article;
}
function searchMatches(item,query){
 const haystack=[item.title,item.subtitle,item.slug,item.theme,themeNames[item.theme],item.category,categories[item.category],...(item.blocks??[])].join(' ').toLowerCase();
 return query.split(/\s+/).filter(Boolean).every(term=>haystack.includes(term)||(topics[term]??'').split(' ').filter(Boolean).some(word=>haystack.includes(word)));
}
function render(){
 const theme=$('theme').value,collection=$('collection').value,category=$('category').value,query=$('search').value.trim().toLowerCase();
 const shown=items.filter(item=>(collection==='all'||item.status==='flagship')&&(theme==='all'||item.theme===theme)&&(category==='all'||item.category===category)&&(!onlyFavorites||favorites.has(item.slug))&&searchMatches(item,query));
 $('gallery').replaceChildren(...shown.map(card));$('count').textContent=`${shown.length} 件作品${onlyFavorites?' · 我的收藏':''}`;$('empty').hidden=shown.length>0;
 $('favorite-count').textContent=String(favorites.size);$('favorites').setAttribute('aria-pressed',String(onlyFavorites));
}
function showAll(){if($('search').value.trim()||$('category').value!=='all'||$('theme').value!=='all'||onlyFavorites)$('collection').value='all';render();}
$('collection').addEventListener('change',render);
for(const id of ['theme','category'])$(id).addEventListener('change',showAll);
$('search').addEventListener('input',showAll);
$('favorites').addEventListener('click',()=>{onlyFavorites=!onlyFavorites;showAll();});
$('reset-filters').addEventListener('click',()=>{$('search').value='';$('theme').value=$('category').value='all';$('collection').value='all';onlyFavorites=false;render();});
window.addEventListener('storage',event=>{if(event.key!==savedKey)return;try{const saved=JSON.parse(event.newValue??'[]');if(Array.isArray(saved)){favorites=new Set(saved.filter(slug=>items.some(item=>item.slug===slug)));render();if(activeItem)updateDetails(activeItem);}}catch{}});
render();
const promptCache=new Map();
async function promptFor(item){if(promptCache.has(item.slug))return promptCache.get(item.slug);const response=await fetch(`${item.path}/prompt.md`);if(!response.ok)throw Error('需求加载失败，请稍后重试');const markdown=await response.text();const match=markdown.match(/(?:^|\n)>[ \t]+([^\n]+(?:\n>[ \t]+[^\n]+)*)/);if(!match)throw Error('没有找到作品需求');const prompt=match[1].replace(/\n>[ \t]+/g,'\n').trim();promptCache.set(item.slug,prompt);return prompt;}
function briefFor(item,prompt){return `请使用 MuseDraw 最新版（https://github.com/KanJieTeam/MuseDraw），先读取完整 Skill，采用“${themeNames[item.theme]??item.theme}”风格。\n${prompt}\n请渲染并看图检查，交付 PNG 和可逐个编辑文字、图形与连线的原生 .drawio 文件，不要把 SVG 或截图嵌入 drawio。`;}
function replayFor(item){return `请使用 MuseDraw 仓库最新版，原样复刻“${item.title}”。\n仓库：https://github.com/KanJieTeam/MuseDraw（先读取完整 Skill）\n完整场景：https://raw.githubusercontent.com/KanJieTeam/MuseDraw/main/gallery/${item.slug}/scene.json\n下载场景，保留内容、布局与“${themeNames[item.theme]??item.theme}”主题，用仓库 scene 引擎直接渲染，不要要求我提供坐标。\n查看 PNG 和版面检查，交付 PNG 与可逐个编辑文字、图形和连线的原生 .drawio 文件，不要把 SVG 或截图嵌入 drawio。`;}
async function copyText(text,title,message){try{await navigator.clipboard.writeText(text);toast(message);}catch{$('copy-title').textContent=title;$('copy-text').value=text;if(!$('copy-dialog').open)$('copy-dialog').showModal();$('copy-text').focus();$('copy-text').select();}}
async function updateDetails(item){
 const details=$('preview-details');details.replaceChildren();
 const meta=element('p','detail-meta',`${categories[item.category]} · ${themeNames[item.theme]} · ${statuses[item.status]}`);
 const title=element('div','detail-heading');title.append(element('h3','','这张图怎么用'),favoriteButton(item));
 const prompt=element('p','detail-prompt','正在加载简短需求…');details.append(meta,title,element('p','detail-description',item.subtitle),element('h4','','简短需求'),prompt,actions(item),element('h4','','下载与编辑'),downloads(item),element('p','detail-note','简短需求适合改成自己的内容；原样复刻会提供完整场景地址。drawio 可逐个编辑图形，场景用于引擎重渲染，两种编辑方式暂不自动同步。'));
 try{const text=await promptFor(item);if(activeItem?.slug===item.slug)prompt.textContent=text;}catch(error){prompt.textContent=error.message;}
}
async function handleAction(event){
 const target=event.target.closest('[data-copy],[data-replay],[data-preview],[data-favorite]');if(!target)return;
 const slug=target.dataset.copy??target.dataset.replay??target.dataset.preview??target.dataset.favorite,item=items.find(item=>item.slug===slug);if(!item)return;
 if(target.dataset.favorite){if(favorites.has(slug))favorites.delete(slug);else favorites.add(slug);try{localStorage.setItem(savedKey,JSON.stringify([...favorites]));}catch{toast('当前浏览器无法保存收藏，暂保留在本页');}render();if(activeItem)updateDetails(activeItem);return;}
 if(target.dataset.copy){try{await copyText(briefFor(item,await promptFor(item)),'复制简短需求','已复制简短需求，换成你的内容即可');}catch(error){toast(error.message);}return;}
 if(target.dataset.replay){await copyText(replayFor(item),'原样复刻这张图','已复制复刻说明，发给智能体即可');return;}
 activeItem=item;$('preview-title').textContent=item.title;$('preview-image').alt=item.title;$('preview').showModal();$('preview-image').src=`${item.path}/diagram.svg`;if($('preview-image').complete)fit();updateDetails(item);
}
$('gallery').addEventListener('click',handleAction);$('preview-details').addEventListener('click',handleAction);
$('close-copy').addEventListener('click',()=>$('copy-dialog').close());
$('close-preview').addEventListener('click',()=>$('preview').close());
$('preview').addEventListener('close',()=>{activeItem=null;drag=null;});
let scale=1,x=0,y=0,drag;
function update(){$('preview-image').style.transform=`translate(-50%,-50%) translate(${x}px,${y}px) scale(${scale})`;}
function fit(){const image=$('preview-image'),view=$('viewport');if(!image.naturalWidth)return;scale=Math.min(1,(view.clientWidth-24)/image.naturalWidth,(view.clientHeight-24)/image.naturalHeight);x=y=0;update();}
$('preview-image').addEventListener('load',fit);
$('zoom-in').addEventListener('click',()=>{scale=Math.min(8,scale*1.25);update();});
$('zoom-out').addEventListener('click',()=>{scale=Math.max(.02,scale/1.25);update();});
$('fit').addEventListener('click',fit);
window.addEventListener('resize',()=>{if($('preview').open)fit();});
$('viewport').addEventListener('wheel',event=>{event.preventDefault();scale=Math.min(8,Math.max(.02,scale*(event.deltaY<0?1.15:1/1.15)));update();},{passive:false});
$('viewport').addEventListener('pointerdown',event=>{drag={id:event.pointerId,x:event.clientX,y:event.clientY,ox:x,oy:y};event.currentTarget.setPointerCapture(event.pointerId);});
$('viewport').addEventListener('pointermove',event=>{if(drag&&event.pointerId===drag.id){x=drag.ox+event.clientX-drag.x;y=drag.oy+event.clientY-drag.y;update();}});
for(const name of ['pointerup','pointercancel'])$('viewport').addEventListener(name,()=>{drag=null;});
