import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {randomUUID} from 'node:crypto';
import {withTenant} from '../../apps/web/src/server/persistence/database.js';
import {PgSupportUnitOfWork} from '../../apps/web/src/server/persistence/support-repository.js';
import {SupportCommands} from '../../packages/application/src/support-commands.js';
import type {Operator} from '../../packages/domain/src/operator.js';
import {ids,testDatabase,verifyExistingDevice} from '../fixtures/database.js';

type Db=Awaited<ReturnType<typeof testDatabase>>;
let db:Db,recipient:string,reviewer:string,evidenceId:string;
const actor:Operator={id:ids.operator,tenantId:ids.tenant,displayName:'Synthetic Operator',
  tenantName:'atLIB Development',roles:['ADMIN','OPERATOR','REVIEWER']};
const runtime={id:randomUUID,now:()=> '2026-11-22T01:00:00.000Z'};

beforeAll(async()=>{db=await testDatabase();});
beforeEach(async()=>{
  await db.reset();await verifyExistingDevice(db.admin,ids.device,'PC-0073');
  recipient=randomUUID();reviewer=randomUUID();evidenceId=randomUUID();
  await db.admin.query(`insert into factact.service_recipients
    (id,tenant_id,service_id,recipient_type,recipient_id,recipient_organization_id,status)
    values($1,$2,$3,'ORGANIZATION',null,$4,'ACTIVE')`,
    [recipient,ids.tenant,ids.service,ids.organization]);
  await db.admin.query(`insert into factact.operators(id,tenant_id,email,display_name,status)
    values($1,$2,'s3c-reviewer@example.invalid','Synthetic S3c Reviewer','ACTIVE')`,
    [reviewer,ids.tenant]);
  for(const operator of [ids.operator,reviewer])await db.admin.query(`insert into factact.scoped_actor_grants
    (id,tenant_id,actor_operator_id,service_id,contract_profile_id,scope_kind,
     service_recipient_id,work_id,object_kind,operations,status,effective_from,issued_by_operator_id)
    values($1,$2,$3,$4,$5,'SERVICE_RECIPIENT',$6,null,'REGISTRY',
      array['READ','CREATE','UPDATE','REVIEW','APPROVE'],'ACTIVE',now()-interval '1 day',$7)`,
    [randomUUID(),ids.tenant,operator,ids.service,ids.contract,recipient,ids.operator]);
  await db.admin.query(`insert into factact.evidence
    (id,tenant_id,evidence_type,title,content_text,created_by_operator_id,created_at)
    values($1,$2,'SOURCE_REFERENCE','Synthetic unbound source',
      'A label and digest string do not prove custody',$3,now())`,
    [evidenceId,ids.tenant,ids.operator]);
});
afterAll(async()=>{if(db)await db.close();});

async function actualSupportWork(){
  const commands=new SupportCommands(new PgSupportUnitOfWork(db.runtime),runtime);
  const event=await commands.createEvent(actor,{requestId:randomUUID(),personId:ids.person,
    serviceId:ids.service,symptom:'端末の表示名を現物確認する'});
  const evaluated=await commands.evaluate(actor,event.id,'REQUIRED','現物確認が必要');
  return {event,work:evaluated.work!};
}
function command(options:{recipientId:string;workId?:string;sourceKind:string;
  observedValue:string;locator:string}){
  const source={kind:options.sourceKind,evidenceId,locator:options.locator,
    observedAt:'2026-11-22T00:55:00.000Z',...(options.workId?{workId:options.workId}:{})};
  return {changeId:randomUUID(),serviceId:ids.service,contractProfileId:ids.contract,
    serviceRecipientId:options.recipientId,organizationId:ids.organization,deviceId:ids.device,
    workId:options.workId??'',kind:'DEVICE_FIELD_VERIFICATION',
    requestKey:'s3c-'+randomUUID(),expectedRevision:1,
    effect:{field:'displayName',observedValue:options.observedValue,verificationSource:source},
    fingerprint:'c'.repeat(64),sources:[{fieldKey:'displayName',fieldValue:options.observedValue,
      evidenceId,sourceKind:options.sourceKind,locator:options.locator,
      observedAt:source.observedAt,...(options.workId?{workId:options.workId}:{})}]};
}
async function propose(payload:ReturnType<typeof command>){
  return withTenant(db.runtime,ids.tenant,c=>c.query<{id:string}>(
    'select factact.device_propose_change($1,$2,$3::jsonb) id',
    [ids.tenant,ids.operator,payload]));
}

describe('S3c-0 Device Work Evidence boundary characterization',()=>{
  it('fails closed when a genuine Person-recipient SUPPORT Work is used as an Organization Device source',async()=>{
    const {work}=await actualSupportWork();
    const payload=command({recipientId:work.serviceRecipientId,workId:work.id,
      sourceKind:'SUPPORT_WORK',observedValue:'Observed display',locator:'support:observation:missing'});
    await expect(propose(payload)).rejects.toMatchObject({code:'42501'});
    expect((await db.admin.query('select 1 from factact.device_change_requests')).rowCount).toBe(0);
    expect((await db.admin.query(`select recipient_type from factact.service_recipients
      where id=$1`,[work.serviceRecipientId])).rows[0]?.recipient_type).toBe('PERSON');
  });

  it('rejects a free-form PHYSICAL_INVENTORY label without bound observation custody',async()=>{
    const payload=command({recipientId:recipient,sourceKind:'PHYSICAL_INVENTORY',
      observedValue:'FORGED-NOT-OBSERVED',locator:'free-form:physical-claim'});
    await expect(propose(payload)).rejects.toMatchObject({code:'42501'});
    expect((await db.admin.query('select 1 from factact.device_change_requests')).rowCount).toBe(0);
    expect((await db.admin.query('select 1 from factact.device_field_events where source_change_id=$1',
      [payload.changeId])).rowCount).toBe(0);
  });

  it('keeps caller statements UNVERIFIED and unable to represent an exact Device field tuple',async()=>{
    const commands=new SupportCommands(new PgSupportUnitOfWork(db.runtime),runtime);
    const {work}=await actualSupportWork();
    const context=await commands.confirmContextDevice(actor,work.id,{requestId:randomUUID(),
      expectedRevision:0,deviceId:ids.device,confirmationSource:'OPERATOR'});
    const statement=await commands.recordTargetObservation(actor,work.id,{requestId:randomUUID(),
      expectedRevision:0,kind:'CALLER_STATEMENT',value:'UNKNOWN',
      detail:'端末名は新しい名前だと本人が申告',sourceType:'CALLER'});
    expect(statement).toMatchObject({targetContextId:context.id,kind:'CALLER_STATEMENT',
      value:'UNKNOWN',sourceType:'CALLER'});
    expect(statement.sourceSnapshot).not.toHaveProperty('fieldKey');
    expect(statement.sourceSnapshot).not.toHaveProperty('observedValue');
    await expect(withTenant(db.runtime,ids.tenant,c=>c.query(`insert into
      factact.support_work_target_observations(id,tenant_id,work_id,target_context_id,
      request_id,revision,kind,value,detail,source_type,source_snapshot,
      recorded_by_operator_id,recorded_at) values($1,$2,$3,$4,$5,2,
      'DEVICE_FIELD','FORGED-NOT-OBSERVED','caller text','CALLER','{}'::jsonb,$6,now())`,
      [randomUUID(),ids.tenant,work.id,context.id,randomUUID(),ids.operator])))
      .rejects.toMatchObject({code:'23514'});
  });
});
