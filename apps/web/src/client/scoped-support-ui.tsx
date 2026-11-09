import {useEffect,useRef,useState} from 'react';
import {api} from './api.js';
import type {
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
function HistoryEntry({entry}:{entry:ScopedSupportHistoryEntry}) {
  return <li>
    <strong>{eventLabels[entry.kind]??'対応状況の変更'}</strong>
    <time dateTime={entry.occurredAt}>{date(entry.occurredAt)}</time>
    {entry.responseText&&<p className="scoped-record-text">{entry.responseText}</p>}
    {entry.disposition&&<p>対応後の状態: {dispositionLabels[entry.disposition]??'確認中'}</p>}
    {entry.correctionReason&&<p>訂正理由: {entry.correctionReason}</p>}
  </li>;
}

/** All data comes exclusively from the scoped READ endpoints; no broad JOIN,
 * SUPPORT, Explore or company-wide search request is ever issued here. */
export function ScopedSupportUI() {
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
  const selectedRequestId=useRef<string|null>(null);
  function selectWork(id:string|null) {selectedRequestId.current=id;setSelectedId(id);}

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
      <div className="scoped-support-heading"><div><h1>問い合わせ・対応状況</h1><p>閲覧が許可されている案件を確認できます。</p></div>
        <button className="secondary" disabled={busy} onClick={()=>{selectWork(null);setRevision(r=>r+1);}}>一覧を更新</button></div>
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
                <section aria-label="対応履歴" className="scoped-history">
                  <h3>対応履歴</h3>
                  {!history.entries.length&&<p>表示できる記録はまだありません。</p>}
                  <ol>{history.entries.map(entry=><HistoryEntry key={entry.id} entry={entry}/>)}</ol>
                  {history.nextCursor&&<button className="secondary" disabled={detailBusy} onClick={()=>void loadMoreHistory()}>過去の記録を表示</button>}
                </section>
              </>}
            </>}
        </section>
      </div>
    </div>
  </div>;
}
