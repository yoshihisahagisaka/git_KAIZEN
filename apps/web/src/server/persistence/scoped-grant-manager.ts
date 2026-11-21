import type {Pool} from 'pg';
import {z} from 'zod';
import {DomainError} from '../../../../../packages/domain/src/join.js';

const uuid=z.uuid();
const operation=z.enum(['READ','CREATE','UPDATE','REVIEW','APPROVE']);
const scope=z.discriminatedUnion('kind',[
 z.strictObject({kind:z.literal('SERVICE')}),
 z.strictObject({kind:z.literal('SERVICE_RECIPIENT'),serviceRecipientId:uuid}),
 z.strictObject({kind:z.literal('WORK'),serviceRecipientId:uuid,workId:uuid}),
]);
export const grantIssueInput=z.strictObject({
 requestId:uuid,actorOperatorId:uuid,serviceId:uuid,contractProfileId:uuid,
 scope,objectKind:z.enum(['SUPPORT','REGISTRY','PROCEDURE','KNOWLEDGE']),
 operations:z.array(operation).min(1).max(5).refine(xs=>new Set(xs).size===xs.length),
 effectiveFrom:z.iso.datetime({offset:true}),
 effectiveUntil:z.iso.datetime({offset:true}).nullable(),
 reason:z.string().trim().min(1).max(1000),
}).refine(value=>value.effectiveUntil===null||
 new Date(value.effectiveUntil).getTime()>new Date(value.effectiveFrom).getTime());
export const grantRevokeInput=z.strictObject({requestId:uuid,reason:z.string().trim().min(1).max(1000)});

export type GrantIssueInput=z.infer<typeof grantIssueInput>;
export type GrantRevokeInput=z.infer<typeof grantRevokeInput>;

export interface ScopedGrantManager {
 issue(sessionHash:string,input:GrantIssueInput):Promise<{grantId:string}>;
 revoke(sessionHash:string,grantId:string,input:GrantRevokeInput):Promise<{grantId:string}>;
}

function asDomainError(error:unknown):never {
 const code=error&&typeof error==='object'&&'code' in error?error.code:null;
 if(code==='42501')throw new DomainError('GRANT_APPROVER_REQUIRED','この操作の権限がありません。',403);
 if(code==='23505')throw new DomainError('GRANT_REQUEST_CONFLICT','この操作IDは別の内容で使用されています。',409);
 if(code==='22023'||code==='23514'||code==='23503'||code==='22P02')
  throw new DomainError('INVALID_GRANT_INPUT','権限設定の対象・範囲を確認してください。',400);
 throw error;
}

/** Uses only the restricted factact_runtime pool. The SECURITY DEFINER DB
 * function owns the atomic checked mutation, approval provenance and Audit.
 * No API caller can provide an issuer, subject, Tenant or approver Operator. */
export class PgScopedGrantManager implements ScopedGrantManager {
 constructor(private readonly pool:Pool){}

 async issue(sessionHash:string,input:GrantIssueInput):Promise<{grantId:string}>{
  const data=grantIssueInput.parse(input);
  const recipientId='serviceRecipientId' in data.scope?data.scope.serviceRecipientId:null;
  const workId=data.scope.kind==='WORK'?data.scope.workId:null;
  try {
   const result=await this.pool.query<{grant_id:string}>(`
    select factact_private.issue_scoped_actor_grant(
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::timestamptz,$12::timestamptz,$13
    ) as grant_id`,[
    sessionHash,data.requestId,data.actorOperatorId,data.serviceId,data.contractProfileId,
    data.scope.kind,recipientId,workId,data.objectKind,data.operations,
    data.effectiveFrom,data.effectiveUntil,data.reason,
   ]);
   return {grantId:result.rows[0]!.grant_id};
  } catch(error){return asDomainError(error);}
 }

 async revoke(sessionHash:string,grantId:string,input:GrantRevokeInput):Promise<{grantId:string}>{
  const id=uuid.parse(grantId),data=grantRevokeInput.parse(input);
  try {
   const result=await this.pool.query<{grant_id:string}>(`
    select factact_private.revoke_scoped_actor_grant($1,$2,$3,$4) as grant_id`,
    [sessionHash,data.requestId,id,data.reason]);
   return {grantId:result.rows[0]!.grant_id};
  } catch(error){return asDomainError(error);}
 }
}
