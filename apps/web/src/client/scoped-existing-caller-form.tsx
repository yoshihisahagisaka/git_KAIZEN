import {useEffect,useRef,useState,type FormEvent} from 'react';
import {api} from './api.js';

interface Org {id:string;name:string}
interface OrgPage {items:Org[];nextCursor:string|null}
interface Person {personId:string;displayName:string;lifecycleStatus:string}
interface PeoplePage {items:Person[];nextCursor:string|null}
interface Receipt {eventId:string;workId:string|null}
type Decision='REQUIRED'|'NOT_APPLICABLE'|'DEFERRED';

/** Existing Caller lookup is separate from membership/beneficiary decisions.
 * Only authorized service recipients and Registry-visible Person IDs arrive
 * through the existing scoped endpoints. Server rechecks in same write txn. */
export function ScopedExistingCallerForm({csrf,serviceId,onReceived,initialOrganization,initialContact,webReceiptId}:{
 csrf:string;serviceId:string;onReceived:(receipt:Receipt)=>void;initialOrganization?:Org;webReceiptId?:string;initialContact?:{name:string;email:string;description:string};
}){
 const [orgQuery,setOrgQuery]=useState(''),[search,setSearch]=useState('');
 const [orgs,setOrgs]=useState<Org[]>([]),[orgCursor,setOrgCursor]=useState<string|null>(null);
 const [orgId,setOrgId]=useState('');
 const [people,setPeople]=useState<Person[]>([]),[peopleCursor,setPeopleCursor]=useState<string|null>(null);
 const [personId,setPersonId]=useState('');
 const [newName,setNewName]=useState(initialContact?.name??''),[newEmail,setNewEmail]=useState(initialContact?.email??'');
 const [distinct,setDistinct]=useState(false);
 const [peopleLoading,setPeopleLoading]=useState(false),[peopleFailed,setPeopleFailed]=useState(false);
 const [symptom,setSymptom]=useState(initialContact?.description??''),[reason,setReason]=useState('');
 const [decision,setDecision]=useState<Decision>('REQUIRED');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const [loading,setLoading]=useState(false);
 const sending=useRef(false);
 const retry=useRef<{key:string;id:string}|null>(null);
 useEffect(()=>{
  if(initialOrganization){setOrgs([initialOrganization]);setOrgCursor(null);setOrgId(initialOrganization.id);return;}
  if(!serviceId){setOrgs([]);setOrgCursor(null);setOrgId('');return;}
  let alive=true;setLoading(true);setError('');setOrgId('');setPersonId('');
  setOrgs([]);setOrgCursor(null);
  const params=new URLSearchParams({limit:'20',q:search});
  api<OrgPage>(`/api/scoped/support-intake/services/${serviceId}/organizations?${params}`)
   .then(data=>{if(alive){setOrgs(data.items);setOrgCursor(data.nextCursor);}})
   .catch(()=>{if(alive)setError('企業の候補を取得できませんでした。受付権限を確認してください。');})
   .finally(()=>{if(alive)setLoading(false);});
  return ()=>{alive=false;};
 },[serviceId,search,initialOrganization]);
 useEffect(()=>{
  setNewName(initialContact?.name??'');setNewEmail(initialContact?.email??'');setDistinct(false);setPeopleFailed(false);
  if(!orgId){setPeople([]);setPeopleCursor(null);setPersonId('');setPeopleLoading(false);return;}
  let alive=true;setPeopleLoading(true);setPeople([]);setPeopleCursor(null);setPersonId('');setError('');
  api<PeoplePage>(`/api/scoped/registry/organizations/${orgId}/people?${new URLSearchParams({
   serviceId,limit:'20',
  })}`).then(data=>{if(alive){setPeople(data.items);setPeopleCursor(data.nextCursor);}})
   .catch(()=>{if(alive){setPeopleFailed(true);setError('この企業の問い合わせ者を参照できませんでした。');}})
   .finally(()=>{if(alive)setPeopleLoading(false);});
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
  if(sending.current||busy||loading||peopleLoading||peopleFailed||!serviceId||!orgId||!personId||!symptom.trim()||(decision==='NOT_APPLICABLE'&&!reason.trim())||(personId==='NEW'&&!newName.trim()))
   return;
  const payload={
   ...(webReceiptId?{webReceiptId}:{}),
   serviceId,caller:personId==='NEW'?{kind:'NEW',organizationId:orgId,displayName:newName.trim(),
    ...(newEmail.trim()?{email:newEmail.trim()}:{}),distinctPersonConfirmed:distinct}:{kind:'EXISTING',personId},symptom:symptom.trim(),
   decision,reason:decision==='NOT_APPLICABLE'?reason.trim():decision==='REQUIRED'?'標準受付: オペレーターが確認・対応を開始することを選択':'',
  };
  const key=JSON.stringify(payload);
  if(retry.current?.key!==key)retry.current={key,id:crypto.randomUUID()};
  sending.current=true;setBusy(true);setError('');
  try{
   const endpoint=personId==='NEW'?'/api/scoped/support-intake/new-caller-in-organization':'/api/scoped/support-intake/existing-caller';
   const receipt=await api<Receipt>(endpoint,csrf,
    {...payload,requestId:retry.current.id});
   retry.current=null;onReceived(receipt);
  }catch{setError('受付できませんでした。選択対象・権限を確認してください。同名の方がいる場合は既存登録を選択するか、別人と確認してください。');}
  finally{sending.current=false;setBusy(false);}
 }
 return <section className="scoped-existing-caller" aria-label="登録済み問い合わせ者の受付">
  <h3>登録済みの所属・企業から受付</h3>
  <p>登録情報の閲覧には別途Registry権限が必要です。
   登録済みというだけで会員資格や支援対象を確定しません。</p>
  {error&&<p role="alert">{error}</p>}
  {!serviceId?<p>先に受付サービスを選択してください。</p>:<>
   {!initialOrganization&&<form onSubmit={event=>{event.preventDefault();setSearch(orgQuery.trim());}}
    aria-label="受付企業の検索">
    <label htmlFor="scoped-existing-org-q">企業名で検索</label>
    <input id="scoped-existing-org-q" value={orgQuery} maxLength={100} disabled={busy}
     onChange={event=>changed(()=>setOrgQuery(event.target.value))}/>
    <button type="submit" className="secondary" disabled={busy}>企業を探す</button>
   </form>}
   {loading&&<p>企業の候補を確認しています…</p>}
   <form onSubmit={e=>void submit(e)} aria-label="登録済み問い合わせ受付">
    <label htmlFor="scoped-existing-org">所属・企業</label>
    <select id="scoped-existing-org" value={orgId} disabled={busy||loading||!!initialOrganization}
     onChange={event=>changed(()=>setOrgId(event.target.value))}>
     <option value="">企業を選択してください</option>
     {orgs.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
    </select>
    {orgCursor&&<button className="secondary" type="button" disabled={busy}
     onClick={()=>void moreOrgs()}>さらに企業候補を表示</button>}
    <label htmlFor="scoped-existing-person">問い合わせ者</label>
    <select id="scoped-existing-person" value={personId} disabled={busy||!orgId||peopleLoading||peopleFailed}
     onChange={event=>changed(()=>setPersonId(event.target.value))}>
     <option value="">問い合わせ者を選択してください</option>
     {people.map(x=><option key={x.personId} value={x.personId}>
      {x.displayName}</option>)}
     <option value="NEW">＋ 新しい問い合わせ者</option>
    </select>
    {personId==='NEW'&&<>
     <label htmlFor="scoped-existing-new-name">新しい問い合わせ者のお名前</label>
     <input id="scoped-existing-new-name" value={newName} maxLength={200} required disabled={busy}
      onChange={event=>changed(()=>{setNewName(event.target.value);setDistinct(false);})}/>
     <label htmlFor="scoped-existing-new-email">メールアドレス（任意）</label>
     <input id="scoped-existing-new-email" type="email" maxLength={320} value={newEmail} disabled={busy}
      onChange={event=>changed(()=>setNewEmail(event.target.value))}/>
     <label><input type="checkbox" checked={distinct} disabled={busy}
      onChange={event=>changed(()=>setDistinct(event.target.checked))}/>同名の登録がある場合、別人であることを確認しました</label>
    </>}
    {peopleCursor&&<button className="secondary" type="button" disabled={busy}
     onClick={()=>void morePeople()}>さらに問い合わせ者候補を表示</button>}
    <label htmlFor="scoped-existing-symptom">問い合わせ内容</label>
    <textarea id="scoped-existing-symptom" maxLength={4000} disabled={busy}
     value={symptom} onChange={event=>changed(()=>setSymptom(event.target.value))}/>
    <label htmlFor="scoped-existing-decision">対応必要性の判断</label>
    <select id="scoped-existing-decision" value={decision} disabled={busy}
     onChange={event=>changed(()=>setDecision(event.target.value as Decision))}>
     <option value="REQUIRED">対応が必要</option>
     <option value="DEFERRED">受付のみ（判断保留）</option>
     <option value="NOT_APPLICABLE">現時点で対応不要</option>
    </select>
    {decision==='NOT_APPLICABLE'&&<>
     <label htmlFor="scoped-existing-reason">判断理由</label>
     <textarea id="scoped-existing-reason" maxLength={4000} value={reason} disabled={busy} required
      onChange={event=>changed(()=>setReason(event.target.value))}/>
    </>}
    <button type="submit" disabled={busy||loading||peopleLoading||peopleFailed||!orgId||!personId||!symptom.trim()||(decision==='NOT_APPLICABLE'&&!reason.trim())||(personId==='NEW'&&!newName.trim())}>
     {decision==='REQUIRED'?'受付して対応を開始':decision==='DEFERRED'?'受付のみ':'対応不要として受付'}
    </button>
   </form>
  </>}
 </section>;
}
