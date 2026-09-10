import type {Operator} from '../../domain/src/operator.js';
import {assertRole,found,requireCondition} from '../../domain/src/join.js';
import type {SupportEvent,SupportWork,SupportDecision} from '../../domain/src/support.js';
import {supportActionLabels,supportResultLabels,type SupportNotes,type SupportRecord} from '../../domain/src/support.js';
import type {SupportRepository,SupportRuntime,SupportUnitOfWork} from './support-ports.js';
export class SupportCommands {
 recordWork(actor:Operator,workId:string,input:{requestId:string;expectedRevision:number;kind:SupportRecord['kind'];notes:SupportNotes;correctionReason:string}){return this.run(actor,async(r,a)=>{
  const w=found(await r.work(workId,true));await this.context(r,a,found(await r.event(w.supportEventId)));
  const records=await r.records(workId),old=records.find(x=>x.requestId===input.requestId);
  // Canonical field comparison avoids JSON object key-order dependence on PostgreSQL jsonb.
  const sameNotes=(x:SupportNotes,y:SupportNotes)=>Object.keys(x).every(k=>x[k as keyof SupportNotes]===y[k as keyof SupportNotes]);
  if(old){requireCondition(old.recordedByOperatorId===a.id&&old.kind===input.kind&&old.correctionReason===input.correctionReason&&sameNotes(old.notes,input.notes),'RETRY_CONFLICT','同じ保存番号の内容が異なります。');return old;}
  requireCondition((records.at(-1)?.revision??0)===input.expectedRevision,'STALE_REVISION','別の保存があります。入力を控えて再読み込みし、最新の記録を確認してください。');
  const n=input.notes;
  requireCondition(['DRAFT','COMPLETION','CORRECTION'].includes(input.kind)&&Object.hasOwn(supportActionLabels,n.action)&&Object.hasOwn(supportResultLabels,n.result)&&['CALLER','OPERATOR','UNKNOWN'].includes(n.resultSource),'INVALID_INPUT','入力内容を確認してください。',400);
  requireCondition([n.checks,n.actionDetails,n.resultDetails,n.exceptionReason,input.correctionReason].every(s=>typeof s==='string'&&s.length<=1000),'INVALID_INPUT','各欄は1000文字以内で入力してください。',400);
  requireCondition(input.kind==='CORRECTION'?w.status==='COMPLETED':w.status!=='COMPLETED','WORK_STATE_CONFLICT','完了した対応には訂正を追加してください。');
  if(input.kind!=='DRAFT'){
   requireCondition(n.actionDetails.trim()&&n.checks.trim(),'EVIDENCE_REQUIRED','確認した内容と、実際に行ったことを入力してください。',400);
   requireCondition(n.result==='UNCONFIRMED'||(n.resultSource!=='UNKNOWN'&&n.resultDetails.trim()),'EVIDENCE_REQUIRED','結果を誰がどう確認したか入力してください。',400);
   requireCondition(!['NO_ACTION_REQUIRED','OTHER_GUIDANCE'].includes(n.action)||n.exceptionReason.trim(),'REASON_REQUIRED','追加対応なし・標準外の対応には理由を入力してください。',400);
  }
  if(input.kind==='CORRECTION') {
   requireCondition(input.correctionReason.trim(),'REASON_REQUIRED','訂正理由を入力してください。',400);
   requireCondition((n.action==='NO_ACTION_REQUIRED')===(w.outcome==='NO_ACTION_REQUIRED'),'OUTCOME_CONFLICT','完了区分は変更できません。実施内容・確認結果の訂正を記録してください。');
  }
  if(input.kind==='COMPLETION'){
   // Retain an existing V1 resolution. The completion record can clarify its text
   // without rewriting the original Evidence or pretending the Action ran again.
   const existingDecision=await r.decision(workId);
   if(existingDecision) requireCondition((n.action==='NO_ACTION_REQUIRED')===(existingDecision.mode==='NO_ACTION_REQUIRED'),'OUTCOME_CONFLICT','保存済みの対応区分は維持し、実施内容・結果を確認してください。');
   else await this.resolution(r,a,workId,{mode:n.action==='NO_ACTION_REQUIRED'?'NO_ACTION_REQUIRED':'GUIDANCE_ONLY',
    diagnosticEvidence:n.checks+'\n結果: '+supportResultLabels[n.result]+'\n確認元: '+n.resultSource+'\n'+n.resultDetails,
    rationale:n.exceptionReason||'標準手順 support-demo-v2: オペレーターが実施内容と結果を確認して完了',
    actionSummary:supportActionLabels[n.action]+'\n'+n.actionDetails});
   w.status='COMPLETED';w.outcome=n.action==='NO_ACTION_REQUIRED'?'NO_ACTION_REQUIRED':'COMPLETED';w.closedAt=this.runtime.now();w.updatedAt=w.closedAt;w.nextAction='問い合わせ対応は完了';await r.progress(w);
   await this.audit(r,a,w.supportEventId,'SUPPORT_COMPLETED',{workId,outcome:w.outcome});
  }
  const record:SupportRecord={id:this.runtime.id(),tenantId:a.tenantId,workId,requestId:input.requestId,revision:input.expectedRevision+1,kind:input.kind,notes:n,correctionReason:input.correctionReason,recordedByOperatorId:a.id,recordedAt:this.runtime.now()};
  await r.insertRecord(record);await this.audit(r,a,w.supportEventId,'SUPPORT_'+input.kind+'_SAVED',{workId,recordId:record.id,revision:record.revision});return record;
 });}
 constructor(private uow:SupportUnitOfWork,private runtime:SupportRuntime){}
 private run<T>(actor:Operator,fn:(r:SupportRepository,a:Operator)=>Promise<T>){return this.uow.run(actor.tenantId,async r=>{const a=found(await r.core.operator(actor.id));assertRole(a,['ADMIN','OPERATOR']);return fn(r,a);});}
 private async context(r:SupportRepository,a:Operator,e:SupportEvent){const s=found(await r.core.service(e.serviceId)),c=found(await r.core.contract(e.contractProfileId)),now=this.runtime.now();requireCondition(s.status==='ACTIVE'&&c.status==='ACTIVE'&&c.serviceId===s.id&&c.effectiveFrom<=now&&(!c.effectiveTo||c.effectiveTo>now),'SERVICE_NOT_ACTIVE','有効なサービス契約を確認してください。');requireCondition(c.configurationJson.support?.enabled,'SUPPORT_NOT_AUTHORIZED','この契約では問い合わせ対応が許可されていません。',403);assertRole(a,c.configurationJson.support.executeRoles);return c;}
 private audit(r:SupportRepository,a:Operator,eventId:string,type:string,metadata:Record<string,unknown>){return r.audit({id:this.runtime.id(),tenantId:a.tenantId,aggregateType:'SUPPORT_EVENT',aggregateId:eventId,eventType:type,actorOperatorId:a.id,occurredAt:this.runtime.now(),metadataJson:metadata});}
 createEvent(actor:Operator,input:{requestId:string;personId:string;serviceId:string;symptom:string}){return this.run(actor,async(r,a)=>{
  requireCondition(input.symptom.trim().length>0&&input.symptom.length<=4000,'INVALID_INPUT','本人からの申告を入力してください。',400);
  await r.lockRequest(input.requestId);const previous=await r.byRequest(input.requestId);
  if(previous){await this.context(r,a,previous);const p=found(await r.core.recipientPerson(previous.serviceRecipientId));requireCondition(previous.createdByOperatorId===a.id&&p.id===input.personId&&previous.serviceId===input.serviceId&&(await r.observation(previous.id))?.contentText===input.symptom,'RETRY_CONFLICT','同じ受付番号の内容が異なります。');return previous;}
  const person=found(await r.core.person(input.personId)),service=found(await r.core.service(input.serviceId));requireCondition(person.organizationId===service.organizationId,'SERVICE_CONTEXT_MISMATCH','対象者とサービスの組織を確認してください。');
  const contracts=await r.core.effectiveContracts(service.id,this.runtime.now());requireCondition(contracts.length===1,'CONTRACT_NOT_UNIQUE','有効な契約を確認してください。');
  const event:SupportEvent={id:this.runtime.id(),tenantId:a.tenantId,requestId:input.requestId,serviceId:service.id,contractProfileId:contracts[0]!.id,serviceRecipientId:await r.core.ensureRecipient(this.runtime.id(),service.id,person.id),createdByOperatorId:a.id,createdAt:this.runtime.now()};await this.context(r,a,event);
  await r.insertEvent(event,{id:this.runtime.id(),tenantId:a.tenantId,supportEventId:event.id,contentText:input.symptom,sourceType:'CALLER',semanticType:'OBSERVATION',reliability:'UNVERIFIED',observedAt:event.createdAt,recordedByOperatorId:a.id,reviewPolicy:'REVIEW_FOR_EACH_INQUIRY'});await this.audit(r,a,event.id,'SUPPORT_RECEIVED',{personId:person.id});return event;
 });}
 evaluate(actor:Operator,eventId:string,decision:'REQUIRED'|'NOT_APPLICABLE',reason:string=''){return this.run(actor,async(r,a)=>{
  if(decision==='REQUIRED'&&!reason.trim()) reason='標準受付: オペレーターが確認・対応を開始することを選択';
  requireCondition(['REQUIRED','NOT_APPLICABLE'].includes(decision)&&reason.trim(),'INVALID_TRIAGE','対応の必要性と判断理由を記録してください。',400);
  const event=found(await r.event(eventId,true)),contract=await this.context(r,a,event),existing=await r.evaluation(eventId);
  if(existing){requireCondition(existing.result===decision&&existing.basisSummary===reason,'RETRY_CONFLICT','受付時の判断は記録済みです。');return {evaluation:existing,work:await r.workForEvent(eventId)};}
  const at=this.runtime.now();const evaluation={id:this.runtime.id(),tenantId:a.tenantId,supportEventId:eventId,requirementCode:'SUPPORT_ASSISTANCE' as const,result:decision,evaluationVersion:1,catalogVersion:'support-v1',basisSummary:reason,basisSnapshot:{contractProfileId:contract.id,contractProfileVersion:contract.version,triageReason:reason,decision},evaluatedByOperatorId:a.id,evaluatedAt:at};await r.insertEvaluation(evaluation);
  let work:SupportWork|null=null;if(decision==='REQUIRED'){const person=found(await r.core.recipientPerson(event.serviceRecipientId));work={id:this.runtime.id(),tenantId:a.tenantId,serviceId:event.serviceId,contractProfileId:contract.id,serviceRecipientId:event.serviceRecipientId,supportEventId:event.id,sourceRequirementEvaluationId:evaluation.id,title:person.displayName+'さんのVPN接続の問い合わせ',status:'OPEN',outcome:null,workOwnerOperatorId:a.id,nextAction:'VPN利用要否と症状を確認する',nextActionOwnerOperatorId:a.id,createdAt:at,updatedAt:at,closedAt:null};await r.insertWork(work);}
  await this.audit(r,a,eventId,'SUPPORT_EVALUATED',{evaluationId:evaluation.id,result:decision,workId:work?.id??null,ownerId:work?.workOwnerOperatorId??null});return {evaluation,work};
 });}
 recordResolution(actor:Operator,workId:string,input:{mode:'GUIDANCE_ONLY'|'NO_ACTION_REQUIRED';diagnosticEvidence:string;rationale:string;actionSummary:string}){return this.run(actor,(r,a)=>this.resolution(r,a,workId,input));}
 private async resolution(r:SupportRepository,a:Operator,workId:string,input:{mode:'GUIDANCE_ONLY'|'NO_ACTION_REQUIRED';diagnosticEvidence:string;rationale:string;actionSummary:string}){
  requireCondition(['GUIDANCE_ONLY','NO_ACTION_REQUIRED'].includes(input.mode),'REALITY_CHANGE_NOT_SUPPORTED','この画面は確認・案内専用です。機器や設定の変更は、検証と正式反映を伴う対応が必要です。',400);
  requireCondition([input.diagnosticEvidence,input.rationale,input.actionSummary].every(s=>s.trim().length>0&&s.length<=4000),'EVIDENCE_REQUIRED','確認根拠・判断理由・実施内容を記録してください。',400);
  const work=found(await r.work(workId,true));await this.context(r,a,found(await r.event(work.supportEventId)));const old=await r.decision(workId);
  if(old){const ev=found(await r.evidence(old.evidenceId)),action=found(await r.core.action(old.actionId));requireCondition(old.mode===input.mode&&old.rationale===input.rationale&&ev.contentText===input.diagnosticEvidence&&action.resultSummary===input.actionSummary,'RETRY_CONFLICT','保存済みの実施記録と内容が異なります。');return old;}
  requireCondition(work.status!=='COMPLETED','WORK_CLOSED','完了した対応です。');const at=this.runtime.now(),evidenceId=this.runtime.id(),actionId=this.runtime.id();
  const d:SupportDecision={id:this.runtime.id(),tenantId:a.tenantId,workId,evidenceId,actionId,mode:input.mode,rationale:input.rationale,decidedByOperatorId:a.id,decidedAt:at};
  await r.insertResolution({id:evidenceId,tenantId:a.tenantId,evidenceType:'DIAGNOSTIC',title:'問い合わせの確認根拠',contentText:input.diagnosticEvidence,createdByOperatorId:a.id,createdAt:at},{id:actionId,tenantId:a.tenantId,workId,actorOperatorId:a.id,resultSummary:input.actionSummary,startedAt:at,completedAt:at},d);
  work.status='IN_PROGRESS';work.nextAction='確認結果と参考になる知識を残して完了する';work.updatedAt=at;await r.progress(work);await this.audit(r,a,work.supportEventId,'SUPPORT_GUIDANCE_RECORDED',{workId,evidenceId,decisionId:d.id,actionId,mode:input.mode});return d;
 }
 saveKnowledge(actor:Operator,workId:string,title:string,content:string){return this.run(actor,async(r,a)=>{requireCondition(title.trim()&&content.trim()&&title.length<=200&&content.length<=4000,'INVALID_INPUT','次の対応に役立つ内容を入力してください。',400);const w=found(await r.work(workId,true));await this.context(r,a,found(await r.event(w.supportEventId)));const d=found(await r.decision(workId)),old=await r.knowledge(workId);if(old){requireCondition(old.title===title&&old.contentText===content,'RETRY_CONFLICT','参考知識は保存済みです。');return old;}const k={id:this.runtime.id(),tenantId:a.tenantId,sourceWorkId:workId,sourceDecisionId:d.id,sourceEvidenceId:d.evidenceId,title,contentText:content,status:'CANDIDATE' as const,topic:'VPN_GUIDANCE' as const,createdByOperatorId:a.id,createdAt:this.runtime.now()};await r.insertKnowledge(k);await this.audit(r,a,w.supportEventId,'SUPPORT_KNOWLEDGE_SAVED',{workId,knowledgeId:k.id,evidenceId:d.evidenceId,decisionId:d.id});return k;});}
 complete(actor:Operator,workId:string){return this.run(actor,async(r,a)=>{const w=found(await r.work(workId,true));await this.context(r,a,found(await r.event(w.supportEventId)));if(w.status==='COMPLETED')return w;const d=found(await r.decision(workId));found(await r.evidence(d.evidenceId));found(await r.core.action(d.actionId));w.status='COMPLETED';w.outcome=d.mode==='GUIDANCE_ONLY'?'COMPLETED':'NO_ACTION_REQUIRED';w.closedAt=this.runtime.now();w.updatedAt=w.closedAt;w.nextAction='問い合わせ対応は完了';await r.progress(w);await this.audit(r,a,w.supportEventId,'SUPPORT_COMPLETED',{workId,outcome:w.outcome});return w;});}
}
