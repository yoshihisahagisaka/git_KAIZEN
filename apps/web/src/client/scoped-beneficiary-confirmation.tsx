import {useEffect,useRef,useState,type FormEvent} from 'react';
import {api} from './api.js';

interface OwnReceipt {
 eventId:string;serviceId:string;workId:string|null;
 callerOrganizationId:string;callerOrganizationName:string;
 beneficiaryRevision:number;beneficiaryKind:'CONFIRMED'|'CLEARED'|null;
 canConfirm:boolean;
}
interface Organization {id:string;name:string}
interface OrganizationPage {items:Organization[];nextCursor:string|null}
interface ConfirmationResult {eventId:string;decisionId:string;revision:number;kind:'CONFIRMED'}

/** Work reception and verified beneficiary are deliberately separate acts.
 * The submitted organizationId is re-authorized in the DB transaction; this
 * UI never grants Registry, membership or Work access to the Caller. */
export function ScopedBeneficiaryConfirmation({csrf,serviceId,eventId,onConfirmed}:{
 csrf:string;serviceId:string;eventId:string;onConfirmed?:()=>void;
}){
 const [own,setOwn]=useState<OwnReceipt|null>(null);
 const [organizations,setOrganizations]=useState<Organization[]>([]);
 const [cursor,setCursor]=useState<string|null>(null);
 const [selection,setSelection]=useState('');
 const [reason,setReason]=useState('');
 const [attested,setAttested]=useState(false);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const request=useRef<{key:string;id:string}|null>(null);
 const sending=useRef(false);

 useEffect(()=>{
  let active=true;
  setLoading(true);setError('');setNotice('');setSelection('');
  setOwn(null);setOrganizations([]);setCursor(null);
  api<OwnReceipt>(`/api/scoped/support-intake/events/${eventId}/beneficiary?${new URLSearchParams({serviceId})}`)
   .then(value=>{if(active)setOwn(value);})
   .catch(()=>{if(active)setError('この受付の確認情報を取得できませんでした。権限を確認してください。');})
   .finally(()=>{if(active)setLoading(false);});
  // A failed Registry lookup never prevents confirming the receiving Actor's
  // own new affiliation. Other service-recipient choices remain hidden.
  api<OrganizationPage>(`/api/scoped/support-intake/services/${serviceId}/organizations?limit=20`)
   .then(value=>{if(active){setOrganizations(value.items);setCursor(value.nextCursor);}})
   .catch(()=>{if(active){setOrganizations([]);setCursor(null);}});
  return ()=>{active=false;};
 },[eventId,serviceId]);

 async function more(){
  if(!cursor||busy)return;
  setBusy(true);setError('');
  try{
   const page=await api<OrganizationPage>(
    `/api/scoped/support-intake/services/${serviceId}/organizations?${new URLSearchParams({limit:'20',cursor})}`);
   setOrganizations(previous=>{
    const known=new Set(previous.map(x=>x.id));
    return [...previous,...page.items.filter(x=>!known.has(x.id))];
   });setCursor(page.nextCursor);
  }catch{setError('登録済み支援対象の候補を追加取得できませんでした。');}
  finally{setBusy(false);}
 }
 function changed(run:()=>void){
  run();setAttested(false);setError('');setNotice('');
 }
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!own?.canConfirm||!selection||!reason.trim()||!attested||sending.current)return;
  const payload={
   serviceId,expectedRevision:own.beneficiaryRevision,kind:'CONFIRMED',
   organizationId:selection,reason:reason.trim(),humanConfirmed:true,
  };
  const key=JSON.stringify(payload);
  if(request.current?.key!==key)request.current={key,id:crypto.randomUUID()};
  sending.current=true;setBusy(true);setError('');setNotice('');
  try{
   const result=await api<ConfirmationResult>(
    `/api/scoped/support-intake/events/${eventId}/beneficiary`,csrf,
    {...payload,requestId:request.current.id});
   setOwn(previous=>previous?{...previous,beneficiaryRevision:result.revision,
    beneficiaryKind:result.kind}:previous);
   setSelection('');setReason('');setAttested(false);request.current=null;
   setNotice('支援対象企業の確認記録を保存しました。会員資格や本人確認を確定したものではありません。');
   onConfirmed?.();
  }catch{setError('確認を記録できませんでした。対象・権限・更新状況を確認してください。');}
  finally{sending.current=false;setBusy(false);}
 }
 return <section className="scoped-beneficiary" aria-label="支援対象企業を確認">
  <h3>支援対象企業の確認</h3>
  <p>問い合わせ者の所属と、実際の支援対象企業は異なる場合があります。
   この確認は会員資格・本人確認・検証済みFACTの認定ではありません。</p>
  {loading&&<p>受付情報を確認しています…</p>}
  {error&&<p role="alert">{error}</p>}
  {notice&&<p role="status">{notice}</p>}
  {own&&<>
   <p>受付時の申告所属：<strong>{own.callerOrganizationName}</strong>（未検証）</p>
   {own.beneficiaryRevision>0&&<p>確認・訂正履歴：{own.beneficiaryRevision}件。
    最新：{own.beneficiaryKind==='CONFIRMED'?'対象を確認':'対象の確認を解除'}</p>}
   {!own.canConfirm?<p>支援対象の確認操作には、サービスの明示的なSUPPORT更新権限が必要です。
    管理者に確認してください。</p>:<form onSubmit={e=>void submit(e)}>
    <label htmlFor="scoped-beneficiary-org">実際の支援対象企業</label>
    <select id="scoped-beneficiary-org" value={selection} disabled={busy}
     onChange={event=>changed(()=>setSelection(event.target.value))}>
     <option value="">企業を明示的に選択してください</option>
     <option value={own.callerOrganizationId}>
      受付時申告の所属：{own.callerOrganizationName}（未検証）
     </option>
     {organizations.filter(o=>o.id!==own.callerOrganizationId).map(o=>
      <option key={o.id} value={o.id}>サービスに登録済みの候補：{o.name}</option>)}
    </select>
    {cursor&&<button type="button" className="secondary" disabled={busy}
     onClick={()=>void more()}>登録済み候補をさらに表示</button>}
    <label htmlFor="scoped-beneficiary-reason">確認した内容・理由</label>
    <textarea id="scoped-beneficiary-reason" maxLength={1000} disabled={busy}
     value={reason} onChange={event=>changed(()=>setReason(event.target.value))}/>
    <label><input type="checkbox" disabled={busy} checked={attested}
     onChange={event=>setAttested(event.target.checked)}/>
     上記の企業が今回の支援対象であると確認しました（会員資格の確認ではありません）</label>
    <button type="submit" disabled={busy||!selection||!reason.trim()||!attested}>
     支援対象の確認を記録
    </button>
   </form>}
   {own.workId&&<p>Work ID：{own.workId}。対応画面の表示には別途SUPPORT閲覧権限が必要です。</p>}
  </>}
 </section>;
}
