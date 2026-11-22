import {readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {ids,testDatabase,verifyExistingDevice} from '../fixtures/database.js';
import {withTenant} from '../../apps/web/src/server/persistence/database.js';
import {PgJoinRepository,PgJoinUnitOfWork}
  from '../../apps/web/src/server/persistence/join-repository.js';
import {PgRegistryEditStore} from '../../apps/web/src/server/persistence/registry-edit-store.js';
import {JoinCommands} from '../../packages/application/src/join-commands.js';
import {RegistryEditCommands} from '../../packages/application/src/registry-edit-commands.js';
import type {Operator} from '../../packages/domain/src/operator.js';

type TestDb=Awaited<ReturnType<typeof testDatabase>>;
let db:TestDb;
let recipient:string;
let registry:RegistryEditCommands;
let join:JoinCommands;

const actor:Operator={
  id:ids.operator,tenantId:ids.tenant,displayName:'開発オペレーター',
  tenantName:'atLIB Development',roles:['ADMIN','OPERATOR','REVIEWER'],
};
const time={id:randomUUID,now:()=> '2026-11-21T01:00:00.000Z'};

async function grantRegistryUpdate(){
  await db.admin.query(`insert into factact.scoped_actor_grants
    (id,tenant_id,actor_operator_id,service_id,contract_profile_id,scope_kind,
     service_recipient_id,object_kind,operations,status,effective_from,issued_by_operator_id)
    values($1,$2,$3,$4,$5,'SERVICE_RECIPIENT',$6,'REGISTRY',$7,'ACTIVE',
      now()-interval '1 day',$3)`,[
    randomUUID(),ids.tenant,ids.operator,ids.service,ids.contract,recipient,['UPDATE'],
  ]);
}

async function actualJoinWork(){
  const event=await join.createJoinEvent(actor,{
    organizationId:ids.organization,personId:ids.person,
    serviceId:ids.service,joinDate:'2026-11-21',
  });
  const evaluated=await join.evaluateJoinRequirements(actor,event.eventId);
  return evaluated.works[0]!.id;
}

beforeAll(async()=>{
  db=await testDatabase();
  registry=new RegistryEditCommands(new PgRegistryEditStore(db.runtime));
  join=new JoinCommands(new PgJoinUnitOfWork(db.runtime),time);
},120_000);
beforeEach(async()=>{
  await db.reset();
  await verifyExistingDevice(db.admin,ids.device,'PC-0073');
  recipient=await withTenant(db.runtime,ids.tenant,client=>
    new PgJoinRepository(client,ids.tenant)
      .ensureOrganizationRecipient(randomUUID(),ids.service,ids.organization));
});
afterAll(async()=>{await db?.close();},60_000);

describe('FACTACT Core V1 integrated Registry / JOIN / Device gate',()=>{
  it('applies the complete 41-migration ledger as a non-superuser with FORCE RLS',async()=>{
    const isolated=await testDatabase({
      migrationAsNonSuperuser:true,seedAsNonSuperuserWithRls:true,
    });
    try{
      const migrations=(await readdir('supabase/migrations'))
        .filter(name=>/^\d+.*\.sql$/u.test(name)).sort();
      expect(migrations).toHaveLength(41);
      expect(migrations.at(-1)).toBe('20261122000100_support_device_field_observation_gate.sql');
      expect((await isolated.admin.query(`select rolsuper,rolbypassrls from pg_roles
        where rolname='factact_migrator'`)).rows)
        .toEqual([{rolsuper:false,rolbypassrls:false}]);
      const rls=await isolated.admin.query(`select count(*)::integer as total,
        count(*) filter(where relrowsecurity)::integer as enabled,
        count(*) filter(where relforcerowsecurity)::integer as forced
        from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='factact' and c.relkind='r'`);
      expect(rls.rows[0]).toMatchObject({
        total:rls.rows[0]!.enabled,enabled:rls.rows[0]!.forced,
      });
    }finally{await isolated.close();}
  });

  it('keeps the real Registry Person proposal and JOIN Reality Change paths valid',async()=>{
    await grantRegistryUpdate();
    const proposal={
      serviceId:ids.service,personId:ids.person,requestId:randomUUID(),
      requestKey:randomUUID(),proposedDisplayName:'田中 太郎',
      reason:'統合受入での正規表記訂正',expectedRegistryRevision:0,
    };
    const registryChange=await registry.proposeDisplayName({
      tenantId:ids.tenant,actorOperatorId:ids.operator,
    },proposal);
    expect((await db.admin.query(`select work_id,action_id,registry_edit_request_id,
      device_change_request_id,change_type,change_kind from factact.changes where id=$1`,
    [registryChange.changeId])).rows[0]).toMatchObject({
      work_id:null,action_id:null,change_type:'KNOWLEDGE_STATE_CHANGE',
      change_kind:'PERSON_DISPLAY_NAME_CORRECTION',device_change_request_id:null,
    });

    const workId=await actualJoinWork();
    const joined=await join.startAssignDeviceAction(actor,{
      workId,deviceId:ids.device,executionSummary:'統合受入の実機割当',
      effectiveFrom:'2026-11-21T01:00:00.000Z',
    });
    expect((await db.admin.query(`select work_id,action_id,registry_edit_request_id,
      device_change_request_id,change_type,change_kind from factact.changes where id=$1`,
    [joined.changeId])).rows[0]).toMatchObject({
      work_id:workId,action_id:joined.actionId,registry_edit_request_id:null,
      device_change_request_id:null,change_type:'REALITY_CHANGE',
      change_kind:'PRIMARY_DEVICE_ASSIGNMENT',
    });
  });

  it('rejects a Change that mixes genuine JOIN and Registry sources',async()=>{
    const workId=await actualJoinWork();
    const actionId=randomUUID();
    await db.admin.query(`insert into factact.actions
      (id,tenant_id,work_id,action_type,actor_operator_id,status,input_json,
       result_summary,started_at,completed_at)
      values($1,$2,$3,'ASSIGN_DEVICE',$4,'COMPLETED','{}','統合排他検証',now(),now())`,
    [actionId,ids.tenant,workId,ids.operator]);
    const requestId=randomUUID();
    await db.admin.query(`insert into factact.registry_edit_requests
      (id,tenant_id,actor_operator_id,service_id,contract_profile_id,
       service_recipient_id,target_person_id,request_key,original_display_name,
       proposed_display_name,expected_registry_revision,reason)
      values($1,$2,$3,$4,$5,$6,$7,$8,'田中 一郎','田中 太郎',0,'統合排他検証')`,[
      requestId,ids.tenant,ids.operator,ids.service,ids.contract,recipient,
      ids.person,randomUUID(),
    ]);
    await expect(db.admin.query(`insert into factact.changes
      (id,tenant_id,work_id,action_id,registry_edit_request_id,
       proposed_by_operator_id,change_type,change_kind,status,subject_type,
       subject_id,proposed_effect_json,created_at)
      values($1,$2,$3,$4,$5,$6,'REALITY_CHANGE','PRIMARY_DEVICE_ASSIGNMENT',
       'PROPOSED','PERSON',$7,'{}',now())`,[
      randomUUID(),ids.tenant,workId,actionId,requestId,ids.operator,ids.person,
    ])).rejects.toMatchObject({code:'23514'});
    expect((await db.admin.query('select count(*)::integer as n from factact.changes'))
      .rows[0]!.n).toBe(0);
  });

  it('accepts the typed Device source only as a schema proposal and keeps Runtime denied',async()=>{
    const evidenceId=randomUUID(),requestId=randomUUID(),deviceId=randomUUID();
    await db.admin.query(`insert into factact.evidence
      (id,tenant_id,evidence_type,title,content_text,created_by_operator_id,created_at)
      values($1,$2,'SOURCE_REFERENCE','Synthetic register','sha256:synthetic',$3,now())`,
    [evidenceId,ids.tenant,ids.operator]);
    await db.admin.query(`insert into factact.device_change_requests
      (id,tenant_id,actor_operator_id,service_id,contract_profile_id,
       service_recipient_id,organization_id,target_device_id,request_key,request_kind,
       expected_registry_revision,proposed_effect_json,source_evidence_id,source_kind,
       source_locator,source_observed_at)
      values($1,$2,$3,$4,$5,$6,$7,$8,'corev1-device','DEVICE_INITIAL_INFORMATION',
       0,'{"assetTag":"PC-CORE-V1"}',$9,'CUSTOMER_REGISTER','Assets:row1',now())`,[
      requestId,ids.tenant,ids.operator,ids.service,ids.contract,recipient,
      ids.organization,deviceId,evidenceId,
    ]);
    const changeId=randomUUID();
    await db.admin.query(`insert into factact.changes
      (id,tenant_id,change_type,change_kind,status,subject_type,device_subject_id,
       device_change_request_id,proposed_by_operator_id,proposed_effect_json,created_at)
      values($1,$2,'KNOWLEDGE_STATE_CHANGE','DEVICE_INITIAL_INFORMATION','PROPOSED',
       'DEVICE',$3,$4,$5,'{"assetTag":"PC-CORE-V1"}',now())`,
    [changeId,ids.tenant,deviceId,requestId,ids.operator]);
    expect((await db.admin.query('select count(*)::integer as n from factact.devices where id=$1',
      [deviceId])).rows[0]!.n).toBe(0);
    await expect(withTenant(db.runtime,ids.tenant,client=>client.query(
      'select * from factact.device_change_requests where id=$1',[requestId])))
      .rejects.toMatchObject({code:'42501'});
    expect((await withTenant(db.runtime,ids.tenant,client=>client.query(
      'select id from factact.changes where id=$1',[changeId]))).rowCount).toBe(0);
  });
});
