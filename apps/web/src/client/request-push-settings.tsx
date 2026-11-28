import {useEffect,useRef,useState} from 'react';
import {api} from './api.js';
import {pushSupported,synchronizeDevicePush,enableDevicePush,disableDevicePush,preferenceKey,type PushConfig,type DevicePushState} from './request-push-device.js';

export function RequestPushSettings({csrf}:{csrf:string}){
 const supported=pushSupported();
 const [config,setConfig]=useState<PushConfig|null>(null);
 const [state,setState]=useState<DevicePushState|'CHECKING'|'ERROR'>('CHECKING');
 const [deferred,setDeferred]=useState(false);
 const [busy,setBusy]=useState(false);
 const [version,setVersion]=useState(0);
 const pending=useRef(false);
 useEffect(()=>{
  if(!supported)return;
  let live=true;
  setState('CHECKING');
  void (async()=>{
   try{
    const c=await api<PushConfig>('/api/request-push/config');
    if(!live)return;
    setConfig(c);
    const result=await synchronizeDevicePush(csrf,c);
    if(live)setState(result);
   }catch{if(live)setState('ERROR');}
  })();
  const change=(e:StorageEvent)=>{if(e.key===preferenceKey||e.key===null)setVersion(v=>v+1);};
  window.addEventListener('storage',change);
  return()=>{live=false;window.removeEventListener('storage',change);};
 },[csrf,supported,version]);
 async function change(on:boolean){
  if(pending.current||!supported||!config)return;
  pending.current=true;setBusy(true);setDeferred(false);
  try{setState(on?await enableDevicePush(csrf,config):await disableDevicePush(csrf));}
  catch{setState('ERROR');}
  finally{pending.current=false;setBusy(false);}
 }
 if(!supported)return <section aria-label="端末通知設定"><p>端末通知に対応していません。iPhoneではホーム画面に追加したアプリからご利用ください。</p></section>;
 if(state==='DISABLED')return <p role="status">端末通知は現在提供停止中です。画面内の通知は引き続き利用できます。</p>;
 if(state==='PROMPT'&&deferred)return <button type="button" className="secondary" onClick={()=>setDeferred(false)}>端末通知の設定</button>;
 return <section className="card" aria-label="端末通知設定">
  <h3>対応依頼の通知設定</h3>
  <p>{state==='ON'?'この端末の通知は購読登録済みです。':state==='OFF'?'この端末の通知はOFFです。':state==='DENIED'?'通知が拒否されています。端末の設定から通知を許可してください。':state==='ERROR'?'通知を登録・確認できませんでした。再設定してください。':state==='CHECKING'?'通知設定を確認しています…':'新しい対応依頼や対応状況の更新を、この端末で受け取れます。'}</p>
  {state==='PROMPT'&&<p>最初の一度だけ、端末の通知許可が必要です。</p>}
  {state==='ON'&&<p>実配信は導入検証後に開始します。</p>}
  {state!=='ON'&&state!=='CHECKING'&&state!=='DENIED'&&<button type="button" disabled={busy||!config?.enabled} onClick={()=>void change(true)}>{state==='PROMPT'?'通知を許可して利用を開始':'端末通知を有効にする'}</button>}
  {state==='PROMPT'&&<button type="button" className="secondary" disabled={busy} onClick={()=>setDeferred(true)}>後で設定する</button>}
  {state!=='OFF'&&state!=='CHECKING'&&<button type="button" className="secondary" disabled={busy||!config} onClick={()=>void change(false)}>端末通知をOFFにする</button>}
  {(state==='ERROR'||state==='DENIED')&&<button type="button" className="secondary" disabled={busy} onClick={()=>setVersion(v=>v+1)}>設定を再確認</button>}
  <p>通知に顧客名や問い合わせ内容は表示しません。</p>
 </section>;
}
