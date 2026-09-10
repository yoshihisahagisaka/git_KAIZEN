import { useEffect, useState, type ReactNode } from 'react';
import type { HomeView, JoinWorkspaceView, PersonContextView, WorkDetailView } from '../../../../packages/application/src/join-queries.js';
import type { Audit, Device, Work } from '../../../../packages/domain/src/join.js';
import type { Operator } from '../../../../packages/domain/src/operator.js';
import { demoGuidance } from './join-guidance.js';

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
const labels:Record<string,string>={JOIN_EVENT_CREATED:'入社予定を登録',REQUIREMENT_EVALUATED:'必要な準備を確認',WORK_CREATED:'PC準備の対応を作成',WORK_OWNERSHIP_SET:'担当者を設定',ACTION_STARTED:'PC準備の実施記録を開始',ACTION_COMPLETED:'準備・引き渡しの実施を記録',CHANGE_PROPOSED:'管理情報への反映内容を作成',CHANGE_VERIFIED:'実際の引き渡しを確認',CHANGE_COMMITTED:'確認した内容を管理情報に反映',RELATION_EFFECTIVE:'利用PCを確認済みの情報として登録',WORK_COMPLETED:'PC準備の対応を完了',CHANGE_REJECTED:'反映内容を取り下げ'};
const resultLabels:Record<string,string>={REQUIRED:'会社PCの準備が必要です',NOT_APPLICABLE:'会社PCの対応は不要です',ALREADY_SATISFIED:'会社PCは準備済みです',DECISION_REQUIRED:'会社PCの必要性について判断が必要です'};
function date(value:string) {return new Date(value).toLocaleString('ja-JP');}
function workTitle(w:Work) {return w.title.replace(' — 会社PCの準備・割当','さんのPC準備');}
function nextText(w:Work) {
  if(w.status==='COMPLETED') return 'PC準備は完了しています';
  if(w.nextAction==='変更内容とEvidenceを検証') return '実際の引き渡しを確認する';
  if(w.nextAction==='検証済みの変更を確定') return '確認した利用PCを管理情報に反映する';
  if(w.nextAction==='準備状況を確認して仕事を完了') return '反映した利用PCを確認し、対応を完了する';
  return '必要な設定と手順を確認して、利用するPCを選ぶ';
}
function Timeline({events}:{events:Audit[]}) {return <section aria-label="対応履歴" className="timeline"><h2>対応履歴</h2>{!events.length&&<p>まだ記録はありません。</p>}<ol>{events.map(e=><li key={e.id}><strong>{labels[e.eventType] ?? '関連する記録'}</strong><time>{date(e.occurredAt)}</time><details><summary>監査用の詳細</summary><p>{e.eventType}</p><pre>{JSON.stringify(e.metadataJson,null,2)}</pre></details></li>)}</ol></section>;}
function Layout({title,main,context,timeline}:{title:string;main:ReactNode;context:ReactNode;timeline:Audit[]}) {return <><h1>{title}</h1><div className="workspace"><section className="main-panel">{main}</section><aside aria-label="現在のIT利用状況"><h2>現在のIT利用状況</h2>{context}</aside></div><Timeline events={timeline}/></>;}
function PersonFacts({personId,revision}:{personId:string;revision:number}) {
  const {value:v,error}=useData<PersonContextView>(`/api/people/${personId}/context`,revision);
  if(error)return <p role="alert">{error}</p>;if(!v)return <p>確認しています…</p>;
  return <><h3>{v.person.displayName}</h3><p>{v.organization.name}</p>{v.verifiedFacts.length===0?<div className="unknown"><strong>利用PC: 未確認</strong><p>確認済みの登録がありません。PCを持っていないという意味ではありません。</p></div>:v.verifiedFacts.map(f=><div key={f.relationId} className="fact"><strong>利用PC: {f.assetTag}</strong><p className="badge">確認済み</p><p>確認日時: {date(f.verifiedAt)}</p><details><summary>確認根拠と出典</summary><p>引き渡しの確認後に管理情報へ反映した記録です。</p><p>利用開始: {date(f.effectiveFrom)}</p><p>FACT / VERIFIED</p><p>Source Change: {f.sourceChangeId}</p></details></div>)}<p><a href={`#/people/${personId}`}>対象者の利用状況を開く</a></p></>;
}

type Controls={csrf:string;operator:Operator;revision:number;run:(fn:()=>Promise<void>)=>Promise<void>;busy:boolean};
function WorkCards({works,operator}:{works:Work[];operator:Operator}) {return <>{!works.length&&<p>該当する対応はありません。</p>}{works.map(w=><article key={w.id}><p className="eyebrow">{w.workOwnerOperatorId===operator.id?'あなたの担当':'他の担当者の対応'}</p><h3><a href={`#/work/${w.id}`}>{workTitle(w)}</a></h3><p>次にやること: {nextText(w)}</p></article>)}</>;}
function Home({csrf,operator,revision,run,busy,view='home'}:Controls&{view?:string}) {
  const {value:v,error}=useData<HomeView>('/api/home',revision);
  if(error)return <p role="alert">{error}</p>;if(!v)return <p>確認しています…</p>;
  if(view==='people') return <><h1>対象者</h1>{v.people.map(p=><article key={p.id}><a href={`#/people/${p.id}`}>{p.displayName}さんの利用状況</a></article>)}</>;
  if(view==='work') return <><h1>自分のやること</h1><WorkCards works={v.nextActions.filter(w=>w.workOwnerOperatorId===operator.id)} operator={operator}/><details><summary>チームの対応を見る</summary><WorkCards works={v.nextActions.filter(w=>w.workOwnerOperatorId!==operator.id)} operator={operator}/></details></>;
  return <><h1>{view==='join'?'入社対応':'今、進めること'}</h1><p>必要な準備を確認し、担当する対応を進めましょう。</p>{view==='home'&&<section><h2>あなたの次にやること</h2><WorkCards works={v.nextActions.filter(w=>w.workOwnerOperatorId===operator.id)} operator={operator}/></section>}
    <section className="card"><h2>入社予定を登録</h2><p>登録した後に必要な準備を確認します。この操作だけでPC準備は開始されません。</p><form onSubmit={e=>{e.preventDefault();const form=new FormData(e.currentTarget);void run(async()=>{
      const person=v.people.find(p=>p.id===form.get('personId'))!;
      const result=await api<{eventId:string}>('/api/join-events',csrf,{organizationId:person.organizationId,personId:person.id,serviceId:form.get('serviceId'),joinDate:form.get('joinDate')});location.hash=`/join/${result.eventId}`;
    });}}><label htmlFor="join-person">対象者</label><select id="join-person" name="personId" required>{v.people.map(p=><option key={p.id} value={p.id}>{p.displayName}</option>)}</select><label htmlFor="join-service">サービス</label><select id="join-service" name="serviceId" required>{v.services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><label>入社予定日<input name="joinDate" type="date" required/></label><button disabled={busy || !v.people.length || !v.services.length}>入社予定を登録</button></form></section>
    <section><h2>登録済みの入社予定</h2>{!v.events.length&&<p>まだ入社予定はありません。</p>}{v.events.map(e=><p key={e.id}><a href={`#/join/${e.id}`}>入社対応 / {e.joinDate}</a></p>)}</section></>;
}
function JoinPage({id,csrf,operator,revision,run,busy}:Controls&{id:string}) {
  const {value:v,error}=useData<JoinWorkspaceView>(`/api/join-events/${id}`,revision);
  if(error)return <p role="alert">{error}</p>;if(!v)return <p>確認しています…</p>;
  return <Layout title={`${v.personSummary.displayName}さんの入社対応`} context={<PersonFacts personId={v.personSummary.id} revision={revision}/>} timeline={v.recentTimeline} main={<>
    <p>入社予定日: {v.event.joinDate}</p><h2>PCの準備状況</h2><p data-testid="readiness">{v.readiness==='READY'?'利用PCは確認済みです':v.readiness==='NOT_REQUIRED'?'会社PCの対応は不要です':v.readiness==='DECISION_WAITING'?'必要性の判断待ちです':'利用PCは未確認です'}</p>
    <h2>必要な準備</h2>{!v.requirementEvaluations.length&&<><p>必要な準備はまだ確認していません。対応はまだ作成されていません。</p><p>サービス契約の条件と確認済みの利用PCを確認し、必要な場合だけPC準備を作成します。確認したあなたが最初の担当になります。</p><button disabled={busy} onClick={()=>void run(async()=>{await api(`/api/join-events/${id}/evaluate-requirements`,csrf,{});})}>必要な準備を確認</button></>}
    {v.requirementEvaluations.map(e=><article key={e.id}><h3>{resultLabels[e.result] ?? '必要な準備の詳細を確認してください'}</h3><p>{e.result==='REQUIRED'?'このサービス契約では会社PCが必要です。確認済みの利用PCがまだ登録されていないため、準備を行います。':e.result==='ALREADY_SATISFIED'?'確認済みの利用PCを再利用します。新しいPC準備は作成しません。':e.result==='NOT_APPLICABLE'?'契約条件により新しいPC準備は作成しません。':'サービスの担当窓口へ会社PCの必要性を確認してください。未確認のまま対応不要とは扱いません。'}</p><details><summary>判断の根拠・監査詳細</summary><p>{e.basisSummary}</p><pre>{JSON.stringify(e.basisSnapshot,null,2)}</pre></details></article>)}
    <h2>担当する対応</h2><WorkCards works={v.works} operator={operator}/>
  </>}/>;
}
function Guidance({v}:{v:WorkDetailView}) {
  const demo=v.work.contractProfileId===demoGuidance.contractId && v.why.basisSnapshot.contractProfileVersion===1;
  return <section aria-label="準備に必要な情報"><h2>必要な設定と手順</h2><p>会社PCの準備が必要です。根拠: この対応に適用されたサービス契約 v{v.why.basisSnapshot.contractProfileVersion}。</p>
    {demo?<><p className="notice">デモ用の参考手順です。実環境で承認された標準構成や設定済みの事実ではありません。</p><h3>必要な設定の確認</h3><ul>{demoGuidance.configurations.map(c=><li key={c}>{c}: <strong>適用要否・内容は未確認</strong></li>)}</ul>
      <h3>標準手順</h3><details><summary>入社PC準備の標準手順を見る</summary><p>{demoGuidance.source}</p><p>{demoGuidance.scope}</p><p>実環境の承認者・最終確認日: 未確認</p><ol>{demoGuidance.steps.map(s=><li key={s}>{s}</li>)}</ol><p>確認根拠: 実機の資産番号、対象者、実施内容、引き渡し日時、確認方法。パスワードや秘密情報は記録しないでください。</p><p>完了条件: 実際の準備と引き渡しを確認し、利用PCへ反映した内容が正しいこと。</p></details>
      <h3>困ったときの参考情報</h3><details><summary>資産番号が一致しないとき</summary><p>同梱デモナレッジ / demo-v1 — 手順を補助する参考情報です。</p><p>選択した候補と実機のラベルを照合してください。一致しない場合は反映を止め、候補を選び直します。記録済みなら反映内容を取り下げ、正しい実施内容を記録してください。</p></details>
    </>:<p className="unknown">適用する標準設定・手順: 未確認。このサービスの担当窓口に手順と必要条件を確認してください。</p>}
    <h3>今回の追加対応・未確認事項</h3><p>対象者固有の追加設定・VPN利用要否: 未確認</p><p>準備前に対象者とサービスの担当窓口へ、必要なアプリ・接続先・標準手順との差分を確認してください。判断がつかない場合は引き渡しの確認・反映を進めず、担当窓口に相談してください。</p>
  </section>;
}
function WorkPage({id,csrf,operator,revision,run,busy}:Controls&{id:string}) {
  const {value:v,error}=useData<WorkDetailView>(`/api/work/${id}`,revision),{value:devices,error:deviceError}=useData<Device[]>('/api/devices',revision);
  const [candidate,setCandidate]=useState(''),[replacement,setReplacement]=useState(false);
  if(error)return <p role="alert">{error}</p>;if(!v)return <p>確認しています…</p>;
  const active=v.changes.find(c=>c.status==='PROPOSED'||c.status==='VERIFIED');
  const canExecute=operator.roles.some(r=>v.authority.executeRoles.includes(r)) && operator.roles.some(r=>r==='ADMIN'||r==='OPERATOR');
  const canReview=operator.roles.some(r=>v.authority.reviewRoles.includes(r)) && operator.roles.some(r=>r==='ADMIN'||r==='REVIEWER');
  const action=active?v.actions.find(a=>a.id===active.actionId):undefined;
  const reviewAllowed=canReview && (v.authority.allowSelfReview || action?.actorOperatorId!==operator.id);
  const committed=v.changes.some(c=>c.status==='COMMITTED'),closed=v.work.status==='COMPLETED';
  const selected=devices?.find(d=>d.id===candidate);
  const whyMe=v.timeline.filter(e=>e.eventType==='WORK_OWNERSHIP_SET'&&e.metadataJson.workId===id).at(-1);
  const created=v.timeline.find(e=>e.eventType==='WORK_CREATED'&&e.metadataJson.workId===id);
  const selfTake=created?.sequence!==undefined && whyMe?.sequence!==undefined && Number(whyMe.sequence)===Number(created.sequence)+1 && whyMe?.actorOperatorId===v.work.workOwnerOperatorId && whyMe?.metadataJson.ownerId===v.work.workOwnerOperatorId && v.timeline.some(e=>e.eventType==='WORK_CREATED'&&e.metadataJson.workId===id&&e.actorOperatorId===v.work.workOwnerOperatorId);
  return <Layout title={`${v.recipient.displayName}さんのPC準備`} context={<><PersonFacts personId={v.recipient.id} revision={revision}/><h3>対象者の状況</h3><p>所属・勤務形態: 未確認</p><p>追加設定・VPN利用要否: 未確認</p><p>未確認の項目は、このPCの反映だけでは確認済みになりません。</p></>} timeline={v.timeline} main={<>
    <a href={`#/join/${v.work.sourceEventId}`}>入社対応へ戻る</a>
    <section className="ownership" aria-label="担当と依頼元"><p className="badge">{v.work.workOwnerOperatorId===operator.id?'あなたの担当です':'他の担当者が責任を持つ対応です'}</p><p>この対応の担当: {v.ownerName}</p><p>現在操作している人: {operator.displayName}</p><p>操作を行っても、この対応の担当は自動では変わりません。</p><p>依頼元: {v.recipient.displayName}さんの入社対応</p><p>担当になった理由: {selfTake?'必要な準備を確認した担当者として登録されています。':'未確認'}</p><p>期限: 未設定</p>
      {!closed&&v.work.workOwnerOperatorId!==operator.id&&<button className="secondary" disabled={busy || !operator.roles.some(r=>r==='ADMIN'||r==='OPERATOR')} onClick={()=>void run(async()=>{await api(`/api/work/${id}/take-ownership`,csrf,{});})}>この対応の担当を引き受ける</button>}
    </section>
    <section className="next-action"><p className="eyebrow">{closed?'完了':active?.status==='VERIFIED'?'管理情報へ反映':active?'引き渡し確認':committed?'完了前の確認':selected?'PCを準備':'必要設定・PC候補'}</p><h2>次にやること</h2><p className="next-title">{closed?'PC準備の対応は完了しました':selected&&!active&&!committed?`${selected.assetTag}を準備し、実際の引き渡しを記録する`:nextText(v.work)}</p><h3>なぜこの対応が必要？</h3><p>サービス契約で会社PCが必要と決まっています。必要な準備を確認した時点では、対象者の確認済み利用PCが未登録でした。</p><details><summary>判断の根拠・実行できる範囲</summary><p>{v.why.basisSummary}</p><p>{canExecute?'あなたは準備の実施内容を記録できます。':'実施内容の記録は権限のある担当者に依頼してください。'}</p><p>{reviewAllowed?'あなたは引き渡しの確認と管理情報への反映を行えます。':'引き渡しの確認・反映は権限のある別の確認担当者に依頼してください。'}</p><pre>{JSON.stringify(v.why.basisSnapshot,null,2)}</pre></details></section>
    <Guidance v={v}/>
    {!active&&!closed&&(!committed||replacement)&&<section aria-label="利用可能なPC候補"><h2>利用可能なPC候補</h2><p>候補に表示する理由: 管理情報では利用可能で、現在の利用者として登録されていません。実機の状態・標準構成・今回の必要条件への適合は未確認です。</p><p>選ぶだけでは利用PCとして登録されません。選択はこの画面だけに保持され、再読み込みすると解除されます。</p>{deviceError&&<p role="alert">候補を取得できませんでした。再読み込みしてください。</p>}{devices?.length===0&&<p>選べるPCがありません。端末の担当窓口に在庫と利用状況を確認してください。</p>}{devices?.map(d=><article key={d.id} className={candidate===d.id?'candidate selected':'candidate'}><h3>{d.assetTag}</h3><p>利用可能な候補 / 実機と構成は未確認</p><button className="secondary" disabled={busy||!canExecute} aria-pressed={candidate===d.id} onClick={()=>setCandidate(d.id)}>{d.assetTag}を準備対象にする</button></article>)}
      {selected&&<form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void run(async()=>{await api(`/api/work/${id}/actions/assign-device`,csrf,{deviceId:selected.id,executionSummary:f.get('executionSummary'),effectiveFrom:new Date(String(f.get('effectiveFrom'))).toISOString(),...(v.relevantFacts[0]?{replacesRelationId:v.relevantFacts[0].relationId}:{})});setCandidate('');setReplacement(false);});}}><h3>準備対象: {selected.assetTag}（まだ利用PCではありません）</h3><p>必要な設定と実機を確認して準備・引き渡しを行ってから、実施内容を記録してください。</p><label>準備・引き渡しの実施内容<textarea name="executionSummary" required maxLength={4000}/></label><label>実際の引き渡し日時<input name="effectiveFrom" type="datetime-local" required/></label><label className="attestation"><input type="checkbox" required/>{v.recipient.displayName}さんへ{selected.assetTag}を実際に引き渡しました{v.relevantFacts.length?'。現在の利用PCとの置換も確認しました':''}。</label><p className="consequence">この操作では実施記録と反映する内容を保存します。利用PCへの正式反映は、引き渡しの確認後に別の操作で行います。</p><button disabled={busy||!canExecute}>準備・引き渡しの実施内容を保存</button></form>}
    </section>}
    {committed&&!closed&&!active&&!replacement&&<button className="secondary" onClick={()=>setReplacement(true)}>別のPCで準備し直す</button>}
    {v.changes.map(change=><article key={change.id} aria-label="管理情報への反映内容" className={change.status==='COMMITTED'?'fact':'proposal'}><h2>{change.status==='PROPOSED'?'実際の引き渡しを確認':change.status==='VERIFIED'?'引き渡し確認済み・管理情報は未反映':change.status==='COMMITTED'?'利用PCを管理情報に反映しました':'取り下げた反映内容'}</h2><p>{v.recipient.displayName}さんの利用PCとして反映する内容: <strong>{change.device.assetTag}</strong></p><p>引き渡し日時: {date(change.proposedEffectJson.effectiveFrom)}</p><h3>確認根拠</h3>{change.evidence.map(e=><p key={e.id}>{e.contentText}</p>)}
      {change.status==='PROPOSED'&&<form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void run(async()=>{await api(`/api/changes/${change.id}/verify`,csrf,{verificationSummary:f.get('summary')});});}}><p className="consequence">実機の資産番号・対象者・実施記録を照合し、実際に引き渡したことを確認します。この操作ではまだ利用PCの管理情報は変わりません。</p><label>引き渡しを確認した方法・根拠<textarea name="summary" required maxLength={4000}/></label>{!reviewAllowed&&<p>権限のある確認担当者に確認を依頼してください。契約によっては実施者本人による確認はできません。</p>}<button disabled={busy||!reviewAllowed}>実際にPCを引き渡したことを確認</button></form>}
      {change.status==='VERIFIED'&&<><p className="consequence">この操作のあと、{change.device.assetTag}を{v.recipient.displayName}さんの現在の利用PCとして正式に記録します。実施内容の再入力は不要です。</p><button disabled={busy||!reviewAllowed} onClick={()=>void run(async()=>{await api(`/api/changes/${change.id}/commit`,csrf,{});})}>{change.device.assetTag}を利用PCとして管理情報に反映</button></>}
      {change.status==='COMMITTED'&&<><p>確認した利用PCが対象者の利用状況にも反映されました。別の台帳への再入力は不要です。</p><p>追加設定・VPN利用要否は引き続き未確認です。この対応で記録したのは利用PCの確認結果です。</p></>}
      {['PROPOSED','VERIFIED'].includes(change.status)&&<details><summary>実施内容が違う・引き渡しを確認できない場合</summary><p>反映を止め、理由を残して取り下げます。その後、正しい準備・引き渡しの内容を記録し直せます。</p><form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void run(async()=>{await api(`/api/changes/${change.id}/reject`,csrf,{reason:f.get('reason')});});}}><label>取り下げる理由<textarea name="reason" required maxLength={4000}/></label><button className="secondary" disabled={busy||!reviewAllowed}>反映内容を取り下げる</button></form></details>}
      <details><summary>監査用の詳細</summary><p>{change.status} / Change: {change.id}</p><p>実施した人: {v.actions.find(a=>a.id===change.actionId)?.actorOperatorId===operator.id?operator.displayName:'別の担当者'}</p><pre>{JSON.stringify(change.proposedEffectJson,null,2)}</pre></details>
    </article>)}
    {!closed&&<section><p>確認した利用PCを反映した後、このPC準備の対応を完了します。完了操作だけで利用PCを変更することはありません。</p><button disabled={busy||!!active||!committed||!operator.roles.some(r=>r==='ADMIN'||r==='OPERATOR')} onClick={()=>void run(async()=>{await api(`/api/work/${id}/complete`,csrf,{outcome:'COMPLETED'});})}>PC準備の対応を完了</button></section>}
  </>}/>;
}
function PersonPage({id,revision}:Controls&{id:string}) {
  const {value:v,error}=useData<PersonContextView>(`/api/people/${id}/context`,revision);
  if(error)return <p role="alert">{error}</p>;if(!v)return <p>確認しています…</p>;
  return <Layout title={`${v.person.displayName}さんの利用状況`} context={<PersonFacts personId={id} revision={revision}/>} timeline={v.timeline} main={<><h2>対応中のやること</h2>{!v.openWork.length&&<p>対応中のPC準備はありません。</p>}{v.openWork.map(w=><p key={w.id}><a href={`#/work/${w.id}`}>{workTitle(w)}</a></p>)}<h2>利用PCの履歴</h2>{!v.relationHistory.length&&<p>確認済みの履歴はまだありません。</p>}{v.relationHistory.map(r=><article key={r.id}><p>{r.status==='ACTIVE'?'現在の利用記録':'以前の利用記録'}: {date(r.effectiveFrom)} → {r.effectiveTo?date(r.effectiveTo):'現在'}</p><details><summary>確認根拠・監査詳細</summary><p>確認日時: {date(r.verifiedAt)}</p><p>Source Change: {r.sourceChangeId}</p></details></article>)}</>}/>;
}
export function JoinUI({csrf,operator}:{csrf:string;operator:Operator}) {
  const [route,setRoute]=useState(location.hash.slice(1)||'/'),[revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{const change=()=>{setRoute(location.hash.slice(1)||'/');setError('');};window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change);},[]);
  async function run(fn:()=>Promise<void>) {if(busy)return;setBusy(true);setError('');try{await fn();setRevision(n=>n+1);}catch(e){setError(e instanceof Error?e.message:'処理を完了できませんでした。');}finally{setBusy(false);}}
  const props={csrf,operator,revision,run,busy},[,kind,id]=route.split('/');
  return <div className="app-shell"><nav aria-label="メインナビゲーション"><strong>FACTACT</strong><p>今わかることから、次の一歩へ。</p>{[['','ホーム'],['work','自分のやること'],['join','入社対応'],['people','対象者']].map(([path,label])=><a key={path} href={`#/${path}`} aria-current={(kind??'')===path?'page':undefined}>{label}</a>)}</nav><div className="page-content">{error&&<p role="alert">{error}</p>}{busy&&<p role="status">処理しています…</p>}{kind==='join'&&id?<JoinPage key={route} {...props} id={id}/>:kind==='work'&&id?<WorkPage key={route} {...props} id={id}/>:kind==='people'&&id?<PersonPage key={route} {...props} id={id}/>:<Home key={route} {...props} view={kind||'home'}/>}</div></div>;
}
