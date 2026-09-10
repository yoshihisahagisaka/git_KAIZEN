import {useEffect,useRef,useState,type ReactNode} from 'react';
import type {SupportDetailView} from '../../../../packages/application/src/support-queries.js';
import type {PersonContextView,WorkDetailView} from '../../../../packages/application/src/join-queries.js';
import {useRead} from './support-ui.js';
import {Notes} from './support-wizard.js';

const time=(s:string)=>new Date(s).toLocaleString('ja-JP');
// Native modal: keeps the Work mounted, traps focus, supports Escape and restores focus.
export function ContextDialog({title,children}:{title:string;children:ReactNode}){
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const [open,setOpen]=useState(false);
 useEffect(()=>{if(open)dialog.current?.showModal();},[open]);
 return <><button type="button" className="secondary" ref={trigger} onClick={()=>setOpen(true)}>{title}</button>{open&&<dialog className="context-dialog" aria-label={title} ref={dialog} onClose={()=>{setOpen(false);trigger.current?.focus();}}><header><h2>{title}</h2><button type="button" onClick={()=>dialog.current?.close()}>閉じる</button></header>{children}</dialog>}</>;
}
export function DemoProcedure(){return <ContextDialog title="デモ用参考手順を見る"><p>デモ用参考手順です。実運用で承認された手順ではありません。</p><ol><li>確認済みのPCは参照し、聞き直さない。</li><li>VPN利用対象・症状など、まだ不明な点を必要に応じて確認する。</li><li>実際に行った確認・案内を選択する。</li><li>結果と確認元を記録する。未確認は「なし」にしない。</li></ol><details><summary>参考手順の出典</summary><p>同梱デモ / support-demo-v2</p></details></ContextDialog>;}

export function SupportAudit({view:v}:{view:SupportDetailView}){return <details className="audit-detail"><summary>監査用の詳細</summary><p>Event: {v.event.id}</p><p>Contract Profile: {v.event.contractProfileId}</p>{v.decision&&<><p>元の確認根拠: {v.evidence?.contentText}</p><p>元の実施記録: {v.action?.resultSummary}</p><p>Evidence: {v.decision.evidenceId} / Action: {v.decision.actionId}</p></>}<pre>{JSON.stringify({evaluation:v.evaluation,records:v.records},null,2)}</pre><ol>{v.timeline.map(e=><li key={e.id}>{time(e.occurredAt)} {e.eventType}<pre>{JSON.stringify(e.metadataJson,null,2)}</pre></li>)}</ol></details>;}
export function SupportHistory({view:v}:{view:SupportDetailView}){return <section aria-label="問い合わせの対応履歴"><h2>対応履歴</h2><p>対象者: {v.person.displayName} / 問い合わせの確認・案内</p><ol><li>{time(v.event.createdAt)} 問い合わせを受付 — 本人の申告: {v.observation.contentText}</li>{v.evaluation&&<li>{time(v.evaluation.evaluatedAt)} {v.work?'必要な対応を確認し、担当を決定':'対応しない理由を記録'}{!v.work&&<p>{v.evaluation.basisSummary}</p>}</li>}</ol>{v.records.map(r=><details key={r.id}><summary>{time(r.recordedAt)} — {r.kind==='DRAFT'?'下書き保存':r.kind==='CORRECTION'?'訂正を追加':'対応完了'} / {v.recordAuthors.find(a=>a.id===r.recordedByOperatorId)?.displayName??'記録担当者（現在の表示名は未確認）'}</summary><Notes notes={r.notes}/>{r.correctionReason&&<p>訂正理由: {r.correctionReason}</p>}</details>)}{v.decision&&!v.records.some(r=>r.kind!=='DRAFT')&&<><p>確認したこと: {v.evidence?.contentText}</p><p>行ったこと: {v.action?.resultSummary}</p><p>{v.work?.status==='COMPLETED'?'対応完了':'対応中'}</p></>}</section>;}

function PersonContext({id,revision}:{id:string;revision:number}){
 const {data:v,error}=useRead<PersonContextView>(`/api/people/${id}/context`,revision);
 if(error)return <p role="alert">参照情報を取得できませんでした。閉じて開き直してください。</p>;if(!v)return <p>確認しています…</p>;
 const labels:Record<string,string>={JOIN_EVENT_CREATED:'入社予定を登録',REQUIREMENT_EVALUATED:'必要な準備を確認',WORK_CREATED:'PC準備を作成',WORK_OWNERSHIP_SET:'PC準備の担当を決定',ACTION_COMPLETED:'PC準備を実施',CHANGE_PROPOSED:'利用PCの反映内容を作成',CHANGE_VERIFIED:'引き渡しを確認',CHANGE_COMMITTED:'利用PCを管理情報へ反映',WORK_COMPLETED:'PC準備を完了'};
 return <><h3>{v.person.displayName}</h3><p>{v.organization.name}</p>{v.verifiedFacts.map(f=><p className="fact" key={f.relationId}>利用PC: {f.assetTag} — 確認済み / {time(f.verifiedAt)}</p>)}{v.unknowns.map(x=><p key={x}>{x}</p>)}<h3>対象者の対応履歴</h3><ol>{v.timeline.map(e=><li key={e.id}>{time(e.occurredAt)} — {labels[e.eventType]??'PC準備に関する記録'}</li>)}</ol><h3>対応中の準備</h3>{v.openWork.map(w=><p key={w.id}>{w.title} / 次にやること: {w.nextAction}</p>)}<details className="audit-detail"><summary>監査用の詳細</summary><pre>{JSON.stringify({relations:v.relationHistory,changes:v.recentChanges,timeline:v.timeline},null,2)}</pre></details></>;
}
function JoinSource({id,revision}:{id:string;revision:number}){
 const {data:v,error}=useRead<WorkDetailView>(`/api/work/${id}`,revision);
 if(error)return <p role="alert">参照情報を取得できませんでした。閉じて開き直してください。</p>;if(!v)return <p>確認しています…</p>;
 return <><h3>{v.recipient.displayName}さんのPC準備</h3><p>担当: {v.ownerName}</p><p>{v.work.status==='COMPLETED'?'対応完了':'対応中'}</p>{v.actions.map(a=><p key={a.id}>{time(a.completedAt??a.startedAt)} 実施内容: {a.resultSummary}</p>)}{v.changes.map(c=><article key={c.id}><p>{c.device.assetTag} / {c.status==='COMMITTED'?'管理情報へ反映済み':c.status==='VERIFIED'?'引き渡し確認済み':'反映前の内容'}</p>{c.evidence.map(e=><p key={e.id}>{e.contentText}</p>)}</article>)}<details className="audit-detail"><summary>監査用の詳細</summary><pre>{JSON.stringify(v,null,2)}</pre></details></>;
}
function PreviousSupport({id,revision}:{id:string;revision:number}){
 const {data:v,error}=useRead<SupportDetailView>(`/api/support/${id}`,revision);
 if(error)return <p role="alert">参照情報を取得できませんでした。閉じて開き直してください。</p>;if(!v)return <p>確認しています…</p>;
 return <><SupportHistory view={v}/><SupportAudit view={v}/></>;
}
export function SupportContext({view:v,revision}:{view:SupportDetailView;revision:number}){return <aside aria-label="確認済みの現在の利用状況"><h2>判断のための参照情報</h2><article className="notice" aria-label="本人からの申告"><h3>本人からの申告</h3><p>{v.observation.contentText}</p><p>本人から聞いた内容です。技術的な障害として確認済みではありません。</p></article>{v.deviceFact?<div className="fact"><h3>利用PC: {v.deviceFact.device.assetTag}</h3><p>確認済み</p><p>入社PC準備の情報を参照しています。再入力は不要です。</p></div>:<p className="unknown">利用PC: 未確認</p>}
 <ContextDialog title="対象者の現在の利用状況"><PersonContext id={v.person.id} revision={revision}/></ContextDialog>
 {v.deviceFact&&<ContextDialog title="利用PCの確認元"><JoinSource id={v.deviceFact.sourceChange.workId} revision={revision}/></ContextDialog>}
 <details><summary>未確認の管理情報</summary><ul>{v.unknowns.map(x=><li key={x}>{x}: 未確認</li>)}</ul><p>未確認は「なし」ではありません。今回の確認記録は管理情報を自動変更しません。</p></details>
 <ContextDialog title="過去の関連する対応"><section aria-label="過去の関連する対応"><p>同じ人・同じサービスの完了した対応です。今回の原因や推奨対応を意味しません。</p>{!v.previousWork.length&&<p>該当する対応はまだありません。</p>}{v.previousWork.map(h=><article key={h.work.id}><h3>{time(h.work.closedAt!)} — {v.person.displayName}さんの問い合わせ</h3><p>本人の申告: {h.observation?.contentText}</p>{h.record?<Notes notes={h.record.notes}/>:<><p>行ったこと: {h.action?.resultSummary}</p><p>確認・結果の記録: {h.evidence?.contentText}</p></>}{h.record?.kind==='CORRECTION'&&<p>訂正後の記録</p>}<details><summary>対応の詳しい履歴と監査</summary><PreviousSupport id={h.eventId} revision={revision}/></details></article>)}</section></ContextDialog>
 <ContextDialog title="参考知識を見る"><p>参考候補です。承認済みの手順・ルールではありません。</p>{!v.relatedKnowledge.length&&<p>このサービスの候補はまだありません。</p>}{v.relatedKnowledge.map(k=><article key={k.id}><h3>{k.title}</h3><p>参考知識の候補 / 未承認 — 適用ルールではありません</p><p>{k.contentText}</p><details className="audit-detail"><summary>元の対応・確認根拠</summary><p>Work: {k.sourceWorkId}</p><p>Evidence: {k.sourceEvidenceId}</p><p>Decision: {k.sourceDecisionId}</p></details></article>)}</ContextDialog>
 </aside>;}
