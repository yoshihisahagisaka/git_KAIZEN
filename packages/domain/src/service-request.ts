import {requireCondition} from './join.js';

/** Application-level request exchange, not a new Core Work or escalation status.
 * Parties are resolved from trusted service configuration by the authority adapter.
 * No permission is inferred from direction, type, mention or parent Work. */
export type RequestDirection='PROVIDER_TO_PARTNER'|'PARTNER_TO_PROVIDER';
export const requestLabels={
 CALL_REQUEST:'発信依頼',SUPPORT_REQUEST:'対応依頼',INVESTIGATION_REQUEST:'調査依頼',
 INQUIRY:'問合せ',ONSITE_REQUEST:'オンサイト対応依頼',OTHER:'その他',
} as const;
export type RequestType=keyof typeof requestLabels;
export type RequestStatus='PENDING'|'IN_PROGRESS'|'COMPLETED';
export const requestStatusLabels:Record<RequestStatus,string>={PENDING:'未対応',IN_PROGRESS:'対応中',COMPLETED:'対応完了'};
export function requestTypes(direction:RequestDirection):RequestType[]{
 const common:RequestType[]=['CALL_REQUEST','SUPPORT_REQUEST','INVESTIGATION_REQUEST','INQUIRY'];
 return [...common,...(direction==='PROVIDER_TO_PARTNER'?['ONSITE_REQUEST' as const]:[]),'OTHER'];
}
export interface RequestContext {
 tenantId:string;serviceId:string;contractProfileId:string;
 senderPartyId:string;recipientPartyId:string;direction:RequestDirection;
 parentWorkId:string|null;
}
export interface RequestEntry extends RequestContext {
 id:string;type:RequestType;content:string;customerName:string;contactName:string;
 desiredAt:string|null;createdBy:string;createdAt:string;
}
export interface RequestUpdate {
 id:string;commandId:string;requestId:string;revision:number;
 previousStatus:RequestStatus;status:RequestStatus;comment:string;
 actorId:string;recordedAt:string;
}
export interface RequestProjection {status:RequestStatus;revision:number;lastUpdate:RequestUpdate|null}
export function projectRequest(entry:RequestEntry,history:readonly RequestUpdate[]):RequestProjection {
 let status:RequestStatus='PENDING',revision=0,lastUpdate:RequestUpdate|null=null;
 for(const item of history){
  requireCondition(item.requestId===entry.id&&item.revision===revision+1&&item.previousStatus===status,
   'REQUEST_HISTORY_INVALID','依頼履歴の整合性を確認してください。');
  status=item.status;revision=item.revision;lastUpdate=item;
 }
 return {status,revision,lastUpdate};
}
export function createRequest(context:RequestContext,input:{
 id:string;type:RequestType;content:string;customerName?:string;contactName?:string;desiredAt?:string|null;
},actorId:string,at:string):RequestEntry {
 requireCondition(context.senderPartyId!==context.recipientPartyId&&
  ['PROVIDER_TO_PARTNER','PARTNER_TO_PROVIDER'].includes(context.direction),
  'INVALID_REQUEST_CONTEXT','依頼先を確認してください。',400);
 requireCondition(requestTypes(context.direction).includes(input.type),'INVALID_REQUEST_TYPE','依頼種別を確認してください。',400);
 const content=input.content.trim(),customerName=input.customerName?.trim()??'',contactName=input.contactName?.trim()??'';
 const desiredAt=input.desiredAt??null;
 requireCondition(content.length>=1&&content.length<=4000&&customerName.length<=200&&contactName.length<=200&&
  (desiredAt===null||Number.isFinite(Date.parse(desiredAt))),
  'INVALID_REQUEST_INPUT','依頼内容と希望日時を確認してください。',400);
 return {...context,id:input.id,type:input.type,content,customerName,contactName,desiredAt,createdBy:actorId,createdAt:at};
}
/** Called only after verified recipient-side UPDATE authority and row lock.
 * Sender may read the response but never impersonate the receiving actor.
 * Explicit reopen/correction beyond MVP is not silently inferred. */
export function appendRequestUpdate(entry:RequestEntry,history:readonly RequestUpdate[],input:{
 id:string;commandId:string;expectedRevision:number;status:RequestStatus;comment:string;
},actorId:string,at:string):RequestUpdate {
 const comment=input.comment.trim();
 const projection=projectRequest(entry,history);
 const prior=history.find(x=>x.commandId===input.commandId);
 if(prior){
  requireCondition(prior.actorId===actorId&&prior.revision===input.expectedRevision+1&&prior.status===input.status&&prior.comment===comment,
   'RETRY_CONFLICT','同じ保存番号の内容が異なります。');return prior;
 }
 requireCondition(projection.revision===input.expectedRevision,'STALE_REVISION','依頼が更新されています。');
 requireCondition(['PENDING','IN_PROGRESS','COMPLETED'].includes(input.status)&&comment.length<=4000,
  'INVALID_REQUEST_UPDATE','対応状況を確認してください。',400);
 requireCondition(projection.status!=='COMPLETED'&&input.status!=='PENDING',
  'REQUEST_STATE_CONFLICT','この依頼の状態は変更できません。');
 requireCondition(input.status!=='COMPLETED'||comment.length>0,'REQUEST_RESULT_REQUIRED','対応結果を入力してください。',400);
 requireCondition(input.status!==projection.status||comment.length>0,'REQUEST_COMMENT_REQUIRED','対応コメントを入力してください。',400);
 return {id:input.id,commandId:input.commandId,requestId:entry.id,revision:projection.revision+1,
  previousStatus:projection.status,status:input.status,comment,actorId,recordedAt:at};
}
