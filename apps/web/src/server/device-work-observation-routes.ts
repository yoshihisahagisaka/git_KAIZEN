import {Router} from 'express';
import {z} from 'zod';
import type {Operator} from '../../../../packages/domain/src/operator.js';
import {DomainError} from '../../../../packages/domain/src/join.js';

const uuid=z.uuid();
const fieldKey=z.enum(['assetTag','displayName','serialNumber','deviceStatus']);
const recordInput=z.strictObject({
  requestId:uuid,targetContextId:uuid,deviceId:uuid,fieldKey,
  observedValue:z.string().trim().min(1).max(2000),
  expectedRevision:z.number().int().min(0),
  attestation:z.enum(['DIRECT_FIELD_OBSERVED_V1','DEVICE_ASSIGNABLE_CONFIRMED_V1']),
});
const proposeInput=z.strictObject({requestKey:uuid});
const confirmInput=z.strictObject({
  attestation:z.literal('REVIEWED_DIRECT_DEVICE_OBSERVATION_V1'),
  verificationSummary:z.string().trim().min(1).max(1000),
});
const queueQuery=z.strictObject({
  limit:z.coerce.number().int().min(1).max(50).default(20),
  cursor:z.string().min(1).max(500).regex(/^[A-Za-z0-9_-]+$/).optional(),
});
const queueCursor=z.strictObject({
  createdAt:z.iso.datetime({offset:true}),changeId:uuid,
});

export interface DeviceSessionPrincipal {tenantId:string;sessionHash:string}
export interface DeviceObservationCommand {
  requestId:string;workId:string;targetContextId:string;deviceId:string;
  fieldKey:'assetTag'|'displayName'|'serialNumber'|'deviceStatus';
  observedValue:string;expectedRevision:number;
}
export interface DeviceReviewCursor {createdAt:string;changeId:string}
export interface DeviceReviewPage {
  items:Array<{changeId:string;workId:string;deviceId:string;fieldKey:string;
    currentValue:string|null;observedValue:string;observedAt:string;
    proposedByOperatorDisplayName:string;status:'PROPOSED'}>;
  nextCursor:string|null;
}
export interface AuthenticatedDeviceWorkObservationStore {
  record(principal:DeviceSessionPrincipal,command:DeviceObservationCommand):Promise<string>;
  propose(principal:DeviceSessionPrincipal,observationId:string,requestKey:string):Promise<string>;
  pending(principal:DeviceSessionPrincipal,limit:number,cursor:DeviceReviewCursor|null):Promise<DeviceReviewPage>;
  confirm(principal:DeviceSessionPrincipal,changeId:string,summary:string):Promise<string>;
}

function sessionPrincipal(locals:Record<string,unknown>):DeviceSessionPrincipal{
  const session=locals.session as {operator:Operator};
  return {tenantId:session.operator.tenantId,sessionHash:locals.sessionTokenHash as string};
}
async function dbGate<T>(work:()=>Promise<T>):Promise<T>{
  try{return await work();}catch(error){
    const code=error&&typeof error==='object'&&'code' in error?error.code:undefined;
    if(code==='42501')throw new DomainError('NOT_FOUND','対象を取得できませんでした。',404);
    if(code==='40001'||code==='23505')
      throw new DomainError('DEVICE_CONFLICT','内容が更新されました。再読み込みしてください。',409);
    if(code==='22023'||code==='22P02')
      throw new DomainError('INVALID_INPUT','入力内容を確認してください。',400);
    throw error;
  }
}

/** One HTTP surface for genuine SUPPORT Work observations only.
 * commandBoundary performs OIDC-session, exact Origin and CSRF checks first.
 * Neither arbitrary Device RPCs nor caller-selected authority are exposed. */
export function deviceWorkObservationRoutes(store:AuthenticatedDeviceWorkObservationStore){
  const router=Router();

  router.post('/scoped/support-work/:workId/device-field-observations',async(req,res)=>{
    const workId=uuid.parse(req.params.workId);
    const input=recordInput.parse(req.body);
    if ((input.fieldKey==='deviceStatus'&&input.observedValue==='AVAILABLE')
      !==(input.attestation==='DEVICE_ASSIGNABLE_CONFIRMED_V1'))
      throw new DomainError('INVALID_INPUT','現物確認内容を確認してください。',400);
    const command:DeviceObservationCommand={
      requestId:input.requestId,workId,targetContextId:input.targetContextId,
      deviceId:input.deviceId,fieldKey:input.fieldKey,
      observedValue:input.observedValue,expectedRevision:input.expectedRevision,
    };
    const observationId=await dbGate(()=>store.record(sessionPrincipal(res.locals),command));
    res.status(201).json({ok:true,data:{observationId}});
  });

  router.post('/scoped/device-field-observations/:observationId/proposals',async(req,res)=>{
    const observationId=uuid.parse(req.params.observationId);
    const {requestKey}=proposeInput.parse(req.body);
    const changeId=await dbGate(()=>store.propose(sessionPrincipal(res.locals),observationId,requestKey));
    res.status(202).json({ok:true,data:{changeId,status:'PENDING_REVIEW'}});
  });

  router.get('/scoped/device-field-review-queue',async(req,res)=>{
    const query=queueQuery.parse(req.query);
    let cursor:DeviceReviewCursor|null=null;
    if(query.cursor){
      try {
        cursor=queueCursor.parse(JSON.parse(Buffer.from(query.cursor,'base64url').toString('utf8')));
      }catch{
        throw new DomainError('INVALID_INPUT','ページ指定が正しくありません。',400);
      }
    }
    const page=await dbGate(()=>store.pending(sessionPrincipal(res.locals),query.limit,cursor));
    res.json({ok:true,data:page});
  });

  router.post('/scoped/device-field-review-queue/:changeId/confirm',async(req,res)=>{
    const changeId=uuid.parse(req.params.changeId);
    const {verificationSummary}=confirmInput.parse(req.body);
    await dbGate(()=>store.confirm(sessionPrincipal(res.locals),changeId,verificationSummary));
    res.json({ok:true,data:{changeId,status:'COMMITTED'}});
  });

  return router;
}
