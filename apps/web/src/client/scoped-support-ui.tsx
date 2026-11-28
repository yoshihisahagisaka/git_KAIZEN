import {RelatedInquiries} from './related-inquiries.js';
import {useCallback,useEffect,useRef,useState} from 'react';
import {ProcedurePageReference} from './procedure-page-reference.js';
import {ScopedReceptionWorkspace} from './scoped-support-intake.js';
import type {CtiReceptionHint} from '../../../../packages/domain/src/cti-reception.js';
import {api,ApiError} from './api.js';
import {ScopedRegistryReviewUI} from './scoped-registry-review-ui.js';
import type {
  ScopedOwnerCandidates,ScopedRegistryPeoplePage,
  ScopedSupportHistoryEntry,ScopedSupportWorkHistory,ScopedSupportWorkPage,
  ScopedSupportWorkSummary,
} from '../server/persistence/scoped-access-reader.js';

const statusLabels:Record<ScopedSupportWorkSummary['status'],string>={
  OPEN:'受付済み',IN_PROGRESS:'対応中',COMPLETED:'完了',
};
const eventLabels:Record<string,string>={
  ESCALATION_REQUESTED:'専門対応の依頼',ESCALATION_RESULT_RECORDED:'依頼への回答を記録',OWNER_TRANSFERRED:'担当者を引継ぎ',RESPONSE:'対応を記録',RESPONSE_CORRECTION:'対応内容を訂正',
  CONTINUATION_RECORDED:'継続対応を記録',WAITING_SET:'回答・対応待ち',
  RESUMED:'対応を再開',NEXT_ACTION_CLEARED:'次の対応を確認',REOPENED:'対応中に戻す',
};
const dispositionLabels:Record<string,string>={
  CUSTOMER_WAIT:'お客様の回答待ち',INVESTIGATING:'確認中',
  MONITORING:'経過観察',COMPLETED:'完了',
};
type OpenDisposition='CUSTOMER_WAIT'|'INVESTIGATING'|'MONITORING';
function date(value:string|null) {
  if(!value)return '未設定';
  const parsed=new Date(value);
  return Number.isFinite(parsed.getTime())?parsed.toLocaleString('ja-JP'):'未確認';
}
function WorkSummary({work}:{work:ScopedSupportWorkSummary}) {
  return <dl className="scoped-work-summary">
    <dt>状態</dt><dd>{statusLabels[work.status]}{work.waiting?'（回答・対応待ち）':''}</dd>
    <dt>次にやること</dt><dd>{work.nextAction||'未設定'}</dd>
    <dt>次回確認予定</dt><dd>{date(work.followUpAt)}</dd>
    <dt>更新日時</dt><dd>{date(work.updatedAt)}</dd>
  </dl>;
}
const lifecycleLabels:Record<ScopedRegistryPeoplePage['items'][number]['lifecycleStatus'],string>={
  JOINING:'登録手続き中',ACTIVE:'在籍',INACTIVE:'非在籍',
};
/** Mounted only for the server-authorized current beneficiary. All directory
 * reads go through the narrow REGISTRY endpoint, independently reauthorized. */
function ScopedRegistryContext({work,csrf}:{work:ScopedSupportWorkSummary;csrf:string}) {
  const [page,setPage]=useState<ScopedRegistryPeoplePage|null>(null);
  const [busy,setBusy]=useState(true);
  const [error,setError]=useState(false);
  const [loadingMore,setLoadingMore]=useState(false);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [proposedName,setProposedName]=useState('');
  const [reason,setReason]=useState('');
  const [saving,setSaving]=useState(false);
  const [writeError,setWriteError]=useState('');
  const [pendingNotice,setPendingNotice]=useState('');
  const [refreshIndex,setRefreshIndex]=useState(0);
  const retry=useRef<{personId:string;payload:{serviceId:string;requestId:string;requestKey:string;
   proposedDisplayName:string;reason:string;expectedRegistryRevision:number}}|null>(null);
  const saveInFlight=useRef(false);
  const organizationId=work.registryOrganizationId!;
  const serviceId=work.serviceId;
  const url=`/api/scoped/registry/organizations/${organizationId}/people?serviceId=${serviceId}&limit=20`;
  useEffect(()=>{
    let active=true;
    setPage(null);setError(false);setBusy(true);setEditingId(null);
    setWriteError('');setPendingNotice('');retry.current=null;
    api<ScopedRegistryPeoplePage>(url).then(result=>{
      if(result.organizationId!==organizationId)throw Error('Registry organization mismatch');
      if(active)setPage(result);
    }).catch(()=>{if(active){setPage(null);setError(true);}})
      .finally(()=>{if(active)setBusy(false);});
    return ()=>{active=false;};
  },[url,organizationId,refreshIndex]);

  function startEditing(person:ScopedRegistryPeoplePage['items'][number]){
    setEditingId(person.personId);setProposedName(person.displayName);setReason('');
    setWriteError('');setPendingNotice('');retry.current=null;
  }
  async function submitProposal(event:React.FormEvent<HTMLFormElement>,
   person:ScopedRegistryPeoplePage['items'][number]){
    event.preventDefault();
    const proposed=proposedName.trim(),rationale=reason.trim();
    if(saveInFlight.current||!page?.canPropose||editingId!==person.personId||
      !proposed||proposed===person.displayName||!rationale||
      !Number.isSafeInteger(person.registryRevision))return;
    const previous=retry.current;
    const payload=previous?.personId===person.personId&&
     previous.payload.proposedDisplayName===proposed&&previous.payload.reason===rationale&&
     previous.payload.expectedRegistryRevision===person.registryRevision
      ?previous.payload:{serviceId,requestId:crypto.randomUUID(),requestKey:crypto.randomUUID(),
        proposedDisplayName:proposed,reason:rationale,expectedRegistryRevision:person.registryRevision};
    retry.current={personId:person.personId,payload};
    saveInFlight.current=true;setSaving(true);setWriteError('');setPendingNotice('');
    try{
      const result=await api<{changeId:string;status:string}>(
        `/api/scoped/registry/people/${person.personId}/display-name-proposals`,csrf,payload);
      if(result.status!=='PENDING_REVIEW')throw Error('Unexpected Registry response');
      setEditingId(null);setReason('');retry.current=null;
      // The displayed authoritative Person stays unchanged until a different
      // reviewer verifies and commits the Change.
      setPendingNotice('変更依頼を受け付けました。現在、確認待ちです。');
    }catch(cause){
      if(cause instanceof ApiError&&[401,403,404].includes(cause.status)){
        setPage(null);setEditingId(null);retry.current=null;
        setError(true);
      }else{
        setWriteError('変更依頼を受け付けたか確認できませんでした。同じ内容で再試行するか、最新情報を確認してください。');
      }
    }finally{saveInFlight.current=false;setSaving(false);}
  }

  async function loadMorePeople(){
    if(!page?.nextCursor||loadingMore)return;
    setLoadingMore(true);setError(false);
    try {
      const result=await api<ScopedRegistryPeoplePage>(`${url}&cursor=${encodeURIComponent(page.nextCursor)}`);
      if(result.organizationId!==organizationId)throw Error('Registry organization mismatch');
      setPage(previous=>{
        if(!previous||previous.organizationId!==result.organizationId)return null;
        const seen=new Set(previous.items.map(person=>person.personId));
        return {...result,items:[...previous.items,...result.items.filter(person=>!seen.has(person.personId))]};
      });
    } catch {
      // A revoked grant must not leave previously fetched Person data on screen.
      setPage(null);setError(true);
    } finally {setLoadingMore(false);}
  }

  return <section aria-label="受益企業の登録情報" className="scoped-registry-context">
    <h3>受益企業の登録情報</h3>
    <button type="button" className="secondary" disabled={busy||saving}
      onClick={()=>setRefreshIndex(value=>value+1)}>登録情報を更新</button>
    {busy&&<p role="status">登録情報を確認しています…</p>}
    {error&&<p role="alert">登録情報を取得できませんでした。最新情報を確認してください。</p>}
    {pendingNotice&&<p role="status" className="scoped-write-notice">{pendingNotice}</p>}
    {writeError&&<p role="alert" className="scoped-write-error">{writeError}</p>}
    {page&&<>
      <strong className="scoped-registry-organization">{page.organizationName}</strong>
      {!page.items.length&&<p>登録されている方はいません。</p>}
      <ul>{page.items.map(person=><li key={person.personId}>
        <span>{person.displayName}</span><span>{lifecycleLabels[person.lifecycleStatus]}</span>
        {person.latestOwnRequest&&<div className="registry-own-request">
         <strong>前回の変更依頼：{person.latestOwnRequest.status==='REJECTED'?'差し戻し':
          person.latestOwnRequest.status==='COMMITTED'?'確定済み':'確認待ち'}</strong>
         <p>申請した表示名：{person.latestOwnRequest.proposedDisplayName}</p>
         {person.latestOwnRequest.status==='REJECTED'&&<p>
          差し戻し理由：{person.latestOwnRequest.rejectionReason}</p>}
         {person.latestOwnRequest.status==='REJECTED'&&<small>
          訂正する場合は「編集」から新しい変更依頼を提出してください。</small>}
        </div>}
        {page.canPropose&&editingId!==person.personId&&<button type="button" className="secondary"
          disabled={saving||!Number.isSafeInteger(person.registryRevision)}
          onClick={()=>startEditing(person)}>編集</button>}
        {page.canPropose&&editingId===person.personId&&<form className="scoped-registry-edit" aria-label="表示名の変更依頼"
          onSubmit={event=>void submitProposal(event,person)}>
          <label htmlFor={`registry-name-${person.personId}`}>訂正後の表示名</label>
          <input id={`registry-name-${person.personId}`} maxLength={200} required
            value={proposedName} disabled={saving} onChange={event=>{setProposedName(event.target.value);retry.current=null;}}/>
          <label htmlFor={`registry-reason-${person.personId}`}>訂正理由</label>
          <input id={`registry-reason-${person.personId}`} maxLength={1000} required
            value={reason} disabled={saving} onChange={event=>{setReason(event.target.value);retry.current=null;}}/>
          <div className="scoped-registry-buttons">
            <button type="submit" disabled={saving||!proposedName.trim()||!reason.trim()||
              proposedName.trim()===person.displayName}>保存</button>
            <button type="button" className="secondary" disabled={saving}
              onClick={()=>{setEditingId(null);setWriteError('');retry.current=null;}}>キャンセル</button>
          </div>
          <small>保存後は確認待ちになります。承認されるまで現在の登録情報は変わりません。</small>
        </form>}
      </li>)}</ul>
      {page.nextCursor&&<button type="button" className="secondary" disabled={loadingMore}
        onClick={()=>void loadMorePeople()}>さらに表示</button>}
    </>}
  </section>;
}
function HistoryEntry({entry,onCorrect}:{entry:ScopedSupportHistoryEntry;onCorrect:(entry:ScopedSupportHistoryEntry)=>void}) {
  return <li>
    <strong>{eventLabels[entry.kind]??'対応状況の変更'}</strong>
    <time dateTime={entry.occurredAt}>{date(entry.occurredAt)}</time>
    {entry.responseText&&<p className="scoped-record-text">{entry.responseText}</p>}
    {entry.disposition&&<p>対応後の状態: {dispositionLabels[entry.disposition]??'確認中'}</p>}
    {entry.correctionReason&&<p>訂正理由: {entry.correctionReason}</p>}
    {entry.canCorrect&&<button type="button" className="secondary" onClick={()=>onCorrect(entry)}>この記録を訂正</button>}
  </li>;
}

/** Reads and writes exclusively through the scoped SUPPORT endpoints, with
 * server-derived grants on each request; never calls broad internal APIs. */
export function ScopedSupportUI({csrf,initialCti=null}:{
 csrf:string;
 initialCti?:CtiReceptionHint|null;
}) {
  const [items,setItems]=useState<ScopedSupportWorkSummary[]>([]);
  const [serviceId,setServiceId]=useState('');
  const [listServiceId,setListServiceId]=useState<string|null>(null);
  const [nextCursor,setNextCursor]=useState<string|null>(null);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [detail,setDetail]=useState<ScopedSupportWorkSummary|null>(null);
  const [history,setHistory]=useState<ScopedSupportWorkHistory|null>(null);
  const [busy,setBusy]=useState(false);
  const [detailBusy,setDetailBusy]=useState(false);
  const [error,setError]=useState('');
  const [detailError,setDetailError]=useState('');
  const [revision,setRevision]=useState(0);
  const [responseText,setResponseText]=useState('');
  const [disposition,setDisposition]=useState<OpenDisposition>('INVESTIGATING');
  const [followUpLocal,setFollowUpLocal]=useState('');
  const [correctionTarget,setCorrectionTarget]=useState<ScopedSupportHistoryEntry|null>(null);
  const [correctionText,setCorrectionText]=useState('');
  const [correctionReason,setCorrectionReason]=useState('');
  const [writeBusy,setWriteBusy]=useState(false);
  const [writeError,setWriteError]=useState('');
  const [writeNotice,setWriteNotice]=useState('');
  const [lifecycleMode,setLifecycleMode]=useState<'CLOSE'|'REOPEN'|'TRANSFER'|'ESCALATION'|null>(null);
  const [escalationTarget,setEscalationTarget]=useState('');
  const [escalationRequest,setEscalationRequest]=useState('');
  const [escalationResultId,setEscalationResultId]=useState('');
  async function submitEscalation(event:React.FormEvent<HTMLFormElement>){
   event.preventDefault();
   if(!detail?.canUpdate||!selectedId||writeInFlight.current||!lifecycleReason.trim())return;
   if(!escalationResultId&&(!escalationTarget.trim()||!escalationRequest.trim()))return;
   const payload={expectedLifecycleRevision:detail.lifecycleRevision,reason:lifecycleReason.trim(),
    ...(escalationResultId?{kind:'RESULT',escalationEventId:escalationResultId}:{kind:'REQUEST',target:escalationTarget.trim(),requested:escalationRequest.trim()})};
   const key=JSON.stringify(payload);
   if(lifecycleRetry.current?.key!==key)lifecycleRetry.current={key,id:crypto.randomUUID()};
   const workId=selectedId;writeInFlight.current=true;setWriteBusy(true);setWriteError('');setWriteNotice('');
   try{
    await api('/api/scoped/support-work/'+workId+'/escalations',csrf,{...payload,requestId:lifecycleRetry.current.id});
    if(selectedRequestId.current!==workId)return;
    setLifecycleMode(null);setLifecycleReason('');lifecycleRetry.current=null;
    setWriteNotice('依頼・回答の記録を保存しました。');refreshWork();
   }catch{if(selectedRequestId.current===workId)setWriteError('記録できませんでした。権限と更新状況を確認してください。');}
   finally{writeInFlight.current=false;if(selectedRequestId.current===workId)setWriteBusy(false);}
  }
  const [owners,setOwners]=useState<ScopedOwnerCandidates|null>(null);
  const [newOwner,setNewOwner]=useState('');
  const [ownerLoading,setOwnerLoading]=useState(false);
  async function loadOwners(workId:string,cursor?:string){
    setOwnerLoading(true);setWriteError('');
    try{
      const data=await api<ScopedOwnerCandidates>('/api/scoped/support-work/'+workId+'/owner-candidates?limit=20'+(cursor?'&cursor='+encodeURIComponent(cursor):''));
      if(selectedRequestId.current!==workId)return;
      setOwners(old=>cursor&&old&&old.currentOwnerId===data.currentOwnerId?{...data,items:[...old.items,...data.items.filter(x=>!old.items.some(y=>y.id===x.id))]}:data);
    }catch{if(selectedRequestId.current===workId){setOwners(null);setWriteError('引継ぎ候補を取得できませんでした。');}}
    finally{if(selectedRequestId.current===workId)setOwnerLoading(false);}
  }
  async function submitTransfer(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!detail?.canClose||!selectedId||!owners||!newOwner||!lifecycleReason.trim()||writeInFlight.current||ownerLoading)return;
    const workId=selectedId,payload={expectedLifecycleRevision:detail.lifecycleRevision,expectedOwnerId:owners.currentOwnerId,newOwnerId:newOwner,reason:lifecycleReason.trim()};
    const key=JSON.stringify(payload);
    if(lifecycleRetry.current?.key!==key)lifecycleRetry.current={key,id:crypto.randomUUID()};
    writeInFlight.current=true;setWriteBusy(true);setWriteError('');setWriteNotice('');
    try{
     await api('/api/scoped/support-work/'+workId+'/owner-transfer',csrf,{...payload,requestId:lifecycleRetry.current.id});
     if(selectedRequestId.current!==workId)return;
     setLifecycleMode(null);setOwners(null);setNewOwner('');setLifecycleReason('');lifecycleRetry.current=null;
     setWriteNotice('担当者を引き継ぎました。');refreshWork();
    }catch{if(selectedRequestId.current===workId)setWriteError('引継ぎできませんでした。権限と現在の担当者を確認してください。');}
    finally{writeInFlight.current=false;if(selectedRequestId.current===workId)setWriteBusy(false);}
  }
  const [lifecycleReason,setLifecycleReason]=useState('');
  const [closeOutcome,setCloseOutcome]=useState('RESOLVED');
  const [responsibilityEnded,setResponsibilityEnded]=useState(false);
  const lifecycleRetry=useRef<{key:string;id:string}|null>(null);
  const [reopenAt,setReopenAt]=useState('');
  const selectedRequestId=useRef<string|null>(null);
  const writeInFlight=useRef(false);
  const responseRequestId=useRef<string|null>(null);
  const correctionRequestId=useRef<string|null>(null);
  const [receptionWork,setReceptionWork]=useState<string|null>(null);
  const [receptionReturn,setReceptionReturn]=useState(0);
  function selectWork(id:string|null) {
    if(receptionWork&&id!==receptionWork){setReceptionWork(null);setReceptionReturn(n=>n+1);}
    selectedRequestId.current=id;setSelectedId(id);
    setResponseText('');setDisposition('INVESTIGATING');setFollowUpLocal('');
    setCorrectionTarget(null);setCorrectionText('');setCorrectionReason('');
    responseRequestId.current=null;correctionRequestId.current=null;
    setWriteError('');setWriteNotice('');
    setLifecycleMode(null);setLifecycleReason('');setResponsibilityEnded(false);setReopenAt('');lifecycleRetry.current=null;setOwners(null);setNewOwner('');setOwnerLoading(false);
  }
  const changeService=useCallback((id:string)=>{
    setServiceId(id);setItems([]);setNextCursor(null);setListServiceId(null);
  },[]);
  const listUrl='/api/scoped/support-work?limit=20'+(serviceId?'&serviceId='+encodeURIComponent(serviceId):'');
  const contextLocked=!!selectedId||writeBusy||detailBusy||busy;
  function refreshWork() {setWriteError('');setRevision(r=>r+1);}
  function startCorrection(entry:ScopedSupportHistoryEntry) {
    setCorrectionTarget(entry);setCorrectionText(entry.responseText??'');setCorrectionReason('');
    correctionRequestId.current=null;setWriteError('');setWriteNotice('');
  }
  async function submitResponse(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!detail||!detail.canUpdate||!selectedId||writeInFlight.current)return;
    const text=responseText.trim(),followUp=new Date(followUpLocal);
    if(!text||text.length>4000||!followUpLocal||!Number.isFinite(followUp.getTime())){
      setWriteError('対応内容と次回確認予定を確認してください。');return;
    }
    const workId=selectedId,requestId=responseRequestId.current??crypto.randomUUID();
    responseRequestId.current=requestId;writeInFlight.current=true;setWriteBusy(true);setWriteError('');setWriteNotice('');
    try {
      await api(`/api/scoped/support-work/${workId}/responses`,csrf,{
        requestId,expectedLifecycleRevision:detail.lifecycleRevision,expectedRecordRevision:detail.recordRevision,
        responseText:text,disposition,followUpAt:followUp.toISOString(),
      });
      if(selectedRequestId.current!==workId)return;
      responseRequestId.current=null;setResponseText('');setFollowUpLocal('');
      setWriteNotice('対応を記録しました。');refreshWork();
    } catch {
      if(selectedRequestId.current===workId){
        setWriteError('記録できませんでした。権限や更新状況を確認してください。再送時は同じ内容で試してください。');
      }
    } finally {writeInFlight.current=false;if(selectedRequestId.current===workId)setWriteBusy(false);}
  }
  async function submitLifecycle(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!detail||!selectedId||writeInFlight.current||!lifecycleReason.trim())return;
    const closing=lifecycleMode==='CLOSE';
    if(closing?!detail.canClose||!responsibilityEnded||!responseText.trim():lifecycleMode!=='REOPEN'||!detail.canReopen||!reopenAt)return;
    const follow=new Date(reopenAt);
    if(!closing&&!Number.isFinite(follow.getTime()))return;
    const payload=closing?{expectedLifecycleRevision:detail.lifecycleRevision,expectedRecordRevision:detail.recordRevision,
      responseText:responseText.trim(),outcome:closeOutcome,closeReason:lifecycleReason.trim(),confirmsOutstandingResponsibilityEnded:true}:
      {expectedLifecycleRevision:detail.lifecycleRevision,expectedCloseDecisionId:detail.latestCloseDecisionId??null,
       reason:lifecycleReason.trim(),disposition:'INVESTIGATING',followUpAt:follow.toISOString()};
    const key=JSON.stringify(payload);
    if(lifecycleRetry.current?.key!==key)lifecycleRetry.current={key,id:crypto.randomUUID()};
    const workId=selectedId;
    writeInFlight.current=true;setWriteBusy(true);setWriteError('');setWriteNotice('');
    try{
      await api('/api/scoped/support-work/'+workId+(closing?'/close':'/reopen'),csrf,{...payload,requestId:lifecycleRetry.current.id});
      if(selectedRequestId.current!==workId)return;
      setLifecycleMode(null);setLifecycleReason('');setResponsibilityEnded(false);setReopenAt('');setResponseText('');setFollowUpLocal('');
      lifecycleRetry.current=null;
      setWriteNotice(closing?'対応を完了しました。':'対応を再開しました。');refreshWork();
    }catch{
      if(selectedRequestId.current===workId)setWriteError('操作できませんでした。権限・残る責任・確認状況を確認してください。');
    }finally{writeInFlight.current=false;if(selectedRequestId.current===workId)setWriteBusy(false);}
  }
  async function submitCorrection(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!detail||!detail.canUpdate||!selectedId||!correctionTarget?.canCorrect||writeInFlight.current)return;
    const text=correctionText.trim(),reason=correctionReason.trim();
    if(!text||text.length>4000||!reason||reason.length>1000){
      setWriteError('訂正内容と訂正理由を確認してください。');return;
    }
    const workId=selectedId,recordId=correctionTarget.id;
    const requestId=correctionRequestId.current??crypto.randomUUID();
    correctionRequestId.current=requestId;writeInFlight.current=true;setWriteBusy(true);setWriteError('');setWriteNotice('');
    try {
      await api(`/api/scoped/support-work/${workId}/responses/${recordId}/corrections`,csrf,{
        requestId,expectedRecordRevision:detail.recordRevision,responseText:text,correctionReason:reason,
      });
      if(selectedRequestId.current!==workId)return;
      correctionRequestId.current=null;setCorrectionTarget(null);setCorrectionText('');setCorrectionReason('');
      setWriteNotice('元の記録を残したまま、訂正を追記しました。');refreshWork();
    } catch {
      if(selectedRequestId.current===workId){
        setWriteError('訂正できませんでした。権限や更新状況を確認してください。再送時は同じ内容で試してください。');
      }
    } finally {writeInFlight.current=false;if(selectedRequestId.current===workId)setWriteBusy(false);}
  }

  useEffect(()=>{
    let active=true;
    setBusy(true);setError('');setItems([]);setNextCursor(null);
    api<ScopedSupportWorkPage>(listUrl)
      .then(page=>{if(active){setItems(page.items);setNextCursor(page.nextCursor);setListServiceId(serviceId);}})
      .catch(()=>{if(active){setItems([]);setError('許可された対応を取得できませんでした。再度お試しください。');}})
      .finally(()=>{if(active)setBusy(false);});
    return ()=>{active=false;};
  },[revision,listUrl,serviceId]);

  useEffect(()=>{
    selectedRequestId.current=selectedId;
    if(!selectedId){setDetail(null);setHistory(null);return;}
    let active=true;
    setDetail(null);setHistory(null);setDetailError('');setDetailBusy(true);
    Promise.all([
      api<ScopedSupportWorkSummary>(`/api/scoped/support-work/${selectedId}`),
      api<ScopedSupportWorkHistory>(`/api/scoped/support-work/${selectedId}/history?limit=20`),
    ]).then(([work,records])=>{
      if(work.workId!==selectedId||records.work.workId!==selectedId||
         (serviceId&&(work.serviceId!==serviceId||records.work.serviceId!==serviceId)))throw Error('Work mismatch');
      if(active){
        setDetail(work);setHistory(records);
      }
    }).catch(()=>{if(active){setDetail(null);setHistory(null);setDetailError('この対応の閲覧権限を確認できませんでした。一覧を更新してください。');}})
      .finally(()=>{if(active)setDetailBusy(false);});
    return ()=>{active=false;};
  },[selectedId,revision,serviceId]);

  async function loadMore() {
    if(!nextCursor||busy||listServiceId!==serviceId)return;
    setBusy(true);setError('');
    try {
      const page=await api<ScopedSupportWorkPage>(`${listUrl}&cursor=${encodeURIComponent(nextCursor)}`);
      setItems(previous=>{
        const seen=new Set(previous.map(item=>item.workId));
        return [...previous,...page.items.filter(item=>!seen.has(item.workId))];
      });
      setNextCursor(page.nextCursor);
    } catch {
      // Old list might no longer be authorized. Revalidate from page one.
      selectWork(null);setItems([]);setNextCursor(null);
      setError('一覧を更新できませんでした。閲覧権限を確認してから再読み込みしてください。');
    } finally {setBusy(false);}
  }
  async function loadMoreHistory() {
    if(!selectedId||!history?.nextCursor||detailBusy)return;
    const workId=selectedId,cursor=history.nextCursor;
    setDetailBusy(true);setDetailError('');
    try {
      const page=await api<ScopedSupportWorkHistory>(`/api/scoped/support-work/${workId}/history?limit=20&cursor=${encodeURIComponent(cursor)}`);
      if(selectedRequestId.current!==workId)return;
      if(page.work.workId!==workId)throw Error('Work mismatch');
      setHistory(previous=>{
        if(!previous||previous.work.workId!==workId)return null;
        const seen=new Set(previous.entries.map(entry=>entry.id));
        return {...page,entries:[...previous.entries,...page.entries.filter(entry=>!seen.has(entry.id))]};
      });
      setDetail(page.work);
    } catch {
      if(selectedRequestId.current!==workId)return;
      setDetail(null);setHistory(null);
      setDetailError('この対応の閲覧権限を確認できませんでした。一覧を更新してください。');
    } finally {if(selectedRequestId.current===workId)setDetailBusy(false);}
  }

  return <div className="scoped-support-layout">
    <nav aria-label="許可された対応" className="scoped-support-navigation"><strong>SUPPORT</strong><p>許可された対応のみ表示しています。</p></nav>
    <div className="page-content scoped-support-content">
      <div className="scoped-support-heading"><div><h1>問い合わせ・対応状況</h1><p>許可された案件の確認と対応記録ができます。</p></div>
        <button className="secondary" disabled={busy||writeBusy} onClick={()=>{if(!responseText.trim()&&!lifecycleMode||window.confirm('未保存の入力を破棄しますか？')){selectWork(null);setRevision(r=>r+1);}}}>一覧を更新</button></div>
      <ScopedReceptionWorkspace csrf={csrf} initialCti={initialCti} onBeneficiaryConfirmed={refreshWork}
       onServiceChange={changeService} contextLocked={contextLocked}
       activeWork={receptionWork} returnRevision={receptionReturn} onSelectWork={id=>{
        if(writeBusy||writeInFlight.current)return false;
        if((responseText.trim()||followUpLocal||correctionTarget||lifecycleMode)&&!window.confirm('未保存の入力を破棄しますか？'))return false;
        selectWork(id);setReceptionWork(id);return true;
       }}/>
      <ScopedRegistryReviewUI csrf={csrf}/>
      {error&&<p role="alert">{error}</p>}
      <div className="scoped-support-panels">
        <section aria-label="許可された対応一覧">
          <h2>対応一覧</h2>
          {busy&&items.length===0?<p role="status">確認しています…</p>
            : !error&&items.length===0?<p>現在、閲覧できる対応はありません。</p>:null}
          <ul className="scoped-work-list">{(listServiceId===serviceId?items:[]).map(work=><li key={work.workId}>
            <button type="button" className={work.workId===selectedId?'scoped-work-button active':'scoped-work-button'}
              aria-current={work.workId===selectedId?'true':undefined} disabled={writeBusy} onClick={()=>{if(work.workId===selectedId)return;if((responseText.trim()||lifecycleMode)&&!window.confirm('未保存の入力を破棄しますか？'))return;selectWork(work.workId);}}>
              <strong>{work.title}</strong><span>{statusLabels[work.status]}</span><small>更新: {date(work.updatedAt)}</small>
            </button>
          </li>)}</ul>
          {nextCursor&&listServiceId===serviceId&&<button className="secondary" disabled={busy} onClick={()=>void loadMore()}>さらに表示</button>}
        </section>
        <section aria-label="選択した対応の詳細">
          {!selectedId?<><h2>対応の詳細</h2><p>一覧から確認したい対応を選んでください。</p></>:
            <><div className="scoped-support-heading"><h2>対応の詳細</h2><button className="secondary" disabled={writeBusy} onClick={()=>{if((!responseText.trim()&&!followUpLocal&&!correctionTarget&&!lifecycleMode)||window.confirm('未保存の入力を破棄しますか？'))selectWork(null);}}>{receptionWork?'問い合わせ履歴に戻る':'閉じる'}</button></div>
              {detailError&&<p role="alert">{detailError}</p>}
              {detailBusy&&!detail?<p role="status">詳細を確認しています…</p>:null}
              {detail&&history&&<>
                <h3>{detail.title}</h3><WorkSummary work={detail}/>
                <RelatedInquiries key={detail.workId} csrf={csrf} workId={detail.workId} disabled={writeBusy||detailBusy}
                 onOpen={id=>{if(writeInFlight.current)return;if((responseText.trim()||followUpLocal||correctionTarget||lifecycleMode)&&!window.confirm('未保存の入力を破棄しますか？'))return;selectWork(id);}}/>
                 <ProcedurePageReference workId={detail.workId}/>
                {detail.registryOrganizationId&&<ScopedRegistryContext csrf={csrf}
                  key={`${detail.workId}:${detail.registryOrganizationId}`} work={detail}/>}
                {writeNotice&&<p role="status" className="scoped-write-notice">{writeNotice}</p>}
                {writeError&&<div role="alert" className="scoped-write-error"><p>{writeError}</p>
                  <button type="button" className="secondary" disabled={detailBusy||writeBusy} onClick={refreshWork}>最新情報を確認</button></div>}
                {detail.canUpdate&&<section className="scoped-action" aria-label="対応の記録">
                  <h3>対応を記録</h3>
                  <form onSubmit={event=>void submitResponse(event)}>
                    <label htmlFor="scoped-response">対応内容</label>
                    <textarea id="scoped-response" rows={4} maxLength={4000} required value={responseText} disabled={writeBusy}
                      onChange={event=>{setResponseText(event.target.value);responseRequestId.current=null;}}/>
                    <div className="scoped-action-fields">
                      <div><label htmlFor="scoped-disposition">対応後の状態</label>
                        <select id="scoped-disposition" value={disposition} disabled={writeBusy}
                          onChange={event=>{setDisposition(event.target.value as OpenDisposition);responseRequestId.current=null;}}>
                          <option value="CUSTOMER_WAIT">お客様の回答待ち</option>
                          <option value="INVESTIGATING">確認中</option>
                          <option value="MONITORING">経過観察</option>
                        </select></div>
                      <div><label htmlFor="scoped-follow-up">次回確認予定</label>
                        <input id="scoped-follow-up" type="datetime-local" required value={followUpLocal} disabled={writeBusy}
                          onChange={event=>{setFollowUpLocal(event.target.value);responseRequestId.current=null;}}/></div>
                    </div>
                    <button type="submit" disabled={writeBusy||detailBusy||!responseText.trim()||!followUpLocal}>対応を記録</button>
                  </form>
                </section>}
                {detail.canUpdate&&!lifecycleMode&&<button type="button" className="secondary" disabled={writeBusy||detailBusy}
                 onClick={()=>{setLifecycleMode('ESCALATION');setEscalationTarget('');setEscalationRequest('');setEscalationResultId('');setLifecycleReason('');}}>専門対応の依頼を記録</button>}
                {detail.canUpdate&&lifecycleMode==='ESCALATION'&&<section aria-label="専門対応の依頼・回答" className="scoped-action">
                 <h3>専門対応の依頼・回答</h3>
                 <p>依頼・回答の事実を記録します。相手への自動送信、担当者変更、対応完了は行いません。</p>
                 <form onSubmit={e=>void submitEscalation(e)}>
                  <label htmlFor="scoped-escalation-source">記録の種類</label>
                  <select id="scoped-escalation-source" value={escalationResultId} disabled={writeBusy} onChange={e=>{setEscalationResultId(e.target.value);setLifecycleReason('');}}>
                   <option value="">新しい依頼</option>
                   {history.entries.filter(e=>e.kind==='ESCALATION_REQUESTED').map(e=><option key={e.id} value={e.id}>{date(e.occurredAt)} {e.responseText}</option>)}
                  </select>
                  {!escalationResultId&&<>
                   <label htmlFor="scoped-escalation-target">依頼先</label><input id="scoped-escalation-target" required maxLength={200} value={escalationTarget} disabled={writeBusy} onChange={e=>setEscalationTarget(e.target.value)}/>
                   <label htmlFor="scoped-escalation-request">求める判断・専門対応</label><textarea id="scoped-escalation-request" required maxLength={1000} value={escalationRequest} disabled={writeBusy} onChange={e=>setEscalationRequest(e.target.value)}/>
                  </>}
                  <label htmlFor="scoped-escalation-reason">{escalationResultId?'回答内容':'依頼理由・確認した状況'}</label>
                  <textarea id="scoped-escalation-reason" required maxLength={4000} value={lifecycleReason} disabled={writeBusy} onChange={e=>setLifecycleReason(e.target.value)}/>
                  <button type="submit" disabled={writeBusy||detailBusy||!lifecycleReason.trim()||(!escalationResultId&&(!escalationTarget.trim()||!escalationRequest.trim()))}>依頼・回答を記録</button>
                  <button type="button" className="secondary" disabled={writeBusy} onClick={()=>{setLifecycleMode(null);lifecycleRetry.current=null;}}>キャンセル</button>
                 </form>
                </section>}
                {detail.canClose&&!lifecycleMode&&<button type="button" className="secondary" disabled={writeBusy||detailBusy}
                 onClick={()=>{setLifecycleMode('TRANSFER');setOwners(null);setNewOwner('');setLifecycleReason('');void loadOwners(detail.workId);}}>担当者を引き継ぐ</button>}
                {detail.canClose&&lifecycleMode==='TRANSFER'&&<section className="scoped-action" aria-label="担当者の引継ぎ">
                 <h3>担当者の引継ぎ</h3>
                 <p>元の問い合わせ・対応状態は維持し、担当者を変更します。</p>
                 {ownerLoading&&<p>引継ぎ候補を確認しています…</p>}
                 {owners&&<form onSubmit={event=>void submitTransfer(event)}>
                  <p>現在の担当者：{owners.currentOwnerName}</p>
                  <label htmlFor="scoped-new-owner">引継ぎ先</label>
                  <select id="scoped-new-owner" value={newOwner} disabled={writeBusy||ownerLoading} onChange={e=>setNewOwner(e.target.value)}>
                   <option value="">担当者を選択してください</option>
                   {owners.items.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                  {owners.nextCursor&&<button type="button" className="secondary" disabled={writeBusy||ownerLoading} onClick={()=>void loadOwners(detail.workId,owners.nextCursor!)}>さらに候補を表示</button>}
                  <label htmlFor="scoped-transfer-reason">引継ぎ理由</label>
                  <textarea id="scoped-transfer-reason" value={lifecycleReason} maxLength={1000} required disabled={writeBusy} onChange={e=>setLifecycleReason(e.target.value)}/>
                  <button type="submit" disabled={writeBusy||detailBusy||ownerLoading||!newOwner||!lifecycleReason.trim()}>引継ぎを記録</button>
                 </form>}
                 <button type="button" className="secondary" disabled={writeBusy||ownerLoading} onClick={()=>{setLifecycleMode(null);setOwners(null);lifecycleRetry.current=null;}}>キャンセル</button>
                </section>}
                {detail.canClose&&!lifecycleMode&&<button type="button" className="secondary" disabled={writeBusy||detailBusy}
                 onClick={()=>{setLifecycleMode('CLOSE');setLifecycleReason('');setResponsibilityEnded(false);setCloseOutcome('RESOLVED');}}>対応を完了</button>}
                {detail.canReopen&&!lifecycleMode&&<button type="button" className="secondary" disabled={writeBusy||detailBusy}
                 onClick={()=>{setLifecycleMode('REOPEN');setLifecycleReason('');}}>対応を再開</button>}
                {lifecycleMode&&((lifecycleMode==='CLOSE'&&detail.canClose)||(lifecycleMode==='REOPEN'&&detail.canReopen))&&
                 <section className="scoped-action" aria-label={lifecycleMode==='CLOSE'?'対応完了の確認':'対応再開の確認'}>
                  <h3>{lifecycleMode==='CLOSE'?'対応完了の確認':'対応再開の確認'}</h3>
                  <form onSubmit={event=>void submitLifecycle(event)}>
                   {lifecycleMode==='CLOSE'&&<>
                    <label htmlFor="scoped-close-outcome">終了区分</label>
                    <select id="scoped-close-outcome" value={closeOutcome} disabled={writeBusy} onChange={e=>setCloseOutcome(e.target.value)}>
                     <option value="RESOLVED">解決</option><option value="NOT_ELIGIBLE">支援対象外</option>
                     <option value="WITHDRAWN">取り下げ</option><option value="OTHER_RESPONSIBILITY_ENDED">その他の責任終了</option>
                    </select>
                    <label><input type="checkbox" checked={responsibilityEnded} disabled={writeBusy} onChange={e=>setResponsibilityEnded(e.target.checked)}/>残る対応責任が終了したことを確認しました</label>
                   </>}
                   <label htmlFor="scoped-lifecycle-reason">{lifecycleMode==='CLOSE'?'終了理由':'再開理由'}</label>
                   <textarea id="scoped-lifecycle-reason" value={lifecycleReason} maxLength={1000} required disabled={writeBusy} onChange={e=>setLifecycleReason(e.target.value)}/>
                   {lifecycleMode==='REOPEN'&&<><label htmlFor="scoped-reopen-at">再開後の次回確認予定</label>
                    <input id="scoped-reopen-at" type="datetime-local" value={reopenAt} required disabled={writeBusy} onChange={e=>setReopenAt(e.target.value)}/></>}
                   <button type="submit" disabled={writeBusy||detailBusy||!lifecycleReason.trim()||(lifecycleMode==='CLOSE'?(!responsibilityEnded||!responseText.trim()):!reopenAt)}>
                    {lifecycleMode==='CLOSE'?'完了を記録':'再開を記録'}
                   </button>
                   <button type="button" className="secondary" disabled={writeBusy} onClick={()=>{setLifecycleMode(null);lifecycleRetry.current=null;}}>キャンセル</button>
                  </form>
                 </section>}
                {detail.canUpdate&&correctionTarget&&<section aria-label="対応内容の訂正" className="scoped-action">
                  <h3>対応内容を訂正</h3><p>状態や次回確認予定は変更せず、訂正履歴を追記します。</p>
                  <form onSubmit={event=>void submitCorrection(event)}>
                    <label htmlFor="scoped-correction">訂正後の対応内容</label>
                    <textarea id="scoped-correction" rows={4} maxLength={4000} required value={correctionText} disabled={writeBusy}
                      onChange={event=>{setCorrectionText(event.target.value);correctionRequestId.current=null;}}/>
                    <label htmlFor="scoped-correction-reason">訂正理由</label>
                    <textarea id="scoped-correction-reason" rows={2} maxLength={1000} required value={correctionReason} disabled={writeBusy}
                      onChange={event=>{setCorrectionReason(event.target.value);correctionRequestId.current=null;}}/>
                    <div className="scoped-action-buttons"><button type="submit" disabled={writeBusy||detailBusy||!correctionText.trim()||!correctionReason.trim()}>訂正を追記</button>
                      <button type="button" className="secondary" disabled={writeBusy} onClick={()=>{setCorrectionTarget(null);correctionRequestId.current=null;}}>キャンセル</button></div>
                  </form>
                </section>}
                <section aria-label="対応履歴" className="scoped-history">
                  <h3>対応履歴</h3>
                  {!history.entries.length&&<p>表示できる記録はまだありません。</p>}
                  <ol>{history.entries.map(entry=><HistoryEntry key={entry.id} entry={entry} onCorrect={startCorrection}/>)}</ol>
                  {history.nextCursor&&<button className="secondary" disabled={detailBusy} onClick={()=>void loadMoreHistory()}>過去の記録を表示</button>}
                </section>
              </>}
            </>}
        </section>
      </div>
    </div>
  </div>;
}
