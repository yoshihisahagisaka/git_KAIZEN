import { useEffect, useState, type ReactNode } from 'react';
import type { HomeView,JoinWorkspaceView,PersonContextView,WorkDetailView } from '../../../../packages/application/src/join-queries.js';
import type { Audit,Device } from '../../../../packages/domain/src/join.js';
import type { Operator } from '../../../../packages/domain/src/operator.js';

export async function api<T>(url:string,csrf?:string,body?:unknown):Promise<T> {
  const response=await fetch(url,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json','x-csrf-token':csrf ?? ''},body:JSON.stringify(body)});
  const result=await response.json();
  if(!response.ok || !result.ok) throw new Error(result.error?.message ?? '処理を完了できませんでした。');
  return result.data;
}
function useData<T>(url:string,revision:number) {
  const [value,setValue]=useState<T|null>(null),[error,setError]=useState('');
  useEffect(()=>{let active=true;setError('');api<T>(url).then(v=>{if(active)setValue(v);}).catch(e=>{if(active)setError(String(e.message));});return()=>{active=false;};},[url,revision]);
  return {value,error};
}
const labels:Record<string,string>={JOIN_EVENT_CREATED:'入社予定を登録',REQUIREMENT_EVALUATED:'必要な対応を判定',WORK_CREATED:'必要な仕事を作成',WORK_OWNERSHIP_SET:'担当者を設定',ACTION_STARTED:'割当を開始',ACTION_COMPLETED:'割当の実施を記録',CHANGE_PROPOSED:'変更を提案',CHANGE_VERIFIED:'変更を検証',CHANGE_COMMITTED:'変更を確定',RELATION_EFFECTIVE:'利用PCをFactとして登録',WORK_COMPLETED:'仕事を完了',CHANGE_REJECTED:'変更を却下'};
function Timeline({events}:{events:Audit[]}) {return <section aria-label="タイムライン"><h2>タイムライン</h2><ol>{events.map(e=><li key={e.id}>{labels[e.eventType] ?? e.eventType}<details><summary>根拠と参照ID</summary><pre>{JSON.stringify(e.metadataJson,null,2)}</pre><time>{e.occurredAt}</time></details></li>)}</ol></section>;}
function Layout({title,main,context,timeline}:{title:string;main:ReactNode;context:ReactNode;timeline:Audit[]}) {return <><h1>{title}</h1><div className="workspace"><section>{main}</section><aside aria-label="Operational Context"><h2>Operational Context</h2>{context}</aside></div><Timeline events={timeline}/></>;}
function PersonFacts({personId,revision}:{personId:string;revision:number}) {
  const {value:v,error}=useData<PersonContextView>(`/api/people/${personId}/context`,revision);
  if(error)return <p role="alert">{error}</p>;if(!v)return <p>確認しています…</p>;
  return <><h3>{v.person.displayName}</h3><p>{v.organization.name}</p>{v.verifiedFacts.length===0?<p>利用PC: UNKNOWN — 未確認</p>:v.verifiedFacts.map(f=><div key={f.relationId} className="fact"><p>利用PC: {f.assetTag}</p><p>FACT / VERIFIED</p><details><summary>検証と出典</summary><p>Source Change: {f.sourceChangeId}</p><p>Verified At: {f.verifiedAt}</p><p>Effective From: {f.effectiveFrom}</p></details></div>)}<a href={`#/people/${personId}`}>Person Contextを開く</a></>;
}
type Controls={csrf:string;operator:Operator;revision:number;run:(fn:()=>Promise<void>)=>Promise<void>;busy:boolean};
function Home({csrf,revision,run,busy}:Controls) {
  const {value:v,error}=useData<HomeView>('/api/home',revision);
  if(error)return <p role="alert">{error}</p>;if(!v)return <p>確認しています…</p>;
  return <><h1>Home</h1><section><h2>入社予定を登録</h2><form onSubmit={e=>{e.preventDefault();const form=new FormData(e.currentTarget);void run(async()=>{
    const person=v.people.find(p=>p.id===form.get('personId'))!;
    const result=await api<{eventId:string}>('/api/join-events',csrf,{organizationId:person.organizationId,personId:person.id,serviceId:form.get('serviceId'),joinDate:form.get('joinDate')});location.hash=`/join/${result.eventId}`;
  });}}><label>対象者<select name="personId" required>{v.people.map(p=><option key={p.id} value={p.id}>{p.displayName}</option>)}</select></label><label>サービス<select name="serviceId" required>{v.services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>入社予定日<input name="joinDate" type="date" required/></label><button disabled={busy || !v.people.length || !v.services.length}>入社予定を登録</button></form></section><section><h2>入社対応</h2>{v.events.map(e=><p key={e.id}><a href={`#/join/${e.id}`}>JOIN / {e.joinDate}</a></p>)}</section><section><h2>次のAction</h2>{v.nextActions.map(w=><p key={w.id}><a href={`#/work/${w.id}`}>{w.title}</a> — {w.nextAction}</p>)}</section></>;
}
function JoinPage({id,csrf,revision,run,busy}:Controls&{id:string}) {
  const {value:v,error}=useData<JoinWorkspaceView>(`/api/join-events/${id}`,revision);
  if(error)return <p role="alert">{error}</p>;if(!v)return <p>確認しています…</p>;
  return <Layout title={`${v.personSummary.displayName} / JOIN`} context={<PersonFacts personId={v.personSummary.id} revision={revision}/>} timeline={v.recentTimeline} main={<>
    <p>入社予定日: {v.event.joinDate}</p><h2>準備状況</h2><p data-testid="readiness">Device: {v.readiness==='READY'?'Ready / VERIFIED':v.readiness==='NOT_REQUIRED'?'対応不要':v.readiness==='DECISION_WAITING'?'判断待ち':'UNKNOWN'}</p>
    <h2>必要な対応と理由</h2>{!v.requirementEvaluations.length&&<p>まだ判定していません。Workは作成されていません。</p>}
    {v.requirementEvaluations.map(e=><article key={e.id}><h3>{e.requirementCode} = {e.result}</h3><p>{e.basisSummary}</p>{e.result!=='REQUIRED'&&<p>No Work — この判定による仕事は作成しません。</p>}</article>)}
    <button disabled={busy} onClick={()=>void run(async()=>{await api(`/api/join-events/${id}/evaluate-requirements`,csrf,{});})}>要件を評価</button>
    <h2>Work</h2>{v.works.map(w=><article key={w.id}><a href={`#/work/${w.id}`}>{w.title}</a><p>{w.status} — {w.nextAction}</p></article>)}
  </>}/>;
}
function WorkPage({id,csrf,operator,revision,run,busy}:Controls&{id:string}) {
  const {value:v,error}=useData<WorkDetailView>(`/api/work/${id}`,revision),{value:devices}=useData<Device[]>('/api/devices',revision);
  if(error)return <p role="alert">{error}</p>;if(!v)return <p>確認しています…</p>;
  const active=v.changes.find(c=>c.status==='PROPOSED'||c.status==='VERIFIED');
  const canExecute=operator.roles.some(r=>v.authority.executeRoles.includes(r)) && operator.roles.some(r=>r==='ADMIN'||r==='OPERATOR');
  const canReview=operator.roles.some(r=>v.authority.reviewRoles.includes(r)) && operator.roles.some(r=>r==='ADMIN'||r==='REVIEWER');
  const action=active?v.actions.find(a=>a.id===active.actionId):undefined;
  const reviewAllowed=canReview && (v.authority.allowSelfReview || action?.actorOperatorId!==operator.id);
  return <Layout title={v.work.title} context={<PersonFacts personId={v.recipient.id} revision={revision}/>} timeline={v.timeline} main={<>
    <a href={`#/join/${v.work.sourceEventId}`}>JOINへ戻る</a><p>Owner: {v.ownerName} / {v.work.status}</p><h2>次のAction</h2><p>{v.nextAction}</p><h2>Why</h2><p>{v.why.basisSummary}</p>
    {v.work.status!=='COMPLETED'&&<button disabled={busy || !operator.roles.some(r=>r==='ADMIN'||r==='OPERATOR')} onClick={()=>void run(async()=>{await api(`/api/work/${id}/take-ownership`,csrf,{});})}>担当する</button>}
    {!active&&v.work.status!=='COMPLETED'&&<form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void run(async()=>{await api(`/api/work/${id}/actions/assign-device`,csrf,{deviceId:f.get('deviceId'),executionSummary:f.get('executionSummary'),effectiveFrom:new Date(String(f.get('effectiveFrom'))).toISOString(),...(v.relevantFacts[0]?{replacesRelationId:v.relevantFacts[0].relationId}:{})});});}}>
      <h2>PC割当の実施を記録</h2><label htmlFor="assign-device">PC</label><select id="assign-device" name="deviceId" required>{devices?.map(d=><option key={d.id} value={d.id}>{d.assetTag}</option>)}</select><label>実施内容<textarea name="executionSummary" required maxLength={4000}/></label><label>実際の変更日時<input name="effectiveFrom" type="datetime-local" required/></label>
      <label><input type="checkbox" required/>実機を確認し、割当を実施済みです{v.relevantFacts.length?'。現在の利用PCとの置換を確認しました':''}。</label><button disabled={busy || !canExecute || !devices?.length}>割当を記録して変更を提案</button>
    </form>}
    {v.changes.map(change=><article key={change.id} aria-label="変更"><h2>{change.status==='PROPOSED'?'変更提案（未確定）':change.status==='VERIFIED'?'検証済みの変更':change.status==='COMMITTED'?'確定済みの変更':'却下された変更'}</h2><p>{change.device.assetTag} / {change.status}</p><p>変更前: {change.proposedEffectJson.previousState==='UNKNOWN'?'UNKNOWN（未確認）':change.proposedEffectJson.previousRelationId}</p><p>実際の変更日時: {change.proposedEffectJson.effectiveFrom}</p><h3>Evidence</h3>{change.evidence.map(e=><p key={e.id}>{e.title}: {e.contentText}</p>)}
      {change.status==='PROPOSED'&&<form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void run(async()=>{await api(`/api/changes/${change.id}/verify`,csrf,{verificationSummary:f.get('summary')});});}}><label>検証内容<textarea name="summary" required maxLength={4000}/></label><button disabled={busy || !reviewAllowed}>変更を検証</button></form>}
      {change.status==='VERIFIED'&&<button disabled={busy || !reviewAllowed} onClick={()=>void run(async()=>{await api(`/api/changes/${change.id}/commit`,csrf,{});})}>変更を確定（Commit）</button>}
      {['PROPOSED','VERIFIED'].includes(change.status)&&<details><summary>実施内容が異なる場合</summary><form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void run(async()=>{await api(`/api/changes/${change.id}/reject`,csrf,{reason:f.get('reason')});});}}><label>却下理由<textarea name="reason" required maxLength={4000}/></label><button disabled={busy || !reviewAllowed}>却下して提案し直す</button></form></details>}
    </article>)}
    {v.work.status!=='COMPLETED'&&<button disabled={busy || !!active || !v.changes.some(c=>c.status==='COMMITTED') || !operator.roles.some(r=>r==='ADMIN'||r==='OPERATOR')} onClick={()=>void run(async()=>{await api(`/api/work/${id}/complete`,csrf,{outcome:'COMPLETED'});})}>仕事を完了</button>}
  </>}/>;
}
function PersonPage({id,revision}:Controls&{id:string}) {
  const {value:v,error}=useData<PersonContextView>(`/api/people/${id}/context`,revision);
  if(error)return <p role="alert">{error}</p>;if(!v)return <p>確認しています…</p>;
  return <Layout title={`${v.person.displayName} / Person Context`} context={<PersonFacts personId={id} revision={revision}/>} timeline={v.timeline} main={<><h2>未完了のWork</h2>{v.openWork.map(w=><p key={w.id}><a href={`#/work/${w.id}`}>{w.title}</a></p>)}<h2>利用PCの履歴</h2>{v.relationHistory.map(r=><article key={r.id}><p>{r.status}: {r.effectiveFrom} → {r.effectiveTo ?? '現在'}</p><p>Source Change: {r.sourceChangeId}</p></article>)}</>}/>;
}
export function JoinUI({csrf,operator}:{csrf:string;operator:Operator}) {
  const [route,setRoute]=useState(location.hash.slice(1)||'/'),[revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{const change=()=>{setRoute(location.hash.slice(1)||'/');setError('');};window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change);},[]);
  async function run(fn:()=>Promise<void>) {if(busy)return;setBusy(true);setError('');try{await fn();setRevision(n=>n+1);}catch(e){setError(e instanceof Error?e.message:'処理を完了できませんでした。');}finally{setBusy(false);}}
  const props={csrf,operator,revision,run,busy},[,kind,id]=route.split('/');
  return <><nav><a href="#/">Home</a></nav>{error&&<p role="alert">{error}</p>}{busy&&<p role="status">処理しています…</p>}{kind==='join'&&id?<JoinPage key={route} {...props} id={id}/>:kind==='work'&&id?<WorkPage key={route} {...props} id={id}/>:kind==='people'&&id?<PersonPage key={route} {...props} id={id}/>:<Home {...props}/>}</>;
}
