import {useEffect,useState,useRef} from 'react';
import {api} from './api.js';
import {requestLabels,requestStatusLabels,type RequestType,type RequestStatus} from '../../../../packages/domain/src/service-request.js';
type Context={serviceId:string;contractProfileId:string;name:string;canCreate:boolean;types:RequestType[]};
type Summary={id:string;type:RequestType;customerName:string;content:string;createdAt:string;status:RequestStatus;revision:number};
type Detail=Summary&{contactName:string;desiredAt:string|null;side:'SENT'|'RECEIVED';canRespond:boolean;history:{revision:number;status:RequestStatus;comment:string;recordedAt:string}[]};
type Notice={id:string;requestId:string;kind:'CREATED'|'STARTED'|'COMMENTED'|'COMPLETED';createdAt:string;read:boolean};
type Inbox={unread:number;items:Notice[]};
const noticeLabels={CREATED:'新しい対応依頼',STARTED:'対応開始',COMMENTED:'対応コメント追加',COMPLETED:'対応完了'};
type List={items:Summary[];nextCursor:string|null};
const key=(c:Context)=>c.serviceId+':'+c.contractProfileId;
const message=(e:unknown)=>e instanceof Error?e.message:'処理を完了できませんでした。';
const format=(v:string)=>new Date(v).toLocaleString('ja-JP');
export function ServiceRequestUI({csrf,contexts,initialId,onExit}:{csrf:string;contexts:Context[];initialId:string|null;onExit?:()=>void}){
 const [selected,setSelected]=useState(contexts[0]?key(contexts[0]):'');
 const c=contexts.find(x=>key(x)===selected);
 const [mode,setMode]=useState<'LIST'|'CREATE'|'DETAIL'|'NOTICES'>(initialId?'DETAIL':'LIST');
 const [side,setSide]=useState<'SENT'|'RECEIVED'>('RECEIVED');
 const [detailId,setDetailId]=useState(initialId??'');
 const [detail,setDetail]=useState<Detail|null>(null);
 const [items,setItems]=useState<Summary[]>([]);
 const [cursor,setCursor]=useState<string|null>(null);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [inbox,setInbox]=useState<Inbox|null>(null);
 const [noticeError,setNoticeError]=useState(false);
 const [noticeRefresh,setNoticeRefresh]=useState(0);
 const [refresh,setRefresh]=useState(0);
 const [type,setType]=useState<RequestType|''>('');
 const [content,setContent]=useState('');
 const [customer,setCustomer]=useState('');
 const [contact,setContact]=useState('');
 const [desired,setDesired]=useState('');
 const [status,setStatus]=useState<'IN_PROGRESS'|'COMPLETED'>('IN_PROGRESS');
 const [comment,setComment]=useState('');
 const createKey=useRef<string|null>(null),replyKey=useRef<string|null>(null);
 const pending=useRef(false);
 const listGeneration=useRef(0);
 const base=c?'/api/requests?'+new URLSearchParams({serviceId:c.serviceId,contractProfileId:c.contractProfileId,side}):'';
 const inboxUrl=c?'/api/request-notifications?'+new URLSearchParams({serviceId:c.serviceId,contractProfileId:c.contractProfileId}):'';
 useEffect(()=>{
  if(!inboxUrl)return;
  let active=true,running=false;setInbox(null);setNoticeError(false);
  const poll=async()=>{if(running||!active)return;running=true;try{const data=await api<Inbox>(inboxUrl);if(active){setInbox(data);setNoticeError(false);}}catch{if(active){setInbox(null);setNoticeError(true);}}finally{running=false;}};
  void poll();const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void poll();},30000);
  const visible=()=>{if(document.visibilityState==='visible')void poll();};
  document.addEventListener('visibilitychange',visible);
  return()=>{active=false;window.clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
 },[inboxUrl,noticeRefresh]);
 useEffect(()=>{
  if(mode!=='LIST'||!base)return;
  let active=true;const generation=++listGeneration.current;
  setItems([]);setCursor(null);setError('');
  api<List>(base).then(x=>{if(active&&generation===listGeneration.current){setItems(x.items);setCursor(x.nextCursor);}}).catch(e=>{if(active)setError(message(e));});
  return()=>{active=false;listGeneration.current++;};
 },[base,mode,refresh]);
 useEffect(()=>{
  if(mode!=='DETAIL'||!detailId)return;
  let active=true;setDetail(null);setError('');
  api<Detail>('/api/requests/'+detailId).then(async x=>{if(!active)return;setDetail(x);try{await api('/api/requests/'+x.id+'/acknowledge',csrf,{throughRevision:x.revision});if(active)setNoticeRefresh(n=>n+1);}catch{if(active)setNoticeError(true);}}).catch(e=>{if(active)setError(message(e));});
  return()=>{active=false;};
 },[detailId,mode,refresh,csrf]);
 function open(id:string){setDetailId(id);setComment('');setStatus('IN_PROGRESS');replyKey.current=null;setMode('DETAIL');}
 function goList(){setError('');setMode('LIST');}
 async function more(){
  if(!cursor||pending.current)return;pending.current=true;setBusy(true);
  const generation=listGeneration.current;
  try{const x=await api<List>(base+'&beforeId='+encodeURIComponent(cursor));if(generation===listGeneration.current){setItems(old=>[...old,...x.items]);setCursor(x.nextCursor);}}
  catch(e){if(generation===listGeneration.current)setError(message(e));}finally{pending.current=false;setBusy(false);}
 }
 async function submit(){
  if(!c||!type||!content.trim()||pending.current)return;
  pending.current=true;setBusy(true);setError('');
  try{
   createKey.current??=crypto.randomUUID();
   const result=await api<{id:string}>('/api/requests',csrf,{serviceId:c.serviceId,contractProfileId:c.contractProfileId,id:createKey.current,type,content,customerName:customer,contactName:contact,desiredAt:desired?new Date(desired).toISOString():null});
   createKey.current=null;setType('');setContent('');setCustomer('');setContact('');setDesired('');setSide('SENT');open(result.id);
  }catch(e){setError(message(e));}finally{pending.current=false;setBusy(false);}
 }
 async function respond(){
  if(!detail?.canRespond||pending.current||(status==='COMPLETED'&&!comment.trim()))return;
  pending.current=true;setBusy(true);setError('');
  try{
   replyKey.current??=crypto.randomUUID();
   await api('/api/requests/'+detail.id+'/responses',csrf,{commandId:replyKey.current,expectedRevision:detail.revision,status,comment});
   replyKey.current=null;setComment('');setRefresh(n=>n+1);
  }catch(e){setError(message(e));}finally{pending.current=false;setBusy(false);}
 }
 return <section className="request-portal" aria-label="対応依頼">
  <h1>対応依頼</h1>
  <div className="request-actions">
   {onExit&&<button className="secondary" disabled={busy} onClick={onExit}>FACTACTへ戻る</button>}
   <button className="secondary" disabled={busy} onClick={goList}>依頼一覧</button>
   <button className="secondary" disabled={busy} onClick={()=>{setMode('NOTICES');setNoticeRefresh(n=>n+1);}}>通知{inbox?'（未読 '+inbox.unread+'件）':''}</button>
   <button disabled={busy||!c?.canCreate} onClick={()=>{setError('');setMode('CREATE');}}>対応依頼を登録</button>
  </div>
  {error&&<p role="alert">{error}</p>}
  {noticeError&&<p role="status">通知を確認できませんでした。通知画面から再確認してください。</p>}
  {mode!=='DETAIL'&&<label>サービス<select value={selected} disabled={busy||mode==='CREATE'} onChange={e=>{setSelected(e.target.value);setType('');}}>{contexts.map(x=><option key={key(x)} value={key(x)}>{x.name}</option>)}</select></label>}
  {mode==='NOTICES'&&<><h2>通知一覧</h2>{inbox&&<p>未読 {inbox.unread}件（最新50件を表示）</p>}{inbox?.items.length===0&&<p>通知はありません。</p>}{inbox?.items.map(n=><article key={n.id}><strong>{noticeLabels[n.kind]}</strong> {!n.read&&<span className="badge">未読</span>}<time>{format(n.createdAt)}</time><button className="secondary" disabled={busy} onClick={()=>open(n.requestId)}>依頼詳細を開く</button></article>)}</>}
  {mode==='LIST'&&<><div className="request-actions"><button aria-pressed={side==='RECEIVED'} className="secondary" disabled={busy} onClick={()=>setSide('RECEIVED')}>受信依頼</button><button aria-pressed={side==='SENT'} className="secondary" disabled={busy} onClick={()=>setSide('SENT')}>送信依頼</button><button className="secondary" disabled={busy} onClick={()=>setRefresh(n=>n+1)}>更新</button></div>
   {items.length===0&&!error&&<p>表示する依頼がありません。</p>}
   {items.map(x=><article key={x.id}><strong>{requestLabels[x.type]}</strong> <span className="badge">{requestStatusLabels[x.status]}</span><p>{x.customerName}</p><p className="request-text">{x.content}</p><time>{format(x.createdAt)}</time><button className="secondary" disabled={busy} onClick={()=>open(x.id)}>詳細を開く</button></article>)}
   {cursor&&<button disabled={busy} onClick={()=>void more()}>さらに表示</button>}</>}
  {mode==='CREATE'&&c?.canCreate&&<form className="card" onSubmit={e=>{e.preventDefault();void submit();}}>
   <h2>対応依頼を登録</h2>
   <fieldset disabled={busy}><label>依頼種別<select required value={type} onChange={e=>{setType(e.target.value as RequestType|'');}}><option value="">選択してください</option>{c.types.map(t=><option key={t} value={t}>{requestLabels[t]}</option>)}</select></label>
   <label>対象企業名（任意）<input maxLength={200} value={customer} onChange={e=>setCustomer(e.target.value)}/></label>
   <label>対象担当者名（任意）<input maxLength={200} value={contact} onChange={e=>setContact(e.target.value)}/></label>
   <label>依頼内容<textarea required maxLength={4000} value={content} onChange={e=>setContent(e.target.value)}/></label>
   <label>希望日時（任意）<input type="datetime-local" value={desired} onChange={e=>setDesired(e.target.value)}/></label>
   <button type="submit" disabled={!type||!content.trim()}>依頼を登録</button></fieldset></form>}
  {mode==='DETAIL'&&detail&&<article><h2>{requestLabels[detail.type]}</h2><span className="badge">{requestStatusLabels[detail.status]}</span><p>{detail.side==='SENT'?'送信依頼':'受信依頼'}</p><p>{detail.customerName} {detail.contactName}</p><p className="request-text">{detail.content}</p><time>{format(detail.createdAt)}</time>{detail.desiredAt&&<p>希望日時：{format(detail.desiredAt)}</p>}
   <h3>対応履歴</h3>{detail.history.length===0&&<p>回答はまだありません。</p>}<ol className="timeline">{detail.history.map(h=><li key={h.revision}><strong>{requestStatusLabels[h.status]}</strong><time>{format(h.recordedAt)}</time><p className="request-text">{h.comment}</p></li>)}</ol>
   {detail.canRespond&&<form onSubmit={e=>{e.preventDefault();void respond();}}><fieldset disabled={busy}><label>対応状況<select value={status} onChange={e=>setStatus(e.target.value as typeof status)}><option value="IN_PROGRESS">対応中</option><option value="COMPLETED">対応完了</option></select></label><label>対応結果・コメント<textarea required={status==='COMPLETED'} maxLength={4000} value={comment} onChange={e=>setComment(e.target.value)}/></label><button type="submit" disabled={status==='COMPLETED'&&!comment.trim()}>対応内容を保存</button></fieldset></form>}
  </article>}
 </section>;
}
export function RequestEntryPoint({csrf,initialId,children,portalOnly=false}:{csrf:string;initialId:string|null;children:React.ReactNode;portalOnly?:boolean}){
 const [contexts,setContexts]=useState<Context[]|null>(null);
 const [error,setError]=useState('');
 const [open,setOpen]=useState(!!initialId||portalOnly);
 useEffect(()=>{let active=true;api<Context[]>('/api/request-contexts').then(x=>{if(active)setContexts(x);}).catch(e=>{if(active){setContexts([]);setError(message(e));}});return()=>{active=false;};},[]);
 if((initialId||portalOnly)&&contexts===null)return <p role="status">依頼を確認しています…</p>;
 if((initialId||portalOnly)&&contexts?.length===0)return <p role="alert">{error||'依頼を参照できません。'}</p>;
 return <>{contexts&&contexts.length>0&&open?<ServiceRequestUI csrf={csrf} contexts={contexts} initialId={initialId} {...(!portalOnly?{onExit:()=>{if(initialId)window.location.assign('/');else setOpen(false);}}:{})}/>:<>{contexts&&contexts.length>0&&<div className="request-launch"><button onClick={()=>setOpen(true)}>対応依頼</button></div>}{children}</>}</>;
}
