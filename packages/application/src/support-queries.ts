import type {Operator} from '../../domain/src/operator.js';
import {assertRole,found} from '../../domain/src/join.js';
import type {SupportRepository,SupportUnitOfWork} from './support-ports.js';
import {isLegacySupportRecord,supportActionLabels,supportResultLabels} from '../../domain/src/support.js';
export type SupportResponsibilityReason='FOLLOW_UP_REACHED'|'WAITING_FOLLOW_UP_UNSET'|'WAITING_NEXT_ACTION_MISSING'|'OWNER_UNAVAILABLE';
export type SupportBusinessHistoryKind='INQUIRY_RECEIVED'|'WORK_STARTED'|'RESPONSE_RECORDED'|'RECORD_ADDED'|'RECORD_CORRECTED'|'WAITING_SET'|'RESUMED'|'REOPENED'|'NEXT_ACTION_CLEARED'|'FOLLOW_UP_SET'|'FOLLOW_UP_CLEARED'|'TARGET_CONFIRMED'|'TARGET_CORRECTED'|'TARGET_UNIDENTIFIED'|'TARGET_ENDED'|'TARGET_OBSERVED'|'WORK_CLOSED';
export interface SupportBusinessHistoryItem {id:string;kind:SupportBusinessHistoryKind;occurredAt:string;actorOperatorId:string;actorName:string|null;summary:string;detail:string;source:string}
export interface SupportResponsibilityItem {
 workId:string;supportEventId:string;title:string;personName:string;serviceName:string;ownerId:string;ownerName:string|null;ownerStatus:'ACTIVE'|'INACTIVE'|null;
 nextAction:string;waiting:boolean;waitingParty:string|null;waitingReason:string|null;followUpAt:string|null;reasons:SupportResponsibilityReason[];
 facts:{followUpReached:boolean;followUpUnset:boolean;nextActionMissing:boolean;ownerUnavailable:boolean;clock:string};
}
export class SupportQueries {
 constructor(private uow:SupportUnitOfWork,private clock:{now():string}={now:()=>new Date().toISOString()}){}
 private run<T>(a:Operator,fn:(r:SupportRepository)=>Promise<T>){return this.uow.run(a.tenantId,async r=>{assertRole(found(await r.core.operator(a.id)),['ADMIN','OPERATOR','REVIEWER']);return fn(r);},true);}
 list(a:Operator){return this.run(a,async r=>{
  const now=new Date().toISOString();
  const services=[];
  for(const service of await r.core.services()) {
    const contracts=await r.core.effectiveContracts(service.id,now);
    if(contracts.length===1&&contracts[0]?.configurationJson.support?.enabled) services.push(service);
  }
  return {people:await r.core.people(),services,inquiries:await Promise.all((await r.events()).map(async e=>({event:e,person:found(await r.core.recipientPerson(e.serviceRecipientId)),work:await r.workForEvent(e.id)})))};
 });}
 responsibility(a:Operator){return this.run(a,async r=>{
  const clock=this.clock.now(),at=Date.parse(clock);
  const all:SupportResponsibilityItem[]=(await r.managementRows()).map(row=>{
   const w=row,followUpReached=!!w.followUpAt&&Date.parse(w.followUpAt)<=at;
   const followUpUnset=w.waiting&&!w.followUpAt,nextActionMissing=w.waiting&&(!w.nextActionOpen||!w.nextAction.trim());
   const ownerUnavailable=row.ownerStatus!=='ACTIVE';
   const reasons:SupportResponsibilityReason[]=[];
   if(followUpReached)reasons.push('FOLLOW_UP_REACHED');
   if(followUpUnset)reasons.push('WAITING_FOLLOW_UP_UNSET');
   if(nextActionMissing)reasons.push('WAITING_NEXT_ACTION_MISSING');
   if(ownerUnavailable)reasons.push('OWNER_UNAVAILABLE');
   return {workId:w.id,supportEventId:row.supportEventId,title:w.title,personName:row.personName,serviceName:row.serviceName,ownerId:w.workOwnerOperatorId,ownerName:row.ownerName,ownerStatus:row.ownerStatus,nextAction:w.nextAction,waiting:w.waiting,waitingParty:w.waitingParty,waitingReason:w.waitingReason,followUpAt:w.followUpAt,reasons,facts:{followUpReached,followUpUnset,nextActionMissing,ownerUnavailable,clock}};
  });
  return {clock,myWork:all.filter(x=>x.ownerId===a.id),waiting:all.filter(x=>x.waiting),needsFollowUp:all.filter(x=>x.reasons.length>0),ownerGap:all.filter(x=>x.facts.ownerUnavailable)};
 });}
 detail(a:Operator,eventId:string){return this.run(a,async r=>{
  const event=found(await r.event(eventId)),person=found(await r.core.recipientPerson(event.serviceRecipientId)),observation=found(await r.observation(eventId)),evaluation=await r.evaluation(eventId),work=await r.workForEvent(eventId);
  const relation=await r.core.currentRelation(person.id);
  // Read the same Registry relation as JOIN. Never store a device in SUPPORT.
  const deviceFact=relation?{relation,device:found(await r.core.device(relation.toEntityId)),sourceChange:found(await r.core.change(relation.sourceChangeId))}:null;
  const decision=work?await r.decision(work.id):null,evidence=decision?await r.evidence(decision.evidenceId):null,action=decision?await r.core.action(decision.actionId):null;
  const rawDeviceContextHistory=work?await r.deviceContexts(work.id):[];
  const targetObservations=work?await r.targetObservations(work.id):[];
  const currentDeviceContext=rawDeviceContextHistory.at(-1)?.kind==='ENDED'?null:rawDeviceContextHistory.at(-1)??null;
  const currentContextDevice=currentDeviceContext?.deviceId?found(await r.core.device(currentDeviceContext.deviceId)):null;
  const deviceComparison={
   result:deviceFact&&currentDeviceContext&&currentContextDevice
    ?deviceFact.device.id===currentContextDevice.id?'MATCH' as const:'DIFFERENT' as const
    :'UNCONFIRMED' as const,
   registry:deviceFact?{deviceId:deviceFact.device.id,assetTag:deviceFact.device.assetTag,relationId:deviceFact.relation.id,verifiedAt:deviceFact.relation.verifiedAt}:null,
   target:currentDeviceContext&&currentContextDevice?{deviceId:currentContextDevice.id,assetTag:currentContextDevice.assetTag,contextId:currentDeviceContext.id,source:currentDeviceContext.confirmationSource,recordedAt:currentDeviceContext.recordedAt}:null,
   targetUnidentified:currentDeviceContext?.kind==='UNIDENTIFIED'
  };
  const deviceContextHistory=await Promise.all(rawDeviceContextHistory.map(async context=>({context,device:context.deviceId?found(await r.core.device(context.deviceId)):null,operator:found(await r.core.operator(context.recordedByOperatorId))})));
  const contract=found(await r.core.contract(event.contractProfileId));
  const records=work?await r.records(work.id):[];
  const lifecycleEvents=work?await r.lifecycleEvents(work.id):[];
  const followUps=work?await r.followUps(work.id):[];
  const closeDecisions=work?await r.closeDecisions(work.id):[],closeDecision=closeDecisions.at(-1)??null;
  const historyActorIds=[event.createdByOperatorId,evaluation?.evaluatedByOperatorId,...records.map(x=>x.recordedByOperatorId),...rawDeviceContextHistory.map(x=>x.recordedByOperatorId),...targetObservations.map(x=>x.recordedByOperatorId),...lifecycleEvents.map(x=>x.recordedByOperatorId),...followUps.map(x=>x.recordedByOperatorId),...closeDecisions.map(x=>x.decidedByOperatorId)].filter((x):x is string=>!!x);
  const recordAuthors=(await Promise.all([...new Set(historyActorIds)].map(id=>r.core.operator(id)))).filter(x=>x!==null).map(x=>({id:x.id,displayName:x.displayName}));
  const actorName=(id:string)=>recordAuthors.find(x=>x.id===id)?.displayName??null;
  const history:SupportBusinessHistoryItem[]=[{id:event.id,kind:'INQUIRY_RECEIVED',occurredAt:event.createdAt,actorOperatorId:event.createdByOperatorId,actorName:actorName(event.createdByOperatorId),summary:'問い合わせを受け付けました',detail:observation.contentText,source:'本人からの申告'}];
  if(evaluation)history.push({id:evaluation.id,kind:'WORK_STARTED',occurredAt:evaluation.evaluatedAt,actorOperatorId:evaluation.evaluatedByOperatorId,actorName:actorName(evaluation.evaluatedByOperatorId),summary:work?'対応を開始しました':'対応しない判断を記録しました',detail:evaluation.basisSummary,source:'担当者の判断'});
   const dispositionLabel={CUSTOMER_WAIT:'顧客対応・回答待ち',INVESTIGATING:'要調査',MONITORING:'様子見',COMPLETED:'対応終了'} as const;
   for(const record of records.filter(x=>x.kind!=='DRAFT')){if(record.kind==='RESPONSE'){const follow=followUps.find(x=>x.requestId===record.requestId&&x.kind==='SET'),close=closeDecisions.find(x=>x.requestId===record.requestId);history.push({id:record.id,kind:'RESPONSE_RECORDED',occurredAt:record.recordedAt,actorOperatorId:record.recordedByOperatorId,actorName:actorName(record.recordedByOperatorId),summary:'対応を記録しました',detail:`${record.notes.responseText} / 対応後の状態: ${dispositionLabel[record.notes.disposition]}${follow?.followUpAt?` / 次回確認予定: ${follow.followUpAt}`:''}${close?` / ${close.closeReason}`:''}`,source:'担当者の記録'});continue;}if(isLegacySupportRecord(record))history.push({id:record.id,kind:record.kind==='CORRECTION'?'RECORD_CORRECTED':'RECORD_ADDED',occurredAt:record.recordedAt,actorOperatorId:record.recordedByOperatorId,actorName:actorName(record.recordedByOperatorId),summary:record.kind==='CORRECTION'?'対応記録を訂正しました':'対応を記録しました',detail:`${supportActionLabels[record.notes.action]}${record.notes.actionDetails?`（${record.notes.actionDetails}）`:''} / ${supportResultLabels[record.notes.result]}${record.notes.resultDetails?`（${record.notes.resultDetails}）`:''}${record.correctionReason?` / 訂正理由: ${record.correctionReason}`:''}`,source:record.notes.resultSource==='CALLER'?'本人からの申告':record.notes.resultSource==='OPERATOR'?'担当者が確認':'確認元は未確認'});}
  for(const context of deviceContextHistory){const label=context.device?.assetTag??'対象未特定',kind=context.context.kind==='CONFIRMED'?'TARGET_CONFIRMED':context.context.kind==='CORRECTED'?'TARGET_CORRECTED':context.context.kind==='UNIDENTIFIED'?'TARGET_UNIDENTIFIED':'TARGET_ENDED';const summary=context.context.kind==='CONFIRMED'?'今回の対応対象を確認しました':context.context.kind==='CORRECTED'?'今回の対応対象を訂正しました':context.context.kind==='UNIDENTIFIED'?'対応対象は未特定と記録しました':'対応対象の記録を終了しました';history.push({id:context.context.id,kind,occurredAt:context.context.recordedAt,actorOperatorId:context.context.recordedByOperatorId,actorName:context.operator.displayName,summary,detail:`${label}${context.context.reason?` / ${context.context.reason}`:''}`,source:context.context.confirmationSource==='CALLER'?'本人からの申告':context.context.confirmationSource==='OPERATOR'?'担当者が確認':'その他の確認元'});}
  const observationKind={IDENTIFICATION:'識別状況',OWNERSHIP:'所有状態',MANAGEMENT_STATE:'管理状態',REGISTRY_COMPARISON:'登録情報との比較判断',CALLER_STATEMENT:'本人から聞いた内容'} as const,observationValue={UNIDENTIFIED:'未特定',PARTIALLY_IDENTIFIED:'一部特定',PERSONALLY_OWNED:'個人所有',COMPANY_OWNED:'会社所有',MANAGED:'管理対象',UNMANAGED:'管理対象外',MATCH:'一致',DIFFERENT:'異なる',UNKNOWN:'未確認'} as const;
  for(const item of targetObservations)history.push({id:item.id,kind:'TARGET_OBSERVED',occurredAt:item.recordedAt,actorOperatorId:item.recordedByOperatorId,actorName:actorName(item.recordedByOperatorId),summary:item.kind==='CALLER_STATEMENT'?'本人から聞いた内容を記録しました':item.kind==='REGISTRY_COMPARISON'?'登録情報との比較判断を記録しました':'対応対象の情報を記録しました',detail:`${observationKind[item.kind]}: ${observationValue[item.value]}${item.detail?` / ${item.detail}`:''}`,source:item.kind==='CALLER_STATEMENT'?'本人からの申告（未検証）':item.sourceType==='CALLER'?'本人からの申告':item.sourceType==='OPERATOR'?'担当者が確認':'その他の確認元'});
   for(const item of lifecycleEvents.filter(x=>!['CONTINUATION_RECORDED','RESPONSE_RECORDED'].includes(x.kind))){const kind:SupportBusinessHistoryKind=item.kind==='WAITING_SET'?'WAITING_SET':item.kind==='RESUMED'?'RESUMED':item.kind==='REOPENED'?'REOPENED':'NEXT_ACTION_CLEARED';history.push({id:item.id,kind,occurredAt:item.recordedAt,actorOperatorId:item.recordedByOperatorId,actorName:actorName(item.recordedByOperatorId),summary:item.kind==='WAITING_SET'?'回答・対応待ちにしました':item.kind==='RESUMED'?'対応を再開しました':item.kind==='REOPENED'?'対応中に戻しました':'次の対応を解消しました',detail:item.kind==='WAITING_SET'?`${item.waitingParty} / ${item.waitingReason}`:item.kind==='REOPENED'?String((item.commandPayload.input as {reason?:string}|undefined)?.reason??''):item.nextAction,source:'担当者の判断'});}
   const groupedRequests=new Set([...records.filter(x=>x.kind==='RESPONSE').map(x=>x.requestId),...lifecycleEvents.filter(x=>x.kind==='REOPENED').map(x=>x.requestId),...closeDecisions.map(x=>x.requestId)]);for(const item of followUps.filter(x=>!groupedRequests.has(x.requestId)))history.push({id:item.id,kind:item.kind==='SET'?'FOLLOW_UP_SET':'FOLLOW_UP_CLEARED',occurredAt:item.recordedAt,actorOperatorId:item.recordedByOperatorId,actorName:actorName(item.recordedByOperatorId),summary:item.kind==='SET'?'次回確認予定を設定しました':'次回確認予定を解除しました',detail:item.followUpAt??item.reason,source:item.basisText||'担当者の判断'});
  const closeOutcome={RESOLVED:'解決',NOT_ELIGIBLE:'対象外',WITHDRAWN:'取り下げ',FORMALLY_TRANSFERRED:'正式移管',OTHER_RESPONSIBILITY_ENDED:'その他の責任終了'} as const;
   for(const item of closeDecisions.filter(x=>!records.some(r=>r.kind==='RESPONSE'&&r.requestId===x.requestId)))history.push({id:item.id,kind:'WORK_CLOSED',occurredAt:item.decidedAt,actorOperatorId:item.decidedByOperatorId,actorName:actorName(item.decidedByOperatorId),summary:'対応を終了しました',detail:`${closeOutcome[item.outcome]} / ${item.closeReason}`,source:item.provenanceReference});
  history.sort((x,y)=>y.occurredAt.localeCompare(x.occurredAt)||y.id.localeCompare(x.id));
  // Related by the same Person AND Service, never by a copied device label.
  // Completed history only; drafts and future work are not recommendations.
  const previousWork=[];
  for(const other of await r.events()){
   if(other.id===event.id||other.serviceId!==event.serviceId) continue;
   const p=await r.core.recipientPerson(other.serviceRecipientId);if(p?.id!==person.id)continue;
    const w=await r.workForEvent(other.id);if(!w||w.status!=='COMPLETED')continue;
    const d=await r.decision(w.id),record=(await r.records(w.id)).filter(x=>x.kind!=='DRAFT').at(-1)??null;if(!d&&!record)continue;
    previousWork.push({eventId:other.id,work:w,observation:await r.observation(other.id),action:d?await r.core.action(d.actionId):null,evidence:d?await r.evidence(d.evidenceId):null,record});
  }
  const needsFollowUp=!!work&&work.status!=='COMPLETED'&&((work.waiting&&!work.followUpAt)||(!!work.followUpAt&&new Date(work.followUpAt)<=new Date()));
  const latestResponseEvent=lifecycleEvents.filter(x=>['RESPONSE_RECORDED','REOPENED'].includes(x.kind)).at(-1),hasLaterLegacyLifecycle=!!latestResponseEvent&&lifecycleEvents.some(x=>x.revision>latestResponseEvent.revision&&!['RESPONSE_RECORDED','REOPENED'].includes(x.kind)),latestResponse=latestResponseEvent?.kind==='RESPONSE_RECORDED'?records.find((x):x is Extract<(typeof records)[number],{kind:'RESPONSE'}>=>x.kind==='RESPONSE'&&x.requestId===latestResponseEvent.requestId):null,reopenedDisposition=latestResponseEvent?.kind==='REOPENED'?(latestResponseEvent.commandPayload.input as {disposition:Exclude<import('../../domain/src/support.js').ResponseDisposition,'COMPLETED'>}).disposition:null;
  const currentResponseState=work?work.status==='COMPLETED'?{code:'COMPLETED' as const,label:'対応終了',source:'WORK' as const}:!hasLaterLegacyLifecycle&&reopenedDisposition?{code:reopenedDisposition,label:dispositionLabel[reopenedDisposition],source:'RESPONSE' as const}:latestResponse&&!hasLaterLegacyLifecycle?{code:latestResponse.notes.disposition,label:dispositionLabel[latestResponse.notes.disposition],source:'RESPONSE' as const}:{code:'WORK_STATE' as const,label:work.waiting?'顧客対応・回答待ち':'対応中',source:'WORK' as const}:null;
  return {event,person,observation,evaluation,work,currentResponseState,owner:work?await r.core.operator(work.workOwnerOperatorId):null,deviceFact,currentDeviceContext,currentContextDevice,deviceComparison,deviceContextHistory,targetObservations,lifecycleEvents,followUps,closeDecision,closeDecisions,businessHistory:history,needsFollowUp,eligibility:{state:'UNKNOWN' as const,reason:'NO_APPLICABLE_RULE' as const,ruleSource:null},unknowns:['VPN利用要否','発生時刻','表示されたエラー','他ネットワークでの再現'],decision,evidence,action,records,recordAuthors,previousWork,knowledge:work?await r.knowledge(work.id):null,relatedKnowledge:await r.candidates(event.serviceId),timeline:await r.core.timeline(eventId),executeRoles:contract.configurationJson.support?.executeRoles??[]};
 });}
}
export type SupportListView=Awaited<ReturnType<SupportQueries['list']>>;
export type SupportDetailView=Awaited<ReturnType<SupportQueries['detail']>>;
export type SupportResponsibilityView=Awaited<ReturnType<SupportQueries['responsibility']>>;
