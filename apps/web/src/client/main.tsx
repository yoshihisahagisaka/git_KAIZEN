import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Operator } from '../../../../packages/domain/src/operator.js';
import type { SessionContext } from '../../../../packages/application/src/operator-session.js';
import './style.css';
import { JoinUI } from './join-ui.js';
import { ScopedSupportUI } from './scoped-support-ui.js';
import { api } from './api.js';

type BrowserSession = { operator: Operator; csrfToken: string };

function SessionContextPicker({session,onSwitch}:{session:BrowserSession;onSwitch:(tenantId:string)=>Promise<void>}) {
  const [contexts,setContexts] = useState<SessionContext[]>([]);
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  useEffect(()=>{
    let active=true;
    api<{contexts:SessionContext[]}>('/api/session/contexts')
      .then(data=>{if(active)setContexts(data.contexts);})
      .catch(()=>{if(active)setError('所属先の一覧を確認できませんでした。');});
    return ()=>{active=false;};
  },[session.operator.tenantId,session.operator.id]);
  if(contexts.length<=1)return error?<p role="alert">{error}</p>:null;
  return <div className="context-picker">
    <label htmlFor="active-tenant">利用する所属先</label>
    <select id="active-tenant" value={session.operator.tenantId} disabled={busy} onChange={event=>{
      const tenantId=event.currentTarget.value;
      if(!contexts.some(context=>context.tenantId===tenantId&&!context.isCurrent))return;
      setBusy(true);
      void onSwitch(tenantId).catch(()=>setError('所属先を切り替えられませんでした。再読み込みしてください。'));
    }}>
      {contexts.map(context=><option key={`${context.tenantId}:${context.operatorId}`} value={context.tenantId}>{context.tenantName}</option>)}
    </select>
    {error&&<p role="alert">{error}</p>}
  </div>;
}

function App() {
  const [session, setSession] = useState<BrowserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/session').then(async response => {
      if (response.status === 401) return;
      if (!response.ok) throw new Error();
      const body = await response.json();
      setSession(body.data);
    }).catch(() => setError('接続を確認できませんでした。再読み込みしてください。')).finally(() => setLoading(false));
  }, []);
  async function logout() {
    if (!session) return;
    try {
      const response = await fetch('/auth/logout', { method: 'POST', headers: { 'x-csrf-token': session.csrfToken } });
      if (!response.ok) throw new Error();
      setSession(null);
    } catch { setError('ログアウトできませんでした。もう一度お試しください。'); }
  }
  async function switchContext(tenantId:string) {
    if(!session)return;
    const csrfToken=session.csrfToken;
    // Unmount all tenant-bound UI before rotating the cookie: old Work must
    // never survive a context switch, including a failed/denied one.
    setSession(null);
    setLoading(true);
    try {
      const next=await api<BrowserSession>('/api/session/context',csrfToken,{tenantId});
      window.location.hash='';
      setSession(next);
    } catch {
      setError('所属先を切り替えられませんでした。再読み込みしてログイン状態を確認してください。');
    } finally {setLoading(false);}
  }
  return <main>
    <header><strong>FACTACT</strong><span>From Fact to Action.</span></header>
    {loading ? <p role="status">確認しています…</p> : error ? <p role="alert">{error}</p> : session ? <>
      <div className="account"><p>{session.operator.displayName} / {session.operator.tenantName}</p>
      <SessionContextPicker key={`${session.operator.tenantId}:${session.operator.id}`} session={session} onSwitch={switchContext}/>
      <button className="secondary" onClick={() => void logout()}>ログアウト</button></div>
      {session.operator.readAuthorityMode==='INTERNAL_V1'
        ? <JoinUI key={`${session.operator.tenantId}:${session.operator.id}`} csrf={session.csrfToken} operator={session.operator}/>
        : session.operator.readAuthorityMode==='SCOPED'
          ? <ScopedSupportUI key={`${session.operator.tenantId}:${session.operator.id}`} csrf={session.csrfToken}/>
          : <p role="alert">このアカウントで利用できる画面を確認できませんでした。管理者にお問い合わせください。</p>}
    </> : <div className="login"><h1>FACTACTへようこそ</h1><p>登録済みのGoogleアカウントでログインしてください。</p><a className="button" href="/auth/login">Googleでログイン</a></div>}
  </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
