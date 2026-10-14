const $=id=>document.getElementById(id);
const response=await fetch('manifest.json');
if(!response.ok)throw Error('Style information unavailable');
const manifest=await response.json();
const prompts=Object.fromEntries(manifest.items.map(item=>[item.id,`使用 https://github.com/KanJieTeam/MuseDraw 最新版。\n${item.prompt}\n输出图片，并保存可继续修改的文档。`]));
let timer;
for(const button of document.querySelectorAll('[data-copy-style]'))button.addEventListener('click',async()=>{
 const text=prompts[button.dataset.copyStyle];
 try{await navigator.clipboard.writeText(text);$('status').textContent='已复制，把需求改成你的内容即可';clearTimeout(timer);timer=setTimeout(()=>$('status').textContent='',3500);}
 catch{$('copy-text').value=text;$('copy-dialog').showModal();$('copy-text').focus();$('copy-text').select();}
});
$('close-copy').addEventListener('click',()=>$('copy-dialog').close());
let scale=1,x=0,y=0,drag;
const update=()=>{$('preview-image').style.transform=`translate(-50%,-50%) translate(${x}px,${y}px) scale(${scale})`;};
const fit=()=>{const image=$('preview-image'),view=$('viewport');scale=Math.min(1,(view.clientWidth-32)/image.naturalWidth,(view.clientHeight-32)/image.naturalHeight);x=y=0;update();};
$('preview-image').addEventListener('load',fit);
for(const button of document.querySelectorAll('[data-preview]'))button.addEventListener('click',()=>{
 const sketch=button.dataset.preview==='sketch';$('preview-title').textContent=sketch?'手绘线稿':'终端色域';$('preview-image').alt=$('preview-title').textContent;$('preview').showModal();$('preview-image').src=`examples/${sketch?'sketch':'planes'}/diagram.svg`;if($('preview-image').complete)fit();
});
$('close-preview').addEventListener('click',()=>$('preview').close());
$('zoom-in').addEventListener('click',()=>{scale=Math.min(8,scale*1.25);update();});
$('zoom-out').addEventListener('click',()=>{scale=Math.max(.05,scale/1.25);update();});
$('fit').addEventListener('click',fit);
$('viewport').addEventListener('wheel',event=>{event.preventDefault();scale=Math.max(.05,Math.min(8,scale*(event.deltaY<0?1.15:1/1.15)));update();},{passive:false});
$('viewport').addEventListener('pointerdown',event=>{drag={id:event.pointerId,x:event.clientX,y:event.clientY,ox:x,oy:y};event.currentTarget.setPointerCapture(event.pointerId);});
$('viewport').addEventListener('pointermove',event=>{if(drag&&event.pointerId===drag.id){x=drag.ox+event.clientX-drag.x;y=drag.oy+event.clientY-drag.y;update();}});
for(const name of ['pointerup','pointercancel'])$('viewport').addEventListener(name,()=>{drag=null;});
