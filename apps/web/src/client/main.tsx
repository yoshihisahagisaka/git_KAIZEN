import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Operator } from '../../../../packages/domain/src/operator.js';
import './style.css';
import { JoinUI } from './join-ui.js';

function App() {
  const [session, setSession] = useState<{ operator: Operator; csrfToken: string } | null>(null);
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
  return <main>
    <header><strong>FACTACT</strong><span>From Fact to Action.</span></header>
    {loading ? <p role="status">確認しています…</p> : error ? <p role="alert">{error}</p> : session ? <>
      <div className="account"><p>{session.operator.displayName} / {session.operator.tenantName}</p>
      <button className="secondary" onClick={() => void logout()}>ログアウト</button></div>
      <JoinUI csrf={session.csrfToken} operator={session.operator}/>
    </> : <div className="login"><h1>FACTACTへようこそ</h1><p>登録済みのGoogleアカウントでログインしてください。</p><a className="button" href="/auth/login">Googleでログイン</a></div>}
  </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
