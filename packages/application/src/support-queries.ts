import type {Operator} from '../../domain/src/operator.js';
import {assertRole,found} from '../../domain/src/join.js';
import type {SupportRepository,SupportUnitOfWork} from './support-ports.js';
export type SupportResponsibilityReason='FOLLOW_UP_REACHED'|'WAITING_FOLLOW_UP_UNSET'|'WAITING_NEXT_ACTION_MISSING'|'OWNER_UNAVAILABLE';
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
  const deviceContextHistory=await Promise.all(rawDeviceContextHistory.map(async context=>({context,device:context.deviceId?found(await r.core.device(context.deviceId)):null,operator:found(await r.core.operator(context.recordedByOperatorId))})));
  const contract=found(await r.core.contract(event.contractProfileId));
  const records=work?await r.records(work.id):[];
  const lifecycleEvents=work?await r.lifecycleEvents(work.id):[];
  const followUps=work?await r.followUps(work.id):[];
  const closeDecision=work?await r.closeDecision(work.id):null;
  const recordAuthors=(await Promise.all([...new Set(records.map(x=>x.recordedByOperatorId))].map(id=>r.core.operator(id)))).filter(x=>x!==null).map(x=>({id:x.id,displayName:x.displayName}));
  // Related by the same Person AND Service, never by a copied device label.
  // Completed history only; drafts and future work are not recommendations.
  const previousWork=[];
  for(const other of await r.events()){
   if(other.id===event.id||other.serviceId!==event.serviceId) continue;
   const p=await r.core.recipientPerson(other.serviceRecipientId);if(p?.id!==person.id)continue;
   const w=await r.workForEvent(other.id);if(!w||w.status!=='COMPLETED')continue;
   const d=await r.decision(w.id);if(!d)continue;
   previousWork.push({eventId:other.id,work:w,observation:await r.observation(other.id),action:await r.core.action(d.actionId),evidence:await r.evidence(d.evidenceId),record:(await r.records(w.id)).filter(x=>x.kind!=='DRAFT').at(-1)??null});
  }
  const needsFollowUp=!!work&&work.status!=='COMPLETED'&&((work.waiting&&!work.followUpAt)||(!!work.followUpAt&&new Date(work.followUpAt)<=new Date()));
  return {event,person,observation,evaluation,work,owner:work?await r.core.operator(work.workOwnerOperatorId):null,deviceFact,currentDeviceContext,currentContextDevice,deviceContextHistory,targetObservations,lifecycleEvents,followUps,closeDecision,needsFollowUp,eligibility:{state:'UNKNOWN' as const,reason:'NO_APPLICABLE_RULE' as const,ruleSource:null},unknowns:['VPN利用要否','発生時刻','表示されたエラー','他ネットワークでの再現'],decision,evidence,action,records,recordAuthors,previousWork,knowledge:work?await r.knowledge(work.id):null,relatedKnowledge:await r.candidates(event.serviceId),timeline:await r.core.timeline(eventId),executeRoles:contract.configurationJson.support?.executeRoles??[]};
 });}
}
export type SupportListView=Awaited<ReturnType<SupportQueries['list']>>;
export type SupportDetailView=Awaited<ReturnType<SupportQueries['detail']>>;
export type SupportResponsibilityView=Awaited<ReturnType<SupportQueries['responsibility']>>;
