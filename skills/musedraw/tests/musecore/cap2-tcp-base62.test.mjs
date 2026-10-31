import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {cap2TCPBase62Model} from '../../scripts/musecore/cap2-tcp-base62-models.mjs';
const fixture=JSON.parse(await fs.readFile(new URL('../../assets/musecore/cap2-tcp-base62-source.json',import.meta.url),'utf8'));
// Independent oracle: subtract the highest place's multiples, rather than repeated /62.
function placeOracle(decimal,alphabet){let left=BigInt(decimal),place=1n;while(place*62n<=left)place*=62n;let encoded='';do{let digit=0;while(left>=place){left-=place;digit++}encoded+=alphabet[digit];place/=62n}while(place);return encoded}
test('source integer encodes to 4c92 with independently checked place values',()=>{
 const m=cap2TCPBase62Model(fixture);assert.equal(m.encoded,'4c92');assert.equal(m.decoded,'1000000');assert.deepEqual(m.divisions.map(d=>[d.dividend,d.quotient,d.remainder]),[['1000000','16129',2],['16129','260',9],['260','4',12],['4','0',4]]);assert.deepEqual(m.digits.map(d=>d.contribution),['953312','46128','558','2']);
});
test('content changes and character-table permutations recompute without hand edits',()=>{
 for(const alphabet of [fixture.alphabet,fixture.alphabet.split('').reverse().join('')])for(const decimal of ['0','1','61','62','3843','3844','1000000','218340105584895']){const input={...fixture,decimal,alphabet,inputLabel:'调用者输入完整保留',outputLabel:'输出含中文标签',note:'Notes: zero is supplied, never inferred.'},m=cap2TCPBase62Model(input);assert.equal(m.encoded,placeOracle(decimal,alphabet));assert.equal(m.decoded,decimal);for(const key of ['title','subtitle','inputLabel','outputLabel','note'])assert.equal(m[key],input[key]);assert(m.divisions.length>=1&&m.divisions.length<=8)}
});
test('unknown, unsafe, negative, noncanonical and out-of-scope values explicitly refuse',()=>{
 for(const patch of [{decimal:null},{decimal:1000000},{decimal:'-1'},{decimal:'01'},{decimal:'1.0'},{decimal:'1e6'},{decimal:'218340105584896'},{alphabet:'0'.repeat(62)},{alphabet:fixture.alphabet.slice(1)},{inferredId:0},{note:''}])assert.throws(()=>cap2TCPBase62Model({...fixture,...patch}));
});
