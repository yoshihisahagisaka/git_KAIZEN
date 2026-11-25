import {useEffect,useRef,useState,type FormEvent} from 'react';
import {api} from './api.js';

interface Org {id:string;name:string}
interface OrgPage {items:Org[];nextCursor:string|null}
interface Person {personId:string;displayName:string;lifecycleStatus:string}
interface PeoplePage {items:Person[];nextCursor:string|null}
interface Receipt {eventId:string;workId:string|null}
type Decision='REQUIRED'|'NOT_APPLICABLE';

/** Existing Caller lookup is separate from membership/beneficiary decisions.
 * Only authorized service recipients and Registry-visible Person IDs arrive
 * through the existing scoped endpoints. Server rechecks in same write txn. */
export function ScopedExistingCallerForm({csrf,serviceId,onReceived}:{
 csrf:string;serviceId:string;onReceived:(receipt:Receipt)=>void;
}){
 const [orgQuery,setOrgQuery]=useState(''),[search,setSearch]=useState('');
 const [orgs,setOrgs]=useState<Org[]>([]),[orgCursor,setOrgCursor]=useState<string|null>(null);
 const [orgId,setOrgId]=useState('');
 const [people,setPeople]=useState<Person[]>([]),[peopleCursor,setPeopleCursor]=useState<string|null>(null);
 const [personId,setPersonId]=useState('');
 const [symptom,setSymptom]=useState(''),[reason,setReason]=useState('');
 const [decision,setDecision]=useState<Decision>('REQUIRED');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const [loading,setLoading]=useState(false);
 const sending=useRef(false);
 const retry=useRef<{key:string;id:string}|null>(null);
 useEffect(()=>{
  if(!serviceId){setOrgs([]);setOrgCursor(null);setOrgId('');return;}
  let alive=true;setLoading(true);setError('');setOrgId('');setPersonId('');
  setOrgs([]);setOrgCursor(null);
  const params=new URLSearchParams({limit:'20',q:search});
  api<OrgPage>(`/api/scoped/support-intake/services/${serviceId}/organizations?${params}`)
   .then(data=>{if(alive){setOrgs(data.items);setOrgCursor(data.nextCursor);}})
   .catch(()=>{if(alive)setError('企業の候補を取得できませんでした。受付権限を確認してください。');})
   .finally(()=>{if(alive)setLoading(false);});
  return ()=>{alive=false;};
 },[serviceId,search]);
 useEffect(()=>{
  if(!orgId){setPeople([]);setPeopleCursor(null);setPersonId('');return;}
  let alive=true;setPeople([]);setPeopleCursor(null);setPersonId('');setError('');
  api<PeoplePage>(`/api/scoped/registry/organizations/${orgId}/people?${new URLSearchParams({
   serviceId,limit:'20',
  })}`).then(data=>{if(alive){setPeople(data.items);setPeopleCursor(data.nextCursor);}})
   .catch(()=>{if(alive)setError('この企業の問い合わせ者を参照できませんでした。');});
  return ()=>{alive=false;};
 },[serviceId,orgId]);
 const changed=(action:()=>void)=>{action();setError('');};
 async function moreOrgs(){
  if(!orgCursor||busy)return;
  setBusy(true);setError('');
  try{
   const page=await api<OrgPage>(
    `/api/scoped/support-intake/services/${serviceId}/organizations?${new URLSearchParams({
     limit:'20',q:search,cursor:orgCursor,
    })}`);
   setOrgs(prev=>{
    const known=new Set(prev.map(x=>x.id));
    return [...prev,...page.items.filter(x=>!known.has(x.id))];
   });setOrgCursor(page.nextCursor);
  }catch{setError('続きの企業候補を表示できませんでした。');}
  finally{setBusy(false);}
 }
 async function morePeople(){
  if(!peopleCursor||busy||!orgId)return;
  setBusy(true);setError('');
  try{
   const page=await api<PeoplePage>(
    `/api/scoped/registry/organizations/${orgId}/people?${new URLSearchParams({
     serviceId,limit:'20',cursor:peopleCursor,
    })}`);
   setPeople(prev=>{
    const known=new Set(prev.map(x=>x.personId));
    return [...prev,...page.items.filter(x=>!known.has(x.personId))];
   });setPeopleCursor(page.nextCursor);
  }catch{setError('続きの問い合わせ者候補を表示できませんでした。');}
  finally{setBusy(false);}
 }
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(sending.current||busy||!serviceId||!orgId||!personId||!symptom.trim()||!reason.trim())
   return;
  const payload={
   serviceId,caller:{kind:'EXISTING',personId},symptom:symptom.trim(),
   decision,reason:reason.trim(),
  };
  const key=JSON.stringify(payload);
  if(retry.current?.key!==key)retry.current={key,id:crypto.randomUUID()};
  sending.current=true;setBusy(true);setError('');
  try{
   const receipt=await api<Receipt>('/api/scoped/support-intake/existing-caller',csrf,
    {...payload,requestId:retry.current.id});
   retry.current=null;onReceived(receipt);
  }catch{setError('登録済み問い合わせ者の受付ができませんでした。選択対象と権限を確認してください。');}
  finally{sending.current=false;setBusy(false);}
 }
 return <section className="scoped-existing-caller" aria-label="登録済み問い合わせ者の受付">
  <h3>登録済みの問い合わせ者を選択</h3>
  <p>登録情報の閲覧には別途Registry権限が必要です。
   登録済みというだけで会員資格や支援対象を確定しません。</p>
  {error&&<p role="alert">{error}</p>}
  {!serviceId?<p>先に受付サービスを選択してください。</p>:<>
   <form onSubmit={event=>{event.preventDefault();setSearch(orgQuery.trim());}}
    aria-label="受付企業の検索">
    <label htmlFor="scoped-existing-org-q">企業名で検索</label>
    <input id="scoped-existing-org-q" value={orgQuery} maxLength={100} disabled={busy}
     onChange={event=>changed(()=>setOrgQuery(event.target.value))}/>
    <button type="submit" className="secondary" disabled={busy}>企業を探す</button>
   </form>
   {loading&&<p>企業の候補を確認しています…</p>}
   <form onSubmit={e=>void submit(e)} aria-label="登録済み問い合わせ受付">
    <label htmlFor="scoped-existing-org">所属・企業</label>
    <select id="scoped-existing-org" value={orgId} disabled={busy||loading}
     onChange={event=>changed(()=>setOrgId(event.target.value))}>
     <option value="">企業を選択してください</option>
     {orgs.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
    </select>
    {orgCursor&&<button className="secondary" type="button" disabled={busy}
     onClick={()=>void moreOrgs()}>さらに企業候補を表示</button>}
    <label htmlFor="scoped-existing-person">問い合わせ者</label>
    <select id="scoped-existing-person" value={personId} disabled={busy||!orgId}
     onChange={event=>changed(()=>setPersonId(event.target.value))}>
     <option value="">問い合わせ者を選択してください</option>
     {people.map(x=><option key={x.personId} value={x.personId}>
      {x.displayName}</option>)}
    </select>
    {peopleCursor&&<button className="secondary" type="button" disabled={busy}
     onClick={()=>void morePeople()}>さらに問い合わせ者候補を表示</button>}
    <label htmlFor="scoped-existing-symptom">問い合わせ内容</label>
    <textarea id="scoped-existing-symptom" maxLength={4000} disabled={busy}
     value={symptom} onChange={event=>changed(()=>setSymptom(event.target.value))}/>
    <label htmlFor="scoped-existing-decision">対応必要性の判断</label>
    <select id="scoped-existing-decision" value={decision} disabled={busy}
     onChange={event=>changed(()=>setDecision(event.target.value as Decision))}>
     <option value="REQUIRED">対応が必要</option>
     <option value="NOT_APPLICABLE">現時点で対応不要</option>
    </select>
    <label htmlFor="scoped-existing-reason">判断理由</label>
    <textarea id="scoped-existing-reason" maxLength={4000} value={reason} disabled={busy}
     onChange={event=>changed(()=>setReason(event.target.value))}/>
    <button type="submit" disabled={busy||!orgId||!personId||!symptom.trim()||!reason.trim()}>
     登録済み問い合わせを受付
    </button>
   </form>
  </>}
 </section>;
}
