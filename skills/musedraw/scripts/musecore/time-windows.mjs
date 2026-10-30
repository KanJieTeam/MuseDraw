export function collaborationWindows(offices,{meetingMinutes=60,step=15}={}){
 if(!Number.isInteger(meetingMinutes)||meetingMinutes<step||meetingMinutes>240||meetingMinutes%step)throw Error('Meeting duration must be 15–240 minutes in 15-minute steps');
 const modulo=v=>((v%1440)+1440)%1440;
 for(const o of offices){if(!Number.isInteger(o.offsetMinutes)||o.offsetMinutes< -720||o.offsetMinutes>840||o.offsetMinutes%15)throw Error('Explicit UTC offset must be a 15-minute value in -720..840');for(const k of ['workStart','workEnd'])if(!Number.isInteger(o[k])||o[k]<0||o[k]>1440||o[k]%15)throw Error('Work bounds must be 15-minute values in 0..1440');if(o.workStart===o.workEnd)throw Error('Empty work interval; use 0..1440 for all day')}
 const slots=Array.from({length:1440/step},(_,index)=>{const minute=index*step,working=offices.map(o=>{const local=modulo(minute+step/2+o.offsetMinutes);return o.workStart<o.workEnd?local>=o.workStart&&local<o.workEnd:local>=o.workStart||local<o.workEnd});return {index,minute,working,count:working.filter(Boolean).length}});
 const candidates=slots.filter(slot=>Array.from({length:meetingMinutes/step},(_,j)=>slots[(slot.index+j)%slots.length]).every(s=>s.count===offices.length)).map(s=>s.minute);
 const pairwise=offices.map((_,a)=>offices.map((_,b)=>slots.filter(s=>s.working[a]&&s.working[b]).length*step));
 return {slots,candidates,pairwise,recommended:candidates[0]??null,sharedMinutes:slots.filter(s=>s.count===offices.length).length*step,maximumConcurrent:Math.max(...slots.map(s=>s.count))};
}
