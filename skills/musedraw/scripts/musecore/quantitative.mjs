import {number} from './visual-tools.mjs';
export function linearScale(domain,range){
 domain.forEach(v=>number(v,'scale domain'));range.forEach(v=>number(v,'scale range'));
 if(domain[1]<=domain[0])throw Error('Scale domain must increase');
 return value=>range[0]+(value-domain[0])/(domain[1]-domain[0])*(range[1]-range[0]);
}
export function niceDomain(values,{zero=true,steps=5}={}){
 if(!values.length)throw Error('No values for numeric domain');values.forEach(v=>number(v,'scale value'));
 let min=Math.min(...values),max=Math.max(...values);if(zero){min=Math.min(0,min);max=Math.max(0,max)}if(min===max){min-=min===0?0:Math.abs(min)*.1;max+=Math.max(1,Math.abs(max)*.1)}
 const raw=(max-min)/steps,base=10**Math.floor(Math.log10(raw)),n=raw/base,step=(n<=1?1:n<=2?2:n<=5?5:10)*base;
 const low=Math.floor(min/step)*step,high=Math.ceil(max/step)*step,ticks=[];for(let i=0;i<=Math.round((high-low)/step);i++)ticks.push(Number((low+i*step).toPrecision(12)));
 return {domain:[low,high],ticks};
}
export const formatNumber=n=>Number(n.toFixed(2)).toLocaleString('en-US',{maximumFractionDigits:2});
export const axisNumber=n=>Number(n.toPrecision(12)).toLocaleString('en-US',{maximumSignificantDigits:12});
export function sampleStats(values){
 if(values.length<2)throw Error('At least two samples required');values.forEach(v=>number(v,'sample'));
 const mean=values.reduce((s,v)=>s+v,0)/values.length,sd=Math.sqrt(values.reduce((s,v)=>s+(v-mean)**2,0)/(values.length-1));return {n:values.length,mean,sd};
}
export function stableRank(rows,value,descending=true){return rows.map((row,index)=>({row,index})).sort((a,b)=>(descending?-1:1)*(value(a.row)-value(b.row))||a.index-b.index).map(v=>v.row)}

// Preserve the ordering of actual numeric positions while giving labels their
// own collision-free track. Never change the data point to match its label.
export function labelTrack(items,{top,bottom,gap=36}={}){
 if(!items.length)return [];
 if(bottom-top<(items.length-1)*gap)throw Error('Label track too dense at the reading size');
 const rows=items.map((x,index)=>({...x,index})).sort((a,b)=>a.desired-b.desired||a.index-b.index);
 for(let i=0;i<rows.length;i++)rows[i].placed=Math.max(rows[i].desired,i?rows[i-1].placed+gap:top);
 if(rows.at(-1).placed>bottom){rows.at(-1).placed=bottom;for(let i=rows.length-2;i>=0;i--)rows[i].placed=Math.min(rows[i].placed,rows[i+1].placed-gap)}
 if(rows[0].placed<top)throw Error('Label track exceeds its reading budget');
 return rows.sort((a,b)=>a.index-b.index);
}
export function pairedStats(points){
 if(points.length<2)throw Error('At least two pairs required');for(const p of points){number(p.x,'x');number(p.y,'y')}
 const n=points.length,mx=points.reduce((s,p)=>s+p.x,0)/n,my=points.reduce((s,p)=>s+p.y,0)/n;
 const xx=points.reduce((s,p)=>s+(p.x-mx)**2,0),yy=points.reduce((s,p)=>s+(p.y-my)**2,0),xy=points.reduce((s,p)=>s+(p.x-mx)*(p.y-my),0);
 const slope=xx?xy/xx:null,intercept=xx?my-slope*mx:null;
 return {n,meanX:mx,meanY:my,varianceX:xx/(n-1),varianceY:yy/(n-1),correlation:xx&&yy?xy/Math.sqrt(xx*yy):null,slope,intercept};
}
export function binObservations(values,edges){
 if(edges.length<3||!edges.every((v,i)=>Number.isFinite(v)&&(!i||v>edges[i-1])))throw Error('Bin edges must strictly increase');
 const bins=edges.slice(1).map((right,i)=>({left:edges[i],right,count:0,values:[],rightClosed:i===edges.length-2}));
 for(const v of values){number(v,'observation');const bin=bins.find(b=>v>=b.left&&(v<b.right||b.rightClosed&&v===b.right));if(!bin)throw Error('Observation outside supplied bin edges');bin.count++;bin.values.push(v)}
 return bins;
}
