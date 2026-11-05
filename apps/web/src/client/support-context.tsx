import {useEffect,useRef,useState,type ReactNode} from 'react';
import type {SupportDetailView} from '../../../../packages/application/src/support-queries.js';
import type {PersonContextView,WorkDetailView} from '../../../../packages/application/src/join-queries.js';
import {useRead} from './support-ui.js';
import {Notes} from './support-wizard.js';
import {isLegacySupportRecord} from '../../../../packages/domain/src/support.js';

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
export function SupportHistory({view:v}:{view:SupportDetailView}){const [oldestFirst,setOldestFirst]=useState(false),items=oldestFirst?[...v.businessHistory].reverse():v.businessHistory;return <section aria-label="問い合わせの対応履歴" className="business-history"><div className="section-heading"><div><h2>対応履歴</h2><p>対応、回答・対応待ち、次回確認予定、対象確認、対応終了を時系列で表示します。</p></div><label className="history-order">表示順<select aria-label="対応履歴の表示順" value={oldestFirst?'oldest':'newest'} onChange={e=>setOldestFirst(e.target.value==='oldest')}><option value="newest">新しい順</option><option value="oldest">古い順</option></select></label></div><ol>{items.map(item=><li key={`${item.kind}-${item.id}`}><div><strong>{item.summary}</strong><time>{time(item.occurredAt)}</time></div><p>{item.detail}</p><p className="history-meta">担当者: {item.actorName??'現在の表示名は未確認'} / 情報源: {item.source}</p></li>)}</ol></section>;}

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
function AssistSearch({view:v}:{view:SupportDetailView}){
 const [text,setText]=useState(''),[searched,setSearched]=useState(''),[error,setError]=useState('');
 const matches=(value:string|undefined|null)=>value?.normalize('NFKC').toLocaleLowerCase().includes(searched)??false;
 const knowledge=searched?v.relatedKnowledge.filter(k=>matches(k.title)||matches(k.contentText)||matches(k.topic)):[];
 const previous=searched?v.previousWork.filter(h=>matches(h.work.title)||matches(h.observation?.contentText)||matches(h.action?.resultSummary)||matches(h.evidence?.contentText)||(h.record?.kind==='RESPONSE'&&matches(h.record.notes.responseText))):[];
 return <ContextDialog title="参考情報を検索">
  <p>このサービスの参考知識候補と、同じ方・同じサービスの過去対応を検索します。正式な手順書・FAQはまだ検索対象ではありません。</p>
  <form onSubmit={e=>{e.preventDefault();const next=text.trim().normalize('NFKC').toLocaleLowerCase();if(!next){setSearched('');setError('検索語を入力してください。');return;}setError('');setSearched(next);}}>
   <label htmlFor="support-assist-search">検索語</label><input id="support-assist-search" value={text} onChange={e=>setText(e.target.value)} maxLength={200} placeholder="例: VPN、接続できない"/>
   <button type="submit">検索</button>
  </form>
  {error&&<p role="alert">{error}</p>}
  {searched&&<section aria-label="参考情報の検索結果">
   <h3>検索結果</h3><p>{knowledge.length+previous.length}件（参考知識候補 {knowledge.length}件・過去対応 {previous.length}件）</p>
   {!knowledge.length&&!previous.length&&<p>該当する情報は見つかりませんでした。対象範囲以外は「情報を探す」から全体検索できます。</p>}
   {knowledge.map(k=><article key={`knowledge-${k.id}`}><h4>{k.title}</h4><p className="badge">未承認の参考知識候補</p><p>{k.contentText}</p><details><summary>出典を確認</summary><p>Work: {k.sourceWorkId}</p><p>Evidence: {k.sourceEvidenceId}</p><p>Decision: {k.sourceDecisionId}</p></details></article>)}
   {previous.map(h=><article key={`work-${h.work.id}`}><h4>{h.work.title}</h4><p className="badge">同じ方・同じサービスの過去対応</p><p>{h.observation?.contentText}</p>{h.record?.kind==='RESPONSE'&&<p>対応内容: {h.record.notes.responseText}</p>}{h.action&&<p>実施結果: {h.action.resultSummary}</p>}<small>対応終了: {time(h.work.closedAt!)}</small></article>)}
  </section>}
 </ContextDialog>;
}
function SupportContextContent({v,revision,target}:{v:SupportDetailView;revision:number;target?:ReactNode}){
 const comparisonLabel={MATCH:'一致',DIFFERENT:'異なる',UNCONFIRMED:'未確認'}[v.deviceComparison.result];
 const sourceLabel=v.deviceComparison.target?.source==='CALLER'?'本人からの申告':v.deviceComparison.target?.source==='OPERATOR'?'担当者が確認':'その他の確認元';
 const targetSource=v.currentDeviceContext?.confirmationSource==='CALLER'?'本人からの申告':v.currentDeviceContext?.confirmationSource==='OPERATOR'?'担当者が確認':'その他の確認元';
 return <>
  <section className="support-assist-group" aria-label="確認事項・登録情報">
   <h3>確認事項・登録情報</h3>
   <ContextDialog title="対象者の現在の利用状況"><PersonContext id={v.person.id} revision={revision}/></ContextDialog>
   <section className="device-comparison" aria-label="登録情報と今回の問合せ対象">
    <h4>登録PCと今回の対象</h4>
    <div className="device-comparison-grid">
     <div><span>登録情報</span><strong>{v.deviceComparison.registry?.assetTag??'未確認'}</strong><small>{v.deviceComparison.registry?`Registry / ${time(v.deviceComparison.registry.verifiedAt)}`:'登録済みの確認情報はありません'}</small></div>
     <div><span>今回の問合せ対象</span><strong>{v.deviceComparison.target?.assetTag??(v.deviceComparison.targetUnidentified?'未特定として記録':'未確認（未記録）')}</strong><small>{v.deviceComparison.target?`${sourceLabel} / ${time(v.deviceComparison.target.recordedAt)}`:v.deviceComparison.targetUnidentified&&v.currentDeviceContext?`${targetSource} / ${time(v.currentDeviceContext.recordedAt)}`:'今回の対象として有効な記録はありません'}</small></div>
     <div><span>比較</span><strong className={`comparison-${v.deviceComparison.result.toLowerCase()}`}>{comparisonLabel}</strong><small>端末IDの照合結果</small></div>
    </div>
    {v.deviceComparison.result==='DIFFERENT'&&<p className="notice">登録情報では【{v.deviceComparison.registry!.assetTag}】ですが、今回の対象は【{v.deviceComparison.target!.assetTag}】です。会社から貸与されているPCでお間違いないですか。最近交換・一時借用などはありましたか？</p>}
    <p className="comparison-note">登録情報と今回の対象を比較しています。変更は明示的な記録操作で行います。</p>
   </section>
   {target}
   {v.deviceFact&&<ContextDialog title="利用PCの確認元"><JoinSource id={v.deviceFact.sourceChange.workId} revision={revision}/></ContextDialog>}
   <details><summary>未確認の管理情報</summary><ul>{v.unknowns.map(x=><li key={x}>{x}: 未確認</li>)}</ul><p>未確認は「なし」ではありません。今回の確認記録は管理情報を自動変更しません。</p></details>
  </section>
  <section className="support-assist-group" aria-label="手順・ナレッジ">
   <h3>手順・ナレッジ</h3>
   <p>参考知識は未承認の候補です。正式な手順書・FAQの検索は今後の拡張対象です。</p>
   <AssistSearch view={v}/>
   <ContextDialog title="参考知識を見る"><p>参考候補です。承認済みの手順・ルールではありません。</p>{!v.relatedKnowledge.length&&<p>このサービスの候補はまだありません。</p>}{v.relatedKnowledge.map(k=><article key={k.id}><h3>{k.title}</h3><p>参考知識の候補 / 未承認 — 適用ルールではありません</p><p>{k.contentText}</p><details className="audit-detail"><summary>元の対応・確認根拠</summary><p>Work: {k.sourceWorkId}</p><p>Evidence: {k.sourceEvidenceId}</p><p>Decision: {k.sourceDecisionId}</p></details></article>)}</ContextDialog>
   <p><a href="#/explore">情報を探す</a></p>
  </section>
  <section className="support-assist-group" aria-label="過去の対応">
   <h3>過去の対応</h3>
   <ContextDialog title="過去の関連する対応"><section aria-label="過去の関連する対応"><p>同じ人・同じサービスの完了した対応です。今回の原因や推奨対応を意味しません。</p>{!v.previousWork.length&&<p>該当する対応はまだありません。</p>}{v.previousWork.map(h=><article key={h.work.id}><h3>{time(h.work.closedAt!)} — {v.person.displayName}さんの問い合わせ</h3><p>本人の申告: {h.observation?.contentText}</p>{h.record?.kind==='RESPONSE'?<p>対応内容: {h.record.notes.responseText} / 状態: {h.record.notes.disposition}</p>:h.record&&isLegacySupportRecord(h.record)?<Notes notes={h.record.notes}/>:<><p>行ったこと: {h.action?.resultSummary}</p><p>確認・結果の記録: {h.evidence?.contentText}</p></>}{h.record?.kind==='CORRECTION'&&<p>訂正後の記録</p>}<details><summary>対応の詳しい履歴と監査</summary><PreviousSupport id={h.eventId} revision={revision}/></details></article>)}</section></ContextDialog>
  </section>
 </>;
}
export function SupportContext({view:v,revision,target}:{view:SupportDetailView;revision:number;target?:ReactNode}){return <><aside className="support-context-desktop" aria-label="対応アシスト"><h2>対応アシスト</h2><SupportContextContent v={v} revision={revision} target={target}/></aside><div className="support-context-mobile"><ContextDialog title="対応アシスト"><SupportContextContent v={v} revision={revision} target={target}/></ContextDialog></div></>;}
