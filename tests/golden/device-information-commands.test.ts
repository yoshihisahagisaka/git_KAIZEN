import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {randomUUID} from 'node:crypto';
import {withTenant} from '../../apps/web/src/server/persistence/database.js';
import {ids,testDatabase} from '../fixtures/database.js';

type Db=Awaited<ReturnType<typeof testDatabase>>;
let db:Db;
let recipient:string,reviewer:string,evidenceId:string;
const assetTag='SYNTH-DEVICE-001';

beforeAll(async()=>{db=await testDatabase();});
beforeEach(async()=>{
  await db.reset();
  recipient=randomUUID();reviewer=randomUUID();evidenceId=randomUUID();
  await db.admin.query(`insert into factact.service_recipients
    (id,tenant_id,service_id,recipient_type,recipient_id,recipient_organization_id,status)
    values($1,$2,$3,'ORGANIZATION',null,$4,'ACTIVE')`,
    [recipient,ids.tenant,ids.service,ids.organization]);
  await db.admin.query(`insert into factact.operators(id,tenant_id,email,display_name,status)
    values($1,$2,'device-reviewer@example.invalid','Synthetic Device Reviewer','ACTIVE')`,
    [reviewer,ids.tenant]);
  for(const actor of [ids.operator,reviewer]) await db.admin.query(`insert into factact.scoped_actor_grants
    (id,tenant_id,actor_operator_id,service_id,contract_profile_id,scope_kind,
     service_recipient_id,work_id,object_kind,operations,status,effective_from,issued_by_operator_id)
    values($1,$2,$3,$4,$5,'SERVICE_RECIPIENT',$6,null,'REGISTRY',
      array['READ','CREATE','UPDATE','REVIEW','APPROVE'],'ACTIVE',now()-interval '1 day',$7)`,
    [randomUUID(),ids.tenant,actor,ids.service,ids.contract,recipient,ids.operator]);
  await db.admin.query(`insert into factact.evidence
    (id,tenant_id,evidence_type,title,content_text,created_by_operator_id,created_at)
    values($1,$2,'SOURCE_REFERENCE','Synthetic register reference','sha256:synthetic-only',$3,now())`,
    [evidenceId,ids.tenant,ids.operator]);
});
afterAll(async()=>{if(db)await db.close();});

function initial(changeId=randomUUID(),requestKey='device-command-0001'){
  const source={kind:'CUSTOMER_REGISTER',evidenceId,locator:'synthetic-register:row-1',
    observedAt:'2026-11-21T01:00:00.000Z'};
  return {changeId,serviceId:ids.service,contractProfileId:ids.contract,
    serviceRecipientId:recipient,organizationId:ids.organization,deviceId:randomUUID(),workId:'',
    kind:'DEVICE_INITIAL_INFORMATION',requestKey,expectedRevision:0,
    effect:{assetTag:{value:assetTag,source},displayName:{value:'Synthetic Device',source},
      serialNumber:{value:'SYNTH-SERIAL-001',source}},fingerprint:'a'.repeat(64),
    sources:[
      {fieldKey:'assetTag',fieldValue:assetTag,evidenceId,sourceKind:'CUSTOMER_REGISTER',
        locator:source.locator,observedAt:source.observedAt},
      {fieldKey:'displayName',fieldValue:'Synthetic Device',evidenceId,sourceKind:'CUSTOMER_REGISTER',
        locator:source.locator,observedAt:source.observedAt},
      {fieldKey:'serialNumber',fieldValue:'SYNTH-SERIAL-001',evidenceId,sourceKind:'CUSTOMER_REGISTER',
        locator:source.locator,observedAt:source.observedAt},
    ]};
}
async function propose(command:Record<string,unknown>,actor=ids.operator){
  return withTenant(db.runtime,ids.tenant,c=>c.query<{id:string}>(
    'select factact.device_propose_change($1,$2,$3::jsonb) id',[ids.tenant,actor,command]));
}
async function confirm(changeId:string,summary='Synthetic human review',actor=reviewer){
  return withTenant(db.runtime,ids.tenant,c=>c.query<{id:string}>(
    'select factact.device_confirm_change($1,$2,$3,$4) id',[ids.tenant,actor,changeId,summary]));
}
async function committedInitial(){
  const command=initial();await propose(command);await confirm(command.changeId);return command;
}

describe('S2b-2 authoritative Device DB commands / PostgreSQL 17',()=>{
  it('proposes without a Device, then atomically commits UNKNOWN and per-field source history',async()=>{
    const command=initial();
    await propose(command);
    expect((await db.admin.query('select 1 from factact.devices where id=$1',[command.deviceId])).rowCount).toBe(0);
    await confirm(command.changeId);
    const device=(await db.admin.query(`select asset_tag,display_name,serial_number,device_status,
      registry_revision,organization_id from factact.devices where id=$1`,[command.deviceId])).rows[0];
    expect(device).toMatchObject({asset_tag:assetTag,display_name:'Synthetic Device',
      serial_number:'SYNTH-SERIAL-001',device_status:'UNKNOWN',registry_revision:'1',
      organization_id:ids.organization});
    expect((await db.admin.query('select field_key,event_kind from factact.device_field_events where device_id=$1',
      [command.deviceId])).rows).toHaveLength(3);
    expect((await db.admin.query(`select event_type from factact.audit_events
      where aggregate_id=$1 order by sequence`,[command.changeId])).rows.map(x=>x.event_type))
      .toEqual(['DEVICE_CHANGE_PROPOSED','DEVICE_CHANGE_VERIFIED','DEVICE_CHANGE_COMMITTED']);
  });

  it('replays identical proposal/confirmation and rejects changed payload or reviewer',async()=>{
    const command=initial();
    const first=await propose(command);const replay=await propose(command);
    expect(replay.rows[0]?.id).toBe(first.rows[0]?.id);
    // Caller fingerprints are not trusted security proofs and are ignored.
    expect((await propose({...command,fingerprint:'b'.repeat(64)})).rows[0]?.id).toBe(command.changeId);
    await expect(propose({...command,effect:{...command.effect,
      displayName:{...command.effect.displayName,value:'Changed payload'}}}))
      .rejects.toMatchObject({code:'23505'});
    await confirm(command.changeId);
    await expect(confirm(command.changeId,'different')).rejects.toMatchObject({code:'40001'});
    await expect(confirm(command.changeId,'Synthetic human review',ids.operator)).rejects.toMatchObject({code:'42501'});
    expect((await db.admin.query('select 1 from factact.device_change_requests')).rowCount).toBe(1);
  });

  it('requires exact recipient grants and rejects SERVICE-wide authority',async()=>{
    await db.admin.query('delete from factact.scoped_actor_grants where actor_operator_id=$1',[ids.operator]);
    await db.admin.query(`insert into factact.scoped_actor_grants
      (id,tenant_id,actor_operator_id,service_id,contract_profile_id,scope_kind,
       service_recipient_id,work_id,object_kind,operations,status,effective_from,issued_by_operator_id)
      values($1,$2,$3,$4,$5,'SERVICE',null,null,'REGISTRY',array['CREATE'],'ACTIVE',now()-interval '1 day',$3)`,
      [randomUUID(),ids.tenant,ids.operator,ids.service,ids.contract]);
    await expect(propose(initial())).rejects.toMatchObject({code:'42501'});
  });

  it('rejects a Source array that does not exactly correspond to the proposed Effect',async()=>{
    const command=initial();
    command.sources[0]!.fieldValue='FORGED-ASSET';
    await expect(propose(command)).rejects.toMatchObject({code:'42501'});
    expect((await db.admin.query('select 1 from factact.device_change_requests')).rowCount).toBe(0);
  });

  it('rechecks revoked proposer authority and preserves the proposal on failed confirmation',async()=>{
    const command=initial();await propose(command);
    await db.admin.query(`update factact.scoped_actor_grants set status='REVOKED',
      revoked_by_operator_id=$2,revoked_at=now(),revocation_reason='synthetic revocation'
      where actor_operator_id=$1`,[ids.operator,reviewer]);
    await expect(confirm(command.changeId)).rejects.toMatchObject({code:'42501'});
    expect((await db.admin.query('select status from factact.changes where id=$1',[command.changeId])).rows[0]?.status)
      .toBe('PROPOSED');
    expect((await db.admin.query('select 1 from factact.devices where id=$1',[command.deviceId])).rowCount).toBe(0);
  });

  it('requires current authority and exact full sources before replaying a proposal',async()=>{
    const command=initial();await propose(command);
    const changed=structuredClone(command);
    changed.sources[0]!.locator='forged:other-source';
    await expect(propose(changed)).rejects.toMatchObject({code:'23505'});
    const empty={...command,sources:[]};
    await expect(propose(empty)).rejects.toMatchObject({code:'22023'});
    await db.admin.query(`update factact.scoped_actor_grants set status='REVOKED',
      revoked_by_operator_id=$2,revoked_at=now(),revocation_reason='replay revoked'
      where actor_operator_id=$1`,[ids.operator,reviewer]);
    await expect(propose(command)).rejects.toMatchObject({code:'42501'});
    expect((await db.admin.query('select 1 from factact.device_change_requests')).rowCount).toBe(1);
    expect((await db.admin.query(`select count(*)::integer n from factact.audit_events
      where aggregate_id=$1`,[command.changeId])).rows[0]?.n).toBe(1);
  });

  it('rolls back Device, Change, field events and commit Audit when Audit insertion fails',async()=>{
    const command=initial();await propose(command);
    await db.admin.query(`create function factact_private.synthetic_device_audit_failure()
      returns trigger language plpgsql as $$begin if new.event_type='DEVICE_CHANGE_COMMITTED' then
      raise exception 'synthetic audit failure'; end if; return new; end$$`);
    await db.admin.query(`create trigger synthetic_device_audit_failure before insert on factact.audit_events
      for each row execute function factact_private.synthetic_device_audit_failure()`);
    await expect(confirm(command.changeId)).rejects.toThrow('synthetic audit failure');
    await db.admin.query('drop trigger synthetic_device_audit_failure on factact.audit_events');
    await db.admin.query('drop function factact_private.synthetic_device_audit_failure()');
    expect((await db.admin.query('select 1 from factact.devices where id=$1',[command.deviceId])).rowCount).toBe(0);
    expect((await db.admin.query('select 1 from factact.device_field_events where device_id=$1',[command.deviceId])).rowCount).toBe(0);
    expect((await db.admin.query('select status from factact.changes where id=$1',[command.changeId])).rows[0]?.status)
      .toBe('PROPOSED');
  });

  it('keeps Runtime/Public outside direct Device ledgers and executor is non-login/non-bypassrls',async()=>{
    for(const sql of ['insert into factact.devices(id) values(gen_random_uuid())',
      'insert into factact.device_change_requests(id) values(gen_random_uuid())',
      'insert into factact.device_field_events(id) values(gen_random_uuid())'])
      await expect(withTenant(db.runtime,ids.tenant,c=>c.query(sql))).rejects.toMatchObject({code:'42501'});
    const role=(await db.admin.query(`select rolcanlogin,rolsuper,rolbypassrls,rolinherit
      from pg_roles where rolname='factact_device_executor'`)).rows[0];
    expect(role).toEqual({rolcanlogin:false,rolsuper:false,rolbypassrls:false,rolinherit:false});
    expect((await db.admin.query(`select has_schema_privilege('factact_device_executor','factact','CREATE') allowed`))
      .rows[0]?.allowed).toBe(false);
  });

  it('corrects only selected fields, preserves distinct per-field sources and rejects stale revision',async()=>{
    const original=await committedInitial();
    const evidence2=randomUUID();
    await db.admin.query(`insert into factact.evidence
      (id,tenant_id,evidence_type,title,content_text,created_by_operator_id,created_at)
      values($1,$2,'SOURCE_REFERENCE','Synthetic second source','sha256:second',$3,now())`,
      [evidence2,ids.tenant,ids.operator]);
    const sourceA={kind:'CUSTOMER_REGISTER',evidenceId,locator:'register:row-2',
      observedAt:'2026-11-21T02:00:00.000Z'};
    const sourceB={kind:'TRUSTED_SYSTEM',evidenceId:evidence2,locator:'cmdb:device-1',
      observedAt:'2026-11-21T02:01:00.000Z'};
    const correction={changeId:randomUUID(),serviceId:ids.service,contractProfileId:ids.contract,
      serviceRecipientId:recipient,organizationId:ids.organization,deviceId:original.deviceId,workId:'',
      kind:'DEVICE_INFORMATION_CORRECTION',requestKey:'device-command-0002',expectedRevision:1,
      effect:{changes:{displayName:{value:'Corrected Device',source:sourceA},
        serialNumber:{value:'SYNTH-SERIAL-002',source:sourceB}}},fingerprint:'b'.repeat(64),
      sources:[
        {fieldKey:'displayName',fieldValue:'Corrected Device',evidenceId,
          sourceKind:'CUSTOMER_REGISTER',locator:sourceA.locator,observedAt:sourceA.observedAt},
        {fieldKey:'serialNumber',fieldValue:'SYNTH-SERIAL-002',evidenceId:evidence2,
          sourceKind:'TRUSTED_SYSTEM',locator:sourceB.locator,observedAt:sourceB.observedAt},
      ]};
    await propose(correction);await confirm(correction.changeId,'correction reviewed');
    expect((await db.admin.query(`select display_name,serial_number,asset_tag,registry_revision
      from factact.devices where id=$1`,[original.deviceId])).rows[0]).toMatchObject({
      display_name:'Corrected Device',serial_number:'SYNTH-SERIAL-002',asset_tag:assetTag,registry_revision:'2'});
    const sourceRows=(await db.admin.query(`select field_key,source_evidence_id from
      factact.device_change_request_sources where request_id=(select device_change_request_id
      from factact.changes where id=$1) order by field_key`,[correction.changeId])).rows;
    expect(sourceRows).toEqual([
      {field_key:'displayName',source_evidence_id:evidenceId},
      {field_key:'serialNumber',source_evidence_id:evidence2},
    ]);
    const stale={...correction,changeId:randomUUID(),requestKey:'device-command-0003',fingerprint:'c'.repeat(64)};
    await expect(propose(stale)).rejects.toMatchObject({code:'40001'});
  });

  it('verifies one physical field without promoting unrelated fields or creating a Relation',async()=>{
    const original=await committedInitial();
    const physical=randomUUID();
    await db.admin.query(`insert into factact.evidence
      (id,tenant_id,evidence_type,title,content_text,created_by_operator_id,created_at)
      values($1,$2,'SOURCE_REFERENCE','Synthetic physical inspection','inspection:synthetic',$3,now())`,
      [physical,ids.tenant,ids.operator]);
    const source={kind:'PHYSICAL_INVENTORY',evidenceId:physical,locator:'inspection:device-1',
      observedAt:'2026-11-21T03:00:00.000Z'};
    const verification={changeId:randomUUID(),serviceId:ids.service,contractProfileId:ids.contract,
      serviceRecipientId:recipient,organizationId:ids.organization,deviceId:original.deviceId,workId:'',
      kind:'DEVICE_FIELD_VERIFICATION',requestKey:'device-command-0002',expectedRevision:1,
      effect:{field:'deviceStatus',observedValue:'AVAILABLE',verificationSource:source},
      fingerprint:'d'.repeat(64),sources:[{fieldKey:'deviceStatus',fieldValue:'AVAILABLE',
        evidenceId:physical,sourceKind:'PHYSICAL_INVENTORY',locator:source.locator,
        observedAt:source.observedAt}]};
    await propose(verification);await confirm(verification.changeId,'physical review');
    expect((await db.admin.query('select device_status,registry_revision from factact.devices where id=$1',
      [original.deviceId])).rows[0]).toEqual({device_status:'AVAILABLE',registry_revision:'2'});
    expect((await db.admin.query(`select field_key,event_kind from factact.device_field_events
      where source_change_id=$1`,[verification.changeId])).rows).toEqual([
      {field_key:'deviceStatus',event_kind:'FIELD_VERIFIED'}]);
    expect((await db.admin.query('select 1 from factact.relations where to_entity_id=$1',[original.deviceId])).rowCount)
      .toBe(0);
  });
});
