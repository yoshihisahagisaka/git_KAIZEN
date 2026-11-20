import { describe, expect, it } from 'vitest';
import { DeviceInformationWriteCommands } from '../../packages/application/src/device-information-write-commands.js';
import type {
  DeviceCommandTarget, DeviceWriteTransaction, DeviceWriteUnitOfWork,
  DeviceChangeRecord, VerifiedDeviceSession,
} from '../../packages/application/src/device-information-write-commands.js';
import type {
  DeviceAuthorizedContext, DeviceInformationChange, DeviceInformationSource,
  DeviceScopedGrant, RegisteredDeviceInformation,
} from '../../packages/domain/src/device-information.js';

const now='2026-11-20T03:00:00.000Z';
const tenant='tenant-test';
const customerA='customer-A', customerB='customer-B';
const targetA: DeviceCommandTarget={serviceId:'service-test',organizationId:customerA};
const proposer: VerifiedDeviceSession={operatorId:'actor-A',tenantId:tenant};
const reviewer: VerifiedDeviceSession={operatorId:'actor-R',tenantId:tenant};
const sheet: DeviceInformationSource={
  kind:'CUSTOMER_REGISTER',evidenceId:'e-sheet',locator:'sheet=Assets,row=2',
  observedAt:'2026-11-20T01:00:00.000Z',
};
const inventory: DeviceInformationSource={
  kind:'PHYSICAL_INVENTORY',evidenceId:'e-inventory',locator:'inventory-id=1',
  observedAt:'2026-11-20T02:00:00.000Z',
};
const workSource: DeviceInformationSource={
  kind:'SUPPORT_WORK',evidenceId:'e-asset',locator:'work-observation=1',
  observedAt:'2026-11-20T02:00:00.000Z',workId:'work-A',
};

type FakeState={
  devices: Record<string,RegisteredDeviceInformation>;
  changes: Record<string,DeviceChangeRecord>;
  audits: Array<{type:string; actorId:string; changeId:string}>;
};
class FakeTransactions implements DeviceWriteUnitOfWork {
  state: FakeState={devices:{},changes:{},audits:[]};
  revoked=false;
  missingEvidence=false;
  auditFailure=false;
  validOperators=new Set([proposer.operatorId,reviewer.operatorId]);
  private sequence=0;
  ids=()=> 'generated-'+(++this.sequence);
  async run<T>(actor:VerifiedDeviceSession,callback:(tx:DeviceWriteTransaction)=>Promise<T>):Promise<T>{
    const before=structuredClone(this.state);
    const tx:DeviceWriteTransaction={
      resolveContext:async (current,target)=>{
        if(current.tenantId!==tenant || !this.validOperators.has(current.operatorId) ||
          target.serviceId!=='service-test' || ![customerA,customerB].includes(target.organizationId) ||
          (target.workId && target.workId!=='work-A')) return null;
        return {actorId:current.operatorId,tenantId:current.tenantId,serviceId:target.serviceId,
          contractProfileId:'contract-test',serviceRecipientId:target.organizationId==='customer-A'?'recipient-A':'recipient-B',
          organizationId:target.organizationId,...(target.workId?{workId:target.workId}:{}),
          actorActive:true,serviceActive:true,contractActive:true,recipientActive:true};
      },
      grants:async context=>{
        if(this.revoked)return [];
        return [{
          actorId:context.actorId,tenantId:context.tenantId,serviceId:context.serviceId,
          contractProfileId:context.contractProfileId,serviceRecipientId:context.serviceRecipientId,
          workId:null,scopeKind:'SERVICE_RECIPIENT',objectKind:'REGISTRY',
          operations:['READ','CREATE','UPDATE','REVIEW','APPROVE'],status:'ACTIVE',
          effectiveFrom:'2026-11-01T00:00:00.000Z',effectiveUntil:null,
        } satisfies DeviceScopedGrant];
      },
      sourceIsAdmissible:async (ctx,source,field,value,deviceId)=>{
        if(this.missingEvidence || !['e-sheet','e-asset','e-inventory'].includes(source.evidenceId))return false;
        if(source.kind==='CUSTOMER_REGISTER')return source.evidenceId==='e-sheet' && !source.workId;
        if(source.kind==='SUPPORT_WORK') return Boolean(ctx.workId==='work-A' &&
          source.workId===ctx.workId && source.evidenceId==='e-asset' &&
          deviceId !== null && field==='assetTag' && value==='PC-018');
        if(source.kind==='PHYSICAL_INVENTORY')return source.evidenceId==='e-inventory' &&
          deviceId !== null && field==='deviceStatus' && value==='AVAILABLE';
        return false;
      },
      deviceById:async (context,id)=>{
        const d=this.state.devices[id];
        return d?.tenantId===context.tenantId && d.organizationId===context.organizationId ? structuredClone(d):null;
      },
      deviceByAssetTag:async (context,tag)=>structuredClone(
        Object.values(this.state.devices).find(d=>
          d.tenantId===context.tenantId && d.organizationId===context.organizationId &&
          d.fields.assetTag.value===tag)??null),
      changeByRequest:async (current,key)=>{
        const r=Object.values(this.state.changes).find(x=>
          x.change.tenantId===current.tenantId &&
          x.change.proposedByActorId===current.operatorId && x.change.requestId===key);
        return r?structuredClone(r):null;
      },
      changeById:async (current,id)=>{
        const r=this.state.changes[id];
        return r?.change.tenantId===current.tenantId?structuredClone(r):null;
      },
      recordProposal:async (change,hash)=>{
        if(this.state.changes[change.id])throw Error('duplicate');
        this.state.changes[change.id]={change:structuredClone(change),
          requestFingerprint:hash,committedDevice:null};
      },
      recordCommit:async (verified,committed,summary)=>{
        if(!summary || !this.state.changes[committed.change.id])throw Error('invalid commit');
        if(verified.status!=='VERIFIED'||committed.change.status!=='COMMITTED')
          throw Error('invalid transition');
        this.state.devices[committed.device.id]=structuredClone(committed.device);
        this.state.changes[committed.change.id]={
          ...this.state.changes[committed.change.id]!,
          change:structuredClone(committed.change),committedDevice:structuredClone(committed.device),
        };
      },
      audit:async(ctx,type,metadata)=>{
        if(this.auditFailure)throw Error('audit failure');
        this.state.audits.push({type,actorId:ctx.actorId,changeId:String(metadata.changeId)});
      },
    };
    try{return await callback(tx);}
    catch(error){this.state=before;throw error;}
  }
}
function setup(){
  const fake=new FakeTransactions();
  const commands=new DeviceInformationWriteCommands(fake,fake.ids,()=>now);
  return {fake,commands};
}
async function createInitial(fake:FakeTransactions,commands:DeviceInformationWriteCommands) {
  const proposal=await commands.proposeInitial(proposer,targetA,'request-0001',
    {assetTag:'PC-018',displayName:'営業PC',serialNumber:'SN-991',source:sheet});
  const committed=await commands.confirm(reviewer,proposal.id,'資料を登録情報として受理');
  return committed.device;
}

describe('S2a Device application command boundary / synthetic transactional fixture',()=>{
  it('accepts an unverified imported Device without inventing AVAILABLE or Relation',async()=>{
    const {fake,commands}=setup();
    const device=await createInitial(fake,commands);
    expect(device.fields.assetTag.verification).toBeNull();
    expect(device.fields.serialNumber?.verification).toBeNull();
    expect(device.operationalStatus).toEqual({value:'UNKNOWN',verification:null});
    expect(fake.state.audits.map(x=>x.type)).toEqual([
      'DEVICE_CHANGE_PROPOSED','DEVICE_CHANGE_VERIFIED','DEVICE_CHANGE_COMMITTED',
    ]);
  });

  it('requires a separate reviewer and does not commit at proposal time',async()=>{
    const {fake,commands}=setup();
    const proposal=await commands.proposeInitial(proposer,targetA,'request-0001',
      {assetTag:'PC-018',displayName:'営業PC',source:sheet});
    expect(Object.keys(fake.state.devices)).toHaveLength(0);
    await expect(commands.confirm(proposer,proposal.id,'self review'))
      .rejects.toThrow();
    expect(fake.state.changes[proposal.id]?.change.status).toBe('PROPOSED');
  });

  it('rechecks live Grants before Commit, rolling back the whole attempt',async()=>{
    const {fake,commands}=setup();
    const proposal=await commands.proposeInitial(proposer,targetA,'request-0001',
      {assetTag:'PC-018',displayName:'営業PC',source:sheet});
    fake.revoked=true;
    await expect(commands.confirm(reviewer,proposal.id,'verify'))
      .rejects.toThrow();
    expect(fake.state.devices[proposal.deviceId]).toBeUndefined();
    expect(fake.state.audits).toHaveLength(1);
  });

  it('rejects Evidence that ceased to be admissible between Propose and Confirm',async()=>{
    const {fake,commands}=setup();
    const proposal=await commands.proposeInitial(proposer,targetA,'request-0001',
      {assetTag:'PC-018',displayName:'営業PC',source:sheet});
    fake.missingEvidence=true;
    await expect(commands.confirm(reviewer,proposal.id,'verify'))
      .rejects.toThrow();
    expect(fake.state.devices[proposal.deviceId]).toBeUndefined();
  });

  it('idempotently replays same proposal and rejects changed payload for same key',async()=>{
    const {fake,commands}=setup();
    const input={assetTag:'PC-018',displayName:'営業PC',source:sheet};
    const first=await commands.proposeInitial(proposer,targetA,'request-0001',input);
    expect((await commands.proposeInitial(proposer,targetA,'request-0001',input)).id).toBe(first.id);
    await expect(commands.proposeInitial(proposer,targetA,'request-0001',
      {...input,displayName:'偽名'})).rejects.toThrow();
    expect(fake.state.audits).toHaveLength(1);
  });

  it('confirmed Change is idempotently returned to the same reviewer without extra Audit',async()=>{
    const {fake,commands}=setup();
    const proposal=await commands.proposeInitial(proposer,targetA,'request-0001',
      {assetTag:'PC-018',displayName:'営業PC',source:sheet});
    const first=await commands.confirm(reviewer,proposal.id,'verify');
    const replay=await commands.confirm(reviewer,proposal.id,'verify');
    expect(replay.device.id).toBe(first.device.id);
    expect(fake.state.audits).toHaveLength(3);
  });

  it('rejects new Device when the same asset key is already registered for customer',async()=>{
    const {fake,commands}=setup();
    await createInitial(fake,commands);
    await expect(commands.proposeInitial(proposer,targetA,'request-0002',
      {assetTag:'PC-018',displayName:'別機器',source:sheet})).rejects.toThrow();
    expect(Object.keys(fake.state.devices)).toHaveLength(1);
  });

  it('does not expose or update customer A Device using customer B context',async()=>{
    const {fake,commands}=setup();
    const device=await createInitial(fake,commands);
    await expect(commands.proposeCorrection(proposer,
      {serviceId:'service-test',organizationId:customerB},
      'request-0002',device.id,{displayName:{value:'別顧客PC',source:sheet}}))
      .rejects.toThrow();
    expect(fake.state.devices[device.id]?.fields.displayName.value).toBe('営業PC');
  });

  it('only the confirmed Work/Evidence field becomes VERIFIED',async()=>{
    const {fake,commands}=setup();
    const device=await createInitial(fake,commands);
    const workTarget={...targetA,workId:'work-A'};
    const proposal=await commands.proposeFieldVerification(proposer,workTarget,'request-0002',
      device.id,'assetTag','PC-018',workSource);
    const next=(await commands.confirm(reviewer,proposal.id,'ラベル確認')).device;
    expect(next.fields.assetTag.verification).toBeTruthy();
    expect(next.fields.displayName.verification).toBeNull();
    expect(next.fields.serialNumber?.verification).toBeNull();
    expect(next.operationalStatus.value).toBe('UNKNOWN');
  });

  it('does not allow Work target selection or mismatched Work Evidence to verify a field',async()=>{
    const {fake,commands}=setup();
    const device=await createInitial(fake,commands);
    await expect(commands.proposeFieldVerification(proposer,targetA,'request-0002',
      device.id,'assetTag','PC-018',workSource)).rejects.toThrow();
    await expect(commands.proposeFieldVerification(proposer,
      {...targetA,workId:'work-A'},'request-0003',device.id,
      'assetTag','PC-018',{...workSource,workId:'different-work'})).rejects.toThrow();
    expect(fake.state.devices[device.id]?.fields.assetTag.verification).toBeNull();
  });

  it('uses explicit non-document Evidence and review to verify AVAILABLE',async()=>{
    const {fake,commands}=setup();
    const device=await createInitial(fake,commands);
    const proposal=await commands.proposeFieldVerification(proposer,targetA,'request-0002',
      device.id,'deviceStatus','AVAILABLE',inventory);
    const next=(await commands.confirm(reviewer,proposal.id,'棚卸確認')).device;
    expect(next.operationalStatus.value).toBe('AVAILABLE');
    expect(next.operationalStatus.verification).toBeTruthy();
    expect(next.fields.serialNumber?.verification).toBeNull();
  });

  it('refuses a stale correction at Commit and preserves original Device state',async()=>{
    const {fake,commands}=setup();
    const device=await createInitial(fake,commands);
    const proposal=await commands.proposeCorrection(proposer,targetA,'request-0002',
      device.id,{displayName:{value:'営業1課PC',source:sheet}});
    fake.state.devices[device.id]={...device,revision:device.revision+1};
    await expect(commands.confirm(reviewer,proposal.id,'verify')).rejects.toThrow();
    expect(fake.state.devices[device.id]?.fields.displayName.value).toBe('営業PC');
  });

  it('correction updates only specified field and makes that field unverified',async()=>{
    const {fake,commands}=setup();
    const device=await createInitial(fake,commands);
    const proposal=await commands.proposeCorrection(proposer,targetA,'request-0002',
      device.id,{displayName:{value:'営業1課PC',source:sheet}});
    const next=(await commands.confirm(reviewer,proposal.id,'訂正確認')).device;
    expect(next.fields.displayName).toMatchObject({value:'営業1課PC',verification:null});
    expect(next.fields.serialNumber?.value).toBe('SN-991');
    expect(next.fields.assetTag.value).toBe('PC-018');
  });

  it('atomic rollback leaves no state change when Audit write fails on Confirm',async()=>{
    const {fake,commands}=setup();
    const proposal=await commands.proposeInitial(proposer,targetA,'request-0001',
      {assetTag:'PC-018',displayName:'営業PC',source:sheet});
    fake.auditFailure=true;
    await expect(commands.confirm(reviewer,proposal.id,'verify')).rejects.toThrow('audit failure');
    expect(Object.keys(fake.state.devices)).toHaveLength(0);
    expect(fake.state.changes[proposal.id]?.change.status).toBe('PROPOSED');
    expect(fake.state.audits).toHaveLength(1);
  });
});
