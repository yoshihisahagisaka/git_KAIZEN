import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {ids,testDatabase} from '../fixtures/database.js';
import {withTenant} from '../../apps/web/src/server/persistence/database.js';
import {PgJoinRepository} from '../../apps/web/src/server/persistence/join-repository.js';
import {PgRegistryEditStore} from '../../apps/web/src/server/persistence/registry-edit-store.js';
import {RegistryEditCommands} from '../../packages/application/src/registry-edit-commands.js';

const reviewer='20000000-0000-4000-8000-000000000002';
const third='20000000-0000-4000-8000-000000000003';
const otherTenant='10000000-0000-4000-8000-000000000002';
let db:Awaited<ReturnType<typeof testDatabase>>;
let recipient:string;
let commands:RegistryEditCommands;
const proposerContext={tenantId:ids.tenant,actorOperatorId:ids.operator};
const reviewerContext={tenantId:ids.tenant,actorOperatorId:reviewer};
const thirdContext={tenantId:ids.tenant,actorOperatorId:third};
const input=()=>({serviceId:ids.service,personId:ids.person,requestId:randomUUID(),
  requestKey:randomUUID(),proposedDisplayName:'田中 太郎',reason:'登録表記の訂正',expectedRegistryRevision:0});
const grant=async(actor:string,operations:string[],scope:'SERVICE'|'SERVICE_RECIPIENT'='SERVICE_RECIPIENT')=>{
  const grantId=randomUUID();
  await db.admin.query(`insert into factact.scoped_actor_grants
    (id,tenant_id,actor_operator_id,service_id,contract_profile_id,scope_kind,
     service_recipient_id,object_kind,operations,status,effective_from,issued_by_operator_id)
    values($1,$2,$3,$4,$5,$6,$7,'REGISTRY',$8,'ACTIVE',now()-interval '1 day',$9)`,
    [grantId,ids.tenant,actor,ids.service,ids.contract,scope,
      scope==='SERVICE'?null:recipient,operations,ids.operator]);
  return grantId;
};
const person=async()=>{
  const result=await withTenant(db.runtime,ids.tenant,client=>client.query<{
    display_name:string;registry_revision:string}>(`
    select display_name,registry_revision from factact.people where id=$1`,[ids.person]));
  return result.rows[0]!;
};
const recorded=async(changeId:string)=>{
  const result=await withTenant(db.runtime,ids.tenant,client=>client.query(`
    select c.status,c.work_id,c.action_id,c.verified_by_operator_id,c.committed_by_operator_id,
     (select count(*)::int from factact.audit_events a where a.aggregate_id=c.id) as audit_count,
     (select count(*)::int from factact.change_evidence e where e.change_id=c.id) as evidence_count
    from factact.changes c where c.id=$1`,[changeId]));
  return result.rows[0];
};

beforeAll(async()=>{db=await testDatabase();commands=new RegistryEditCommands(new PgRegistryEditStore(db.runtime));},60_000);
beforeEach(async()=>{
  await db.reset();
  await db.admin.query(`insert into factact.operators(id,tenant_id,email,display_name,status)
    values($1,$3,'reviewer@example.invalid','Reviewer','ACTIVE'),
          ($2,$3,'third@example.invalid','Third','ACTIVE')`,[reviewer,third,ids.tenant]);
  recipient=await withTenant(db.runtime,ids.tenant,client=>
    new PgJoinRepository(client,ids.tenant).ensureOrganizationRecipient(randomUUID(),ids.service,ids.organization));
},60_000);
afterAll(async()=>{await db?.close();},60_000);

describe('Registry display-name Application commands: explicit dual control',()=>{
  it('blocks missing scope; proposes a real source without changing Person',async()=>{
    await expect(commands.proposeDisplayName(proposerContext,input())).rejects.toMatchObject({code:'42501'});
    await grant(ids.operator,['UPDATE']);
    const proposal=input();
    const {changeId}=await commands.proposeDisplayName(proposerContext,proposal);
    expect(await person()).toEqual({display_name:'田中 一郎',registry_revision:'0'});
    expect(await recorded(changeId)).toMatchObject({
      status:'PROPOSED',work_id:null,action_id:null,audit_count:1,evidence_count:0,
    });
    const retried=await commands.proposeDisplayName(proposerContext,proposal);
    expect(retried.changeId).toBe(changeId);
    expect((await recorded(changeId)).audit_count).toBe(1);
    await expect(commands.proposeDisplayName(proposerContext,{
      ...proposal,proposedDisplayName:'田中 次郎',
    })).rejects.toMatchObject({code:'23505'});
  });

  it('requires two Actors and distinct REVIEW/APPROVE Grants; commits once with Audit',async()=>{
    await grant(ids.operator,['UPDATE']);
    const {changeId}=await commands.proposeDisplayName(proposerContext,input());
    await expect(commands.verifyDisplayName(proposerContext,changeId,'確認')).rejects.toMatchObject({code:'42501'});
    await expect(commands.verifyDisplayName(reviewerContext,changeId,'確認')).rejects.toMatchObject({code:'42501'});
    await grant(reviewer,['REVIEW']);
    await commands.verifyDisplayName(reviewerContext,changeId,'依頼内容と対象レコードを照合');
    expect(await person()).toEqual({display_name:'田中 一郎',registry_revision:'0'});
    expect(await recorded(changeId)).toMatchObject({
      status:'VERIFIED',verified_by_operator_id:reviewer,audit_count:2,evidence_count:1,
    });
    await expect(commands.commitDisplayName(proposerContext,changeId)).rejects.toMatchObject({code:'42501'});
    await expect(commands.commitDisplayName(reviewerContext,changeId)).rejects.toMatchObject({code:'42501'});
    await grant(reviewer,['APPROVE']);
    await commands.commitDisplayName(reviewerContext,changeId);
    expect(await person()).toEqual({display_name:'田中 太郎',registry_revision:'1'});
    expect(await recorded(changeId)).toMatchObject({
      status:'COMMITTED',verified_by_operator_id:reviewer,committed_by_operator_id:reviewer,
      audit_count:3,evidence_count:1,
    });
    await commands.commitDisplayName(reviewerContext,changeId);
    expect((await recorded(changeId)).audit_count).toBe(3);
  });

  it('does not allow a different person, customer or tenant to be treated as the scope',async()=>{
    await grant(ids.operator,['UPDATE']);
    await expect(commands.proposeDisplayName(proposerContext,{
      ...input(),personId:randomUUID(),
    })).rejects.toMatchObject({code:'42501'});
    await expect(commands.proposeDisplayName({tenantId:otherTenant,actorOperatorId:ids.operator},input()))
      .rejects.toMatchObject({code:'42501'});
    const differentPerson=randomUUID();
    const differentOrg=randomUUID();
    await db.admin.query(`insert into factact.organizations(id,tenant_id,name,status)
      values($1,$2,'Other org','ACTIVE')`,[differentOrg,ids.tenant]);
    await db.admin.query(`insert into factact.people
      (id,tenant_id,organization_id,display_name,lifecycle_status)
      values($1,$2,$3,'別社担当者','ACTIVE')`,[differentPerson,ids.tenant,differentOrg]);
    await expect(commands.proposeDisplayName(proposerContext,{
      ...input(),personId:differentPerson,
    })).rejects.toMatchObject({code:'42501'});
  });

  it('serves separate A/B Organization recipients of ONE Service with no A-to-B authority leak',async()=>{
    const orgB=randomUUID(),personB=randomUUID();
    await db.admin.query(`insert into factact.organizations(id,tenant_id,name,status)
      values($1,$2,'Customer B','ACTIVE')`,[orgB,ids.tenant]);
    await db.admin.query(`insert into factact.people
      (id,tenant_id,organization_id,display_name,lifecycle_status)
      values($1,$2,$3,'顧客Bの担当者','ACTIVE')`,[personB,ids.tenant,orgB]);
    const recipientB=await withTenant(db.runtime,ids.tenant,client=>
      new PgJoinRepository(client,ids.tenant).ensureOrganizationRecipient(randomUUID(),ids.service,orgB));
    await grant(ids.operator,['UPDATE']); // A recipient only
    const proposalB={...input(),personId:personB,proposedDisplayName:'顧客Bの新担当者'};
    await expect(commands.proposeDisplayName(proposerContext,proposalB))
      .rejects.toMatchObject({code:'42501'});
    const deniedAudit=await db.admin.query(`select count(*)::int as n from factact.audit_events
      where aggregate_type='REGISTRY_CHANGE'`);
    expect(deniedAudit.rows[0]?.n).toBe(0);
    await db.admin.query(`insert into factact.scoped_actor_grants
      (id,tenant_id,actor_operator_id,service_id,contract_profile_id,scope_kind,
       service_recipient_id,object_kind,operations,status,effective_from,issued_by_operator_id)
      values($1,$2,$3,$4,$5,'SERVICE_RECIPIENT',$6,'REGISTRY',$7,'ACTIVE',now()-interval '1 day',$3)`,
      [randomUUID(),ids.tenant,ids.operator,ids.service,ids.contract,recipientB,['UPDATE']]);
    const {changeId}=await commands.proposeDisplayName(proposerContext,proposalB);
    // The real target's ServiceRecipient is B, never the provider Service owner or A.
    const source=await db.admin.query(`select service_recipient_id,target_person_id
      from factact.registry_edit_requests where id=(select registry_edit_request_id
      from factact.changes where id=$1)`,[changeId]);
    expect(source.rows).toEqual([{service_recipient_id:recipientB,target_person_id:personB}]);
    await grant(reviewer,['REVIEW','APPROVE']); // A only
    await expect(commands.verifyDisplayName(reviewerContext,changeId,'顧客Bの依頼確認'))
      .rejects.toMatchObject({code:'42501'});
    await db.admin.query(`insert into factact.scoped_actor_grants
      (id,tenant_id,actor_operator_id,service_id,contract_profile_id,scope_kind,
       service_recipient_id,object_kind,operations,status,effective_from,issued_by_operator_id)
      values($1,$2,$3,$4,$5,'SERVICE_RECIPIENT',$6,'REGISTRY',$7,'ACTIVE',now()-interval '1 day',$3)`,
      [randomUUID(),ids.tenant,reviewer,ids.service,ids.contract,recipientB,['REVIEW','APPROVE']]);
    await commands.verifyDisplayName(reviewerContext,changeId,'顧客Bの依頼確認');
    await commands.commitDisplayName(reviewerContext,changeId);
    expect(await person()).toEqual({display_name:'田中 一郎',registry_revision:'0'});
    const updated=await db.admin.query(`select display_name,registry_revision from factact.people where id=$1`,[personB]);
    expect(updated.rows).toEqual([{display_name:'顧客Bの新担当者',registry_revision:'1'}]);
  });

  it('returns an indistinguishable denial for unknown and out-of-scope Change IDs',async()=>{
    await grant(ids.operator,['UPDATE']);
    const {changeId}=await commands.proposeDisplayName(proposerContext,input());
    const unknown=randomUUID();
    const denied=[] as Array<{code:string;message:string}>;
    for(const id of [changeId,unknown]){
      try{await commands.verifyDisplayName(thirdContext,id,'権限なしのレビュー');}
      catch(e){denied.push({code:(e as {code:string}).code,message:(e as Error).message});}
    }
    expect(denied).toEqual([
      {code:'42501',message:'Registry change unavailable'},
      {code:'42501',message:'Registry change unavailable'},
    ]);
  });

  it('rejects stale Person revisions and withdrawn reviewer authority before Commit',async()=>{
    await grant(ids.operator,['UPDATE']);
    const reviewerGrant=await grant(reviewer,['REVIEW','APPROVE']);
    const {changeId}=await commands.proposeDisplayName(proposerContext,input());
    await commands.verifyDisplayName(reviewerContext,changeId,'照合済み');
    await db.admin.query(`update factact.scoped_actor_grants set status='REVOKED',
      revoked_at=now(),revoked_by_operator_id=$2,revocation_reason='検証者権限取消'
      where id=$1`,[reviewerGrant,ids.operator]);
    await expect(commands.commitDisplayName(reviewerContext,changeId)).rejects.toMatchObject({code:'42501'});
    expect(await person()).toEqual({display_name:'田中 一郎',registry_revision:'0'});
    await grant(reviewer,['REVIEW','APPROVE']);
    await db.admin.query(`update factact.people set display_name='別経路の新しい表記',
      registry_revision=registry_revision+1 where id=$1`,[ids.person]);
    await expect(commands.commitDisplayName(reviewerContext,changeId)).rejects.toMatchObject({code:'40001'});
    expect((await recorded(changeId)).status).toBe('VERIFIED');
    expect(await person()).toEqual({display_name:'別経路の新しい表記',registry_revision:'1'});
  });

  it('holds a competing Grant revocation ahead of Commit and denies the now-ineligible Actor',async()=>{
    await grant(ids.operator,['UPDATE']);
    const reviewerGrant=await grant(reviewer,['REVIEW','APPROVE']);
    const {changeId}=await commands.proposeDisplayName(proposerContext,input());
    await commands.verifyDisplayName(reviewerContext,changeId,'実施前の照合');
    const adminClient=await db.admin.connect();
    try{
      await adminClient.query('BEGIN');
      await adminClient.query(`update factact.scoped_actor_grants
        set status='REVOKED',revoked_at=now(),revoked_by_operator_id=$2,
          revocation_reason='並行取消検証'
        where id=$1`,[reviewerGrant,ids.operator]);
      const pendingCommit=commands.commitDisplayName(reviewerContext,changeId)
        .then(()=>null,(error:unknown)=>error);
      await adminClient.query('COMMIT');
      expect(await pendingCommit).toMatchObject({code:'42501'});
      expect(await person()).toEqual({display_name:'田中 一郎',registry_revision:'0'});
      expect((await recorded(changeId)).audit_count).toBe(2);
    }finally{
      await adminClient.query('ROLLBACK').catch(()=>undefined);
      adminClient.release();
    }
  });

  it('fails closed if the confirmed Organization Recipient becomes inactive before Commit',async()=>{
    await grant(ids.operator,['UPDATE']);await grant(reviewer,['REVIEW','APPROVE']);
    const {changeId}=await commands.proposeDisplayName(proposerContext,input());
    await commands.verifyDisplayName(reviewerContext,changeId,'照合済み');
    await db.admin.query(`update factact.service_recipients set status='INACTIVE'
      where tenant_id=$1 and id=$2`,[ids.tenant,recipient]);
    await expect(commands.commitDisplayName(reviewerContext,changeId))
      .rejects.toMatchObject({code:'42501'});
    expect(await person()).toEqual({display_name:'田中 一郎',registry_revision:'0'});
    expect((await recorded(changeId)).status).toBe('VERIFIED');
  });

  it('does not let a third Actor commit without an explicit own Grant',async()=>{
    await grant(ids.operator,['UPDATE']);await grant(reviewer,['REVIEW']);
    const {changeId}=await commands.proposeDisplayName(proposerContext,input());
    await commands.verifyDisplayName(reviewerContext,changeId,'確認済み');
    await expect(commands.commitDisplayName(thirdContext,changeId)).rejects.toMatchObject({code:'42501'});
    await grant(third,['APPROVE'],'SERVICE');
    await commands.commitDisplayName(thirdContext,changeId);
    expect(await person()).toEqual({display_name:'田中 太郎',registry_revision:'1'});
    expect((await recorded(changeId)).committed_by_operator_id).toBe(third);
  });
});
