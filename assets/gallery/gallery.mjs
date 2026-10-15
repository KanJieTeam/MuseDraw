const $=id=>document.getElementById(id);
const response=await fetch('gallery/catalog.json');
if(!response.ok)throw Error('作品目录加载失败');
const catalog=await response.json();
const items=catalog.items;
const statuses={flagship:'精选',reviewed:'已审阅',preview:'待审阅',planned:'计划中'};
const categories={engineering:'工程',research:'科研',office:'办公',teaching:'教学'};
const themes=[...new Set(items.map(item=>item.theme))].sort();
for(const theme of themes){const option=document.createElement('option');option.value=theme;option.textContent=theme;$('theme').append(option);}
function element(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
function link(text,href,download=false){const a=element('a','',text);a.href=href;if(download)a.setAttribute('download','');return a;}
function card(item){
 const article=element('article','case-card');article.dataset.item=item.slug;
 const art=element('button','case-art');art.type='button';art.dataset.preview=item.slug;art.setAttribute('aria-label',`放大查看 ${item.title}`);
 const image=element('img');image.src=`${item.path}/preview.jpg`;image.alt=item.title;image.loading='lazy';art.append(image);
 const info=element('div','case-info'),meta=element('div','case-meta');meta.append(element('span','',`${categories[item.category]??item.category} · ${item.theme}`),element('span','',statuses[item.status]??item.status));
 info.append(meta,element('h2','',item.title),element('p','case-description',item.subtitle));
 const actions=element('div','case-actions'),copy=element('button','copy-button','复制需求 →');copy.type='button';copy.dataset.copy=item.slug;
 const downloads=element('div','downloads');downloads.append(link('SVG',`${item.path}/diagram.svg`,true),link('场景 JSON',`${item.path}/scene.json`,true),link('提示与复刻',`${item.path}/prompt.md`));
 actions.append(copy,downloads);info.append(actions);article.append(art,info);return article;
}
function render(){
 const theme=$('theme').value,collection=$('collection').value;
 const shown=items.filter(item=>(collection==='all'||item.status==='flagship')&&(theme==='all'||item.theme===theme));
 $('gallery').replaceChildren(...shown.map(card));$('count').textContent=`${shown.length} 件作品 · ${themes.length} 种主题`;$('empty').hidden=shown.length>0;
}
$('collection').addEventListener('change',render);
$('theme').addEventListener('change',()=>{if($('theme').value!=='all')$('collection').value='all';render();});
render();
const promptCache=new Map();
async function promptFor(item){if(promptCache.has(item.slug))return promptCache.get(item.slug);const response=await fetch(`${item.path}/prompt.md`);if(!response.ok)throw Error('提示词加载失败');const markdown=await response.text();const match=markdown.match(/(?:^|\n)>[ \t]+([^\n]+(?:\n>[ \t]+[^\n]+)*)/);if(!match)throw Error('没有找到作品需求');const prompt=match[1].replace(/\n>[ \t]+/g,'\n').trim();promptCache.set(item.slug,prompt);return prompt;}
let toastTimer;
function toast(text){$('status').textContent=text;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('status').textContent='',3000);}
$('gallery').addEventListener('click',async event=>{
 const copy=event.target.closest('[data-copy]');
 if(copy){const item=items.find(item=>item.slug===copy.dataset.copy);try{const text=await promptFor(item);try{await navigator.clipboard.writeText(text);toast('已复制需求，换成你的内容即可');}catch{$('copy-text').value=text;$('copy-dialog').showModal();$('copy-text').focus();$('copy-text').select();}}catch(error){toast(error.message);}return;}
 const preview=event.target.closest('[data-preview]');if(preview){const item=items.find(item=>item.slug===preview.dataset.preview);$('preview-title').textContent=item.title;$('preview-image').alt=item.title;$('preview').showModal();$('preview-image').src=`${item.path}/diagram.svg`;if($('preview-image').complete)fit();}
});
$('close-copy').addEventListener('click',()=>$('copy-dialog').close());
$('close-preview').addEventListener('click',()=>$('preview').close());
let scale=1,x=0,y=0,drag;
function update(){$('preview-image').style.transform=`translate(-50%,-50%) translate(${x}px,${y}px) scale(${scale})`;}
function fit(){const image=$('preview-image'),view=$('viewport');if(!image.naturalWidth)return;scale=Math.min(1,(view.clientWidth-24)/image.naturalWidth,(view.clientHeight-24)/image.naturalHeight);x=y=0;update();}
$('preview-image').addEventListener('load',fit);
$('zoom-in').addEventListener('click',()=>{scale=Math.min(8,scale*1.25);update();});
$('zoom-out').addEventListener('click',()=>{scale=Math.max(.02,scale/1.25);update();});
$('fit').addEventListener('click',fit);
$('viewport').addEventListener('wheel',event=>{event.preventDefault();scale=Math.min(8,Math.max(.02,scale*(event.deltaY<0?1.15:1/1.15)));update();},{passive:false});
$('viewport').addEventListener('pointerdown',event=>{drag={id:event.pointerId,x:event.clientX,y:event.clientY,ox:x,oy:y};event.currentTarget.setPointerCapture(event.pointerId);});
$('viewport').addEventListener('pointermove',event=>{if(drag&&event.pointerId===drag.id){x=drag.ox+event.clientX-drag.x;y=drag.oy+event.clientY-drag.y;update();}});
for(const name of ['pointerup','pointercancel'])$('viewport').addEventListener(name,()=>{drag=null;});
