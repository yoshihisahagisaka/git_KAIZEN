import {useEffect,useRef,useState,type FormEvent} from 'react';
import {api} from './api.js';

interface Service {id:string;name:string}
interface ServicePage {items:Service[];nextCursor:string|null}
interface Receipt {eventId:string;workId:string|null}
type Decision='REQUIRED'|'NOT_APPLICABLE';

export function ScopedSupportIntake({csrf}:{csrf:string}){
 const [open,setOpen]=useState(false),[services,setServices]=useState<Service[]>([]);
 const [cursor,setCursor]=useState<string|null>(null),[serviceId,setServiceId]=useState('');
 const [organizationName,setOrganizationName]=useState(''),[displayName,setDisplayName]=useState('');
 const [email,setEmail]=useState(''),[symptom,setSymptom]=useState('');
 const [decision,setDecision]=useState<Decision>('REQUIRED');
 const [reason,setReason]=useState('');
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(false),[receipt,setReceipt]=useState<Receipt|null>(null);
 const retry=useRef<{key:string;requestId:string}|null>(null);
 const pending=useRef(false);
 useEffect(()=>{
  if(!open)return;
  let live=true;setLoading(true);setError('');setServices([]);setCursor(null);
  api<ServicePage>('/api/scoped/support-intake/services?limit=20')
   .then(page=>{if(!live)return;setServices(page.items);setCursor(page.nextCursor);})
   .catch(()=>{if(live)setError('受付可能なサービスを確認できませんでした。');})
   .finally(()=>{if(live)setLoading(false);});
  return ()=>{live=false;};
 },[open]);
 async function more(){
  if(!cursor||busy)return;
  setBusy(true);setError('');
  try{
   const page=await api<ServicePage>(
    '/api/scoped/support-intake/services?limit=20&cursor='+encodeURIComponent(cursor));
   setServices(prev=>{
    const seen=new Set(prev.map(s=>s.id));
    return [...prev,...page.items.filter(s=>!seen.has(s.id))];
   });
   setCursor(page.nextCursor);
  }catch{setError('サービスの続きを取得できませんでした。');}
  finally{setBusy(false);}
 }
 const changed=(change:()=>void)=>{
  change();setReceipt(null);setError('');
  // A retry after a network failure reuses the request ID only for an
  // identical payload. Changing any field creates a different request ID.
 };
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(pending.current||busy||loading||!serviceId)return;
  const payload={
   serviceId,symptom:symptom.trim(),
   caller:{kind:'NEW',organizationName:organizationName.trim(),
    displayName:displayName.trim(),...(email.trim()?{email:email.trim()}:{}),
    distinctPersonConfirmed:false},
   decision,reason:reason.trim(),
  };
  if(!payload.symptom||!payload.caller.organizationName||!payload.caller.displayName||
   !payload.reason)return;
  const key=JSON.stringify(payload);
  if(retry.current?.key!==key)retry.current={key,requestId:crypto.randomUUID()};
  pending.current=true;setBusy(true);setError('');setReceipt(null);
  try{
   const data=await api<Receipt>('/api/scoped/support-intake/new-caller',csrf,
    {...payload,requestId:retry.current.requestId});
   setReceipt(data);retry.current=null;
  }catch{setError('受付できませんでした。権限や内容を確認してください。通信が不安定な場合は同じ内容で再送してください。');}
  finally{pending.current=false;setBusy(false);}
 }
 return <section className="scoped-intake" aria-label="未登録の問い合わせ受付">
  <button type="button" className="secondary" onClick={()=>setOpen(p=>!p)}>
   {open?'新規受付を閉じる':'未登録企業・新規問い合わせ者を受付'}
  </button>
  {open&&<div>
   <h2>未登録企業からの問い合わせ受付</h2>
   <p>会員資格や所属を確認済みとみなしません。権限のあるサービスに対して受付記録を作ります。</p>
   {error&&<p role="alert">{error}</p>}
   {loading&&<p role="status">受付可能なサービスを確認しています…</p>}
   {!loading&&!services.length&&!error&&<p>受付権限のあるサービスはありません。</p>}
   {services.length>0&&<form onSubmit={event=>void submit(event)}>
    <label htmlFor="scoped-intake-service">サービス</label>
    <select id="scoped-intake-service" value={serviceId} disabled={busy}
     onChange={event=>changed(()=>setServiceId(event.target.value))}>
     <option value="">サービスを選択してください</option>
     {services.map(service=><option key={service.id} value={service.id}>{service.name}</option>)}
    </select>
    {cursor&&<button type="button" className="secondary" disabled={busy}
     onClick={()=>void more()}>さらにサービスを表示</button>}
    <label htmlFor="scoped-intake-org">新しい所属・企業名</label>
    <input id="scoped-intake-org" value={organizationName} disabled={busy} maxLength={200}
     onChange={event=>changed(()=>setOrganizationName(event.target.value))}/>
    <label htmlFor="scoped-intake-person">問い合わせ者名</label>
    <input id="scoped-intake-person" value={displayName} disabled={busy} maxLength={200}
     onChange={event=>changed(()=>setDisplayName(event.target.value))}/>
    <label htmlFor="scoped-intake-email">メールアドレス（任意）</label>
    <input id="scoped-intake-email" inputMode="email" value={email} disabled={busy}
     onChange={event=>changed(()=>setEmail(event.target.value))}/>
    <label htmlFor="scoped-intake-symptom">問い合わせ内容</label>
    <textarea id="scoped-intake-symptom" value={symptom} maxLength={4000} disabled={busy}
     onChange={event=>changed(()=>setSymptom(event.target.value))}/>
    <label htmlFor="scoped-intake-decision">担当者による必要性判断</label>
    <select id="scoped-intake-decision" value={decision} disabled={busy}
     onChange={event=>changed(()=>setDecision(event.target.value as Decision))}>
     <option value="REQUIRED">対応が必要</option>
     <option value="NOT_APPLICABLE">現時点で対応不要</option>
    </select>
    <label htmlFor="scoped-intake-reason">判断理由</label>
    <textarea id="scoped-intake-reason" maxLength={4000} value={reason} disabled={busy}
     onChange={event=>changed(()=>setReason(event.target.value))}/>
    <button type="submit" disabled={busy||!serviceId||!organizationName.trim()||
     !displayName.trim()||!symptom.trim()||!reason.trim()||!!receipt}>受付を記録</button>
   </form>}
   {receipt&&<div role="status" className="scoped-write-notice">
    <p>受付記録を作成しました。問い合わせID: {receipt.eventId}</p>
    {receipt.workId&&<p>Workが作成されました。支援対象の確認・権限付き表示は別の操作です。</p>}
    <button type="button" className="secondary" onClick={()=>{
     setReceipt(null);setOrganizationName('');setDisplayName('');
     setEmail('');setSymptom('');setDecision('REQUIRED');setReason('');
    }}>次の新規受付</button>
   </div>}
  </div>}
 </section>;
}
