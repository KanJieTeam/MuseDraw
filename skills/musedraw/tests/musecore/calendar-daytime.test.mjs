import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {gregorianYear,civilCalendarModel} from '../../scripts/musecore/calendar-models.mjs';
import {dailyTimeModel,minuteOfDay} from '../../scripts/musecore/daytime-models.mjs';
import {editorHtml} from '../../scripts/musecore.mjs';
import {loadPlaywrightInfo} from '../../scripts/engine/export.mjs';
import {resolveBrowser} from '../../scripts/engine/environment.mjs';
const civilFixture=async id=>JSON.parse(await fs.readFile(new URL('../../assets/musecore/'+id+'.json',import.meta.url),'utf8'));

test('Gregorian arithmetic distinguishes century exceptions and preserves a full 400-year cycle',async()=>{
 assert.equal(gregorianYear(1900).days,365);assert.equal(gregorianYear(2000).days,366);assert.equal(gregorianYear(2100).days,365);
 const cycle=Array.from({length:400},(_,i)=>gregorianYear(1600+i));assert.equal(cycle.filter(y=>y.leap).length,97);assert.equal(cycle.reduce((n,y)=>n+y.days,0),146097);
 const b=await civilFixture('civil-calendar');assert.equal(civilCalendarModel(b).ordinal,304);assert.equal(civilCalendarModel(b).weekday,6);
 const leap={...b,year:2000,referenceDate:'2000-02-29'};assert.equal(civilCalendarModel(leap).ordinal,60);assert.equal(civilCalendarModel(leap).weekday,2);
 for(const referenceDate of ['2026-02-29','2026-04-31','2025-10-31','2026-1-01'])assert.throws(()=>civilCalendarModel({...b,referenceDate}));
 assert.throws(()=>civilCalendarModel({...b,comparisonYears:[1900,1900]}));assert.throws(()=>gregorianYear(1599));assert.throws(()=>gregorianYear(2026.5));
});

test('civil minutes and explicit days distinguish zero, midnight and 48 hours without modulo guesses',async()=>{
 const b=await civilFixture('daily-time'),m=dailyTimeModel(b);assert.deepEqual(m.intervals.map(p=>p.minutes),[400,555]);assert.deepEqual(m.samples.map(s=>[s.twelveHour,s.half]),[[3,'下午'],[9,'下午'],[12,'下午'],[12,'上午']]);
 const interval=(start,end)=>({...b,intervals:[{id:'test',label:'明确日偏移',start,end}]});
 assert.equal(dailyTimeModel(interval({time:'00:00',dayOffset:0},{time:'00:00',dayOffset:0})).intervals[0].minutes,0);
 assert.equal(dailyTimeModel(interval({time:'00:00',dayOffset:0},{time:'00:00',dayOffset:2})).intervals[0].minutes,2880);
 assert.throws(()=>dailyTimeModel(interval({time:'21:30',dayOffset:0},{time:'06:45',dayOffset:0})));
 for(const t of ['24:00','12:60','7:00','00:00:00'])assert.throws(()=>minuteOfDay(t));
});

test('double-hour half-open boundaries preserve midnight wrap and expose unsupported duration mode',async()=>{
 const b=await civilFixture('double-hour-scroll');assert.deepEqual(dailyTimeModel(b).samples.map(s=>s.doubleHourLabel),['亥时','子时','子时','丑时']);
 const base=await civilFixture('daily-time');for(const [time,want] of [['00:59','子时'],['01:00','丑时'],['10:59','巳时'],['11:00','午时'],['22:59','亥时'],['23:00','子时']])assert.equal(dailyTimeModel({...b,samples:[{id:'x',label:'边界',time}]}).samples[0].doubleHourLabel,want);
 assert.throws(()=>dailyTimeModel({...b,intervals:base.intervals}));
});

test('production browser computes actual month bars, clock hand and twelve unique periods',{timeout:120000},async()=>{
 const inputs=await Promise.all(['civil-calendar','daily-time','double-hour-scroll'].map(civilFixture)),{pw}=await loadPlaywrightInfo(),browser=await pw.chromium.launch({...resolveBrowser(pw),headless:true});
 try{const page=await browser.newPage({viewport:{width:2500,height:1800}});await page.route(/^https?:\/\//,r=>r.abort());await page.setContent(await editorHtml(inputs[0]));await page.waitForFunction(()=>window.MUSECORE_READY===true);
  const render=async(input,stress=false)=>page.evaluate(async({input,stress})=>{const original=CanvasRenderingContext2D.prototype.measureText;if(stress)CanvasRenderingContext2D.prototype.measureText=function(text){const m=original.call(this,text);return new Proxy(m,{get(target,key){return key==='fontBoundingBoxAscent'?Reflect.get(target,key,target)+40:Reflect.get(target,key,target)}})};try{const svg=MuseCore.render(input);document.getElementById('output').replaceChildren(svg);await document.fonts.ready;return {audit:MuseCore.audit(svg),months:[...svg.querySelectorAll('[data-month]')].map(e=>({month:Number(e.dataset.month),days:Number(e.dataset.days),width:Number(e.getAttribute('width'))})),periods:[...svg.querySelectorAll('[data-double-hour]')].map(e=>Number(e.dataset.doubleHour)),minute:svg.querySelector('[data-selected-minute]')?.dataset.selectedMinute,text:svg.textContent}}finally{CanvasRenderingContext2D.prototype.measureText=original}},{input,stress});
  for(const b of inputs){const r=await render(b);assert.deepEqual(r.audit.findings,[]);assert(!r.text.includes('undefined'));const tall=await render(b,true);assert.deepEqual(tall.audit.findings,[]);assert(tall.audit.geometry.height>r.audit.geometry.height);
   if(b.family==='civil-calendar'){assert.equal(r.months.length,12);assert.deepEqual(r.months.map(x=>x.days),[31,28,31,30,31,30,31,31,30,31,30,31]);assert(r.months.every(x=>x.width===x.days*r.audit.geometry.barScale))}
   else if(b.notation==='clock')assert.equal(r.minute,'900');else {assert.deepEqual(r.periods,Array.from({length:12},(_,i)=>i));for(const result of [r,tall]){const g=result.audit.geometry;assert(g.scrollSampleBaseline-g.scrollSampleAscent-g.scrollTimeLabelBaseline-g.scrollPeriodDescent>=29.9)}}
  }
  const altered={...inputs[0],year:2000,referenceDate:'2000-02-29'};const r=await render(altered);assert.deepEqual(r.audit.findings,[]);assert.equal(r.months[1].days,29);
 }finally{await browser.close()}
});
