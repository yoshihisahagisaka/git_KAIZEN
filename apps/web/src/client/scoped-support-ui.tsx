import {useEffect,useRef,useState} from 'react';
import {api,ApiError} from './api.js';
import {ScopedRegistryReviewUI} from './scoped-registry-review-ui.js';
import type {
  ScopedRegistryPeoplePage,
  ScopedSupportHistoryEntry,ScopedSupportWorkHistory,ScopedSupportWorkPage,
  ScopedSupportWorkSummary,
} from '../server/persistence/scoped-access-reader.js';

const statusLabels:Record<ScopedSupportWorkSummary['status'],string>={
  OPEN:'受付済み',IN_PROGRESS:'対応中',COMPLETED:'完了',
};
const eventLabels:Record<string,string>={
  RESPONSE:'対応を記録',RESPONSE_CORRECTION:'対応内容を訂正',
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
  },[url,organizationId]);

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
    {busy&&<p role="status">登録情報を確認しています…</p>}
    {error&&<p role="alert">登録情報を取得できませんでした。最新情報を確認してください。</p>}
    {pendingNotice&&<p role="status" className="scoped-write-notice">{pendingNotice}</p>}
    {writeError&&<p role="alert" className="scoped-write-error">{writeError}</p>}
    {page&&<>
      <strong className="scoped-registry-organization">{page.organizationName}</strong>
      {!page.items.length&&<p>登録されている方はいません。</p>}
      <ul>{page.items.map(person=><li key={person.personId}>
        <span>{person.displayName}</span><span>{lifecycleLabels[person.lifecycleStatus]}</span>
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
export function ScopedSupportUI({csrf}:{csrf:string}) {
  const [items,setItems]=useState<ScopedSupportWorkSummary[]>([]);
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
  const selectedRequestId=useRef<string|null>(null);
  const writeInFlight=useRef(false);
  const responseRequestId=useRef<string|null>(null);
  const correctionRequestId=useRef<string|null>(null);
  function selectWork(id:string|null) {
    selectedRequestId.current=id;setSelectedId(id);
    setResponseText('');setDisposition('INVESTIGATING');setFollowUpLocal('');
    setCorrectionTarget(null);setCorrectionText('');setCorrectionReason('');
    responseRequestId.current=null;correctionRequestId.current=null;
    setWriteError('');setWriteNotice('');
  }
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
    api<ScopedSupportWorkPage>('/api/scoped/support-work?limit=20')
      .then(page=>{if(active){setItems(page.items);setNextCursor(page.nextCursor);}})
      .catch(()=>{if(active){setItems([]);setError('許可された対応を取得できませんでした。再度お試しください。');}})
      .finally(()=>{if(active)setBusy(false);});
    return ()=>{active=false;};
  },[revision]);

  useEffect(()=>{
    selectedRequestId.current=selectedId;
    if(!selectedId){setDetail(null);setHistory(null);return;}
    let active=true;
    setDetail(null);setHistory(null);setDetailError('');setDetailBusy(true);
    Promise.all([
      api<ScopedSupportWorkSummary>(`/api/scoped/support-work/${selectedId}`),
      api<ScopedSupportWorkHistory>(`/api/scoped/support-work/${selectedId}/history?limit=20`),
    ]).then(([work,records])=>{
      if(work.workId!==selectedId||records.work.workId!==selectedId)throw Error('Work mismatch');
      if(active){
        setDetail(work);setHistory(records);
      }
    }).catch(()=>{if(active){setDetail(null);setHistory(null);setDetailError('この対応の閲覧権限を確認できませんでした。一覧を更新してください。');}})
      .finally(()=>{if(active)setDetailBusy(false);});
    return ()=>{active=false;};
  },[selectedId,revision]);

  async function loadMore() {
    if(!nextCursor||busy)return;
    setBusy(true);setError('');
    try {
      const page=await api<ScopedSupportWorkPage>(`/api/scoped/support-work?limit=20&cursor=${encodeURIComponent(nextCursor)}`);
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
        <button className="secondary" disabled={busy} onClick={()=>{selectWork(null);setRevision(r=>r+1);}}>一覧を更新</button></div>
      <ScopedRegistryReviewUI csrf={csrf}/>
      {error&&<p role="alert">{error}</p>}
      <div className="scoped-support-panels">
        <section aria-label="許可された対応一覧">
          <h2>対応一覧</h2>
          {busy&&items.length===0?<p role="status">確認しています…</p>
            : !error&&items.length===0?<p>現在、閲覧できる対応はありません。</p>:null}
          <ul className="scoped-work-list">{items.map(work=><li key={work.workId}>
            <button type="button" className={work.workId===selectedId?'scoped-work-button active':'scoped-work-button'}
              aria-current={work.workId===selectedId?'true':undefined} onClick={()=>selectWork(work.workId)}>
              <strong>{work.title}</strong><span>{statusLabels[work.status]}</span><small>更新: {date(work.updatedAt)}</small>
            </button>
          </li>)}</ul>
          {nextCursor&&<button className="secondary" disabled={busy} onClick={()=>void loadMore()}>さらに表示</button>}
        </section>
        <section aria-label="選択した対応の詳細">
          {!selectedId?<><h2>対応の詳細</h2><p>一覧から確認したい対応を選んでください。</p></>:
            <><div className="scoped-support-heading"><h2>対応の詳細</h2><button className="secondary" onClick={()=>selectWork(null)}>閉じる</button></div>
              {detailError&&<p role="alert">{detailError}</p>}
              {detailBusy&&!detail?<p role="status">詳細を確認しています…</p>:null}
              {detail&&history&&<>
                <h3>{detail.title}</h3><WorkSummary work={detail}/>
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
