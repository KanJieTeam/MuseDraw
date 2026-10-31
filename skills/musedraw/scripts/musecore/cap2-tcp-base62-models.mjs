// Exact, bounded positional encoding. This is not a hash, URL allocator or architecture validator.
function cap2TCPBase62Need(ok,message){if(!ok)throw Error('base62-encoding: '+message)}
function cap2TCPBase62Text(value,label,max){cap2TCPBase62Need(typeof value==='string'&&value.trim()&&[...value].length<=max,label+' requires nonempty text up to '+max+' characters');return value}
export function cap2TCPBase62Model(input){
 cap2TCPBase62Need(input&&typeof input==='object'&&!Array.isArray(input),'object required');
 for(const key of Object.keys(input))cap2TCPBase62Need(['family','title','subtitle','decimal','alphabet','inputLabel','outputLabel','note'].includes(key),key+' unsupported');
 cap2TCPBase62Need(input.family==='base62-encoding','family must be base62-encoding');
 for(const [key,max]of [['title',90],['subtitle',220],['inputLabel',65],['outputLabel',65],['note',500]])cap2TCPBase62Text(input[key],key,max);
 cap2TCPBase62Need(typeof input.decimal==='string'&&/^(0|[1-9][0-9]{0,14})$/.test(input.decimal),'decimal must be canonical unsigned decimal text; no numeric coercion');
 cap2TCPBase62Need(typeof input.alphabet==='string'&&/^[0-9A-Za-z]{62}$/.test(input.alphabet)&&new Set(input.alphabet).size===62,'alphabet must explicitly contain each ASCII alphanumeric exactly once');
 const original=BigInt(input.decimal);cap2TCPBase62Need(original<62n**8n,'at most eight encoded characters supported');
 const divisions=[];let current=original;
 do{const quotient=current/62n,remainder=Number(current%62n);divisions.push({index:divisions.length,dividend:current.toString(),quotient:quotient.toString(),remainder,character:input.alphabet[remainder]});current=quotient}while(current>0n);
 const digits=divisions.slice().reverse().map((d,index)=>{const exponent=divisions.length-index-1,place=62n**BigInt(exponent);return {index,exponent,character:d.character,value:d.remainder,place:place.toString(),contribution:(BigInt(d.remainder)*place).toString(),divisionIndex:d.index}});
 return {...input,encoded:digits.map(d=>d.character).join(''),digits,divisions,decoded:digits.reduce((s,d)=>s+BigInt(d.contribution),0n).toString(),scopeLimit:'Explicit unsigned integer and caller alphabet only. Up to eight Base62 digits; zero has one zero-value digit. Not a hash, random ID, collision policy, access-control claim or full source architecture adaptation.'};
}
