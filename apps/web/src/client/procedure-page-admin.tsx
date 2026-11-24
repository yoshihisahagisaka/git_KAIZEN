import {useEffect,useRef,useState} from 'react';
import {api} from './api.js';
import {ProcedureBodyEditor,ProcedureBodyText} from './procedure-page-text.js';
import {initialProcedureBody,validProcedureBody,type ProcedureCategory}
 from '../../../../packages/domain/src/procedure-page-text.js';
import type {ProcedurePage,ProcedureScope} from '../server/persistence/procedure-page-store.js';

type Overview={services:{id:string;name:string}[];pages:ProcedurePage[]};
type Draft={
 id:string|null;revision:number;scopeKind:ProcedureScope;serviceId:string;
 category:ProcedureCategory;title:string;bodyText:string;sortOrder:number;
 reason:string;status:'DRAFT'|'PUBLISHED'|'HIDDEN';
};
const fresh=():Draft=>({
 id:null,revision:0,scopeKind:'SERVICE',serviceId:'',category:'PROCEDURE',
 title:'',bodyText:initialProcedureBody('PROCEDURE'),sortOrder:0,
 reason:'',status:'DRAFT',
});
function fromPage(page:ProcedurePage):Draft{
 return {id:page.id,revision:page.revision,scopeKind:page.scopeKind,
  serviceId:page.serviceId??'',category:page.category,title:page.title,
  bodyText:page.bodyText,sortOrder:page.sortOrder,reason:'',status:page.status};
}
async function patchProcedure(id:string,csrf:string,payload:object):Promise<ProcedurePage>{
 const response=await fetch(`/api/admin/procedure-pages/${id}`,{
  method:'PATCH',headers:{'Content-Type':'application/json','x-csrf-token':csrf},
  body:JSON.stringify(payload),
 });
 const result=await response.json();
 if(!response.ok||!result.ok)throw new Error(result.error?.message??'手順書を保存できませんでした。');
 return result.data as ProcedurePage;
}

/** Internal ADMIN-only entry; server still checks current DB authority, not
 * the UI session or role passed by the browser. No document management CMS. */
export function ProcedurePageAdmin({csrf}:{csrf:string}){
 const [open,setOpen]=useState(false),[overview,setOverview]=useState<Overview|null>(null);
 const [draft,setDraft]=useState<Draft|null>(null),[busy,setBusy]=useState(false);
 const [revision,setRevision]=useState(0),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [approvalChecked,setApprovalChecked]=useState(false);
 const retry=useRef<{key:string;id:string}|null>(null);
 useEffect(()=>{
  if(!open)return;
  let active=true;setError('');
  api<Overview>('/api/admin/procedure-pages')
   .then(value=>{if(active)setOverview(value);})
   .catch(()=>{if(active)setError('手順書の管理画面を読み込めませんでした。');});
  return ()=>{active=false;};
 },[open,revision]);
 const refresh=()=>setRevision(x=>x+1);
 const change=(v:Draft)=>{setDraft(v);setApprovalChecked(false);setNotice('');};
 const requestId=(op:string,payload:object)=>{
  const key=JSON.stringify({op,payload});
  if(retry.current?.key===key)return retry.current.id;
  const id=crypto.randomUUID();
  retry.current={key,id};return id;
 };
 async function save(){
  if(!draft||busy||!draft.reason.trim()||!draft.title.trim()||
   !validProcedureBody(draft.bodyText)||(!draft.serviceId&&draft.scopeKind==='SERVICE')||
   (!!draft.id&&draft.status==='PUBLISHED'&&!approvalChecked))return;
  setBusy(true);setError('');setNotice('');
  try {
   const payload={category:draft.category,title:draft.title,bodyText:draft.bodyText,
    sortOrder:draft.sortOrder,reason:draft.reason.trim()};
   const id=requestId('SAVE',{pageId:draft.id,revision:draft.revision,...payload});
   const saved=draft.id
    ?await patchProcedure(draft.id,csrf,{requestId:id,expectedRevision:draft.revision,...payload})
    :await api<ProcedurePage>('/api/admin/procedure-pages',csrf,{
      requestId:id,scopeKind:draft.scopeKind,
      serviceId:draft.scopeKind==='COMMON'?null:draft.serviceId,...payload});
   setDraft(fromPage(saved));retry.current=null;setNotice('保存しました。');refresh();
  }catch(e){setError(e instanceof Error?e.message:'保存できませんでした。最新情報をご確認ください。');}
  finally{setBusy(false);}
 }
 async function toggle(status:'PUBLISHED'|'HIDDEN'){
  if(!draft?.id||busy||!draft.reason.trim())return;
  if(status==='PUBLISHED'&&(!approvalChecked||draft.bodyText===initialProcedureBody(draft.category)))return;
  setBusy(true);setError('');setNotice('');
  try{
   const payload={requestId:requestId(status,{pageId:draft.id,revision:draft.revision,
    reason:draft.reason.trim()}),expectedRevision:draft.revision,reason:draft.reason.trim()};
   const saved=await api<ProcedurePage>(`/api/admin/procedure-pages/${draft.id}/${status==='PUBLISHED'?'publish':'hide'}`,csrf,payload);
   setDraft(fromPage(saved));retry.current=null;setApprovalChecked(false);setNotice('公開状態を変更しました。');refresh();
  }catch(e){setError(e instanceof Error?e.message:'公開状態を変更できませんでした。');}
  finally{setBusy(false);}
 }
 return <section className="card" aria-label="手順書管理">
  <button type="button" className="secondary" onClick={()=>setOpen(v=>!v)}>
   手順書管理 {open?'を閉じる':'を開く'}
  </button>
  {open&&<>
   <h2>手順書管理</h2><p>テキストを編集し、承認済みの内容だけを公開します。変更は履歴に残ります。</p>
   {error&&<p role="alert">{error}</p>}
   {notice&&<p role="status">{notice}</p>}
   {!overview&&!error&&<p role="status">読み込み中…</p>}
   {overview&&<div className="procedure-admin-grid">
    <section aria-label="手順書一覧">
     <h3>ページ一覧</h3>
     <button type="button" disabled={busy} onClick={()=>{setDraft(fresh());retry.current=null;setApprovalChecked(false);}}>新しいページ</button>
     <ul>{overview.pages.map(p=><li key={p.id}>
      <button type="button" className="secondary" disabled={busy}
       onClick={()=>{change(fromPage(p));retry.current=null;}}>
       {p.title} / {p.status==='PUBLISHED'?'公開':p.status==='HIDDEN'?'非表示':'下書き'}
      </button></li>)}</ul>
     {!overview.pages.length&&<p>まだ手順書はありません。</p>}
    </section>
    <section aria-label="手順書の編集">
     {!draft?<p>ページを選択するか、新しいページを作成してください。</p>:<>
      <h3>{draft.id?'手順書を編集':'新規手順書'}</h3>
      <label htmlFor="procedure-admin-scope">適用範囲</label>
      <select id="procedure-admin-scope" disabled={busy||!!draft.id} value={draft.scopeKind}
       onChange={event=>change({...draft,scopeKind:event.target.value as ProcedureScope})}>
       <option value="SERVICE">サービス別</option><option value="COMMON">共通</option>
      </select>
      {draft.scopeKind==='SERVICE'&&<>
       <label htmlFor="procedure-admin-service">サービス</label>
       <select id="procedure-admin-service" disabled={busy||!!draft.id} value={draft.serviceId}
        onChange={event=>change({...draft,serviceId:event.target.value})}>
        <option value="">選択してください</option>
        {overview.services.map(service=><option key={service.id} value={service.id}>{service.name}</option>)}
       </select>
      </>}
      <label htmlFor="procedure-admin-title">タイトル</label>
      <input id="procedure-admin-title" maxLength={160} value={draft.title} disabled={busy}
       onChange={event=>change({...draft,title:event.target.value})}/>
      <ProcedureBodyEditor category={draft.category} body={draft.bodyText} disabled={busy}
       onChange={value=>change({...draft,...value})}/>
      <label htmlFor="procedure-admin-order">表示順</label>
      <input id="procedure-admin-order" type="number" min={-100000} max={100000}
       value={draft.sortOrder} disabled={busy}
       onChange={event=>change({...draft,sortOrder:Number(event.target.value)})}/>
      <label htmlFor="procedure-admin-reason">作成・編集・公開の理由</label>
      <textarea id="procedure-admin-reason" value={draft.reason} disabled={busy}
       maxLength={1000} onChange={event=>setDraft({...draft,reason:event.target.value})}/>
      <button type="button" disabled={busy||!draft.title.trim()||!draft.reason.trim()||
        !validProcedureBody(draft.bodyText)||(!draft.serviceId&&draft.scopeKind==='SERVICE')||
        (!!draft.id&&draft.status==='PUBLISHED'&&!approvalChecked)}
       onClick={()=>void save()}>保存</button>
      {draft.id&&<>
       <p>現在の状態：{draft.status==='PUBLISHED'?'公開中':draft.status==='HIDDEN'?'非表示':'下書き'}</p>
       {<label><input type="checkbox" checked={approvalChecked}
        onChange={event=>setApprovalChecked(event.target.checked)}/>
        {draft.status==='PUBLISHED'?'公開中の本文変更は承認済みです':'内容・外部リンクの承認と閲覧権限を確認しました'}</label>}
       {draft.status!=='PUBLISHED'
        ?<button type="button" disabled={busy||!draft.reason.trim()||!approvalChecked||
          draft.bodyText===initialProcedureBody(draft.category)}
          onClick={()=>void toggle('PUBLISHED')}>確認して公開</button>
        :<button type="button" className="secondary" disabled={busy||!draft.reason.trim()}
          onClick={()=>void toggle('HIDDEN')}>非表示にする</button>}
      </>}
      <details><summary>本文プレビュー</summary><ProcedureBodyText body={draft.bodyText}/></details>
     </>}
    </section>
   </div>}
  </>}
 </section>;
}
