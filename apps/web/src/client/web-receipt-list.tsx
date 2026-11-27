import {useEffect,useState} from 'react';
import {api} from './api.js';
import type {PublicReceiptView} from '../server/persistence/scoped-access-reader.js';
type Page={items:PublicReceiptView[];nextCursor:string|null};
export function WebReceiptList({serviceId,disabled,onSelect}:{serviceId:string;disabled:boolean;onSelect:(r:PublicReceiptView)=>void}){
 const [page,setPage]=useState<Page|null>(null),[cursor,setCursor]=useState<string|null>(null),[version,setVersion]=useState(0),[error,setError]=useState('');
 useEffect(()=>{let live=true;setPage(null);setError('');
  api<Page>('/api/scoped/support-intake/services/'+serviceId+'/web-receipts'+(cursor?'?cursor='+encodeURIComponent(cursor):''))
   .then(p=>{if(live)setPage(p);}).catch(()=>{if(live)setError('Web受付を取得できませんでした。');});
  return()=>{live=false;};
 },[serviceId,cursor,version]);
 return <section className="card" aria-label="Web問い合わせ受付">
  <h3>Web問い合わせ受付</h3>
  <button type="button" className="secondary" disabled={disabled} onClick={()=>{setCursor(null);setVersion(n=>n+1);}}>Web受付を再取得</button>
  {error&&<p role="alert">{error}</p>}
  {!page&&!error&&<p>確認しています…</p>}
  {page&&!page.items.length&&<p>表示できるWeb受付はありません。</p>}
  <ul>{page?.items.map(r=><li key={r.id}><strong>{r.company}</strong> <small>{new Date(r.receivedAt).toLocaleString('ja-JP')}</small><p>{r.description}</p><button type="button" disabled={disabled} onClick={()=>onSelect(r)}>顧客照合へ</button></li>)}</ul>
  {page?.nextCursor&&<button type="button" className="secondary" disabled={disabled} onClick={()=>setCursor(page.nextCursor)}>次の受付を表示</button>}
 </section>;
}
