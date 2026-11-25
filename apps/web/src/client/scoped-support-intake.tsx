import {useEffect,useRef,useState,type FormEvent} from 'react';
import {api} from './api.js';
import {ScopedBeneficiaryConfirmation} from './scoped-beneficiary-confirmation.js';
import {ScopedExistingCallerForm} from './scoped-existing-caller-form.js';

interface Service {id:string;name:string}
interface ServicePage {items:Service[];nextCursor:string|null}
interface Receipt {eventId:string;workId:string|null}
type Decision='REQUIRED'|'NOT_APPLICABLE';

function ScopedSupportIntake({csrf,serviceId,open,onOpenChange,onBeneficiaryConfirmed}:{csrf:string;serviceId:string;open:boolean;onOpenChange:(open:boolean)=>void;onBeneficiaryConfirmed?:()=>void}){
 const [mode,setMode]=useState<'NEW'|'EXISTING'>('NEW');
 const [organizationName,setOrganizationName]=useState(''),[displayName,setDisplayName]=useState('');
 const [email,setEmail]=useState(''),[symptom,setSymptom]=useState('');
 const [decision,setDecision]=useState<Decision>('REQUIRED');
 const [reason,setReason]=useState('');
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [receipt,setReceipt]=useState<Receipt|null>(null);
 const retry=useRef<{key:string;requestId:string}|null>(null);
 const pending=useRef(false);
 const changed=(change:()=>void)=>{
  change();setReceipt(null);setError('');
  // A retry after a network failure reuses the request ID only for an
  // identical payload. Changing any field creates a different request ID.
 };
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(pending.current||busy||!serviceId)return;
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
 return <section className="scoped-intake" aria-label="問い合わせ受付">
  <button type="button" className="secondary" disabled={busy||!serviceId} onClick={()=>{if(!open||window.confirm("受付画面を閉じますか？未保存の入力がある場合は失われることがあります。"))onOpenChange(!open);}}>
   {open?'受付画面を閉じる':'問い合わせを受付'}
  </button>
  {open&&<div>
   <h2>問い合わせ受付</h2>
   <p>登録済み・未登録の問い合わせ者を受付します。会員資格や支援対象の確認は別操作です。</p>
   {error&&<p role="alert">{error}</p>}
   <label htmlFor="scoped-intake-mode">問い合わせ者の登録状況</label>
   <select id="scoped-intake-mode" value={mode} disabled={busy||!!receipt}
    onChange={event=>changed(()=>setMode(event.target.value as typeof mode))}>
    <option value="NEW">未登録企業・新規問い合わせ者</option>
    <option value="EXISTING">登録済み問い合わせ者</option>
   </select>
   {mode==='NEW'&&!receipt&&<form onSubmit={event=>void submit(event)}>
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
   {mode==='EXISTING'&&!receipt&&
    <ScopedExistingCallerForm csrf={csrf} serviceId={serviceId}
     onReceived={data=>{setReceipt(data);setError('');}}/>}
   {receipt&&<>
    <div role="status" className="scoped-write-notice">
     <p>受付記録を作成しました。問い合わせID: {receipt.eventId}</p>
     {receipt.workId&&<p>Workが作成されました。支援対象の確認・権限付き表示は別の操作です。</p>}
    </div>
    <ScopedBeneficiaryConfirmation csrf={csrf} serviceId={serviceId}
     eventId={receipt.eventId} onConfirmed={onBeneficiaryConfirmed}/>
    <button type="button" className="secondary" onClick={()=>{
     setReceipt(null);setOrganizationName('');setDisplayName('');
     setEmail('');setSymptom('');setDecision('REQUIRED');setReason('');
    }}>次の問い合わせ</button>
   </>}
  </div>}
 </section>;
}

/** Reception context is chosen before opening the form. CREATE candidates
 * are not the Work READ directory; existing authorized Work remains available
 * independently. Server-side command authorization is unchanged. */
export function ScopedReceptionWorkspace({csrf,onBeneficiaryConfirmed,onServiceChange,contextLocked=false}:{csrf:string;onBeneficiaryConfirmed?:()=>void;onServiceChange:(serviceId:string)=>void;contextLocked?:boolean}){
 const [services,setServices]=useState<Service[]>([]);
 const [cursor,setCursor]=useState<string|null>(null);
 const [chosen,setChosen]=useState('');
 const [open,setOpen]=useState(false);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const [moreBusy,setMoreBusy]=useState(false);
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{
  let live=true;
  setLoading(true);setError('');setServices([]);setCursor(null);setChosen('');
  api<ServicePage>('/api/scoped/support-intake/services?limit=20')
   .then(page=>{if(live){setServices(page.items);setCursor(page.nextCursor);}})
   .catch(()=>{if(live)setError('受付可能なサービスを確認できませんでした。');})
   .finally(()=>{if(live)setLoading(false);});
  return ()=>{live=false;};
 },[refresh]);
 const single=!cursor&&services.length===1;
 const serviceId=single?services[0]!.id:chosen;
 const service=services.find(item=>item.id===serviceId);
 useEffect(()=>{onServiceChange(serviceId);},[serviceId,onServiceChange]);
 async function more(){
  if(!cursor||moreBusy||open)return;
  setMoreBusy(true);setError('');
  try{
   const page=await api<ServicePage>('/api/scoped/support-intake/services?limit=20&cursor='+encodeURIComponent(cursor));
   setServices(prev=>{const seen=new Set(prev.map(item=>item.id));return [...prev,...page.items.filter(item=>!seen.has(item.id))];});
   setCursor(page.nextCursor);
  }catch{setError('サービスの続きを取得できませんでした。');}
  finally{setMoreBusy(false);}
 }
 return <>
  <section aria-label="受付サービスコンテキスト" className="card">
   <h2>受付サービス</h2>
   {loading&&<p role="status">受付可能なサービスを確認しています…</p>}
   {error&&<><p role="alert">{error}</p><button type="button" className="secondary" disabled={open||moreBusy||contextLocked} onClick={()=>setRefresh(n=>n+1)}>受付サービスを再確認</button></>}
   {!loading&&!error&&!services.length&&<p>受付権限のあるサービスはありません。</p>}
   {single&&service&&<p><strong>{service.name}</strong></p>}
   {!single&&services.length>0&&<>
    <label htmlFor="scoped-reception-service">受付サービスを切り替える</label>
    <select id="scoped-reception-service" value={chosen} disabled={open||moreBusy||contextLocked}
     onChange={event=>setChosen(event.target.value)}>
     <option value="">サービスを選択してください</option>
     {services.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
    </select>
    {cursor&&<button type="button" className="secondary" disabled={open||moreBusy||contextLocked} onClick={()=>void more()}>さらにサービスを表示</button>}
   </>}
   {open&&!single&&<p>サービスを切り替えるには受付画面を閉じてください。</p>}
   {contextLocked&&!single&&<p>サービスを切り替えるには現在の対応を保存して閉じてください。</p>}
  </section>
  {service&&<ScopedSupportIntake key={service.id} csrf={csrf} serviceId={service.id}
   open={open} onOpenChange={setOpen}
   {...(onBeneficiaryConfirmed?{onBeneficiaryConfirmed}:{})}/>}
 </>;
}
