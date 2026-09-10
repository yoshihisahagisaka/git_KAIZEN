import type {Operator} from '../../domain/src/operator.js';
import {found} from '../../domain/src/join.js';
import type {SupportRepository,SupportUnitOfWork} from './support-ports.js';
export class SupportQueries {
 constructor(private uow:SupportUnitOfWork){}
 private run<T>(a:Operator,fn:(r:SupportRepository)=>Promise<T>){return this.uow.run(a.tenantId,async r=>{found(await r.core.operator(a.id));return fn(r);},true);}
 list(a:Operator){return this.run(a,async r=>({people:await r.core.people(),services:await r.core.services(),inquiries:await Promise.all((await r.events()).map(async e=>({event:e,person:found(await r.core.recipientPerson(e.serviceRecipientId)),work:await r.workForEvent(e.id)})))}));}
 detail(a:Operator,eventId:string){return this.run(a,async r=>{
  const event=found(await r.event(eventId)),person=found(await r.core.recipientPerson(event.serviceRecipientId)),observation=found(await r.observation(eventId)),evaluation=await r.evaluation(eventId),work=await r.workForEvent(eventId);
  const relation=await r.core.currentRelation(person.id);
  // Read the same Registry relation as JOIN. Never store a device in SUPPORT.
  const deviceFact=relation?{relation,device:found(await r.core.device(relation.toEntityId)),sourceChange:found(await r.core.change(relation.sourceChangeId))}:null;
  const decision=work?await r.decision(work.id):null,evidence=decision?await r.evidence(decision.evidenceId):null,action=decision?await r.core.action(decision.actionId):null;
  const contract=found(await r.core.contract(event.contractProfileId));
  return {event,person,observation,evaluation,work,owner:work?await r.core.operator(work.workOwnerOperatorId):null,deviceFact,unknowns:['VPN利用要否','発生時刻','表示されたエラー','他ネットワークでの再現'],decision,evidence,action,knowledge:work?await r.knowledge(work.id):null,relatedKnowledge:await r.candidates(event.serviceId),timeline:await r.core.timeline(eventId),executeRoles:contract.configurationJson.support?.executeRoles??[]};
 });}
}
export type SupportListView=Awaited<ReturnType<SupportQueries['list']>>;
export type SupportDetailView=Awaited<ReturnType<SupportQueries['detail']>>;
