import {useEffect,useState,type FormEvent} from 'react';
import {api} from './api.js';
import type {MemberCandidate} from '../../../../packages/domain/src/contact-match.js';
import type {ScopedSupportWorkSummary} from '../server/persistence/scoped-access-reader.js';
type Result={items:MemberCandidate[];tooMany:boolean};
type Org={id:string;name:string};
const label={EXACT:'企業名一致',PARTIAL:'企業名部分一致',SIMILAR:'企業名類似',NONE:''};
const status={OPEN:'受付済み',IN_PROGRESS:'対応中',COMPLETED:'対応完了'};
export function MemberReceptionLookup({csrf,serviceId,hidden,returnRevision,disabled,onSelectWork,onNew}:{
 csrf:string;serviceId:string;hidden:boolean;returnRevision:number;disabled:boolean;
 onSelectWork:(id:string)=>boolean;onNew:(org:Org|null,company:string)=>void;
}){
 const [company,setCompany]=useState(''),[phone,setPhone]=useState('');
 const [query,setQuery]=useState<{company:string;phone:string}|null>(null);
 const [result,setResult]=useState<Result|null>(null);
 const [selected,setSelected]=useState<Org|null>(null);
 const [history,setHistory]=useState<ScopedSupportWorkSummary[]|null>(null);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[version,setVersion]=useState(0);
 useEffect(()=>{
  if(hidden||!query){setResult(null);setHistory(null);return;}
  let live=true;setBusy(true);setError('');setResult(null);setHistory(null);
  api<Result>('/api/scoped/support-intake/services/'+serviceId+'/member-candidates',csrf,query)
   .then(async data=>{
    if(!live)return;
    setResult(data);
    if(!selected)return;
    const match=data.items.find(x=>x.organizationId===selected.id);
    if(!match){setSelected(null);return;}
    const page=await api<{items:ScopedSupportWorkSummary[]}>('/api/scoped/support-intake/services/'+serviceId+'/organizations/'+selected.id+'/recent');
    if(live)setHistory(page.items);
   }).catch(()=>{if(live){setError('顧客情報・履歴を確認できませんでした。再検索してください。');setResult(null);setHistory(null);setSelected(null);}})
   .finally(()=>{if(live)setBusy(false);});
  return()=>{live=false;};
 },[csrf,serviceId,hidden,query,selected,returnRevision,version]);
 function search(e:FormEvent){e.preventDefault();if(disabled||busy||(!company.trim()&&!phone.trim()))return;setSelected(null);setQuery({company:company.trim(),phone:phone.trim()});}
 if(hidden)return null;
 return <section className="card" aria-label="顧客検索と問い合わせ履歴">
  <h3>顧客検索</h3>
  {!selected&&<form onSubmit={search}>
   <label htmlFor="member-company">企業名（あいまい検索）</label>
   <input id="member-company" maxLength={200} value={company} disabled={disabled||busy} onChange={e=>setCompany(e.target.value)}/>
   <label htmlFor="member-phone">電話番号</label>
   <input id="member-phone" type="tel" maxLength={80} value={phone} disabled={disabled||busy} onChange={e=>setPhone(e.target.value)}/>
   <button disabled={disabled||busy||(!company.trim()&&!phone.trim())}>顧客検索</button>
  </form>}
  {error&&<p role="alert">{error}</p>}
  {busy&&<p role="status">確認しています…</p>}
  {!selected&&result&&!busy&&<>
   <h4>顧客候補</h4>
   {result.tooMany&&<p>候補が多いため、検索条件を絞ってください。</p>}
   {!result.items.length&&!result.tooMany&&<p>該当する顧客は見つかりませんでした。</p>}
   <ul>{result.items.map(m=><li key={m.organizationId}><button type="button" className="secondary" disabled={disabled} onClick={()=>setSelected({id:m.organizationId,name:m.name})}>{m.name} — {label[m.nameEvidence]}{m.phoneMatch?' 電話番号一致':''}</button></li>)}</ul>
   <button type="button" className="secondary" disabled={disabled} onClick={()=>onNew(null,query?.company??'')}>該当顧客なし・新規対応</button>
  </>}
  {selected&&<>
   <button type="button" className="secondary" onClick={()=>setSelected(null)}>顧客候補一覧に戻る</button>
   <h4>{selected.name}</h4>
   <h4>直近の問い合わせ履歴</h4>
   {history&&!busy&&<>
    {!history.length&&<p>閲覧できる直近の対応はありません。</p>}
    <ul>{history.map(w=><li key={w.workId}><button type="button" className="secondary" disabled={disabled} onClick={()=>onSelectWork(w.workId)}>{new Date(w.updatedAt).toLocaleString('ja-JP')} {w.title} — {status[w.status]}</button></li>)}</ul>
    <button type="button" disabled={disabled} onClick={()=>onNew(selected,selected.name)}>新規対応</button>
    <button type="button" className="secondary" disabled={busy} onClick={()=>setVersion(n=>n+1)}>履歴を更新</button>
   </>}
  </>}
 </section>;
}
