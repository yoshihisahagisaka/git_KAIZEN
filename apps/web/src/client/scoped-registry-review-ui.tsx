import {useEffect,useRef,useState} from 'react';
import {api} from './api.js';
import type {RegistryReviewItem,RegistryReviewPage}
 from '../server/persistence/registry-review-reader.js';

/** The reviewer sees only live target-scoped REVIEW grants. No global queue
 * count, customer directory, or internal legacy-role shortcut is exposed. */
export function ScopedRegistryReviewUI({csrf}:{csrf:string}){
 const [open,setOpen]=useState(false);
 const [page,setPage]=useState<RegistryReviewPage|null>(null);
 const [loading,setLoading]=useState(false);
 const [loadMoreBusy,setLoadMoreBusy]=useState(false);
 const [error,setError]=useState('');
 const [actionError,setActionError]=useState('');
 const [notice,setNotice]=useState('');
 const [revision,setRevision]=useState(0);
 const [confirmingId,setConfirmingId]=useState<string|null>(null);
 const inFlight=useRef(false);
 useEffect(()=>{
  if(!open){setPage(null);return;}
  let active=true;
  setLoading(true);setPage(null);setError('');
  api<RegistryReviewPage>('/api/scoped/registry/review-queue?limit=20')
   .then(result=>{if(active)setPage(result);})
   .catch(()=>{if(active){setPage(null);setError('確認待ちを取得できませんでした。');}})
   .finally(()=>{if(active)setLoading(false);});
  return ()=>{active=false;};
 },[open,revision]);

 async function confirm(item:RegistryReviewItem){
  if(!item.canConfirm||inFlight.current)return;
  inFlight.current=true;setConfirmingId(item.changeId);setActionError('');setNotice('');
  try{
   const result=await api<{changeId:string;status:string}>(
    `/api/scoped/registry/review-queue/${item.changeId}/confirm`,csrf,
    {attestation:'REVIEWED_DISPLAY_NAME_CORRECTION_V1'});
   if(result.changeId!==item.changeId||result.status!=='COMMITTED')
    throw Error('Unexpected Registry commit result');
   setNotice('変更を確定しました。');
  }catch{
   setNotice('');setActionError('確定できなかったか、結果を確認できませんでした。最新の確認待ちを取得してください。');
  }finally{
   inFlight.current=false;setConfirmingId(null);
   // Never leave a stale reviewer read model after a failed or successful
   // mutation; reauthorize on every refresh.
   setPage(null);setRevision(value=>value+1);
  }
 }

 async function more(){
  if(!page?.nextCursor||loadMoreBusy)return;
  setLoadMoreBusy(true);setError('');
  try{
   const result=await api<RegistryReviewPage>(
    `/api/scoped/registry/review-queue?limit=20&cursor=${encodeURIComponent(page.nextCursor)}`);
   setPage(previous=>{
    if(!previous)return null;
    const seen=new Set(previous.items.map(item=>item.changeId));
    return {items:[...previous.items,...result.items.filter(item=>!seen.has(item.changeId))],
     nextCursor:result.nextCursor};
   });
  }catch{setPage(null);setError('確認待ちを再取得してください。');}
  finally{setLoadMoreBusy(false);}
 }

 return <section aria-label="Registry確認待ち" className="registry-review">
  <div className="registry-review-heading">
   <h2>Registry確認待ち</h2>
   <button type="button" className="secondary" aria-expanded={open}
    onClick={()=>{setOpen(!open);setNotice('');setError('');setActionError('');}}> {open?'閉じる':'確認する'} </button>
  </div>
  {open&&<>
   <p className="registry-review-note">ご自身の権限で確認できる変更依頼のみ表示します。</p>
   <button type="button" className="secondary" disabled={loading||confirmingId!==null}
    onClick={()=>{setNotice('');setActionError('');setRevision(value=>value+1);}}>最新情報を確認</button>
   {notice&&<p role="status" className="scoped-write-notice">{notice}</p>}
   {error&&<p role="alert">{error}</p>}
   {actionError&&<p role="alert">{actionError}</p>}
   {loading&&<p role="status">確認待ちを読み込んでいます…</p>}
   {page&&page.items.length===0&&<p>現在確認できる変更依頼はありません。</p>}
   {page&&<ul className="registry-review-list">{page.items.map(item=><li key={item.changeId}>
    <h3>{item.organizationName}</h3>
    <dl>
     <dt>対象の現在の表示名</dt><dd>{item.currentDisplayName}</dd>
     <dt>訂正前</dt><dd>{item.originalDisplayName}</dd>
     <dt>訂正後の提案</dt><dd>{item.proposedDisplayName}</dd>
     <dt>依頼理由</dt><dd>{item.reason}</dd>
     <dt>状態</dt><dd>{item.status==='PROPOSED'?'確認待ち':'確認済み・確定待ち'}</dd>
    </dl>
    <p className="registry-review-note">申告情報です。独立した本人確認済みの事実ではありません。</p>
    {item.canConfirm?<button type="button" disabled={confirmingId!==null}
      onClick={()=>void confirm(item)}>{item.status==='PROPOSED'?'確認して確定':'確定'}</button>:
      <p>この変更を確定するための権限または確認者条件が不足しています。</p>}
   </li>)}</ul>}
   {page?.nextCursor&&<button type="button" className="secondary" disabled={loadMoreBusy}
     onClick={()=>void more()}>さらに表示</button>}
  </>}
 </section>;
}
