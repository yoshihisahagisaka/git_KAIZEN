import {SupportDetail} from './support-wizard.js';
import {useEffect,useState} from 'react';
import type {Operator} from '../../../../packages/domain/src/operator.js';
import type {SupportListView,SupportDetailView,SupportResponsibilityItem,SupportResponsibilityReason,SupportResponsibilityView} from '../../../../packages/application/src/support-queries.js';
import {api} from './api.js';
export type Props={csrf:string;operator:Operator;revision:number;busy:boolean;run:(fn:()=>Promise<void>)=>Promise<void>;id?:string;candidateDeviceId?:string|undefined;candidateDeviceLabel?:string|undefined;onActiveTitle?:(title:string)=>void;onDirtyChange?:(dirty:boolean)=>void};
export function useRead<T>(url:string,revision:number){const [data,setData]=useState<T|null>(null),[error,setError]=useState('');useEffect(()=>{let active=true;api<T>(url).then(x=>{if(active){setData(x);setError('');}}).catch(()=>{if(active)setError('問い合わせ情報を取得できませんでした。再読み込みしてください。');});return()=>{active=false;};},[url,revision]);return{data,error};}
export function SupportTasks({operator,revision}:{operator:Operator;revision:number}){const {data}=useRead<SupportListView>('/api/support',revision);return <>{data?.inquiries.filter(x=>x.work&&x.work.status!=='COMPLETED'&&x.work.workOwnerOperatorId===operator.id).map(x=><article key={x.event.id}><p>あなたの担当 / 問い合わせ</p><a href={`#/support/${x.event.id}`}>{x.person.displayName}さんの問い合わせ</a><p>次にやること: {x.work?.nextAction}</p></article>)}</>;}
const reasonLabel:Record<SupportResponsibilityReason,string>={FOLLOW_UP_REACHED:'次回確認予定の時刻になっています',WAITING_FOLLOW_UP_UNSET:'回答・対応待ちですが次回確認予定が未設定です',WAITING_NEXT_ACTION_MISSING:'回答・対応待ちですが次にやることが未確認です',OWNER_UNAVAILABLE:'担当者の確認が必要です'};
function ResponsibilityRows({items}:{items:SupportResponsibilityItem[]}){return <>{!items.length&&<p>該当する対応はありません。</p>}{items.map(x=><article key={x.workId}><p className="eyebrow">{x.serviceName}</p><h3><a href={`#/support/${x.supportEventId}`}>{x.personName}さんの問い合わせ</a></h3><p>担当者: {x.ownerName??'確認が必要です'}</p><p>次にやること: {x.nextAction||'未確認'}</p>{x.waiting&&<p>{x.waitingParty&&x.waitingReason?`回答・対応待ち: ${x.waitingParty} — ${x.waitingReason}`:'回答・対応待ち（相手・理由は未指定）'}</p>}<p>次回確認予定: {x.followUpAt?new Date(x.followUpAt).toLocaleString('ja-JP'):'未設定'}</p>{x.reasons.length>0&&<ul>{x.reasons.map(r=><li key={r}>{reasonLabel[r]}</li>)}</ul>}</article>)}</>;}
export function ResponsibilityManagement({revision}:{revision:number}){const {data:v,error}=useRead<SupportResponsibilityView>('/api/support-responsibility',revision);if(error)return <p role="alert">{error}</p>;if(!v)return <p>確認しています…</p>;return <><h1>対応管理</h1><section aria-labelledby="my-work"><h2 id="my-work">自分の対応</h2><ResponsibilityRows items={v.myWork}/></section><section aria-labelledby="waiting-work"><h2 id="waiting-work">回答・対応待ち</h2><ResponsibilityRows items={v.waiting}/></section><section aria-labelledby="follow-up-work"><h2 id="follow-up-work">フォローが必要</h2><ResponsibilityRows items={v.needsFollowUp}/></section><section aria-labelledby="owner-gap"><h2 id="owner-gap">担当確認が必要</h2><ResponsibilityRows items={v.ownerGap}/></section></>;}
export const auditLabels:Record<string,string>={SUPPORT_RECEIVED:'問い合わせを受付',SUPPORT_EVALUATED:'対応の必要性と担当を確認',SUPPORT_GUIDANCE_RECORDED:'確認・判断・案内の実施を記録',SUPPORT_KNOWLEDGE_SAVED:'次の対応への参考知識を保存',SUPPORT_COMPLETED:'問い合わせ対応を完了'};
export function SupportUI(props:Props){return props.id?<SupportDetail key={props.id} {...props} id={props.id}/>:<SupportList {...props}/>;}
function SupportList({csrf,operator,revision,busy,run}:Props){
 const {data:v,error}=useRead<SupportListView>('/api/support',revision),[requestId]=useState(()=>crypto.randomUUID());
 const [chosenService,setChosenService]=useState(''),[chosenOrg,setChosenOrg]=useState(''),[chosenPerson,setChosenPerson]=useState('');
 if(error)return <p role="alert">{error}</p>;if(!v)return <p>確認しています…</p>;
 const service=v.services.find(s=>s.id===chosenService)??v.services[0];
 const organizations=v.organizations;
 const orgId=chosenOrg||organizations[0]?.id||'NEW';
 const people=v.people.filter(p=>p.organizationId===orgId);
 const personId=chosenPerson||people[0]?.id||'NEW';
 const canExecute=operator.roles.some(r=>r==='ADMIN'||r==='OPERATOR');
 return <><h1>問い合わせ対応</h1><section className="card"><h2>問い合わせを受け付ける</h2>
 <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget),submitter=(e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement|null,start=submitter?.value!=='RECEIVE_ONLY';
  const organizationId=String(f.get('organizationId')??'');const selectedPerson=String(f.get('personId')??'');
  const caller=selectedPerson==='NEW'?{kind:'NEW',...(organizationId==='NEW'?{organizationName:f.get('newOrganizationName')}:{organizationId}),displayName:f.get('newPersonName'),email:f.get('newPersonEmail')||undefined,distinctPersonConfirmed:!!f.get('distinctPersonConfirmed')}:{kind:'EXISTING',personId:selectedPerson};
  void run(async()=>{const event=await api<{id:string}>('/api/support',csrf,{requestId,caller,serviceId:f.get('serviceId'),symptom:f.get('symptom')});try{if(start)await api(`/api/support/${event.id}/evaluate`,csrf,{decision:'REQUIRED'});}finally{location.hash=`/support/${event.id}`;}});
 }}>
 <label htmlFor="support-service">対応サービス</label><select id="support-service" name="serviceId" value={service?.id??''} onChange={e=>{setChosenService(e.target.value);setChosenOrg('');setChosenPerson('');}}>{v.services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
 <label htmlFor="support-org">所属・企業</label><select id="support-org" name="organizationId" value={orgId} onChange={e=>{setChosenOrg(e.target.value);setChosenPerson('');}}>{organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}<option value="NEW">＋ 新しい所属・企業</option></select>
 {orgId==='NEW'&&<label>新しい所属・企業名<input name="newOrganizationName" required maxLength={200}/></label>}
 <label htmlFor="support-person">問い合わせ元</label><select id="support-person" name="personId" value={orgId==='NEW'?'NEW':personId} onChange={e=>setChosenPerson(e.target.value)}>{orgId!=='NEW'&&people.map(p=><option key={p.id} value={p.id}>{p.displayName}</option>)}<option value="NEW">＋ 初めての問い合わせ者</option></select>
 {(orgId==='NEW'||personId==='NEW')&&<><label>問い合わせ者のお名前<input name="newPersonName" required maxLength={200}/></label><label>メール（任意）<input name="newPersonEmail" type="email" maxLength={320}/></label><label><input type="checkbox" name="distinctPersonConfirmed"/>同じ所属の同名登録を確認し、別人の場合は新規登録する</label><p>新規登録は次回から再利用できます。所属・本人確認やプラン加入を証明するものではありません。</p></>}
 <p>社員・会員・ベンダーなど、どなたからの問い合わせも同じ画面で受け付けます。所属がリストになければ新規入力できます。</p>
 <label>問い合わせ内容<textarea name="symptom" required maxLength={4000} placeholder="入電時に伝えられた内容を、そのまま記録してください"/></label><p>受付時の申告は未検証の内容として記録します。</p>
 <div className="form-actions"><button type="submit" value="RECEIVE_ONLY" className="secondary" disabled={busy||!service||!canExecute}>受付のみ</button><button type="submit" value="START" disabled={busy||!service||!canExecute}>受付して対応を開始</button></div></form></section>
 <h2>受け付けた問い合わせ</h2>{v.inquiries.map(x=><article key={x.event.id}><a href={`#/support/${x.event.id}`}>{x.person.displayName}さんの問い合わせ</a><p>{x.work?x.work.status==='COMPLETED'?'対応完了':x.work.workOwnerOperatorId===operator.id?'あなたの担当です':'担当者あり':'対応の必要性を未確認'}</p></article>)}
 </>;
}
