import {WebReceiptList} from './web-receipt-list.js';
import type {PublicReceiptView} from '../server/persistence/scoped-access-reader.js';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {api} from './api.js';
import {ScopedBeneficiaryConfirmation} from './scoped-beneficiary-confirmation.js';
import {MemberReceptionLookup} from './member-reception-lookup.js';
import {ScopedExistingCallerForm} from './scoped-existing-caller-form.js';

interface Service {id:string;name:string;canReceive:boolean}
interface ServicePage {items:Service[];nextCursor:string|null}
interface Receipt {eventId:string;workId:string|null}
type Decision='REQUIRED'|'NOT_APPLICABLE'|'DEFERRED';
interface PendingReceipt {eventId:string;createdAt:string;callerName:string;organizationName:string;symptom:string;canStart:boolean}
interface PendingPage {items:PendingReceipt[];nextCursor:string|null}

function ScopedSupportIntake({csrf,serviceId,open,onOpenChange,onBeneficiaryConfirmed,initialOrganization,initialCompany,initialWebReceipt}:{csrf:string;serviceId:string;open:boolean;onOpenChange:(open:boolean)=>void;onBeneficiaryConfirmed?:()=>void;initialOrganization?:{id:string;name:string};initialCompany?:string;initialWebReceipt?:PublicReceiptView}){
 const [mode,setMode]=useState<'NEW'|'EXISTING'>(initialOrganization?'EXISTING':'NEW');
 const [organizationName,setOrganizationName]=useState(initialCompany??initialWebReceipt?.company??''),[displayName,setDisplayName]=useState(initialWebReceipt?.name??'');
 const [email,setEmail]=useState(initialWebReceipt?.email??''),[symptom,setSymptom]=useState(initialWebReceipt?.description??'');
 const [decision,setDecision]=useState<Decision>('REQUIRED');
 const [reason,setReason]=useState('');
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [receipt,setReceipt]=useState<Receipt|null>(null);
 const [held,setHeld]=useState<PendingReceipt[]>([]),[heldCursor,setHeldCursor]=useState<string|null>(null);
 const [heldRevision,setHeldRevision]=useState(0),[heldLoading,setHeldLoading]=useState(false);
 const [heldError,setHeldError]=useState('');
 const [resumedSymptom,setResumedSymptom]=useState('');
 useEffect(()=>{
  let live=true;setHeldLoading(true);setHeldError('');setHeld([]);setHeldCursor(null);
  api<PendingPage>('/api/scoped/support-intake/pending?serviceId='+encodeURIComponent(serviceId))
   .then(page=>{if(live){setHeld(page.items);setHeldCursor(page.nextCursor);}})
   .catch(()=>{if(live)setHeldError('保留中の受付を取得できませんでした。');})
   .finally(()=>{if(live)setHeldLoading(false);});
  return ()=>{live=false;};
 },[serviceId,heldRevision]);
 async function moreHeld(){
  if(!heldCursor||heldLoading||busy||open)return;
  setHeldLoading(true);setHeldError('');
  try{
   const page=await api<PendingPage>('/api/scoped/support-intake/pending?serviceId='+encodeURIComponent(serviceId)+'&cursor='+encodeURIComponent(heldCursor));
   setHeld(old=>[...old,...page.items.filter(item=>!old.some(x=>x.eventId===item.eventId))]);setHeldCursor(page.nextCursor);
  }catch{setHeldError('保留一覧を取得できませんでした。');}
  finally{setHeldLoading(false);}
 }
 async function startHeld(item:PendingReceipt){
  if(pending.current||busy||open||!item.canStart)return;
  pending.current=true;setBusy(true);setHeldError('');
  onOpenChange(true);
  try{
   const data=await api<Receipt>('/api/scoped/support-intake/events/'+item.eventId+'/evaluate',csrf,
    {serviceId,decision:'REQUIRED',reason:''});
   setReceipt(data);setResumedSymptom(item.symptom);setHeldRevision(n=>n+1);
   onBeneficiaryConfirmed?.();
  }catch{onOpenChange(false);setHeldError('対応を開始できませんでした。現在の権限と受付状況をご確認ください。');}
  finally{pending.current=false;setBusy(false);}
 }
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
   ...(initialWebReceipt
    ?{webReceiptId:initialWebReceipt.id}:{ }),
   caller:{kind:'NEW',organizationName:organizationName.trim(),
    displayName:displayName.trim(),...(email.trim()?{email:email.trim()}:{}),
    distinctPersonConfirmed:false},
   decision,reason:decision==='NOT_APPLICABLE'?reason.trim():decision==='REQUIRED'?'標準受付: オペレーターが確認・対応を開始することを選択':'',
  };
  if(!payload.symptom||!payload.caller.organizationName||!payload.caller.displayName||
   (decision==='NOT_APPLICABLE'&&!payload.reason))return;
  const key=JSON.stringify(payload);
  if(retry.current?.key!==key)retry.current={key,requestId:crypto.randomUUID()};
  pending.current=true;setBusy(true);setError('');setReceipt(null);
  try{
   const data=await api<Receipt>('/api/scoped/support-intake/new-caller',csrf,
    {...payload,requestId:retry.current.requestId});
   setReceipt(data);retry.current=null;setHeldRevision(n=>n+1);
  }catch{setError('受付できませんでした。権限や内容を確認してください。通信が不安定な場合は同じ内容で再送してください。');}
  finally{pending.current=false;setBusy(false);}
 }
 return <section className="scoped-intake" aria-label="問い合わせ受付">
  <button type="button" className="secondary" disabled={busy||!serviceId} onClick={()=>{if(!open||window.confirm("受付画面を閉じますか？未保存の入力がある場合は失われることがあります。"))onOpenChange(!open);}}>
   {open?'受付画面を閉じる':'問い合わせを受付'}
  </button>
  {!open&&<section aria-label="保留中の受付">
   <h3>保留中の受付</h3>
   <button type="button" className="secondary" disabled={busy||heldLoading} onClick={()=>setHeldRevision(n=>n+1)}>保留一覧を更新</button>
   {heldError&&<p role="alert">{heldError}</p>}
   {heldLoading&&<p>保留中の受付を確認しています…</p>}
   {!heldLoading&&!heldError&&!held.length&&<p>保留中の受付はありません。</p>}
   <ul>{held.map(item=><li key={item.eventId}>
    <span>{item.organizationName} / {item.callerName} — {new Date(item.createdAt).toLocaleString('ja-JP')}</span>
    <p>{item.symptom}</p>
    <button type="button" disabled={busy||heldLoading||!item.canStart} onClick={()=>void startHeld(item)}>対応を開始</button>
   </li>)}</ul>
   {heldCursor&&<button type="button" className="secondary" disabled={busy||heldLoading} onClick={()=>void moreHeld()}>さらに表示</button>}
  </section>}
  {open&&<div>
   <h2>問い合わせ受付</h2>
   <p>登録済み・未登録の問い合わせ者を受付します。会員資格や支援対象の確認は別操作です。</p>
   {error&&<p role="alert">{error}</p>}
   <label htmlFor="scoped-intake-mode">問い合わせ者の登録状況</label>
   <select id="scoped-intake-mode" value={mode} disabled={busy||!!receipt}
    onChange={event=>changed(()=>setMode(event.target.value as typeof mode))}>
    <option value="NEW">未登録企業・新規問い合わせ者</option>
    <option value="EXISTING">登録済みの所属・企業</option>
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
     <option value="DEFERRED">受付のみ（判断保留）</option>
     <option value="NOT_APPLICABLE">現時点で対応不要</option>
    </select>
    {decision==='NOT_APPLICABLE'&&<>
     <label htmlFor="scoped-intake-reason">判断理由</label>
     <textarea id="scoped-intake-reason" maxLength={4000} value={reason} disabled={busy} required
      onChange={event=>changed(()=>setReason(event.target.value))}/>
    </>}
    <button type="submit" disabled={busy||!serviceId||!organizationName.trim()||
     !displayName.trim()||!symptom.trim()||(decision==='NOT_APPLICABLE'&&!reason.trim())||!!receipt}>{decision==='REQUIRED'?'受付して対応を開始':decision==='DEFERRED'?'受付のみ':'対応不要として受付'}</button>
   </form>}
   {mode==='EXISTING'&&!receipt&&
    <ScopedExistingCallerForm csrf={csrf} serviceId={serviceId}
     {...(initialWebReceipt
      ?{webReceiptId:initialWebReceipt.id}:{})} {...(initialWebReceipt?{initialContact:{name:initialWebReceipt.name,email:initialWebReceipt.email,description:initialWebReceipt.description}}:{})} {...(initialOrganization?{initialOrganization}:{})}
     onReceived={data=>{setReceipt(data);setError('');setHeldRevision(n=>n+1);}}/>}
   {receipt&&<>
    <div role="status" className="scoped-write-notice">
     <p>受付記録を作成しました。問い合わせID: {receipt.eventId}</p>
     {receipt.workId&&<p>Workが作成されました。支援対象の確認・権限付き表示は別の操作です。</p>}
     {resumedSymptom&&<p>問い合わせ内容：{resumedSymptom}</p>}
     {!receipt.workId&&<p>判断を保留した受付は、受付画面を閉じると保留一覧から確認できます。</p>}
    </div>
    <ScopedBeneficiaryConfirmation csrf={csrf} serviceId={serviceId}
     eventId={receipt.eventId} onConfirmed={onBeneficiaryConfirmed}/>
    <button type="button" className="secondary" onClick={()=>{
     setReceipt(null);setResumedSymptom('');setOrganizationName('');setDisplayName('');
     setEmail('');setSymptom('');setDecision('REQUIRED');setReason('');
    }}>次の問い合わせ</button>
   </>}
  </div>}
 </section>;
}

/** Reception context is chosen before opening the form. CREATE candidates
 * are not the Work READ directory; existing authorized Work remains available
 * independently. Server-side command authorization is unchanged. */
export function ScopedReceptionWorkspace({csrf,onBeneficiaryConfirmed,onServiceChange,contextLocked=false,activeWork=null,returnRevision=0,onSelectWork}:{csrf:string;onBeneficiaryConfirmed?:()=>void;onServiceChange:(serviceId:string)=>void;contextLocked?:boolean;activeWork?:string|null;returnRevision?:number;onSelectWork?:(id:string)=>boolean}){
 const [services,setServices]=useState<Service[]>([]);
 const [cursor,setCursor]=useState<string|null>(null);
 const [chosen,setChosen]=useState('');
 const [open,setOpen]=useState(false);
 const [initial,setInitial]=useState<{organization?:{id:string;name:string};company?:string}|null>(null);
 const [formVersion,setFormVersion]=useState(0);
 const [webReceipt,setWebReceipt]=useState<PublicReceiptView|null>(null);
 const [linkBusy,setLinkBusy]=useState(false),[linkError,setLinkError]=useState(''),[linkNotice,setLinkNotice]=useState('');
 const linkPending=useRef(false);
 const [queueVersion,setQueueVersion]=useState(0);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const [moreBusy,setMoreBusy]=useState(false);
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{
  let live=true;
  setLoading(true);setError('');setServices([]);setCursor(null);setChosen('');
  api<ServicePage>('/api/scoped/support-service-contexts?limit=20')
   .then(page=>{if(live){setServices(page.items);setCursor(page.nextCursor);}})
   .catch(()=>{if(live)setError('受付可能なサービスを確認できませんでした。');})
   .finally(()=>{if(live)setLoading(false);});
  return ()=>{live=false;};
 },[refresh]);
 const single=!cursor&&services.length===1;
 const serviceId=single?services[0]!.id:chosen;
 const service=services.find(item=>item.id===serviceId);
 useEffect(()=>{onServiceChange(serviceId);setWebReceipt(null);},[serviceId,onServiceChange]);
 async function linkSelected(){
  if(!webReceipt||!activeWork||!serviceId||linkPending.current)return;
  if(!window.confirm('選択中の対応にこのWeb受付を関連登録しますか？'))return;
  linkPending.current=true;setLinkBusy(true);setLinkError('');setLinkNotice('');
  try{await api('/api/scoped/support-intake/services/'+serviceId+'/web-receipts/'+webReceipt.id+'/link',csrf,{workId:activeWork});setWebReceipt(null);setQueueVersion(n=>n+1);setLinkNotice('Web受付を関連登録しました。');}
  catch{setLinkError('関連登録できませんでした。対応先と権限、他担当者による登録状況を確認してください。');}
  finally{linkPending.current=false;setLinkBusy(false);}
 }
 async function more(){
  if(!cursor||moreBusy||open)return;
  setMoreBusy(true);setError('');
  try{
   const page=await api<ServicePage>('/api/scoped/support-service-contexts?limit=20&cursor='+encodeURIComponent(cursor));
   setServices(prev=>{const seen=new Set(prev.map(item=>item.id));return [...prev,...page.items.filter(item=>!seen.has(item.id))];});
   setCursor(page.nextCursor);
  }catch{setError('サービスの続きを取得できませんでした。');}
  finally{setMoreBusy(false);}
 }
 return <>
  <section aria-label="受付サービスコンテキスト" className="card">
   <h2>対応サービス</h2>
   {loading&&<p role="status">受付可能なサービスを確認しています…</p>}
   {error&&<><p role="alert">{error}</p><button type="button" className="secondary" disabled={open||moreBusy||contextLocked} onClick={()=>setRefresh(n=>n+1)}>受付サービスを再確認</button></>}
   {!loading&&!error&&!services.length&&<p>利用可能なサービスはありません。</p>}
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
  {service&&!service.canReceive&&<p>このサービスでは対応の閲覧が可能ですが、新規受付権限はありません。</p>}
  {service?.canReceive&&!open&&!activeWork&&<WebReceiptList key={service.id+':'+queueVersion} serviceId={service.id} disabled={contextLocked} onSelect={setWebReceipt}/>}
  {linkNotice&&<p role="status">{linkNotice}</p>}
  {linkError&&<p role="alert">{linkError}</p>}
  {webReceipt&&!open&&<section className="card" aria-label="選択したWeb受付"><h3>選択したWeb受付</h3><p>{webReceipt.company} / {webReceipt.department} / {webReceipt.name}</p><p>{webReceipt.email} / {webReceipt.phone}</p><p>{webReceipt.description}</p><p>受付ID：{webReceipt.id}</p>{activeWork?<button type="button" disabled={linkBusy} onClick={()=>void linkSelected()}>選択中の対応へ関連登録</button>:<button type="button" className="secondary" disabled={linkBusy} onClick={()=>setWebReceipt(null)}>Web受付の選択を解除</button>}</section>}
  {service?.canReceive&&onSelectWork&&<MemberReceptionLookup key={service.id+':'+(webReceipt?.id??'manual')} {...(webReceipt?{initialQuery:{company:webReceipt.company,phone:webReceipt.phone}}:{})} csrf={csrf} serviceId={service.id} hidden={open||!!activeWork} returnRevision={returnRevision} disabled={contextLocked} onSelectWork={onSelectWork} onNew={(organization,company)=>{setInitial(organization?{organization}:{company});setFormVersion(n=>n+1);setOpen(true);}}/>}
  {service?.canReceive&&<ScopedSupportIntake key={service.id+':'+formVersion} csrf={csrf} serviceId={service.id}
   {...(webReceipt?{initialWebReceipt:webReceipt}:{})} open={open} onOpenChange={value=>{setOpen(value);if(!value){setInitial(null);setFormVersion(n=>n+1);}}}
   {...(initial?.organization?{initialOrganization:initial.organization}:{})} {...(initial?.company!==undefined?{initialCompany:initial.company}:{})}
   {...(onBeneficiaryConfirmed?{onBeneficiaryConfirmed}:{})}/>}
 </>;
}
