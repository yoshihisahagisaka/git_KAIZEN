import {useEffect,useRef,useState} from 'react';
import {api,ApiError} from './api.js';
import type {OperatorPolicyOverview,PolicyLevel,PolicyDisposition}
  from '../server/persistence/operator-policy-admin.js';

const levels:{value:PolicyLevel;label:string}[]=[
  {value:'NEWCOMER',label:'新人'},{value:'STANDARD',label:'一般'},
  {value:'LEAD',label:'責任者'},
];
const levelName=(level:PolicyLevel|null)=>
  level===null?'未割当':levels.find(item=>item.value===level)?.label??'不明';
const dispositionName=(value:PolicyDisposition)=>value==='DENY'?'不可':'申請';
function localDate(value:string){
  const time=new Date(value);
  return Number.isFinite(time.getTime())?time.toLocaleString('ja-JP'):'日時未確認';
}
type LevelChoice=PolicyLevel|'REMOVE'|'';
type CellChoice=PolicyDisposition|'';
type DraftCells={NEWCOMER:CellChoice;STANDARD:CellChoice;LEAD:CellChoice};
const blankCells=():DraftCells=>({NEWCOMER:'',STANDARD:'',LEAD:''});

/** The UI is not the authorization boundary. The component remains invisible
 * unless an administrator-only DB read succeeds. Every command independently
 * checks that same OIDC subject and current membership under a database lock. */
export function OperatorPolicyAdminUI({csrf}:{csrf:string}){
  const [authorized,setAuthorized]=useState(false);
  const [overview,setOverview]=useState<OperatorPolicyOverview|null>(null);
  const [serviceId,setServiceId]=useState('');
  const [open,setOpen]=useState(false);
  const [actorQuery,setActorQuery]=useState('');
  const [actorSearch,setActorSearch]=useState('');
  const [actorId,setActorId]=useState('');
  const [level,setLevel]=useState<LevelChoice>('');
  const [levelReason,setLevelReason]=useState('');
  const [cells,setCells]=useState<DraftCells>(blankCells);
  const [versionReason,setVersionReason]=useState('');
  const [selectedVersionId,setSelectedVersionId]=useState('');
  const [publishReason,setPublishReason]=useState('');
  const [stopReason,setStopReason]=useState('');
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const requestSerial=useRef(0);
  const sending=useRef(false);
  // Reuse the same operation UUID only for an identical retry after an
  // uncertain network result; modifying any field allocates a new UUID.
  const retry=useRef<{key:string;id:string}|null>(null);

  async function reload(service=serviceId,search=actorQuery){
    const serial=++requestSerial.current;
    setLoading(true);setOverview(null);
    try{
      const query=new URLSearchParams();
      if(service)query.set('serviceId',service);
      if(search)query.set('actorQuery',search);
      const data=await api<OperatorPolicyOverview>(`/api/admin/operator-policy?${query}`);
      if(serial!==requestSerial.current)return;
      if(service&&data.service?.id!==service)throw Error('Policy service changed');
      setAuthorized(true);setOverview(data);
    }catch(cause){
      if(serial!==requestSerial.current)return;
      setOverview(null);
      if(cause instanceof ApiError&&[401,403,404].includes(cause.status)){
        setAuthorized(false);setOpen(false);
      }else if(authorized){
        setError('運用設定を取得できませんでした。再読み込みしてください。');
      }
    }finally{if(serial===requestSerial.current)setLoading(false);}
  }
  useEffect(()=>{
    void reload(serviceId,actorQuery);
    return ()=>{requestSerial.current++;};
  },[serviceId,actorQuery]);

  function chooseService(id:string){
    setServiceId(id);setActorId('');setLevel('');setLevelReason('');
    setActorQuery('');setActorSearch('');setCells(blankCells());
    setVersionReason('');setSelectedVersionId('');setPublishReason('');
    setStopReason('');setError('');setNotice('');retry.current=null;
  }

  async function write(path:string,fields:Record<string,unknown>,success:string){
    if(!serviceId||!authorized||sending.current)return null;
    const key=JSON.stringify([path,fields]);
    const requestId=retry.current?.key===key?retry.current.id:crypto.randomUUID();
    retry.current={key,id:requestId};
    sending.current=true;setBusy(true);setError('');setNotice('');
    try{
      const result=await api<{requestId?:string;versionId?:string}>(path,csrf,{...fields,requestId});
      retry.current=null;setNotice(success);
      await reload();
      return result;
    }catch(cause){
      if(cause instanceof ApiError&&[401,403,404].includes(cause.status)){
        requestSerial.current++;setAuthorized(false);setOverview(null);setOpen(false);
      }else{
        setError(cause instanceof ApiError&&cause.status===409
          ?'設定が競合しました。最新の状態を確認して、もう一度操作してください。'
          :'保存結果を確認できませんでした。同じ内容で再試行するか、最新の状態を確認してください。');
      }
      return null;
    }finally{sending.current=false;setBusy(false);}
  }

  async function assign(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    const reason=levelReason.trim();
    if(!actorId||!level||!reason)return;
    const result=await write('/api/admin/operator-policy/levels',{
      serviceId,actorId,level:level==='REMOVE'?null:level,reason,
    },level==='REMOVE'?'運用者レベルの割当を解除しました。':'運用者レベルを保存しました。');
    if(result)setLevelReason('');
  }
  async function createVersion(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    const reason=versionReason.trim();
    if(!reason||levels.some(item=>!cells[item.value]))return;
    const result=await write('/api/admin/operator-policy/versions',{
      serviceId,cells,reason,
    },'新しい設定版を保存しました。公開するまでは現在の公開状態は変わりません。');
    if(result?.versionId){setVersionReason('');setSelectedVersionId(result.versionId);}
  }
  async function publish(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!selectedVersionId||!publishReason.trim())return;
    const result=await write('/api/admin/operator-policy/publications',{
      serviceId,versionId:selectedVersionId,reason:publishReason.trim(),
    },'指定した設定版を公開履歴に記録しました。');
    if(result)setPublishReason('');
  }
  async function disable(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!stopReason.trim()||overview?.current?.operation!=='PUBLISH')return;
    const result=await write('/api/admin/operator-policy/publications',{
      serviceId,versionId:null,reason:stopReason.trim(),
    },'設定の公開停止を記録しました。');
    if(result)setStopReason('');
  }

  if(!authorized)return null;
  const service=overview?.service;
  const selectedActor=overview?.actors.find(item=>item.id===actorId);
  const selectedVersion=overview?.versions.find(item=>item.id===selectedVersionId);
  const current=overview?.current;
  return <section className="policy-admin" aria-label="運用設定（管理者）">
    <div className="policy-admin-heading"><div><h2>運用設定（管理者）</h2>
      <p>サービス別の運用者レベルと変更時の申請ルール</p></div>
      <button type="button" className="secondary" aria-expanded={open}
        onClick={()=>setOpen(value=>!value)}>{open?'閉じる':'設定を開く'}</button></div>
    {open&&<div className="policy-admin-body">
      <p className="notice">この設定は現時点ではRegistryの変更権限に接続されていません。公開しても自動確定やGrant付与は発生しません。</p>
      <div className="policy-admin-selection"><label htmlFor="policy-service">対象サービス</label>
        <select id="policy-service" value={serviceId} disabled={busy}
          onChange={event=>chooseService(event.currentTarget.value)}>
          <option value="">サービスを選択</option>
          {overview?.services.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
        </select></div>
      {error&&<p role="alert">{error}</p>}
      {notice&&<p role="status" className="scoped-write-notice">{notice}</p>}
      {loading&&<p role="status">運用設定を読み込んでいます…</p>}
      {!loading&&!serviceId&&<p>設定するサービスを選択してください。</p>}
      {service&&!loading&&<>
        <div className="policy-admin-columns">
          <section className="policy-admin-card" aria-label="運用者レベル設定">
            <h3>1. 運用者レベル</h3>
            <form onSubmit={event=>{event.preventDefault();setActorQuery(actorSearch.trim());setActorId('');setLevel('');}}>
              <label htmlFor="policy-actor-search">運用者を名前で検索</label>
              <div className="policy-admin-inline"><input id="policy-actor-search"
                value={actorSearch} maxLength={80} disabled={busy}
                onChange={event=>setActorSearch(event.target.value)}/>
                <button className="secondary" disabled={busy}>検索</button></div>
            </form>
            {overview?.hasMoreActors&&<p className="policy-admin-hint">候補は先頭50名です。名前で絞り込んでください。</p>}
            <form onSubmit={event=>void assign(event)}>
              <label htmlFor="policy-actor">運用者</label>
              <select id="policy-actor" value={actorId} disabled={busy}
                onChange={event=>{setActorId(event.target.value);setLevel('');setLevelReason('');retry.current=null;}}>
                <option value="">運用者を選択</option>
                {overview?.actors.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              {selectedActor&&<p className="policy-admin-hint">現在の割当：{levelName(selectedActor.level)}</p>}
              <label htmlFor="policy-level">設定するレベル</label>
              <select id="policy-level" value={level} disabled={busy||!actorId}
                onChange={event=>{setLevel(event.target.value as LevelChoice);retry.current=null;}}>
                <option value="">選択してください</option>
                {levels.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}
                <option value="REMOVE">割当を解除</option>
              </select>
              <label htmlFor="policy-level-reason">設定理由（必須）</label>
              <textarea id="policy-level-reason" value={levelReason} maxLength={1000} required disabled={busy}
                onChange={event=>{setLevelReason(event.target.value);retry.current=null;}}/>
              <button type="submit" disabled={busy||!actorId||!level||!levelReason.trim()}>割当を保存</button>
            </form>
          </section>
          <section className="policy-admin-card" aria-label="変更カテゴリ設定">
            <h3>2. 変更カテゴリのルール</h3>
            <p>初回対象：Personの表示名訂正</p>
            <form onSubmit={event=>void createVersion(event)}>
              {levels.map(item=><label key={item.value} htmlFor={`policy-cell-${item.value}`}>
                {item.label}
                <select id={`policy-cell-${item.value}`} value={cells[item.value]} disabled={busy}
                  onChange={event=>{setCells(previous=>({...previous,[item.value]:event.target.value as CellChoice}));retry.current=null;}}>
                  <option value="">選択してください</option><option value="DENY">不可</option>
                  <option value="REQUEST">申請（確認待ち）</option>
                </select>
              </label>)}
              <p className="policy-admin-hint">表示名訂正は必ず別の確認者が必要です。「即時確定」は設定できません。</p>
              <label htmlFor="policy-version-reason">設定版を作成する理由（必須）</label>
              <textarea id="policy-version-reason" value={versionReason} maxLength={1000} required disabled={busy}
                onChange={event=>{setVersionReason(event.target.value);retry.current=null;}}/>
              <button type="submit" disabled={busy||!versionReason.trim()||levels.some(item=>!cells[item.value])}>新しい設定版を保存</button>
            </form>
          </section>
        </div>
        <section className="policy-admin-card" aria-label="設定の公開と停止">
          <h3>3. 設定版を公開・停止</h3>
          <p>現在の公開状態：<strong>{current?.operation==='PUBLISH'?`第${current.version}版を公開中`:'公開なし'}</strong></p>
          <form onSubmit={event=>void publish(event)}>
            <label htmlFor="policy-publication-version">公開する設定版</label>
            <select id="policy-publication-version" value={selectedVersionId} disabled={busy}
              onChange={event=>{setSelectedVersionId(event.target.value);retry.current=null;}}>
              <option value="">設定版を選択</option>
              {overview?.versions.map(item=><option key={item.id} value={item.id}>第{item.version}版</option>)}
            </select>
            {selectedVersion&&<div className="policy-admin-preview" aria-label="公開前の設定内容">
              <strong>第{selectedVersion.version}版の内容</strong>
              <ul>{levels.map(item=><li key={item.value}>{item.label}：{dispositionName(selectedVersion.cells[item.value])}</li>)}</ul>
              <p>作成理由：{selectedVersion.reason}</p>
            </div>}
            <label htmlFor="policy-publish-reason">公開理由（必須）</label>
            <textarea id="policy-publish-reason" value={publishReason} maxLength={1000} required disabled={busy}
              onChange={event=>{setPublishReason(event.target.value);retry.current=null;}}/>
            <button disabled={busy||!selectedVersion||!publishReason.trim()} type="submit">この設定版を公開</button>
          </form>
          {current?.operation==='PUBLISH'&&<form onSubmit={event=>void disable(event)} className="policy-admin-stop">
            <label htmlFor="policy-stop-reason">公開停止の理由（必須）</label>
            <textarea id="policy-stop-reason" value={stopReason} maxLength={1000} required disabled={busy}
              onChange={event=>{setStopReason(event.target.value);retry.current=null;}}/>
            <button className="secondary" disabled={busy||!stopReason.trim()} type="submit">公開を停止</button>
          </form>}
        </section>
        <section className="policy-admin-card" aria-label="運用設定の履歴">
          <h3>4. 管理履歴</h3>
          <div className="policy-admin-columns">
            <div><h4>レベルの変更</h4>
              {!overview?.assignments.length&&<p>履歴はありません。</p>}
              <ol>{overview?.assignments.map(item=><li key={item.id}>
                <strong>{item.actorName}：{levelName(item.level)}</strong>
                <time dateTime={item.at}>{localDate(item.at)} / {item.by}</time>
                <p>{item.reason}</p>
              </li>)}</ol></div>
            <div><h4>設定版と公開・停止</h4>
              {!overview?.versions.length&&!overview?.publications.length&&<p>履歴はありません。</p>}
              <ol>{overview?.versions.map(item=><li key={item.id}>
                <strong>第{item.version}版を作成</strong>
                <time dateTime={item.at}>{localDate(item.at)} / {item.by}</time>
                <p>{item.reason}</p>
              </li>)}</ol>
              <ol>{overview?.publications.map(item=><li key={item.id}>
                <strong>{item.operation==='PUBLISH'?`第${item.version}版を公開`:'公開を停止'}</strong>
                <time dateTime={item.at}>{localDate(item.at)} / {item.by}</time>
                <p>{item.reason}</p>
              </li>)}</ol>
            </div>
          </div>
        </section>
      </>}
      <button className="secondary" type="button" disabled={busy||loading}
        onClick={()=>{setError('');setNotice('');void reload();}}>最新の設定を確認</button>
    </div>}
  </section>;
}
