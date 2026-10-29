#!/usr/bin/env node
// Inspect a semantic decision card or emit its small editable geometry study.
// This does not lay out a new brief or score its aesthetics.
import fs from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const catalog=JSON.parse(await fs.readFile(path.join(root,'references/relation-operations.json'),'utf8'));
const [command,id,...args]=process.argv.slice(2);
const usage='relation-study.mjs list | show <id> | emit <id> --theme <theme> --out <new-directory>';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
try{
 if(command==='list'){
  if(id||args.length)throw Error(usage);
  console.log(JSON.stringify(catalog,null,2));
 }else{
  const card=catalog.operations.find(c=>c.id===id);
  if(!card||!['show','emit'].includes(command))throw Error(usage);
  if(command==='show'){
   if(args.length)throw Error(usage);
   console.log(JSON.stringify(card,null,2));
  }else{
   const options={};
   for(let i=0;i<args.length;i+=2){
    const key=args[i];
    if(!['--theme','--out'].includes(key)||!args[i+1]||options[key])throw Error(usage);
    options[key]=args[i+1];
   }
   if(!options['--out'])throw Error('A new --out directory is required.');
   const theme=options['--theme']||'journal';
   if(!/^[a-z0-9-]+$/.test(theme))throw Error('Expected a local theme ID.');
   const themeData=JSON.parse(await fs.readFile(path.join(root,'themes',theme+'.json'),'utf8'));
   const palette=themeData.palette;
   const colour=(key,fallback)=>{
    const value=palette[key]||fallback;
    if(!/^#[0-9a-f]{3,8}$/i.test(value))throw Error('Expected a literal theme colour.');
    return value;
   };
   const ink=colour('ink','#172031'),bg=colour('bg','#fff'),accent=colour('accent','#315de6');
   const blue=colour('blue',accent),red=colour('red',accent),yellow=colour('yellow',accent);
   const text=(x,y,label,size=18,fill=ink)=>`<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="${size}" fill="${fill}">${escape(label)}</text>`;
   const rect=(x,y,w,h,fill='none',stroke=ink,sw=2)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
   const line=(d,c=ink,w=2,arrow=false)=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}"${arrow?' marker-end="url(#arrow)"':''}/>`;
   let body='';
   if(id==='joint-surface'){
    body=rect(195,62,405,226)+text(220,94,'Shared result surface',19);
    for(const [i,c]of[red,blue,yellow].entries()){
     const y=137+i*56;
     body+=text(25,y+6,['Judgement','Conception','Orchestration'][i],17)+line(`M 185 ${y} H 574`,c,8)+`<circle cx="576" cy="${y}" r="5" fill="${c}"/>`;
    }
   }else if(id==='converge'){
    body=rect(405,119,190,100)+text(430,175,'One receiver',20);
    for(const[i,c]of[red,blue,yellow].entries()){
     const y=80+i*90;
     body+=text(30,y+6,'Input '+String.fromCharCode(65+i),18)+line(`M 130 ${y} C 280 ${y} 290 169 394 169`,c,4,true);
    }
   }else if(id==='scope-field'){
    body=rect(30,78,580,210,'none',accent)+text(52,111,'Shared requirement / scope',18,accent);
    for(const[i,label]of['Decide','Make','Check'].entries()){
     const x=55+i*190;
     body+=rect(x,155,150,80,bg)+text(x+20,202,label,20);
    }
   }else if(id==='choice-rejoin'){
    body=rect(20,125,100,78)+text(32,170,'Proposal',19)+text(167,38,'Choose or combine',18);
    body+=line('M 120 164 H 155 M 155 72 V 256');
    for(const[i,label]of['Route A','Route B','Route C'].entries()){
     const y=72+i*92;
     body+=rect(192,y-26,135,52,bg)+text(209,y+7,label)+line(`M 155 ${y} H 192 M 327 ${y} H 364`);
    }
    body+=line('M 364 72 V 256 M 364 164 H 416',ink,2,true)+rect(427,125,188,78)+text(445,170,'Shared check',20);
   }else if(id==='feedback-target'){
    body=rect(30,90,175,80)+text(50,136,'Decision',20)+rect(400,90,190,80)+text(420,136,'Outcome',20)+line('M 205 130 H 389',ink,3,true);
    body+=rect(190,242,220,70)+text(214,284,'Updated resource',20)+line('M 500 170 V 277 H 421',accent,2,true)+line('M 190 277 H 118 V 181',accent,2,true)+text(430,225,'updates',16,accent)+text(30,233,'informs next',16,accent);
   }else if(id==='sequence'){
    for(const[i,label]of['Receive','Process','Deliver'].entries()){
     const x=32+i*204;
     body+=rect(x,126,164,88,bg)+text(x+22,178,label,21);
     if(i<2)body+=line(`M ${x+164} 170 H ${x+192}`,ink,3,true);
    }
   }else if(id==='matched-change'){
    for(let i=0;i<2;i++){
     const x=60+i*320;
     body+=text(x,70,i?'Condition B':'Condition A',20)+rect(x,110,200,130,bg)+line(`M ${x+30} 210 H ${x+170}`,ink,3)+`<circle cx="${x+100}" cy="165" r="26" fill="${i?accent:'none'}" stroke="${ink}" stroke-width="2"/>`;
    }
    body+=text(95,295,'Schematic change; no measured magnitude',17);
   }
   const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" data-theme="${escape(theme)}"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="${ink}"/></marker></defs>${rect(0,0,640,360,bg,'none',0)}${body}</svg>`;
   const out=path.resolve(options['--out']);
   // Never overwrite a user's existing drawing or follow an existing output link.
   await fs.mkdir(path.dirname(out),{recursive:true});
   await fs.mkdir(out);
   await fs.writeFile(path.join(out,'study.svg'),svg+'\n');
   await fs.writeFile(path.join(out,'scene.json'),JSON.stringify({type:'vector',theme,size:[640,360],nativeSvg:svg},null,2)+'\n');
   await fs.writeFile(path.join(out,'decision.json'),JSON.stringify({status:catalog.status,...card,theme,scope:'Small editable semantic study, not a layout for arbitrary content.'},null,2)+'\n');
   await fs.writeFile(path.join(out,'index.html'),`<!doctype html><meta charset="utf-8"><title>${escape(id)}</title><style>body{margin:0}svg{display:block;width:100%;max-width:640px;height:auto}</style>${svg}\n`);
   console.log(JSON.stringify({id,theme,out,files:['study.svg','scene.json','decision.json','index.html']}));
  }
 }
}catch(error){console.error(error.message);process.exitCode=1;}
