/** Search hints only. Never identity, eligibility or authority.
 * Caller must supply only currently authorized service-scoped candidates. */
export function normalizePhone(raw:string):string|null {
 const s=raw.normalize('NFKC').trim().replace(/[\s()\-‐‑‒–—−]/gu,'');
 const national=s.startsWith('+81')?'0'+s.slice(3):s;
 return /^0[1-9][0-9]{8,9}$/.test(national)?national:null;
}
export function normalizeCompany(raw:string):string {
 let s=raw.normalize('NFKC').toLowerCase().replace(/[\s・]/gu,'');
 const legal='株式会社|有限会社|合同会社|合資会社|合名会社|一般社団法人|一般財団法人|公益社団法人|公益財団法人|\\(株\\)|\\(有\\)|\\(合\\)';
 s=s.replace(new RegExp('^(?:'+legal+')|(?:'+legal+')$','gu'),'');
 return s;
}
export type NameEvidence='EXACT'|'PARTIAL'|'SIMILAR'|'NONE';
function distance(a:string,b:string):number {
 const x=Array.from(a),y=Array.from(b);
 let prev=Array.from({length:y.length+1},(_,i)=>i);
 for(let i=1;i<=x.length;i++){
  const row=[i];
  for(let j=1;j<=y.length;j++)row[j]=Math.min(row[j-1]!+1,prev[j]!+1,prev[j-1]!+(x[i-1]===y[j-1]?0:1));
  prev=row;
 }
 return prev[y.length]!;
}
export function companyEvidence(input:string,registered:string):NameEvidence {
 const a=normalizeCompany(input),b=normalizeCompany(registered);
 if(!a||!b)return 'NONE';
 if(a===b)return 'EXACT';
 if(Math.min(Array.from(a).length,Array.from(b).length)<2)return 'NONE';
 if(a.includes(b)||b.includes(a))return 'PARTIAL';
 if(Math.min(Array.from(a).length,Array.from(b).length)>=4&&Math.max(a.length,b.length)<=120&&distance(a,b)<=1)return 'SIMILAR';
 return 'NONE';
}
export interface MemberHint {organizationId:string;name:string;phones:readonly string[]}
export interface MemberCandidate {organizationId:string;name:string;nameEvidence:NameEvidence;phoneMatch:boolean}
const ranks:Record<NameEvidence,number>={EXACT:3,PARTIAL:2,SIMILAR:1,NONE:0};
export function rankMemberCandidates(input:{company:string;phone:string},members:readonly MemberHint[],limit=20):MemberCandidate[] {
 if(!Number.isInteger(limit)||limit<1||limit>50)throw new RangeError('Invalid candidate limit');
 const phone=normalizePhone(input.phone);
 return members.map(m=>({organizationId:m.organizationId,name:m.name,nameEvidence:companyEvidence(input.company,m.name),phoneMatch:phone!==null&&m.phones.some(p=>normalizePhone(p)===phone)}))
 .filter(m=>m.phoneMatch||m.nameEvidence!=='NONE')
 .sort((a,b)=>Number(b.phoneMatch)-Number(a.phoneMatch)||ranks[b.nameEvidence]-ranks[a.nameEvidence]||a.name.localeCompare(b.name,'ja')||a.organizationId.localeCompare(b.organizationId))
 .slice(0,limit);
}
