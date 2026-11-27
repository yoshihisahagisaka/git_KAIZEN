import {randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
import {z} from 'zod';
import {withTenant} from './database.js';
import {DomainError} from '../../../../../packages/domain/src/join.js';
export const publicReceiptInput=z.strictObject({
 submissionId:z.uuid(),company:z.string().trim().min(1).max(200),
 department:z.string().trim().max(200).default(''),name:z.string().trim().min(1).max(200),
 email:z.string().trim().max(320).pipe(z.email()),phone:z.string().trim().min(1).max(80),
 category:z.enum(['PC','NETWORK','PRINTER','PHONE','OTHER']),
 description:z.string().trim().min(1).max(4000),privacyConsent:z.literal(true),
});
export type PublicReceiptInput=z.infer<typeof publicReceiptInput>;
/** Context is supplied only by deployment-owned public slug configuration.
 * Do not resolve membership or create master/Work records on anonymous intake. */
export class PgPublicSupportReceiptStore{
 constructor(private pool:Pool){}
 async receive(context:{tenantId:string;serviceId:string;privacyNoticeVersion:string},raw:PublicReceiptInput){
  const input=publicReceiptInput.parse(raw);
  const tenantId=z.uuid().parse(context.tenantId),serviceId=z.uuid().parse(context.serviceId);
  const version=z.string().trim().min(1).max(100).parse(context.privacyNoticeVersion);
  return withTenant(this.pool,tenantId,async db=>{
   const active=await db.query(`select s.id from factact.services s join factact.tenants t on t.id=s.tenant_id
    where s.id=$1 and s.status='ACTIVE' and t.status='ACTIVE'
      and exists(select 1 from factact.contract_profiles c where c.tenant_id=s.tenant_id and c.service_id=s.id
       and c.status='ACTIVE' and c.effective_from<=now() and (c.effective_to is null or c.effective_to>now())
       and c.configuration_json->'support'->>'enabled'='true')`,[serviceId]);
   if(active.rowCount!==1)throw new DomainError('NOT_FOUND','受付窓口を確認できません。',404);
   await db.query(`insert into factact.public_support_receipts
    (id,tenant_id,service_id,submission_id,company_name,department,contact_name,email,phone,category,description,privacy_notice_version)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    on conflict(tenant_id,service_id,submission_id) do nothing`,
    [randomUUID(),tenantId,serviceId,input.submissionId,input.company,input.department,input.name,input.email,input.phone,input.category,input.description,version]);
   // Same generic response for duplicate submissions; never expose record IDs or membership.
   return {accepted:true as const};
  });
 }
}
