import type {Pool} from 'pg';
import {z} from 'zod';
import {DomainError} from '../../../../../packages/domain/src/join.js';

const uuid=z.uuid();
const reason=z.string().trim().min(1).max(1000);
const level=z.enum(['NEWCOMER','STANDARD','LEAD']);
const disposition=z.enum(['DENY','REQUEST']);
export const policyOverviewInput=z.strictObject({
  serviceId:uuid.optional(),actorQuery:z.string().trim().max(80).default(''),
});
export const policyLevelInput=z.strictObject({
  requestId:uuid,serviceId:uuid,actorId:uuid,level:level.nullable(),reason,
});
export const policyVersionInput=z.strictObject({
  requestId:uuid,serviceId:uuid,
  cells:z.strictObject({NEWCOMER:disposition,STANDARD:disposition,LEAD:disposition}),reason,
});
export const policyPublicationInput=z.strictObject({
  requestId:uuid,serviceId:uuid,versionId:uuid.nullable(),reason,
});

export type PolicyLevel=z.infer<typeof level>;
export type PolicyDisposition=z.infer<typeof disposition>;
export type PolicyOverviewInput=z.infer<typeof policyOverviewInput>;
export type PolicyLevelInput=z.infer<typeof policyLevelInput>;
export type PolicyVersionInput=z.infer<typeof policyVersionInput>;
export type PolicyPublicationInput=z.infer<typeof policyPublicationInput>;
export interface OperatorPolicyOverview {
  services:{id:string;name:string}[];
  service:{id:string;name:string}|null;
  actors:{id:string;name:string;level:PolicyLevel|null}[];
  hasMoreActors:boolean;
  versions:{id:string;version:number;cells:Record<PolicyLevel,PolicyDisposition>;
    reason:string;at:string;by:string}[];
  assignments:{id:string;actorId:string;actorName:string;level:PolicyLevel|null;
    reason:string;at:string;by:string}[];
  publications:{id:string;operation:'PUBLISH'|'DISABLE';versionId:string|null;
    version:number|null;reason:string;at:string;by:string}[];
  current:OperatorPolicyOverview['publications'][number]|null;
}
export interface OperatorPolicyAdmin {
  overview(sessionHash:string,input:PolicyOverviewInput):Promise<OperatorPolicyOverview>;
  assign(sessionHash:string,input:PolicyLevelInput):Promise<{requestId:string}>;
  version(sessionHash:string,input:PolicyVersionInput):Promise<{versionId:string}>;
  publish(sessionHash:string,input:PolicyPublicationInput):Promise<{requestId:string}>;
}

function policyError(error:unknown):never {
  const code=error&&typeof error==='object'&&'code' in error?error.code:null;
  if(code==='42501')throw new DomainError('POLICY_ADMIN_REQUIRED',
    'この管理設定の権限がありません。',403);
  if(code==='23505')throw new DomainError('POLICY_REQUEST_CONFLICT',
    '操作IDが別の内容で使用されています。最新の設定を取得してください。',409);
  if(code==='22023'||code==='23514'||code==='23503'||code==='22P02')
    throw new DomainError('INVALID_POLICY_INPUT','設定内容または対象を確認してください。',400);
  throw error;
}

/** Restricted runtime pool can only call the named, verified-administrator
 * functions. It never directly reads private tables or sets a Tenant context. */
export class PgOperatorPolicyAdmin implements OperatorPolicyAdmin {
  constructor(private readonly pool:Pool){}
  async overview(sessionHash:string,input:PolicyOverviewInput):Promise<OperatorPolicyOverview> {
    const value=policyOverviewInput.parse(input);
    try{
      const result=await this.pool.query<{overview:OperatorPolicyOverview}>(
        `select factact_private.operator_policy_admin_overview($1,$2,$3) as overview`,
        [sessionHash,value.serviceId??null,value.actorQuery]);
      return result.rows[0]!.overview;
    }catch(error){return policyError(error);}
  }
  async assign(sessionHash:string,input:PolicyLevelInput):Promise<{requestId:string}> {
    const data=policyLevelInput.parse(input);
    try{
      const result=await this.pool.query<{id:string}>(
        `select factact_private.operator_policy_assign_level($1,$2,$3,$4,$5,$6) as id`,
        [sessionHash,data.requestId,data.serviceId,data.actorId,data.level,data.reason]);
      return {requestId:result.rows[0]!.id};
    }catch(error){return policyError(error);}
  }
  async version(sessionHash:string,input:PolicyVersionInput):Promise<{versionId:string}> {
    const data=policyVersionInput.parse(input);
    try{
      const result=await this.pool.query<{id:string}>(
        `select factact_private.operator_policy_create_version($1,$2,$3,$4::jsonb,$5) as id`,
        [sessionHash,data.requestId,data.serviceId,JSON.stringify(data.cells),data.reason]);
      return {versionId:result.rows[0]!.id};
    }catch(error){return policyError(error);}
  }
  async publish(sessionHash:string,input:PolicyPublicationInput):Promise<{requestId:string}> {
    const data=policyPublicationInput.parse(input);
    try{
      const result=await this.pool.query<{id:string}>(
        `select factact_private.operator_policy_publish($1,$2,$3,$4,$5) as id`,
        [sessionHash,data.requestId,data.serviceId,data.versionId,data.reason]);
      return {requestId:result.rows[0]!.id};
    }catch(error){return policyError(error);}
  }
}
