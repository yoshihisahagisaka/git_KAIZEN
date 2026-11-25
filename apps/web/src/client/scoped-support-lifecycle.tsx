import {useEffect,useRef,useState,type FormEvent} from 'react';
import {api} from './api.js';

type Outcome='RESOLVED'|'NOT_ELIGIBLE'|'WITHDRAWN'|'FORMALLY_TRANSFERRED'|'OTHER_RESPONSIBILITY_ENDED';
type OpenState='CUSTOMER_WAIT'|'INVESTIGATING'|'MONITORING';
interface LifecycleContext {
 workId:string;status:'OPEN'|'IN_PROGRESS'|'COMPLETED';
 lifecycleRevision:number;recordRevision:number;latestCloseDecisionId:string|null;
}

/** This form is a separate Human-approved action, not a side effect of normal
 * SUPPORT UPDATE. Backend requires READ+UPDATE+APPROVE and rechecks at COMMIT. */
export function ScopedSupportLifecycle({workId,csrf,onChanged}:{
 workId:string;csrf:string;onChanged:()=>void;
}){
 const [context,setContext]=useState<LifecycleContext|null>(null);
 const [revision,setRevision]=useState(0),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const [response,setResponse]=useState(''),[closeReason,setCloseReason]=useState('');
 const [outcome,setOutcome]=useState<Outcome>('RESOLVED'),[confirmed,setConfirmed]=useState(false);
 const [reopenReason,setReopenReason]=useState('');
 const [reopenState,setReopenState]=useState<OpenState>('INVESTIGATING');
 const [followUp,setFollowUp]=useState('');
 const retry=useRef<{signature:string;requestId:string}|null>(null);
 const submitting=useRef(false);
 useEffect(()=>{
  let active=true;setContext(null);setError('');
  api<LifecycleContext>(`/api/scoped/support-work/${workId}/lifecycle-context`)
   .then(data=>{if(active)setContext(data);})
   // Denied lifecycle authority is a normal state; do not expose other
   // operators, Work metadata or tenant-wide counts.
   .catch(()=>{if(active)setContext(null);});
  return ()=>{active=false;};
 },[workId,revision]);
 const requestId=(payload:object)=>{
  const signature=JSON.stringify(payload);
  if(retry.current?.signature!==signature)
   retry.current={signature,requestId:crypto.randomUUID()};
  return retry.current.requestId;
 };
 async function close(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(submitting.current||!context||context.status==='COMPLETED'||
   !response.trim()||!closeReason.trim()||!confirmed)return;
  const command={
   expectedLifecycleRevision:context.lifecycleRevision,
   expectedRecordRevision:context.recordRevision,
   responseText:response.trim(),disposition:'COMPLETED',followUpAt:null,
   close:{outcome,closeReason:closeReason.trim(),
    confirmsOutstandingResponsibilityEnded:true},
  };
  submitting.current=true;setBusy(true);setError('');setNotice('');
  try{
   await api(`/api/scoped/support-work/${workId}/close`,csrf,{
    requestId:requestId(command),...command,
   });
   retry.current=null;setConfirmed(false);setResponse('');setCloseReason('');
   setNotice('対応を完了として記録しました。過去の履歴は保持されます。');
   setRevision(x=>x+1);onChanged();
  }catch{
   setError('Closeできませんでした。終了条件、権限と最新の状態を確認してください。');
  }finally{submitting.current=false;setBusy(false);}
 }
 async function reopen(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(submitting.current||!context||context.status!=='COMPLETED'||
   !context.latestCloseDecisionId||!reopenReason.trim()||!followUp)return;
  const dt=new Date(followUp);
  if(!Number.isFinite(dt.getTime())){setError('次回確認予定を確認してください。');return;}
  const command={
   expectedLifecycleRevision:context.lifecycleRevision,
   expectedCloseDecisionId:context.latestCloseDecisionId,
   reason:reopenReason.trim(),disposition:reopenState,followUpAt:dt.toISOString(),
  };
  submitting.current=true;setBusy(true);setError('');setNotice('');
  try{
   await api(`/api/scoped/support-work/${workId}/reopen`,csrf,{
    requestId:requestId(command),...command,
   });
   retry.current=null;setReopenReason('');setFollowUp('');
   setNotice('対応を再開しました。以前のClose記録は保持されます。');
   setRevision(x=>x+1);onChanged();
  }catch{
   setError('再開できませんでした。権限と最新のClose記録を確認してください。');
  }finally{submitting.current=false;setBusy(false);}
 }
 if(!context)return null;
 return <section className="scoped-action scoped-lifecycle" aria-label="対応の完了・再開">
  <h3>対応の完了・再開</h3>
  <p>独立した完了・再開権限を持つ担当者が、人の判断で実行します。</p>
  {error&&<p role="alert">{error}</p>}
  {notice&&<p role="status">{notice}</p>}
  {context.status!=='COMPLETED'
   ?<form onSubmit={e=>void close(e)} aria-label="対応完了の確認">
     <label htmlFor="scoped-close-response">最後の対応内容</label>
     <textarea id="scoped-close-response" maxLength={4000} disabled={busy}
      value={response} onChange={event=>setResponse(event.target.value)}/>
     <label htmlFor="scoped-close-outcome">完了結果</label>
     <select id="scoped-close-outcome" value={outcome} disabled={busy}
      onChange={event=>setOutcome(event.target.value as Outcome)}>
      <option value="RESOLVED">解決</option>
      <option value="NOT_ELIGIBLE">対象外と判断</option>
      <option value="WITHDRAWN">問い合わせ取り下げ</option>
      <option value="FORMALLY_TRANSFERRED">正式に引継ぎ済み</option>
      <option value="OTHER_RESPONSIBILITY_ENDED">その他、対応責任終了</option>
     </select>
     <label htmlFor="scoped-close-reason">終了理由</label>
     <textarea id="scoped-close-reason" maxLength={1000} disabled={busy}
      value={closeReason} onChange={event=>setCloseReason(event.target.value)}/>
     <label><input type="checkbox" checked={confirmed} disabled={busy}
      onChange={event=>setConfirmed(event.target.checked)}/>
      未完了の責任・必須Verificationが残っていないことを確認しました</label>
     <button type="submit" disabled={busy||!response.trim()||!closeReason.trim()||!confirmed}>
      確認して完了
     </button>
    </form>
   :<form onSubmit={e=>void reopen(e)} aria-label="完了済み対応の再開">
     <label htmlFor="scoped-reopen-reason">対応を再開する理由</label>
     <textarea id="scoped-reopen-reason" maxLength={1000} disabled={busy}
      value={reopenReason} onChange={event=>setReopenReason(event.target.value)}/>
     <label htmlFor="scoped-reopen-status">再開後の状態</label>
     <select id="scoped-reopen-status" value={reopenState} disabled={busy}
      onChange={event=>setReopenState(event.target.value as OpenState)}>
      <option value="INVESTIGATING">確認中</option>
      <option value="CUSTOMER_WAIT">お客様の回答待ち</option>
      <option value="MONITORING">経過観察</option>
     </select>
     <label htmlFor="scoped-reopen-followup">次回確認予定</label>
     <input id="scoped-reopen-followup" type="datetime-local" value={followUp}
      disabled={busy} onChange={event=>setFollowUp(event.target.value)}/>
     <button type="submit" disabled={busy||!reopenReason.trim()||!followUp}>
      確認して再開
     </button>
    </form>}
 </section>;
}
