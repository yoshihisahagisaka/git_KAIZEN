import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {randomUUID} from 'node:crypto';
import {withTenant} from '../../apps/web/src/server/persistence/database.js';
import {PgDeviceWorkFieldEvidenceExecutor} from '../../apps/web/src/server/persistence/device-information-executor.js';
import {PgSupportUnitOfWork} from '../../apps/web/src/server/persistence/support-repository.js';
import {DeviceWorkFieldEvidenceCommands} from '../../packages/application/src/device-work-field-evidence.js';
import {SupportCommands} from '../../packages/application/src/support-commands.js';
import type {Operator} from '../../packages/domain/src/operator.js';
import {ids,testDatabase,verifyExistingDevice} from '../fixtures/database.js';

type Db=Awaited<ReturnType<typeof testDatabase>>;
let db:Db,orgRecipient:string,reviewer:string,workId:string,contextId:string;
const actor:Operator={id:ids.operator,tenantId:ids.tenant,displayName:'Synthetic Operator',
  tenantName:'atLIB Development',roles:['ADMIN','OPERATOR','REVIEWER']};
const deviceActor={operatorId:ids.operator,tenantId:ids.tenant};
const runtime={id:randomUUID,now:()=> '2026-11-22T02:00:00.000Z'};
async function withExecutor<T>(work:(client:import('pg').PoolClient)=>Promise<T>){
  const client=await db.admin.connect();
  try{
    await client.query('begin');
    await client.query("select set_config('factact.tenant_id',$1,true)",[ids.tenant]);
    await client.query('set local role factact_device_executor');
    const result=await work(client);await client.query('commit');return result;
  }catch(error){await client.query('rollback');throw error;}finally{client.release();}
}

beforeAll(async()=>{db=await testDatabase();});
beforeEach(async()=>{
  await db.reset();await verifyExistingDevice(db.admin,ids.device,'PC-0073');
  orgRecipient=randomUUID();reviewer=randomUUID();
  await db.admin.query(`insert into factact.service_recipients
    (id,tenant_id,service_id,recipient_type,recipient_id,recipient_organization_id,status)
    values($1,$2,$3,'ORGANIZATION',null,$4,'ACTIVE')`,
    [orgRecipient,ids.tenant,ids.service,ids.organization]);
  await db.admin.query(`insert into factact.operators(id,tenant_id,email,display_name,status)
    values($1,$2,'s3c1a-reviewer@example.invalid','Synthetic independent reviewer','ACTIVE')`,
    [reviewer,ids.tenant]);
  const support=new SupportCommands(new PgSupportUnitOfWork(db.runtime),runtime);
  const event=await support.createEvent(actor,{requestId:randomUUID(),personId:ids.person,
    serviceId:ids.service,symptom:'Device display nameを現物確認する'});
  const evaluated=await support.evaluate(actor,event.id,'REQUIRED','現物確認が必要');
  workId=evaluated.work!.id;
  const context=await support.confirmContextDevice(actor,workId,{requestId:randomUUID(),
    expectedRevision:0,deviceId:ids.device,confirmationSource:'OPERATOR'});
  contextId=context.id;
  await db.admin.query(`insert into factact.scoped_actor_grants
    (id,tenant_id,actor_operator_id,service_id,contract_profile_id,scope_kind,
     service_recipient_id,work_id,object_kind,operations,status,effective_from,issued_by_operator_id)
    values
    ($1,$2,$3,$4,$5,'WORK',$6,$7,'SUPPORT',array['UPDATE'],'ACTIVE',now()-interval '1 day',$3),
    ($8,$2,$3,$4,$5,'SERVICE_RECIPIENT',$9,null,'REGISTRY',array['UPDATE'],'ACTIVE',now()-interval '1 day',$3),
    ($10,$2,$11,$4,$5,'SERVICE_RECIPIENT',$9,null,'REGISTRY',array['REVIEW','APPROVE'],'ACTIVE',now()-interval '1 day',$3)`,
    [randomUUID(),ids.tenant,ids.operator,ids.service,ids.contract,evaluated.work!.serviceRecipientId,
      workId,randomUUID(),orgRecipient,randomUUID(),reviewer]);
});
afterAll(async()=>{if(db)await db.close();});

async function record(expectedRevision=0,value='PC-0073',
  fieldKey:'assetTag'|'displayName'|'serialNumber'|'deviceStatus'='assetTag'){
  const requestId=randomUUID();
  const input={requestId,workId,targetContextId:contextId,deviceId:ids.device,
    organizationServiceRecipientId:orgRecipient,fieldKey,
    observedValue:value,expectedRevision};
  const id=await withExecutor(async client=>
    new DeviceWorkFieldEvidenceCommands(new PgDeviceWorkFieldEvidenceExecutor(client))
      .record(deviceActor,input));
  return {id,input};
}
async function propose(observationId:string,key='s3c1a-'+randomUUID()){
  const changeId=randomUUID();
  const result=await withExecutor(async client=>
    new DeviceWorkFieldEvidenceCommands(new PgDeviceWorkFieldEvidenceExecutor(client),()=>changeId)
      .propose(deviceActor,{observationId,requestKey:key}));
  return {changeId:result,key};
}
async function confirm(changeId:string,who=reviewer){
  return withTenant(db.runtime,ids.tenant,client=>client.query(
    'select factact.device_confirm_change($1,$2,$3,$4)',
    [ids.tenant,who,changeId,'Independent direct-observation review']));
}

describe('S3c-1A SUPPORT Work direct Device field observation / PostgreSQL 17',()=>{
  it('binds the real Person Work to its Organization recipient and commits one verified field',async()=>{
    const observation=await record();
    const before=(await db.admin.query('select asset_tag,registry_revision from factact.devices where id=$1',
      [ids.device])).rows[0];
    const proposal=await propose(observation.id);
    expect((await db.admin.query('select asset_tag,registry_revision from factact.devices where id=$1',
      [ids.device])).rows[0]).toEqual(before);
    await confirm(proposal.changeId);
    const binding=(await db.admin.query(`select o.work_id,o.work_person_recipient_id,
      o.organization_service_recipient_id,o.target_context_id,o.device_id,o.field_key,
      o.observed_value,o.evidence_id,w.lane,r.recipient_type
      from factact.device_work_field_observations o join factact.work w on w.id=o.work_id
      join factact.service_recipients r on r.id=o.work_person_recipient_id where o.id=$1`,
      [observation.id])).rows[0];
    expect(binding).toMatchObject({work_id:workId,
      organization_service_recipient_id:orgRecipient,target_context_id:contextId,
      device_id:ids.device,field_key:'assetTag',observed_value:'PC-0073',
      lane:'SUPPORT',recipient_type:'PERSON'});
    expect((await db.admin.query(`select field_key,field_value,event_kind,source_kind,
      source_evidence_id,source_work_id,source_locator from factact.device_field_events
      where source_change_id=$1`,[proposal.changeId])).rows).toEqual([{
        field_key:'assetTag',field_value:'PC-0073',event_kind:'FIELD_VERIFIED',
        source_kind:'SUPPORT_WORK',source_evidence_id:binding.evidence_id,source_work_id:workId,
        source_locator:`device-work-observation:${observation.id}`}]);
    const evidence=(await db.admin.query<{content_text:string}>(
      'select content_text from factact.evidence where id=$1',[binding.evidence_id])).rows[0]!;
    expect(JSON.parse(evidence.content_text)).toMatchObject({
      origin:'OPERATOR_DIRECT_OBSERVATION',observationId:observation.id,
      workId,deviceId:ids.device});
    expect((await db.admin.query(`select event_type from factact.audit_events
      where aggregate_id in ($1,$2) order by sequence`,[observation.id,proposal.changeId])).rows
      .map(x=>x.event_type)).toEqual(['SUPPORT_DEVICE_FIELD_OBSERVED','DEVICE_CHANGE_PROPOSED',
        'DEVICE_CHANGE_VERIFIED','DEVICE_CHANGE_COMMITTED']);
  });

  it('keeps record/propose retries idempotent and rejects changed revision or payload',async()=>{
    const first=await record(),counts=async()=>({
      observations:(await db.admin.query('select count(*)::int n from factact.device_work_field_observations')).rows[0].n,
      evidence:(await db.admin.query("select count(*)::int n from factact.evidence where title='SUPPORT Device field direct observation'")).rows[0].n,
      audits:(await db.admin.query("select count(*)::int n from factact.audit_events where event_type='SUPPORT_DEVICE_FIELD_OBSERVED'")).rows[0].n});
    const before=await counts();
    const replay=await withExecutor(client=>
      new PgDeviceWorkFieldEvidenceExecutor(client).record(deviceActor,first.input));
    expect(replay).toBe(first.id);expect(await counts()).toEqual(before);
    await expect(withExecutor(client=>
      new PgDeviceWorkFieldEvidenceExecutor(client).record(deviceActor,{...first.input,expectedRevision:1})))
      .rejects.toMatchObject({code:'40001'});
    const key='s3c1a-retry-'+randomUUID(),change=randomUUID();
    const firstChange=await withExecutor(client=>
      new PgDeviceWorkFieldEvidenceExecutor(client).propose(deviceActor,
        {observationId:first.id,requestKey:key,changeId:change}));
    expect(await withExecutor(client=>
      new PgDeviceWorkFieldEvidenceExecutor(client).propose(deviceActor,
        {observationId:first.id,requestKey:key,changeId:change}))).toBe(firstChange);
    await expect(withExecutor(client=>
      new PgDeviceWorkFieldEvidenceExecutor(client).propose(deviceActor,
        {observationId:first.id,requestKey:key,changeId:randomUUID()})))
      .rejects.toMatchObject({code:'23505'});
  });

  it('rejects wrong value, stale revision, self-review and revoked authority without mutation',async()=>{
    const mismatch=await record(0,'FORGED-NOT-CURRENT');
    await expect(propose(mismatch.id)).rejects.toMatchObject({code:'42501'});
    const observation=await record(1);
    await expect(record(1)).rejects.toMatchObject({code:'40001'});
    const proposal=await propose(observation.id);
    await expect(confirm(proposal.changeId,ids.operator)).rejects.toMatchObject({code:'42501'});
    await db.admin.query(`update factact.scoped_actor_grants set status='REVOKED',
      revoked_by_operator_id=$2,revoked_at=now(),revocation_reason='S3c test revoke'
      where actor_operator_id=$1 and object_kind='REGISTRY'`,[ids.operator,reviewer]);
    await expect(confirm(proposal.changeId)).rejects.toMatchObject({code:'42501'});
    expect((await db.admin.query('select status from factact.changes where id=$1',
      [proposal.changeId])).rows[0]?.status).toBe('PROPOSED');
    expect((await db.admin.query('select 1 from factact.device_field_events where source_change_id=$1',
      [proposal.changeId])).rowCount).toBe(0);
  });

  it('rejects ended/currently replaced context and superseded observation replay',async()=>{
    const observation=await record();
    const support=new SupportCommands(new PgSupportUnitOfWork(db.runtime),runtime);
    await support.endContextDevice(actor,workId,{requestId:randomUUID(),expectedRevision:1,
      reason:'対象を再確認する'});
    await expect(propose(observation.id)).rejects.toMatchObject({code:'42501'});
  });

  it('keeps mismatch observations immutable, rejects UNKNOWN status, and only proposes the latest field observation',async()=>{
    const mismatch=await record(0,'DIFFERENT-ASSET');
    await expect(propose(mismatch.id)).rejects.toMatchObject({code:'42501'});
    expect((await db.admin.query('select observed_value from factact.device_work_field_observations where id=$1',
      [mismatch.id])).rows[0]?.observed_value).toBe('DIFFERENT-ASSET');
    const statusUnknown=await record(1,'UNKNOWN','deviceStatus');
    await expect(propose(statusUnknown.id)).rejects.toMatchObject({code:'42501'});
    const current=await record(2,'PC-0073');
    const newer=await record(3,'PC-0073');
    await expect(propose(current.id)).rejects.toMatchObject({code:'42501'});
    await expect(propose(newer.id)).resolves.toMatchObject({changeId:expect.any(String)});
    expect((await db.admin.query('select supersedes_id from factact.device_work_field_observations where id=$1',
      [newer.id])).rows[0]?.supersedes_id).toBe(current.id);
  });

  it('rolls back observation, Evidence and Audit when Audit insertion fails',async()=>{
    await db.admin.query(`create function factact_private.synthetic_s3c_audit_failure()
      returns trigger language plpgsql as $$begin if new.event_type='SUPPORT_DEVICE_FIELD_OBSERVED'
      then raise exception 'synthetic S3c audit failure'; end if; return new; end$$`);
    await db.admin.query(`create trigger synthetic_s3c_audit_failure before insert on factact.audit_events
      for each row execute function factact_private.synthetic_s3c_audit_failure()`);
    await expect(record()).rejects.toThrow('synthetic S3c audit failure');
    await db.admin.query('drop trigger synthetic_s3c_audit_failure on factact.audit_events');
    await db.admin.query('drop function factact_private.synthetic_s3c_audit_failure()');
    expect((await db.admin.query('select 1 from factact.device_work_field_observations')).rowCount).toBe(0);
    expect((await db.admin.query("select 1 from factact.evidence where title='SUPPORT Device field direct observation'"))
      .rowCount).toBe(0);
  });

  it('keeps Runtime/Public outside the immutable ledger and exposes no HTTP route',async()=>{
    await expect(withTenant(db.runtime,ids.tenant,c=>c.query(`insert into
      factact.device_work_field_observations(id) values(gen_random_uuid())`)))
      .rejects.toMatchObject({code:'42501'});
    const acl=(await db.admin.query(`select
      has_table_privilege('factact_runtime','factact.device_work_field_observations','INSERT') runtime_insert,
      has_function_privilege('factact_runtime','factact.record_support_device_field_observation(uuid,uuid,jsonb)','EXECUTE') runtime_record,
      has_function_privilege('factact_runtime','factact.propose_observed_device_field_change(uuid,uuid,uuid,uuid,text)','EXECUTE') runtime_propose,
      has_function_privilege('public','factact.record_support_device_field_observation(uuid,uuid,jsonb)','EXECUTE') public_record,
      has_function_privilege('public','factact.propose_observed_device_field_change(uuid,uuid,uuid,uuid,text)','EXECUTE') public_propose`)).rows[0];
    expect(acl).toEqual({runtime_insert:false,runtime_record:false,runtime_propose:false,
      public_record:false,public_propose:false});
  });
});
