import {useEffect,useRef,useState} from 'react';
import {api} from './api.js';
import {ProcedureBodyText} from './procedure-page-text.js';
import type {ProcedurePage,ProcedurePageList} from '../server/persistence/procedure-page-store.js';
import type {ProcedureCategory} from '../../../../packages/domain/src/procedure-page-text.js';

const categories:{value:ProcedureCategory|'ALL';label:string}[]=[
 {value:'ALL',label:'すべて'},{value:'SCRIPT',label:'トークスクリプト'},
 {value:'PROCEDURE',label:'手順書'},{value:'FAQ',label:'FAQ'},
];

/** Work-local, read-only reference. Opening it never records a SUPPORT Event or
 * mutates Fact/Registry/Knowledge. Work's editor stays mounted behind dialog. */
export function ProcedurePageReference({workId}:{workId:string}){
 const dialog=useRef<HTMLDialogElement>(null);
 const trigger=useRef<HTMLButtonElement>(null);
 const [open,setOpen]=useState(false),[keyword,setKeyword]=useState(''),[search,setSearch]=useState('');
 const [category,setCategory]=useState<ProcedureCategory|'ALL'>('ALL');
 const [pages,setPages]=useState<ProcedurePageList['items']>([]);
 const [cursor,setCursor]=useState<string|null>(null);
 const [selected,setSelected]=useState<ProcedurePage|null>(null);
 const [loading,setLoading]=useState(false),[error,setError]=useState('');
 const [moreBusy,setMoreBusy]=useState(false);
 useEffect(()=>{if(open)dialog.current?.showModal();},[open]);
 useEffect(()=>{
  if(!open)return;
  let alive=true;
  setSelected(null);setPages([]);setCursor(null);setLoading(true);setError('');
  const query=new URLSearchParams({q:search,limit:'20'});
  if(category!=='ALL')query.set('category',category);
  api<{items:ProcedurePageList['items'];nextCursor:string|null}>(
   `/api/support-work/${workId}/procedure-pages?${query}`)
   .then(data=>{if(!alive)return;setPages(data.items);setCursor(data.nextCursor);})
   .catch(()=>{if(alive)setError('この対応で利用できる手順書を取得できませんでした。');})
   .finally(()=>{if(alive)setLoading(false);});
  return ()=>{alive=false;};
 },[workId,open,search,category]);
 async function showPage(id:string){
  setError('');setSelected(null);
  try{const page=await api<ProcedurePage>(`/api/support-work/${workId}/procedure-pages/${id}`);
   if(open)setSelected(page);
  }catch{setError('手順書の閲覧権限または公開状態を確認できませんでした。');}
 }
 async function more(){
  if(!cursor||moreBusy)return;
  setMoreBusy(true);
  const query=new URLSearchParams({q:search,limit:'20',cursor});
  if(category!=='ALL')query.set('category',category);
  try {
   const data=await api<{items:ProcedurePageList['items'];nextCursor:string|null}>(
    `/api/support-work/${workId}/procedure-pages?${query}`);
   setPages(prev=>{
    const seen=new Set(prev.map(x=>x.id));
    return [...prev,...data.items.filter(x=>!seen.has(x.id))];
   });setCursor(data.nextCursor);
  } catch {setError('追加の手順書を取得できませんでした。');}
  finally{setMoreBusy(false);}
 }
 return <section className="procedure-reference" aria-label="承認済み手順書">
  <button type="button" className="secondary" ref={trigger} onClick={()=>setOpen(true)}>
   手順書・トーク・FAQを検索
  </button>
  {open&&<dialog ref={dialog} className="context-dialog" aria-label="手順書・FAQ"
    onClose={()=>{setOpen(false);setSelected(null);trigger.current?.focus();}}>
   <header><h2>手順書・FAQ</h2><button type="button" onClick={()=>dialog.current?.close()}>閉じる</button></header>
   {selected?<section aria-label="公開手順書の内容">
    <button type="button" className="secondary" onClick={()=>setSelected(null)}>一覧へ戻る</button>
    <h3>{selected.title}</h3>
    <p>公開済み / {categories.find(x=>x.value===selected.category)?.label}</p>
    <ProcedureBodyText body={selected.bodyText}/>
   </section>:<>
    <p>この対応で利用できる公開済みの手順書だけを表示します。未承認の参考知識とは別です。</p>
    <form onSubmit={event=>{event.preventDefault();setSearch(keyword.trim());}}>
     <label htmlFor="procedure-reference-q">キーワード</label>
     <input id="procedure-reference-q" value={keyword} maxLength={100}
      onChange={event=>setKeyword(event.target.value)} placeholder="手順・質問など"/>
     <label htmlFor="procedure-reference-category">種類</label>
     <select id="procedure-reference-category" value={category}
      onChange={event=>setCategory(event.target.value as typeof category)}>
      {categories.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}
     </select>
     <button type="submit">検索</button>
    </form>
    {loading&&<p role="status">確認中…</p>}
    {!loading&&!error&&!pages.length&&<p>該当する公開手順書はありません。</p>}
    <ul>{pages.map(page=><li key={page.id}>
     <button type="button" className="secondary" onClick={()=>void showPage(page.id)}>
      {page.title}
     </button><small> {categories.find(x=>x.value===page.category)?.label}</small>
    </li>)}</ul>
    {cursor&&<button type="button" className="secondary" disabled={moreBusy}
     onClick={()=>void more()}>さらに表示</button>}
   </>}
   {error&&<p role="alert">{error}</p>}
  </dialog>}
 </section>;
}
