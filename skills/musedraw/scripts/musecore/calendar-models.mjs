function civilNeed(ok,message){if(!ok)throw Error('civil-calendar: '+message)}
function civilFields(o,keys,label){civilNeed(o&&typeof o==='object'&&!Array.isArray(o),label+' requires an object');for(const key of Object.keys(o))civilNeed(keys.includes(key),label+'.'+key+' unsupported')}
function civilText(s,label,max=160){civilNeed(typeof s==='string'&&s.trim()&&[...s].length<=max,label+' requires bounded text')}
export function gregorianYear(year){
 civilNeed(Number.isSafeInteger(year)&&year>=1600&&year<=9999,'year requires integer 1600–9999');
 const leap=year%400===0||(year%4===0&&year%100!==0),months=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
 return {year,leap,months,days:months.reduce((a,b)=>a+b,0),divisibleBy4:year%4===0,divisibleBy100:year%100===0,divisibleBy400:year%400===0};
}
export function civilCalendarModel(b){
 civilFields(b,['family','title','subtitle','year','referenceDate','comparisonYears','note'],'input');civilNeed(b.family==='civil-calendar','family must be civil-calendar');for(const k of ['title','subtitle','note'])civilText(b[k],k);const model=gregorianYear(b.year);
 civilNeed(typeof b.referenceDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(b.referenceDate),'referenceDate must be explicit YYYY-MM-DD');const [year,month,day]=b.referenceDate.split('-').map(Number);civilNeed(year===b.year&&month>=1&&month<=12&&day>=1&&day<=model.months[month-1],'referenceDate must exist in the selected Gregorian year');
 civilNeed(Array.isArray(b.comparisonYears)&&b.comparisonYears.length>=1&&b.comparisonYears.length<=8,'requires 1–8 comparison years');civilNeed(new Set(b.comparisonYears).size===b.comparisonYears.length,'duplicate comparison year');const comparisons=b.comparisonYears.map(gregorianYear),ordinal=model.months.slice(0,month-1).reduce((a,b)=>a+b,0)+day,weekday=new Date(Date.UTC(year,month-1,day)).getUTCDay();
 return {...model,referenceDate:b.referenceDate,month,day,ordinal,weekday,weekdayLabel:['日','一','二','三','四','五','六'][weekday],comparisons,scope:'Gregorian arithmetic for explicit years 1600–9999; no historical local adoption, holiday or lunar-calendar inference'};
}
