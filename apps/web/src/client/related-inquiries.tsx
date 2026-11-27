import {useEffect,useRef,useState,type FormEvent} from 'react';
import {api} from './api.js';
type Item={eventId:string;workId:string;title:string;status:string};
type Page={eventId:string;items:Item[];canEdit:boolean};
const labels:Record<string,string>={OPEN:'受付済み',IN_PROGRESS:'対応中',COMPLETED:'対応完了'};
export function RelatedInquiries({csrf,workId,disabled,onOpen}:{csrf:string;workId:string;disabled:boolean;onOpen:(id:string)=>void}){
 const [page,setPage]=useState<Page|null>(null),[target,setTarget]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[version,setVersion]=useState(0);
 const retry=useRef<{key:string;id:string}|null>(null),inFlight=useRef(false);
 const url='/api/scoped/support-work/'+workId+'/related-inquiries';
 useEffect(()=>{
  let live=true;setPage(null);setError('');
  api<Page>(url).then(data=>{if(live)setPage(data);}).catch(()=>{if(live)setError('関連問い合わせを取得できませんでした。');});
  return()=>{live=false;};
 },[url,version]);
 async function change(eventId:string,kind:'LINKED'|'UNLINKED'){
  if(disabled||inFlight.current||!page?.canEdit||!eventId||eventId===page.eventId)return;
  if(kind==='UNLINKED'&&!window.confirm('関連付けを解除しますか？元の問い合わせ履歴は残ります。'))return;
  const key=kind+':'+eventId;
  if(retry.current?.key!==key)retry.current={key,id:crypto.randomUUID()};
  inFlight.current=true;setBusy(true);setError('');
  try{
   await api(url,csrf,{eventId,kind,commandId:retry.current.id});
   retry.current=null;setTarget('');setVersion(n=>n+1);
  }catch{setError('関連付けを変更できませんでした。問い合わせIDと権限を確認してください。');}
  finally{inFlight.current=false;setBusy(false);}
 }
 function submit(e:FormEvent){e.preventDefault();void change(target.trim(),'LINKED');}
 return <section className="card" aria-label="関連問い合わせ">
  <h3>関連問い合わせ</h3>
  {error&&<p role="alert">{error}</p>}
  {!page&&!error&&<p>確認しています…</p>}
  {page&&<>
   <p>問い合わせID：<code>{page.eventId}</code></p>
   {!page.items.length&&<p>関連問い合わせはありません。</p>}
   <ul>{page.items.map(item=><li key={item.eventId}>
    <button type="button" className="secondary" disabled={disabled||busy} onClick={()=>onOpen(item.workId)}>{item.title} — {labels[item.status]??item.status}</button>
    <small> ID：{item.eventId}</small>
    {page.canEdit&&<button type="button" className="secondary" disabled={disabled||busy} onClick={()=>void change(item.eventId,'UNLINKED')}>関連解除</button>}
   </li>)}</ul>
   {page.canEdit&&<form onSubmit={submit}>
    <label htmlFor="related-inquiry-id">関連問い合わせID</label>
    <input id="related-inquiry-id" value={target} maxLength={36} required disabled={disabled||busy} onChange={e=>setTarget(e.target.value)}/>
    <button type="submit" disabled={disabled||busy||!target.trim()||target.trim()===page.eventId}>関連登録</button>
   </form>}
  </>}
  <button type="button" className="secondary" disabled={disabled||busy} onClick={()=>setVersion(n=>n+1)}>関連問い合わせを再取得</button>
 </section>;
}
