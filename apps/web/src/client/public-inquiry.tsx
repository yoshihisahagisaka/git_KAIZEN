import {useEffect,useRef,useState,type FormEvent} from 'react';
import {api} from './api.js';
type Config={name:string;privacyUrl:string;siteKey:string};
type Challenge={render:(element:HTMLElement,options:{sitekey:string;action:string;callback:(token:string)=>void;'expired-callback':()=>void;'error-callback':()=>void})=>string;reset:(id:string)=>void;remove:(id:string)=>void};
let scriptPromise:Promise<Challenge>|null=null;
function challenge():Promise<Challenge>{
 if(scriptPromise)return scriptPromise;
 scriptPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;
  script.onload=()=>{const t=(window as unknown as {turnstile?:Challenge}).turnstile;if(t)resolve(t);else reject(Error('Challenge unavailable'));};
  script.onerror=()=>reject(Error('Challenge unavailable'));document.head.appendChild(script);
 });
 return scriptPromise;
}
export function PublicInquiry({slug}:{slug:string}){
 const [config,setConfig]=useState<Config|null>(null),[error,setError]=useState(''),[token,setToken]=useState('');
 const [busy,setBusy]=useState(false),[done,setDone]=useState(false);
 const widget=useRef<HTMLDivElement>(null),handle=useRef<{t:Challenge;id:string}|null>(null);
 const retry=useRef<{key:string;id:string}|null>(null),sending=useRef(false);
 const base='/public-inquiry/'+encodeURIComponent(slug);
 useEffect(()=>{let live=true;api<Config>(base+'/config').then(c=>{if(live){setConfig(c);document.title=c.name+' お問い合わせ';}}).catch(()=>{if(live)setError('受付窓口を確認できませんでした。');});return()=>{live=false;};},[base]);
 useEffect(()=>{
  if(!config||done)return;
  let live=true;
  challenge().then(t=>{if(!live||!widget.current)return;
   const id=t.render(widget.current,{sitekey:config.siteKey,action:'public_inquiry',callback:value=>{if(live)setToken(value);},'expired-callback':()=>{if(live)setToken('');},'error-callback':()=>{if(live){setToken('');setError('送信確認を利用できません。再読み込みしてください。');}}});
   handle.current={t,id};
  }).catch(()=>{if(live)setError('送信確認を利用できません。再読み込みしてください。');});
  return()=>{live=false;if(handle.current){handle.current.t.remove(handle.current.id);handle.current=null;}};
 },[config,done]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(sending.current||!token||!config)return;
  const form=new FormData(event.currentTarget);
  const payload={company:String(form.get('company')??''),department:String(form.get('department')??''),name:String(form.get('name')??''),email:String(form.get('email')??''),phone:String(form.get('phone')??''),category:String(form.get('category')??''),description:String(form.get('description')??''),privacyConsent:form.get('consent')==='on'};
  const key=JSON.stringify(payload);
  if(retry.current?.key!==key)retry.current={key,id:crypto.randomUUID()};
  sending.current=true;setBusy(true);setError('');
  try{await api(base+'/submit',undefined,{...payload,submissionId:retry.current.id,turnstileToken:token});setDone(true);retry.current=null;}
  catch{setError('送信できませんでした。入力内容を確認し、もう一度お試しください。');setToken('');if(handle.current)handle.current.t.reset(handle.current.id);}
  finally{sending.current=false;setBusy(false);}
 }
 return <main className="public-inquiry"><header><strong>{config?.name??'お問い合わせ'}</strong></header>
  {done?<section className="card"><h1>お問い合わせを受け付けました</h1><p>担当者が内容を確認します。</p></section>:<>
   <h1>お問い合わせ</h1>
   {error&&<p role="alert">{error}</p>}
   {config&&<form className="card" onSubmit={e=>void submit(e)}>
    <p>ITに関するお困りごとやご相談をお聞かせください。</p>
    <fieldset disabled={busy}>
     <label htmlFor="inq-company">企業名（必須）</label><input id="inq-company" name="company" required maxLength={200} autoComplete="organization"/>
     <label htmlFor="inq-department">部署名（任意）</label><input id="inq-department" name="department" maxLength={200}/>
     <label htmlFor="inq-name">お名前（必須）</label><input id="inq-name" name="name" required maxLength={200} autoComplete="name"/>
     <label htmlFor="inq-email">メールアドレス（必須）</label><input id="inq-email" name="email" type="email" required maxLength={320} autoComplete="email"/>
     <label htmlFor="inq-phone">電話番号（必須）</label><input id="inq-phone" name="phone" type="tel" required maxLength={80} autoComplete="tel"/>
     <label htmlFor="inq-category">お問い合わせ種別（必須）</label><select id="inq-category" name="category" required defaultValue=""><option value="">選択してください</option><option value="PC">PCの操作・不具合</option><option value="NETWORK">ネットワーク</option><option value="PRINTER">複合機・印刷・スキャン</option><option value="PHONE">ビジネスフォン</option><option value="OTHER">その他IT関連</option></select>
     <label htmlFor="inq-description">お問い合わせ内容（必須）</label><textarea id="inq-description" name="description" required rows={6} maxLength={4000}/>
     <p>パスワードや機密情報は入力しないでください。</p>
     <label><input type="checkbox" name="consent" required/> <a href={config.privacyUrl} target="_blank" rel="noopener noreferrer">個人情報の取り扱い</a>に同意する</label>
    </fieldset>
    <div ref={widget}/>
    <button type="submit" disabled={busy||!token}>{busy?'送信しています…':'お問い合わせを送信'}</button>
   </form>}
  </>}
 </main>;
}
